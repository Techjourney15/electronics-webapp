from django.urls import path
from . import views

urlpatterns = [
    path('products/<int:product_id>/recommendations/', views.get_recommendations, name='product-recommendations'),
    path('products/create/', views.ProductCreateView.as_view(), name='product-create'),
    path('products/featured/', views.featured_products, name='featured-products'),
    path('products/search/', views.search_products, name='product-search'),
    path('products/homepage/', views.personalized_homepage, name='personalized-homepage'),
    path('products/mine/', views.my_products, name='my-products'),
    path('categories/', views.list_categories, name='list-categories'),
    path('brands/', views.list_brands, name='list-brands'),
    path('products/unclaimed/', views.unclaimed_products, name='unclaimed-products'),
    path('products/<int:product_id>/claim/', views.claim_product, name='claim-product'),
    path('products/<int:product_id>/', views.product_detail, name='product-detail'),
]
