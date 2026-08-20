import os
import sys
import django
import pickle
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'electro_backend.settings')
django.setup()

from catalog.image_search import extract_features_batch

CSV_PATH = "amazon_images_downloaded.csv"
OUTPUT_PATH = "image_features_extra.pkl"

df = pd.read_csv(CSV_PATH)
print(f"Processing {len(df)} downloaded images...")

image_paths = df['image_path'].tolist()
product_names = df['product_name'].tolist()

BATCH_SIZE = 32
features = {}

for start in range(0, len(image_paths), BATCH_SIZE):
    batch_paths = image_paths[start:start + BATCH_SIZE]
    batch_names = product_names[start:start + BATCH_SIZE]

    results = extract_features_batch(batch_paths)

    for path, name, vec in zip(batch_paths, batch_names, results):
        if vec is not None:
            features[path] = {'name': name, 'vector': vec}

    print(f"  Processed {min(start + BATCH_SIZE, len(image_paths))}/{len(image_paths)}")

with open(OUTPUT_PATH, 'wb') as f:
    pickle.dump(features, f)

print(f"\nDone. Extracted features for {len(features)} images.")
print(f"Saved to {OUTPUT_PATH}")