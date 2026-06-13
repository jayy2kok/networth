import { useState, useEffect, useCallback } from 'react'
import { getMe } from '../services/user'

export function useUser() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getMe()
      setUser(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { user, loading, reload: load }
}
