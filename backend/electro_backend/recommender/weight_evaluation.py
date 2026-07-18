
import argparse
import json
import itertools
import os
import re
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler, normalize
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

RANDOM_SEED = 42

SPEC_COLS = ['price_npr', 'ram_gb', 'storage_gb', 'battery_mah',
             'display_size_inches', 'refresh_rate_hz', 'weight_grams']
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))


# --------------------------------------------------------------------------
# Train/eval split
# --------------------------------------------------------------------------
def split_dataset(df: pd.DataFrame, test_size: float = 0.2, seed: int = RANDOM_SEED):
    try:
        train_df, eval_df = train_test_split(
            df, test_size=test_size, random_state=seed, stratify=df['category'],
        )
    except ValueError:
        train_df, eval_df = train_test_split(
            df, test_size=test_size, random_state=seed, shuffle=True,
        )
    return train_df, eval_df


def make_text_series(df: pd.DataFrame) -> pd.Series:
    return df['product_name'].fillna('') + ' ' + df['description'].fillna('')


# --------------------------------------------------------------------------
# Feature pipelines (fit on train only, transform full df)
# --------------------------------------------------------------------------
def build_pipelines(train_df: pd.DataFrame, full_df: pd.DataFrame):
    tfidf = TfidfVectorizer(max_features=500, stop_words='english')
    tfidf.fit(make_text_series(train_df))
    text_vectors = tfidf.transform(make_text_series(full_df))

    train_cat_features = pd.get_dummies(train_df[['category', 'brand', 'os', 'display_type']])
    cat_features = pd.get_dummies(full_df[['category', 'brand', 'os', 'display_type']])
    cat_features = cat_features.reindex(columns=train_cat_features.columns, fill_value=0)

    scaler = MinMaxScaler()
    scaler.fit(train_df[SPEC_COLS])
    spec_vectors = scaler.transform(full_df[SPEC_COLS])

    return {
        'text': normalize(text_vectors),
        'cat': normalize(csr_matrix(cat_features.values.astype(float))),
        'spec': normalize(spec_vectors),
    }


def combine(pipelines, w_text, w_cat, w_spec):
    return hstack([
        pipelines['text'] * w_text,
        pipelines['cat'] * w_cat,
        pipelines['spec'] * w_spec,
    ]).tocsr()


# --------------------------------------------------------------------------
# Relevance rule -- tertile buckets computed per-category
# --------------------------------------------------------------------------
def _tokenize_keywords(text: str, brand_stop: set) -> set:
    words = re.findall(r"[a-zA-Z]+", str(text).lower())
    return {
        w for w in words
        if len(w) > 2 and w not in ENGLISH_STOP_WORDS and w not in brand_stop
    }


def _tertile_bucket_per_category(df: pd.DataFrame, col: str) -> pd.Series:
    def _bucket_group(s: pd.Series) -> pd.Series:
        if s.nunique(dropna=True) < 3 or len(s) < 3:
            return pd.Series(1, index=s.index)
        ranked = s.rank(method='first')
        try:
            return pd.qcut(ranked, q=3, labels=[0, 1, 2]).astype(int)
        except ValueError:
            return pd.Series(1, index=s.index)

    return df.groupby('category')[col].apply(_bucket_group).reset_index(level=0, drop=True).reindex(df.index)


def build_relevance_context(df: pd.DataFrame):
    brand_stop = {b.lower() for b in df['brand'].dropna().unique()}
    brand_stop |= {'pro', 'max', 'plus', 'ultra', 'lite', 'mini', 'series', 'gen'}
    keyword_sets = make_text_series(df).apply(lambda t: _tokenize_keywords(t, brand_stop))

    buckets = pd.DataFrame(index=df.index)
    for col in SPEC_COLS:
        buckets[col] = _tertile_bucket_per_category(df, col)

    return {
        'df': df,
        'keywords': keyword_sets,
        'buckets': buckets,
        'spec_bucket_cols': [c for c in SPEC_COLS if c != 'price_npr'],
    }


def is_relevant(context, i, j, keyword_jaccard_threshold=0.15, min_criteria=2, spec_match_ratio=0.6):
    df = context['df']
    row_i, row_j = df.iloc[i], df.iloc[j]

    if row_i['category'] != row_j['category']:
        return False

    price_match = context['buckets']['price_npr'].iloc[i] == context['buckets']['price_npr'].iloc[j]

    cols = context['spec_bucket_cols']
    spec_matches = sum(context['buckets'][c].iloc[i] == context['buckets'][c].iloc[j] for c in cols)
    spec_match = (spec_matches / len(cols)) >= spec_match_ratio

    kw_i, kw_j = context['keywords'].iloc[i], context['keywords'].iloc[j]
    union = kw_i | kw_j
    jaccard = len(kw_i & kw_j) / len(union) if union else 0.0
    text_match = jaccard >= keyword_jaccard_threshold

    criteria_met = int(price_match) + int(spec_match) + int(text_match)
    return criteria_met >= min_criteria


# --------------------------------------------------------------------------
# Stratified query sampling -- proportional across category x price tier
# --------------------------------------------------------------------------
def make_price_tier(df: pd.DataFrame) -> pd.Series:
    if df['price_npr'].nunique(dropna=True) < 3:
        return pd.Series(['mid'] * len(df), index=df.index)
    ranked_prices = df['price_npr'].rank(method='first')
    return pd.qcut(ranked_prices, q=3, labels=['budget', 'mid', 'premium'])


def proportional_stratified_counts(group_sizes: pd.Series, n_queries: int) -> pd.Series:
    expected = group_sizes / group_sizes.sum() * n_queries
    counts = np.floor(expected).astype(int).clip(lower=0)

    if n_queries >= len(counts):
        zero_groups = counts[counts == 0].index
        counts.loc[zero_groups] = 1

    remainder = int(n_queries - counts.sum())
    if remainder > 0:
        fractional = (expected - np.floor(expected)).sort_values(ascending=False)
        for group_name in fractional.index:
            if remainder <= 0:
                break
            counts.loc[group_name] += 1
            remainder -= 1
    if remainder < 0:
        fractional = (expected - np.floor(expected)).sort_values(ascending=True)
        for group_name in fractional.index:
            if remainder >= 0:
                break
            if counts.loc[group_name] > 1:
                counts.loc[group_name] -= 1
                remainder += 1

    return counts


def stratified_sample_idx(df: pd.DataFrame, eval_idx: np.ndarray, n_queries: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    eval_df = df.loc[eval_idx].copy()
    eval_df['_tier'] = make_price_tier(df).loc[eval_idx]
    eval_df['_stratum'] = eval_df['category'].astype(str) + '_' + eval_df['_tier'].astype(str)

    groups = eval_df.groupby('_stratum', sort=True)
    alloc = proportional_stratified_counts(groups.size(), n_queries)

    picked = []
    for stratum, g in groups:
        take = min(int(alloc.loc[stratum]), len(g))
        picked.extend(rng.choice(g.index.to_numpy(), size=take, replace=False).tolist())

    picked = np.array(picked)
    if len(picked) < n_queries:
        remaining = np.setdiff1d(eval_idx, picked)
        extra = rng.choice(remaining, size=min(n_queries - len(picked), len(remaining)), replace=False)
        picked = np.concatenate([picked, extra])

    return picked[:n_queries]


# --------------------------------------------------------------------------
# Precision@K AND Diversity@K
# --------------------------------------------------------------------------
def evaluate_weights(combined, df, sample_idx, relevance_context, k=5, **relevance_kwargs):
    sim_rows = cosine_similarity(combined[sample_idx], combined)
    precisions, diversities = [], []

    for row_pos, i in enumerate(sample_idx):
        sims = sim_rows[row_pos].copy()
        sims[i] = -1
        top_k = np.argsort(-sims)[:k]

        relevant = [is_relevant(relevance_context, i, j, **relevance_kwargs) for j in top_k]
        precisions.append(np.mean(relevant))

        unique_brands = df.iloc[top_k]['brand'].nunique()
        diversities.append(unique_brands / len(top_k))

    return float(np.mean(precisions)), float(np.mean(diversities))


def per_category_precision(combined, df, sample_idx, relevance_context, k=5, **relevance_kwargs):
    sim_rows = cosine_similarity(combined[sample_idx], combined)
    records = []
    for row_pos, i in enumerate(sample_idx):
        sims = sim_rows[row_pos].copy()
        sims[i] = -1
        top_k = np.argsort(-sims)[:k]
        relevant = [is_relevant(relevance_context, i, j, **relevance_kwargs) for j in top_k]
        records.append({'category': df.iloc[i]['category'], 'precision': np.mean(relevant)})
    return pd.DataFrame(records).groupby('category')['precision'].mean().reset_index()


# --------------------------------------------------------------------------
# Grid search over weights
# --------------------------------------------------------------------------
def run_grid_search(pipelines, df, sample_idx, relevance_context, k=5, step=0.05, alpha=0.7,
                     **relevance_kwargs):
    values = np.round(np.arange(0.05, 0.91, step), 2)
    results = []

    for w_text, w_cat in itertools.product(values, repeat=2):
        w_spec = round(1 - w_text - w_cat, 2)
        if w_spec < 0.05 or w_spec > 0.9:
            continue

        combined = combine(pipelines, w_text, w_cat, w_spec)
        precision, diversity = evaluate_weights(combined, df, sample_idx, relevance_context,
                                                  k=k, **relevance_kwargs)
        composite = alpha * precision + (1 - alpha) * diversity

        results.append({
            'w_text': w_text, 'w_cat': w_cat, 'w_spec': w_spec,
            f'Precision@{k}': precision, f'Diversity@{k}': diversity,
            'Composite': composite,
        })

    return pd.DataFrame(results).sort_values('Composite', ascending=False).reset_index(drop=True)


# --------------------------------------------------------------------------
# Plotting
# --------------------------------------------------------------------------
def _finish_plot(filename: str):
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, filename), dpi=180, bbox_inches='tight')
    plt.show()


def plot_metric_heatmap(results_df, metric_col, title, filename, cmap='viridis'):
    pivot = results_df.pivot(index='w_text', columns='w_cat', values=metric_col).sort_index()
    if pivot.empty:
        return
    plt.figure(figsize=(7, 5.5))
    image = plt.imshow(
        pivot.values, origin='lower', aspect='auto', cmap=cmap,
        extent=[pivot.columns.min(), pivot.columns.max(), pivot.index.min(), pivot.index.max()],
    )
    plt.colorbar(image, label=metric_col)
    plt.xlabel('w_cat')
    plt.ylabel('w_text')
    plt.title(title)
    _finish_plot(filename)


def plot_weight_sensitivity(results_df, k, chosen_row, filename):
    fields = [('w_text', 'Text weight'), ('w_cat', 'Category weight'), ('w_spec', 'Spec weight')]
    fig, axes = plt.subplots(1, 3, figsize=(16, 4.8), sharey=True)
    metric_col = f'Precision@{k}'

    for ax, (field, label) in zip(axes, fields):
        grouped = results_df.groupby(field, as_index=False)[metric_col].mean().sort_values(field)
        ax.plot(grouped[field], grouped[metric_col], marker='o', linewidth=2, color='#4C72B0')
        ax.axvline(chosen_row[field], color='#55A868', linestyle='--', linewidth=1.5, alpha=0.9,
                   label='Chosen weight' if field == 'w_text' else None)
        ax.set_xlabel(label)
        ax.grid(True, alpha=0.25)
    axes[0].legend(loc='best', fontsize=9)

    axes[0].set_ylabel(metric_col)
    fig.suptitle('Per-field precision sensitivity across the weight grid')
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, filename), dpi=180, bbox_inches='tight')
    plt.show()


def plot_precision_diversity_tradeoff(results_df, k, chosen_row, filename):
    plt.figure(figsize=(7, 6))
    plt.scatter(results_df[f'Diversity@{k}'], results_df[f'Precision@{k}'],
                c=results_df['Composite'], cmap='plasma', alpha=0.7, s=40)
    plt.colorbar(label='Composite score')
    plt.xlabel(f'Diversity@{k} (unique brands in top-{k})')
    plt.ylabel(f'Precision@{k}')
    plt.title('Precision vs Diversity trade-off across all weight combinations')
    plt.grid(True, alpha=0.3)
    _finish_plot(filename)


def plot_per_category_precision(cat_precision_df, chosen_row, k, filename):
    plt.figure(figsize=(6, 4.5))
    plt.bar(cat_precision_df['category'], cat_precision_df['precision'], color='#55A868')
    plt.ylabel(f'Precision@{k}')
    plt.title(f"Per-category precision for chosen weight\n"
              f"(text={chosen_row['w_text']}, cat={chosen_row['w_cat']}, spec={chosen_row['w_spec']})")
    plt.ylim(0, 1)
    for i, v in enumerate(cat_precision_df['precision']):
        plt.text(i, v + 0.02, f"{v:.2f}", ha='center')
    _finish_plot(filename)


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser()
    default_csv = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'electronics_dataset_with_images.csv')
    parser.add_argument("--csv", default=default_csv)
    parser.add_argument("--k", type=int, default=5)
    parser.add_argument("--n-queries", type=int, default=300)
    parser.add_argument("--step", type=float, default=0.05)
    parser.add_argument("--alpha", type=float, default=0.7,
                         help="Weight of Precision in the composite score (1-alpha goes to Diversity)")
    parser.add_argument("--spec-match-ratio", type=float, default=0.6)
    parser.add_argument("--keyword-jaccard-threshold", type=float, default=0.15)
    parser.add_argument("--min-criteria", type=int, default=2)
    args = parser.parse_args()

    relevance_kwargs = dict(
        spec_match_ratio=args.spec_match_ratio,
        keyword_jaccard_threshold=args.keyword_jaccard_threshold,
        min_criteria=args.min_criteria,
    )

    df = pd.read_csv(args.csv).reset_index(drop=True)
    print(f"Loaded {len(df)} products")

    train_df, eval_df = split_dataset(df, test_size=0.2)
    print(f"Training rows: {len(train_df)} | Evaluation rows: {len(eval_df)}")

    pipelines = build_pipelines(train_df, df)
    relevance_context = build_relevance_context(df)

    eval_idx = eval_df.index.to_numpy()
    sample_idx = stratified_sample_idx(df, eval_idx, args.n_queries, seed=RANDOM_SEED)
    print(f"\nStratified sample: {len(sample_idx)} queries across category x price-tier strata")
    print(df.loc[sample_idx].groupby(['category']).size().to_string())

    print(f"\nRunning grid search (step={args.step}, alpha={args.alpha})...")
    print(f"Relevance rule: same category AND at least {args.min_criteria}/3 of "
          f"[price tertile bucket match, >= {args.spec_match_ratio*100:.0f}% of specs sharing a "
          f"tertile bucket, description keyword Jaccard >= {args.keyword_jaccard_threshold}] "
          f"-- buckets computed per-category.")
    results_df = run_grid_search(pipelines, df, sample_idx, relevance_context, k=args.k, step=args.step,
                                  alpha=args.alpha, **relevance_kwargs)
    results_df.to_csv(os.path.join(OUTPUT_DIR, 'weight_grid_results.csv'), index=False)
    print(f"Tried {len(results_df)} weight combinations. Saved: weight_grid_results.csv")

    print(f"\nTop 10 combinations by Composite score (Precision + Diversity, alpha={args.alpha}):")
    print(results_df.head(10).to_string(index=False))

    chosen = results_df.iloc[0]
    print(f"\nFinal chosen weights: text={chosen['w_text']}, cat={chosen['w_cat']}, spec={chosen['w_spec']}")

    with open(os.path.join(OUTPUT_DIR, 'best_weights.json'), 'w') as f:
        json.dump({
            'w_text': float(chosen['w_text']), 'w_cat': float(chosen['w_cat']), 'w_spec': float(chosen['w_spec']),
            f'Precision@{args.k}': float(chosen[f'Precision@{args.k}']),
            f'Diversity@{args.k}': float(chosen[f'Diversity@{args.k}']),
            'Composite': float(chosen['Composite']),
            'alpha': float(args.alpha),
            'k': int(args.k),
            'spec_match_ratio': float(args.spec_match_ratio),
            'keyword_jaccard_threshold': float(args.keyword_jaccard_threshold),
            'min_criteria': int(args.min_criteria),
        }, f, indent=2)
    print("Saved: best_weights.json")

    chosen_combined = combine(pipelines, chosen['w_text'], chosen['w_cat'], chosen['w_spec'])
    cat_precision_df = per_category_precision(chosen_combined, df, sample_idx, relevance_context,
                                               k=args.k, **relevance_kwargs)

    print("\nGenerating and saving diagnostic plots...")
    plot_weight_sensitivity(results_df, args.k, chosen, 'weight_sensitivity.png')
    plot_metric_heatmap(results_df, f'Precision@{args.k}', f'Precision@{args.k} across weight combinations',
                         'weight_grid_precision.png')
    plot_metric_heatmap(results_df, f'Diversity@{args.k}', f'Diversity@{args.k} across weight combinations',
                         'weight_grid_diversity.png', cmap='cividis')
    plot_metric_heatmap(results_df, 'Composite', 'Composite score (Precision + Diversity) -- selection metric',
                         'weight_grid_composite.png', cmap='magma')
    plot_precision_diversity_tradeoff(results_df, args.k, chosen, 'precision_diversity_tradeoff.png')
    plot_per_category_precision(cat_precision_df, chosen, args.k, 'per_category_precision.png')

    print(f"\nAll plots saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()