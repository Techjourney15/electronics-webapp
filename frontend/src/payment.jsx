import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000/api";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}` };
}

function Payment() {
  const location = useLocation();
  const navigate = useNavigate();

  const orderId = location.state?.orderId;
  const totalAmount = location.state?.totalAmount;
  const source = location.state?.source; // "buy-now" | "cart"

  const [selectedMethod, setSelectedMethod] = useState(null); // null | "khalti" | "cod"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      setError("No order found. Please return to checkout.");
    }
  }, [orderId]);

  const handleBack = () => {
    if (source === "buy-now") {
      navigate("/homepage");
    } else {
      navigate("/customer-dashboard?tab=cart");
    }
  };

  const handleKhaltiPay = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/catalog/khalti/initiate/`,
        { order_id: orderId },
        { headers: authHeaders() }
      );
      if (res.data.payment_url) {
        window.location.href = res.data.payment_url;
      } else {
        setError("Khalti payment URL was not returned.");
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Could not proceed to payment.");
      setLoading(false);
    }
  };

  const handleCodContinue = () => {
    // Address management (Phase 3) will replace this stub.
    navigate("/checkout/address", {
      state: { orderId, totalAmount, paymentMethod: "cod", source },
    });
  };

  if (!orderId) {
    return (
      <main className="min-h-screen bg-[#07111f] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-xl font-bold text-white">Payment information missing</h1>
          <p className="mt-3 text-sm text-slate-400">Your order information could not be found.</p>
          <button
            onClick={handleBack}
            className="mt-6 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white"
          >
            Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/70">
          GadgetHub
        </p>
        <h1 className="mt-3 text-center text-2xl font-bold text-white">
          Select Payment Method
        </h1>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-[1fr_320px]">
          {/* Method cards */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedMethod("khalti")}
                className={`rounded-2xl border p-5 text-center transition ${
                  selectedMethod === "khalti"
                    ? "border-sky-400 bg-sky-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white">
                  <span className="text-lg font-black text-purple-700">K</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">Khalti</p>
                <p className="text-xs text-slate-400">Mobile Wallet</p>
              </button>

              <button
                onClick={() => setSelectedMethod("cod")}
                className={`rounded-2xl border p-5 text-center transition ${
                  selectedMethod === "cod"
                    ? "border-sky-400 bg-sky-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white">
                  <span className="text-xl">💵</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">Cash on Delivery</p>
                <p className="text-xs text-slate-400">Pay when it arrives</p>
              </button>
            </div>

            {/* Khalti instructions panel */}
            {selectedMethod === "khalti" && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-300">
                  You will be redirected to your Khalti account to complete your payment:
                </p>
                <ol className="mt-3 space-y-1.5 text-sm text-slate-400 list-decimal list-inside">
                  <li>Login to Khalti using your Khalti ID and MPIN.</li>
                  <li>Ensure your Khalti account is active and has sufficient balance.</li>
                  <li>Enter the OTP sent to your registered mobile number.</li>
                </ol>
                <p className="mt-3 text-xs font-semibold text-sky-300">
                  Login with your Khalti mobile number and MPIN.
                </p>

                <button
                  onClick={handleKhaltiPay}
                  disabled={loading}
                  className="mt-5 w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {loading ? "Redirecting to Khalti..." : "Pay Now"}
                </button>
              </div>
            )}

            {/* COD panel */}
            {selectedMethod === "cod" && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-300">
                  Pay in cash when your order is delivered. You'll need to add a delivery
                  address to continue.
                </p>
                <button
                  onClick={handleCodContinue}
                  className="mt-5 w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Continue
                </button>
              </div>
            )}

            {error && <p className="text-sm font-medium text-red-400">{error}</p>}
          </div>

          {/* Order summary */}
          <div className="h-fit rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-white">Order Summary</p>
            <div className="mt-4 flex justify-between text-sm text-slate-400">
              <span>Order ID</span>
              <span className="text-slate-200">#{orderId}</span>
            </div>
            <div className="mt-4 border-t border-white/10 pt-4 flex justify-between">
              <span className="text-sm font-semibold text-white">Total</span>
              <span className="text-lg font-bold text-sky-300">
                Rs. {Number(totalAmount || 0).toLocaleString("en-NP")}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleBack}
          disabled={loading}
          className="mt-6 w-full rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10"
        >
          {source === "buy-now" ? "Back to Home" : "Back to Cart"}
        </button>
      </div>
    </main>
  );
}

export default Payment;