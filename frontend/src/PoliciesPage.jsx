//Updated code in frontend/src/PoliciesPage.jsx
import NavBar from "./NavBar.jsx";

export default function PoliciesPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100">
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Store Policies</h1>
        <p className="mt-1 text-sm text-slate-400">
          Review our terms of service, privacy policy, and return guidelines.
        </p>

        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-blue-400">Return & Refund Policy</h2>
            <p className="mt-2 text-sm text-slate-300">
              Items can be returned within 7 days of delivery if they are damaged, defective, or incorrect. Returned products must remain unused with original packaging intact.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-blue-400">Privacy Policy</h2>
            <p className="mt-2 text-sm text-slate-300">
              We respect your privacy. Personal data such as contact numbers and address details are exclusively used for order fulfillment and account security.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}