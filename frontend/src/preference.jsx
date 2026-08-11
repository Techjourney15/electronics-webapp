import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="mb-5">
      <label className="block mb-2 text-xs font-semibold text-slate-300">
        {label}
      </label>
      <select
        className="w-full rounded-xl border border-slate-800/80 bg-[#090d16] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]"
        value={value}
        onChange={onChange}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#090d16] text-slate-100">
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
      case "60-100":
        return { min_price: 60000, max_price: 100000 };
      case "100-200":
        return { min_price: 100000, max_price: 200000 };
      case "200plus":
        return { min_price: 200000, max_price: 10000000 };
      default:
        return { min_price: 0, max_price: 10000000 };
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
    <main className="relative min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(24,75,255,0.18),transparent_40%)] pointer-events-none" />

      <div className="relative mx-auto w-full max-w-[440px] rounded-2xl border border-slate-800/80 bg-[#0c1322]/90 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Tell us your preferences
        </h1>
        <p className="mt-2 mb-6 text-sm text-slate-400">
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
            { value: "60-100", label: "Rs. 60,000 – 1,00,000" },
            { value: "100-200", label: "Rs. 1,00,000 – 2,00,000" },
            { value: "200plus", label: "Above Rs. 2,00,000" },
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
          <p className="mb-4 text-sm font-medium text-red-400">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        >
          <span>{loading ? "Saving…" : "Continue to homepage"}</span>
          {loading && (
            <span className="ml-3 h-2 w-2 animate-pulse rounded-full bg-white" />
          )}
        </button>
      </div>
    </main>
  );
}

export default Preference;