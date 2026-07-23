import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

function RecommendationCard({ product, onClick }) {
  const imageUrl = product.image
    ? (product.image.startsWith("http")
        ? product.image
        : `${MEDIA_BASE}${product.image}`)
    : null;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer overflow-hidden rounded-2xl border border-[#E6E1D5]/40 bg-[rgba(255,252,246,0.86)] transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="aspect-square w-full bg-[#f4eadc]">
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
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No image
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="line-clamp-1 text-sm font-semibold">
          {product.product_name}
        </p>

        <p className="mt-1 text-sm font-semibold text-[#4d3824]">
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

  const token = localStorage.getItem("access_token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/catalog/products/${id}/`, authHeader)
      .then((res) => setProduct(res.data))
      .catch(() => setError("Could not load this product."))
      .finally(() => setLoading(false));

    axios.get(`${API}/catalog/products/${id}/recommendations/`, authHeader)
      .then((res) => setRecommendations(res.data.recommendations || []))
      .catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6efe3] px-4 py-10 sm:px-8">
        <p className="text-sm text-slate-600">Loading…</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[#f6efe3] px-4 py-10 sm:px-8">
        <p className="text-sm font-medium text-red-600">{error || "Product not found."}</p>
      </main>
    );
  }

  const imageUrl = product.image
    ? (product.image.startsWith("http") ? product.image : `${MEDIA_BASE}${product.image}`)
    : null;

  const specs = [
    ["Model", product.model],
    ["Processor", product.processor],
    ["GPU", product.gpu],
    ["OS", product.os],
    ["RAM", product.ram_gb && `${product.ram_gb} GB`],
    ["Storage", product.storage_gb && `${product.storage_gb} GB`],
    ["Battery", product.battery_mah && `${product.battery_mah} mAh`],
    ["Display", product.display_size_inches && `${product.display_size_inches}" ${product.display_type || ""}`],
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
    <main className="relative min-h-screen overflow-hidden bg-[#f6efe3] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,176,126,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(141,109,72,0.12),transparent_34%)]" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-sm font-semibold text-[#6a5138] hover:underline"
        >
          ← Back
        </button>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* image */}
          <div className="aspect-square w-full overflow-hidden rounded-[24px] border border-[#E6E1D5]/40 bg-[#f4eadc]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.product_name}
                className="h-full w-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                No image
              </div>
            )}
          </div>

          {/* details */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9d7b55]">
              {product.sub_category} · {product.seller_name}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              {product.product_name}
            </h1>
            <p className="mt-3 text-2xl font-semibold text-[#4d3824]">
              Rs. {product.price_npr?.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {product.stock_quantity > 0 ? `In stock (${product.stock_quantity} available)` : "Out of stock"}
            </p>

            <p className="mt-6 text-sm leading-6 text-slate-700">
              {product.description}
            </p>

            {/* specs table */}
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3">
              {specs.map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#9d7b55]">{label}</p>
                  <p className="text-sm font-medium text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* similar products */}
        {recommendations.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-5 text-lg font-semibold text-[#6a5138]">Similar products</h2>
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