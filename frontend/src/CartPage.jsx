//Updated code in frontend/src/CartPage.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import NavBar from "./NavBar.jsx";

const API = "http://127.0.0.1:8000/api";

export default function CartPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    axios
      .get(`${API}/cart/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setCartItems(res.data || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + (item.price || item.product?.price || 0) * (item.quantity || 1),
    0
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100">
      <NavBar />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Shopping Cart</h1>
        <p className="mt-1 text-sm text-slate-400">Review your selected items before checkout.</p>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : cartItems.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-800 bg-[#111827] p-12 text-center">
            <p className="text-slate-400">Your cart is currently empty.</p>
            <button
              onClick={() => navigate("/homepage")}
              className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {cartItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-[#111827] p-5"
                >
                  <div>
                    <h3 className="font-bold text-white">{item.product_name || item.name || "Product"}</h3>
                    <p className="text-xs text-slate-400">Qty: {item.quantity || 1}</p>
                  </div>
                  <p className="font-bold text-blue-400">Rs. {item.price || item.product?.price}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6 h-fit space-y-4">
              <h2 className="text-lg font-bold text-white">Order Summary</h2>
              <div className="flex justify-between text-sm text-slate-300 border-t border-slate-800 pt-4">
                <span>Total Amount</span>
                <span className="font-bold text-blue-400">Rs. {totalAmount}</span>
              </div>
              <button
                onClick={() => navigate("/checkout")}
                className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white hover:bg-blue-500"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}