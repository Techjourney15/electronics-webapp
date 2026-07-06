"""
=============================================================================
NEXORA - Product Image Downloader (v2 - fixed)
=============================================================================
Downloads one product image per unique model from the internet and updates
the CSV dataset with local image file paths.

FIXES IN THIS VERSION:
    1. Uses `ddgs` (duckduckgo_search is deprecated/renamed).
    2. Handles 403 RateLimit errors with exponential backoff + jitter,
       instead of failing straight to a placeholder.
    3. Uses a JSON manifest (download_manifest.json) to track which models
       got a REAL image vs a PLACEHOLDER. Re-running the script now only
       retries the placeholders - it will not skip them just because a
       .jpg file already exists.
    4. Writes the CSV to a temp file then renames it into place, so a
       locked/open CSV fails with a clear message instead of corrupting
       the file, and you get one clean error instead of a crash mid-write.
    5. Drops any `image_url` column (external links) from the final CSV.
       Django should only ever see local paths under product_images/.

SETUP (run these in your terminal first):
    pip install ddgs requests pandas Pillow

USAGE:
    python download_product_images.py

    Re-run as many times as you want. Each run only retries models that
    are still marked "placeholder" in download_manifest.json. Delete that
    file if you ever want to force a full re-download.
=============================================================================
"""

import os
import time
import random
import json
import requests
import pandas as pd
from pathlib import Path
from io import BytesIO

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("ERROR: Pillow not installed. Run: pip install Pillow")
    exit(1)

try:
    from ddgs import DDGS
    from ddgs.exceptions import RatelimitException, DDGSException
except ImportError:
    print("ERROR: ddgs not installed. Run: pip install ddgs")
    print("(duckduckgo_search is deprecated - this script now uses its replacement, ddgs)")
    exit(1)


# =============================================================================
# CONFIGURATION - Modify these if needed
# =============================================================================

CSV_INPUT = "Dataset_Final.csv"                             # Input CSV path
CSV_OUTPUT = "nexora_electronics_dataset_with_images.csv"    # Output CSV path
IMAGE_DIR = "product_images"                                 # Folder to save images
MANIFEST_PATH = "download_manifest.json"                     # Tracks real vs placeholder
IMAGE_SIZE = (500, 500)                                       # Consistent image dimensions
DELAY_SECONDS = 5.0                                           # Base delay between requests
MAX_RETRIES = 3                                               # Retries per failed download
REQUEST_TIMEOUT = 15                                          # HTTP timeout in seconds


# =============================================================================
# MANIFEST HELPERS (fixes Problem 3: re-run skipping placeholders)
# =============================================================================

def load_manifest():
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_manifest(manifest):
    # Write to temp then replace, same safety trick as the CSV save
    tmp_path = MANIFEST_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    os.replace(tmp_path, MANIFEST_PATH)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def sanitize_filename(name):
    """Convert model name to a safe filename slug."""
    slug = name.lower().strip()
    replacements = {
        " ": "-", "/": "-", "+": "-plus", "(": "", ")": "",
        "'": "", '"': "", "&": "and", ",": "", ".": "-"
    }
    for old, new in replacements.items():
        slug = slug.replace(old, new)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def build_search_query(brand, model, category):
    """Build an effective image search query for a product."""
    model_clean = model if model.lower().startswith(brand.lower()) else f"{brand} {model}"
    noun = "smartphone" if category == "Smartphone" else "laptop"
    return f"{model_clean} {noun} official product image"


def search_image_url(query, max_retries=MAX_RETRIES):
    """
    Search DuckDuckGo (via ddgs) for a product image, with exponential
    backoff + jitter on rate limits (fixes Problem 2).
    """
    preferred_domains = [
        "amazon", "flipkart", "samsung", "apple", "xiaomi",
        "oneplus", "oppo", "vivo", "realme", "google", "motorola",
        "nokia", "dell", "hp", "lenovo", "asus", "acer", "msi",
        "gsmarena", "gadgets360", "notebookcheck"
    ]

    # Domains that have returned dead links (404), Forbidden (403), or
    # non-product images (e.g. wikipedia logo SVGs). Skip these outright
    # instead of repeatedly trying and failing on re-runs.
    blocked_domains = [
        "whatmobile.com.pk",
        "wikipedia.org", "wikimedia.org",  # tends to surface logo/icon SVGs
        "mobilebuzzbd.com",
    ]

    for attempt in range(max_retries):
        try:
            with DDGS() as ddgs:
                results = list(ddgs.images(
                    query=query,
                    region="wt-wt",
                    safesearch="moderate",
                    size="Medium",
                    type_image="photo",
                    max_results=5,
                ))

            if not results:
                return None

            results = [
                r for r in results
                if not any(bad in r.get("image", "").lower() for bad in blocked_domains)
            ]
            if not results:
                return None

            for result in results:
                url = result.get("image", "")
                if any(domain in url.lower() for domain in preferred_domains):
                    return url
            return results[0].get("image", None)

        except RatelimitException:
            # Exponential backoff with jitter: 8s, 16s, 32s ...
            wait = (2 ** (attempt + 3)) + random.uniform(0, 3)
            print(f"    rate-limited, backing off {wait:.0f}s...", end=" ")
            time.sleep(wait)
        except DDGSException as e:
            print(f"    search error: {e}", end=" ")
            return None

    return None  # exhausted retries


def download_and_resize_image(url, save_path):
    """Download an image from URL, resize it, and save to disk."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }
    response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT, stream=True)
    response.raise_for_status()

    content_type = response.headers.get("Content-Type", "")
    if "image" not in content_type and not url.lower().endswith((".jpg", ".png", ".webp", ".jpeg")):
        raise ValueError(f"Not an image: {content_type}")

    img = Image.open(BytesIO(response.content))
    img = img.convert("RGB")
    img = img.resize(IMAGE_SIZE, Image.LANCZOS)
    img.save(save_path, "JPEG", quality=90)
    return True


# A small fixed palette so placeholders look designed, not random
PLACEHOLDER_PALETTE = [
    (231, 76, 60), (52, 152, 219), (46, 204, 113), (155, 89, 182),
    (241, 196, 15), (26, 188, 156), (230, 126, 34), (52, 73, 94),
]


def create_placeholder_image(save_path, brand, model, category):
    """
    Create a clean, branded placeholder card instead of an
    'Image Not Found' graphic (fixes the ugly-placeholder part of Problem 2).
    Deterministic color per brand so the same brand always looks the same.
    """
    color = PLACEHOLDER_PALETTE[hash(brand) % len(PLACEHOLDER_PALETTE)]
    img = Image.new("RGB", IMAGE_SIZE, color=color)
    draw = ImageDraw.Draw(img)

    try:
        font_large = ImageFont.load_default(size=28)
        font_small = ImageFont.load_default(size=18)
    except TypeError:
        # Older Pillow without size= support
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    w, h = IMAGE_SIZE

    def centered_text(text, y, font):
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        draw.text(((w - tw) / 2, y), text, fill=(255, 255, 255), font=font)

    centered_text(brand.upper(), h * 0.38, font_large)
    centered_text(model, h * 0.50, font_small)
    centered_text(category, h * 0.58, font_small)

    # thin border so it reads as a placeholder "card"
    draw.rectangle([4, 4, w - 5, h - 5], outline=(255, 255, 255), width=2)

    img.save(save_path, "JPEG", quality=85)


# =============================================================================
# MAIN SCRIPT
# =============================================================================

def main():
    print("=" * 60)
    print("NEXORA - Product Image Downloader (v2)")
    print("=" * 60)

    if not os.path.exists(CSV_INPUT):
        print(f"\nERROR: Cannot find '{CSV_INPUT}'")
        print(f"Current directory: {os.getcwd()}")
        return

    df = pd.read_csv(CSV_INPUT)
    print(f"\nLoaded {len(df)} products from {CSV_INPUT}")

    os.makedirs(IMAGE_DIR, exist_ok=True)
    print(f"Images will be saved to: ./{IMAGE_DIR}/")

    manifest = load_manifest()
    print(f"Loaded manifest with {len(manifest)} prior entries")

    unique_models = df.drop_duplicates(subset=["brand", "model", "category"])[
        ["brand", "model", "category"]
    ].reset_index(drop=True)
    print(f"Found {len(unique_models)} unique models\n")

    model_to_filename = {}
    success_count = 0
    skip_count = 0
    fail_count = 0

    for idx, row in unique_models.iterrows():
        brand, model, category = row["brand"], row["model"], row["category"]
        filename = sanitize_filename(f"{brand}-{model}") + ".jpg"
        save_path = os.path.join(IMAGE_DIR, filename)
        model_key = f"{brand}||{model}||{category}"

        prior = manifest.get(model_key)

        # Only skip if a REAL image was previously confirmed downloaded
        # AND the file still exists. Placeholders are always retried.
        if prior and prior.get("status") == "downloaded" and os.path.exists(save_path):
            model_to_filename[model_key] = filename
            skip_count += 1
            print(f"[{idx+1}/{len(unique_models)}] SKIP (already downloaded): {brand} {model}")
            continue

        query = build_search_query(brand, model, category)
        print(f"[{idx+1}/{len(unique_models)}] Searching: {brand} {model}...", end=" ")

        downloaded = False
        try:
            url = search_image_url(query)
            if url:
                download_and_resize_image(url, save_path)
                downloaded = True
                print("OK")
            else:
                print("no results")
        except Exception as e:
            print(f"download failed ({e})")

        if downloaded:
            model_to_filename[model_key] = filename
            manifest[model_key] = {"status": "downloaded", "filename": filename}
            success_count += 1
        else:
            create_placeholder_image(save_path, brand, model, category)
            model_to_filename[model_key] = filename
            manifest[model_key] = {"status": "placeholder", "filename": filename}
            fail_count += 1
            print("    -> placeholder created")

        # Save manifest after every item so an interrupted run keeps progress
        save_manifest(manifest)

        # Rate limiting with jitter so requests aren't perfectly periodic
        time.sleep(DELAY_SECONDS + random.uniform(0, 1.5))

    # Map filenames back to full dataset
    print(f"\nMapping images to all {len(df)} products...")

    def get_image_filename(row):
        key = f"{row['brand']}||{row['model']}||{row['category']}"
        return model_to_filename.get(key, "placeholder.jpg")

    df["image_filename"] = df.apply(get_image_filename, axis=1)
    df["image_path"] = df["image_filename"].apply(lambda x: f"product_images/{x}")

    # Fix Problem 5: never carry external image_url links into the final CSV
    if "image_url" in df.columns:
        df = df.drop(columns=["image_url"])

    # Fix Problem 4: write to temp file, then atomically replace.
    # If the CSV is open in Excel, this fails with ONE clear message
    # instead of a mid-write crash.
    tmp_csv = CSV_OUTPUT + ".tmp"
    try:
        df.to_csv(tmp_csv, index=False, encoding="utf-8-sig")
        os.replace(tmp_csv, CSV_OUTPUT)
    except PermissionError:
        print(f"\nERROR: '{CSV_OUTPUT}' is open in another program (e.g. Excel).")
        print("Close it and re-run the script.")
        return

    print("\n" + "=" * 60)
    print("DOWNLOAD COMPLETE")
    print("=" * 60)
    print(f"  Total unique models:       {len(unique_models)}")
    print(f"  Successfully downloaded:   {success_count}")
    print(f"  Already downloaded before: {skip_count}")
    print(f"  Placeholder used:          {fail_count}")
    print(f"\n  Images saved to:  ./{IMAGE_DIR}/")
    print(f"  Updated CSV:      ./{CSV_OUTPUT}")
    print(f"  Manifest:         ./{MANIFEST_PATH}")

    if fail_count > 0:
        print(f"\n--- MODELS STILL ON PLACEHOLDERS (will auto-retry next run) ---")
        for key, entry in manifest.items():
            if entry.get("status") == "placeholder":
                brand, model, cat = key.split("||")
                print(f"  {brand} {model} ({cat}) -> {entry['filename']}")
        print(f"\nJust re-run the script later (e.g. after a break) - it will only")
        print(f"retry these, not the {success_count} that already succeeded.")


if __name__ == "__main__":
    main()