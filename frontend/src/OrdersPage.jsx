import { useState, useEffect } from "react";
import axios from "axios";
import NavBar from "./NavBar";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

// ================= STATUS STYLE =================
function statusStyle(status) {
  switch (status) {
    case "paid":
      return {
        label: "Paid",
        badge:
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        accent: "bg-emerald-400",
      };

    case "pending":
      return {
        label: "Pending",
        badge:
          "bg-amber-500/10 text-amber-300 border-amber-500/20",
        accent: "bg-amber-400",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        badge:
          "bg-slate-500/10 text-slate-400 border-slate-500/20",
        accent: "bg-slate-500",
      };

    case "failed":
      return {
        label: "Failed",
        badge:
          "bg-red-500/10 text-red-400 border-red-500/20",
        accent: "bg-red-500",
      };

    default:
      return {
        label: "Processing",
        badge:
          "bg-blue-500/10 text-blue-400 border-blue-500/20",
        accent: "bg-blue-500",
      };
  }
}

// ================= FORMAT DATE =================
function formatDate(dateString) {
  if (!dateString) return "";

  return new Date(dateString).toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// ================= GET IMAGE =================
function getImageUrl(item) {
  // Supports different possible API structures
  const image =
    item.product_image ||
    item.image ||
    item.product?.image ||
    null;

  if (!image) return null;

  return image.startsWith("http")
    ? image
    : `${MEDIA_BASE}${image}`;
}

// ================= ORDERS PAGE =================
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setLoading(false);
      return;
    }

    axios
      .get(`${API}/catalog/orders/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setOrders(res.data || []);
      })
      .catch(() => {
        setError("Could not load your orders.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            My Orders
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            View and track your order history.
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-12 text-center">
            <p className="text-slate-400">
              You haven't placed any orders yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const { label, badge, accent } = statusStyle(order.status);

              return (
                <div
                  key={order.id}
                  className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#121927] shadow-sm"
                >
                  {/* Colored Status Line on Left */}
                  <div
                    className={`absolute bottom-0 left-0 top-0 w-1 ${accent}`}
                  />

                  <div className="pl-6 pr-5 pt-4 pb-4 sm:pl-7 sm:pr-6">

                    {/* ================= ORDER HEADER ================= */}
                    <div className="flex items-start justify-between gap-4">

                      {/* Order Number + Status */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-bold text-slate-100 sm:text-base">
                            Order #{order.id}
                          </h2>

                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge}`}
                          >
                            <span className="mr-1">●</span>
                            {label}
                          </span>
                        </div>

                        {/* Date */}
                        <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                          {formatDate(order.created_at)}
                        </p>
                      </div>

                      {/* Total Amount */}
                      <p className="shrink-0 text-lg font-bold text-blue-400 sm:text-xl">
                        Rs. {Number(order.total_amount || 0).toLocaleString()}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="my-4 border-t border-slate-700/50" />

                    {/* ================= ORDER ITEMS ================= */}
                    {order.items?.length > 0 && (
                      <div className="space-y-4">
                        {order.items.map((item, idx) => {
                          const imageUrl = getImageUrl(item);

                          // Supports your current serializer and future versions
                          const productName =
                            item.product_name_snapshot ||
                            item.product_name ||
                            "Product";

                          const sellerName =
                            item.seller_business_snapshot ||
                            item.seller_name_snapshot ||
                            item.seller_name ||
                            "";

                          const itemTotal =
                            (Number(item.price_at_purchase) || 0) *
                            (Number(item.quantity) || 1);

                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-4"
                            >
                              {/* Product Information */}
                              <div className="flex min-w-0 items-center gap-3">

                                {/* Product Image */}
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-[#0B0F19]">
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={productName}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <span className="text-lg text-slate-600">
                                        📦
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Name and Seller */}
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium text-slate-300 sm:text-sm">
                                    {item.quantity} × {productName}
                                  </p>

                                  {sellerName && (
                                    <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                                      Sold by{" "}
                                      <span className="text-slate-400">
                                        {sellerName}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Item Price */}
                              <p className="shrink-0 text-xs font-medium text-slate-400 sm:text-sm">
                                Rs. {itemTotal.toLocaleString()}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}