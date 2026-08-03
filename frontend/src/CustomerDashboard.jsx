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

  // profile editing
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
    if (activeTab === 'cart' && cart === null) loadCart()
    if (activeTab === 'orders' && orders.length === 0) loadOrders()
  }, [activeTab, cart, orders.length, loadCart, loadOrders])

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

  const handleCheckout = () => {
    setCartError('')
    axios
      .post(`${API_BASE}/catalog/checkout/`, {}, { headers: authHeaders() })
      .then(() => {
        setCart(null)
        setOrders([])
        setActiveTab('orders')
      })
      .catch((err) => setCartError(err.response?.data?.error || 'Checkout failed.'))
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#eef3fb] flex items-center justify-center">
        <p className="text-slate-600">Loading your dashboard…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#eef3fb] flex items-center justify-center">
        <p className="text-red-600 font-medium">{error}</p>
      </main>
    )
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'preferences', label: 'Preferences' },
  ]

  return (
    <main className="min-h-screen bg-[#eef3fb] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#2f5fa8]">NEXORA</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Welcome, {profile.first_name || profile.username}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-[#c3d7f0] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#e3edfa]"
          >
            Log out
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-2 border-b border-[#c3d7f0]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-[#2f5fa8] text-[#2f5fa8]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6 rounded-2xl border border-[#c3d7f0]/70 bg-white p-6 shadow-sm">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Account details</h2>
                {!isEditing && (
                  <button
                    onClick={handleStartEdit}
                    className="rounded-full border border-[#c3d7f0] px-4 py-1.5 text-xs font-semibold text-[#2f5fa8] transition hover:bg-[#e3edfa]"
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
                        className="mt-1 w-full rounded-lg border border-[#c3d7f0] px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2f5fa8] focus:ring-2 focus:ring-[#2f5fa8]/20"
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
                        className="mt-1 w-full rounded-lg border border-[#c3d7f0] px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2f5fa8] focus:ring-2 focus:ring-[#2f5fa8]/20"
                      />
                    </label>
                  </div>

                  {saveError && <p className="text-sm font-medium text-red-600">{saveError}</p>}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="rounded-full bg-[#2f5fa8] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1a3a66] disabled:opacity-60"
                    >
                      {savingProfile ? 'Saving…' : 'Save changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={savingProfile}
                      className="rounded-full border border-[#c3d7f0] px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-[#e3edfa]"
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
              <h2 className="text-lg font-semibold text-slate-900">Shopping preferences</h2>
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
                <p className="text-sm text-slate-500">No preferences set yet.</p>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Your orders</h2>

              {ordersLoading ? (
                <p className="mt-3 text-sm text-slate-500">Loading orders…</p>
              ) : ordersError ? (
                <p className="mt-3 text-sm text-red-600">{ordersError}</p>
              ) : orders.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  You have no orders yet. Once you check out, your orders will show up here.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-[#c3d7f0]/70 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Order #{order.id}</p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            order.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                      <div className="mt-3 space-y-1">
                        {order.items.map((item) => (
                          <p key={item.id} className="text-sm text-slate-700">
                            {item.quantity} × {item.product_name_snapshot} — Rs.{' '}
                            {(item.price_at_purchase * item.quantity).toLocaleString()}
                          </p>
                        ))}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[#1a3a66]">
                        Total: Rs. {order.total_amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'cart' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Your cart</h2>

              {cartLoading ? (
                <p className="mt-3 text-sm text-slate-500">Loading cart…</p>
              ) : cartError ? (
                <p className="mt-3 text-sm text-red-600">{cartError}</p>
              ) : !cart || cart.items.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Your cart is empty. Add products to see them here.
                </p>
              ) : (
                <div className="mt-4">
                  <div className="space-y-4">
                    {cart.items.map((item) => {
                      const imageUrl = item.product.image
                        ? item.product.image.startsWith('http')
                          ? item.product.image
                          : `${MEDIA_BASE}${item.product.image}`
                        : null
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 rounded-xl border border-[#c3d7f0]/70 p-3"
                        >
                          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[#e3edfa]">
                            {imageUrl && (
                              <img src={imageUrl} alt={item.product.product_name} className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {item.product.product_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Rs. {item.product.price_npr.toLocaleString()} each
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                className="h-6 w-6 rounded-full border border-[#c3d7f0] text-sm font-semibold text-slate-600 hover:bg-[#e3edfa]"
                              >
                                −
                              </button>
                              <span className="text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                className="h-6 w-6 rounded-full border border-[#c3d7f0] text-sm font-semibold text-slate-600 hover:bg-[#e3edfa]"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#1a3a66]">
                              Rs. {item.subtotal.toLocaleString()}
                            </p>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="mt-1 text-xs font-semibold text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[#c3d7f0] pt-4">
                    <p className="text-base font-semibold text-slate-900">
                      Total: Rs. {cart.total.toLocaleString()}
                    </p>
                    <button
                      onClick={handleCheckout}
                      className="rounded-full bg-[#2f5fa8] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a3a66]"
                    >
                      💳 Checkout
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
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}

export default CustomerDashboard
