import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000"; // image ko full url banauna

// euta product ko card — homepage ma grid ma dekhincha
function ProductCard({ product, onClick }) {
  const imageUrl = product.image
    ? (product.image.startsWith("http") ? product.image : `${MEDIA_BASE}${product.image}`)
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

function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]); // recommended product list
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAccountMenu, setShowAccountMenu] = useState(false); // account dropdown khula ki band
  const [userInitials, setUserInitials] = useState("U"); // avatar ma dekhaune initials
  const [infoModal, setInfoModal] = useState(null); // 'help' | 'policies' | 'feedback' | null — kun popup khula cha

  const accountMenuRef = useRef(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // dropdown ko bahira click garda band garne
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

  // search bar submit garda search results page ma pathaune
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // page load huda ek pataka chalne — recommended products ra profile fetch garne
  useEffect(() => {
    axios
      .get(`${API}/catalog/products/homepage/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setProducts(res.data))
      .catch(() => setError("Could not load recommendations right now."))
      .finally(() => setLoading(false));

    // avatar ko lagi user ko naam bata initials nikalne
    axios
      .get(`${API}/auth/my-profile/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const name = res.data.first_name || res.data.username || "U";
        setUserInitials(name.slice(0, 2).toUpperCase());
      })
      .catch(() => {});
  }, []);

  // maathi ko tab bar — Dashboard ra Profile matra, Checkout hataisakyo
  const tabs = [
    { label: "Dashboard", action: () => navigate("/homepage") },
    { label: "Profile", action: () => navigate("/customer-dashboard?tab=profile") },
  ];

  // logout garne — token clear garera login page ma pathaune
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0D18] text-slate-100">
      {/* background glow ra grid pattern, dark theme ma */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.12),transparent_34%)]" />
      <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-8">

        {/* Tab bar — maathi patti Dashboard/Profile switch garna */}
        <div className="mb-6 flex items-center gap-6 border-b border-slate-800 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={tab.action}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                tab.label === "Dashboard"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Top bar: logo + search bar + orders/cart/account */}
        <div className="mb-8 flex items-center gap-4">
          <span className="flex flex-shrink-0 items-center gap-2 text-sm font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-amber-500 text-white text-xs">N</span>
            Nexora
          </span>

          {/* search bar — text search + visual search camera icon ekै thau ma */}
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2 rounded-full border border-slate-700 bg-[#111827] px-5 py-3">
            <svg className="h-5 w-5 flex-shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for phones, laptops, brands…"
              className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => navigate('/visual-search')}
              title="Search by Image"
              className="flex items-center justify-center rounded-full border border-slate-700 bg-[#1A1D2E] p-2 text-slate-300 hover:bg-slate-800 hover:text-blue-400"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </button>
          </form>

          {/* Orders button — customer dashboard ko orders tab ma pathaune */}
          <button
            onClick={() => navigate('/customer-dashboard?tab=orders')}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-slate-700 bg-[#111827] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Orders
          </button>

          {/* Cart button — customer dashboard ko cart tab ma pathaune */}
          <button
            onClick={() => navigate('/customer-dashboard?tab=cart')}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-slate-700 bg-[#111827] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m-10 0a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            Cart
          </button>

          {/* Account avatar + dropdown menu */}
          <div className="relative flex-shrink-0" ref={accountMenuRef}>
            <button
              onClick={() => setShowAccountMenu((s) => !s)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-xs font-bold text-white"
            >
              {userInitials}
            </button>

            {showAccountMenu && (
              <div className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-xl border border-slate-700 bg-[#111827] shadow-xl">
                <button
                  onClick={() => { setShowAccountMenu(false); navigate('/customer-dashboard?tab=profile'); }}
                  className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Profile
                </button>
                <button
                  onClick={() => { setShowAccountMenu(false); navigate('/customer-dashboard?tab=preferences'); }}
                  className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white border-t border-slate-700/60"
                >
                  Preferences
                </button>
                {/* yaha bata tala Help/Policies/Feedback — popup dekhaune, naya page haina */}
                <button
                  onClick={() => { setShowAccountMenu(false); setInfoModal('help'); }}
                  className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white border-t border-slate-700/60"
                >
                  Help
                </button>
                <button
                  onClick={() => { setShowAccountMenu(false); setInfoModal('policies'); }}
                  className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white border-t border-slate-700/60"
                >
                  Policies
                </button>
                <button
                  onClick={() => { setShowAccountMenu(false); setInfoModal('feedback'); }}
                  className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white border-t border-slate-700/60"
                >
                  Feedback
                </button>
                <button
                  onClick={() => { setShowAccountMenu(false); handleLogout(); }}
                  className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-red-400 hover:bg-slate-800 border-t border-slate-700/60"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recommended products section */}
        <h1 className="text-[1.7rem] font-semibold tracking-[-0.03em] text-white">
          Recommended for you
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
          Matched to your budget, your priorities, your browsing. No filler — just what fits.
        </p>

        <div className="mt-10">
          {loading ? (
            // loading bela skeleton placeholder cards dekhaune
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-[20px] border border-slate-700/60 bg-[#111827]/50"
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

      {/* Help/Policies/Feedback popup — jun click garyo tyeschai content dekhaune */}
      {infoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setInfoModal(null)}>
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#111827] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()} // andar click garda popup band nahos
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white capitalize">{infoModal}</h3>
              <button onClick={() => setInfoModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="mt-4 text-sm leading-6 text-slate-300">
              {infoModal === 'help' && (
                <p>Need assistance? Reach out to our support team at support@nexora.com, or browse our FAQs for answers on orders, payments, and returns.</p>
              )}
              {infoModal === 'policies' && (
                <p>Nexora is committed to fair pricing, verified listings, and buyer protection. Items can be returned within 7 days if not as described. Full terms available on request.</p>
              )}
              {infoModal === 'feedback' && (
                <>
                  <p>We'd love to hear from you. Share your thoughts on your shopping experience, and help us improve Nexora for everyone.</p>

                  {feedbackSent ? (
                    <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-400">
                      Thanks for your feedback! We really appreciate it.
                    </p>
                  ) : (
                    <>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Tell us what you think…"
                        rows={4}
                        className="mt-4 w-full resize-none rounded-lg border border-slate-700 bg-[#1A1D2E] px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          setFeedbackSent(true);
                          setFeedbackText("");
                        }}
                        disabled={!feedbackText.trim()}
                        className="mt-3 w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                      >
                        Send feedback
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Home;