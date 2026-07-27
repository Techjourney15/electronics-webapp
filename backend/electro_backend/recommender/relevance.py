"""
Shared Relevance Definition
============================
Yo file le define garcha "duita product relevant/similar ho" bhanne kura.
Same category AND kamtima 2/3 (price close, spec close, keyword overlap)
match bhaye matra "relevant" maninxa — sirf category matching bata haina.

"""

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler


def build_proxy_relevance(df, sample_idx, category_col, spec_cols, text_col,
                           price_col="price_npr",
                           price_tol=0.15,
                           spec_tol=0.25,
                           keyword_min=3):

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