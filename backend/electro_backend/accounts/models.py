from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('customer', 'Customer'),
        ('seller', 'Seller'),
        ('admin', 'Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')

    def __str__(self):
        return f"{self.username} ({self.role})"


class Seller(models.Model):
    VERIFICATION_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='seller_profile')
    business_name = models.CharField(max_length=150)
    contact_info = models.CharField(max_length=100)
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_CHOICES, default='pending')

    def __str__(self):
        return f"{self.business_name} ({self.verification_status})"

class CustomerPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preference')
    category = models.CharField(max_length=50, blank=True)  # 'Smartphone', 'Laptop', or 'Both'
    min_price = models.IntegerField(null=True, blank=True)
    max_price = models.IntegerField(null=True, blank=True)
    priority_spec = models.CharField(max_length=50, blank=True)  # e.g. 'camera', 'performance', 'battery'

    def __str__(self):
        return f"Preferences({self.user.username})"