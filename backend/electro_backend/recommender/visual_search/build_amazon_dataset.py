import os
import sys
import django
import pickle
import pandas as pd
from pathlib import Path
from django.core.files import File

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'electro_backend.settings')
django.setup()

from catalog.models import Product, Category, Brand
from catalog.image_search import extract_features_batch

BASE_DIR = Path(__file__).resolve().parent
RECOMMENDER_DIR = BASE_DIR.parent
CSV_PATH = BASE_DIR / 'amazon_dataset.csv'
IMAGES_DIRS = [
    RECOMMENDER_DIR / 'amazon_images',
    BASE_DIR / 'amazon_images',
]
FEATURES_OUTPUT = BASE_DIR / 'image_features_extra_by_id.pkl'


def find_image_path(filename):
    for image_dir in IMAGES_DIRS:
        candidate = image_dir / filename
        if candidate.exists():
            return candidate
    return None


df = pd.read_csv(CSV_PATH)
print(f"Loaded {len(df)} rows from {CSV_PATH}")

category, _ = Category.objects.get_or_create(name='Accessories')
brand, _ = Brand.objects.get_or_create(name='Amazon Import')

# full rebuild -- delete all existing Amazon products first to avoid
# duplicate-name conflicts, then recreate fresh from the CSV every time
deleted, _ = Product.objects.filter(product_id__startswith='AMZ-').delete()
print(f"Cleared {deleted} existing Amazon products before rebuild")

image_paths = []
product_objs = []

for i, row in df.iterrows():
    name = str(row['product_name'])
    description = str(row.get('description', name))
    price = int(row['price_npr']) if not pd.isna(row['price_npr']) else 2000
    image_filename = str(row['image_filename'])
    full_image_path = find_image_path(image_filename)

    product = Product.objects.create(
        product_id=f"AMZ-{i:05d}",
        product_name=name,
        category=category,
        sub_category='Accessories',
        brand=brand,
        model=name[:100],
        price_npr=price,
        ram_gb=0, storage_gb=0, processor='N/A', gpu='N/A', os='N/A',
        battery_mah=0, display_size_inches=0, display_type='N/A',
        display_resolution='N/A', refresh_rate_hz=0, rear_camera_mp=0,
        front_camera_mp=0, fast_charging_watts=0, weight_grams=0,
        color='N/A', warranty_years=1, rating=4.0, num_ratings=0,
        stock_quantity=10, seller_name='Amazon Import', description=description,
    )

    if full_image_path:
        with open(full_image_path, 'rb') as img_f:
            product.image.save(image_filename, File(img_f), save=True)
        image_paths.append(str(full_image_path))
        product_objs.append(product)
    else:
        print(f"Missing image: {image_filename} for {name}")

print(f"Created {len(product_objs)} products with images")

print("Extracting visual features...")
vectors = extract_features_batch(image_paths)

features_by_id = {}
for product, vec in zip(product_objs, vectors):
    if vec is not None:
        features_by_id[product.id] = vec

with open(FEATURES_OUTPUT, 'wb') as f:
    pickle.dump(features_by_id, f)

print(f"Saved {len(features_by_id)} feature vectors to {FEATURES_OUTPUT}")
print("Done. Restart the Django server to load the updated data.")