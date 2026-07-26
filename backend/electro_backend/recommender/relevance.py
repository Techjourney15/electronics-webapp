"""
Shared Relevance Definition
============================

Single source of truth for "what counts as a relevant/similar product
pair" in this project. Both recommendation_pipeline.py (weight search)
and sensitivity_analysis.py (robustness check) import build_proxy_relevance
from HERE, instead of each defining their own rule. That consistency is
the whole point: it removes the risk of the search and the evaluation
silently disagreeing on what "good" means.

Rule (majority vote): a pair is considered relevant if they are in the
SAME CATEGORY, AND at least 2 of these 3 additional signals agree:
  - price within `price_tol` of each other (relative difference)
  - spec vectors close together (normalized L2 distance below `spec_tol`)
  - description keyword overlap >= `keyword_min` (top-8 TF-IDF terms)

Why this instead of "same category only":
  Same-category-only is circular -- one of the three input vectors IS
  the category (one-hot encoded), so testing "which weights best predict
  the category label" trivially rewards leaning on the category vector.
  Requiring 2-of-3 additional agreement makes the label test something
  the model actually has to work for, not something already encoded in
  one of its own inputs.

This is a domain/business-rule proxy, not ground truth from real user
behavior (clicks/purchases). That's a standard, documented tradeoff for
offline recommender evaluation without production interaction data --
state it as such in defense rather than presenting it as verified truth.
"""

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler


def build_proxy_relevance(df, sample_idx, category_col, spec_cols, text_col,
                           price_col="price_npr",
                           price_tol=0.15,
                           spec_tol=0.25,
                           keyword_min=3):
    """
    Returns an (n, n) relevance label matrix (1 = relevant, 0 = not
    relevant, NaN on the diagonal), aligned to `sample_idx` order.

    Parameters mirror the pipeline's column names so both callers can
    pass their existing constants straight through (CATEGORY_COL,
    SPEC_COLS, TEXT_COL, etc.) without re-deriving anything.
    """
    sub = df.loc[sample_idx].reset_index(drop=True)
    n = len(sub)

    # --- same category ---
    categories = sub[category_col].to_numpy(dtype=str)
    same_cat = categories[:, None] == categories[None, :]

    # --- price closeness ---
    prices = sub[price_col].to_numpy(dtype=float)
    price_close = (
        np.abs(prices[:, None] - prices[None, :]) /
        (np.maximum(prices[:, None], prices[None, :]) + 1e-9)
    ) < price_tol

    # --- spec closeness (normalized L2 distance) ---
    spec_scaled = MinMaxScaler().fit_transform(sub[spec_cols].to_numpy(dtype=float))
    spec_dist = np.linalg.norm(spec_scaled[:, None, :] - spec_scaled[None, :, :], axis=2)
    spec_dist_norm = spec_dist / (spec_dist.max() + 1e-9)
    spec_close = spec_dist_norm < spec_tol

    # --- description keyword overlap (top-8 TF-IDF terms per product) ---
    tfidf = TfidfVectorizer(stop_words="english", max_features=500)
    tfidf_matrix = tfidf.fit_transform(sub[text_col]).toarray()
    vocab = np.array(tfidf.get_feature_names_out())
    top8_sets = []
    for row in tfidf_matrix:
        top_idx = np.argsort(row)[-8:]
        top8_sets.append(set(vocab[top_idx][row[top_idx] > 0]))
    keyword_overlap = np.zeros((n, n), dtype=int)
    for i in range(n):
        for j in range(i + 1, n):
            overlap = len(top8_sets[i] & top8_sets[j])
            keyword_overlap[i, j] = overlap
            keyword_overlap[j, i] = overlap
    keyword_close = keyword_overlap >= keyword_min

    # --- majority vote (need same category AND >= 2 of the 3 signals) ---
    votes = price_close.astype(int) + spec_close.astype(int) + keyword_close.astype(int)
    label_matrix = (same_cat & (votes >= 2)).astype(float)
    np.fill_diagonal(label_matrix, np.nan)
    return label_matrix