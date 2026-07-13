"""
Loads the precomputed similarity matrix and prints top-5 recommendations
for a handful of real products, so we can manually judge quality.
"""

import os
import pickle
import numpy as np

path = os.path.join(os.path.dirname(__file__), 'similarity_matrix.pkl')
with open(path, 'rb') as f:
    data = pickle.load(f)

similarity_matrix = data['feature_similarity_matrix']
product_ids = data['product_ids']
product_names = data['product_names']

def show_similar(row_idx, top_n=5):
    name = product_names[row_idx]
    print(f"\n=== Similar to: {name} ===")
    scores = similarity_matrix[row_idx]
    top_indices = np.argsort(scores)[::-1][1:top_n+1]  # skip itself
    for idx in top_indices:
        print(f"  {product_names[idx]:<55} score={scores[idx]:.4f}")

# Pick a few real products across categories/price ranges to spot-check
# We'll search by partial name match so you don't need to know exact row indices

def find_and_show(search_term, top_n=5):
    matches = [i for i, name in enumerate(product_names) if search_term.lower() in name.lower()]
    if not matches:
        print(f"No product found matching '{search_term}'")
        return
    show_similar(matches[0], top_n)


# --- Test a spread of products ---
find_and_show("Xiaomi 14 Ultra")
find_and_show("Acer Aspire 3")
find_and_show("iPhone 16 Plus")
find_and_show("Dell XPS 13")
find_and_show("Redmi Note 12")
def show_similar_detailed(row_idx, top_n=10):
    name = product_names[row_idx]
    print(f"\n=== Similar to: {name} (top {top_n}) ===")
    scores = similarity_matrix[row_idx]
    top_indices = np.argsort(scores)[::-1][1:top_n+1]
    for idx in top_indices:
        print(f"  {product_names[idx]:<55} score={scores[idx]:.4f}")

find_and_show_detailed = lambda term: show_similar_detailed(
    [i for i, n in enumerate(product_names) if term.lower() in n.lower()][0], top_n=10
)

find_and_show_detailed("iPhone 16 Plus")