import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

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

function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState(query);
  const [results, setResults] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState(""); // 'price_asc' | 'price_desc' | ''

  useEffect(() => {
    setInputValue(query);
    setLoading(true);
    setError("");

    axios
      .get(`${API}/catalog/products/semantic-search/`, {
        params: { q: query, sort: sortBy || undefined },
      })
      .then((res) => {
        setResults(res.data.results || []);
        setCount(res.data.count || 0);
      })
      .catch(() => setError("Could not load search results."))
      .finally(() => setLoading(false));
  }, [query, sortBy]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams(inputValue ? { q: inputValue } : {});
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0D18] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.12),transparent_34%)]" />
      <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <button
          onClick={() => navigate('/homepage')}
          className="mb-6 text-sm font-semibold text-blue-400 hover:text-blue-300 hover:underline"
        >
          ← Back to homepage
        </button>

        {/* search bar, same style as homepage */}
        <form onSubmit={handleSubmit} className="mx-auto mb-10 max-w-2xl">
          <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#111827] px-5 py-3 shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500/20">
            <svg
              className="h-5 w-5 flex-shrink-0 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search for phones, laptops, brands…"
              className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition"
            >
              Search
            </button>
          </div>
        </form>

        {/* sort buttons — price low-to-high / high-to-low */}
        {results.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort by price:</span>
            <button
              onClick={() => setSortBy(sortBy === 'price_asc' ? '' : 'price_asc')}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                sortBy === 'price_asc'
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-700 bg-[#111827] text-slate-300 hover:bg-slate-800'
              }`}
            >
              Low to High
            </button>
            <button
              onClick={() => setSortBy(sortBy === 'price_desc' ? '' : 'price_desc')}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                sortBy === 'price_desc'
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-700 bg-[#111827] text-slate-300 hover:bg-slate-800'
              }`}
            >
              High to Low
            </button>
          </div>
        )}

        {query && (
          <h1 className="mb-6 text-lg font-medium text-slate-300">
            {loading ? "Searching…" : `${count} result${count === 1 ? "" : "s"} for "${query}"`}
          </h1>
        )}

        {loading ? (
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
        ) : results.length === 0 ? (
          <p className="text-sm text-slate-400">
            {query ? `No products found matching "${query}".` : "Start typing to search for products."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default SearchResults;