from django.urls import path
from .views import (
    RegisterView,
    SellerRegisterView,
    ApproveSellerView,
    SetPreferenceView,
    has_preferences,
    whoami,
    my_profile,
    update_profile,
    update_seller_profile,
    list_customers,
    list_sellers,
    delete_user,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('register-seller/', SellerRegisterView.as_view(), name='register-seller'),
    path('sellers/<int:seller_id>/approve/', ApproveSellerView.as_view(), name='approve-seller'),
    path('preferences/', SetPreferenceView.as_view(), name='set-preferences'),
    path('has-preferences/', has_preferences, name='has-preferences'),
    path('whoami/', whoami, name='whoami'),
    path('my-profile/', my_profile, name='my-profile'),
    path('update-profile/', update_profile, name='update-profile'),
    path('update-seller-profile/', update_seller_profile, name='update-seller-profile'),
    path('admin/customers/', list_customers, name='list-customers'),
    path('admin/sellers/', list_sellers, name='list-sellers'),
    path('admin/users/<int:user_id>/delete/', delete_user, name='delete-user'),
]