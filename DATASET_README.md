# Nexora Dataset - Setup Instructions

## Files Included
1. **nexora_electronics_dataset.csv** — 10,000 products (6,000 phones + 4,000 laptops), 28 columns, zero nulls
2. **download_product_images.py** — Script to download one image per unique model (~150 images)

## Step-by-Step Setup

### Step 1: Install Dependencies
```bash
pip install duckduckgo-search requests pandas Pillow
```

### Step 2: Place Both Files in Same Folder
```
your_project/
├── nexora_electronics_dataset.csv
├── download_product_images.py
```

### Step 3: Run the Image Downloader
```bash
python download_product_images.py
```
This will:
- Create a `product_images/` folder
- Download ~150 unique model images (one per model, shared across variants)
- Resize all images to 500x500px JPEG
- Output `nexora_electronics_dataset_with_images.csv` with an `image_filename` column

**Takes about 10-15 minutes.** Already-downloaded images are skipped on re-run.

### Step 4: If Some Downloads Fail
The script creates gray placeholder images for failed downloads and prints a list at the end.
For those models, manually download from:
- GSMArena (phones): https://www.gsmarena.com
- Notebookcheck (laptops): https://www.notebookcheck.net
Save with the same filename shown in the report.

### Step 5: Import Into Django
In your Django model:
```python
# settings.py
MEDIA_ROOT = os.path.join(BASE_DIR, 'product_images')

# models.py — Product model
image = models.ImageField(upload_to='', default='placeholder.jpg')
```

To bulk-import the CSV into MySQL:
```python
import pandas as pd
from your_app.models import Product

df = pd.read_csv('nexora_electronics_dataset_with_images.csv')
for _, row in df.iterrows():
    Product.objects.create(
        name=row['product_name'],
        brand_id=get_or_create_brand(row['brand']),
        category_id=get_or_create_category(row['category']),
        price=row['price_npr'],
        stock=row['stock_quantity'],
        description=row['description'],
        image=row['image_filename'],
        # ... map other fields
    )
```

## Column Reference (28 columns)

| Column | Type | Description | Used For |
|--------|------|-------------|----------|
| product_id | string | PHN-00001 or LPT-00001 | Primary key |
| product_name | string | Full product name with variant | Display |
| category | string | Smartphone / Laptop | One-hot encoding |
| sub_category | string | Budget / Mid-Range / Flagship / Premium | Filtering |
| brand | string | Samsung, Apple, Dell, etc. | One-hot encoding |
| model | string | Base model name | Image mapping |
| price_npr | integer | Price in Nepali Rupees | Min-max normalization |
| ram_gb | integer | RAM in GB | Spec vector |
| storage_gb | integer | Storage in GB | Spec vector |
| processor | string | Processor name | TF-IDF text vector |
| gpu | string | GPU name | TF-IDF text vector |
| os | string | Android / iOS / Windows / macOS | One-hot encoding |
| battery_mah | integer | Battery capacity (mAh for phones, Wh for laptops) | Spec vector |
| display_size_inches | float | Screen size | Spec vector |
| display_type | string | AMOLED, IPS, OLED, etc. | One-hot encoding |
| display_resolution | string | e.g., 1920x1080 | Feature |
| refresh_rate_hz | integer | 60, 90, 120, 144 Hz | Spec vector |
| rear_camera_mp | integer | Rear camera MP (0 for laptops) | Spec vector |
| front_camera_mp | integer | Front camera MP / webcam | Spec vector |
| fast_charging_watts | integer | Charging speed in watts | Spec vector |
| weight_grams | integer | Product weight | Spec vector |
| color | string | Product color | Display |
| warranty_years | integer | 1 or 2 years | Display |
| rating | float | 3.0 - 5.0 | Sorting/display |
| num_ratings | integer | Number of reviews | Social proof |
| stock_quantity | integer | Available stock (0 = out of stock) | Availability filter |
| seller_name | string | Seller business name | Multi-vendor mapping |
| description | string | Auto-generated product description | TF-IDF text vector |

## For the Recommendation Engine

The columns are designed so students can directly build their cosine similarity pipeline:

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Pipeline 1: Text vector (name + description)
tfidf = TfidfVectorizer(max_features=500, stop_words='english')
text_vectors = tfidf.fit_transform(df['product_name'] + ' ' + df['description'])

# Pipeline 2: Category vector (one-hot)
cat_features = pd.get_dummies(df[['category', 'brand', 'os', 'display_type']])

# Pipeline 3: Spec vector (normalized numerics)
scaler = MinMaxScaler()
spec_cols = ['price_npr', 'ram_gb', 'storage_gb', 'battery_mah',
             'display_size_inches', 'refresh_rate_hz', 'weight_grams']
spec_vectors = scaler.fit_transform(df[spec_cols])

# Weighted concatenation
from scipy.sparse import hstack
combined = hstack([
    text_vectors * 0.3,           # 30% weight to text
    cat_features.values * 0.3,    # 30% weight to categories
    spec_vectors * 0.4            # 40% weight to specs
])

# Compute similarity matrix
similarity_matrix = cosine_similarity(combined)
```

## Important Note
This is a synthetic dataset with realistic specifications. Mention in your report as:
"A synthetic product catalog modeled on real-world electronics specifications,
used for development and testing. During deployment, real seller listings replace this seed data."
