import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";

const API_BASE = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}` };
}

function CheckoutPage() {
  const navigate = useNavigate();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingLoading, setPayingLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [notes, setNotes] = useState("");

  const loadCart = () => {
    setLoading(true);
    setError("");

    axios
      .get(`${API_BASE}/catalog/cart/`, {
        headers: authHeaders(),
      })
      .then((res) => setCart(res.data))
      .catch(() => setError("Could not load your cart."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/");
      return;
    }

    loadCart();
  }, []);

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    axios
      .patch(
        `${API_BASE}/catalog/cart/items/${itemId}/update/`,
        { quantity: newQuantity },
        { headers: authHeaders() }
      )
      .then((res) => setCart(res.data))
      .catch(() => setPayError("Could not update quantity."));
  };

  const handleRemoveItem = (itemId) => {
    axios
      .delete(`${API_BASE}/catalog/cart/items/${itemId}/`, {
        headers: authHeaders(),
      })
      .then((res) => setCart(res.data))
      .catch(() => setPayError("Could not remove that item."));
  };

  const handlePay = () => {
    setPayError("");
    setPayingLoading(true);

    // Step 1: Create the order from the cart.
    axios
      .post(
        `${API_BASE}/catalog/checkout/`,
        { notes },
        { headers: authHeaders() }
      )
      .then((checkoutRes) => {
        const orderId = checkoutRes.data.order_id;

        // Step 2: Initiate Khalti payment.
        return axios.post(
          `${API_BASE}/catalog/khalti/initiate/`,
          {
            order_id: orderId,
            return_url: `${window.location.origin}/payment-callback`,
            website_url: window.location.origin,
          },
          { headers: authHeaders() }
        );
      })
      .then((res) => {
        window.location.href = res.data.payment_url;
      })
      .catch((err) => {
        setPayError(
          err.response?.data?.error ||
            "Could not proceed to payment."
        );
        setPayingLoading(false);
      });
  };

  const itemCount =
    cart?.items?.reduce(
      (sum, item) => sum + item.quantity,
      0
    ) || 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0D18]">
        <div className="relative">
          <NavBar />
        </div>

        <div className="flex min-h-[70vh] items-center justify-center">
          <p className="text-slate-400">
            Loading your order...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0D18] text-slate-100">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.12),transparent_34%)]" />

      <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      {/* Same navbar used on Home */}
      <div className="relative">
        <NavBar />
      </div>

      {/* Checkout content */}
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest bg-gradient-to-r from-[#2563EB] via-[#F59E0B] to-[#FF5500] bg-clip-text text-transparent">
            GADGETHUB
          </p>

          <h1 className="mt-1 text-3xl font-bold text-white">
            Checkout
          </h1>
        </div>

        {error ? (
          <p className="mt-6 text-sm text-red-400">
            {error}
          </p>
        ) : !cart || cart.items.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/60 py-16 text-center">
            <p className="text-sm text-slate-400">
              Your cart is empty.
            </p>

            <button
              onClick={() =>
                navigate("/customer-dashboard?tab=cart")
              }
              className="mt-4 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Go to cart
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700/60 bg-[#111827]/85 p-6 shadow-xl backdrop-blur-md">
            {/* Order header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Review your order
              </h2>

              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                {itemCount}{" "}
                {itemCount === 1 ? "item" : "items"}
              </span>
            </div>

            {/* Cart items */}
            <div className="mt-4 divide-y divide-slate-800/80">
              {cart.items.map((item) => {
                const imageUrl = item.image
                  ? item.image.startsWith("http")
                    ? item.image
                    : `${MEDIA_BASE}${item.image}`
                  : null;

                return (
                  <div
                    key={item.item_id}
                    className="flex items-center gap-4 py-4"
                  >
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-900">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.product_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-600">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-100">
                        {item.product_name}
                      </p>

                      <p className="text-xs text-slate-500">
                        Rs.{" "}
                        {item.price_npr.toLocaleString()} each
                      </p>

                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleUpdateQuantity(
                                item.item_id,
                                item.quantity - 1
                              )
                            }
                            className="h-6 w-6 rounded-full border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                          >
                            −
                          </button>

                          <span className="text-sm font-medium text-slate-200">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              handleUpdateQuantity(
                                item.item_id,
                                item.quantity + 1
                              )
                            }
                            className="h-6 w-6 rounded-full border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() =>
                            handleRemoveItem(item.item_id)
                          }
                          className="text-xs font-semibold text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-blue-400">
                      Rs. {item.subtotal.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Delivery notes */}
            <label className="mt-5 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Delivery notes (optional)
              </span>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. call before delivery, landmark, preferred time..."
                className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-[#1A1D2E] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>

            {/* Total */}
            <div className="mt-4 space-y-2 border-t border-slate-700/60 pt-4">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Subtotal</span>

                <span>
                  Rs. {cart.total.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between text-base font-bold text-white">
                <span>Total</span>

                <span className="text-blue-400">
                  Rs. {cart.total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment error */}
            {payError && (
              <p className="mt-3 text-sm font-medium text-red-400">
                {payError}
              </p>
            )}

            {/* Khalti payment */}
            <button
              onClick={handlePay}
              disabled={payingLoading}
              className="mt-6 flex w-full items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {payingLoading
                ? "Redirecting to Khalti..."
                : "Pay with Khalti"}
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              Secure payment powered by Khalti.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default CheckoutPage;