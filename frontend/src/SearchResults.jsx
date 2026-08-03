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
    <main className="relative min-h-screen overflow-hidden bg-[#eef3fb] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,176,126,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(141,109,72,0.12),transparent_34%)]" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <button
          onClick={() => navigate('/homepage')}
          className="mb-6 text-sm font-semibold text-[#2f5fa8] hover:underline"
        >
          ← Back to homepage
        </button>

        {/* search bar, same style as homepage */}
        <form onSubmit={handleSubmit} className="mx-auto mb-10 max-w-2xl">
          <div className="flex items-center gap-2 rounded-full border border-[#93b4e0] bg-white px-5 py-3 shadow-sm transition focus-within:ring-2 focus-within:ring-[#2f5fa8]/20">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
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

        {query && (
          <h1 className="mb-6 text-lg font-medium text-slate-700">
            {loading ? "Searching…" : `${count} result${count === 1 ? "" : "s"} for "${query}"`}
          </h1>
        )}

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
        ) : results.length === 0 ? (
          <p className="text-sm text-slate-600">
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
