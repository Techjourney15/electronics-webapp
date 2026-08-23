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

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
        {product.sub_category}
        {product.seller && (
          <>
            {" · "}
            <span
              onClick={() => navigate(`/seller/${product.seller}`)}
              className="cursor-pointer underline decoration-blue-400/40 underline-offset-2 hover:text-blue-300"
            >
              {product.seller_name}
            </span>
          </>
        )}
      </p>

        <p className="mt-1 text-sm font-semibold text-amber-400">
          Rs. {product.price_npr}
        </p>
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
  const [userRole, setUserRole] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
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
      setCartMessage("Added to cart successfully.");
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

  const toggleFavorite = async () => {
    try {
      const res = await axios.post(
        `${API}/catalog/products/${id}/toggle-favorite/`,
        {},
        authHeader
      );
      setIsFavorited(res.data.favorited);
    } catch (err) {
      console.error("toggle favorite failed:", err.response?.status, err.response?.data);
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

    axios
      .get(`${API}/auth/my-profile/`, authHeader)
      .then((res) => setUserRole(res.data.role))
      .catch(() => {});

    axios
      .get(`${API}/catalog/favorites/`, authHeader)
      .then((res) => setIsFavorited(res.data.some((p) => p.id === Number(id))))
      .catch(() => {});

    axios
      .post(`${API}/catalog/products/log-view/`, { product_id: Number(id) }, authHeader)
      .then((res) => console.log("log-view success:", res.data))
      .catch((err) => console.error("log-view failed:", err.response?.status, err.response?.data));
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
  ].filter(([, value]) => {
    if (value === null || value === undefined || value === false || value === 0) return false;
    const text = String(value).trim().toLowerCase();
    const placeholders = ["", "nan", "none", "null", "n/a", "na", "-", "undefined"];
    if (placeholders.includes(text)) return false;
    // Catches "0", "0 GB", "0.00 MP", etc. — a leading numeric value of
    // zero means the field isn't applicable to this product, not a
    // real spec worth showing.
    const leadingNumber = text.match(/^-?\d+(\.\d+)?/);
    if (leadingNumber && parseFloat(leadingNumber[0]) === 0) return false;
    return true;
  });

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
          onClick={() => navigate(userRole === "seller" ? "/seller-dashboard" : "/homepage")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-400 transition hover:text-blue-300"
        >
          ← Home
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
              {product.sub_category} 
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
              <div className="mt-8 flex items-center gap-3 border-t border-slate-800 pt-6">
                <button
                  onClick={toggleFavorite}
                  aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                  className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border transition ${
                    isFavorited
                      ? "border-red-500 bg-red-500/10 text-red-400"
                      : "border-slate-700 bg-[#1A1D2E] text-slate-300 hover:border-red-500 hover:text-red-400"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={isFavorited ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                    />
                  </svg>
                </button>

                <button
                  onClick={handleAddToCart}
                  disabled={isAdding || isBuyingNow}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-700 bg-[#1A1D2E] px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-500 hover:text-blue-400 disabled:opacity-60 sm:flex-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-[18px] w-[18px]"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 3h1.386c.51 0 .955.343 1.087.836l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.98-4.716 2.545-7.221a.75.75 0 00-.729-.914H5.106M7.5 14.25L5.106 5.25M7.5 14.25l-1.719 4.32a.75.75 0 00.694 1.03h9.5"
                    />
                    <circle cx="9" cy="20.25" r="1" fill="currentColor" stroke="none" />
                    <circle cx="17.25" cy="20.25" r="1" fill="currentColor" stroke="none" />
                  </svg>
                  {isAdding ? "Adding…" : "Add to Cart"}
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isAdding || isBuyingNow}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] disabled:opacity-60 sm:flex-none"
                >
                  {isBuyingNow ? "Processing…" : "Buy Now"}
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