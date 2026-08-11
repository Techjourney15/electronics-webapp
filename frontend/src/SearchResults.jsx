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
      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0c1322]/90 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl"
    >
      <div className="aspect-square w-full overflow-hidden bg-[#11192e]">
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
        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[#3b82f6]">
          {product.sub_category}
        </p>
        <p className="mt-2 text-base font-bold text-white">
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

  useEffect(() => {
    setInputValue(query);
    setLoading(true);
    setError("");

    axios
      .get(`${API}/catalog/products/semantic-search/`, {
        params: { q: query },
      })
      .then((res) => {
        setResults(res.data.results || []);
        setCount(res.data.count || 0);
      })
      .catch(() => setError("Could not load search results."))
      .finally(() => setLoading(false));
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams(inputValue ? { q: inputValue } : {});
  };

  return (
    <main className="relative min-h-screen bg-[#070b14] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,rgba(24,75,255,0.12),transparent_50%)] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <button
          onClick={() => navigate('/homepage')}
          className="mb-6 text-sm font-semibold text-[#3b82f6] hover:text-blue-400 transition"
        >
          ← Back to homepage
        </button>

        <form onSubmit={handleSubmit} className="mx-auto mb-10 max-w-2xl">
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-[#0c1322]/90 px-5 py-3 shadow-2xl backdrop-blur-xl focus-within:border-[#1d4ed8]">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search for phones, laptops, brands…"
              className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="rounded-full bg-[#1d4ed8] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af] transition"
            >
              Search
            </button>
          </div>
        </form>

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
                className="aspect-[3/4] animate-pulse rounded-2xl border border-slate-800/60 bg-[#0c1322]/50"
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