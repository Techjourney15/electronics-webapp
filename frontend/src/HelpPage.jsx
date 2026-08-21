import NavBar from "./NavBar.jsx";

export default function HelpPage() {
  const faqs = [
    {
      q: "How do I track my order status?",
      a: "Go to the Orders section in the top navigation bar to check real-time updates on your active purchases.",
    },
    {
      q: "What payment methods are supported?",
      a: "We support major digital wallets like Khalti/eSewa alongside standard online card payments.",
    },
    {
      q: "How can I request a product return?",
      a: "If your item is eligible under our policy, navigate to your order details and click Request Return within 7 days of delivery.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100">
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Help & Support</h1>
        <p className="mt-1 text-sm text-slate-400">
          Find answers to common questions or reach out to customer service.
        </p>

        <div className="mt-8 space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-xl">
              <h3 className="text-base font-bold text-white">{faq.q}</h3>
              <p className="mt-2 text-sm text-slate-400">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}