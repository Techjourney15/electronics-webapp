from django.urls import path
from . import views
from .payment import initiate_payment, verify_payment


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
    path('cart/', views.view_cart, name='view-cart'),
    path('cart/add/', views.add_to_cart, name='add-to-cart'),
    path('cart/items/<int:item_id>/', views.remove_from_cart, name='remove-cart-item'),
    path('cart/items/<int:item_id>/update/', views.update_cart_item, name='update-cart-item'),
    path('orders/', views.my_orders, name='my-orders'),
    path('checkout/', views.checkout, name='checkout'),
    path('admin/orders/', views.all_orders, name='all-orders'),
    path('sellers/<int:seller_id>/products/', views.seller_storefront, name='seller-storefront'),
    path('products/log-view/', views.log_product_view, name='log-product-view'),
    path('products/visual-search/', views.visual_search, name='visual-search'),
    path('products/semantic-search/', views.semantic_search, name='semantic-search'),
    path('khalti/initiate/', initiate_payment, name='khalti-initiate'),
    path('khalti/verify/', verify_payment, name='khalti-verify'),
    path('products/<int:product_id>/toggle-favorite/', views.toggle_favorite, name='toggle-favorite'),
    path('favorites/', views.list_favorites, name='list-favorites'),
]
