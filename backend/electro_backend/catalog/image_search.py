import numpy as np
import cv2
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input


_MODEL = MobileNetV2(weights='imagenet', include_top=False, pooling='avg')

_FACE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
)


def _mask_faces_on_array(img):
    """Blank out any detected faces so people in lifestyle product photos
    don't dominate the feature comparison."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = _FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
    for (x, y, w, h) in faces:
        cv2.rectangle(img, (x, y), (x + w, y + h), (0, 0, 0), -1)
    return img


def _load_and_mask(image_path):
    img = cv2.imread(image_path)
    if img is None:
        return None
    img = _mask_faces_on_array(img)
    img = cv2.resize(img, (224, 224))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img.astype(np.float32)


def extract_features(image_path):
    """1000-class prediction-probability vector for one image, faces masked.
    Used when a customer uploads a photo to search."""
    try:
        arr = _load_and_mask(image_path)
        if arr is None:
            return None
        arr = np.expand_dims(arr, axis=0)
        arr = preprocess_input(arr)
        preds = _MODEL.predict(arr, verbose=0)
        return preds.flatten()
    except Exception:
        return None


def extract_features_batch(image_paths):
    """Batched version -- used once to build the catalog cache for all
    10,000 products, much faster than calling extract_features() in a loop."""
    arrs = []
    valid_indices = []
    for i, path in enumerate(image_paths):
        arr = _load_and_mask(path)
        if arr is not None:
            arrs.append(arr)
            valid_indices.append(i)

    if not arrs:
        return [None] * len(image_paths)

    batch = np.stack(arrs, axis=0)
    batch = preprocess_input(batch)
    preds = _MODEL.predict(batch, verbose=0)

    results = [None] * len(image_paths)
    for j, idx in enumerate(valid_indices):
        results[idx] = preds[j].flatten()
    return results


def compare_features(query_vec, candidate_vec):
    """Cosine similarity between two feature vectors."""
    a, b = query_vec, candidate_vec
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def _warm_up_model():
    """Run one dummy prediction at import time so the first real request
    isn't slowed down by TensorFlow's initial graph-tracing overhead."""
    try:
        dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
        dummy = preprocess_input(dummy)
        _MODEL.predict(dummy, verbose=0)
    except Exception:
        pass


_warm_up_model()