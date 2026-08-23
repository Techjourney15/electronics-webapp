// api/axiosClient.js
import axios from 'axios'

const API_BASE = 'http://127.0.0.1:8000/api'

const axiosClient = axios.create({
  baseURL: API_BASE,
})

// Attach access token to every request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let refreshQueue = []

function resolveQueue(newToken) {
  refreshQueue.forEach((cb) => cb(newToken))
  refreshQueue = []
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    const isTokenError =
      error.response?.status === 401 &&
      error.response?.data?.code === 'token_not_valid'

    if (isTokenError && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // queue this request until the in-flight refresh finishes
        return new Promise((resolve, reject) => {
          refreshQueue.push((newToken) => {
            if (!newToken) return reject(error)
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(axiosClient(originalRequest))
          })
        })
      }

      isRefreshing = true
      try {
        const res = await axios.post(`${API_BASE}/token/refresh/`, {
          refresh: refreshToken,
        })
        const newAccessToken = res.data.access
        localStorage.setItem('access_token', newAccessToken)
        isRefreshing = false
        resolveQueue(newAccessToken)

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return axiosClient(originalRequest)
      } catch (refreshErr) {
        isRefreshing = false
        resolveQueue(null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/'
        return Promise.reject(refreshErr)
      }
    }

    return Promise.reject(error)
  }
)

export default axiosClient