import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

function RecommendationCard({ product, onClick }) {
  const imageUrl = product.image
    ? product.image.startsWith("http")
      ? product.image
      : `${MEDIA_BASE}${product.image}`
    : null;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer overflow-hidden rounded-2xl border border-slate-700/60 bg-[#111827]/85 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.2)]"
    >
      <div className="aspect-square w-full bg-[#1A1D2E]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.product_name}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
            No image
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="line-clamp-1 text-sm font-semibold text-white">
          {product.product_name}
        </p>

        <p className="mt-1 text-sm font-semibold text-amber-400">
          Rs. {product.price_npr}
        </p>
      </div>
    </div>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  const token = localStorage.getItem("access_token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const handleAddToCart = async () => {
    setIsAdding(true);
    setCartMessage("");
    try {
      await axios.post(
        `${API}/catalog/cart/add/`,
        { product_id: Number(id), quantity: 1 },
        authHeader
      );
      setCartMessage("Added to cart!");
    } catch (err) {
      setCartMessage(err.response?.data?.error || "Could not add to cart.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    setIsBuyingNow(true);
    setCartMessage("");
    try {
      await axios.post(
        `${API}/catalog/cart/add/`,
        { product_id: Number(id), quantity: 1 },
        authHeader
      );
      const res = await axios.post(
        `${API}/catalog/khalti/initiate/`,
        {
          return_url: `${window.location.origin}/payment-callback`,
          website_url: window.location.origin,
        },
        authHeader
      );
      window.location.href = res.data.payment_url;
    } catch (err) {
      setCartMessage(err.response?.data?.error || "Could not proceed to payment.");
      setIsBuyingNow(false);
    }
  };

  useEffect(() => {
    setLoading(true);

    axios
      .get(`${API}/catalog/products/${id}/`, authHeader)
      .then((res) => setProduct(res.data))
      .catch(() => setError("Could not load this product."))
      .finally(() => setLoading(false));

    axios
      .get(`${API}/catalog/products/${id}/recommendations/`, authHeader)
      .then((res) => setRecommendations(res.data.recommendations || []))
      .catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0D18] px-4 py-10 text-slate-400 sm:px-8">
        <p className="text-sm">Loading…</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[#0A0D18] px-4 py-10 sm:px-8">
        <p className="text-sm font-medium text-red-400">
          {error || "Product not found."}
        </p>
      </main>
    );
  }

  const imageUrl = product.image
    ? product.image.startsWith("http")
      ? product.image
      : `${MEDIA_BASE}${product.image}`
    : null;

  const specs = [
    ["Model", product.model],
    ["Processor", product.processor],
    ["GPU", product.gpu],
    ["OS", product.os],
    ["RAM", product.ram_gb && `${product.ram_gb} GB`],
    ["Storage", product.storage_gb && `${product.storage_gb} GB`],
    ["Battery", product.battery_mah && `${product.battery_mah} mAh`],
    [
      "Display",
      product.display_size_inches &&
        `${product.display_size_inches}" ${product.display_type || ""}`,
    ],
    ["Resolution", product.display_resolution],
    ["Refresh Rate", product.refresh_rate_hz && `${product.refresh_rate_hz} Hz`],
    ["Rear Camera", product.rear_camera_mp && `${product.rear_camera_mp} MP`],
    ["Front Camera", product.front_camera_mp && `${product.front_camera_mp} MP`],
    ["Fast Charging", product.fast_charging_watts && `${product.fast_charging_watts} W`],
    ["Weight", product.weight_grams && `${product.weight_grams} g`],
    ["Color", product.color],
    ["Warranty", product.warranty_years && `${product.warranty_years} year(s)`],
  ].filter(([, value]) => value);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0D18] text-white">
      {/* Dark Grid Background Pattern */}
      <div
        className="
        absolute
        inset-0
        opacity-15
        [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]
        [background-size:60px_60px]
        "
      />

      {/* Top Right Blue Ambient Glow */}
      <div
        className="
        absolute
        top-[-100px]
        right-[-100px]
        h-[650px]
        w-[650px]
        rounded-full
        bg-blue-600/25
        blur-[170px]
        pointer-events-none
        "
      />

      {/* Bottom Left Amber/Gold Ambient Glow */}
      <div
        className="
        absolute
        bottom-[-80px]
        left-[-120px]
        h-[500px]
        w-[500px]
        rounded-full
        bg-amber-600/20
        blur-[160px]
        pointer-events-none
        "
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-400 transition hover:text-blue-300"
        >
          ← Back
        </button>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Product Image Card */}
          <div className="aspect-square w-full overflow-hidden rounded-[24px] border border-slate-700/60 bg-[#111827]/85 backdrop-blur-2xl shadow-[0_0_50px_rgba(30,58,138,0.2)]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.product_name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                No image
              </div>
            )}
          </div>

          {/* Product Details Section */}
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              {product.sub_category} · {product.seller_name}
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {product.product_name}
            </h1>

            <p className="mt-3 text-2xl font-bold text-amber-400">
              Rs. {product.price_npr?.toLocaleString()}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {product.stock_quantity > 0 ? (
                <span className="text-emerald-400 font-medium">
                  In stock ({product.stock_quantity} available)
                </span>
              ) : (
                <span className="text-red-400 font-medium">Out of stock</span>
              )}
            </p>

            <p className="mt-6 text-sm leading-6 text-slate-300">
              {product.description}
            </p>

            {/* Specifications Grid */}
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-slate-700/50 bg-[#1A1D2E]/50 p-5 backdrop-blur-lg">
              {specs.map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400">
                    {label}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-200">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            {product.stock_quantity > 0 && (
              <div className="mt-8 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row">
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding || isBuyingNow}
                  className="rounded-full border border-blue-500 bg-blue-600/10 px-6 py-3 text-sm font-semibold text-blue-400 transition hover:bg-blue-600 hover:text-white disabled:opacity-60"
                >
                  {isAdding ? "Adding…" : "🛒 Add to Cart"}
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isAdding || isBuyingNow}
                  className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] disabled:opacity-60"
                >
                  {isBuyingNow ? "Processing…" : "💳 Proceed to Payment"}
                </button>
              </div>
            )}

            {cartMessage && (
              <p className="mt-3 text-sm font-medium text-blue-400">
                {cartMessage}
              </p>
            )}
          </div>
        </div>

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="mt-16 border-t border-slate-800 pt-10">
            <h2 className="mb-6 text-lg font-bold tracking-wide text-white">
              Similar products
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {recommendations.map((r) => (
                <RecommendationCard
                  key={r.id}
                  product={r}
                  onClick={() => navigate(`/product/${r.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default ProductDetail;