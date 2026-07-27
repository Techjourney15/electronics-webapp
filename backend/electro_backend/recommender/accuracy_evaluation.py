"""
Recommender Accuracy Evaluation (Model vs Random Baseline)
=============================================================

Purpose (for defense):
-----------------------
This does NOT report raw Precision/Recall/F1@5 the way your very first
run did. That run's Recall@5 and F1 were structurally near-zero because
the relevant-item pool per query was huge (~285 items) relative to k=5
-- recall@5 is mathematically capped near 3.5% no matter how good the
model is (10/285). Reporting that number alone makes a working system
look broken.

Instead this script reports metrics that are meaningful at small k, AND
puts them next to a random-recommender baseline computed under the
EXACT SAME relevance definition -- so "our precision is 0.5x" becomes
"our precision is Nx better than picking recommendations at random,"
which is the number a defense panel can actually interpret.

Metrics reported:
------------------
- Precision@5      -- of the top-5 recommended, how many are relevant
- Hit Rate@5        -- fraction of queries with >=1 relevant item in top-5
- MRR                -- mean reciprocal rank of the FIRST relevant item
                        (found by searching the full ranking, not just
                        top-5, so it's not artificially capped by k)
- NDCG@5             -- ranking-quality metric, rewards relevant items
                        appearing EARLIER in the top-5, not just present
- Recall@5 is INTENTIONALLY reported separately with its own
  theoretical max-possible-recall reference bar, so it's clear the low
  raw number is a structural artifact of relevant-set size vs k, not a
  measure of model quality. See recommendation_pipeline discussion.

Ground truth: relevance.build_proxy_relevance() -- the SAME function
used by search_weights() and sensitivity_analysis.py, so every script
in this project is judged against one consistent definition.

Output:
-------
- plots/accuracy_vs_random.png  (grouped bar chart: Model vs Random)
- plots/recall_context.png       (Recall@5 vs its theoretical ceiling)
- Printed summary numbers
"""

import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics.pairwise import cosine_similarity

from recommendation_pipeline import (
    load_product_database,
    build_text_vector,
    build_category_vector,
    build_spec_vector,
    build_final_vectors,
    search_weights,
    CATEGORY_COL,
    SPEC_COLS,
    TEXT_COL,
    PRICE_COL,
)
from relevance import build_proxy_relevance

# CONFIG

SAMPLE_SIZE = 500     # query + candidate pool size (kept modest -- relevance
                       # labeling is O(n^2), same constraint as search_weights)
K = 5
RANDOM_STATE = 42
N_RANDOM_TRIALS = 10  # average the random baseline over several shuffles
OUT_DIR = "plots"


def stratified_sample_idx(df, sample_size, random_state):
    rng = np.random.RandomState(random_state)
    n_cats = df[CATEGORY_COL].nunique()
    idx = (
        df.groupby(CATEGORY_COL, group_keys=False)
        .apply(lambda g: g.sample(min(len(g), sample_size // n_cats), random_state=random_state),
               include_groups=False)
        .index.to_numpy()
        .copy()
    )
    rng.shuffle(idx)
    return idx



# Per-query metrics for a given similarity/ranking matrix

def evaluate_ranking(sim_matrix: np.ndarray, label_matrix: np.ndarray, k: int = K):
    n = sim_matrix.shape[0]
    precisions, hit_rates, rr, ndcgs = [], [], [], []
    recalls, max_possible_recalls = [], []

    for i in range(n):
        relevant = label_matrix[i].copy()
        relevant[i] = -1  # exclude self
        total_relevant = int((relevant == 1).sum())
        if total_relevant == 0:
            continue  # undefined precision/recall for this query, skip

        order = np.argsort(-sim_matrix[i])
        order = order[order != i]

        topk = order[:k]
        hits_topk = relevant[topk] == 1
        n_hits = int(hits_topk.sum())

        precisions.append(n_hits / k)
        hit_rates.append(1.0 if n_hits > 0 else 0.0)
        recalls.append(n_hits / total_relevant)
        max_possible_recalls.append(min(k, total_relevant) / total_relevant)

        # MRR: search the FULL ranking for first relevant item
        relevant_order = relevant[order] == 1
        first_hit = np.argmax(relevant_order) if relevant_order.any() else None
        rr.append(1.0 / (first_hit + 1) if first_hit is not None else 0.0)

        # NDCG@k
        dcg = sum(hits_topk[pos] / np.log2(pos + 2) for pos in range(len(hits_topk)))
        ideal_hits = min(k, total_relevant)
        idcg = sum(1.0 / np.log2(pos + 2) for pos in range(ideal_hits))
        ndcgs.append(dcg / idcg if idcg > 0 else 0.0)

    return {
        "precision_at_k": np.mean(precisions),
        "hit_rate_at_k": np.mean(hit_rates),
        "recall_at_k": np.mean(recalls),
        "max_possible_recall_at_k": np.mean(max_possible_recalls),
        "mrr": np.mean(rr),
        "ndcg_at_k": np.mean(ndcgs),
        "n_queries": len(precisions),
    }


def random_baseline(n_items: int, label_matrix: np.ndarray, k: int, n_trials: int, random_state: int):
    rng = np.random.RandomState(random_state)
    trial_results = []
    for t in range(n_trials):
        random_sim = rng.rand(n_items, n_items)
        np.fill_diagonal(random_sim, -np.inf)
        trial_results.append(evaluate_ranking(random_sim, label_matrix, k=k))
    keys = ["precision_at_k", "hit_rate_at_k", "recall_at_k", "max_possible_recall_at_k", "mrr", "ndcg_at_k"]
    return {key: float(np.mean([r[key] for r in trial_results])) for key in keys}


# Plots
def plot_accuracy_vs_random(model_metrics, random_metrics, out_path):
    labels = ["Precision@5", "Hit Rate@5", "MRR", "NDCG@5"]
    keys = ["precision_at_k", "hit_rate_at_k", "mrr", "ndcg_at_k"]
    model_vals = [model_metrics[k] for k in keys]
    random_vals = [random_metrics[k] for k in keys]

    x = np.arange(len(labels))
    width = 0.35

    fig, ax = plt.subplots(figsize=(9, 5.5))
    bars1 = ax.bar(x - width / 2, model_vals, width, label="Our model", color="tab:blue")
    bars2 = ax.bar(x + width / 2, random_vals, width, label="Random baseline", color="tab:gray")

    for bars in (bars1, bars2):
        for b in bars:
            h = b.get_height()
            ax.annotate(f"{h:.3f}", (b.get_x() + b.get_width() / 2, h),
                        textcoords="offset points", xytext=(0, 4),
                        ha="center", fontsize=9)

    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, max(max(model_vals), max(random_vals)) * 1.25)
    ax.set_ylabel("score")
    ax.set_title("Model vs Random Baseline")
    ax.legend()
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_recall_context(model_metrics, out_path):
    labels = ["Recall@5\n(raw)", "Max possible\nRecall@5"]
    vals = [model_metrics["recall_at_k"], model_metrics["max_possible_recall_at_k"]]

    fig, ax = plt.subplots(figsize=(6, 5))
    bars = ax.bar(labels, vals, color=["tab:blue", "tab:green"])
    for b in bars:
        h = b.get_height()
        ax.annotate(f"{h:.4f}", (b.get_x() + b.get_width() / 2, h),
                    textcoords="offset points", xytext=(0, 4), ha="center", fontsize=9)
    ax.set_ylabel("recall")
    ax.set_title("Recall@5 vs Theoretical Ceiling")
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)


# MAIN

def main():
    df = load_product_database()
    sample_idx = stratified_sample_idx(df, SAMPLE_SIZE, RANDOM_STATE)

    text_vec = build_text_vector(df)
    cat_vec = build_category_vector(df)
    spec_vec = build_spec_vector(df)
    t_s, c_s, s_s = text_vec[sample_idx], cat_vec[sample_idx], spec_vec[sample_idx]

    print("Running search_weights() to get the weights to evaluate...\n")
    weights, search_score = search_weights(text_vec, cat_vec, spec_vec, df)
    print(f"Using weights: text={weights[0]}, category={weights[1]}, spec={weights[2]}\n")

    final_vec = build_final_vectors(t_s, c_s, s_s, weights)
    sim_matrix = cosine_similarity(final_vec)

    label_matrix = build_proxy_relevance(
        df, sample_idx,
        category_col=CATEGORY_COL, spec_cols=SPEC_COLS, text_col=TEXT_COL,
        price_col=PRICE_COL,
    )

    model_metrics = evaluate_ranking(sim_matrix, label_matrix, k=K)
    print("Model metrics:")
    for k, v in model_metrics.items():
        print(f"  {k}: {v}")
    print()

    random_metrics = random_baseline(len(sample_idx), label_matrix, K, N_RANDOM_TRIALS, RANDOM_STATE)
    print("Random baseline metrics:")
    for k, v in random_metrics.items():
        print(f"  {k}: {v}")
    print()

    if random_metrics["precision_at_k"] > 0:
        lift = model_metrics["precision_at_k"] / random_metrics["precision_at_k"]
        print(f"Precision@5 is {lift:.1f}x better than random baseline.\n")

    os.makedirs(OUT_DIR, exist_ok=True)
    plot_accuracy_vs_random(model_metrics, random_metrics, os.path.join(OUT_DIR, "accuracy_vs_random.png"))
    plot_recall_context(model_metrics, os.path.join(OUT_DIR, "recall_context.png"))
    print(f"[Saved] {OUT_DIR}/accuracy_vs_random.png")
    print(f"[Saved] {OUT_DIR}/recall_context.png")


if __name__ == "__main__":
    main()