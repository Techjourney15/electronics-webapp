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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#eef3fb] flex items-center justify-center">
        <p className="text-slate-600">Loading admin dashboard…</p>
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

  const pendingCount = sellers.filter((s) => s.verification_status === 'pending').length

  const tabs = [
    { id: 'sellers', label: `Sellers${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}` },
    { id: 'customers', label: 'Customers' },
    { id: 'orders', label: 'Orders' },
  ]

  return (
    <main className="min-h-screen bg-[#eef3fb] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#2f5fa8]">NEXORA</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-[#c3d7f0] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#e3edfa]"
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

        <div className="mt-6 rounded-2xl border border-[#c3d7f0]/70 bg-white p-6 shadow-sm">
          {actionError && <p className="mb-4 text-sm font-medium text-red-600">{actionError}</p>}

          {activeTab === 'sellers' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Sellers</h2>
              {sellers.length === 0 ? (
                <p className="text-sm text-slate-500">No sellers registered yet.</p>
              ) : (
                <div className="space-y-3">
                  {sellers.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-3 rounded-xl border border-[#c3d7f0]/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{s.business_name}</p>
                        <p className="text-xs text-slate-500">{s.username} · {s.contact_info || 'No contact info'}</p>
                        <p className="text-xs text-slate-400">
                          Joined {new Date(s.date_joined).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            s.verification_status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : s.verification_status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {s.verification_status}
                        </span>
                        {s.verification_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleSellerAction(s.id, 'approve')}
                              className="rounded-full bg-[#2f5fa8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a3a66]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleSellerAction(s.id, 'reject')}
                              className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'customers' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Customers</h2>
              {customers.length === 0 ? (
                <p className="text-sm text-slate-500">No customers registered yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#c3d7f0]/70 text-xs uppercase tracking-wide text-slate-400">
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Email</th>
                        <th className="pb-2">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((c) => (
                        <tr key={c.id} className="border-b border-[#eef3fb]">
                          <td className="py-2 font-medium text-slate-900">{c.first_name || '—'}</td>
                          <td className="py-2 text-slate-600">{c.email || c.username}</td>
                          <td className="py-2 text-slate-500">{new Date(c.date_joined).toLocaleDateString()}</td>
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
              <h2 className="mb-4 text-lg font-semibold text-slate-900">All Orders</h2>
              {orders.length === 0 ? (
                <p className="text-sm text-slate-500">No orders placed yet.</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-[#c3d7f0]/70 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">
                          Order #{order.id} — {order.customer_name || order.customer_username}
                        </p>
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
                      <p className="mt-2 text-sm font-semibold text-[#1a3a66]">
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
    <div className="rounded-2xl border border-[#c3d7f0]/70 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

export default AdminDashboard
