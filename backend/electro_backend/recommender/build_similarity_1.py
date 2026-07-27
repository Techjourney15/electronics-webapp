import os
import json
import numpy as np

from recommendation_pipeline import (
    load_product_database,
    build_text_vector,
    build_category_vector,
    build_spec_vector,
    build_final_vectors,
    build_similarity_matrix,
    search_weights,
    ID_COL,
)

# CONFIG

CACHE_DIR = "similarity_cache"
MATRIX_PATH = os.path.join(CACHE_DIR, "similarity_matrix.npy")
IDS_PATH = os.path.join(CACHE_DIR, "product_ids.npy")
WEIGHTS_PATH = os.path.join(CACHE_DIR, "weights.json")


def main():
    # Step 1: load the FULL catalog (all ~10,000 rows), not a sample.
    # Sampling was only ever needed for scoring candidate weights against
    # relevance labels -- once weights are chosen, every product should
    # get a real recommendation, so the full catalog is used here.
    df = load_product_database()
    print(f"Loaded {len(df)} products from the full catalog.\n")

    # Step 2: build the three feature blocks over the FULL catalog.
    text_vec = build_text_vector(df)
    cat_vec = build_category_vector(df)
    spec_vec = build_spec_vector(df)

    # Step 3: find the weights. search_weights() internally samples a
    # smaller stratified subset for the grid search itself (this is the
    # expensive, repeated O(n^2) step) -- but the WEIGHTS it returns are
    # just three numbers, cheap to reuse on the full catalog afterward.
    print("Running search_weights() to determine the weights to lock in...\n")
    weights, search_score = search_weights(text_vec, cat_vec, spec_vec, df)
    print(f"Weights selected: text={weights[0]}, category={weights[1]}, "
          f"spec={weights[2]}  (relevance-label correlation: {search_score:.4f})\n")

    # Step 4: build the final weighted vectors and the similarity matrix
    # ONCE, over the full catalog. This is the one expensive-but-single
    # matrix multiply Figure 4.2 calls "Final Product Vector (cached in
    # memory)" -- here we're additionally caching it to DISK so it
    # survives a server restart without being recomputed.
    final_vectors = build_final_vectors(text_vec, cat_vec, spec_vec, weights)
    sim_matrix = build_similarity_matrix(final_vectors).astype(np.float32)
    print(f"Similarity matrix computed once: shape {sim_matrix.shape}\n")

    # Step 5: persist to disk.
    os.makedirs(CACHE_DIR, exist_ok=True)

    np.save(MATRIX_PATH, sim_matrix)
    np.save(IDS_PATH, df[ID_COL].to_numpy())
    with open(WEIGHTS_PATH, "w") as f:
        json.dump(
            {
                "w_text": weights[0],
                "w_cat": weights[1],
                "w_spec": weights[2],
                "search_score": float(search_score),
                "n_products": int(len(df)),
            },
            f,
            indent=2,
        )

    print(f"[Saved] {MATRIX_PATH}  ({sim_matrix.nbytes / 1e6:.1f} MB)")
    print(f"[Saved] {IDS_PATH}")
    print(f"[Saved] {WEIGHTS_PATH}")
    print("\nThis directory is excluded from version control via .gitignore --")
    print("re-run this script any time the dataset or the chosen weights change.")


# ----------------------------------------------------------------------
# HOW THE LIVE BACKEND LOADS THIS (for reference -- not run by this
# script). At Django app startup, instead of calling build_similarity_
# matrix() again, the service layer just does:
#
#   sim_matrix = np.load("similarity_cache/similarity_matrix.npy")
#   product_ids = np.load("similarity_cache/product_ids.npy", allow_pickle=True)
#   id_to_row = {pid: i for i, pid in enumerate(product_ids)}
#
# recommend_top5() then looks up id_to_row[product_id] to get the row
# index, and reads sim_matrix[idx] directly -- exactly the same
# lookup-and-sort logic as before, just backed by a file load instead
# of an in-process variable that would be lost on every server restart.
# ----------------------------------------------------------------------

if __name__ == "__main__":
    main()