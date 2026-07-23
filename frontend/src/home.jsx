import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

function ProductCard({ product }) {
  const imageUrl = product.image
    ? (product.image.startsWith("http") ? product.image : `${MEDIA_BASE}${product.image}`)
    : null;

  return (
    <div className="group overflow-hidden rounded-[20px] border border-[#E6E1D5]/40 bg-[rgba(255,252,246,0.86)] shadow-[0_6px_24px_-8px_rgba(141,109,72,0.15)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_-8px_rgba(141,109,72,0.25)]">
      <div className="aspect-square w-full overflow-hidden bg-[#f4eadc]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.product_name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="line-clamp-1 text-sm font-semibold text-slate-900">
          {product.product_name}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#9d7b55]">
          {product.sub_category}
        </p>
        <p className="mt-2 text-base font-semibold text-[#4d3824]">
          Rs. {product.price_npr?.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    axios
      .get(`${API}/catalog/products/homepage/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setProducts(res.data))
      .catch(() => setError("Could not load recommendations right now."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6efe3] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,176,126,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(141,109,72,0.12),transparent_34%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(95,74,44,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(95,74,44,0.06)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d9c6a7] bg-[#f4eadc] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[#6a5138]">
            Nexora
          </span>
        </div>

        <h1 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900 sm:text-[2.4rem]">
          Featured for you
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-700">
          Handpicked from your preferences — curated by budget, category, and what matters most to you.
        </p>

        <div className="mt-10">
          {loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-[20px] border border-[#E6E1D5]/40 bg-[rgba(255,252,246,0.5)]"
                />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm font-medium text-red-600">{error}</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-slate-600">No products found matching your preferences yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default Home;