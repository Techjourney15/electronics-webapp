import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // API call garna

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000"; // image ko full url banauna

function SellerDashboard() {
  // product list ra loading state
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // dropdown ko lagi
  const [brands, setBrands] = useState([]); // dropdown ko lagi
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false); // add product form toggle
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null); // admin le approve gareko ki nai
  const [sellerInfo, setSellerInfo] = useState(null); // business name dekhaune
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ first_name: "", email: "", business_name: "", contact_info: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

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
    <main className="relative min-h-screen overflow-hidden bg-[#eef3fb] text-slate-900 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">

        {/* header + add product button */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">Seller Dashboard</h1>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-2xl border border-[#93b4e0] bg-[linear-gradient(120deg,#93b4e0_0%,#c3d7f0_55%,#2f5fa8_100%)] px-5 py-2.5 text-sm font-semibold text-[#1a3a66]"
          >
            {showForm ? "Cancel" : "+ Add Product"}
          </button>
        </div>

        {/* business name matra dekhaune, email haina */}
{/* seller profile card */}
        {sellerInfo && (
          <div className="mb-6 rounded-2xl border border-[#c3d7f0]/70 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Business Profile</h2>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="rounded-full border border-[#c3d7f0] px-3 py-1 text-xs font-semibold text-[#2f5fa8] hover:bg-[#e3edfa]"
                >
                  Edit profile
                </button>
              )}
            </div>

            {!isEditingProfile ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Business Name</p>
                  <p className="text-sm font-medium text-slate-900">{sellerInfo.seller_profile?.business_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Contact Info</p>
                  <p className="text-sm font-medium text-slate-900">{sellerInfo.seller_profile?.contact_info || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Owner Name</p>
                  <p className="text-sm font-medium text-slate-900">{sellerInfo.first_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
                  <p className="text-sm font-medium text-slate-900">{sellerInfo.email || "—"}</p>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    placeholder="Business name"
                    value={profileForm.business_name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, business_name: e.target.value }))}
                    className="rounded-lg border border-[#c3d7f0] px-3 py-2 text-sm outline-none focus:border-[#2f5fa8]"
                  />
                  <input
                    placeholder="Contact info"
                    value={profileForm.contact_info}
                    onChange={(e) => setProfileForm((f) => ({ ...f, contact_info: e.target.value }))}
                    className="rounded-lg border border-[#c3d7f0] px-3 py-2 text-sm outline-none focus:border-[#2f5fa8]"
                  />
                  <input
                    placeholder="Owner name"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="rounded-lg border border-[#c3d7f0] px-3 py-2 text-sm outline-none focus:border-[#2f5fa8]"
                  />
                  <input
                    placeholder="Email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                    className="rounded-lg border border-[#c3d7f0] px-3 py-2 text-sm outline-none focus:border-[#2f5fa8]"
                  />
                </div>

                {profileError && <p className="text-sm font-medium text-red-600">{profileError}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="rounded-full bg-[#2f5fa8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a3a66] disabled:opacity-60"
                  >
                    {savingProfile ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="rounded-full border border-[#c3d7f0] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-[#e3edfa]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
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
        <div className="mb-10 rounded-[20px] border border-[#d3e0f5]/40 bg-[rgba(238,243,251,0.86)] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#2f5fa8]">List an Existing Product</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <select
              value={browseCategory}
              onChange={(e) => setBrowseCategory(e.target.value)}
              className="rounded-xl border border-[#c3d7f0]/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-[#2f5fa8]"
            >
              <option value="">All Categories</option>
              <option value="Smartphone">Smartphone</option>
              <option value="Laptop">Laptop</option>
            </select>
            <input
              placeholder="Search (e.g. Vivo, laptop model name)"
              value={browseQuery}
              onChange={(e) => setBrowseQuery(e.target.value)}
              className="flex-1 rounded-xl border border-[#c3d7f0]/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-[#2f5fa8]"
            />
            <button
              onClick={searchUnclaimed}
              className="rounded-xl border border-[#93b4e0] bg-[#c3d7f0] px-4 py-2.5 text-sm font-semibold text-[#1a3a66]"
            >
              Search
            </button>
          </div>

          <div className="space-y-3">
            {browseResults.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl border border-[#d3e0f5]/40 bg-[rgba(238,243,251,0.86)]"
              >

                {/* Click ONLY this upper section to open product details */}
                <div
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="flex cursor-pointer items-center gap-3 p-3 hover:bg-[#eef3fb]"
                >
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[#e3edfa]">
                    {p.image ? (
                      <img
                        src={p.image.startsWith("http") ? p.image : `${MEDIA_BASE}${p.image}`}
                        alt={p.product_name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-sm">{p.product_name}</p>
                    <p className="text-xs text-slate-600">
                      Default price: Rs. {p.price_npr}
                    </p>
                  </div>
                </div>

                {/* Claim section */}
                <div className="px-3 pb-3">
                  {claimingId === p.id ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        type="number"
                        placeholder="Your price (Rs.)"
                        value={claimPrice}
                        onChange={(e) => setClaimPrice(e.target.value)}
                        className="w-32 rounded-lg border border-[#c3d7f0]/70 px-2 py-1.5 text-xs"
                      />

                      <input
                        type="number"
                        placeholder="Stock"
                        value={claimStock}
                        onChange={(e) => setClaimStock(e.target.value)}
                        className="w-24 rounded-lg border border-[#c3d7f0]/70 px-2 py-1.5 text-xs"
                      />

                      <button
                        onClick={() => handleClaim(p.id)}
                        className="rounded-lg bg-[#2f5fa8] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setClaimingId(p.id)}
                      className="mt-2 rounded-lg border border-[#93b4e0] px-3 py-1.5 text-xs font-semibold text-[#1a3a66]"
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
              className="rounded-xl border border-[#c3d7f0]/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-[#2f5fa8]"
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
              className="rounded-xl border border-[#c3d7f0]/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-[#2f5fa8]"
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
                className="rounded-xl border border-[#c3d7f0]/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-[#2f5fa8]"
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
                className="rounded-xl border border-[#c3d7f0]/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-[#2f5fa8]"
              />
            ))}

            <button
              type="submit"
              disabled={saving}
              className="sm:col-span-2 mt-2 rounded-2xl border border-[#93b4e0] bg-[linear-gradient(120deg,#93b4e0_0%,#c3d7f0_55%,#2f5fa8_100%)] px-4 py-3 text-sm font-semibold text-[#1a3a66] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Product"}
            </button>
          </form>
        )}

        {/* seller ko afnai product list dekhaune section — image sanga */}
        <h2 className="mb-4 text-lg font-semibold text-[#2f5fa8]">My Products</h2>
        {loading ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-600">You haven't listed any products yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  console.log("Opening product:", p.id);
                  navigate(`/product/${p.id}`);
                }}
                className="cursor-pointer overflow-hidden rounded-2xl border border-[#d3e0f5]/40 bg-[rgba(238,243,251,0.86)] transition hover:-translate-y-1 hover:shadow-lg"
              >
                {/* product ko image */}
                <div className="aspect-square w-full bg-[#e3edfa]">
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

                  <p className="text-xs text-red-500">
                    Product ID: {p.id}
                  </p>

                  <p className="text-sm text-slate-600">
                    Rs. {p.price_npr}
                  </p>

                  <p className="text-xs text-slate-500">
                    Stock: {p.stock_quantity}
                  </p>
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