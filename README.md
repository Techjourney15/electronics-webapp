# GadgetHub

GadgetHub is a full-stack electronics marketplace built with Django (backend) and React (frontend). It supports customers, sellers, and admins, and includes AI-powered visual search, semantic text search, and a personalized recommendation engine.

## Features

### Marketplace Core
- Customer, seller, and admin roles with role-based access control
- Product catalog covering smartphones and laptops, with detailed specifications
- Cart, checkout, and order management
- Seller onboarding with admin approval workflow
- Sellers can list new products or claim existing unclaimed catalog products
- Payment integration via Khalti payment gateway

### Visual Search
- Upload a photo or use your device camera to find visually similar products
- Powered by MobileNetV2 (pretrained CNN) for image feature extraction
- Face-masking preprocessing so lifestyle photos match on the product, not the person
- Cosine similarity ranking against the full product catalog
- Multi-photo search support with merged, deduplicated results

### Semantic Search
- Natural language product search powered by Sentence-Transformer embeddings
- Understands meaning, not just exact keyword matches
- Price-aware ranking — a price mentioned in a search query is used to rank results by closeness
- Explicit sort controls (price low-to-high / high-to-low)

### Personalized Recommendations
- Homepage recommendations adapt to each user's real behavior
- Tracks product views, cart activity, purchase history, and search activity
- Weighted scoring (purchases > cart items > product views > search matches)
- Falls back to stated preferences for brand-new users with no activity yet

### Dashboards
- **Customer Dashboard** — profile, preferences, cart, and order history
- **Seller Dashboard** — manage listings, add new products, claim unclaimed products, track verification status
- **Admin Dashboard** — manage customers and sellers, approve/reject seller applications, view seller product listings

## Tech Stack

**Backend**
- Django + Django REST Framework
- MySQL
- JWT authentication (`djangorestframework-simplejwt`) with custom email-based login
- TensorFlow / Keras (MobileNetV2) for visual search
- Sentence-Transformers (`all-MiniLM-L6-v2`) for semantic search
- OpenCV for face-detection preprocessing

**Frontend**
- React (with React Router)
- Axios
- Tailwind CSS

**Payments**
- Khalti Payment Gateway

## Project Structure

```
backend/
  electro_backend/
    catalog/          # products, cart, orders, search, recommendations
    accounts/          # users, auth, seller/admin logic
    recommender/       # datasets, trained models, cached feature files
      visual_search/   # image feature datasets and build scripts
frontend/
  src/                # React components and pages
```

## Getting Started

### Backend Setup

```bash
cd backend/electro_backend
python -m venv myvenv
myvenv\Scripts\activate        # Windows
source myvenv/bin/activate     # macOS/Linux

pip install -r requirements.txt

# Configure your .env file with database credentials and Khalti API key

python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Building the Search Indexes

Visual search and semantic search rely on precomputed feature files. Run these after setting up your product data:

```bash
cd backend/electro_backend/recommender/visual_search
python build_image_features.py           # main catalog visual index
python build_amazon_dataset.py           # supplementary dataset (if used)

cd ..
python build_product_embeddings.py       # semantic search index
```

> **Note:** if you rebuild the product dataset (e.g. re-running `build_amazon_dataset.py`), product IDs may change. Re-run `build_product_embeddings.py` afterward to keep semantic search in sync.

## Environment Variables

Create a `.env` file inside `backend/electro_backend/` with:

```
SECRET_KEY=your-django-secret-key
DEBUG=True
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=3306
KHALTI_SECRET_KEY=your-khalti-sandbox-key
```
