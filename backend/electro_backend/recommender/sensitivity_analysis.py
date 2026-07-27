"""
Weight Robustness / Sensitivity Analysis
==========================================

Purpose (for defense):
-----------------------
This script deliberately does NOT produce a "here is the single best
weight combination out of N trials" chart. That framing invites the
obvious panel question: "best according to what, and couldn't you have
picked the rule to get whatever answer you wanted?"

Instead, it shows how recommendation-quality agreement behaves as each
weight is varied across a realistic range, and highlights the RANGE of
weights over which quality stays high and stable -- not one single
point. The chosen weights are shown sitting inside that stable range,
which is a materially different (and harder to poke holes in) claim
than "this exact combo scored highest."

Where the baseline weights come from:
---------------------------------------
The baseline weights plotted (dashed line) are NOT hardcoded. This
script calls recommendation_pipeline.search_weights() first, and uses
its data-driven output as the sweep's starting point. That keeps this
script and the weight search connected -- the sweep is checking the
robustness of the actual result of the search, not an arbitrary guess.

Ground truth used for scoring:
-------------------------------
Uses the SAME relevance.build_proxy_relevance() function that
recommendation_pipeline.py's search_weights() uses. This is important:
the weight search and this robustness check are evaluated against one
consistent, explainable business-rule definition of relevance (same
category AND >=2 of price/spec/keyword closeness) throughout the whole
project -- not two different, possibly-disagreeing definitions.

This is a domain-rule proxy, not verified ground truth from real user
behavior. State that plainly in defense: "in the absence of production
click/purchase data, we define relevance using business rules
consistent with real e-commerce substitutability criteria, and show our
chosen weights are robust across a broad range under that definition" --
that is a normal, well-documented, defensible offline-evaluation
approach for a project at this stage.

Output:
-------
- plots/sensitivity_analysis.png (3-panel chart, one per weight, each
  showing the full sweep curve with the stable region shaded and the
  chosen baseline weight marked -- no "winner" callout)
- Printed sweep values for your own record-keeping
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
    search_weights,
    CATEGORY_COL,
    SPEC_COLS,
    TEXT_COL,
    PRICE_COL,
)
from relevance import build_proxy_relevance

# CONFIG

SAMPLE_SIZE = 300
SWEEP_VALUES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
STABILITY_TOLERANCE = 0.10                   # "stable" = within 10% of this sweep's peak score
RANDOM_STATE = 42
OUT_DIR = "plots"
# NOTE: baseline weights are no longer hardcoded here -- they come from
# recommendation_pipeline.search_weights(), computed fresh in main().


# Sample selection (stratified by category, same idea as search_weights)

def stratified_sample_idx(df: pd.DataFrame, sample_size: int, random_state: int):
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



# Score one weight combo against the relevance labels

def score_weights(t_s, c_s, s_s, weights, label_matrix):
    wt, wc, ws = weights
    final_vec = np.hstack([t_s * wt, c_s * wc, s_s * ws])
    sim = cosine_similarity(final_vec)
    mask = ~np.isnan(label_matrix)
    if mask.sum() < 2:
        return np.nan
    return np.corrcoef(sim[mask], label_matrix[mask])[0, 1]



# Sweep one weight, holding the ratio of the other two fixed at baseline

def sweep_weight(which: str, t_s, c_s, s_s, label_matrix, baseline,
                  sweep_values=SWEEP_VALUES):
    bt, bc, bs = baseline
    results = []
    for v in sweep_values:
        remaining = 1 - v
        if which == "text":
            cat_ratio = bc / (bc + bs) if (bc + bs) > 0 else 0.5
            weights = (v, remaining * cat_ratio, remaining * (1 - cat_ratio))
        elif which == "category":
            text_ratio = bt / (bt + bs) if (bt + bs) > 0 else 0.5
            weights = (remaining * text_ratio, v, remaining * (1 - text_ratio))
        elif which == "spec":
            text_ratio = bt / (bt + bc) if (bt + bc) > 0 else 0.5
            weights = (remaining * text_ratio, remaining * (1 - text_ratio), v)
        else:
            raise ValueError(which)

        score = score_weights(t_s, c_s, s_s, weights, label_matrix)
        results.append((v, weights, score))
    return results

# Plot: stability band, not "best point" 

def plot_sensitivity(results_by_weight: dict, out_path: str, baseline_weights):
    titles = {"text": "Text weight (w_text)",
              "category": "Category weight (w_cat)",
              "spec": "Spec weight (w_spec)"}
    baseline_idx = {"text": 0, "category": 1, "spec": 2}

    base, ext = os.path.splitext(out_path)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)

    for key in ["text", "category", "spec"]:
        fig, ax = plt.subplots(figsize=(6, 5))

        vals = np.array([r[0] for r in results_by_weight[key]])
        scores = np.array([r[2] for r in results_by_weight[key]])

        peak = np.nanmax(scores)
        stable_mask = scores >= peak * (1 - STABILITY_TOLERANCE)

        if stable_mask.any():
            stable_vals = vals[stable_mask]
            ax.axvspan(stable_vals.min(), stable_vals.max(),
                       color="tab:green", alpha=0.12, label="stable region")

        ax.plot(vals, scores, marker="o", linewidth=2, color="tab:blue")

        search_value = round(baseline_weights[baseline_idx[key]], 3)
        ax.axvline(search_value, color="gray", linestyle="--", linewidth=1.3,
                   label=f"search-selected weight ({search_value})")

        ax.set_title(f"Sensitivity: {titles[key]}")
        ax.set_xlabel("weight value")
        ax.set_ylabel("agreement with relevance labels")
        ax.set_ylim(-0.05, 1.05)
        ax.grid(alpha=0.3)
        ax.legend(fontsize=8, loc="lower center")

        fig.tight_layout()
        fig.savefig(f"{base}_{key}{ext}", dpi=150)
        plt.close(fig)



# MAIN
def main():
    df = load_product_database()
    sample_idx = stratified_sample_idx(df, SAMPLE_SIZE, RANDOM_STATE)

    text_vec = build_text_vector(df)
    cat_vec = build_category_vector(df)
    spec_vec = build_spec_vector(df)
    t_s, c_s, s_s = text_vec[sample_idx], cat_vec[sample_idx], spec_vec[sample_idx]

    label_matrix = build_proxy_relevance(
        df, sample_idx,
        category_col=CATEGORY_COL, spec_cols=SPEC_COLS, text_col=TEXT_COL,
        price_col=PRICE_COL,
    )

    # --- Get the data-driven baseline from the actual weight search,
    # rather than hardcoding a guess. This is the fix from before: the
    # sweep below is now checking robustness of what search_weights()
    # actually found, on the same relevance definition.
    print("Running search_weights() to get the baseline...\n")
    baseline_weights, search_score = search_weights(text_vec, cat_vec, spec_vec, df)
    print(f"search_weights() found: text={baseline_weights[0]}, "
          f"category={baseline_weights[1]}, spec={baseline_weights[2]} "
          f"(relevance-label correlation: {search_score:.4f})\n")

    results_by_weight = {}
    for key in ["text", "category", "spec"]:
        results = sweep_weight(key, t_s, c_s, s_s, label_matrix, baseline=baseline_weights)
        results_by_weight[key] = results
        print(f"-- {key} sweep --")
        for v, weights, score in results:
            score_str = f"{score:.4f}" if not np.isnan(score) else "nan"
            print(f"  {key}={v:.1f}  weights={tuple(round(w, 3) for w in weights)}  score={score_str}")
        print()

    out_path = os.path.join(OUT_DIR, "sensitivity_analysis.png")
    plot_sensitivity(results_by_weight, out_path, baseline_weights)
    print(f"[Saved] {out_path}")


if __name__ == "__main__":
    main()