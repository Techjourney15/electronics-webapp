"""
Tiered recommendation: same-brand products ranked first,
cross-brand alternatives with similar price/specs fill in after.
"""

import os
import pickle
import numpy as np

path = os.path.join(os.path.dirname(__file__), 'similarity_matrix.pkl')
with open(path, 'rb') as f:
    data = pickle.load(f)

feature_similarity_matrix = data['feature_similarity_matrix']
product_names = data['product_names']
brands = data['brands']
prices = data['prices']


def get_tiered_recommendations(row_idx, top_n=10, price_tolerance=0.3):
    """
    price_tolerance = 0.3 means cross-brand matches must be within
    +/-30% of the target product's price to be considered 'comparable'.
    """
    target_brand = brands[row_idx]
    target_price = prices[row_idx]
    scores = feature_similarity_matrix[row_idx]

    candidates = []
    for idx in range(len(product_names)):
        if idx == row_idx:
            continue

        same_brand = (brands[idx] == target_brand)

        if not same_brand:
            # only consider cross-brand if price is reasonably close
            price_diff_ratio = abs(prices[idx] - target_price) / target_price
            if price_diff_ratio > price_tolerance:
                continue  # skip cross-brand products that are way off in price

        candidates.append((idx, same_brand, scores[idx]))

    # Sort: same-brand group first (True > False), then by similarity score
    candidates.sort(key=lambda x: (-x[1], -x[2]))

    return candidates[:top_n]


def show_tiered(row_idx, top_n=10):
    name = product_names[row_idx]
    print(f"\n=== Tiered recommendations for: {name} ===")
    results = get_tiered_recommendations(row_idx, top_n=top_n)
    for idx, same_brand, score in results:
        tag = "[SAME BRAND]" if same_brand else "[CROSS-BRAND]"
        print(f"  {tag:<15} {product_names[idx]:<50} score={score:.4f}  price=Rs.{prices[idx]}")


def find_and_show(search_term, top_n=10):
    matches = [i for i, name in enumerate(product_names) if search_term.lower() in name.lower()]
    if not matches:
        print(f"No match for '{search_term}'")
        return
    show_tiered(matches[0], top_n)


# --- Test ---
find_and_show("iPhone 16 Plus")
find_and_show("Acer Aspire 3")