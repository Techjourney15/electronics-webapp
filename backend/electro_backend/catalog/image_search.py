import os

# Suppress TensorFlow C++ logging noise (harmless even though we no longer
# use TF here directly -- other modules in this project still import it)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import numpy as np
import cv2
import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

_MODEL_NAME = 'openai/clip-vit-base-patch32'
_DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'

_MODEL = CLIPModel.from_pretrained(_MODEL_NAME).to(_DEVICE).eval()
_PROCESSOR = CLIPProcessor.from_pretrained(_MODEL_NAME)

cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
_FACE_CASCADE = cv2.CascadeClassifier(cascade_path) if os.path.exists(cascade_path) else cv2.CascadeClassifier()


def _mask_faces_on_array(img):
    """Blank out any detected faces so people in lifestyle product photos
    don't dominate the feature comparison."""
    if img is None:
        return None

    # Work on a copy to prevent accidental array mutation side effects
    img_copy = img.copy()
    gray = cv2.cvtColor(img_copy, cv2.COLOR_BGR2GRAY)

    if not _FACE_CASCADE.empty():
        faces = _FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        for (x, y, w, h) in faces:
            cv2.rectangle(img_copy, (x, y), (x + w, y + h), (0, 0, 0), -1)

    return img_copy


def _load_and_mask_pil(image_path):
    """Load an image from disk, mask faces, return as a PIL Image (RGB)
    ready for the CLIP processor."""
    img = cv2.imread(image_path)
    if img is None:
        return None
    img = _mask_faces_on_array(img)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return Image.fromarray(img)


def _get_image_embeds(inputs):
    """Wraps get_image_features and unwraps the result regardless of
    whether this transformers version returns a plain tensor or a
    model-output object."""
    output = _MODEL.get_image_features(**inputs)
    if hasattr(output, 'image_embeds'):
        output = output.image_embeds
    elif hasattr(output, 'pooler_output'):
        output = output.pooler_output
    return output


@torch.no_grad()
def extract_features(image_path):
    """CLIP image-embedding feature vector for one image, faces masked.
    Used when a customer uploads a photo to search."""
    try:
        pil_img = _load_and_mask_pil(image_path)
        if pil_img is None:
            return None
        inputs = _PROCESSOR(images=pil_img, return_tensors='pt').to(_DEVICE)
        feats = _get_image_embeds(inputs)
        feats = feats / feats.norm(p=2, dim=-1, keepdim=True)
        return feats.squeeze(0).cpu().numpy()
    except Exception:
        return None


@torch.no_grad()
def extract_features_batch(image_paths):
    """Batched version -- used once to build the catalog cache for all
    products, much faster than calling extract_features() in a loop."""
    pil_imgs = []
    valid_indices = []
    for i, path in enumerate(image_paths):
        pil_img = _load_and_mask_pil(path)
        if pil_img is not None:
            pil_imgs.append(pil_img)
            valid_indices.append(i)

    if not pil_imgs:
        return [None] * len(image_paths)

    results = [None] * len(image_paths)

    # Process in sub-batches to keep memory bounded on large catalogs
    BATCH_SIZE = 32
    for start in range(0, len(pil_imgs), BATCH_SIZE):
        chunk_imgs = pil_imgs[start:start + BATCH_SIZE]
        chunk_indices = valid_indices[start:start + BATCH_SIZE]

        inputs = _PROCESSOR(images=chunk_imgs, return_tensors='pt').to(_DEVICE)
        feats = _get_image_embeds(inputs)
        feats = feats / feats.norm(p=2, dim=-1, keepdim=True)
        feats = feats.cpu().numpy()

        for j, idx in enumerate(chunk_indices):
            results[idx] = feats[j]

    return results


def compare_features(query_vec, candidate_vec):
    """Cosine similarity between two feature vectors."""
    if query_vec is None or candidate_vec is None:
        return 0.0
    a, b = np.array(query_vec), np.array(candidate_vec)
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def _warm_up_model():
    """Run one dummy prediction at import time so the first real request
    isn't slowed down by the model's initial load/graph overhead."""
    try:
        dummy = Image.new('RGB', (224, 224))
        inputs = _PROCESSOR(images=dummy, return_tensors='pt').to(_DEVICE)
        with torch.no_grad():
            _get_image_embeds(inputs)
    except Exception:
        pass


_warm_up_model()