import { useState, useEffect } from "react";
import axios from "axios";
import deviceImage from "./assets/Mobile.webp";
import smartphoneImage from "./assets/Mobile.webp"; // TODO: replace with a real Smartphone.png in src/assets
import laptopImage from "./assets/hero.png"; // TODO: replace with a real Laptop.png in src/assets
import { useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

// Input field component
function FloatingField({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
}) {
  return (
    <label className="block">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={label}
        className="w-full rounded-2xl border border-slate-700 bg-[#1A1D2E] px-4 py-3.5 text-sm text-white outline-none transition duration-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  );
}

// Popular category tile
function CategoryTile({ image, icon, label, count }) {
  return (
    <div className="group relative flex h-40 flex-col justify-end overflow-hidden rounded-2xl border border-slate-700/70 bg-[#111827]/60 p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-blue-500/40">
      {image ? (
        <>
          <img
            src={image}
            alt={label}
            className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-300 group-hover:scale-105 group-hover:opacity-85"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/25 via-[#16213F] to-amber-500/15" />
      )}

      <span className="relative flex flex-col gap-1.5">
        {icon && (
          <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur">
            {icon}
          </span>
        )}

        <span className="text-sm font-semibold text-white">
          {label}
        </span>

        {count && (
          <span className="text-xs font-medium text-blue-300">
            {count} listed
          </span>
        )}
      </span>
    </div>
  );
}

// Left section with Nexora branding, featured products and categories
function LeftSection() {
  const [carouselProducts, setCarouselProducts] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Fetch featured products from backend
  useEffect(() => {
    axios
      .get(`${API_BASE}/catalog/products/featured/`)
      .then((res) => {
        setCarouselProducts(res.data.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  // Change featured product every 2.5 seconds
  useEffect(() => {
    if (carouselProducts.length === 0) return;

    const timer = setInterval(() => {
      setCarouselIndex(
        (i) => (i + 1) % carouselProducts.length
      );
    }, 2500);

    return () => clearInterval(timer);
  }, [carouselProducts]);

  const current = carouselProducts[carouselIndex];

  // Get product image
  const currentImage = current?.image
    ? current.image.startsWith("http")
      ? current.image
      : `${MEDIA_BASE}${current.image}`
    : deviceImage;

  return (
    <section className="hidden lg:flex flex-col justify-center px-16">

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

        @keyframes smoothShimmer {
          0% {
            background-position: 0% 50%;
          }

          50% {
            background-position: 100% 50%;
          }

          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>

      {/* Nexora title */}
      <h1 className="flex text-[90px] leading-none font-black tracking-tight select-none">
        {"GadgetHub".split("").map((char, index) => (
          <span
            key={index}
            style={{
              animation: `ultraSmoothReveal 3s cubic-bezier(0.16, 1, 0.3, 1) ${
                index * 0.07
              }s forwards`,
              opacity: 0,
              willChange: "transform, opacity, filter",
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

      {/* Description */}
      <p className="mt-4 max-w-md text-base leading-7 text-slate-400">
        Verified smartphones and laptops, checked spec by spec — buy and sell
        with a marketplace built for tech.
      </p>

      {/* Spec badges */}
      <div className="mt-8 flex flex-wrap gap-3">
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

      {/* Statistics */}
      <div className="mt-8 grid max-w-md grid-cols-3 gap-6">
        <div>
          <h2 className="text-3xl font-bold">
            12,400+
          </h2>

          <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
            Devices Listed
          </p>
        </div>

        <div>
          <h2 className="text-3xl font-bold">
            98.2%
          </h2>

          <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
            On-Time Delivery
          </p>
        </div>

        <div>
          <h2 className="text-3xl font-bold">
            4.8/5
          </h2>

          <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
            Buyer Rating
          </p>
        </div>
      </div>

      {/* Featured product carousel */}
      <div className="relative mt-7 w-[340px] overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-br from-[#1D3363] via-[#16213F] to-[#111827] shadow-2xl">

        <img
          src={currentImage}
          alt={current?.product_name || "Featured device"}
          className="h-[190px] w-full object-cover opacity-80"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Previous and next buttons */}
        {carouselProducts.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setCarouselIndex(
                  (i) =>
                    (i - 1 + carouselProducts.length) %
                    carouselProducts.length
                )
              }
              className="absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-black/40 text-white backdrop-blur"
            >
              ❮
            </button>

            <button
              type="button"
              onClick={() =>
                setCarouselIndex(
                  (i) =>
                    (i + 1) % carouselProducts.length
                )
              }
              className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-black/40 text-white backdrop-blur"
            >
              ❯
            </button>
          </>
        )}

        {/* Featured product information */}
        <div className="absolute bottom-0 w-full p-6">

          <div className="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-300">
            🔥 Just launched
          </div>

          <h3 className="mt-4 text-3xl font-bold">
            {current?.product_name || "Loading…"}
          </h3>

          <p className="mt-2 text-lg text-white/90">
            {current
              ? `Rs ${current.price_npr?.toLocaleString()}`
              : ""}
          </p>

          {/* Carousel indicators */}
          <div className="mt-5 flex justify-end gap-2">
            {carouselProducts.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i === carouselIndex
                    ? "bg-white"
                    : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Popular categories */}
      <div className="mt-7 max-w-xl">

        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Popular categories
        </p>

        <div className="grid grid-cols-2 gap-4">

          <CategoryTile
            label="Smartphones"
            image={smartphoneImage}
            count="6,000+"
          />

          <CategoryTile
            label="Laptops"
            image={laptopImage}
            count="4,000+"
          />

        </div>
      </div>

    </section>
  );
}

// Authentication component
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

  // Handle login and registration
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      // Login
      if (isSignIn) {
        const response = await axios.post(
          `${API_BASE}/auth/login/`,
          {
            username: form.email,
            password: form.password,
          }
        );

        // Save authentication tokens
        localStorage.setItem(
          "access_token",
          response.data.access
        );

        localStorage.setItem(
          "refresh_token",
          response.data.refresh
        );

        // Get logged-in user's information
        const who = await axios.get(
          `${API_BASE}/auth/whoami/`,
          {
            headers: {
              Authorization: `Bearer ${response.data.access}`,
            },
          }
        );

        // Redirect seller
        if (who.data.role === "seller") {
          navigate(
            who.data.is_seller_profile_complete
              ? "/seller-dashboard"
              : "/seller-onboarding"
          );
        }

        // Redirect admin
        else if (who.data.role === "admin") {
          navigate("/admin-dashboard");
        }

        // Redirect customer
        else {
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
      }

      // Registration
      else {
        await axios.post(
          `${API_BASE}/auth/register/`,
          {
            username: form.email,
            email: form.email,
            password: form.password,
            role: role,
            name: form.name,
          }
        );

        // Move user to sign-in after registration
        setMode("signin");

        setError(
          `Welcome, ${
            form.name || "there"
          }! Your account is ready. Please sign in.`
        );
      }
    } catch (err) {
      // Show backend error
      const data = err.response?.data;

      const message =
        data?.detail ||
        (data && Object.values(data)[0]) ||
        "Something went wrong. Please try again.";

      setError(
        Array.isArray(message)
          ? message[0]
          : String(message)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update form fields
  const updateField = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  // Authentication page title
  const title = isSignIn
    ? "Welcome back"
    : "Create your account";

  // Authentication page description
  const copy = isSignIn
    ? "Use your email and password to continue securely."
    : "Create your account to get started with Nexora.";

  // Check if message is a success message
  const isSuccessMessage = error.startsWith("Welcome");

  return (
    <main className="relative min-h-screen overflow-hidden text-slate-100">

      {/* Background image */}
      <div className="absolute inset-0">

        <img
          src={deviceImage}
          alt="Smartphone and laptop showcase"
          className="h-full w-full object-cover object-[center_24%]"
        />

        {/* Dark background overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(10,13,24,0.92)_0%,rgba(17,24,39,0.85)_45%,rgba(30,41,59,0.65)_100%)]" />

        {/* Blue glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_35%)]" />

        {/* Orange glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.15),transparent_40%)]" />

      </div>

      {/* Grid background */}
      <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      {/* Main page layout */}
      <div className="relative grid min-h-screen lg:grid-cols-[1.12fr_0.88fr]">

        {/* Left section */}
        <LeftSection />

        {/* Authentication section */}
        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:-translate-x-8 lg:px-8 lg:py-0">

          <div className="mx-auto w-full max-w-[380px] rounded-[26px] border border-slate-700/60 bg-[#111827]/70 p-3 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 sm:p-4">

            <div className="rounded-[20px] border border-slate-700/50 bg-[#111827]/85 p-4 backdrop-blur-lg transition-all duration-300 sm:p-5">

              {/* Authentication header */}
              <div className="flex items-center justify-between gap-3 pb-5">

                <div className="flex items-center gap-3">

                  {/* Logo */}
                  <div className="h-11 w-11 rounded-2xl border border-slate-700 bg-[#1A1D2E] p-2 shadow-[0_0_24px_rgba(37,99,235,0.25)]">
                    <Logo />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Nexora
                    </p>
                  </div>

                </div>

                {/* Sign in and create account buttons */}
                <div className="flex rounded-full border border-slate-700 bg-[#1A1D2E] p-1">

                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      !isSignIn
                        ? "bg-blue-600 text-white"
                        : "text-slate-400"
                    }`}
                  >
                    Create Account
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setError("");
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      isSignIn
                        ? "bg-blue-600 text-white"
                        : "text-slate-400"
                    }`}
                  >
                    Sign In
                  </button>

                </div>

              </div>

              {/* Authentication form area */}
              <div className="flex min-h-[340px] items-center py-2">

                <div className="w-full space-y-6 transition-all duration-300 ease-out">

                  {/* Authentication title */}
                  <div className="space-y-3">

                    <h2 className="text-[1.75rem] font-semibold tracking-[-0.04em] text-white sm:text-[2rem]">
                      {title}
                    </h2>

                    <p className="text-sm leading-6 text-slate-400">
                      {copy}
                    </p>

                  </div>

                  {/* Authentication form */}
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >

                    {/* Signup fields */}
                    {!isSignIn && (
                      <>
                        {/* Customer or seller selection */}
                        <div className="flex rounded-full border border-slate-700 bg-[#1A1D2E] p-1">

                          <button
                            type="button"
                            onClick={() =>
                              setRole("customer")
                            }
                            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                              role === "customer"
                                ? "bg-blue-600 text-white"
                                : "text-slate-400"
                            }`}
                          >
                            I'm a Customer
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setRole("seller")
                            }
                            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                              role === "seller"
                                ? "bg-blue-600 text-white"
                                : "text-slate-400"
                            }`}
                          >
                            I'm a Seller
                          </button>

                        </div>

                        {/* Full name */}
                        <FloatingField
                          id="name"
                          label="Full Name"
                          value={form.name}
                          onChange={updateField("name")}
                          autoComplete="name"
                        />
                      </>
                    )}

                    {/* Email */}
                    <FloatingField
                      id="email"
                      label="Email"
                      type="text"
                      value={form.email}
                      onChange={updateField("email")}
                      autoComplete="email"
                    />

                    {/* Password */}
                    <FloatingField
                      id="password"
                      label="Password"
                      type="password"
                      value={form.password}
                      onChange={updateField("password")}
                      autoComplete={
                        isSignIn
                          ? "current-password"
                          : "new-password"
                      }
                    />

                    {/* Error or success message */}
                    {error && (
                      <p
                        className={`text-sm font-medium ${
                          isSuccessMessage
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {error}
                      </p>
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="relative mt-2 flex w-full items-center justify-center overflow-hidden rounded-2xl border border-blue-500/50 bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(37,99,235,0.35)] transition duration-300 hover:scale-[1.01] hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 disabled:opacity-60"
                    >

                      <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)] opacity-60 transition-transform duration-700 hover:translate-x-full" />

                      <span className="relative">
                        {isSubmitting
                          ? isSignIn
                            ? "Signing in…"
                            : "Creating your account…"
                          : isSignIn
                          ? "Continue to dashboard"
                          : "Create account"}
                      </span>

                      {/* Loading indicator */}
                      {isSubmitting && (
                        <span className="relative ml-3 h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
                      )}

                    </button>

                  </form>

                </div>

              </div>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

// Nexora logo
function Logo() {
  return (
    <svg
      viewBox="0 0 80 80"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        animation: "float 6s ease-in-out infinite",
      }}
    >

      <defs>
        <linearGradient
          id="nexoraNodeGradient"
          x1="12"
          y1="10"
          x2="68"
          y2="72"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFE7AE" />
          <stop
            offset="0.5"
            stopColor="#f4bb60"
          />
          <stop
            offset="1"
            stopColor="#B88942"
          />
        </linearGradient>
      </defs>

      <path
        d="M40 12L56 22L56 38L40 48L24 38L24 22L40 12Z"
        fill="url(#nexoraNodeGradient)"
        opacity="0.18"
      />

      <path
        d="M24 22L40 12L56 22L40 32L24 22Z"
        fill="url(#nexoraNodeGradient)"
      />

      <path
        d="M40 32L56 22V38L40 48V32Z"
        fill="url(#nexoraNodeGradient)"
        opacity="0.8"
      />

      <path
        d="M40 32L24 22V38L40 48V32Z"
        fill="url(#nexoraNodeGradient)"
        opacity="0.6"
      />

      <path
        d="M18 47L31 39L40 44L27 52L18 47Z"
        fill="url(#nexoraNodeGradient)"
        opacity="0.9"
      />

      <path
        d="M62 47L49 39L40 44L53 52L62 47Z"
        fill="url(#nexoraNodeGradient)"
        opacity="0.9"
      />

      <path
        d="M40 48L27 52L40 60L53 52L40 48Z"
        fill="url(#nexoraNodeGradient)"
      />

    </svg>
  );
}

export default Auth;