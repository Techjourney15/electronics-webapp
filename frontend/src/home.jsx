import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

function ProductCard({ product, onClick }) {
  const imageUrl = product.image
    ? (product.image.startsWith("http") ? product.image : `${MEDIA_BASE}${product.image}`)
    : null;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-[20px] border border-[#d3e0f5]/40 bg-[rgba(238,243,251,0.86)] shadow-[0_6px_24px_-8px_rgba(141,109,72,0.15)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_-8px_rgba(141,109,72,0.25)]"
    >
      <div className="aspect-square w-full overflow-hidden bg-[#e3edfa]">
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
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#2f5fa8]">
          {product.sub_category}
        </p>
        <p className="mt-2 text-base font-semibold text-[#1a3a66]">
          Rs. {product.price_npr?.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const token = localStorage.getItem("access_token");
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

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
    <main className="relative min-h-screen overflow-hidden bg-[#eef3fb] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,176,126,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(141,109,72,0.12),transparent_34%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(95,74,44,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(95,74,44,0.06)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#93b4e0] bg-[#e3edfa] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[#2f5fa8]">
            Nexora
          </span>

          <div className="flex items-center gap-2">
            {/* Orders icon button */}
            <button
              onClick={() => navigate('/customer-dashboard?tab=orders')}
              title="Orders"
              className="flex items-center gap-1.5 rounded-full border border-[#c3d7f0] bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-[#e3edfa]"
            >
              <span>📦</span>
              <span className="hidden sm:inline">Orders</span>
            </button>

            {/* Cart icon button */}
            <button
              onClick={() => navigate('/customer-dashboard?tab=cart')}
              title="Cart"
              className="flex items-center gap-1.5 rounded-full border border-[#c3d7f0] bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-[#e3edfa]"
            >
              <span>🛒</span>
              <span className="hidden sm:inline">Cart</span>
            </button>

            {/* My Account dropdown */}
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setShowAccountMenu((s) => !s)}
                className="flex items-center gap-1.5 rounded-full border border-[#c3d7f0] bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-[#e3edfa]"
              >
                <span>👤</span>
                My Account
                <span className="text-[10px]">{showAccountMenu ? "▲" : "▼"}</span>
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-xl border border-[#c3d7f0] bg-white shadow-lg">
                  <button
                    onClick={() => { setShowAccountMenu(false); navigate('/customer-dashboard?tab=profile'); }}
                    className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-[#e3edfa]"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => { setShowAccountMenu(false); navigate('/customer-dashboard?tab=preferences'); }}
                    className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-[#e3edfa] border-t border-[#eef3fb]"
                  >
                    Preferences
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mx-auto mb-8 max-w-2xl">
          <div className="flex items-center gap-2 rounded-full border border-[#93b4e0] bg-white px-5 py-3 shadow-sm transition focus-within:ring-2 focus-within:ring-[#2f5fa8]/20">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for phones, laptops, brands…"
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="rounded-full bg-[#2f5fa8] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1a3a66]"
            >
              Search
            </button>
          </div>
        </form>

        <h1 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900 sm:text-[2.4rem]">
          Featured for you
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-700">
          Handpicked from your preferences : Curated by budget, category, and your priority.
        </p>

        <div className="mt-10">
          {loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-[20px] border border-[#d3e0f5]/40 bg-[rgba(238,243,251,0.5)]"
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
                <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default Home;