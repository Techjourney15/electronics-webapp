import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

function ProductCard({ product, onClick }) {
  const imageUrl = product.image
    ? (product.image.startsWith("http") ? product.image : `${MEDIA_BASE}${product.image}`)
    : null;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition duration-300 hover:-translate-y-1 hover:border-white/20"
    >
      <button
        onClick={(e) => e.stopPropagation()}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-slate-300 backdrop-blur hover:text-red-400"
        title="Save to wishlist (coming soon)"
      >
        ♡
      </button>
      <div className="aspect-square w-full overflow-hidden bg-white/5">
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
        <p className="line-clamp-1 text-sm font-semibold text-white">
          {product.product_name}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#93b4e0]">
          {product.sub_category}
        </p>
        <p className="mt-2 text-base font-semibold text-white">
          Rs. {product.price_npr?.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [profile, setProfile] = useState(null);
  const accountMenuRef = useRef(null);

  const token = localStorage.getItem("access_token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    axios
      .get(`${API}/catalog/products/homepage/`, authHeader)
      .then((res) => setProducts(res.data))
      .catch(() => setError("Could not load recommendations right now."))
      .finally(() => setLoading(false));

    axios
      .get(`${API}/auth/my-profile/`, authHeader)
      .then((res) => setProfile(res.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = profile?.first_name
    ? profile.first_name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : (profile?.username || "?").slice(0, 2).toUpperCase();

  const navTabs = [
    { name: "Dashboard", path: "/homepage" },
    { name: "Profile", path: "/customer-dashboard" },
    { name: "Checkout", path: "/customer-dashboard?tab=cart" },
  ];

  const menuItems = [
    { label: "My orders", action: () => navigate("/customer-dashboard?tab=orders") },
    { label: "Wishlist", action: () => {} },
    { label: "Payment methods", action: () => {} },
    { label: "Saved addresses", action: () => {} },
    { label: "Account settings", action: () => navigate("/customer-dashboard") },
    { label: "Help & support", action: () => {} },
  ];

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Sticky top nav section */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0e1a]/90 backdrop-blur">
        
        {/* Nav Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-xs font-medium sm:px-8">
          {navTabs.map((tab) => {
            const isActive = location.pathname === tab.path || (tab.name === "Dashboard" && location.pathname === "/homepage");
            return (
              <button
                key={tab.name}
                onClick={() => navigate(tab.path)}
                className={`rounded-lg px-3 py-1 transition-colors ${
                  isActive
                    ? "bg-blue-600 font-semibold text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Main Header Bar */}
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-8">
          {/* Logo */}
          <div 
            onClick={() => navigate("/homepage")}
            className="flex cursor-pointer items-center gap-2"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white shadow-md"
              style={{ backgroundImage: 'linear-gradient(135deg, #4625eb, #d8ac1d)' }}
            >
              N
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">Nexora</span>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <span className="text-slate-500">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search phones, laptops, brands…"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
            <button
              type="button"
              className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#93b4e0] sm:flex hover:bg-white/20"
              title="Visual search (coming soon)"
            >
              📷 Visual search
            </button>
          </form>

          {/* Profile Badge Area */}
          <div className="relative" ref={accountMenuRef}>
            <button
              onClick={() => setShowAccountMenu((s) => !s)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-slate-950 transition hover:opacity-90 shadow-md"
              style={{ backgroundImage: 'linear-gradient(135deg, #f6a94a, #f2711c)' }}
            >
              {initials}
            </button>

            {showAccountMenu && (
              <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#10162a] shadow-2xl">
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-white">{profile?.first_name || profile?.username}</p>
                  <p className="text-xs text-slate-500">{profile?.email}</p>
                </div>
                <div className="py-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => { setShowAccountMenu(false); item.action(); }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/10 py-1">
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-400 hover:bg-white/5"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page Body */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        {/* Promo banner */}
        <div className="mb-10 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a2440] to-[#0a0e1a] p-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Trade in your old device,<br />save up to Rs 15,000
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Get an instant valuation and apply it directly at checkout on any listed phone or laptop.
          </p>
          <button
            className="mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold text-[#1a1206]"
            style={{ backgroundImage: 'linear-gradient(90deg, #f6a94a, #f2711c)' }}
          >
            Get my valuation
          </button>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Recommended for you</h1>
        </div>
        <p className="-mt-4 mb-8 text-sm text-slate-400">
          Handpicked from your preferences: curated by budget, category, and your priority.
        </p>

        <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-2xl border border-white/10 bg-white/5"
                />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm font-medium text-red-400">{error}</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-slate-400">No products found matching your preferences yet.</p>
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