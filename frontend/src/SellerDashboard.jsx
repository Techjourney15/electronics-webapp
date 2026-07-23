import { useState, useEffect } from "react";
import axios from "axios"; // API call garna

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000"; // image ko full url banauna

function SellerDashboard() {
  // product list ra loading state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // dropdown ko lagi
  const [brands, setBrands] = useState([]); // dropdown ko lagi
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false); // add product form toggle
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null); // admin le approve gareko ki nai
  const [sellerInfo, setSellerInfo] = useState(null); // business name dekhaune

  // browse/claim existing product ko lagi state
  const [browseQuery, setBrowseQuery] = useState("");
  const [browseCategory, setBrowseCategory] = useState(""); // category filter
  const [browseResults, setBrowseResults] = useState([]);
  const [claimingId, setClaimingId] = useState(null); // kun product claim garira cha
  const [claimPrice, setClaimPrice] = useState("");
  const [claimStock, setClaimStock] = useState("");

  // naya product ko form data
  const [form, setForm] = useState({
    product_id: "", product_name: "", model: "", price_npr: "",
    ram_gb: "", storage_gb: "", processor: "", gpu: "", os: "",
    battery_mah: "", display_size_inches: "", display_type: "",
    display_resolution: "", refresh_rate_hz: "", rear_camera_mp: "",
    front_camera_mp: "", fast_charging_watts: "", weight_grams: "",
    color: "", warranty_years: "", rating: "0", num_ratings: "0",
    stock_quantity: "", seller_name: "", description: "",
    category: "", brand: "", sub_category: "",
  });

  const token = localStorage.getItem("access_token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } }; // auth header, sabai request ma chaincha

  // seller ko afnai product list backend bata lyaune
  const loadProducts = () => {
    setLoading(true);
    axios.get(`${API}/catalog/products/mine/`, authHeader)
      .then((res) => setProducts(res.data))
      .catch(() => setError("Could not load your products."))
      .finally(() => setLoading(false));
  };

  // page load huda ek pataka chalne — data fetch garne
  useEffect(() => {
    loadProducts();
    axios.get(`${API}/catalog/categories/`).then((res) => setCategories(res.data));
    axios.get(`${API}/catalog/brands/`).then((res) => setBrands(res.data));
    axios.get(`${API}/auth/whoami/`, authHeader)
      .then((res) => {
        setVerificationStatus(res.data.verification_status);
        setSellerInfo(res.data);
      })
      .catch(() => {});
  }, []);

  // form ko kunai euta field update garne generic function
  const updateField = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // "+ Add Product" form submit garda backend lai pathaune
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await axios.post(`${API}/catalog/products/create/`, form, authHeader);
      setShowForm(false);
      loadProducts(); // naya list refresh
    } catch (err) {
      console.log(err.response?.data); // debug ko lagi console ma herna
      const data = err.response?.data;
      const detail = data?.detail;

      // pending approval bhaye specific message
      if (detail && detail.includes('pending admin approval')) {
        setError("Your seller account is still pending admin approval. Please wait for approval before adding products.");
      } else if (data && typeof data === 'object') {
        // backend le dieko real validation error dekhaune
        const firstKey = Object.keys(data)[0];
        const firstMessage = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        setError(`${firstKey}: ${firstMessage}`);
      } else {
        setError("Failed to add product. Please check your input.");
      }
    } finally {
      setSaving(false);
    }
  };

  // existing (unclaimed) product search garne — naya banaunu nadinu, category ley pani filter huncha
  const searchUnclaimed = () => {
    axios
      .get(`${API}/catalog/products/unclaimed/?q=${browseQuery}&category=${browseCategory}`, authHeader)
      .then((res) => setBrowseResults(res.data))
      .catch(() => setError("Could not search products."));
  };

  // seller le existing product afno naam ma claim garne (price/stock update sanga)
  const handleClaim = async (productId) => {
    try {
      await axios.patch(
        `${API}/catalog/products/${productId}/claim/`,
        { price_npr: claimPrice, stock_quantity: claimStock },
        authHeader
      );
      setClaimingId(null);
      setClaimPrice("");
      setClaimStock("");
      setBrowseResults((prev) => prev.filter((p) => p.id !== productId)); // claim bhaisake pachi list bata hataune
      loadProducts(); // my products refresh
    } catch (err) {
      console.log(err.response?.data);
      setError("Failed to claim product.");
    }
  };

  // form ma text type ko field haru
  const textFields = [
    "product_id", "product_name", "model", "processor", "gpu", "os",
    "display_type", "display_resolution", "color", "seller_name",
    "description", "sub_category",
  ];
  // form ma number type ko field haru
  const numberFields = [
    "price_npr", "ram_gb", "storage_gb", "battery_mah", "display_size_inches",
    "refresh_rate_hz", "rear_camera_mp", "front_camera_mp", "fast_charging_watts",
    "weight_grams", "warranty_years", "rating", "num_ratings", "stock_quantity",
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6efe3] text-slate-900 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">

        {/* header + add product button */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">Seller Dashboard</h1>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-2xl border border-[#d9c6a7] bg-[linear-gradient(120deg,#d9c6a7_0%,#f2e4cc_55%,#b69468_100%)] px-5 py-2.5 text-sm font-semibold text-[#4d3824]"
          >
            {showForm ? "Cancel" : "+ Add Product"}
          </button>
        </div>

        {/* business name matra dekhaune, email haina */}
        {sellerInfo?.business_name && (
          <p className="mb-6 text-sm text-slate-600">{sellerInfo.business_name}</p>
        )}

        {/* verification status banner — admin le approve gareko dekhaune */}
        {verificationStatus === 'pending' && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            ⏳ Your seller account is pending admin approval. You'll be able to add or claim products once approved.
          </div>
        )}
        {verificationStatus === 'approved' && (
          <div className="mb-6 rounded-2xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            ✅ Your seller account is verified. You can now list products.
          </div>
        )}
        {verificationStatus === 'rejected' && (
          <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            ❌ Your seller application was rejected. Please contact support.
          </div>
        )}

        {error && <p className="mb-4 text-sm font-medium text-red-600">{error}</p>}

        {/* browse existing product section — claim garna, category filter sanga */}
        <div className="mb-10 rounded-[20px] border border-[#E6E1D5]/40 bg-[rgba(255,252,246,0.86)] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#6a5138]">List an Existing Product</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <select
              value={browseCategory}
              onChange={(e) => setBrowseCategory(e.target.value)}
              className="rounded-xl border border-[#dfd0b8]/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-[#9d7b55]"
            >
              <option value="">All Categories</option>
              <option value="Smartphone">Smartphone</option>
              <option value="Laptop">Laptop</option>
            </select>
            <input
              placeholder="Search (e.g. Vivo, laptop model name)"
              value={browseQuery}
              onChange={(e) => setBrowseQuery(e.target.value)}
              className="flex-1 rounded-xl border border-[#dfd0b8]/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-[#9d7b55]"
            />
            <button
              onClick={searchUnclaimed}
              className="rounded-xl border border-[#d9c6a7] bg-[#f2e4cc] px-4 py-2.5 text-sm font-semibold text-[#4d3824]"
            >
              Search
            </button>
          </div>

          <div className="space-y-3">
            {browseResults.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[#E6E1D5]/40 bg-white/50 p-3">
                {/* product image, thumbnail size */}
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[#f4eadc]">
                  {p.image ? (
                    <img
                      src={p.image.startsWith("http") ? p.image : `${MEDIA_BASE}${p.image}`}
                      alt={p.product_name}
                      className="h-full w-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : null}
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-sm">{p.product_name}</p>
                  <p className="text-xs text-slate-600">Default price: Rs. {p.price_npr}</p>

                  {/* claim form — price/stock halera confirm garne */}
                  {claimingId === p.id ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        type="number"
                        placeholder="Your price (Rs.)"
                        value={claimPrice}
                        onChange={(e) => setClaimPrice(e.target.value)}
                        className="w-32 rounded-lg border border-[#dfd0b8]/70 px-2 py-1.5 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Stock"
                        value={claimStock}
                        onChange={(e) => setClaimStock(e.target.value)}
                        className="w-24 rounded-lg border border-[#dfd0b8]/70 px-2 py-1.5 text-xs"
                      />
                      <button
                        onClick={() => handleClaim(p.id)}
                        className="rounded-lg bg-[#a17c56] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setClaimingId(p.id)}
                      className="mt-2 rounded-lg border border-[#d9c6a7] px-3 py-1.5 text-xs font-semibold text-[#4d3824]"
                    >
                      List this product
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* naya product banaune full form — toggle bhayera dekhincha */}
        {showForm && (
          <form
            onSubmit={handleAddProduct}
            className="mb-10 grid grid-cols-1 gap-3 rounded-[20px] border border-[#E6E1D5]/40 bg-[rgba(255,252,246,0.86)] p-6 sm:grid-cols-2"
          >
            {/* category dropdown — backend bata ID pathaune */}
            <select
              value={form.category}
              onChange={updateField("category")}
              className="rounded-xl border border-[#dfd0b8]/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-[#9d7b55]"
              required
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* brand dropdown — backend bata ID pathaune */}
            <select
              value={form.brand}
              onChange={updateField("brand")}
              className="rounded-xl border border-[#dfd0b8]/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-[#9d7b55]"
              required
            >
              <option value="">Select Brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* text fields loop garera banako */}
            {textFields.map((key) => (
              <input
                key={key}
                placeholder={key}
                value={form[key]}
                onChange={updateField(key)}
                className="rounded-xl border border-[#dfd0b8]/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-[#9d7b55]"
              />
            ))}

            {/* number fields loop garera banako */}
            {numberFields.map((key) => (
              <input
                key={key}
                type="number"
                placeholder={key}
                value={form[key]}
                onChange={updateField(key)}
                className="rounded-xl border border-[#dfd0b8]/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-[#9d7b55]"
              />
            ))}

            <button
              type="submit"
              disabled={saving}
              className="sm:col-span-2 mt-2 rounded-2xl border border-[#d9c6a7] bg-[linear-gradient(120deg,#d9c6a7_0%,#f2e4cc_55%,#b69468_100%)] px-4 py-3 text-sm font-semibold text-[#4d3824] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Product"}
            </button>
          </form>
        )}

        {/* seller ko afnai product list dekhaune section — image sanga */}
        <h2 className="mb-4 text-lg font-semibold text-[#6a5138]">My Products</h2>
        {loading ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-600">You haven't listed any products yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl border border-[#E6E1D5]/40 bg-[rgba(255,252,246,0.86)]"
              >
                {/* product ko image */}
                <div className="aspect-square w-full bg-[#f4eadc]">
                  {p.image ? (
                    <img
                      src={p.image.startsWith("http") ? p.image : `${MEDIA_BASE}${p.image}`}
                      alt={p.product_name}
                      className="h-full w-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold">{p.product_name}</p>
                  <p className="text-sm text-slate-600">Rs. {p.price_npr}</p>
                  <p className="text-xs text-slate-500">Stock: {p.stock_quantity}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default SellerDashboard;