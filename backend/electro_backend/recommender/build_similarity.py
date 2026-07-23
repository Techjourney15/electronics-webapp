"""
Builds a product-to-product similarity matrix and brand metadata.
Uses tiered ranking: brand match as primary sort, feature similarity as secondary.
"""

import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import hstack, csr_matrix
import pickle
from decouple import config
from urllib.parse import quote_plus
# ---------------------------------------------------------
# STEP A: Connect to MySQL and pull the columns we need
# ---------------------------------------------------------
db_password = quote_plus(config('DB_PASSWORD'))
engine = create_engine(
    f"mysql+pymysql://{config('DB_USER')}:{db_password}"
    f"@{config('DB_HOST')}:{config('DB_PORT')}/{config('DB_NAME')}"
)
query = """
SELECT
    p.id, p.product_id, p.product_name, p.description,
    cat.name AS category, b.name AS brand, p.os, p.display_type,
    p.price_npr, p.ram_gb, p.storage_gb, p.battery_mah,
    p.display_size_inches, p.refresh_rate_hz, p.weight_grams
FROM catalog_product p
JOIN catalog_category cat ON p.category_id = cat.id
JOIN catalog_brand b ON p.brand_id = b.id
"""

print("Loading data from MySQL...")
df = pd.read_sql(query, engine)
print(f"Loaded {len(df)} products.")

# ---------------------------------------------------------
# STEP B: TF-IDF on text columns
# ---------------------------------------------------------
print("Building TF-IDF text vectors...")
text_data = df['product_name'].fillna('') + ' ' + df['description'].fillna('')
tfidf = TfidfVectorizer(max_features=500, stop_words='english')
text_vectors = tfidf.fit_transform(text_data)

# ---------------------------------------------------------
# STEP C: One-hot encode categorical columns — BRAND EXCLUDED
# (category/os/display_type only — these have few unique values,
#  so they don't suffer the same all-or-nothing dominance problem)
# ---------------------------------------------------------
print("Building one-hot category vectors (brand excluded)...")
cat_features = pd.get_dummies(
    df[['category', 'os', 'display_type']],
    prefix=['category', 'os', 'display_type']
)
cat_matrix = csr_matrix(cat_features.values.astype(float))

# ---------------------------------------------------------
# STEP D: Min-max scale numeric spec columns
# ---------------------------------------------------------
print("Scaling numeric spec columns...")
spec_cols = [
    'price_npr', 'ram_gb', 'storage_gb', 'battery_mah',
    'display_size_inches', 'refresh_rate_hz', 'weight_grams'
]
scaler = MinMaxScaler()
spec_vectors = scaler.fit_transform(df[spec_cols])
spec_matrix = csr_matrix(spec_vectors)

# ---------------------------------------------------------
# STEP E: Combine (brand no longer in this vector at all)
# ---------------------------------------------------------
print("Combining vectors...")
combined = hstack([
    text_vectors * 0.05,
    cat_matrix * 0.05,
    spec_matrix * 0.9,
]).tocsr()

# ---------------------------------------------------------
# STEP F: Compute feature-only cosine similarity matrix
# ---------------------------------------------------------
print("Computing feature similarity matrix...")
feature_similarity_matrix = cosine_similarity(combined)
print(f"Shape: {feature_similarity_matrix.shape}")

# ---------------------------------------------------------
# STEP G: Save everything — including brand list for tiered ranking
# ---------------------------------------------------------
output = {
    'feature_similarity_matrix': feature_similarity_matrix,
    'product_ids': df['id'].tolist(),
    'product_names': df['product_name'].tolist(),
    'brands': df['brand'].tolist(),          # NEW — needed for tiered ranking
    'prices': df['price_npr'].tolist(),      # NEW — handy for filtering by price range
}

output_path = os.path.join(os.path.dirname(__file__), 'similarity_matrix.pkl')
with open(output_path, 'wb') as f:
    pickle.dump(output, f)

print(f"Saved to {output_path}")
print("Done.")