//Updated code in frontend/src/OrdersPage.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import NavBar from "./NavBar";

const API = "http://127.0.0.1:8000/api";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    axios
      .get(`${API}/orders/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setOrders(res.data || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100">
      <NavBar />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">My Orders</h1>
        <p className="mt-1 text-sm text-slate-400">View and track your order history.</p>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-800 bg-[#111827] p-12 text-center">
            <p className="text-slate-400">You haven't placed any orders yet.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-[#111827] p-6"
              >
                <div>
                  <p className="text-sm font-bold text-white">Order #{order.id}</p>
                  <p className="text-xs text-slate-400">Status: {order.status || "Processing"}</p>
                </div>
                <p className="text-lg font-bold text-blue-400">Rs. {order.total_amount || order.price}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}