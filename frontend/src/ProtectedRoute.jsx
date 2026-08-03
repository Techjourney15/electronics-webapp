import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE = 'http://127.0.0.1:8000/api'

/**
 * Wraps a page and only renders it if the logged-in user's role
 * matches `allowedRole`. Otherwise redirects to the right place.
 *
 * Usage:
 *   <Route path="/customer-dashboard" element={
 *     <ProtectedRoute allowedRole="customer"><CustomerDashboard /></ProtectedRoute>
 *   } />
 */
function ProtectedRoute({ allowedRole, children }) {
  const [status, setStatus] = useState('checking') // checking | allowed | denied | unauthenticated
  const [redirectTo, setRedirectTo] = useState('/')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setStatus('unauthenticated')
      return
    }

    axios
      .get(`${API_BASE}/auth/whoami/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.role === allowedRole) {
          setStatus('allowed')
        } else {
          // logged in, but wrong role — send them to their own home
          setStatus('denied')
          if (res.data.role === 'seller') {
            setRedirectTo(res.data.is_seller_profile_complete ? '/seller-dashboard' : '/seller-onboarding')
          } else if (res.data.role === 'customer') {
            setRedirectTo('/homepage')
          } else if (res.data.role === 'admin') {
            setRedirectTo('/admin-dashboard')
          } else {
            setRedirectTo('/')
          }
        }
      })
      .catch(() => {
        // token invalid/expired
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setStatus('unauthenticated')
      })
  }, [allowedRole])

  if (status === 'checking') {
    return (
      <main className="min-h-screen bg-[#eef3fb] flex items-center justify-center">
        <p className="text-slate-600">Checking your session…</p>
      </main>
    )
  }

  if (status === 'unauthenticated' || status === 'denied') {
    return <Navigate to={redirectTo} replace />
  }

  return children
}

export default ProtectedRoute
