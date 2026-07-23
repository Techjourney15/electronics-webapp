import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'electro_backend.settings')
django.setup()

import pandas as pd
from catalog.models import Brand, Category, Product

df = pd.read_csv('electronics_dataset_with_images.csv')

brand_cache = {}
category_cache = {}

def get_or_create_brand(name):
    if name not in brand_cache:
        obj, _ = Brand.objects.get_or_create(name=name)
        brand_cache[name] = obj
    return brand_cache[name]

def get_or_create_category(name):
    if name not in category_cache:
        obj, _ = Category.objects.get_or_create(name=name)
        category_cache[name] = obj
    return category_cache[name]

created, skipped = 0, 0

for _, row in df.iterrows():
    if Product.objects.filter(product_id=row['product_id']).exists():
        skipped += 1
        continue

    filename = os.path.basename(row['image_path'])

    Product.objects.create(
        product_id=row['product_id'],
        product_name=row['product_name'],
        category=get_or_create_category(row['category']),
        sub_category=row['sub_category'],
        brand=get_or_create_brand(row['brand']),
        model=row['model'],
        price_npr=row['price_npr'],
        ram_gb=row['ram_gb'],
        storage_gb=row['storage_gb'],
        processor=row['processor'],
        gpu=row['gpu'],
        os=row['os'],
        battery_mah=row['battery_mah'],
        display_size_inches=row['display_size_inches'],
        display_type=row['display_type'],
        display_resolution=row['display_resolution'],
        refresh_rate_hz=row['refresh_rate_hz'],
        rear_camera_mp=row['rear_camera_mp'],
        front_camera_mp=row['front_camera_mp'],
        fast_charging_watts=row['fast_charging_watts'],
        weight_grams=row['weight_grams'],
        color=row['color'],
        warranty_years=row['warranty_years'],
        rating=row['rating'],
        num_ratings=row['num_ratings'],
        stock_quantity=row['stock_quantity'],
        seller_name=row['seller_name'],
        description=row['description'],
        image=filename,
    )
    created += 1

    if created % 1000 == 0:
        print(f"  ...{created} rows imported so far")

print(f"Done. Created: {created}, Skipped (already existed): {skipped}")