import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import deviceImage from "./assets/Mobile.webp";

const API_BASE = "http://127.0.0.1:8000/api";

function LabeledField({
  id,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  autoComplete,
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-slate-300"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="
        w-full
        rounded-xl
        border
        border-slate-700
        bg-[#1A1D2E]
        px-3.5
        py-2.5
        text-sm
        text-white
        placeholder:text-slate-500
        outline-none
        transition
        focus:border-blue-500
        focus:ring-2
        focus:ring-blue-500/20
        "
      />
    </div>
  );
}

function Logo() {
  return (
    <svg
      viewBox="0 0 80 80"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gold">
          <stop offset="0%" stopColor="#FFE7AE" />
          <stop offset="50%" stopColor="#f4bb60" />
          <stop offset="100%" stopColor="#B88942" />
        </linearGradient>
      </defs>

      <path
        d="M40 12L56 22L56 38L40 48L24 38L24 22L40 12Z"
        fill="url(#gold)"
        opacity=".25"
      />

      <path
        d="M24 22L40 12L56 22L40 32L24 22Z"
        fill="url(#gold)"
      />

      <path
        d="M40 32L56 22V38L40 48V32Z"
        fill="url(#gold)"
        opacity=".9"
      />

      <path
        d="M40 32L24 22V38L40 48V32Z"
        fill="url(#gold)"
        opacity=".7"
      />

      <path
        d="M18 47L31 39L40 44L27 52L18 47Z"
        fill="url(#gold)"
      />

      <path
        d="M62 47L49 39L40 44L53 52L62 47Z"
        fill="url(#gold)"
      />

      <path
        d="M40 48L27 52L40 60L53 52L40 48Z"
        fill="url(#gold)"
      />
    </svg>
  );
}

function LeftSection() {
  const brandName = "NEXORA";

  return (
    <section className="hidden lg:flex flex-col justify-center px-16">
      {/* Optimized Keyframe Animation */}
      <style>{`
        @keyframes ultraSmoothReveal {
          0% {
            opacity: 0;
            transform: translateY(14px) scale(0.92);
            filter: blur(10px);
          }
          60% {
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0px);
          }
        }
      `}</style>

      {/* NEXORA Staggered Letter Reveal Title */}
      <h1 className="flex text-[90px] leading-none font-black tracking-tight select-none">
        {brandName.split("").map((char, index) => (
          <span
            key={index}
            style={{
              /* 
                - 0.8s duration for a silky finish
                - cubic-bezier(0.16, 1, 0.3, 1) for rapid acceleration + soft deceleration
                - index * 0.07s for a tight wave interval
              */
              animation: `ultraSmoothReveal 3s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.07}s forwards`,
              opacity: 0,
              willChange: "transform, opacity, filter", // Force GPU layer creation
            }}
            className="
              inline-block
              bg-gradient-to-r
              from-[#2563EB]
              via-[#F59E0B]
              to-[#FF5500]
              bg-[length:200%_auto]
              bg-clip-text
              text-transparent
              drop-shadow-[0_0_35px_rgba(255,85,0,0.35)]
              animate-[smoothShimmer_4s_ease-in-out_infinite]
            "
          >
            {char}
          </span>
        ))}
      </h1>

      {/* ... rest of your LeftSection code remains unchanged ... */}
      <p className="mt-4 max-w-md text-base leading-7 text-slate-400">
        Verified smartphones and laptops, checked spec by spec — buy and sell with
        a marketplace built for tech.
      </p>

      {/* Specification Badges */}
      <div className="mt-10 flex flex-wrap gap-3">
        <span className="rounded-full border border-slate-700 bg-[#111827]/60 px-4 py-2 text-xs">
          128GB
        </span>
        <span className="rounded-full border border-slate-700 bg-[#111827]/60 px-4 py-2 text-xs">
          5G
        </span>
        <span className="rounded-full border border-slate-700 bg-[#111827]/60 px-4 py-2 text-xs">
          A17 Pro
        </span>
        <span className="rounded-full border border-slate-700 bg-[#111827]/60 px-4 py-2 text-xs">
          16GB RAM
        </span>
        <span className="rounded-full border border-slate-700 bg-[#111827]/60 px-4 py-2 text-xs">
          RTX 4060
        </span>
        <span className="rounded-full border border-slate-700 bg-[#111827]/60 px-4 py-2 text-xs">
          512GB SSD
        </span>
        <span className="rounded-full border border-slate-700 bg-[#111827]/60 px-4 py-2 text-xs">
          Snapdragon 8 Gen 3
        </span>
      </div>

      {/* Metrics */}
      <div className="mt-10 grid max-w-md grid-cols-3 gap-6">
        <div>
          <h2 className="text-3xl font-bold">12,400+</h2>
          <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
            Devices Listed
          </p>
        </div>

        <div>
          <h2 className="text-3xl font-bold">98.2%</h2>
          <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
            On-Time Delivery
          </p>
        </div>

        <div>
          <h2 className="text-3xl font-bold">4.8/5</h2>
          <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
            Buyer Rating
          </p>
        </div>
      </div>

      {/* Featured Device Card */}
      <div
        className="
        relative
        mt-8
        w-[340px]
        overflow-hidden
        rounded-2xl
        border
        border-slate-700/80
        bg-gradient-to-br
        from-[#1D3363]
        via-[#16213F]
        to-[#111827]
        shadow-2xl
        "
      >
        <img
          src={deviceImage}
          alt="Samsung Galaxy S24 Ultra"
          className="
            h-[190px]
            w-full
            object-cover
            opacity-80
          "
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <button
          className="
          absolute
          left-4
          top-1/2
          -translate-y-1/2
          h-10
          w-10
          rounded-full
          bg-black/40
          backdrop-blur
          text-white
          "
        >
          ❮
        </button>

        <button
          className="
          absolute
          right-4
          top-1/2
          -translate-y-1/2
          h-10
          w-10
          rounded-full
          bg-black/40
          backdrop-blur
          text-white
          "
        >
          ❯
        </button>

        <div className="absolute bottom-0 w-full p-6">
          <div
            className="
            inline-flex
            items-center
            rounded-full
            bg-amber-500/20
            px-3
            py-1
            text-xs
            text-amber-300
            "
          >
            🔥 Just launched
          </div>

          <h3 className="mt-4 text-3xl font-bold">
            Samsung Galaxy S24 Ultra
          </h3>

          <p className="mt-2 text-lg text-white/90">
            Rs 1,54,000
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <span className="h-2 w-2 rounded-full bg-white" />
            <span className="h-2 w-2 rounded-full bg-white/40" />
            <span className="h-2 w-2 rounded-full bg-white/40" />
            <span className="h-2 w-2 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Auth() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("signup");
  const [role, setRole] = useState("customer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const isSignIn = mode === "signin";

  const updateField = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      if (isSignIn) {
        const response = await axios.post(`${API_BASE}/auth/login/`, {
          username: form.email,
          password: form.password,
        });

        localStorage.setItem("access_token", response.data.access);
        localStorage.setItem("refresh_token", response.data.refresh);

        const who = await axios.get(`${API_BASE}/auth/whoami/`, {
          headers: {
            Authorization: `Bearer ${response.data.access}`,
          },
        });

        if (who.data.role === "seller") {
          navigate(
            who.data.is_seller_profile_complete
              ? "/seller-dashboard"
              : "/seller-onboarding"
          );
        } else if (who.data.role === "admin") {
          navigate("/admin-dashboard");
        } else {
          const prefCheck = await axios.get(
            `${API_BASE}/auth/has-preferences/`,
            {
              headers: {
                Authorization: `Bearer ${response.data.access}`,
              },
            }
          );

          navigate(
            prefCheck.data.has_preferences
              ? "/homepage"
              : "/preferences"
          );
        }
      } else {
        await axios.post(`${API_BASE}/auth/register/`, {
          username: form.email,
          email: form.email,
          password: form.password,
          role,
          name: form.name,
        });

        setMode("signin");

        setError(
          `Welcome, ${
            form.name || "there"
          }! Your account is ready. Please sign in.`
        );
      }
    } catch (err) {
      const data = err.response?.data;

      const message =
        data?.detail ||
        (data && Object.values(data)[0]) ||
        "Something went wrong. Please try again.";

      setError(Array.isArray(message) ? message[0] : String(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = isSignIn
    ? "Welcome Back"
    : "Create your account";

  const copy = isSignIn
    ? "Sign in to continue your Nexora journey."
    : "Get started buying or selling on Nexora.";

  const isSuccessMessage = error.startsWith("Welcome");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0D18] text-white transition-opacity duration-700 ease-in-out animate-fadeIn">
      {/* Background keyframe definitions */}
      <style>{`
        @keyframes smoothFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes smoothShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Deep Dark Background Layer */}
      <div className="absolute inset-0 bg-[#0A0D18]" />

      {/* Grid Pattern Overlay */}
      <div
        className="
        absolute
        inset-0
        opacity-15
        [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]
        [background-size:60px_60px]
        "
      />

      {/* Ambient Blue Background Glow */}
      <div
        className="
        absolute
        top-[-100px]
        right-[-100px]
        h-[650px]
        w-[650px]
        rounded-full
        bg-blue-600/30
        blur-[170px]
        pointer-events-none
        "
      />

      {/* Ambient Gold/Orange Background Glow */}
      <div
        className="
        absolute
        bottom-[-80px]
        left-[-120px]
        h-[500px]
        w-[500px]
        rounded-full
        bg-amber-600/25
        blur-[160px]
        pointer-events-none
        "
      />

      <div className="relative grid min-h-screen items-center lg:grid-cols-2">
        {/* Left Side Content */}
        <LeftSection />

        {/* Right Side Auth Form */}
        <section className="hidden lg:flex flex-col justify-center px-10 xl:px-14">
          <div
            className="
            w-full
            max-w-sm
            rounded-3xl
            border
            border-slate-700/60
            bg-[#111827]/85
            p-6
            backdrop-blur-2xl
            shadow-[0_0_60px_rgba(30,58,138,.2)]
            "
          >
            {/* Header / Brand Logo */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1D2E] shadow-md animate-[smoothFloat_3.5s_ease-in-out_infinite]">
                <Logo />
              </div>

              <div>
                <h3 className="text-base font-bold">
                  Nexora
                </h3>

                <p className="text-xs text-slate-400">
                  Electronics Marketplace
                </p>
              </div>
            </div>

            {/* Mode Toggle Switch */}
            <div className="mb-5 flex rounded-full bg-[#1A1D2E] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                className={`flex-1 rounded-full py-2 text-xs font-semibold transition-all duration-300 ${
                  !isSignIn
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Create account
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                }}
                className={`flex-1 rounded-full py-2 text-xs font-semibold transition-all duration-300 ${
                  isSignIn
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign in
              </button>
            </div>

            {/* Form Title & Subtitle */}
            <div className="mb-5">
              <h2 className="text-2xl font-bold">
                {title}
              </h2>

              <p className="mt-1.5 text-sm text-slate-400">
                {copy}
              </p>
            </div>

            {/* Interactive Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-3.5"
            >
              {!isSignIn && (
                <>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRole("customer")}
                      className={`flex-1 rounded-xl border py-2.5 text-xs font-medium transition-all duration-300 ${
                        role === "customer"
                          ? "border-blue-500 bg-blue-600/10 text-white"
                          : "border-slate-700 bg-[#1A1D2E] text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      I'm a customer
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("seller")}
                      className={`flex-1 rounded-xl border py-2.5 text-xs font-medium transition-all duration-300 ${
                        role === "seller"
                          ? "border-blue-500 bg-blue-600/10 text-white"
                          : "border-slate-700 bg-[#1A1D2E] text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      I'm a seller
                    </button>
                  </div>

                  <LabeledField
                    id="name"
                    label="Full name"
                    placeholder="Anshu Sharma"
                    value={form.name}
                    onChange={updateField("name")}
                    autoComplete="name"
                  />
                </>
              )}

              <LabeledField
                id="email"
                label="Email address"
                placeholder="anshu@gmail.com"
                value={form.email}
                onChange={updateField("email")}
                autoComplete="email"
              />

              <LabeledField
                id="password"
                label="Password"
                placeholder="••••••••"
                type="password"
                value={form.password}
                onChange={updateField("password")}
                autoComplete={
                  isSignIn
                    ? "current-password"
                    : "new-password"
                }
              />

              {/* Status Banner */}
              {error && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm transition-all duration-300 ${
                    isSuccessMessage
                      ? "border-green-500/30 bg-green-500/10 text-green-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  {error}
                </div>
              )}

              {/* Submit Action */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                w-full
                rounded-xl
                bg-blue-600
                py-3
                text-sm
                font-semibold
                text-white
                transition-all
                duration-300
                hover:bg-blue-500
                hover:shadow-[0_0_35px_rgba(59,130,246,.45)]
                disabled:cursor-not-allowed
                disabled:opacity-60
                "
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg
                      className="h-5 w-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="opacity-25"
                      />

                      <path
                        fill="currentColor"
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>

                    {isSignIn
                      ? "Signing In..."
                      : "Creating Account..."}
                  </span>
                ) : (
                  <>
                    {isSignIn
                      ? "Continue to Dashboard"
                      : "Create account"}
                  </>
                )}
              </button>

              {/* Form Footer Switcher */}
              <div className="pt-1 text-center text-xs text-slate-400">
                {isSignIn ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setError("");
                      }}
                      className="font-medium text-blue-400 hover:text-blue-300"
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signin");
                        setError("");
                      }}
                      className="font-medium text-blue-400 hover:text-blue-300"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Auth;