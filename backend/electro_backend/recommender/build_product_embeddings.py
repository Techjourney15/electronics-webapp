import os
import sys
import pickle
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'electro_backend.settings')
django.setup()

from django.conf import settings
from sentence_transformers import SentenceTransformer
from catalog.models import Product

model = SentenceTransformer('all-MiniLM-L6-v2')

products = Product.objects.all()
texts = [f"{p.product_name} {p.brand.name} {p.description}" for p in products]
ids = [p.id for p in products]

print(f"Encoding {len(texts)} products...")
embeddings = model.encode(texts, show_progress_bar=True)

cache = dict(zip(ids, embeddings))

out_path = os.path.join(settings.BASE_DIR, 'recommender', 'product_embeddings.pkl')
with open(out_path, 'wb') as f:
    pickle.dump(cache, f)

print(f"Saved {len(cache)} embeddings to {out_path}")