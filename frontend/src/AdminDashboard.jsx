import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://127.0.0.1:8000/api'

function authHeaders() {
  const token = localStorage.getItem('access_token')
  return { Authorization: `Bearer ${token}` }
}

function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('sellers')

  const [customers, setCustomers] = useState([])
  const [sellers, setSellers] = useState([])
  const [orders, setOrders] = useState([])
  const [actionError, setActionError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/')
      return
    }

    axios
      .get(`${API_BASE}/auth/whoami/`, { headers: authHeaders() })
      .then((res) => {
        if (res.data.role !== 'admin') {
          navigate('/')
          return
        }
        loadAll()
      })
      .catch(() => setError('Could not verify your session. Please sign in again.'))
      .finally(() => setLoading(false))
  }, [navigate])

  const loadAll = useCallback(() => {
    axios.get(`${API_BASE}/auth/admin/customers/`, { headers: authHeaders() })
      .then((res) => setCustomers(res.data))
      .catch(() => {})

    axios.get(`${API_BASE}/auth/admin/sellers/`, { headers: authHeaders() })
      .then((res) => setSellers(res.data))
      .catch(() => {})

    axios.get(`${API_BASE}/catalog/admin/orders/`, { headers: authHeaders() })
      .then((res) => setOrders(res.data))
      .catch(() => {})
  }, [])

  const handleSellerAction = (sellerId, action) => {
    setActionError('')
    axios
      .post(`${API_BASE}/auth/sellers/${sellerId}/approve/`, { action }, { headers: authHeaders() })
      .then(() => loadAll())
      .catch(() => setActionError('Could not update seller status.'))
  }

  const handleDeleteUser = (userId, isSeller) => {
    if (!window.confirm(`Are you sure you want to delete this ${isSeller ? 'seller' : 'customer'}? This cannot be undone.`)) {
      return
    }
    setDeletingId(userId)
    setActionError('')
    axios
      .delete(`${API_BASE}/auth/admin/users/${userId}/delete/`, { headers: authHeaders() })
      .then(() => loadAll())
      .catch(() => setActionError('Could not delete this account.'))
      .finally(() => setDeletingId(null))
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-300">
        <p>Loading admin dashboard…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <p className="text-red-400 font-medium">{error}</p>
      </main>
    )
  }

  const pendingCount = sellers.filter((s) => s.verification_status === 'pending').length

  const tabs = [
    { id: 'sellers', label: `Sellers${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}` },
    { id: 'customers', label: 'Customers' },
    { id: 'orders', label: 'Orders' },
  ]

  return (
    <main className="relative min-h-screen bg-[#070b14] px-4 py-10 text-slate-100 sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(24,75,255,0.15),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(10,25,60,0.3),transparent_50%)] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-white">GADGETHUB</p>
            <h1 className="mt-1 text-3xl font-bold bg-gradient-to-r from-[#5182f6] via-[#a38bd2] to-[#f3a251] bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-slate-800 bg-[#0f172a]/80 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-700 hover:bg-[#1e293b]"
          >
            Log out
          </button>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Total Customers" value={customers.length} />
          <SummaryCard label="Total Sellers" value={sellers.length} />
          <SummaryCard label="Total Orders" value={orders.length} />
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-2 border-b border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-[#1d4ed8] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0c1322]/90 p-6 shadow-2xl backdrop-blur-xl">
          {actionError && <p className="mb-4 text-sm font-medium text-red-400">{actionError}</p>}

          {activeTab === 'sellers' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-white">Sellers</h2>
              {sellers.length === 0 ? (
                <p className="text-sm text-slate-400">No sellers registered yet.</p>
              ) : (
                <div className="space-y-3">
                  {sellers.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-[#11192e] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{s.business_name}</p>
                        <p className="text-xs text-slate-400">{s.username} · {s.contact_info || 'No contact info'}</p>
                        <p className="text-xs text-slate-500">
                          Joined {new Date(s.date_joined).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            s.verification_status === 'approved'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                              : s.verification_status === 'pending'
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                          }`}
                        >
                          {s.verification_status}
                        </span>
                        {s.verification_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleSellerAction(s.id, 'approve')}
                              className="rounded-full bg-[#1d4ed8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af] transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleSellerAction(s.id, 'reject')}
                              className="rounded-full border border-rose-800/80 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-900/50 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteUser(s.user_id || s.id, true)}
                          disabled={deletingId === (s.user_id || s.id)}
                          className="rounded-full border border-slate-700 bg-[#1a2137] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800/50 transition disabled:opacity-50"
                        >
                          {deletingId === (s.user_id || s.id) ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'customers' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-white">Customers</h2>
              {customers.length === 0 ? (
                <p className="text-sm text-slate-400">No customers registered yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Email</th>
                        <th className="pb-2">Joined</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {customers.map((c) => (
                        <tr key={c.id}>
                          <td className="py-3 font-medium text-white">{c.first_name || '—'}</td>
                          <td className="py-3 text-slate-300">{c.email || c.username}</td>
                          <td className="py-3 text-slate-400">{new Date(c.date_joined).toLocaleDateString()}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(c.id, false)}
                              disabled={deletingId === c.id}
                              className="rounded-full border border-slate-700 bg-[#1a2137] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800/50 transition disabled:opacity-50"
                            >
                              {deletingId === c.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-white">All Orders</h2>
              {orders.length === 0 ? (
                <p className="text-sm text-slate-400">No orders placed yet.</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-slate-800/80 bg-[#11192e] p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">
                          Order #{order.id} —{' '}
                          {order.items?.[0]?.product_name || 'No items'}
                          {order.items?.length > 1 && (
                            <span className="ml-1.5 font-normal text-slate-400">
                              +{order.items.length - 1} more
                            </span>
                          )}
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            order.status === 'paid'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                              : order.status === 'pending'
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Customer: {order.customer_name || order.customer_username} ·{' '}
                        {new Date(order.created_at).toLocaleString()}
                      </p>

                      {order.items?.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-slate-800/60 pt-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1">
                              <div>
                                <p className="text-slate-200 font-medium">{item.product_name}</p>
                                <p className="mt-0.5 text-slate-500">Qty: {item.quantity}</p>
                              </div>
                              {item.seller_business && (
                                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 font-semibold text-blue-300 border border-blue-500/20">
                                  {item.seller_business}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="mt-2 text-sm font-semibold text-[#60a5fa]">
                        Total: Rs. {order.total_amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#0c1322]/90 p-5 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

export default AdminDashboard