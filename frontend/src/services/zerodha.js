import api from './api'

export const getZerodhaLoginUrl = () => api.get('/zerodha/login-url').then(r => r.data)
export const syncZerodhaPortfolio = requestToken => api.post('/zerodha/sync', { requestToken }).then(r => r.data)