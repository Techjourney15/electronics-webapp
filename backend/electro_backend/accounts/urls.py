from django.urls import path
from .views import (
    RegisterView,
    SellerRegisterView,
    ApproveSellerView,
    SetPreferenceView,
    has_preferences,
    whoami,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('register-seller/', SellerRegisterView.as_view(), name='register-seller'),
    path('sellers/<int:seller_id>/approve/', ApproveSellerView.as_view(), name='approve-seller'),
    path('preferences/', SetPreferenceView.as_view(), name='set-preferences'),
    path('has-preferences/', has_preferences, name='has-preferences'),
    path('whoami/', whoami, name='whoami'),
]