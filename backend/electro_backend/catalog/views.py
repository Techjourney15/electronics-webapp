import os
import json
import pickle
import tempfile
import logging
import numpy as np

from django.conf import settings
from django.db.models import Q
from django.core.mail import send_mail
from django.utils import timezone

from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import Product, Category, Brand, Cart, CartItem, Order, OrderItem, ProductView, SearchLog
from .serializers import ProductSerializer, CategorySerializer, BrandSerializer, FeedbackSerializer
from accounts.permissions import IsSeller
from accounts.models import Seller
from .image_search import extract_features, compare_features
from .payment import initiate_payment as khalti_initiate, verify_payment as khalti_verify
from sentence_transformers import SentenceTransformer, util as st_util

logger = logging.getLogger(__name__)

SIMILARITY_DATA = None
IMAGE_FEATURES = None


def _load_similarity_data():
    global SIMILARITY_DATA
    if SIMILARITY_DATA is None:
        cache_dir = os.path.join(settings.BASE_DIR, 'recommender', 'similarity_cache')
        matrix = np.load(os.path.join(cache_dir, 'similarity_matrix.npy'))
        product_ids = np.load(
            os.path.join(cache_dir, 'product_ids.npy'), allow_pickle=True
        ).tolist()
        with open(os.path.join(cache_dir, 'weights.json')) as f:
            weights = json.load(f)
        SIMILARITY_DATA = {
            'matrix': matrix,
            'product_ids': product_ids,
            'weights': weights,
        }
    return SIMILARITY_DATA


def _load_image_features():
    global IMAGE_FEATURES
    if IMAGE_FEATURES is None:
        path = os.path.join(settings.BASE_DIR, 'recommender', 'visual_search', 'image_features.pkl')
        with open(path, 'rb') as f:
            IMAGE_FEATURES = pickle.load(f)

        extra_path = os.path.join(settings.BASE_DIR, 'recommender', 'visual_search', 'image_features_extra_by_id.pkl')
        if os.path.exists(extra_path):
            with open(extra_path, 'rb') as f:
                extra = pickle.load(f)
            IMAGE_FEATURES.update(extra)
    return IMAGE_FEATURES


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendations(request, product_id):
    data = _load_similarity_data()
    matrix = data['matrix']
    product_ids = data['product_ids']

    try:
        viewed_product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        idx = product_ids.index(viewed_product.product_id)
    except ValueError:
        return Response(
            {'error': 'Product not found in similarity matrix'},
            status=status.HTTP_404_NOT_FOUND
        )

    scores = matrix[idx]
    order = np.argsort(-scores)
    order = [i for i in order if i != idx]

    ranked_business_ids = [product_ids[i] for i in order]

    candidates_qs = Product.objects.filter(
        product_id__in=ranked_business_ids[:30], stock_quantity__gt=0
    ).exclude(id=viewed_product.id)
    products_by_business_id = {p.product_id: p for p in candidates_qs}

    ordered_results = []
    for bid in ranked_business_ids:
        if bid in products_by_business_id:
            ordered_results.append(products_by_business_id[bid])
        if len(ordered_results) >= 5:
            break

    result = [
        {
            'id': p.id,
            'product_id': p.product_id,
            'product_name': p.product_name,
            'brand': p.brand.name,
            'price_npr': p.price_npr,
            'image': p.image.url if p.image else None,
        }
        for p in ordered_results
    ]

    return Response({'recommendations': result})


class ProductCreateView(generics.CreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsSeller]

    def perform_create(self, serializer):
        seller = self.request.user.seller_profile
        if seller.verification_status != 'approved':
            raise PermissionDenied("Your seller account is pending admin approval.")
        serializer.save(seller=seller)


@api_view(['GET'])
@permission_classes([AllowAny])
def featured_products(request):
    phones = Product.objects.filter(
        stock_quantity__gt=0, category__name='Smartphone'
    ).order_by('-id')[:10]

    laptops = Product.objects.filter(
        stock_quantity__gt=0, category__name='Laptop'
    ).order_by('-id')[:10]

    products = list(phones) + list(laptops)
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_products(request):
    query = request.GET.get('q', '')
    min_price = request.GET.get('min_price')
    max_price = request.GET.get('max_price')

    products = Product.objects.filter(stock_quantity__gt=0)

    if query:
        products = products.filter(
            Q(product_name__icontains=query) |
            Q(description__icontains=query) |
            Q(brand__name__icontains=query) |
            Q(model__icontains=query)
        )

    if min_price:
        products = products.filter(price_npr__gte=min_price)
    if max_price:
        products = products.filter(price_npr__lte=max_price)

    products = products[:50]
    serializer = ProductSerializer(products, many=True)
    return Response({'count': products.count(), 'results': serializer.data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def personalized_homepage(request):
    user = request.user
    weighted_ids = {}

    def add_weight(pid, w):
        weighted_ids[pid] = weighted_ids.get(pid, 0) + w

    for pid in Product.objects.filter(orderitem__order__user=user).values_list('product_id', flat=True).distinct():
        add_weight(pid, 3)

    for pid in Product.objects.filter(cartitem__cart__user=user).values_list('product_id', flat=True).distinct():
        add_weight(pid, 2)

    recent_views = ProductView.objects.filter(user=user).order_by('-viewed_at')[:50]
    for v in recent_views:
        add_weight(v.product.product_id, 1)

    recent_searches = SearchLog.objects.filter(user=user).order_by('-created_at')[:20]
    for s in recent_searches:
        for pid in s.matched_product_ids[:5]:
            add_weight(pid, 0.5)

    if weighted_ids:
        data = _load_similarity_data()
        matrix = data['matrix']
        product_ids = data['product_ids']

        indices = []
        weights = []
        for pid, w in weighted_ids.items():
            if pid in product_ids:
                indices.append(product_ids.index(pid))
                weights.append(w)

        if indices:
            weights = np.array(weights).reshape(-1, 1)
            combined_scores = (matrix[indices] * weights).sum(axis=0) / weights.sum()

            excluded = set(weighted_ids.keys())
            ranked_indices = np.argsort(-combined_scores)
            ranked_business_ids = [
                product_ids[i] for i in ranked_indices
                if product_ids[i] not in excluded
            ]

            candidates_qs = Product.objects.filter(
                product_id__in=ranked_business_ids, stock_quantity__gt=0
            ).select_related('category')
            products_by_business_id = {p.product_id: p for p in candidates_qs}

            category_buckets = {}
            CATEGORY_LIMIT = 10
            TOTAL_LIMIT = 40

            for bid in ranked_business_ids:
                p = products_by_business_id.get(bid)
                if not p:
                    continue
                cat = p.category.name
                bucket = category_buckets.setdefault(cat, [])
                if len(bucket) < CATEGORY_LIMIT:
                    bucket.append(p)
                if sum(len(b) for b in category_buckets.values()) >= TOTAL_LIMIT:
                    break

            products = [p for bucket in category_buckets.values() for p in bucket][:40]
            serializer = ProductSerializer(products, many=True)
            return Response(serializer.data)

    try:
        pref = user.preference
    except Exception:
        return featured_products(request._request)

    priority_sort_map = {
        'gaming': '-ram_gb',
        'performance': '-ram_gb',
        'camera': '-rear_camera_mp',
        'battery': '-battery_mah',
    }
    sort_field = priority_sort_map.get(pref.priority_spec, '-id')

    base_qs = Product.objects.filter(stock_quantity__gt=0)
    if pref.min_price:
        base_qs = base_qs.filter(price_npr__gte=pref.min_price)
    if pref.max_price:
        base_qs = base_qs.filter(price_npr__lte=pref.max_price)

    if pref.category == 'Both' or not pref.category:
        phones = base_qs.filter(category__name='Smartphone').order_by(sort_field)[:10]
        laptops = base_qs.filter(category__name='Laptop').order_by(sort_field)[:10]
        products = list(phones) + list(laptops)
    else:
        products = list(base_qs.filter(category__name=pref.category).order_by(sort_field)[:20])

    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsSeller])
def my_products(request):
    seller = request.user.seller_profile
    products = Product.objects.filter(seller=seller)
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def seller_storefront(request, seller_id):
    try:
        seller = Seller.objects.get(id=seller_id)
    except Seller.DoesNotExist:
        return Response({'error': 'Seller not found'}, status=status.HTTP_404_NOT_FOUND)

    products = Product.objects.filter(seller=seller, stock_quantity__gt=0)
    serializer = ProductSerializer(products, many=True)

    return Response({
        'seller': {
            'id': seller.id,
            'business_name': seller.business_name,
            'verification_status': seller.verification_status,
        },
        'products': serializer.data,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def list_categories(request):
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_brands(request):
    brands = Brand.objects.all()
    serializer = BrandSerializer(brands, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsSeller])
def unclaimed_products(request):
    query = request.GET.get('q', '')
    category = request.GET.get('category', '')
    products = Product.objects.filter(seller__isnull=True)

    if category:
        products = products.filter(category__name=category)

    if query:
        products = products.filter(
            Q(product_name__icontains=query) |
            Q(brand__name__icontains=query) |
            Q(model__icontains=query)
        )

    products = products[:30]
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsSeller])
def claim_product(request, product_id):
    seller = request.user.seller_profile
    if seller.verification_status != 'approved':
        return Response(
            {'detail': 'Your seller account is pending admin approval.'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        product = Product.objects.get(id=product_id, seller__isnull=True)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found or already claimed.'}, status=404)

    price_npr = request.data.get('price_npr')
    stock_quantity = request.data.get('stock_quantity')

    product.seller = seller
    product.seller_name = seller.business_name
    if price_npr:
        product.price_npr = price_npr
    if stock_quantity:
        product.stock_quantity = stock_quantity
    product.save()

    serializer = ProductSerializer(product)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_detail(request, product_id):
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ProductSerializer(product)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def visual_search(request):
    uploaded_file = request.FILES.get('image')
    if not uploaded_file:
        return Response({'error': 'No image uploaded'}, status=status.HTTP_400_BAD_REQUEST)

    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        for chunk in uploaded_file.chunks():
            tmp.write(chunk)
        tmp_path = tmp.name

    query_vec = extract_features(tmp_path)
    os.remove(tmp_path)

    if query_vec is None:
        return Response({'error': 'Could not process image'}, status=status.HTTP_400_BAD_REQUEST)

    features = _load_image_features()
    scores = [(pid, compare_features(query_vec, vec)) for pid, vec in features.items()]
    scores.sort(key=lambda x: x[1], reverse=True)

    top_ids = [pid for pid, s in scores[:20] if s > 0.5]

    if not top_ids:
        return Response({'message': 'No close matches found. Try a clearer photo.', 'results': []})

    products = Product.objects.filter(id__in=top_ids, stock_quantity__gt=0)
    products_by_id = {p.id: p for p in products}
    ordered = [products_by_id[pid] for pid in top_ids if pid in products_by_id]

    serializer = ProductSerializer(ordered, many=True)

    if request.user.is_authenticated:
        SearchLog.objects.create(
            user=request.user,
            search_type='image',
            matched_product_ids=[p.product_id for p in ordered[:10]],
        )

    return Response({'results': serializer.data})


# ---------- CART ----------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_cart(request):
    cart, _ = Cart.objects.get_or_create(user=request.user)
    items = cart.items.select_related('product')

    result = []
    total = 0
    for item in items:
        subtotal = item.product.price_npr * item.quantity
        total += subtotal
        result.append({
            'item_id': item.id,
            'product_id': item.product.id,
            'product_name': item.product.product_name,
            'price_npr': item.product.price_npr,
            'quantity': item.quantity,
            'subtotal': subtotal,
            'image': item.product.image.url if item.product.image else None,
        })

    return Response({'items': result, 'total': total})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    product_id = request.data.get('product_id')
    quantity = int(request.data.get('quantity', 1))

    if not product_id:
        return Response({'error': 'product_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    if product.stock_quantity < quantity:
        return Response({'error': 'Not enough stock available'}, status=status.HTTP_400_BAD_REQUEST)

    cart, _ = Cart.objects.get_or_create(user=request.user)
    item, created = CartItem.objects.get_or_create(cart=cart, product=product, defaults={'quantity': quantity})

    if not created:
        item.quantity += quantity
        item.save()

    return Response({'message': 'Added to cart', 'item_id': item.id, 'quantity': item.quantity})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request, item_id):
    try:
        item = CartItem.objects.get(id=item_id, cart__user=request.user)
    except CartItem.DoesNotExist:
        return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

    item.delete()
    return Response({'message': 'Item removed from cart'})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_cart_item(request, item_id):
    try:
        item = CartItem.objects.get(id=item_id, cart__user=request.user)
    except CartItem.DoesNotExist:
        return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

    quantity = request.data.get('quantity')
    if quantity is None:
        return Response({'error': 'quantity is required'}, status=status.HTTP_400_BAD_REQUEST)

    quantity = int(quantity)
    if quantity <= 0:
        item.delete()
        return Response({'message': 'Item removed from cart'})

    if item.product.stock_quantity < quantity:
        return Response({'error': 'Not enough stock available'}, status=status.HTTP_400_BAD_REQUEST)

    item.quantity = quantity
    item.save()
    return Response({'message': 'Cart item updated', 'quantity': item.quantity})


# ---------- ORDERS ----------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_orders(request):
    orders = Order.objects.filter(user=request.user).order_by('-created_at').prefetch_related('items')

    result = []
    for order in orders:
        result.append({
            'id': order.id,
            'status': order.status,
            'total_amount': order.total_amount,
            'created_at': order.created_at,
            'items': [
                {
                    'product_name': i.product_name_snapshot,
                    'price_at_purchase': i.price_at_purchase,
                    'quantity': i.quantity,
                }
                for i in order.items.all()
            ],
        })

    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checkout(request):
    try:
        cart = Cart.objects.get(user=request.user)
    except Cart.DoesNotExist:
        return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

    items = cart.items.select_related('product')
    if not items.exists():
        return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

    total = sum(item.product.price_npr * item.quantity for item in items)

    order = Order.objects.create(user=request.user, total_amount=total, status='pending')

    for item in items:
        if item.product.stock_quantity < item.quantity:
            order.delete()
            return Response(
                {'error': f'Not enough stock for {item.product.product_name}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        OrderItem.objects.create(
            order=order,
            product=item.product,
            product_name_snapshot=item.product.product_name,
            price_at_purchase=item.product.price_npr,
            quantity=item.quantity,
        )
        item.product.stock_quantity -= item.quantity
        item.product.save()

    items.delete()

    return Response({'order_id': order.id, 'total_amount': total, 'status': order.status})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_orders(request):
    if not request.user.is_staff:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    orders = Order.objects.all().order_by('-created_at').prefetch_related('items')

    result = []
    for order in orders:
        result.append({
            'id': order.id,
            'user': order.user.username,
            'status': order.status,
            'total_amount': order.total_amount,
            'created_at': order.created_at,
        })

    return Response(result)


SEMANTIC_MODEL = None
PRODUCT_EMBEDDINGS = None


def _load_semantic_model():
    global SEMANTIC_MODEL
    if SEMANTIC_MODEL is None:
        SEMANTIC_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
    return SEMANTIC_MODEL


def _load_product_embeddings():
    global PRODUCT_EMBEDDINGS
    if PRODUCT_EMBEDDINGS is None:
        path = os.path.join(settings.BASE_DIR, 'recommender', 'product_embeddings.pkl')
        with open(path, 'rb') as f:
            PRODUCT_EMBEDDINGS = pickle.load(f)
    return PRODUCT_EMBEDDINGS


@api_view(['GET'])
@permission_classes([AllowAny])
def semantic_search(request):
    query = request.GET.get('q', '').strip()
    min_price = request.GET.get('min_price')
    max_price = request.GET.get('max_price')

    if not query:
        return Response({'count': 0, 'results': []})

    model = _load_semantic_model()
    embeddings = _load_product_embeddings()

    query_vec = model.encode(query)

    product_ids = list(embeddings.keys())
    product_vecs = np.array([embeddings[pid] for pid in product_ids])

    scores = st_util.cos_sim(query_vec, product_vecs)[0].numpy()
    order = np.argsort(-scores)[:30]

    top_ids = [product_ids[i] for i in order if scores[i] > 0.4]

    products_qs = Product.objects.filter(id__in=top_ids, stock_quantity__gt=0)
    if min_price:
        products_qs = products_qs.filter(price_npr__gte=min_price)
    if max_price:
        products_qs = products_qs.filter(price_npr__lte=max_price)

    products_by_id = {p.id: p for p in products_qs}
    ordered = [products_by_id[pid] for pid in top_ids if pid in products_by_id]

    serializer = ProductSerializer(ordered, many=True)

    if request.user.is_authenticated:
        SearchLog.objects.create(
            user=request.user,
            search_type='text',
            query_text=query[:255],
            matched_product_ids=[p.product_id for p in ordered[:10]],
        )

    return Response({'count': len(ordered), 'results': serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_product_view(request):
    product_id = request.data.get('product_id')
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    ProductView.objects.create(user=request.user, product=product)
    return Response({'status': 'logged'})


 # New updated code
@api_view(['POST'])
@permission_classes([AllowAny])
def submit_feedback(request):
    serializer = FeedbackSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        
        name = serializer.validated_data.get('name', 'Anonymous')
        email = serializer.validated_data.get('email', 'Not provided')
        message = serializer.validated_data.get('message', '')
        submitted_at = timezone.now().strftime("%Y-%m-%d %H:%M:%S")

        subject = "New Customer Feedback Received"
        body = (
            f"Customer Name: {name}\n"
            f"Customer Email: {email}\n\n"
            f"Feedback:\n{message}\n\n"
            f"Submitted At: {submitted_at}"
        )

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.SUPPORT_EMAIL],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Failed to send feedback email: {str(e)}")

        return Response(
            {"message": "Thank you! Your feedback has been submitted successfully."},
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)