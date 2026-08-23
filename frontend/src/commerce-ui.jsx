export const API_BASE = "http://127.0.0.1:8000/api"
export const MEDIA_BASE = "http://127.0.0.1:8000"

export function authHeaders() {
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function formatCurrency(value) {
  const amount = Number(value || 0)
  return `Rs. ${new Intl.NumberFormat("en-NP").format(amount)}`
}

export function mediaUrl(path) {
  if (!path) return null
  if (typeof path !== "string") return null
  if (path.startsWith("http")) return path
  return `${MEDIA_BASE}${path}`
}

export function productImage(product) {
  return mediaUrl(product?.image || product?.image_url || product?.image_filename)
}

export function commerceTone(status) {
  const tone = String(status || "").toLowerCase()
  if (["paid", "approved", "active", "verified"].includes(tone)) {
    return "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30"
  }
  if (["pending", "verifying", "processing"].includes(tone)) {
    return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30"
  }
  if (["failed", "cancelled", "rejected", "error"].includes(tone)) {
    return "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30"
  }
  return "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30"
}

export function CommerceBackdrop({ children, className = "" }) {
  return (
    <main className={`relative min-h-screen overflow-hidden bg-[#07111f] text-slate-50 ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,121,212,0.28),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(28,199,214,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(241,163,96,0.13),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:78px_78px]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {children}
      </div>
    </main>
  )
}

export function BrandMark({ compact = false }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? "" : ""}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/20 bg-white/10 shadow-[0_18px_50px_-20px_rgba(56,121,212,0.8)] backdrop-blur-xl">
        <svg viewBox="0 0 80 80" className="h-7 w-7" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="nexoraGlyph" x1="12" y1="10" x2="68" y2="72" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8ddcff" />
              <stop offset="0.5" stopColor="#4f87ff" />
              <stop offset="1" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          <path d="M40 12L56 22V38L40 48L24 38V22L40 12Z" fill="url(#nexoraGlyph)" opacity="0.2" />
          <path d="M24 22L40 12L56 22L40 32L24 22Z" fill="url(#nexoraGlyph)" />
          <path d="M40 32L56 22V38L40 48V32Z" fill="url(#nexoraGlyph)" opacity="0.82" />
          <path d="M40 32L24 22V38L40 48V32Z" fill="url(#nexoraGlyph)" opacity="0.56" />
          <path d="M18 47L31 39L40 44L27 52L18 47Z" fill="url(#nexoraGlyph)" opacity="0.86" />
          <path d="M62 47L49 39L40 44L53 52L62 47Z" fill="url(#nexoraGlyph)" opacity="0.86" />
          <path d="M40 48L27 52L40 60L53 52L40 48Z" fill="url(#nexoraGlyph)" />
        </svg>
      </div>
      <div>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-sky-200/80">Nexora</p>
        {!compact && <p className="text-sm text-slate-300">Electronics marketplace</p>}
      </div>
    </div>
  )
}

export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-sky-200/70">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Panel({ children, className = "" }) {
  return (
    <div className={`rounded-[28px] border border-white/10 bg-white/8 p-4 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-6 ${className}`}>
      {children}
    </div>
  )
}

export function MetricCard({ label, value, detail, tone = "sky" }) {
  const toneClass =
    tone === "warm"
      ? "border-amber-400/20 bg-amber-400/10"
      : tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-400/10"
      : tone === "violet"
      ? "border-violet-400/20 bg-violet-400/10"
      : "border-sky-400/20 bg-sky-400/10"

  return (
    <div className={`rounded-[24px] border p-4 ${toneClass} shadow-[0_20px_60px_-40px_rgba(8,15,31,0.8)]`}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-300/80">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{value}</p>
      {detail && <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>}
    </div>
  )
}

export function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] ${commerceTone(status)}`}>
      {status}
    </span>
  )
}

export function SearchBar({ value, onChange, onSubmit, onImageChange, imageLabel, placeholder = "Search phones, laptops, brands, specs..." }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="rounded-[28px] border border-white/10 bg-white/8 p-2 shadow-[0_20px_80px_-42px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        <div className="flex flex-col gap-2 rounded-[22px] border border-white/10 bg-[#0b1728]/90 px-4 py-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sky-200">⌕</span>
            <input
              type="text"
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
            />
          </div>

          <label className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
            <input type="file" accept="image/*" className="hidden" onChange={onImageChange} />
            <span>Image search</span>
            <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.2em] text-sky-200">
              Visual
            </span>
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#8ddcff_0%,#4f87ff_55%,#1e3a8a_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_-18px_rgba(79,135,255,0.95)] transition hover:brightness-110"
          >
            Search
          </button>
        </div>
      </div>
      {imageLabel && <p className="px-2 text-xs font-medium tracking-wide text-sky-100/70">Visual search ready: {imageLabel}</p>}
    </form>
  )
}

export function ProductCard({ product, onClick, accent = "sky" }) {
  const image = productImage(product)
  const accentClass =
    accent === "warm"
      ? "from-amber-400/30"
      : accent === "emerald"
      ? "from-emerald-400/30"
      : "from-sky-400/30"

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-[28px] border border-white/10 bg-white/8 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.9)] transition duration-300 hover:-translate-y-1 hover:border-sky-300/30 hover:bg-white/10"
    >
      <div className={`relative aspect-[4/4.5] overflow-hidden bg-[#0b1728] bg-gradient-to-br ${accentClass} to-transparent`}>
        {image ? (
          <img
            src={image}
            alt={product.product_name || product.name || "Product"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            onError={(event) => {
              event.currentTarget.style.display = "none"
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">No image</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(4,9,20,0.9))]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.category?.name && (
            <span className="rounded-full border border-white/10 bg-[#081120]/80 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-200 backdrop-blur-xl">
              {product.category.name}
            </span>
          )}
          {product.sub_category && (
            <span className="rounded-full border border-sky-300/20 bg-sky-400/12 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-sky-100 backdrop-blur-xl">
              {product.sub_category}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-1 text-sm font-semibold text-white">{product.product_name || product.name}</p>
            <p className="mt-1 line-clamp-1 text-xs uppercase tracking-[0.18em] text-slate-400">
              {product.brand?.name || product.brand_name || product.seller_name || product.model || "Electronics"}
            </p>
          </div>
          <p className="shrink-0 text-base font-semibold text-white">{formatCurrency(product.price_npr || product.price)}</p>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-slate-300">{product.description || "Premium electronics selected for the Nexora storefront."}</p>
        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
          <span>{product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of stock"}</span>
          <span className="text-sky-200">View details</span>
        </div>
      </div>
    </div>
  )
}

export function LineItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 p-8 text-center">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
