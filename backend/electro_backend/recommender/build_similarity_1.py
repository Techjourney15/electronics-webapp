
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

CACHE_DIR = "similarity_cache"
MATRIX_PATH = os.path.join(CACHE_DIR, "similarity_matrix.npy")
IDS_PATH = os.path.join(CACHE_DIR, "product_ids.npy")
WEIGHTS_PATH = os.path.join(CACHE_DIR, "weights.json")


def main():
    
    df = load_product_database()
    print(f"Loaded {len(df)} products from the full catalog.\n")

    # Step 2: build the three feature blocks over the FULL catalog.
    text_vec = build_text_vector(df)
    cat_vec = build_category_vector(df)
    spec_vec = build_spec_vector(df)


    print("Running search_weights() to determine the weights to lock in...\n")
    weights, search_score = search_weights(text_vec, cat_vec, spec_vec, df)
    print(f"Weights selected: text={weights[0]}, category={weights[1]}, "
          f"spec={weights[2]}  (relevance-label correlation: {search_score:.4f})\n")

    
    final_vectors = build_final_vectors(text_vec, cat_vec, spec_vec, weights)
    sim_matrix = build_similarity_matrix(final_vectors).astype(np.float32)
    print(f"Similarity matrix computed once: shape {sim_matrix.shape}\n")

    
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




if __name__ == "__main__":
    main()