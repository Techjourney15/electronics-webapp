import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";

function SellerOnboarding() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post(
        `${API}/auth/register-seller/`,
        { business_name: businessName, contact_info: contactInfo },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      navigate("/seller-dashboard");
    } catch (err) {
      console.log(err);
      setError("Failed to save seller details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0D18] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.12),transparent_34%)]" />
      <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="mx-auto w-full max-w-[460px] rounded-[26px] border border-slate-700/60 bg-[#111827]/70 p-3 shadow-[0_12px_48px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="rounded-[20px] border border-slate-700/50 bg-[#111827]/85 p-6 backdrop-blur-lg sm:p-8">
            <h1 className="text-[1.75rem] font-semibold tracking-[-0.04em] text-white sm:text-[2rem]">
              Set up your seller profile
            </h1>
            <p className="mt-2 mb-8 text-sm leading-6 text-slate-400">
              Tell us about your business so we can verify and list your products.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <input
                  type="text"
                  placeholder="Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-[#1A1D2E] px-4 py-3.5 text-sm text-white outline-none transition duration-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </label>

              <label className="block">
                <input
                  type="text"
                  placeholder="Contact Info (phone number)"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-[#1A1D2E] px-4 py-3.5 text-sm text-white outline-none transition duration-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </label>

              {error && (
                <p className="text-sm font-medium text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative mt-2 flex w-full items-center justify-center overflow-hidden rounded-2xl border border-blue-500/50 bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(37,99,235,0.35)] transition duration-300 hover:scale-[1.01] hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 disabled:opacity-60"
              >
                <span className="relative">
                  {loading ? "Saving…" : "Continue to seller dashboard"}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

export default SellerOnboarding;