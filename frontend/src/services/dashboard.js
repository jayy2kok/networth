import api from './api'

export const getDashboardSummary = () => api.get('/dashboard/summary').then(r => r.data)

// Phase 4: Snapshot endpoints
export const getSnapshots  = () => api.get('/snapshots').then(r => r.data)
export const takeSnapshot  = () => api.post('/snapshots').then(r => r.data)
export const getLatestSnap = () => api.get('/snapshots/latest').then(r => r.data)
