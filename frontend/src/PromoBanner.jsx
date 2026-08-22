import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import deviceImage from "./assets/Mobile.webp";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

/**
 * Slim & Wide sliding promotional banner.
 */
function PromoBanner() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    axios
      .get(`${API}/catalog/products/featured/`)
      .then((res) => setSlides(res.data.slice(0, 6)))
      .catch(() => {});
  }, []);

  // Auto-slide every 4.5s
  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, [slides]);

  const goTo = (i) => {
    clearInterval(timerRef.current);
    setIndex(i);
  };
  const prev = () => goTo((index - 1 + slides.length) % slides.length);
  const next = () => goTo((index + 1) % slides.length);

  if (slides.length === 0) return null;

  return (
    /* Full width restored for long horizontal layout */
    <div className="relative mt-6 w-full overflow-hidden rounded-[28px] border border-slate-700/80 bg-gradient-to-br from-[#1D3363] via-[#16213F] to-[#111827] shadow-2xl">
      <div
        className="flex transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((product, i) => {
          const imageUrl = product.image
            ? product.image.startsWith("http")
              ? product.image
              : `${MEDIA_BASE}${product.image}`
            : deviceImage;

          return (
            <div
              key={product.id ?? i}
              className="relative w-full flex-shrink-0 cursor-pointer"
              onClick={() => product.id && navigate(`/product/${product.id}`)}
            >
              {/* Shortened height (140px mobile, 180px tablet, 200px desktop) */}
              <img
                src={imageUrl}
                alt={product.product_name || "Featured device"}
                className="h-[140px] w-full object-cover opacity-80 sm:h-[180px] lg:h-[200px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/10 to-transparent" />

              <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6">
                <h3 className="max-w-xl text-lg font-bold text-white sm:text-2xl">
                  {product.product_name}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-white/90 sm:text-sm">
                  Rs. {product.price_npr?.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-xs text-white backdrop-blur transition hover:bg-black/60 sm:left-5 sm:h-9 sm:w-9 sm:text-sm"
          >
            ❮
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-xs text-white backdrop-blur transition hover:bg-black/60 sm:right-5 sm:h-9 sm:w-9 sm:text-sm"
          >
            ❯
          </button>

          <div className="absolute bottom-3 right-6 flex gap-1.5 sm:bottom-4 sm:right-8">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default PromoBanner;