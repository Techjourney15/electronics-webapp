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