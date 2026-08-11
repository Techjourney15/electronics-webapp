import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

const API = "http://127.0.0.1:8000/api";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });

  // Address State & Edit Toggle
  const [address, setAddress] = useState({
    city: "Kathmandu",
    state: "Bagmati Province",
    country: "Nepal",
    phone: "+977 9800000000",
  });
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({ ...address });

  const token = localStorage.getItem("access_token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    Promise.allSettled([
      axios.get(`${API}/auth/my-profile/`, authHeader),
      axios.get(`${API}/orders/my-orders/`, authHeader),
    ])
      .then(([profileRes, ordersRes]) => {
        if (profileRes.status === "fulfilled") {
          const data = profileRes.value.data;
          setProfile(data);
          setProfileForm({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
          });
        }
        if (ordersRes.status === "fulfilled") {
          setOrders(ordersRes.value.data);
        } else {
          setOrders([
            {
              id: "ORD-98234",
              date: "2026-08-05",
              total_price: 154000,
              order_status: "Delivered",
              payment_status: "Paid",
              payment_method: "eSewa",
              items: [{ name: "Samsung Galaxy S24 Ultra", qty: 1, price: 154000 }],
            },
            {
              id: "ORD-98112",
              date: "2026-08-09",
              total_price: 85000,
              order_status: "Processing",
              payment_status: "Paid",
              payment_method: "Khalti",
              items: [{ name: "Acer Nitro 5 Gaming Laptop", qty: 1, price: 85000 }],
            },
          ]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/");
  };

  // Profile Update Handler
  const handleProfileSave = (e) => {
    e.preventDefault();
    axios
      .patch(`${API}/auth/my-profile/`, profileForm, authHeader)
      .then((res) => {
        setProfile(res.data);
        setIsEditingProfile(false);
      })
      .catch(() => {
        // Fallback for preview if endpoint isn't wired up
        setProfile((prev) => ({ ...prev, ...profileForm }));
        setIsEditingProfile(false);
      });
  };

  // Address Update Handler
  const handleAddressSave = (e) => {
    e.preventDefault();
    axios
      .put(`${API}/auth/my-address/`, addressForm, authHeader)
      .then(() => {
        setAddress(addressForm);
        setIsEditingAddress(false);
      })
      .catch(() => {
        // Fallback for preview
        setAddress(addressForm);
        setIsEditingAddress(false);
      });
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "processing":
      case "shipped":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "cancelled":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0e1a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <div
            onClick={() => navigate("/homepage")}
            className="flex cursor-pointer items-center gap-2"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white shadow-md"
              style={{ backgroundImage: "linear-gradient(135deg, #4625eb, #d8ac1d)" }}
            >
              N
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">Nexora</span>
          </div>

          <button
            onClick={() => navigate("/homepage")}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            ← Back to Store
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        {/* Profile Welcome Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-2xl font-bold text-white shadow-lg">
              {profile?.first_name
                ? profile.first_name[0].toUpperCase()
                : (profile?.username?.[0] || "U").toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#93b4e0]">
                Customer Account
              </p>
              <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
                {profile?.first_name
                  ? `${profile.first_name} ${profile.last_name || ""}`
                  : profile?.username || "Valued Customer"}
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">{profile?.email || "No email linked"}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            Log out
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex gap-8 border-b border-white/10 text-sm font-medium">
          {[
            { id: "profile", label: "Account Overview" },
            { id: "orders", label: `My Orders (${orders.length})` },
            { id: "addresses", label: "Saved Addresses" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`pb-3 transition-all ${
                activeTab === tab.id
                  ? "border-b-2 border-blue-500 font-semibold text-blue-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Tab Body */}
        {loading ? (
          <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        ) : (
          <>
            {/* OVERVIEW / PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-[#10162a]/80 p-6 shadow-2xl backdrop-blur sm:p-8">
                  <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                    <h2 className="text-lg font-bold text-white">Personal Information</h2>
                    {!isEditingProfile && (
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 transition hover:bg-blue-500/20"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {isEditingProfile ? (
                    <form onSubmit={handleProfileSave} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-semibold text-slate-400">First Name</label>
                          <input
                            type="text"
                            value={profileForm.first_name}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, first_name: e.target.value })
                            }
                            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400">Last Name</label>
                          <input
                            type="text"
                            value={profileForm.last_name}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, last_name: e.target.value })
                            }
                            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold text-slate-400">Email Address</label>
                          <input
                            type="email"
                            value={profileForm.email}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, email: e.target.value })
                            }
                            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          First Name
                        </p>
                        <p className="mt-1 font-semibold text-white">{profile?.first_name || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Last Name
                        </p>
                        <p className="mt-1 font-semibold text-white">{profile?.last_name || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Email Address
                        </p>
                        <p className="mt-1 font-semibold text-white">{profile?.email || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Account Type
                        </p>
                        <p className="mt-1 inline-block rounded-md bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
                          {profile?.role || "customer"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-[#10162a]/80 p-5">
                    <p className="text-xs font-medium text-slate-400">Total Orders Placed</p>
                    <p className="mt-2 text-2xl font-bold text-white">{orders.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#10162a]/80 p-5">
                    <p className="text-xs font-medium text-slate-400">Active Shipments</p>
                    <p className="mt-2 text-2xl font-bold text-blue-400">
                      {
                        orders.filter(
                          (o) =>
                            o.order_status?.toLowerCase() === "processing" ||
                            o.order_status?.toLowerCase() === "shipped"
                        ).length
                      }
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#10162a]/80 p-5">
                    <p className="text-xs font-medium text-slate-400">Default Payment</p>
                    <p className="mt-2 text-base font-semibold text-white">eSewa / Khalti</p>
                  </div>
                </div>
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === "orders" && (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[#10162a]/80 p-8 text-center text-slate-400">
                    You haven't placed any orders yet.
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-white/10 bg-[#10162a]/80 p-6 shadow-xl backdrop-blur transition hover:border-white/20"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-400">Order ID</p>
                          <p className="text-sm font-bold text-white">{order.id}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400">Date</p>
                          <p className="text-sm text-slate-300">{order.date}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400">Payment Status</p>
                          <span className="mt-1 inline-block text-xs font-medium text-emerald-400">
                            ✓ {order.payment_status} ({order.payment_method})
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400">Fulfillment Status</p>
                          <span
                            className={`mt-1 inline-block rounded-full border px-3 py-0.5 text-xs font-semibold ${getStatusBadge(
                              order.order_status
                            )}`}
                          >
                            {order.order_status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-slate-300">
                              {item.name} <span className="text-xs text-slate-500">x{item.qty}</span>
                            </span>
                            <span className="font-semibold text-white">
                              Rs. {item.price?.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                        <span className="text-xs text-slate-400">Total Paid</span>
                        <span className="text-base font-bold text-white">
                          Rs. {order.total_price?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SAVED ADDRESSES TAB */}
            {activeTab === "addresses" && (
              <div className="rounded-2xl border border-white/10 bg-[#10162a]/80 p-6 text-slate-300 shadow-2xl backdrop-blur">
                <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                  <h2 className="text-lg font-bold text-white">Shipping Addresses</h2>
                  {!isEditingAddress && (
                    <button
                      onClick={() => {
                        setAddressForm({ ...address });
                        setIsEditingAddress(true);
                      }}
                      className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 transition hover:bg-blue-500/20"
                    >
                      Edit Address
                    </button>
                  )}
                </div>

                {isEditingAddress ? (
                  <form onSubmit={handleAddressSave} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-400">City</label>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={(e) =>
                            setAddressForm({ ...addressForm, city: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">State / Province</label>
                        <input
                          type="text"
                          value={addressForm.state}
                          onChange={(e) =>
                            setAddressForm({ ...addressForm, state: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Country</label>
                        <input
                          type="text"
                          value={addressForm.country}
                          onChange={(e) =>
                            setAddressForm({ ...addressForm, country: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Phone Number</label>
                        <input
                          type="text"
                          value={addressForm.phone}
                          onChange={(e) =>
                            setAddressForm({ ...addressForm, phone: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(false)}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                      >
                        Save Address
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <p className="text-xs font-bold text-blue-400">PRIMARY ADDRESS</p>
                    <p className="mt-1 font-semibold text-white">
                      {profile?.first_name || "Ram"} {profile?.last_name || "Ghale"}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {address.city}, {address.state}, {address.country}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">Phone: {address.phone}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}