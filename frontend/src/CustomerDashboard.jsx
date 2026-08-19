import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { useNavigate, useSearchParams } from 'react-router-dom'

const API_BASE = 'http://127.0.0.1:8000/api'
const MEDIA_BASE = 'http://127.0.0.1:8000'

function authHeaders() {
  const token = localStorage.getItem('access_token')
  return { Authorization: `Bearer ${token}` }
}

function CustomerDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile')

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ first_name: '', email: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [cart, setCart] = useState(null)
  const [cartLoading, setCartLoading] = useState(false)
  const [cartError, setCartError] = useState('')

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/')
      return
    }

    axios
      .get(`${API_BASE}/auth/my-profile/`, { headers: authHeaders() })
      .then((res) => {
        if (res.data.role !== 'customer') {
          navigate(res.data.role === 'seller' ? '/seller-dashboard' : '/')
          return
        }
        setProfile(res.data)
        setEditForm({ first_name: res.data.first_name || '', email: res.data.email || '' })
      })
      .catch(() => setError('Could not load your profile. Please sign in again.'))
      .finally(() => setLoading(false))
  }, [navigate])

  const loadCart = useCallback(() => {
    setCartLoading(true)
    setCartError('')
    axios
      .get(`${API_BASE}/catalog/cart/`, { headers: authHeaders() })
      .then((res) => setCart(res.data))
      .catch(() => setCartError('Could not load your cart.'))
      .finally(() => setCartLoading(false))
  }, [])

  const loadOrders = useCallback(() => {
    setOrdersLoading(true)
    setOrdersError('')
    axios
      .get(`${API_BASE}/catalog/orders/`, { headers: authHeaders() })
      .then((res) => setOrders(res.data))
      .catch(() => setOrdersError('Could not load your orders.'))
      .finally(() => setOrdersLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'cart') loadCart()
    if (activeTab === 'orders' && orders.length === 0) loadOrders()
  }, [activeTab])

  const handleStartEdit = () => {
    setEditForm({ first_name: profile.first_name || '', email: profile.email || '' })
    setSaveError('')
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setSaveError('')
  }

  const handleSaveProfile = () => {
    setSavingProfile(true)
    setSaveError('')
    axios
      .patch(`${API_BASE}/auth/update-profile/`, editForm, { headers: authHeaders() })
      .then((res) => {
        setProfile(res.data)
        setIsEditing(false)
      })
      .catch((err) => setSaveError(err.response?.data?.detail || 'Could not save changes.'))
      .finally(() => setSavingProfile(false))
  }

  const handleRemoveItem = (itemId) => {
    axios
      .delete(`${API_BASE}/catalog/cart/items/${itemId}/`, { headers: authHeaders() })
      .then((res) => setCart(res.data))
      .catch(() => setCartError('Could not remove that item.'))
  }

  const handleUpdateQuantity = (itemId, newQuantity) => {
    axios
      .patch(
        `${API_BASE}/catalog/cart/items/${itemId}/update/`,
        { quantity: newQuantity },
        { headers: authHeaders() }
      )
      .then((res) => setCart(res.data))
      .catch(() => setCartError('Could not update quantity.'))
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0D18] flex items-center justify-center">
        <p className="text-slate-400">Loading your dashboard…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0A0D18] flex items-center justify-center">
        <p className="text-red-400 font-medium">{error}</p>
      </main>
    )
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'cart', label: 'Cart' },
    { id: 'orders', label: 'Orders' },
  ]

  return (
    <main className="min-h-screen bg-[#0A0D18] px-4 py-10 sm:px-8 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.12),rgba(255,255,255,0))]">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest bg-gradient-to-r from-[#2563EB] via-[#F59E0B] to-[#FF5500] bg-clip-text text-transparent">NEXORA</p>
            <h1 className="mt-1 text-3xl font-bold text-white">
              Welcome, {profile.first_name || profile.username}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-red-500/40 bg-red-500/10 px-5 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 hover:border-red-500/60 hover:text-red-300"
          >
            Log out
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-8 inline-flex rounded-full border border-slate-700/60 bg-[#111827] p-1.5 shadow-inner">
          <button
            onClick={() => navigate('/homepage')}
            className="rounded-full px-5 py-2 text-sm font-semibold text-slate-400 transition-all hover:text-slate-200"
          >
            Home
          </button>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6 rounded-2xl border border-slate-700/60 bg-[#111827]/85 p-6 backdrop-blur-md shadow-xl">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100">Account details</h2>
                {!isEditing && (
                  <button
                    onClick={handleStartEdit}
                    className="rounded-full border border-slate-700 bg-[#1A1D2E] px-4 py-1.5 text-xs font-semibold text-blue-400 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    Edit profile
                  </button>
                )}
              </div>

              {!isEditing ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Full name" value={profile.first_name || '—'} />
                  <Field label="Email" value={profile.email || '—'} />
                  <Field label="Username" value={profile.username} />
                  <Field label="Role" value="Customer" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Full name
                      </span>
                      <input
                        type="text"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-[#1A1D2E] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Email
                      </span>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-[#1A1D2E] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>
                  </div>

                  {saveError && <p className="text-sm font-medium text-red-400">{saveError}</p>}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                    >
                      {savingProfile ? 'Saving…' : 'Save changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={savingProfile}
                      className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-100">Shopping preferences</h2>
              {profile.preferences ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Category" value={profile.preferences.category || '—'} />
                  <Field label="Priority" value={profile.preferences.priority_spec || '—'} />
                  <Field
                    label="Budget range"
                    value={
                      profile.preferences.min_price || profile.preferences.max_price
                        ? `Rs. ${profile.preferences.min_price ?? '0'} – Rs. ${profile.preferences.max_price ?? '∞'}`
                        : '—'
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-400">No preferences set yet.</p>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Your orders</h2>

              {ordersLoading ? (
                <p className="mt-3 text-sm text-slate-400">Loading orders…</p>
              ) : ordersError ? (
                <p className="mt-3 text-sm text-red-400">{ordersError}</p>
              ) : orders.length === 0 ? (
                <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/60 py-12 text-center">
                  <p className="text-3xl">🛍️</p>
                  <p className="mt-3 text-sm text-slate-400">
                    You have no orders yet. Once you check out, your orders will show up here.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {orders.map((order) => {
                    const statusStyle = getStatusStyle(order.status)
                    return (
                      <div
                        key={order.id}
                        className="flex overflow-hidden rounded-2xl border border-slate-700/60 bg-[#12151f] shadow-lg shadow-black/20 transition hover:border-slate-600"
                      >
                        {/* Left accent bar, colored by status */}
                        <div className={`w-1.5 flex-shrink-0 ${statusStyle.bar}`} />

                        <div className="flex-1">
                          {/* Header row */}
                          <div className="flex items-center justify-between px-5 py-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-base font-bold text-white">Order #{order.id}</p>
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusStyle.badge}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                                  {order.status}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {new Date(order.created_at).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-xl font-bold text-blue-400">
                              Rs. {order.total_amount.toLocaleString()}
                            </p>
                          </div>

                          {/* Items */}
                          <div className="space-y-2 border-t border-slate-800/70 px-5 py-4">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-sm">
                                <span className="text-slate-300">
                                  <span className="mr-2 text-slate-500">{item.quantity}×</span>
                                  {item.product_name_snapshot || 'Product'}
                                </span>
                                <span className="text-slate-500">
                                  Rs. {(item.price_at_purchase * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'cart' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Your cart</h2>

              {cartLoading ? (
                <p className="mt-3 text-sm text-slate-400">Loading cart…</p>
              ) : cartError ? (
                <p className="mt-3 text-sm text-red-400">{cartError}</p>
              ) : !cart || cart.items.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">
                  Your cart is empty. Add products to see them here.
                </p>
              ) : (
                <div className="mt-4">
                  <div className="space-y-4">
                    {cart.items.map((item) => {
                      const imageUrl = item.image
                        ? item.image.startsWith('http')
                          ? item.image
                          : `${MEDIA_BASE}${item.image}`
                        : null
                      return (
                        <div
                          key={item.item_id}
                          className="flex items-center gap-4 rounded-xl border border-slate-700/60 bg-[#1A1D2E] p-3"
                        >
                          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-900">
                            {imageUrl && (
                              <img src={imageUrl} alt={item.product_name} className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-100">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Rs. {item.price_npr.toLocaleString()} each
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateQuantity(item.item_id, item.quantity - 1)}
                                className="h-6 w-6 rounded-full border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                              >
                                −
                              </button>
                              <span className="text-sm font-medium text-slate-200">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item.item_id, item.quantity + 1)}
                                className="h-6 w-6 rounded-full border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-blue-400">
                              Rs. {item.subtotal.toLocaleString()}
                            </p>
                            <button
                              onClick={() => handleRemoveItem(item.item_id)}
                              className="mt-1 text-xs font-semibold text-red-400 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-700/60 pt-4">
                    <p className="text-base font-semibold text-white">
                      Total: Rs. {cart.total.toLocaleString()}
                    </p>
                    <button
                      onClick={() => navigate('/checkout')}
                      className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 shadow-lg shadow-blue-600/25"
                    >
                      💳 Proceed to Payment
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{value}</p>
    </div>
  )
}

function getStatusStyle(status) {
  switch (status) {
    case 'paid':
      return { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', bar: 'bg-emerald-500' }
    case 'pending':
      return { badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30', dot: 'bg-amber-300', bar: 'bg-amber-500' }
    default:
      return { badge: 'bg-red-500/10 text-red-400 border-red-500/30', dot: 'bg-red-400', bar: 'bg-red-500' }
  }
}

export default CustomerDashboard