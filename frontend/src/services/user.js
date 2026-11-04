import api from './api'

export const getMe         = ()     => api.get('/auth/me').then(r => r.data)
export const updateProfile = (data) => api.put('/users/profile', data).then(r => r.data)
export const updateSettings = (data) => api.put('/users/settings', data).then(r => r.data)
export const listMcpKeys = () => api.get('/mcp-keys').then(r => r.data)
export const createMcpKey = (data) => api.post('/mcp-keys', data).then(r => r.data)
export const revokeMcpKey = (id) => api.delete(`/mcp-keys/${id}`)
