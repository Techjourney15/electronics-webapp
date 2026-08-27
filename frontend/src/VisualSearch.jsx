import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

function VisualSearch() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [userInitials, setUserInitials] = useState("U");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    axios
      .get(`${API}/auth/my-profile/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const name = res.data.first_name || res.data.username || "U";
        setUserInitials(name.slice(0, 2).toUpperCase());
      })
      .catch(() => {});
  }, []);

  // naya select gareko files lai purano list ma add garne, replace hoina
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
    setResults([]);
    setMessage("");

    // input clear garne, natra same file feri select garda onChange fire hudaina
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const clearAll = () => {
    setFiles([]);
    setPreviews([]);
    setResults([]);
    setMessage("");
  };

  const openCamera = async () => {
    setMessage("");
    setResults([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      setMessage("Could not access camera. Please check permissions.");
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const capturedFile = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      setFiles((prev) => [...prev, capturedFile]);
      setPreviews((prev) => [...prev, URL.createObjectURL(capturedFile)]);
      closeCamera();
    }, "image/jpeg", 0.9);
  };

  const handleSearch = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setMessage("");
    setResults([]);

    try {
      const allResponses = await Promise.all(
        files.map((file) => {
          const formData = new FormData();
          formData.append("image", file);
          return axios.post(`${API}/catalog/products/visual-search/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        })
      );

      const seen = new Set();
      const merged = [];
      for (const res of allResponses) {
        for (const p of res.data.results || []) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            merged.push(p);
          }
        }
      }

      if (merged.length > 0) {
        setResults(merged);
      } else {
        setMessage("No close matches found.");
      }
    } catch (err) {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0D18] text-slate-100 px-4 py-10 sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.12),transparent_34%)]" />
      <div className="relative mx-auto max-w-5xl">

        {/* Nav bar — Home, Cart, Orders, Profile/avatar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <span className="flex flex-shrink-0 items-center gap-2 text-sm font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-amber-500 text-white text-xs">N</span>
            Nexora
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/homepage")}
              className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-[#111827] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
              </svg>
              Home
            </button>

            <button
              onClick={() => navigate("/customer-dashboard?tab=orders")}
              className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-[#111827] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Orders
            </button>

            <button
              onClick={() => navigate("/customer-dashboard?tab=cart")}
              className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-[#111827] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m-10 0a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Cart
            </button>

            <button
              onClick={() => navigate("/customer-dashboard?tab=profile")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-xs font-bold text-white"
              title="Profile"
            >
              {userInitials}
            </button>

            <button
              onClick={handleLogout}
              className="rounded-full border border-slate-700/80 bg-[#111827]/60 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white mb-2">
          Search by Image
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          Upload one or more photos, or use your camera, to find visually similar products.
        </p>

        <div className="mb-8 rounded-[20px] border border-slate-700/60 bg-[#111827]/85 backdrop-blur-md p-6">
          {!cameraOpen && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="block text-sm text-slate-300 file:mr-3 file:rounded-lg file:border file:border-slate-700 file:bg-[#1A1D2E] file:px-3 file:py-1.5 file:text-slate-300 file:text-sm"
              />
              <span className="text-sm text-slate-500">or</span>
              <button
                onClick={openCamera}
                className="rounded-xl border border-slate-700 bg-[#1A1D2E] px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition"
              >
                📷 Use Camera
              </button>
              {files.length > 0 && (
                <button
                  onClick={clearAll}
                  className="rounded-xl border border-slate-700 bg-[#1A1D2E] px-4 py-2 text-sm font-semibold text-red-400 hover:bg-slate-800 transition"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {cameraOpen && (
            <div className="mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="mb-3 h-64 w-full max-w-md rounded-xl border border-slate-700 object-cover"
              />
              <div className="flex gap-3">
                <button
                  onClick={capturePhoto}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition"
                >
                  Capture Photo
                </button>
                <button
                  onClick={closeCamera}
                  className="rounded-xl border border-slate-700 bg-[#1A1D2E] px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {previews.length > 0 && !cameraOpen && (
            <div className="mb-4 flex flex-wrap gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt={`Selected ${i + 1}`}
                    className="h-28 w-28 rounded-xl object-cover border border-slate-700"
                  />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {!cameraOpen && (
            <button
              onClick={handleSearch}
              disabled={files.length === 0 || loading}
              className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition disabled:opacity-60"
            >
              {loading ? "Searching…" : `Search${files.length > 1 ? ` (${files.length} photos)` : ""}`}
            </button>
          )}

          {message && <p className="mt-4 text-sm text-slate-400">{message}</p>}
        </div>

        {results.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {results.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/product/${p.id}`)}
                className="cursor-pointer overflow-hidden rounded-2xl border border-slate-700/60 bg-[#111827] transition hover:-translate-y-1 hover:border-slate-600"
              >
                <div className="aspect-square w-full bg-[#1A1D2E]">
                  {p.image && (
                    <img
                      src={p.image.startsWith("http") ? p.image : `${MEDIA_BASE}${p.image}`}
                      alt={p.product_name}
                      className="h-full w-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold line-clamp-1 text-slate-100">{p.product_name}</p>
                  <p className="text-sm text-blue-400 font-semibold">Rs. {p.price_npr}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default VisualSearch;