"""
SEMANTIC SEARCH ACCURACY EVALUATION
======================================
Yo script VISUAL search evaluation sanga EKDAM UESTAI ho — farak matra
euta thau ma: image feature (MobileNetV2) ko sattama, TEXT embedding
(Sentence-BERT / all-MiniLM-L6-v2) use garincha.

Yo le k garcha:
1. Product dataset ra text embeddings (product_embeddings.pkl) load garcha
2. Ground truth relevance table banaucha (relevance.py ko SAME rule)
3. Text embedding similarity (cosine similarity) anusar products lai RANK garcha
4. Precision, Hit Rate, MRR, NDCG, Recall nikalcha
5. Hamro MODEL, CATEGORY-RANDOM, ra PURE-RANDOM — teenai compare garcha

HOW TO RUN:
    Yo file lai `electronics_dataset_with_images.csv` ra
    `product_embeddings.pkl` sanga same folder maa rakhera chalaunus:
        python semantic_search_accuracy_eval_v2.py
"""

import pickle
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity

RANDOM_SEED = 42
TOP_K = 5
SAMPLE_SIZE = 400

rng = np.random.default_rng(RANDOM_SEED)


# ---------------------------------------------------------------------------
# STEP 1: DATA LOAD GARNE
# ---------------------------------------------------------------------------
df = pd.read_csv("electronics_dataset_with_images.csv")
df = df.reset_index(drop=True)
df["pk"] = df.index + 1  # visual search maa jastai, CSV row order = Django id assumption

# Sentence-BERT le nikaleko text embeddings (384 number ko list, har product
# ko `product_name + brand + description` bata banaeko)
with open("product_embeddings.pkl", "rb") as f:
    text_embeddings = pickle.load(f)

df = df[df["pk"].isin(text_embeddings.keys())]
df = df[df["pk"] <= 10000].reset_index(drop=True)
print(f"Products with usable text embeddings: {len(df)}")

CATEGORY_COL = "category"
PRICE_COL = "price_npr"
SPEC_COLS = ["ram_gb", "storage_gb", "display_size_inches", "battery_mah",
             "rear_camera_mp", "front_camera_mp", "weight_grams",
             "refresh_rate_hz", "fast_charging_watts"]
TEXT_COL = "description"

sample_idx = rng.choice(df.index, size=SAMPLE_SIZE, replace=False)
sub = df.loc[sample_idx].reset_index(drop=True)
n = len(sub)
print(f"Evaluating on {n} sampled products...")


# ---------------------------------------------------------------------------
# STEP 2: GROUND TRUTH — visual search evaluation ma jastai SAME rule
# ---------------------------------------------------------------------------
# NOTE: relevance rule maa euta signal "description keyword overlap" cha —
# yo TEXT-based signal ho. Tesैले semantic search (jun text embedding use
# garcha) lai yaha natural advantage huncha visual search bhanda — kina
# bhane ground truth pani part-text-based ho.
def build_proxy_relevance(sub, category_col, spec_cols, text_col, price_col,
                           price_tol=0.15, spec_tol=0.25, keyword_min=3):
    n = len(sub)
    categories = sub[category_col].to_numpy(dtype=str)
    same_cat = categories[:, None] == categories[None, :]

    prices = sub[price_col].to_numpy(dtype=float)
    price_close = (
        np.abs(prices[:, None] - prices[None, :]) /
        (np.maximum(prices[:, None], prices[None, :]) + 1e-9)
    ) < price_tol

    spec_scaled = MinMaxScaler().fit_transform(sub[spec_cols].to_numpy(dtype=float))
    spec_dist = np.linalg.norm(spec_scaled[:, None, :] - spec_scaled[None, :, :], axis=2)
    spec_dist_norm = spec_dist / (spec_dist.max() + 1e-9)
    spec_close = spec_dist_norm < spec_tol

    tfidf = TfidfVectorizer(stop_words="english", max_features=500)
    tfidf_matrix = tfidf.fit_transform(sub[text_col].fillna("")).toarray()
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

    votes = price_close.astype(int) + spec_close.astype(int) + keyword_close.astype(int)
    label_matrix = (same_cat & (votes >= 2)).astype(float)
    np.fill_diagonal(label_matrix, np.nan)
    return label_matrix


label_matrix = build_proxy_relevance(sub, CATEGORY_COL, SPEC_COLS, TEXT_COL, PRICE_COL)
categories = sub[CATEGORY_COL].to_numpy(dtype=str)


# ---------------------------------------------------------------------------
# STEP 3: METRIC FUNCTIONS — visual search ma jastai SAME
# ---------------------------------------------------------------------------
def precision_at_k(rel, k):
    return rel[:k].sum() / k

def hit_at_k(rel, k):
    return 1.0 if rel[:k].sum() > 0 else 0.0

def mrr(rel):
    hits = np.where(rel > 0)[0]
    return 1.0 / (hits[0] + 1) if len(hits) else 0.0

def ndcg_at_k(rel, k):
    r = rel[:k]
    disc = 1.0 / np.log2(np.arange(2, k + 2))
    dcg = (r * disc).sum()
    ideal = np.sort(rel)[::-1][:k]
    idcg = (ideal * disc).sum()
    return dcg / idcg if idcg > 0 else 0.0

def evaluate_ranking(sim_matrix, label_matrix, n):
    precisions, hits, mrrs, ndcgs = [], [], [], []
    for i in range(n):
        order = np.argsort(-sim_matrix[i])
        rel_row = np.nan_to_num(label_matrix[i][order], nan=0.0)
        precisions.append(precision_at_k(rel_row, TOP_K))
        hits.append(hit_at_k(rel_row, TOP_K))
        mrrs.append(mrr(rel_row))
        ndcgs.append(ndcg_at_k(rel_row, TOP_K))
    return np.mean(precisions), np.mean(hits), np.mean(mrrs), np.mean(ndcgs)


# ---------------------------------------------------------------------------
# STEP 4: TEEN WOTA RANKING METHOD
# ---------------------------------------------------------------------------

# --- Method A: HAMRO MODEL — Sentence-BERT text embedding cosine similarity ---
pks = sub["pk"].to_numpy()
emb_matrix = np.array([text_embeddings[pk] for pk in pks])
txt_sim = cosine_similarity(emb_matrix)
np.fill_diagonal(txt_sim, -np.inf)

# --- Method B: CATEGORY-RANDOM baseline ---
def category_random_similarity(categories, n, rng):
    sim = rng.random((n, n))
    same_cat = categories[:, None] == categories[None, :]
    sim[~same_cat] = -np.inf
    np.fill_diagonal(sim, -np.inf)
    return sim

cat_rand_sim = category_random_similarity(categories, n, rng)

# --- Method C: PURE-RANDOM baseline (neech ko loop maa) ---


# ---------------------------------------------------------------------------
# STEP 5: EVALUATE GARNE
# ---------------------------------------------------------------------------
s_model = evaluate_ranking(txt_sim, label_matrix, n)
s_catrand = evaluate_ranking(cat_rand_sim, label_matrix, n)

pure_rand_precisions, pure_rand_hits, pure_rand_mrrs, pure_rand_ndcgs = [], [], [], []
for i in range(n):
    order = rng.permutation(n)
    order = order[order != i]
    rel_row = np.nan_to_num(label_matrix[i][order], nan=0.0)
    pure_rand_precisions.append(precision_at_k(rel_row, TOP_K))
    pure_rand_hits.append(hit_at_k(rel_row, TOP_K))
    pure_rand_mrrs.append(mrr(rel_row))
    pure_rand_ndcgs.append(ndcg_at_k(rel_row, TOP_K))
s_purerand = (np.mean(pure_rand_precisions), np.mean(pure_rand_hits),
              np.mean(pure_rand_mrrs), np.mean(pure_rand_ndcgs))

print("\n=== SEMANTIC SEARCH RESULTS ===")
print(f"{'Metric':<14}{'Model':>10}{'Cat-Random':>14}{'Pure-Random':>14}")
for name, i in zip(["Precision@5", "Hit Rate@5", "MRR", "NDCG@5"], range(4)):
    print(f"{name:<14}{s_model[i]:>10.3f}{s_catrand[i]:>14.3f}{s_purerand[i]:>14.3f}")


# ---------------------------------------------------------------------------
# STEP 6: RECALL@5 vs CEILING
# ---------------------------------------------------------------------------
recalls_raw, recalls_ceiling = [], []
for i in range(n):
    order = np.argsort(-txt_sim[i])
    rel_row = np.nan_to_num(label_matrix[i][order], nan=0.0)
    total_relevant = np.nansum(label_matrix[i])
    if total_relevant > 0:
        recalls_raw.append(rel_row[:TOP_K].sum() / total_relevant)
        recalls_ceiling.append(min(TOP_K, total_relevant) / total_relevant)

print(f"\nRecall@5 (raw): {np.mean(recalls_raw):.4f}")
print(f"Recall@5 (theoretical ceiling): {np.mean(recalls_ceiling):.4f}")


# ---------------------------------------------------------------------------
# STEP 7: GRAPH BANAUNE
# ---------------------------------------------------------------------------
labels = ["Precision@5", "Hit Rate@5", "MRR", "NDCG@5"]
x = np.arange(len(labels))
width = 0.25

fig, ax = plt.subplots(figsize=(8.5, 5.5))
b1 = ax.bar(x - width, s_model, width, label="Our model", color="#9467bd")
b2 = ax.bar(x, s_catrand, width, label="Category-random baseline", color="#ff7f0e")
b3 = ax.bar(x + width, s_purerand, width, label="Pure-random baseline", color="gray")
ax.set_xticks(x); ax.set_xticklabels(labels)
ax.set_ylabel("score")
ax.set_title("Semantic Search: Model vs Category-Random vs Pure-Random")
ax.legend()
for bars in (b1, b2, b3):
    for b in bars:
        h = b.get_height()
        ax.annotate(f"{h:.3f}", (b.get_x() + b.get_width()/2, h),
                    ha="center", va="bottom", fontsize=8)
plt.tight_layout()
plt.savefig("semantic_search_vs_both_baselines.png", dpi=150)
print("\nSaved: semantic_search_vs_both_baselines.png")

fig, ax = plt.subplots(figsize=(5, 5))
vals = [np.mean(recalls_raw), np.mean(recalls_ceiling)]
bars = ax.bar(["Recall@5\n(raw)", "Max possible\nRecall@5"], vals,
               color=["#9467bd", "#2ca02c"])
ax.set_ylabel("recall")
ax.set_title("Semantic Search: Recall@5 vs Theoretical Ceiling")
for b in bars:
    h = b.get_height()
    ax.annotate(f"{h:.4f}", (b.get_x() + b.get_width()/2, h),
                ha="center", va="bottom", fontsize=9)
plt.tight_layout()
plt.savefig("semantic_search_recall_vs_ceiling.png", dpi=150)
print("Saved: semantic_search_recall_vs_ceiling.png")