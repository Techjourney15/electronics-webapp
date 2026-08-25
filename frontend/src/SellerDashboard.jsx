import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

function SellerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ first_name: "", email: "", business_name: "", contact_info: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [browseQuery, setBrowseQuery] = useState("");
  const [browseCategory, setBrowseCategory] = useState("");
  const [browseResults, setBrowseResults] = useState([]);
  const [claimingId, setClaimingId] = useState(null);
  const [claimPrice, setClaimPrice] = useState("");
  const [claimStock, setClaimStock] = useState("");

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
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/");
  };

  const loadProducts = () => {
    setLoading(true);
    axios.get(`${API}/catalog/products/mine/`, authHeader)
      .then((res) => setProducts(res.data))
      .catch(() => setError("Could not load your products."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
    axios.get(`${API}/catalog/categories/`).then((res) => setCategories(res.data));
    axios.get(`${API}/catalog/brands/`).then((res) => setBrands(res.data));
    axios.get(`${API}/auth/my-profile/`, authHeader)
      .then((res) => {
        setVerificationStatus(res.data.seller_profile?.verification_status);
        setSellerInfo(res.data);
        setProfileForm({
          first_name: res.data.first_name || "",
          email: res.data.email || "",
          business_name: res.data.seller_profile?.business_name || "",
          contact_info: res.data.seller_profile?.contact_info || "",
        });
      })
      .catch(() => {});
  }, []);

  const handleSaveProfile = () => {
    setSavingProfile(true);
    setProfileError("");
    Promise.all([
      axios.patch(`${API}/auth/update-profile/`, { first_name: profileForm.first_name, email: profileForm.email }, authHeader),
      axios.patch(`${API}/auth/update-seller-profile/`, { business_name: profileForm.business_name, contact_info: profileForm.contact_info }, authHeader),
    ])
      .then(([, res2]) => {
        setSellerInfo(res2.data);
        setIsEditingProfile(false);
      })
      .catch(() => setProfileError("Could not save changes."))
      .finally(() => setSavingProfile(false));
  };

  const updateField = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await axios.post(`${API}/catalog/products/create/`, form, authHeader);
      setActiveTab("products");
      loadProducts();
    } catch (err) {
      console.log(err.response?.data);
      const data = err.response?.data;
      const detail = data?.detail;

      if (detail && detail.includes('pending admin approval')) {
        setError("Your seller account is still pending admin approval. Please wait for approval before adding products.");
      } else if (data && typeof data === 'object') {
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

  const searchUnclaimed = () => {
    const params = new URLSearchParams();
    if (browseQuery.trim()) params.set("q", browseQuery.trim());
    if (browseCategory) params.set("category", browseCategory);

    axios
      .get(`${API}/catalog/products/unclaimed/?${params.toString()}`, authHeader)
      .then((res) => {
        setBrowseResults(res.data);
      })
      .catch(() => setError("Could not search products."));
  };

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
      setBrowseResults((prev) => prev.filter((p) => p.id !== productId));
      loadProducts();
    } catch (err) {
      console.log(err.response?.data);
      setError("Failed to claim product.");
    }
  };

  const textFields = [
    "product_id", "product_name", "model", "processor", "gpu", "os",
    "display_type", "display_resolution", "color", "seller_name",
    "description", "sub_category",
  ];
  const numberFields = [
    "price_npr", "ram_gb", "storage_gb", "battery_mah", "display_size_inches",
    "refresh_rate_hz", "rear_camera_mp", "front_camera_mp", "fast_charging_watts",
    "weight_grams", "warranty_years", "rating", "num_ratings", "stock_quantity",
  ];

  const tabs = [
    { id: "products", label: "My Products" },
    { id: "add", label: "Add Product" },
    { id: "browse", label: "Browse & Claim" },
  ];

  return (
    <main className="relative min-h-screen bg-[#0A0D18] text-slate-100 px-4 py-10 sm:px-8 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.12),rgba(255,255,255,0))]">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#2563EB] via-[#F59E0B] to-[#FF5500] bg-clip-text text-transparent">
            GadgetHub Seller Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="rounded-full border border-slate-700/80 bg-[#111827]/60 px-5 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Log out
          </button>
        </div>

        {/* Business Profile Card */}
        {sellerInfo && (
          <div className="mb-6 rounded-2xl border border-slate-700/60 bg-[#111827]/85 p-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-slate-200">Business Profile</h2>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="rounded-full border border-slate-700 bg-[#1A1D2E] px-3 py-1 text-xs font-medium text-blue-400 hover:border-blue-500 hover:text-blue-300 transition"
                >
                  Edit profile
                </button>
              )}
            </div>

            {!isEditingProfile ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Business Name</p>
                  <p className="text-sm font-medium text-slate-100">{sellerInfo.seller_profile?.business_name || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Contact Info</p>
                  <p className="text-sm font-medium text-slate-100">{sellerInfo.seller_profile?.contact_info || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Owner Name</p>
                  <p className="text-sm font-medium text-slate-100">{sellerInfo.first_name || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Email</p>
                  <p className="text-sm font-medium text-slate-100">{sellerInfo.email || "—"}</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    placeholder="Business name"
                    value={profileForm.business_name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, business_name: e.target.value }))}
                    className="rounded-xl border border-slate-700 bg-[#1A1D2E] px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 placeholder-slate-500"
                  />
                  <input
                    placeholder="Contact info"
                    value={profileForm.contact_info}
                    onChange={(e) => setProfileForm((f) => ({ ...f, contact_info: e.target.value }))}
                    className="rounded-xl border border-slate-700 bg-[#1A1D2E] px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 placeholder-slate-500"
                  />
                  <input
                    placeholder="Owner name"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="rounded-xl border border-slate-700 bg-[#1A1D2E] px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 placeholder-slate-500"
                  />
                  <input
                    placeholder="Email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                    className="rounded-xl border border-slate-700 bg-[#1A1D2E] px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 placeholder-slate-500"
                  />
                </div>

                {profileError && <p className="text-sm font-medium text-red-400">{profileError}</p>}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition"
                  >
                    {savingProfile ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verification status banners */}
        {verificationStatus === 'pending' && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-300 backdrop-blur-md">
            ⏳ Your seller account is pending admin approval. You'll be able to add or claim products once approved.
          </div>
        )}
        {verificationStatus === 'approved' && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400 backdrop-blur-md">
             Your seller account is verified. You can now list products.
          </div>
        )}
        {verificationStatus === 'rejected' && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 backdrop-blur-md">
            ❌ Your seller application was rejected. Please contact support.
          </div>
        )}

        {error && <p className="mb-4 text-sm font-medium text-red-400">{error}</p>}

        {/* Tabs */}
        <div className="inline-flex rounded-full border border-slate-700/60 bg-[#111827] p-1.5 shadow-inner">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6">

          {/* ---- My Products Tab ---- */}
          {activeTab === "products" && (
            <div>
              {loading ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : products.length === 0 ? (
                <div className="rounded-2xl border border-slate-700/60 bg-[#111827]/70 p-12 text-center backdrop-blur-md">
                  <p className="text-sm text-slate-400">You haven't listed any products yet.</p>
                  <div className="mt-5 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveTab("add")}
                      className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/25 transition"
                    >
                      + Add Product
                    </button>
                    <button
                      onClick={() => setActiveTab("browse")}
                      className="rounded-full border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
                    >
                      Browse & Claim
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/product/${p.id}`)}
                      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-700/60 bg-[#111827] transition-all hover:-translate-y-1 hover:border-slate-600 hover:shadow-xl hover:shadow-blue-950/30"
                    >
                      <div className="aspect-square w-full bg-[#1A1D2E] p-4 flex items-center justify-center overflow-hidden">
                        {p.image ? (
                          <img
                            src={p.image.startsWith("http") ? p.image : `${MEDIA_BASE}${p.image}`}
                            alt={p.product_name}
                            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-4 border-t border-slate-700/50">
                        <p className="font-semibold text-slate-100 truncate">{p.product_name}</p>
                        <p className="text-xs text-blue-400 mt-0.5">Product ID: {p.id}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-sm font-bold text-white">Rs. {p.price_npr}</p>
                          <p className="text-xs font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">Stock: {p.stock_quantity}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- Add Product Tab ---- */}
          {activeTab === "add" && (
            <form
              onSubmit={handleAddProduct}
              className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-700/60 bg-[#111827]/90 p-6 sm:grid-cols-2 backdrop-blur-md shadow-2xl"
            >
              <select
                value={form.category}
                onChange={updateField("category")}
                className="rounded-xl border border-slate-700 bg-[#1A1D2E] px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                required
              >
                <option value="" className="bg-[#111827] text-slate-400">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#111827] text-slate-100">{c.name}</option>
                ))}
              </select>

              <select
                value={form.brand}
                onChange={updateField("brand")}
                className="rounded-xl border border-slate-700 bg-[#1A1D2E] px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                required
              >
                <option value="" className="bg-[#111827] text-slate-400">Select Brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#111827] text-slate-100">{b.name}</option>
                ))}
              </select>

              {textFields.map((key) => (
                <input
                  key={key}
                  placeholder={key.replace(/_/g, " ")}
                  value={form[key]}
                  onChange={updateField(key)}
                  className="rounded-xl border border-slate-700 bg-[#1A1D2E] px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 placeholder-slate-500 capitalize"
                />
              ))}

              {numberFields.map((key) => (
                <input
                  key={key}
                  type="number"
                  placeholder={key.replace(/_/g, " ")}
                  value={form[key]}
                  onChange={updateField(key)}
                  className="rounded-xl border border-slate-700 bg-[#1A1D2E] px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 placeholder-slate-500 capitalize"
                />
              ))}

              <button
                type="submit"
                disabled={saving}
                className="sm:col-span-2 mt-3 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 disabled:opacity-60 transition"
              >
                {saving ? "Saving…" : "Save Product"}
              </button>
            </form>
          )}

          {/* ---- Browse & Claim Tab ---- */}
          {activeTab === "browse" && (
            <div className="rounded-2xl border border-slate-700/60 bg-[#111827]/90 p-6 backdrop-blur-md shadow-2xl">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">List an Existing Product</h2>
              <div className="mb-6 flex flex-wrap gap-3">
                <select
                  value={browseCategory}
                  onChange={(e) => setBrowseCategory(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-[#1A1D2E] px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                >
                  <option value="" className="bg-[#111827]">All Categories</option>
                  <option value="Smartphone" className="bg-[#111827]">Smartphone</option>
                  <option value="Laptop" className="bg-[#111827]">Laptop</option>
                </select>
                <input
                  placeholder="Search (e.g. Vivo, laptop model name)"
                  value={browseQuery}
                  onChange={(e) => setBrowseQuery(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-700 bg-[#1A1D2E] px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500 placeholder-slate-500"
                />
                <button
                  onClick={searchUnclaimed}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
                >
                  Search
                </button>
              </div>

              <div className="space-y-3">
                {browseResults.map((p) => (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-xl border border-slate-700/60 bg-[#1A1D2E]/80 hover:border-slate-600 transition"
                  >
                    <div
                      onClick={() => navigate(`/product/${p.id}`)}
                      className="flex cursor-pointer items-center gap-4 p-3.5"
                    >
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-900 p-1 flex items-center justify-center">
                        {p.image ? (
                          <img
                            src={p.image.startsWith("http") ? p.image : `${MEDIA_BASE}${p.image}`}
                            alt={p.product_name}
                            className="h-full w-full object-contain"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-slate-100">{p.product_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Default price: Rs. {p.price_npr}</p>
                      </div>
                    </div>

                    <div className="px-3.5 pb-3.5 border-t border-slate-700/40">
                      {claimingId === p.id ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            placeholder="Your price (Rs.)"
                            value={claimPrice}
                            onChange={(e) => setClaimPrice(e.target.value)}
                            className="w-36 rounded-lg border border-slate-700 bg-[#111827] px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-blue-500 placeholder-slate-500"
                          />
                          <input
                            type="number"
                            placeholder="Stock"
                            value={claimStock}
                            onChange={(e) => setClaimStock(e.target.value)}
                            className="w-28 rounded-lg border border-slate-700 bg-[#111827] px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-blue-500 placeholder-slate-500"
                          />
                          <button
                            onClick={() => handleClaim(p.id)}
                            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition"
                          >
                            Confirm
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setClaimingId(p.id)}
                          className="mt-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-blue-400 hover:border-blue-500 hover:text-blue-300 transition"
                        >
                          List this product
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default SellerDashboard;