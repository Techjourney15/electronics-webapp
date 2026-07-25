"""
Product Recommendation Pipeline
================================
Mirrors the flowchart:

Product DataBase (MySQL)  --backed by electronics_dataset_with_images.csv
   |-- Pipeline 1: TF-IDF on text        -> Text Vector
   |-- Pipeline 2: One-hot encoding      -> Category Vector
   |-- Pipeline 3: Min-Max Scaling       -> Spec Vector
        |
        v
Weighted concatenation  (each block multiplied by a tuned weight, then stacked)
        |
        v
Final Product Vector (cached in memory)
        |
        v
User views a product (Trigger: Product detail page)   -- simulated with random.choice
        |
        v
Cosine Similarity computed  (full similarity matrix, built once, reused per lookup)
        |
        v
Sort by similarity score
        |
        v
Top 5 recommendations returned (JSON)

CHANGE FROM PREVIOUS VERSION:
------------------------------
search_weights() now scores candidate weight combos against the shared
majority-vote relevance rule in relevance.py (same category AND >=2 of
price/spec/keyword closeness), instead of a plain same-category proxy.
The plain same-category proxy was circular: the category vector is one
of the three vectors being weighted, so "which weights best predict the
category label" trivially rewarded leaning on the category vector. The
majority-vote rule requires the model to also track price/spec/keyword
agreement, which the category vector alone cannot supply.

sensitivity_analysis.py imports the SAME relevance.build_proxy_relevance
function, so the weight search and the robustness check are evaluated
against one consistent definition of relevance throughout the project.
"""

import json
import random
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder, MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity

from relevance import build_proxy_relevance

# ----------------------------------------------------------------------
# STEP 0: "Product DataBase (MySQL)" -- here backed by the real
# electronics_dataset_with_images.csv (10,000 rows: 6,000 smartphones,
# 4,000 laptops). In production this block is a SQL query
# (SELECT * FROM products) triggered by Refresh (Ctrl+R) / a cron job;
# the CSV plays that role for this script.
# ----------------------------------------------------------------------
CSV_PATH = "./electronics_dataset_with_images.csv"

ID_COL = "product_id"
NAME_COL = "product_name"
CATEGORY_COL = "category"
TEXT_COL = "description"
CAT_COLS = ["category", "sub_category", "brand", "os"]
SPEC_COLS = ["price_npr", "ram_gb", "storage_gb", "display_size_inches",
             "refresh_rate_hz", "battery_mah", "weight_grams", "rating"]
PRICE_COL = "price_npr"


def load_product_database(csv_path: str = CSV_PATH) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df = df.dropna(subset=[TEXT_COL] + CAT_COLS + SPEC_COLS).reset_index(drop=True)
    return df


# ----------------------------------------------------------------------
# PIPELINE 1: TF-IDF on text -> Text Vector
# ----------------------------------------------------------------------
def build_text_vector(df: pd.DataFrame):
    tfidf = TfidfVectorizer(stop_words="english", max_features=500)
    text_vec = tfidf.fit_transform(df[TEXT_COL]).toarray().astype(np.float32)
    return text_vec


# ----------------------------------------------------------------------
# PIPELINE 2: One-hot encoding -> Category Vector
# ----------------------------------------------------------------------
def build_category_vector(df: pd.DataFrame):
    encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
    cat_vec = encoder.fit_transform(df[CAT_COLS]).astype(np.float32)
    return cat_vec


# ----------------------------------------------------------------------
# PIPELINE 3: Min-Max Scaling -> Spec Vector
# ----------------------------------------------------------------------
def build_spec_vector(df: pd.DataFrame):
    scaler = MinMaxScaler()
    spec_vec = scaler.fit_transform(df[SPEC_COLS]).astype(np.float32)
    return spec_vec


# ----------------------------------------------------------------------
# WEIGHT DISCOVERY
# ----------------------------------------------------------------------
def search_weights(text_vec, cat_vec, spec_vec, df: pd.DataFrame,
                    sample_size: int = 400, random_state: int = 42):
    """
    Grid-searches weights on a small STRATIFIED SAMPLE (not the full 10k
    rows) because grid search means rebuilding a similarity matrix once
    per candidate combo. Scores each combo against the shared
    majority-vote relevance labels (relevance.build_proxy_relevance),
    NOT a plain same-category proxy -- see module docstring.
    """
    rng = np.random.RandomState(random_state)
    sample_idx = (
        df.groupby(CATEGORY_COL, group_keys=False)
        .apply(lambda g: g.sample(min(len(g), sample_size // df[CATEGORY_COL].nunique()),
                                   random_state=random_state),
               include_groups=False)
        .index.to_numpy()
        .copy()
    )
    rng.shuffle(sample_idx)

    t_s, c_s, s_s = text_vec[sample_idx], cat_vec[sample_idx], spec_vec[sample_idx]

    proxy_label = build_proxy_relevance(
        df, sample_idx,
        category_col=CATEGORY_COL, spec_cols=SPEC_COLS, text_col=TEXT_COL,
        price_col=PRICE_COL,
    )

    candidates = np.arange(0.1, 1.01, 0.2)  # 0.1, 0.3, 0.5, 0.7, 0.9
    best_score, best_weights = -np.inf, (0.5, 0.3, 0.2)
    mask = ~np.isnan(proxy_label)

    for wt in candidates:
        for wc in candidates:
            for ws in candidates:
                final_vec = np.hstack([t_s * wt, c_s * wc, s_s * ws])
                sim = cosine_similarity(final_vec)
                score = np.corrcoef(sim[mask], proxy_label[mask])[0, 1]
                if score > best_score:
                    best_score = score
                    best_weights = (wt, wc, ws)

    total = sum(best_weights)
    best_weights = tuple(round(w / total, 3) for w in best_weights)
    return best_weights, best_score


# ----------------------------------------------------------------------
# WEIGHTED CONCATENATION -> FINAL PRODUCT VECTOR (cached in memory)
# ----------------------------------------------------------------------
def build_final_vectors(text_vec, cat_vec, spec_vec, weights):
    w_text, w_cat, w_spec = weights
    final_vector = np.hstack([text_vec * w_text, cat_vec * w_cat, spec_vec * w_spec])
    return final_vector


# ----------------------------------------------------------------------
# COSINE SIMILARITY computed ONCE over the whole cache -> similarity matrix
# ----------------------------------------------------------------------
def build_similarity_matrix(final_vectors):
    return cosine_similarity(final_vectors)


# ----------------------------------------------------------------------
# "User views a product" -> Top 5 recommendations -> JSON
# ----------------------------------------------------------------------
def recommend_top5(df: pd.DataFrame, sim_matrix: np.ndarray, product_id: str, k: int = 5):
    idx = df.index[df[ID_COL] == product_id][0]
    scores = list(enumerate(sim_matrix[idx]))
    scores = [(i, s) for i, s in scores if i != idx]
    scores.sort(key=lambda x: x[1], reverse=True)
    top_k = scores[:k]

    viewed_product = df.loc[idx, [ID_COL, NAME_COL, CATEGORY_COL]].to_dict()
    recommendations = [
        {
            "id": df.loc[i, ID_COL],
            "name": df.loc[i, NAME_COL],
            "category": df.loc[i, CATEGORY_COL],
            "similarity_score": round(float(s), 4),
        }
        for i, s in top_k
    ]
    return {"viewed_product": viewed_product, "recommendations": recommendations}


# ----------------------------------------------------------------------
# MAIN
# ----------------------------------------------------------------------
def main():
    df = load_product_database()
    print(f"Loaded {len(df)} products "
          f"({(df[CATEGORY_COL] == 'Laptop').sum()} laptops, "
          f"{(df[CATEGORY_COL] == 'Smartphone').sum()} smartphones)\n")

    text_vec = build_text_vector(df)
    cat_vec = build_category_vector(df)
    spec_vec = build_spec_vector(df)

    weights, score = search_weights(text_vec, cat_vec, spec_vec, df)
    print(f"Chosen weights -> text: {weights[0]}, category: {weights[1]}, "
          f"spec: {weights[2]}  (relevance-label correlation score: {score:.3f})\n")

    final_vectors = build_final_vectors(text_vec, cat_vec, spec_vec, weights)
    sim_matrix = build_similarity_matrix(final_vectors)
    print(f"Similarity matrix cached: {sim_matrix.shape}\n")

    random.seed()
    laptop_ids = df.loc[df[CATEGORY_COL] == "Laptop", ID_COL].tolist()
    phone_ids = df.loc[df[CATEGORY_COL] == "Smartphone", ID_COL].tolist()
    demo_ids = random.sample(laptop_ids, 5) + random.sample(phone_ids, 5)

    results = [recommend_top5(df, sim_matrix, pid, k=5) for pid in demo_ids]
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()