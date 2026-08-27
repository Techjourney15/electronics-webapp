import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar.jsx";

const API = "http://127.0.0.1:8000/api";

export default function AccountPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    avatar: "",
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...user });
  const [message, setMessage] = useState("");
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Retrieve saved avatar locally if available
    const savedAvatar = localStorage.getItem("user_avatar") || "";

    axios
      .get(`${API}/auth/whoami/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res.data;
        const profile = {
          name: data.name || data.username || "Customer",
          email: data.email || "",
          phone: data.phone || data.phone_number || "",
          address: data.address || "Kathmandu, Nepal",
          avatar: data.avatar || savedAvatar,
        };
        setUser(profile);
        setFormData(profile);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        // Handle 401 Unauthorized (expired or invalid token)
        if (err.response?.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          navigate("/login");
        }
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");
  };

  const handleSave = (e) => {
    e.preventDefault();
    setUser(formData);
    setIsEditing(false);
    setMessage("Profile updated successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result;
        const updatedUser = { ...user, avatar: base64Image };
        setUser(updatedUser);
        setFormData(updatedUser);
        
        // Save avatar locally and notify NavBar dynamically
        localStorage.setItem("user_avatar", base64Image);
        window.dispatchEvent(new Event("avatarUpdated"));

        setShowPhotoMenu(false);
        setMessage("Profile picture updated successfully!");
        setTimeout(() => setMessage(""), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    const updatedUser = { ...user, avatar: "" };
    setUser(updatedUser);
    setFormData(updatedUser);

    // Clear avatar locally and notify NavBar dynamically
    localStorage.removeItem("user_avatar");
    window.dispatchEvent(new Event("avatarUpdated"));

    setShowPhotoMenu(false);
    setMessage("Profile picture removed.");
    setTimeout(() => setMessage(""), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white">
        <NavBar />
        <div className="flex h-[70vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100">
      <NavBar />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">My Account</h1>
        

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            {message}
          </div>
        )}

        {/* Hidden File Input for Image Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* User Profile Card */}
          <div className="relative flex flex-col items-center rounded-2xl border border-slate-800 bg-[#111827] p-6 text-center shadow-xl">
            {/* Interactive Avatar Container */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-blue-500/50 bg-blue-600/20 text-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.25)] transition group-hover:border-blue-400"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-12 w-12"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.6-7.812-1.7a.75.75 0 01-.437-.695z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}

                {/* Camera Overlay Badge */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6 text-white"
                  >
                    <path
                      fillRule="evenodd"
                      d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </button>

              {/* Action Dropdown Menu */}
              {showPhotoMenu && (
                <div className="absolute top-28 left-1/2 z-20 w-48 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 py-2 shadow-2xl text-left text-xs">
                  <button
                    onClick={() => {
                      setShowPhotoMenu(false);
                      setIsEditing(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 text-blue-400"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Edit Profile Details
                  </button>
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="flex w-full items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 text-blue-400"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Upload / Change Photo
                  </button>
                  {user.avatar && (
                    <button
                      onClick={handleRemovePhoto}
                      className="flex w-full items-center gap-2 border-t border-slate-800 px-4 py-2 text-red-400 hover:bg-slate-800"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4 text-red-400"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Remove Photo
                    </button>
                  )}
                </div>
              )}
            </div>

            <h2 className="mt-4 text-xl font-bold text-white">Welcome,</h2>
            <p className="text-lg font-semibold text-blue-400">{user.name}</p>
            <p className="mt-1 text-xs text-slate-400">{user.email}</p>

            <button
              onClick={handleLogout}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-bold text-red-400 transition hover:bg-red-500 hover:text-white"
            >
              Logout
            </button>
          </div>

          {/* Detailed Customer Info */}
          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-xl md:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">Customer Information</h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-semibold text-blue-400 hover:underline"
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="mt-6 space-y-4 text-sm">
                <div>
                  <label className="block text-xs text-slate-400">Customer Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400">Saved Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500"
                >
                  Save Changes
                </button>
              </form>
            ) : (
              <div className="mt-6 space-y-5 text-sm">
                <div>
                  <p className="text-xs font-medium text-slate-500">Customer Name</p>
                  <p className="mt-0.5 font-semibold text-slate-100">{user.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Phone Number</p>
                  <p className="mt-0.5 font-semibold text-slate-100">
                    {user.phone || "+977 ----------"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Email Address</p>
                  <p className="mt-0.5 font-semibold text-slate-100">{user.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Saved Address</p>
                  <p className="mt-0.5 font-semibold text-slate-100">
                    {user.address || "Kathmandu, Nepal"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}