import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const dropdownRef = useRef(null);

  const [avatar, setAvatar] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load profile avatar
  useEffect(() => {
    const loadAvatar = () => {
      const savedAvatar = localStorage.getItem("user_avatar");
      setAvatar(savedAvatar || "");
    };

    loadAvatar();

    window.addEventListener("avatarUpdated", loadAvatar);
    window.addEventListener("storage", loadAvatar);

    return () => {
      window.removeEventListener("avatarUpdated", loadAvatar);
      window.removeEventListener("storage", loadAvatar);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // Check active navigation path
  const isActive = (path) => {
    if (
      path === "/homepage" &&
      (currentPath === "/homepage" || currentPath === "/")
    ) {
      return true;
    }

    return currentPath === path;
  };

  // Navigate and close dropdown
  const handleMenuClick = (path) => {
    setIsDropdownOpen(false);
    navigate(path);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-[#0B0F19]/90 text-slate-100 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">

        {/* Brand logo and name */}
        <div
          onClick={() => navigate("/homepage")}
          className="group flex cursor-pointer items-center gap-3"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#080C14] p-1 shadow-[0_0_18px_rgba(37,99,235,0.25)] transition-transform duration-300 group-hover:scale-105">
            <svg
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
            >
              <defs>
                <linearGradient
                  id="g-top"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    stopColor="#38BDF8"
                  />
                  <stop
                    offset="100%"
                    stopColor="#3B82F6"
                  />
                </linearGradient>

                <linearGradient
                  id="g-left"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    stopColor="#2563EB"
                  />
                  <stop
                    offset="100%"
                    stopColor="#1D4ED8"
                  />
                </linearGradient>

                <linearGradient
                  id="g-tray"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    stopColor="#1E40AF"
                  />
                  <stop
                    offset="100%"
                    stopColor="#172554"
                  />
                </linearGradient>
              </defs>

              <path
                d="M 50 10 L 82 28.5 L 82 38 L 65 28 L 50 19 L 28 32 L 28 68 L 50 81 L 72 68 L 72 52 L 48 52 L 48 42 L 82 42 L 82 74 L 50 92 L 18 74 L 18 26 Z"
                fill="url(#g-left)"
              />

              <path
                d="M 50 10 L 82 28.5 L 65 28 L 50 19 L 28 32 L 18 26 Z"
                fill="url(#g-top)"
              />

              <path
                d="M 48 42 L 82 42 L 72 52 L 48 52 Z"
                fill="url(#g-top)"
              />

              <path
                d="M 28 68 L 50 81 L 72 68 L 72 60 L 50 69 L 28 60 Z"
                fill="url(#g-tray)"
              />

              <circle
                cx="58"
                cy="73.5"
                r="1.2"
                fill="#93C5FD"
              />

              <circle
                cx="62"
                cy="71.2"
                r="1.2"
                fill="#93C5FD"
              />
            </svg>
          </div>

          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
            Gadget<span className="text-blue-500">Hub</span>
          </span>
        </div>

        {/* Navigation links */}
        <div className="flex items-center gap-8 text-sm font-semibold">

          {/* Home */}
          <button
            onClick={() => navigate("/homepage")}
            className={`relative py-1 transition-colors ${
              isActive("/homepage")
                ? "font-bold text-blue-500"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Home

            {isActive("/homepage") && (
              <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </button>

          {/* Orders */}
          <button
            onClick={() => navigate("/orders")}
            className={`relative py-1 transition-colors ${
              isActive("/orders")
                ? "font-bold text-blue-500"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Orders

            {isActive("/orders") && (
              <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </button>

          {/* Favorites */}
          <button
            onClick={() => navigate("/favorites")}
            className={`relative flex items-center gap-1.5 py-1 transition-colors ${
              isActive("/favorites")
                ? "font-bold text-blue-500"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <span className="text-base">
              ♥
            </span>

            Favorites

            {isActive("/favorites") && (
              <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </button>

          {/* Cart */}
          <button
            onClick={() => navigate("/customer-dashboard?tab=cart")}
            className={`relative py-1 transition-colors ${
              isActive("/cart") || isActive("/customer-dashboard")
                ? "font-bold text-blue-500"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Cart

            {isActive("/cart") && (
              <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </button>

          {/* My Account dropdown */}
          <div
            className="relative"
            ref={dropdownRef}
          >
            <button
              onClick={() =>
                setIsDropdownOpen(!isDropdownOpen)
              }
              className={`flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 transition-all ${
                isDropdownOpen || currentPath === "/account"
                  ? "border-blue-500 bg-blue-600/10 font-bold text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                  : "border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-500 hover:text-white"
              }`}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt="Profile"
                  className="h-6 w-6 rounded-full border border-blue-400/50 object-cover"
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4 text-blue-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.6-7.812-1.7a.75.75 0 01-.437-.695z"
                    clipRule="evenodd"
                  />
                </svg>
              )}

              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-4 w-4 transition-transform duration-200 ${
                  isDropdownOpen
                    ? "rotate-180 text-blue-400"
                    : "text-slate-400"
                }`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Account dropdown */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-800 bg-[#111827] py-2 text-sm shadow-2xl backdrop-blur-xl">

                {/* Profile */}
                <button
                  onClick={() =>
                    handleMenuClick("/account")
                  }
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-slate-200 transition hover:bg-blue-600/10 hover:text-blue-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 text-blue-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>

                  Profile
                </button>

                {/* Help */}
                <button
                  onClick={() =>
                    handleMenuClick("/help")
                  }
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-slate-200 transition hover:bg-blue-600/10 hover:text-blue-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 text-blue-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 1113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>

                  Help
                </button>

                {/* Policies */}
                <button
                  onClick={() =>
                    handleMenuClick("/policies")
                  }
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-slate-200 transition hover:bg-blue-600/10 hover:text-blue-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 text-blue-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>

                  Policies
                </button>

                {/* Feedback */}
                <button
                  onClick={() =>
                    handleMenuClick("/feedback")
                  }
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-slate-200 transition hover:bg-blue-600/10 hover:text-blue-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 text-blue-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm0 4a1 1 0 011-1h5a1 1 0 110 2H6a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>

                  Feedback
                </button>

              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}