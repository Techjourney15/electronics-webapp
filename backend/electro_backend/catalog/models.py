
from django.db import models
from accounts.models import Seller
from django.conf import settings


class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    product_id = models.CharField(max_length=20, unique=True)
    product_name = models.CharField(max_length=255)
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    sub_category = models.CharField(max_length=50)
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT)
    seller = models.ForeignKey(Seller, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    model = models.CharField(max_length=100)
    price_npr = models.IntegerField()
    ram_gb = models.IntegerField()
    storage_gb = models.IntegerField()
    processor = models.CharField(max_length=150)
    gpu = models.CharField(max_length=150)
    os = models.CharField(max_length=50)
    battery_mah = models.IntegerField()
    display_size_inches = models.FloatField()
    display_type = models.CharField(max_length=50)
    display_resolution = models.CharField(max_length=50)
    refresh_rate_hz = models.IntegerField()
    rear_camera_mp = models.IntegerField()
    front_camera_mp = models.IntegerField()
    fast_charging_watts = models.IntegerField()
    weight_grams = models.IntegerField()
    color = models.CharField(max_length=50)
    warranty_years = models.IntegerField()
    rating = models.FloatField()
    num_ratings = models.IntegerField()
    stock_quantity = models.IntegerField()
    seller_name = models.CharField(max_length=150)
    description = models.TextField()
    image = models.ImageField(upload_to='product_images', default='placeholder.jpg')

    def __str__(self):
        return self.product_name




class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart({self.user.username})"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cart', 'product')

    def __str__(self):
        return f"{self.quantity} x {self.product.product_name}"



class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending Payment'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )
    PAYMENT_METHOD_CHOICES = (
        ('khalti', 'Khalti'),
        ('cod', 'Cash on Delivery'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    total_amount = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    khalti_pidx = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return f"Order #{self.id} ({self.status})"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True
    )

    product_name_snapshot = models.CharField(max_length=255)
    price_at_purchase = models.IntegerField()
    quantity = models.PositiveIntegerField()

    # Seller information at the time of purchase
    seller_name_snapshot = models.CharField(
        max_length=150,
        blank=True
    )
    seller_business_snapshot = models.CharField(
        max_length=150,
        blank=True
    )
    seller_email_snapshot = models.EmailField(
        blank=True
    )
    seller_contact_snapshot = models.CharField(
        max_length=100,
        blank=True
    )

    def __str__(self):
        return f"{self.quantity} x {self.product_name_snapshot}"

class ProductView(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='product_views')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    viewed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} viewed {self.product.product_name}"


class SearchLog(models.Model):
    SEARCH_TYPES = (('text', 'Text'), ('image', 'Image'))
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='search_logs', null=True, blank=True)
    search_type = models.CharField(max_length=10, choices=SEARCH_TYPES)
    query_text = models.CharField(max_length=255, blank=True)
    matched_product_ids = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.search_type} search by {self.user_id or 'anon'} at {self.created_at}"