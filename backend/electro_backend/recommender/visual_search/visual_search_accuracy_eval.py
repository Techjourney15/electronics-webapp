"""
VISUAL SEARCH ACCURACY EVALUATION
===================================
Yo script le k garcha (overall summary):
1. Product dataset ra image feature (MobileNetV2 le nikaleko) load garcha
2. "Kun product kun product sanga relevant/similar ho" bhanne GROUND TRUTH
   table banaucha (relevance.py ko same logic use garera)
3. Image similarity (cosine similarity) anusar products lai RANK garcha
4. Rank gareko result lai ground truth sanga check garera Precision, Hit Rate,
   MRR, NDCG, Recall nikalcha
5. Yehi kaam TEEN wota tarika le garcha, compare garna:
   - Hamro MODEL (image similarity use garera)
   - CATEGORY-RANDOM baseline (same category bhitra matra random choose garne)
   - PURE-RANDOM baseline (purai random, category ko matlab nagari)

HOW TO RUN:
    Yo file lai `image_features.pkl`
    sanga same folder maa rakhera chalaunus:
        python visual_search_accuracy_eval_v2.py
"""

import pickle
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")   # graph screen maa nadekhaikan, seedhai file maa save garna
import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity

# ---------------------------------------------------------------------------
# SETTINGS — yeti chij change garna milcha
# ---------------------------------------------------------------------------
RANDOM_SEED = 42     # yo number fix gareko le, chalaune jati pani choti "random"
                     # ustai result aaucha (reproducibility ko lagi)
TOP_K = 5            # top-5 result matra herne (Precision@5, Hit Rate@5, aadi)
SAMPLE_SIZE = 400    # 10,000 product ma sabai check garda dherai time lagcha,
                     # so 400 wota matra randomly sample garera check garne

rng = np.random.default_rng(RANDOM_SEED)


# ---------------------------------------------------------------------------
# STEP 1: DATA LOAD GARNE
# ---------------------------------------------------------------------------
# Product catalog (category, price, specs, description sabai yehi CSV maa cha)
df = pd.read_csv(r"D:\Nexora\backend\electro_backend\recommender\electronics_dataset_with_images.csv")
df = df.reset_index(drop=True)

# NOTE: image_features.pkl maa product ID Django ko internal "id" (number) le
# save vayeko cha, tara CSV maa "product_id" (jasto "PHN-00001") matra cha.
# Duitai lai jodna, hami ASSUME garchau ki CSV ko row order nai Django ko id
# order sanga milcha (row 1 = id 1, row 2 = id 2, ... yesari).
df["pk"] = df.index + 1

# MobileNetV2 le nikaleko image feature vectors (1280 number ko list, har
# product ko lagi euta)
with open("image_features.pkl", "rb") as f:
    image_features = pickle.load(f)

# Feature nabhako product haru hataune (kunai image process huna sakena bhane)
df = df[df["pk"].isin(image_features.keys())]
df = df[df["pk"] <= 10000].reset_index(drop=True)  # amazon extra products hataune
print(f"Products with usable image features: {len(df)}")

# Kun column ma k data cha, tyo define garne (relevance check garna chahine)
CATEGORY_COL = "category"
PRICE_COL = "price_npr"
SPEC_COLS = ["ram_gb", "storage_gb", "display_size_inches", "battery_mah",
             "rear_camera_mp", "front_camera_mp", "weight_grams",
             "refresh_rate_hz", "fast_charging_watts"]
TEXT_COL = "description"

# 10,000 sabai check garda dherai time lagcha, so 400 wota randomly choose garne
sample_idx = rng.choice(df.index, size=SAMPLE_SIZE, replace=False)
sub = df.loc[sample_idx].reset_index(drop=True)
n = len(sub)
print(f"Evaluating on {n} sampled products...")


# ---------------------------------------------------------------------------
# STEP 2: GROUND TRUTH BANAUNE — "kun product kun sanga relevant ho"
# ---------------------------------------------------------------------------
# YO SABAI BHANDA IMPORTANT PART HO. Manche le manually 10,000 product check
# garera "yo sanga yo similar ho" bhanera label garna DHERAI TIME lagcha, so
# hamile yesलाई automatically decide garne EUTA RULE banayeko chau
# (relevance.py maa likheko rule, yaha reuse gareko):
#
#   Duita product "RELEVANT" manincha YADI:
#     1. Same category huna paryo (Smartphone-Smartphone, Laptop-Laptop) — YO
#        COMPULSORY HO, yesैले nabhaye "relevant" hudaina kunai haal ma pani
#     2. ANI, yeti 3 signal maddhe KAMSE KAM 2 WOTA match huna paryo:
#        - Price 15% bhitra close
#        - Specs (RAM, storage, aadi) 25% bhitra close
#        - Description ma kamse kam 3 wota ustai important keyword (TF-IDF)
def build_proxy_relevance(sub, category_col, spec_cols, text_col, price_col,
                           price_tol=0.15, spec_tol=0.25, keyword_min=3):
    n = len(sub)

    # --- Signal 0 (COMPULSORY): Same category cha ki chaina ---
    categories = sub[category_col].to_numpy(dtype=str)
    same_cat = categories[:, None] == categories[None, :]  # n x n table: True/False

    # --- Signal 1: Price close cha ki chaina (15% tolerance) ---
    prices = sub[price_col].to_numpy(dtype=float)
    price_close = (
        np.abs(prices[:, None] - prices[None, :]) /
        (np.maximum(prices[:, None], prices[None, :]) + 1e-9)
    ) < price_tol

    # --- Signal 2: Specs close cha ki chaina ---
    # Pahile sabai spec (RAM, storage, battery...) lai 0-1 range maa scale
    # garincha, natra battery (mAh, jasto 5000) le RAM (jasto 8) lai
    # completely dominate garcha comparison maa
    spec_scaled = MinMaxScaler().fit_transform(sub[spec_cols].to_numpy(dtype=float))
    spec_dist = np.linalg.norm(spec_scaled[:, None, :] - spec_scaled[None, :, :], axis=2)
    spec_dist_norm = spec_dist / (spec_dist.max() + 1e-9)
    spec_close = spec_dist_norm < spec_tol

    # --- Signal 3: Description ma keyword overlap cha ki chaina ---
    # TF-IDF le description ma sabai bhanda "distinctive/important" word haru
    # khojcha (common word jasto "the", "with" lai automatically ignore garcha)
    tfidf = TfidfVectorizer(stop_words="english", max_features=500)
    tfidf_matrix = tfidf.fit_transform(sub[text_col].fillna("")).toarray()
    vocab = np.array(tfidf.get_feature_names_out())
    top8_sets = []
    for row in tfidf_matrix:
        top_idx = np.argsort(row)[-8:]  # har product ko top-8 important word
        top8_sets.append(set(vocab[top_idx][row[top_idx] > 0]))
    keyword_overlap = np.zeros((n, n), dtype=int)
    for i in range(n):
        for j in range(i + 1, n):
            overlap = len(top8_sets[i] & top8_sets[j])  # kati word ustai cha
            keyword_overlap[i, j] = overlap
            keyword_overlap[j, i] = overlap
    keyword_close = keyword_overlap >= keyword_min

    # --- Sabai signal jodera final decision garne ---
    # votes = 3 maddhe kati wota signal "close" bhanyo
    votes = price_close.astype(int) + spec_close.astype(int) + keyword_close.astype(int)
    # RELEVANT huna: same category HUNAI paryo, ANI 2/3 signal match huna paryo
    label_matrix = (same_cat & (votes >= 2)).astype(float)
    np.fill_diagonal(label_matrix, np.nan)  # euta product afai sanga compare nagarne
    return label_matrix


label_matrix = build_proxy_relevance(sub, CATEGORY_COL, SPEC_COLS, TEXT_COL, PRICE_COL)
categories = sub[CATEGORY_COL].to_numpy(dtype=str)


# ---------------------------------------------------------------------------
# STEP 3: METRIC CALCULATE GARNE FUNCTIONS
# ---------------------------------------------------------------------------
# `rel` bhaneko euta list ho jasto [1, 0, 1, 0, 0] — 1 = relevant, 0 = natra
# (already similarity-rank anusar sort gareko order maa)

def precision_at_k(rel, k):
    # Top-k maddhe kati % relevant xa
    return rel[:k].sum() / k

def hit_at_k(rel, k):
    # Top-k maa kamse kam euta relevant xa ki chaina (1 ya 0)
    return 1.0 if rel[:k].sum() > 0 else 0.0

def mrr(rel):
    # Pahilo relevant result kun POSITION ma cha (position 1 = score 1.0,
    # position 2 = score 0.5, position 3 = score 0.33, ...)
    hits = np.where(rel > 0)[0]
    return 1.0 / (hits[0] + 1) if len(hits) else 0.0

def ndcg_at_k(rel, k):
    # Precision jastai, tara relevant result AGADI position ma aayo bhane
    # extra weight dincha (pachadi aayo bhane kam weight)
    r = rel[:k]
    disc = 1.0 / np.log2(np.arange(2, k + 2))  # position anusar discount factor
    dcg = (r * disc).sum()
    ideal = np.sort(rel)[::-1][:k]  # best-possible order (sabai relevant agadi)
    idcg = (ideal * disc).sum()
    return dcg / idcg if idcg > 0 else 0.0

def evaluate_ranking(sim_matrix, label_matrix, n):
    """Euta similarity matrix (jo pani method le banayeko) lai lera, sabai
    product ko lagi metric nikalne, ani average garne."""
    precisions, hits, mrrs, ndcgs = [], [], [], []
    for i in range(n):
        order = np.argsort(-sim_matrix[i])  # highest similarity dekhi sort garne
        rel_row = np.nan_to_num(label_matrix[i][order], nan=0.0)
        precisions.append(precision_at_k(rel_row, TOP_K))
        hits.append(hit_at_k(rel_row, TOP_K))
        mrrs.append(mrr(rel_row))
        ndcgs.append(ndcg_at_k(rel_row, TOP_K))
    return np.mean(precisions), np.mean(hits), np.mean(mrrs), np.mean(ndcgs)


# ---------------------------------------------------------------------------
# STEP 4: TEEN WOTA "RANKING METHOD" BANAUNE — compare garna
# ---------------------------------------------------------------------------

# --- Method A: HAMRO MODEL — image feature (MobileNetV2) cosine similarity ---
pks = sub["pk"].to_numpy()
img_matrix = np.array([image_features[pk] for pk in pks])
img_sim = cosine_similarity(img_matrix)   # n x n similarity score table
np.fill_diagonal(img_sim, -np.inf)        # afai sanga compare nagarne

# --- Method B: CATEGORY-RANDOM baseline ---
# Image content ko kunai matlab nagari, tara SAME CATEGORY bhitra matra
# random choose garne (purai andho hoina, "category ta chinchha" jasto)
def category_random_similarity(categories, n, rng):
    sim = rng.random((n, n))  # random number haru (0 dekhi 1 samma)
    same_cat = categories[:, None] == categories[None, :]
    sim[~same_cat] = -np.inf  # different category vaye kahilyai select nahos
    np.fill_diagonal(sim, -np.inf)
    return sim

cat_rand_sim = category_random_similarity(categories, n, rng)

# --- Method C: PURE-RANDOM baseline ---
# Category ko matlab nagari, purai andho random pick (yo pahile nai use
# gareko "random baseline" ho)

# ---------------------------------------------------------------------------
# STEP 5: TEENAI METHOD LAI EVALUATE GARERA COMPARE GARNE
# ---------------------------------------------------------------------------
v_model = evaluate_ranking(img_sim, label_matrix, n)
v_catrand = evaluate_ranking(cat_rand_sim, label_matrix, n)

# Pure-random chai euta separate loop cha (shuffle-based, category matlab nagari)
pure_rand_precisions, pure_rand_hits, pure_rand_mrrs, pure_rand_ndcgs = [], [], [], []
for i in range(n):
    order = rng.permutation(n)      # purai random order
    order = order[order != i]       # afai lai hataune
    rel_row = np.nan_to_num(label_matrix[i][order], nan=0.0)
    pure_rand_precisions.append(precision_at_k(rel_row, TOP_K))
    pure_rand_hits.append(hit_at_k(rel_row, TOP_K))
    pure_rand_mrrs.append(mrr(rel_row))
    pure_rand_ndcgs.append(ndcg_at_k(rel_row, TOP_K))
v_purerand = (np.mean(pure_rand_precisions), np.mean(pure_rand_hits),
              np.mean(pure_rand_mrrs), np.mean(pure_rand_ndcgs))

print("\n=== VISUAL SEARCH RESULTS ===")
print(f"{'Metric':<14}{'Model':>10}{'Cat-Random':>14}{'Pure-Random':>14}")
for name, i in zip(["Precision@5", "Hit Rate@5", "MRR", "NDCG@5"], range(4)):
    print(f"{name:<14}{v_model[i]:>10.3f}{v_catrand[i]:>14.3f}{v_purerand[i]:>14.3f}")


# ---------------------------------------------------------------------------
# STEP 6: RECALL@5 vs THEORETICAL CEILING nikalne
# ---------------------------------------------------------------------------
# "Total kati relevant product xan, tini maddhe top-5 le kati samatna sakyo"
recalls_raw, recalls_ceiling = [], []
for i in range(n):
    order = np.argsort(-img_sim[i])
    rel_row = np.nan_to_num(label_matrix[i][order], nan=0.0)
    total_relevant = np.nansum(label_matrix[i])
    if total_relevant > 0:
        recalls_raw.append(rel_row[:TOP_K].sum() / total_relevant)
        # ceiling = 5 slot bhitra maximum kati samatna sakincha (5 ya total
        # relevant, jun sano cha)
        recalls_ceiling.append(min(TOP_K, total_relevant) / total_relevant)

print(f"\nRecall@5 (raw): {np.mean(recalls_raw):.4f}")
print(f"Recall@5 (theoretical ceiling): {np.mean(recalls_ceiling):.4f}")


# ---------------------------------------------------------------------------
# STEP 7: GRAPH BANAUNE — 3 bar (model, category-random, pure-random)
# ---------------------------------------------------------------------------
labels = ["Precision@5", "Hit Rate@5", "MRR", "NDCG@5"]
x = np.arange(len(labels))
width = 0.25

fig, ax = plt.subplots(figsize=(8.5, 5.5))
b1 = ax.bar(x - width, v_model, width, label="Our model", color="#1f77b4")
b2 = ax.bar(x, v_catrand, width, label="Category-random baseline", color="#ff7f0e")
b3 = ax.bar(x + width, v_purerand, width, label="Pure-random baseline", color="gray")
ax.set_xticks(x); ax.set_xticklabels(labels)
ax.set_ylabel("score")
ax.set_title("Visual Search: Model vs Category-Random vs Pure-Random")
ax.legend()
for bars in (b1, b2, b3):
    for b in bars:
        h = b.get_height()
        ax.annotate(f"{h:.3f}", (b.get_x() + b.get_width()/2, h),
                    ha="center", va="bottom", fontsize=8)
plt.tight_layout()
plt.savefig("visual_search_vs_both_baselines.png", dpi=150)
print("\nSaved: visual_search_vs_both_baselines.png")

# Recall vs ceiling graph pani
fig, ax = plt.subplots(figsize=(5, 5))
vals = [np.mean(recalls_raw), np.mean(recalls_ceiling)]
bars = ax.bar(["Recall@5\n(raw)", "Max possible\nRecall@5"], vals,
               color=["#1f77b4", "#2ca02c"])
ax.set_ylabel("recall")
ax.set_title("Visual Search: Recall@5 vs Theoretical Ceiling")
for b in bars:
    h = b.get_height()
    ax.annotate(f"{h:.4f}", (b.get_x() + b.get_width()/2, h),
                ha="center", va="bottom", fontsize=9)
plt.tight_layout()
plt.savefig("visual_search_recall_vs_ceiling.png", dpi=150)
print("Saved: visual_search_recall_vs_ceiling.png")