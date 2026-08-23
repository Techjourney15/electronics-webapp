import os
import sys
import django
import pickle
import numpy as np

# Add backend/ to Python path
BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))
        )
    )
)
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'electro_backend.settings')
django.setup()
from catalog.models import Product
from catalog.image_search import extract_features_batch
from django.conf import settings

features = {}
products = list(Product.objects.exclude(image='').exclude(image__isnull=True))

print(f"Processing {len(products)} products...")

BATCH_SIZE = 32
for start in range(0, len(products), BATCH_SIZE):
    batch = products[start:start + BATCH_SIZE]
    image_paths = [os.path.join(settings.MEDIA_ROOT, str(p.image)) for p in batch]

    results = extract_features_batch(image_paths)

    for p, vec in zip(batch, results):
        if vec is not None:
            features[p.id] = vec

    print(f"  Processed {min(start + BATCH_SIZE, len(products))}/{len(products)}")

output_path = os.path.join(os.path.dirname(__file__), 'image_features.pkl')
with open(output_path, 'wb') as f:
    pickle.dump(features, f)

print(f"Done. Processed {len(features)} product images.")
print(f"Saved to {output_path}")