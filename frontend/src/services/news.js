import api from './api'

export const getNews    = ()               => api.get('/news').then(r => r.data)
export const setPinned  = (id, pinned)     => api.patch(`/news/${id}`, { pinned }).then(r => r.data)
export const refreshNews = ()              => api.post('/news/refresh').then(r => r.data)
