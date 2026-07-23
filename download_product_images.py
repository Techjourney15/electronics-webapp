"""
=============================================================================
NEXORA - Product Image Downloader
=============================================================================
Downloads one product image per unique model from the internet and updates
the CSV dataset with image file paths.

SETUP (run these in your terminal first):
    pip install duckduckgo-search requests pandas Pillow

USAGE:
    python download_product_images.py

WHAT IT DOES:
    1. Reads nexora_electronics_dataset.csv
    2. Extracts unique model names (~150 models from 10,000 products)
    3. Searches for one clean product image per model
    4. Downloads and saves to ./product_images/ folder
    5. Resizes all images to a consistent 500x500 px
    6. Outputs an updated CSV with image_filename column

NOTES:
    - Uses DuckDuckGo image search (FREE, no API key needed)
    - Rate-limited to avoid getting blocked (2-second delay between requests)
    - If a download fails, it retries once, then skips with a placeholder
    - Run once to build your image library; re-run skips already downloaded ones
    - Total time: ~10-15 minutes for ~150 models
=============================================================================
"""

import os
import time
import hashlib
import requests
import pandas as pd
from pathlib import Path
from io import BytesIO

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow not installed. Run: pip install Pillow")
    exit(1)

try:
    from duckduckgo_search import DDGS
except ImportError:
    print("ERROR: duckduckgo-search not installed. Run: pip install duckduckgo-search")
    exit(1)


# =============================================================================
# CONFIGURATION - Modify these if needed
# =============================================================================

CSV_INPUT = "nexora_electronics_dataset.csv"       # Input CSV path
CSV_OUTPUT = "nexora_electronics_dataset_with_images.csv"  # Output CSV path
IMAGE_DIR = "product_images"                        # Folder to save images
IMAGE_SIZE = (500, 500)                             # Consistent image dimensions
DELAY_SECONDS = 2.5                                 # Delay between downloads (be polite)
MAX_RETRIES = 2                                     # Retries per failed download
REQUEST_TIMEOUT = 15                                # HTTP timeout in seconds


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
    # Remove double dashes
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def build_search_query(brand, model, category):
    """Build an effective image search query for a product."""
    # Clean up model name to avoid redundant brand mention
    model_clean = model
    if model.lower().startswith(brand.lower()):
        model_clean = model  # Keep as is, brand is part of model name
    else:
        model_clean = f"{brand} {model}"

    if category == "Smartphone":
        return f"{model_clean} smartphone official product image"
    else:
        return f"{model_clean} laptop official product image"


def search_image_url(query):
    """Search DuckDuckGo for a product image and return the best URL."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.images(
                keywords=query,
                region="wt-wt",         # Worldwide
                safesearch="moderate",
                size="Medium",           # Medium-sized images
                type_image="photo",
                max_results=5
            ))

        if not results:
            return None

        # Prefer images from known reliable sources
        preferred_domains = [
            "amazon", "flipkart", "samsung", "apple", "xiaomi",
            "oneplus", "oppo", "vivo", "realme", "google", "motorola",
            "nokia", "dell", "hp", "lenovo", "asus", "acer", "msi",
            "gsmarena", "gadgets360", "notebookcheck"
        ]

        # Try preferred domains first
        for result in results:
            url = result.get("image", "")
            if any(domain in url.lower() for domain in preferred_domains):
                return url

        # Fall back to first result
        return results[0].get("image", None)

    except Exception as e:
        print(f"    Search error: {e}")
        return None


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

    # Verify it's actually an image
    content_type = response.headers.get("Content-Type", "")
    if "image" not in content_type and not url.lower().endswith((".jpg", ".png", ".webp", ".jpeg")):
        raise ValueError(f"Not an image: {content_type}")

    # Open, resize, convert to RGB, save as JPEG
    img = Image.open(BytesIO(response.content))
    img = img.convert("RGB")
    img = img.resize(IMAGE_SIZE, Image.LANCZOS)
    img.save(save_path, "JPEG", quality=90)

    return True


def create_placeholder_image(save_path, brand, category):
    """Create a simple placeholder image when download fails."""
    img = Image.new("RGB", IMAGE_SIZE, color=(240, 240, 240))

    # Try to add text if possible
    try:
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        text = f"{brand}\n{category}\n[Image Not Found]"
        # Use default font
        draw.text((IMAGE_SIZE[0]//4, IMAGE_SIZE[1]//3), text, fill=(150, 150, 150))
    except Exception:
        pass  # Plain gray image is fine

    img.save(save_path, "JPEG", quality=85)


# =============================================================================
# MAIN SCRIPT
# =============================================================================

def main():
    # Step 1: Read CSV
    print("=" * 60)
    print("NEXORA - Product Image Downloader")
    print("=" * 60)

    if not os.path.exists(CSV_INPUT):
        print(f"\nERROR: Cannot find '{CSV_INPUT}'")
        print(f"Make sure the CSV file is in the same folder as this script.")
        print(f"Current directory: {os.getcwd()}")
        return

    df = pd.read_csv(CSV_INPUT)
    print(f"\nLoaded {len(df)} products from {CSV_INPUT}")

    # Step 2: Create image directory
    os.makedirs(IMAGE_DIR, exist_ok=True)
    print(f"Images will be saved to: ./{IMAGE_DIR}/")

    # Step 3: Extract unique models
    unique_models = df.drop_duplicates(subset=["brand", "model", "category"])[
        ["brand", "model", "category"]
    ].reset_index(drop=True)

    print(f"Found {len(unique_models)} unique models to download images for\n")

    # Step 4: Download images for each unique model
    model_to_filename = {}
    success_count = 0
    skip_count = 0
    fail_count = 0

    for idx, row in unique_models.iterrows():
        brand = row["brand"]
        model = row["model"]
        category = row["category"]

        filename = sanitize_filename(f"{brand}-{model}") + ".jpg"
        save_path = os.path.join(IMAGE_DIR, filename)
        model_key = f"{brand}||{model}||{category}"

        # Skip if already downloaded
        if os.path.exists(save_path):
            file_size = os.path.getsize(save_path)
            if file_size > 5000:  # More than 5KB = probably a real image
                model_to_filename[model_key] = filename
                skip_count += 1
                print(f"[{idx+1}/{len(unique_models)}] SKIP (exists): {brand} {model}")
                continue

        # Search for image
        query = build_search_query(brand, model, category)
        print(f"[{idx+1}/{len(unique_models)}] Searching: {brand} {model}...", end=" ")

        downloaded = False
        for attempt in range(MAX_RETRIES):
            try:
                url = search_image_url(query)
                if url:
                    download_and_resize_image(url, save_path)
                    downloaded = True
                    print(f"OK")
                    break
                else:
                    print(f"no results", end=" ")
            except Exception as e:
                print(f"retry {attempt+1}", end=" ")
                time.sleep(1)

        if downloaded:
            model_to_filename[model_key] = filename
            success_count += 1
        else:
            # Create placeholder
            create_placeholder_image(save_path, brand, category)
            model_to_filename[model_key] = filename
            fail_count += 1
            print(f"-> placeholder created")

        # Rate limiting
        time.sleep(DELAY_SECONDS)

    # Step 5: Map filenames back to full dataset
    print(f"\nMapping images to all {len(df)} products...")

    def get_image_filename(row):
        key = f"{row['brand']}||{row['model']}||{row['category']}"
        return model_to_filename.get(key, "placeholder.jpg")

    df["image_filename"] = df.apply(get_image_filename, axis=1)

    # Step 6: Save updated CSV
    df.to_csv(CSV_OUTPUT, index=False, encoding="utf-8-sig")

    # Step 7: Print summary
    print("\n" + "=" * 60)
    print("DOWNLOAD COMPLETE")
    print("=" * 60)
    print(f"  Total unique models:  {len(unique_models)}")
    print(f"  Successfully downloaded: {success_count}")
    print(f"  Already existed (skipped): {skip_count}")
    print(f"  Failed (placeholder used):  {fail_count}")
    print(f"\n  Images saved to:  ./{IMAGE_DIR}/")
    print(f"  Updated CSV:      ./{CSV_OUTPUT}")
    print(f"\nThe image_filename column has been added to the CSV.")
    print(f"In your Django model, set MEDIA_ROOT to point to the")
    print(f"'{IMAGE_DIR}' folder and use image_filename for lookups.")

    # Step 8: Generate a quick report of what's missing
    if fail_count > 0:
        print(f"\n--- MODELS WITH PLACEHOLDER IMAGES (manual download needed) ---")
        for key, fname in model_to_filename.items():
            fpath = os.path.join(IMAGE_DIR, fname)
            if os.path.exists(fpath) and os.path.getsize(fpath) < 10000:
                brand, model, cat = key.split("||")
                print(f"  {brand} {model} ({cat}) -> {fname}")
        print(f"\nTip: Search these manually on GSMArena or the brand's website,")
        print(f"download the image, resize to {IMAGE_SIZE[0]}x{IMAGE_SIZE[1]}px,")
        print(f"and save with the same filename in ./{IMAGE_DIR}/")


# =============================================================================
# ALTERNATIVE: Google Custom Search (if DuckDuckGo stops working)
# =============================================================================
#
# If DuckDuckGo gets rate-limited, use Google Custom Search API instead:
#
# 1. Go to https://programmablesearchengine.google.com/ and create a search engine
#    - Enable "Search the entire web"
#    - Enable "Image search"
#    - Copy your Search Engine ID (cx)
#
# 2. Go to https://console.cloud.google.com/apis/credentials
#    - Create an API key
#    - Enable "Custom Search API"
#    - Free tier: 100 queries/day (enough for ~150 models in 2 days)
#
# 3. Replace the search_image_url() function with:
#
# GOOGLE_API_KEY = "your-api-key-here"
# GOOGLE_CX = "your-search-engine-id-here"
#
# def search_image_url(query):
#     url = "https://www.googleapis.com/customsearch/v1"
#     params = {
#         "key": GOOGLE_API_KEY,
#         "cx": GOOGLE_CX,
#         "q": query,
#         "searchType": "image",
#         "num": 3,
#         "imgSize": "medium",
#         "safe": "active"
#     }
#     response = requests.get(url, params=params, timeout=10)
#     data = response.json()
#     if "items" in data and len(data["items"]) > 0:
#         return data["items"][0]["link"]
#     return None
#
# =============================================================================


if __name__ == "__main__":
    main()
