from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status, generics
from django.db.models import Q
import pickle
import os
from .models import Product
from .serializers import ProductSerializer
from accounts.permissions import IsSeller
from rest_framework.exceptions import PermissionDenied
from .models import Category, Brand
from .serializers import CategorySerializer, BrandSerializer
from .models import Cart, CartItem, Order, OrderItem
from .serializers import CartSerializer, OrderSerializer
from django.db import transaction
from accounts.permissions import IsAdmin
from sentence_transformers import SentenceTransformer
import numpy as np

import requests as http_requests
from decouple import config as env_config





SIMILARITY_DATA = None

def _load_similarity_data():
    global SIMILARITY_DATA
    if SIMILARITY_DATA is None:
        pkl_path = os.path.join(
            settings.BASE_DIR, 'recommender', 'similarity_matrix.pkl'
        )
        with open(pkl_path, 'rb') as f:
            SIMILARITY_DATA = pickle.load(f)
    return SIMILARITY_DATA


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendations(request, product_id):
    data = _load_similarity_data()
    matrix = data['feature_similarity_matrix']
    product_ids = data['product_ids']
    brands = data['brands']

    try:
        idx = product_ids.index(product_id)
    except ValueError:
        return Response(
            {'error': 'Product not found in similarity matrix'},
            status=status.HTTP_404_NOT_FOUND
        )

    viewed_brand = brands[idx]
    scores = matrix[idx]

    candidates = [
        (i, scores[i]) for i in range(len(product_ids)) if i != idx
    ]

    same_brand = [(i, s) for i, s in candidates if brands[i] == viewed_brand]
    cross_brand = [(i, s) for i, s in candidates if brands[i] != viewed_brand]

    same_brand.sort(key=lambda x: x[1], reverse=True)
    cross_brand.sort(key=lambda x: x[1], reverse=True)

    top_candidates = same_brand[:3] + cross_brand[:2]

    if len(top_candidates) < 5:
        remaining = 5 - len(top_candidates)
        leftover_pool = same_brand[3:] if len(same_brand) > 3 else cross_brand[2:]
        top_candidates += leftover_pool[:remaining]

    ranked_product_ids = [product_ids[i] for i, _ in top_candidates]

    products_qs = Product.objects.filter(
        id__in=ranked_product_ids, stock_quantity__gt=0
    )
    products_by_id = {p.id: p for p in products_qs}

    ordered_results = []
    for pid in ranked_product_ids:
        if pid in products_by_id:
            ordered_results.append(products_by_id[pid])
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
    try:
        pref = request.user.preference
    except Exception:
        return featured_products(request._request)

    # priority_spec anusaar sort garne column choose garne
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
        # dubai category bata equal number linne, mix guarantee garna
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



def _get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_cart(request):
    cart = _get_or_create_cart(request.user)
    serializer = CartSerializer(cart)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    product_id = request.data.get('product_id')
    quantity = int(request.data.get('quantity', 1))

    try:
        product = Product.objects.get(id=product_id, stock_quantity__gt=0)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found or out of stock'}, status=status.HTTP_404_NOT_FOUND)

    cart = _get_or_create_cart(request.user)
    item, created = CartItem.objects.get_or_create(cart=cart, product=product, defaults={'quantity': quantity})
    if not created:
        item.quantity += quantity
        item.save()

    serializer = CartSerializer(cart)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request, item_id):
    cart = _get_or_create_cart(request.user)
    try:
        item = CartItem.objects.get(id=item_id, cart=cart)
    except CartItem.DoesNotExist:
        return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

    item.delete()
    serializer = CartSerializer(cart)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_cart_item(request, item_id):
    cart = _get_or_create_cart(request.user)
    try:
        item = CartItem.objects.get(id=item_id, cart=cart)
    except CartItem.DoesNotExist:
        return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

    quantity = int(request.data.get('quantity', item.quantity))
    if quantity <= 0:
        item.delete()
    else:
        item.quantity = quantity
        item.save()

    serializer = CartSerializer(cart)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_orders(request):
    orders = Order.objects.filter(user=request.user).order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def checkout(request):
    """Creates an Order + OrderItems from the current cart, then empties the cart.
    Payment integration will hook in here later (Phase 3)."""
    cart = _get_or_create_cart(request.user)
    items = list(cart.items.select_related('product').all())

    if not items:
        return Response({'error': 'Your cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

    total = sum(item.product.price_npr * item.quantity for item in items)

    order = Order.objects.create(user=request.user, total_amount=total, status='pending')
    for item in items:
        OrderItem.objects.create(
            order=order,
            product=item.product,
            product_name_snapshot=item.product.product_name,
            price_at_purchase=item.product.price_npr,
            quantity=item.quantity,
        )

    cart.items.all().delete()

    serializer = OrderSerializer(order)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAdmin])
def all_orders(request):
    orders = Order.objects.select_related('user').order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    data = serializer.data
    # attach customer info to each order for the admin view
    orders_by_id = {o.id: o for o in orders}
    for item in data:
        order_obj = orders_by_id[item['id']]
        item['customer_username'] = order_obj.user.username
        item['customer_name'] = order_obj.user.first_name
    return Response(data)



SEARCH_MODEL = None
SEARCH_EMBEDDINGS_DATA = None


def _load_search_model():
    global SEARCH_MODEL
    if SEARCH_MODEL is None:
        SEARCH_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
    return SEARCH_MODEL


def _load_search_embeddings():
    global SEARCH_EMBEDDINGS_DATA
    if SEARCH_EMBEDDINGS_DATA is None:
        pkl_path = os.path.join(
            settings.BASE_DIR, 'recommender', 'search_embeddings.pkl'
        )
        with open(pkl_path, 'rb') as f:
            SEARCH_EMBEDDINGS_DATA = pickle.load(f)
    return SEARCH_EMBEDDINGS_DATA


@api_view(['GET'])
@permission_classes([AllowAny])
def semantic_search(request):
    query = request.GET.get('q', '').strip()
    category = request.GET.get('category', '').strip()
    if not query:
        return Response({'count': 0, 'results': []})

    model = _load_search_model()
    data = _load_search_embeddings()

    query_embedding = model.encode([query], convert_to_numpy=True)

    # cosine similarity between the query and every product embedding
    product_embeddings = data['embeddings']
    norms = np.linalg.norm(product_embeddings, axis=1) * np.linalg.norm(query_embedding)
    similarities = (product_embeddings @ query_embedding.T).flatten() / (norms + 1e-10)

    # take the top 30 most similar products above a relevance threshold
    # Get the top 10 most similar products
    # Get the top 10 most similar products
    top_indices = np.argsort(similarities)[::-1][:10]

    print("\n===== Semantic Search Debug =====")
    print("Query:", query)

    for i in top_indices:
        print(
            f"Product ID: {data['product_ids'][i]}, "
            f"Similarity: {similarities[i]:.4f}"
        )

    # Keep products whose similarity is above the threshold
    relevant_indices = [i for i in top_indices if similarities[i] > 0.10]


    matched_product_ids = [data['product_ids'][i] for i in relevant_indices]

    products_qs = Product.objects.filter(id__in=matched_product_ids, stock_quantity__gt=0)
    if category:
        products_qs = products_qs.filter(category__name=category)
    products_by_id = {p.id: p for p in products_qs}

    ordered_results = [products_by_id[pid] for pid in matched_product_ids if pid in products_by_id]

    serializer = ProductSerializer(ordered_results, many=True)
    return Response({'count': len(ordered_results), 'results': serializer.data})



KHALTI_BASE_URL = "https://dev.khalti.com/api/v2"


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def khalti_initiate(request):
    """
    Step 1 of Khalti payment: creates a pending Order from the cart (same as
    checkout()), then asks Khalti for a payment_url. Frontend redirects the
    user to that payment_url to complete payment on Khalti's site.
    """
    cart = _get_or_create_cart(request.user)
    items = list(cart.items.select_related('product').all())

    if not items:
        return Response({'error': 'Your cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

    total = sum(item.product.price_npr * item.quantity for item in items)

    order = Order.objects.create(user=request.user, total_amount=total, status='pending')
    for item in items:
        OrderItem.objects.create(
            order=order,
            product=item.product,
            product_name_snapshot=item.product.product_name,
            price_at_purchase=item.product.price_npr,
            quantity=item.quantity,
        )
    cart.items.all().delete()

    return_url = request.data.get('return_url', 'http://localhost:5173/payment-callback')
    website_url = request.data.get('website_url', 'http://localhost:5173')

    payload = {
        "return_url": return_url,
        "website_url": website_url,
        "amount": total * 100,  # Khalti expects paisa, not rupees
        "purchase_order_id": str(order.id),
        "purchase_order_name": f"Nexora Order #{order.id}",
        "customer_info": {
            "name": request.user.first_name or request.user.username,
            "email": request.user.email or "test@example.com",
            "phone": "9800000000",
        },
    }

    headers = {"Authorization": f"Key {env_config('KHALTI_SECRET_KEY')}"}

    try:
        khalti_response = http_requests.post(
            f"{KHALTI_BASE_URL}/epayment/initiate/",
            json=payload,
            headers=headers,
            timeout=15,
        )
        khalti_data = khalti_response.json()
    except http_requests.RequestException:
        order.status = 'failed'
        order.save()
        return Response({'error': 'Could not reach Khalti payment service.'}, status=status.HTTP_502_BAD_GATEWAY)

    if khalti_response.status_code != 200:
        order.status = 'failed'
        order.save()
        return Response({'error': 'Khalti rejected the payment request.', 'details': khalti_data}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'order_id': order.id,
        'payment_url': khalti_data.get('payment_url'),
        'pidx': khalti_data.get('pidx'),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def khalti_verify(request):
    """
    Step 2 of Khalti payment: called by the frontend after the user returns
    from Khalti's payment page. Confirms with Khalti that payment actually
    succeeded, then marks the matching Order as paid.
    """
    pidx = request.data.get('pidx')
    order_id = request.data.get('order_id')

    if not pidx or not order_id:
        return Response({'error': 'pidx and order_id are required'}, status=status.HTTP_400_BAD_REQUEST)

    headers = {"Authorization": f"Key {env_config('KHALTI_SECRET_KEY')}"}

    try:
        khalti_response = http_requests.post(
            f"{KHALTI_BASE_URL}/epayment/lookup/",
            json={"pidx": pidx},
            headers=headers,
            timeout=15,
        )
        khalti_data = khalti_response.json()
    except http_requests.RequestException:
        return Response({'error': 'Could not reach Khalti payment service.'}, status=status.HTTP_502_BAD_GATEWAY)

    try:
        order = Order.objects.get(id=order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    khalti_status = khalti_data.get('status')

    if khalti_status == 'Completed':
        order.status = 'paid'
        order.save()
        return Response({'status': 'paid', 'order_id': order.id})
    elif khalti_status in ('Expired', 'User canceled'):
        order.status = 'cancelled'
        order.save()
        return Response({'status': 'cancelled', 'order_id': order.id})
    else:
        order.status = 'failed'

        order.save()
        return Response({'status': 'failed', 'order_id': order.id, 'khalti_status': khalti_status})

    