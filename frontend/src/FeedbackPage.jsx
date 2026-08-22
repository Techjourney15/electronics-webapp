//Updated code in frontend/src/FeedbackPage.jsx
import { useState } from "react";
import NavBar from "./NavBar.jsx";

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSubmitted(true);
    setFeedback("");
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100">
      <NavBar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Customer Feedback</h1>
        <p className="mt-1 text-sm text-slate-400">
          We value your feedback to improve your experience on GadgetHub.
        </p>

        {submitted && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            Thank you! Your feedback has been successfully submitted.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-xl">
          <label className="block text-sm font-semibold text-slate-200">Your Feedback</label>
          <textarea
            rows="5"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us what you like or what we can improve..."
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            className="mt-4 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition"
          >
            Submit Feedback
          </button>
        </form>
      </main>
    </div>
  );
}