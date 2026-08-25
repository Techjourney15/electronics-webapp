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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
          {product.sub_category}
        </p>

        <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">
          {product.product_name}
        </p>

        <p className="mt-1 text-sm font-semibold text-amber-400">
          Rs. {product.price_npr?.toLocaleString()}
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
  const [userRole, setUserRole] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);

  const token = localStorage.getItem("access_token");
  const authHeader = {
    headers: { Authorization: `Bearer ${token}` },
  };

  // ================= ADD TO CART =================
  const handleAddToCart = async () => {
    setIsAdding(true);
    setCartMessage("");

    try {
      await axios.post(
        `${API}/catalog/cart/add/`,
        { product_id: Number(id), quantity: 1 },
        authHeader
      );

      setCartMessage(" Added to cart successfully.");
    } catch (err) {
      setCartMessage(
        err.response?.data?.error || "Could not add to cart."
      );
    } finally {
      setIsAdding(false);
    }
  };

  // ================= BUY NOW =================
  const handleBuyNow = async () => {
    try {
      setIsBuyingNow(true);

      const token = localStorage.getItem("access_token");

      const response = await axios.post(
        "http://127.0.0.1:8000/api/payment/khalti/initiate/",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      window.location.href = response.data.payment_url;
    } catch (error) {
      console.error("Khalti payment error:", error);
      alert("Unable to initiate payment.");
      setIsBuyingNow(false);
    }
  };

  // ================= FAVORITE =================
  const toggleFavorite = async () => {
    try {
      const res = await axios.post(
        `${API}/catalog/products/${id}/toggle-favorite/`,
        {},
        authHeader
      );

      setIsFavorited(res.data.favorited);
    } catch (err) {
      console.error(
        "Toggle favorite failed:",
        err.response?.status,
        err.response?.data
      );
    }
  };

  // ================= LOAD DATA =================
  useEffect(() => {
    setLoading(true);

    // Product details
    axios
      .get(`${API}/catalog/products/${id}/`, authHeader)
      .then((res) => setProduct(res.data))
      .catch(() => setError("Could not load this product."))
      .finally(() => setLoading(false));

    // Recommendations
    axios
      .get(
        `${API}/catalog/products/${id}/recommendations/`,
        authHeader
      )
      .then((res) =>
        setRecommendations(res.data.recommendations || [])
      )
      .catch(() => {});

    // User role
    axios
      .get(`${API}/auth/my-profile/`, authHeader)
      .then((res) => setUserRole(res.data.role))
      .catch(() => {});

    // Check favorite status
    axios
      .get(`${API}/catalog/favorites/`, authHeader)
      .then((res) => {
        setIsFavorited(
          res.data.some((p) => p.id === Number(id))
        );
      })
      .catch(() => {});

    // Log product view
    axios
      .post(
        `${API}/catalog/products/log-view/`,
        { product_id: Number(id) },
        authHeader
      )
      .then((res) =>
        console.log("log-view success:", res.data)
      )
      .catch((err) =>
        console.error(
          "log-view failed:",
          err.response?.status,
          err.response?.data
        )
      );
  }, [id]);

  // ================= LOADING =================
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0D18] px-4 py-10 text-slate-400 sm:px-8">
        <p className="text-sm">Loading…</p>
      </main>
    );
  }

  // ================= ERROR =================
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

  // ================= PRODUCT SPECS =================
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
    [
      "Refresh Rate",
      product.refresh_rate_hz &&
        `${product.refresh_rate_hz} Hz`,
    ],
    [
      "Rear Camera",
      product.rear_camera_mp &&
        `${product.rear_camera_mp} MP`,
    ],
    [
      "Front Camera",
      product.front_camera_mp &&
        `${product.front_camera_mp} MP`,
    ],
    [
      "Fast Charging",
      product.fast_charging_watts &&
        `${product.fast_charging_watts} W`,
    ],
    [
      "Weight",
      product.weight_grams &&
        `${product.weight_grams} g`,
    ],
    ["Color", product.color],
    [
      "Warranty",
      product.warranty_years &&
        `${product.warranty_years} year(s)`,
    ],
  ].filter(([, value]) => value);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0D18] text-white">

      {/* Dark Grid Background */}
      <div
        className="
          absolute inset-0 opacity-15
          [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]
          [background-size:60px_60px]
        "
      />

      {/* Top Right Glow */}
      <div
        className="
          pointer-events-none absolute top-[-100px] right-[-100px]
          h-[650px] w-[650px] rounded-full
          bg-blue-600/25 blur-[170px]
        "
      />

      {/* Bottom Left Glow */}
      <div
        className="
          pointer-events-none absolute bottom-[-80px] left-[-120px]
          h-[500px] w-[500px] rounded-full
          bg-amber-600/20 blur-[160px]
        "
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8">

        {/* Back Button */}
        <button
          onClick={() =>
            navigate(
              userRole === "seller"
                ? "/seller-dashboard"
                : "/homepage"
            )
          }
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-400 transition hover:text-blue-300"
        >
          ← Home
        </button>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">

          {/* Product Image */}
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

          {/* Product Details */}
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

            {/* Stock Status */}
            <p className="mt-1 text-sm text-slate-400">
              {product.stock_quantity > 0 ? (
                <span className="font-medium text-emerald-400">
                  In stock ({product.stock_quantity} available)
                </span>
              ) : (
                <span className="font-medium text-red-400">
                  Out of stock
                </span>
              )}
            </p>

            {/* Description */}
            <p className="mt-6 text-sm leading-6 text-slate-300">
              {product.description}
            </p>

            {/* Specifications Grid */}
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-slate-700/50 bg-[#1A1D2E]/50 p-5 backdrop-blur-lg">

              {/* Seller Information - Kept exactly as your design */}
              {product.seller && (
                <div
                  onClick={() =>
                    navigate(`/seller/${product.seller}`)
                  }
                  className="cursor-pointer"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400">
                    Sold by
                  </p>

                  <p className="mt-0.5 text-sm font-medium text-slate-200 hover:text-blue-300 hover:underline">
                    {product.seller_name}
                  </p>
                </div>
              )}

              {/* Specifications */}
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

            {/* ================= ACTION BUTTONS ================= */}
            {product.stock_quantity > 0 && (
              <div className="mt-8 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row">

                {/* ❤️ FAVORITE BUTTON */}
                <button
                  onClick={toggleFavorite}
                  aria-label={
                    isFavorited
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
                  className={`flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border transition ${
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

                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding || isBuyingNow}
                  className="rounded-full border border-blue-500 bg-blue-600/10 px-6 py-3 text-sm font-semibold text-blue-400 transition hover:bg-blue-600 hover:text-white disabled:opacity-60"
                >
                  {isAdding ? "Adding…" : "🛒 Add to Cart"}
                </button>

                {/* Buy Now */}
                <button
                  onClick={() => navigate("/checkout")}
                  disabled={isAdding || isBuyingNow}
                  className="rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBuyingNow ? "Processing..." : "Buy Now"}
                </button>
              </div>
            )}

            {/* Cart / Action Message */}
            {cartMessage && (
              <p className="mt-3 text-sm font-medium text-blue-400">
                {cartMessage}
              </p>
            )}
          </div>
        </div>

        {/* Recommendations */}
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