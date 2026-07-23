# Create your models here.
from django.db import models
from accounts.models import Seller


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