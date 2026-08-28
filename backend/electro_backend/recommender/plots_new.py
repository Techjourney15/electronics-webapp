import os
import json
import random

import numpy as np
import pandas as pd

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt

from scipy import stats

from sklearn.decomposition import PCA
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split

from recommendation_pipeline import (
    load_product_database,
    build_text_vector,
    build_category_vector,
    build_spec_vector,
    search_weights,
    build_final_vectors,
    build_similarity_matrix,
    NAME_COL,
    CATEGORY_COL,
    TEXT_COL,
)

OUT_DIR = "plots"
os.makedirs(OUT_DIR, exist_ok=True)

RANDOM_SEED = 7
N_TRIALS = 500
TOP_K = 10
HEATMAP_SAMPLE = 40

plt.rcParams.update({
    "figure.facecolor": "white",
    "axes.facecolor": "white",
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.labelsize": 11,
})



def save_plot(fig, filename):
    """
    Save plot to disk with publication quality.
    """
    path = os.path.join(OUT_DIR, filename)
    fig.tight_layout()
    fig.savefig(path, dpi=300, bbox_inches="tight")
    plt.close(fig)

    print(f"[Saved] {path}")


def build_keyword_sets(df):
    """
    Extract top TF-IDF keywords for each product.
    Used only for evaluation.
    """
    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=500
    )

    X = vectorizer.fit_transform(df[TEXT_COL])

    feature_names = np.array(vectorizer.get_feature_names_out())

    keyword_sets = []

    for row in X.toarray():
        top = np.argsort(row)[-8:]
        keywords = set(feature_names[top])
        keyword_sets.append(keywords)

    return keyword_sets




def evaluate_recommendations(
        df,
        sim_matrix,
        keyword_sets,
        test_indices,
        k=5,
        seed=RANDOM_SEED
):
    """
    Computes

    Precision@5
    Recall@5
    HitRate@5
    MRR
    NDCG

    using keyword overlap as relevance.
    """

    rng = random.Random(seed)

    precisions = []
    recalls = []
    hits = []
    mrrs = []
    ndcgs = []

    for idx in test_indices:

        scores = sim_matrix[idx].copy()
        scores[idx] = -np.inf

        topk = np.argpartition(-scores, k)[:k]
        topk = topk[np.argsort(-scores[topk])]

        viewed = keyword_sets[idx]

        relevant = []

        for j in range(len(df)):

            if j == idx:
                continue

            overlap = len(viewed & keyword_sets[j])

            if overlap >= 3:
                relevant.append(j)

        relevant = set(relevant)

        if len(relevant) == 0:
            continue

        hits_binary = []

        for item in topk:
            hits_binary.append(int(item in relevant))

        precision = np.mean(hits_binary)

        recall = sum(hits_binary) / len(relevant)

        hitrate = int(sum(hits_binary) > 0)

        precisions.append(precision)
        recalls.append(recall)
        hits.append(hitrate)

        # ---------------- MRR ----------------

        rr = 0

        for rank, item in enumerate(topk, start=1):

            if item in relevant:
                rr = 1 / rank
                break

        mrrs.append(rr)

        # ---------------- NDCG ----------------

        dcg = 0

        for rank, rel in enumerate(hits_binary, start=1):
            dcg += rel / np.log2(rank + 1)

        ideal = sorted(hits_binary, reverse=True)

        idcg = 0

        for rank, rel in enumerate(ideal, start=1):
            idcg += rel / np.log2(rank + 1)

        ndcg = dcg / idcg if idcg > 0 else 0

        ndcgs.append(ndcg)

    metrics = {
        "precision": np.mean(precisions),
        "recall": np.mean(recalls),
        "hitrate": np.mean(hits),
        "mrr": np.mean(mrrs),
        "ndcg": np.mean(ndcgs),
    }

    return metrics


def build_small_confusion_matrix(
        df,
        sim_matrix,
        keyword_sets,
        test_indices,
        sample_size=100,
        k=5,
        seed=RANDOM_SEED
):
    """
    Small illustrative confusion matrix.

    Evaluates only:
        sample_size viewed products × Top-k recommendations
    so the counts remain readable.
    """

    rng = random.Random(seed)

    chosen = rng.sample(
        test_indices,
        min(sample_size, len(test_indices))
    )

    TP = FP = FN = TN = 0

    for idx in chosen:

        scores = sim_matrix[idx].copy()
        scores[idx] = -np.inf

        topk = np.argpartition(-scores, k)[:k]

        viewed = keyword_sets[idx]

        relevant = set()

        for j in range(len(df)):
            if j == idx:
                continue

            overlap = len(viewed & keyword_sets[j])

            if overlap >= 3:
                relevant.add(j)

        recommended = set(topk)

        # Per-query counts
        tp = len(recommended & relevant)
        fp = len(recommended - relevant)
        fn = len(relevant - recommended)

        universe = len(df) - 1
        tn = universe - tp - fp - fn

        # Accumulate totals
        TP += tp
        FP += fp
        FN += fn
        TN += tn

    return {
        "TP": TP,
        "FP": FP,
        "FN": FN,
        "TN": TN
    }  


def plot_category_match_accuracy(match_rates):

    fig, ax = plt.subplots(figsize=(8,5))

    ax.hist(
        match_rates,
        bins=np.arange(-0.05,1.1,0.1),
        color="#4C72B0",
        edgecolor="white"
    )

    mean = match_rates.mean()*100

    ax.axvline(
        match_rates.mean(),
        color="red",
        linestyle="--",
        linewidth=2,
        label=f"Mean = {mean:.1f}%"
    )

    ax.set_xlabel("Fraction of Top-5 recommendations in same category")
    ax.set_ylabel("Number of viewed products")
    ax.set_title("Category Match Accuracy")
    ax.legend()

    save_plot(fig, "category_match_accuracy.png")

    return mean




def plot_similarity_vs_random(rec_sims, random_sims):

    fig, ax = plt.subplots(figsize=(7,5))

    bp = ax.boxplot(
        [random_sims, rec_sims],
        tick_labels=[
            "Random Products",
            "Top-5 Recommendations"
        ],
        patch_artist=True,
        showmeans=True
    )

    colors = ["#D0D0D0","#4C72B0"]

    for patch,color in zip(bp["boxes"],colors):
        patch.set_facecolor(color)

    t,p = stats.ttest_ind(
        rec_sims,
        random_sims,
        equal_var=False
    )

    ax.set_ylabel("Cosine Similarity")
    ax.set_title("Similarity Comparison")

    ax.text(
        0.5,
        0.02,
        f"Welch t-test: p={p:.2e}",
        transform=ax.transAxes,
        ha="center"
    )

    save_plot(fig,"similarity_vs_random.png")

    return t,p




def plot_pca(final_vectors,df):

    sample=min(3000,len(df))

    rng=np.random.RandomState(RANDOM_SEED)

    idx=rng.choice(len(df),sample,replace=False)

    pca=PCA(n_components=2)

    coords=pca.fit_transform(final_vectors[idx])

    fig,ax=plt.subplots(figsize=(7,6))

    cats=df.iloc[idx][CATEGORY_COL].values

    unique=np.unique(cats)

    colors=[
        "#4C72B0",
        "#DD8452",
        "#55A868",
        "#C44E52",
        "#8172B2",
        "#937860"
    ]

    for i,c in enumerate(unique):

        mask=cats==c

        ax.scatter(
            coords[mask,0],
            coords[mask,1],
            s=10,
            alpha=0.6,
            color=colors[i%len(colors)],
            label=c
        )

    ax.set_xlabel("Principal Component 1")
    ax.set_ylabel("Principal Component 2")
    ax.set_title("PCA Projection of Product Embeddings")

    ax.legend(fontsize=8)

    save_plot(fig,"pca_clusters.png")




def plot_similarity_heatmap(sim_matrix):

    rng=np.random.RandomState(RANDOM_SEED)

    idx=rng.choice(
        len(sim_matrix),
        HEATMAP_SAMPLE,
        replace=False
    )

    sample=sim_matrix[np.ix_(idx,idx)]

    fig,ax=plt.subplots(figsize=(7,6))

    im=ax.imshow(
        sample,
        cmap="viridis",
        vmin=0,
        vmax=1
    )

    fig.colorbar(
        im,
        ax=ax,
        label="Cosine Similarity"
    )

    ax.set_title("Similarity Heatmap")

    ax.set_xticks([])
    ax.set_yticks([])

    save_plot(fig,"similarity_heatmap.png")


def plot_recommender_metrics(metrics):

    names = [
        "Precision@5",
        "Recall@5",
        "Hit Rate@5",
        "MRR",
        "NDCG@5"
    ]

    values = [
        metrics["precision"],
        metrics["recall"],
        metrics["hitrate"],
        metrics["mrr"],
        metrics["ndcg"]
    ]

    fig, ax = plt.subplots(figsize=(8,5))

    colors = [
        "#4C72B0",
        "#55A868",
        "#C44E52",
        "#8172B2",
        "#DD8452"
    ]

    bars = ax.bar(names, values, color=colors)

    ax.set_ylim(0,1.05)

    ax.set_ylabel("Score")

    ax.set_title("Recommendation System Evaluation Metrics")

    for bar,val in zip(bars,values):

        ax.text(
            bar.get_x()+bar.get_width()/2,
            val+0.02,
            f"{val:.3f}",
            ha="center",
            fontsize=10
        )

    save_plot(fig,"recommender_metrics.png")


def plot_confusion_matrix(cm):

    matrix = np.array([
        [cm["TP"], cm["FP"]],
        [cm["FN"], cm["TN"]]
    ])

    precision = cm["TP"] / (cm["TP"] + cm["FP"] + 1e-9)
    recall = cm["TP"] / (cm["TP"] + cm["FN"] + 1e-9)
    accuracy = (
        (cm["TP"] + cm["TN"])
        / matrix.sum()
    )

    f1 = (
        2 * precision * recall
        / (precision + recall + 1e-9)
    )

    fig, ax = plt.subplots(figsize=(6,6))

    im = ax.imshow(
        matrix,
        cmap="Blues"
    )

    labels = [
        ["TP","FP"],
        ["FN","TN"]
    ]

    for i in range(2):
        for j in range(2):

            ax.text(
                j,
                i,
                f"{labels[i][j]}\n{matrix[i,j]}",
                ha="center",
                va="center",
                fontsize=12,
                color="black"
            )

    ax.set_xticks([0,1])
    ax.set_xticklabels([
        "Relevant",
        "Not Relevant"
    ])

    ax.set_yticks([0,1])
    ax.set_yticklabels([
        "Recommended",
        "Not Recommended"
    ])

    ax.set_title(
        "Illustrative Confusion Matrix\n"
        f"Precision={precision:.3f}   "
        f"Recall={recall:.3f}   "
        f"F1={f1:.3f}"
    )

    fig.colorbar(im)

    save_plot(fig,"confusion_matrix.png")

    return {
        "precision": precision,
        "recall": recall,
        "accuracy": accuracy,
        "f1": f1
    }


def main():

    print("=" * 60)
    print("Loading product database...")
    print("=" * 60)

    df = load_product_database()

    print(f"Total products : {len(df)}")

    

    train_df, test_df = train_test_split(
        df,
        test_size=0.20,
        random_state=RANDOM_SEED,
        stratify=df[CATEGORY_COL]
    )

    test_indices = list(test_df.index)

    print(f"Training products : {len(train_df)}")
    print(f"Testing products  : {len(test_df)}")

   

    print("\nBuilding text vectors...")
    text_vectors = build_text_vector(df)

    print("Building category vectors...")
    category_vectors = build_category_vector(df)

    print("Building specification vectors...")
    spec_vectors = build_spec_vector(df)

    print("Searching best weights...")

    weights, score = search_weights(
        text_vectors,
        category_vectors,
        spec_vectors,
        df
    )

    print("\nBest Weights")

    print(f"Text      : {weights[0]:.3f}")
    print(f"Category  : {weights[1]:.3f}")
    print(f"Specs     : {weights[2]:.3f}")

    

    final_vectors = build_final_vectors(
        text_vectors,
        category_vectors,
        spec_vectors,
        weights
    )

    print("\nBuilding similarity matrix...")

    sim_matrix = build_similarity_matrix(
        final_vectors
    )

    

    keyword_sets = build_keyword_sets(df)

    

    print("\nEvaluating category match...")

    match_rates = []

    rng = random.Random(RANDOM_SEED)

    for idx in test_indices:

        scores = sim_matrix[idx].copy()
        scores[idx] = -np.inf

        topk = np.argpartition(
            -scores,
            TOP_K
        )[:TOP_K]

        topk = topk[np.argsort(-scores[topk])]

        viewed_category = df.loc[idx, CATEGORY_COL]

        matches = (
            df.loc[topk, CATEGORY_COL].values
            == viewed_category
        )

        match_rates.append(matches.mean())

    match_rates = np.array(match_rates)

    

    print("Evaluating cosine similarity...")

    rec_sims = []
    random_sims = []

    for idx in test_indices:

        scores = sim_matrix[idx].copy()
        scores[idx] = -np.inf

        topk = np.argpartition(
            -scores,
            TOP_K
        )[:TOP_K]

        rec_sims.append(scores[topk].mean())

        others = list(range(len(df)))
        others.remove(idx)

        rand = rng.sample(others, TOP_K)

        random_sims.append(
            sim_matrix[idx, rand].mean()
        )

    rec_sims = np.array(rec_sims)
    random_sims = np.array(random_sims)

    

    print("Computing recommender metrics...")

    metrics = evaluate_recommendations(
        df,
        sim_matrix,
        keyword_sets,
        test_indices,
        k=TOP_K
    )

   

    print("Building illustrative confusion matrix...")

    cm = build_small_confusion_matrix(
        df,
        sim_matrix,
        keyword_sets,
        test_indices,
        sample_size=100,
        k=TOP_K
    )

    cm_metrics = plot_confusion_matrix(cm)

   

    print("\nGenerating plots...")

    category_accuracy = plot_category_match_accuracy(
        match_rates
    )

    t_stat, p_value = plot_similarity_vs_random(
        rec_sims,
        random_sims
    )

    plot_pca(
        final_vectors,
        df
    )

    plot_similarity_heatmap(
        sim_matrix
    )

    plot_recommender_metrics(
        metrics
    )

    

    summary = {

        "number_of_products": len(df),

        "training_products": len(train_df),

        "testing_products": len(test_df),

        "weights": {

            "text": float(weights[0]),

            "category": float(weights[1]),

            "specification": float(weights[2])

        },

        "category_match_accuracy": float(category_accuracy),

        "mean_recommended_similarity": float(rec_sims.mean()),

        "mean_random_similarity": float(random_sims.mean()),

        "welch_t_statistic": float(t_stat),

        "p_value": float(p_value),

        "precision_at_5": float(metrics["precision"]),

        "recall_at_5": float(metrics["recall"]),

        "hit_rate_at_5": float(metrics["hitrate"]),

        "mrr": float(metrics["mrr"]),

        "ndcg_at_5": float(metrics["ndcg"]),

        "confusion_matrix": cm,

        "confusion_metrics": cm_metrics

    }

    summary_path = os.path.join(
        OUT_DIR,
        "metrics_summary.json"
    )

    with open(summary_path, "w") as f:

        json.dump(
            summary,
            f,
            indent=4
        )

    print("\n" + "=" * 60)

    print("Evaluation Complete")

    print("=" * 60)

    print(json.dumps(summary, indent=4))

    print("\nPlots saved to")

    print(OUT_DIR)

    print("=" * 60)




if __name__ == "__main__":

    main()