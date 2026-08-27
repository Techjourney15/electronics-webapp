from django.contrib import admin
from .models import User, Seller

admin.site.register(User)

@admin.register(Seller)
class SellerAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'user', 'verification_status')
    list_editable = ('verification_status',)