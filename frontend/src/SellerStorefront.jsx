import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

function ProductCard({ product, onClick }) {
  const imageUrl = product.image
    ? product.image.startsWith("http")
      ? product.image
      : `${MEDIA_BASE}${product.image}`
    : null;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-[20px] border border-slate-700/60 bg-[#111827] shadow-[0_6px_24px_-8px_rgba(0,0,0,0.4)] transition duration-300 hover:-translate-y-1 hover:border-slate-600 hover:shadow-[0_12px_36px_-8px_rgba(37,99,235,0.25)]"
    >
      <div className="aspect-square w-full overflow-hidden bg-[#1A1D2E]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.product_name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="line-clamp-1 text-sm font-semibold text-slate-100">
          {product.product_name}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-blue-400">
          {product.sub_category}
        </p>
        <p className="mt-2 text-base font-semibold text-white">
          Rs. {product.price_npr?.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function SellerStorefront() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API}/catalog/sellers/${id}/products/`)
      .then((res) => {
        setSeller(res.data.seller);
        setProducts(res.data.products);
      })
      .catch(() => setError("Could not load this seller's store."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0D18] px-4 py-10 text-slate-400 sm:px-8">
        <p className="text-sm">Loading store…</p>
      </main>
    );
  }

  if (error || !seller) {
    return (
      <main className="min-h-screen bg-[#0A0D18] px-4 py-10 sm:px-8">
        <p className="text-sm font-medium text-red-400">{error || "Store not found."}</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0D18] text-slate-100 px-4 py-10 sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.12),transparent_34%)]" />
      <div className="relative mx-auto max-w-6xl">
        <button
          onClick={() => navigate("/homepage")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-400 transition hover:text-blue-300"
        >
          ← Home
        </button>

        <div className="mb-10 flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-amber-500 text-xl font-bold text-white">
            {seller.business_name?.slice(0, 1).toUpperCase() || "S"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{seller.business_name}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {products.length} product{products.length !== 1 ? "s" : ""} available
              {seller.verification_status === "approved" && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                  ✓ Verified seller
                </span>
              )}
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-slate-400">This seller has no products listed right now.</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default SellerStorefront;