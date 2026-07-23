import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="mb-6">
      <label className="block mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#6a5138]">
        {label}
      </label>
      <select
        className="w-full rounded-2xl border border-[#dfd0b8]/70 bg-[rgba(251,247,239,0.7)] px-4 py-3.5 text-sm text-slate-900 outline-none transition duration-200 focus:border-[#9d7b55] focus:ring-2 focus:ring-[#9d7b55]/20"
        value={value}
        onChange={onChange}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Preference() {
  const navigate = useNavigate();

  const [category, setCategory] = useState("Smartphone");
  const [budget, setBudget] = useState("20-60");
  const [priority, setPriority] = useState("camera");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getBudgetValues = () => {
    switch (budget) {
      case "under20":
        return { min_price: 0, max_price: 20000 };
      case "20-60":
        return { min_price: 20000, max_price: 60000 };
      case "60plus":
        return { min_price: 60000, max_price: 1000000 };
      default:
        return { min_price: 0, max_price: 1000000 };
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const { min_price, max_price } = getBudgetValues();

    try {
      await axios.post(
        `${API}/auth/preferences/`,
        { category, min_price, max_price, priority_spec: priority },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      navigate("/homepage");
    } catch (err) {
      console.log(err);
      setError("Failed to save preferences. Please try again.");
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
              Tell us your preferences
            </h1>
            <p className="mt-2 mb-8 text-sm leading-6 text-slate-700">
              We'll personalize your recommendations based on what you tell us.
            </p>

            <SelectField
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: "Smartphone", label: "Smartphone" },
                { value: "Laptop", label: "Laptop" },
                { value: "Both", label: "Both" },
              ]}
            />

            <SelectField
              label="Budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              options={[
                { value: "under20", label: "Under Rs. 20,000" },
                { value: "20-60", label: "Rs. 20,000 – 60,000" },
                { value: "60plus", label: "Above Rs. 60,000" },
              ]}
            />

            <SelectField
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: "camera", label: "Camera" },
                { value: "battery", label: "Battery" },
                { value: "gaming", label: "Gaming" },
                { value: "performance", label: "Performance" },
              ]}
            />

            {error && (
              <p className="mb-4 text-sm font-medium text-red-600">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="relative mt-2 flex w-full items-center justify-center overflow-hidden rounded-2xl border border-[#d9c6a7] bg-[linear-gradient(120deg,#d9c6a7_0%,#f2e4cc_55%,#b69468_100%)] px-4 py-3.5 text-sm font-semibold text-[#4d3824] shadow-[0_0_28px_rgba(141,109,72,0.22)] transition duration-300 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#9d7b55]/25 disabled:opacity-60"
            >
              <span className="relative">
                {loading ? "Saving…" : "Continue to homepage"}
              </span>
              {loading && (
                <span className="relative ml-3 h-2.5 w-2.5 animate-pulse rounded-full bg-[#4d3824]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Preference;