import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import NavBar from "./NavBar.jsx";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}` };
}

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadCart = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    axios
      .get(`${API}/catalog/cart/`, { headers: authHeaders() })
      .then((res) => {
        setCart(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load your cart.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    setActionError("");
    axios
      .patch(
        `${API}/catalog/cart/items/${itemId}/update/`,
        { quantity: newQuantity },
        { headers: authHeaders() }
      )
      .then(() => loadCart())
      .catch((err) => {
        setActionError(err.response?.data?.error || "Could not update quantity.");
      });
  };

  const handleRemoveItem = (itemId) => {
    setActionError("");
    axios
      .delete(`${API}/catalog/cart/items/${itemId}/`, { headers: authHeaders() })
      .then(() => loadCart())
      .catch(() => {
        setActionError("Could not remove that item.");
      });
  };

  const items = cart?.items || [];
  const totalAmount = cart?.total || 0;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

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
        ) : error ? (
          <p className="mt-8 text-sm text-red-400">{error}</p>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-800 bg-[#111827] p-12 text-center">
            <p className="text-3xl">🛒</p>
            <p className="mt-3 text-slate-400">Your cart is currently empty.</p>
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
              {actionError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                  {actionError}
                </p>
              )}

              {items.map((item) => {
                const imageUrl = item.image
                  ? item.image.startsWith("http")
                    ? item.image
                    : `${MEDIA_BASE}${item.image}`
                  : null;

                return (
                  <div
                    key={item.item_id}
                    className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-[#111827] p-5"
                  >
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-900">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.product_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-600">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-white">{item.product_name}</h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Rs. {item.price_npr.toLocaleString()} each
                      </p>

                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(item.item_id, item.quantity - 1)}
                            className="h-7 w-7 rounded-full border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                          >
                            −
                          </button>
                          <span className="w-4 text-center text-sm font-medium text-slate-200">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.item_id, item.quantity + 1)}
                            className="h-7 w-7 rounded-full border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.item_id)}
                          className="text-xs font-semibold text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <p className="font-bold text-blue-400">
                      Rs. {item.subtotal.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="h-fit space-y-4 rounded-2xl border border-slate-800 bg-[#111827] p-6">
              <h2 className="text-lg font-bold text-white">Order Summary</h2>
              <div className="flex justify-between text-sm text-slate-400">
                <span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-4 text-sm text-slate-300">
                <span>Total Amount</span>
                <span className="font-bold text-blue-400">Rs. {totalAmount.toLocaleString()}</span>
              </div>
              <button
                onClick={() => navigate("/checkout")}
                className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white hover:bg-blue-500"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}