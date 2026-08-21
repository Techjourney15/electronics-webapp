import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}` };
}

function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying | paid | cancelled | failed | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const pidx = searchParams.get("pidx");
    // Khalti also appends its own status/purchase_order_id, but we
    // always re-verify server-side rather than trusting the URL alone.
    const purchaseOrderId = searchParams.get("purchase_order_id");

    if (!pidx || !purchaseOrderId) {
      setStatus("error");
      setMessage("Missing payment information. If you completed a payment, check your Orders page.");
      return;
    }

    axios
      .post(
        `${API}/catalog/khalti/verify/`,
        { pidx, order_id: purchaseOrderId },
        { headers: authHeaders() }
      )
      .then((res) => {
        setStatus(res.data.status);
      })
      .catch(() => {
        setStatus("error");
        setMessage("Could not verify your payment. Please check your Orders page or contact support.");
      });
  }, [searchParams]);

  const content = {
    verifying: {
      icon: "⏳",
      title: "Confirming your payment…",
      body: "Please wait while we verify your payment with Khalti.",
    },
    paid: {
      icon: "✅",
      title: "Payment successful!",
      body: "Your order has been confirmed. Thank you for shopping with Nexora.",
    },
    cancelled: {
      icon: "🚫",
      title: "Payment cancelled",
      body: "You cancelled the payment or it expired. Your cart items were not charged.",
    },
    failed: {
      icon: "❌",
      title: "Payment failed",
      body: "Something went wrong with your payment. Please try again from your cart.",
    },
    error: {
      icon: "⚠️",
      title: "Could not confirm payment",
      body: message || "Please check your Orders page to see if this went through.",
    },
  }[status];

  return (
    <main className="min-h-screen bg-[#eef3fb] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#c3d7f0]/70 bg-white p-8 text-center shadow-sm">
        <p className="text-4xl">{content.icon}</p>
        <h1 className="mt-4 text-xl font-bold text-slate-900">{content.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{content.body}</p>

        {status !== "verifying" && (
          <button
            onClick={() => navigate("/customer-dashboard?tab=orders")}
            className="mt-6 rounded-full bg-[#2f5fa8] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a3a66]"
          >
            View my orders
          </button>
        )}
      </div>
    </main>
  );
}

export default PaymentCallback;