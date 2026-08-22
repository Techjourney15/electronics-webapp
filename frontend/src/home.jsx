import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import PromoBanner from "./PromoBanner";

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

  const token = localStorage.getItem("access_token");

  // search bar submit garda search results page ma pathaune
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // page load huda ek pataka chalne — recommended products fetch garne
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
    <main className="relative min-h-screen overflow-hidden bg-[#0A0D18] text-slate-100">
      {/* background glow ra grid pattern, dark theme ma */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.12),transparent_34%)]" />
      <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      {/* Navigation bar: logo left, Home/Orders/Cart/Account right */}
      <div className="relative">
        <NavBar />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-8">

        {/* Search bar — sits directly below the nav bar */}
        <form
          onSubmit={handleSearch}
          className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-slate-700 bg-[#111827] px-5 py-3.5 shadow-lg shadow-black/20"
        >
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

        {/* Sliding promotional banner — directly below the search bar */}
        <PromoBanner />

        {/* Recommended products section */}
        <h1 className="mt-12 text-[1.7rem] font-semibold tracking-[-0.03em] text-white">
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
    </main>
  );
}

export default Home;
