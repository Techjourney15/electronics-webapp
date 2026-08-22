import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

function FavoriteCard({ product, onClick }) {
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

function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    axios
      .get(`${API}/catalog/favorites/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setFavorites(res.data))
      .catch(() => setError("Could not load your favorites right now."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0D18] text-slate-100">
      <NavBar />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.12),transparent_34%)]" />
      <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <h1 className="flex items-center gap-2 text-[1.7rem] font-semibold tracking-[-0.03em] text-white">
          <span>♥</span> My Favorites
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
          Products you prefer the most.
        </p>

        <div className="mt-10">
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
          ) : favorites.length === 0 ? (
            <p className="text-sm text-slate-400">
              You haven't added any favorites yet. Tap the heart on a product page to save it here.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {favorites.map((p) => (
                <FavoriteCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default Favorites;