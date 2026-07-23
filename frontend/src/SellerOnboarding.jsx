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
    <main className="relative min-h-screen overflow-hidden bg-[#f6efe3] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,176,126,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(141,109,72,0.12),transparent_34%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(95,74,44,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(95,74,44,0.06)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="mx-auto w-full max-w-[460px] rounded-[26px] border border-[#E6E1D5]/35 bg-[rgba(255,252,246,0.78)] p-3 shadow-[0_12px_48px_-12px_rgba(141,109,72,0.22)] backdrop-blur-xl">
          <div className="rounded-[20px] border border-[#E6E1D5]/40 bg-[rgba(255,252,246,0.86)] p-6 backdrop-blur-lg sm:p-8">
            <h1 className="text-[1.75rem] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[2rem]">
              Set up your seller profile
            </h1>
            <p className="mt-2 mb-8 text-sm leading-6 text-slate-700">
              Tell us about your business so we can verify and list your products.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <input
                  type="text"
                  placeholder="Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-2xl border border-[#dfd0b8]/70 bg-[rgba(251,247,239,0.55)] px-4 py-3.5 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-500 focus:border-[#9d7b55] focus:ring-2 focus:ring-[#9d7b55]/20"
                  required
                />
              </label>

              <label className="block">
                <input
                  type="text"
                  placeholder="Contact Info (phone number)"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="w-full rounded-2xl border border-[#dfd0b8]/70 bg-[rgba(251,247,239,0.55)] px-4 py-3.5 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-500 focus:border-[#9d7b55] focus:ring-2 focus:ring-[#9d7b55]/20"
                  required
                />
              </label>

              {error && (
                <p className="text-sm font-medium text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative mt-2 flex w-full items-center justify-center overflow-hidden rounded-2xl border border-[#d9c6a7] bg-[linear-gradient(120deg,#d9c6a7_0%,#f2e4cc_55%,#b69468_100%)] px-4 py-3.5 text-sm font-semibold text-[#4d3824] shadow-[0_0_28px_rgba(141,109,72,0.22)] transition duration-300 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#9d7b55]/25 disabled:opacity-60"
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