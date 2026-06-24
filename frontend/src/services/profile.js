import api from './api'

export const getProfile      = ()          => api.get('/profile').then(r => r.data)

// Investments
export const addInvestment    = (data)      => api.post('/profile/investments', data).then(r => r.data)
export const updateInvestment = (id, data)  => api.put(`/profile/investments/${id}`, data).then(r => r.data)
export const deleteInvestment = (id)        => api.delete(`/profile/investments/${id}`).then(r => r.data)

// Assets
export const addAsset         = (data)      => api.post('/profile/assets', data).then(r => r.data)
export const updateAsset      = (id, data)  => api.put(`/profile/assets/${id}`, data).then(r => r.data)
export const deleteAsset      = (id)        => api.delete(`/profile/assets/${id}`).then(r => r.data)

// Liabilities
export const addLiability     = (data)      => api.post('/profile/liabilities', data).then(r => r.data)
export const updateLiability  = (id, data)  => api.put(`/profile/liabilities/${id}`, data).then(r => r.data)
export const deleteLiability  = (id)        => api.delete(`/profile/liabilities/${id}`).then(r => r.data)

// Incomes
export const addIncome        = (data)      => api.post('/profile/incomes', data).then(r => r.data)
export const updateIncome     = (id, data)  => api.put(`/profile/incomes/${id}`, data).then(r => r.data)
export const deleteIncome     = (id)        => api.delete(`/profile/incomes/${id}`).then(r => r.data)

// Expenses
export const addExpense       = (data)      => api.post('/profile/expenses', data).then(r => r.data)
export const updateExpense    = (id, data)  => api.put(`/profile/expenses/${id}`, data).then(r => r.data)
export const deleteExpense    = (id)        => api.delete(`/profile/expenses/${id}`).then(r => r.data)

// Mutual Funds — CAS Import
export const importCAS = (file, password) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('password', password)
  return api.post('/cas/import', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const getTransactions = (investmentId, type = 'ALL') =>
  api.get(`/investments/${investmentId}/transactions`, { params: { type } }).then(r => r.data)

export const refreshNav = () =>
  api.post('/investments/refresh-nav').then(r => r.data)
