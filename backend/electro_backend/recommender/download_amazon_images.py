import pandas as pd
import requests
import os

CSV_PATH = "amazon_products.csv"
OUTPUT_DIR = "amazon_images"
SAMPLE_SIZE = 2000  

df = pd.read_csv(CSV_PATH)
sampled = df.sample(min(SAMPLE_SIZE, len(df)), random_state=42)

os.makedirs(OUTPUT_DIR, exist_ok=True)
downloaded = []

for idx, row in sampled.iterrows():
    url = row['image']
    filename = f"{idx}.jpg"
    filepath = os.path.join(OUTPUT_DIR, filename)

    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(resp.content)
            downloaded.append({'image_path': filepath, 'product_name': row['name']})
            if len(downloaded) % 50 == 0:
                print(f"Downloaded {len(downloaded)} so far...")
    except Exception as e:
        pass  

result_df = pd.DataFrame(downloaded)
result_df.to_csv("amazon_images_downloaded.csv", index=False)
print(f"\nDone. Downloaded {len(downloaded)} images out of {len(sampled)} attempted.")