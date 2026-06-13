import axios from 'axios'

/**
 * Axios instance for all API calls.
 * Base URL is /api — Nginx proxies to Spring Boot in Docker,
 * Vite dev server proxies when running locally.
 */
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  response => response,
  error => {
    const msg = error.response?.data?.error || error.message
    console.error(`[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} →`, msg)
    return Promise.reject(error)
  }
)

export default api
