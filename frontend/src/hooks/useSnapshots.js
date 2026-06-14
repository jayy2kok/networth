import { useState, useEffect, useCallback } from 'react'
import { getSnapshots, takeSnapshot as apiTake } from '../services/dashboard'

/**
 * Phase 4: Hook for net-worth snapshot history.
 * Returns the list of snapshots used by the line chart,
 * plus a takeSnapshot() action and loading state.
 */
export function useSnapshots() {
  const [snapshots, setSnapshots] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [taking,    setTaking]    = useState(false)
  const [error,     setError]     = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getSnapshots()
      setSnapshots(data)
      setError(null)
    } catch (e) {
      console.error('Failed to load snapshots', e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const takeSnapshot = useCallback(async () => {
    setTaking(true)
    try {
      await apiTake()
      await load()   // reload list after taking snapshot
    } catch (e) {
      console.error('Failed to take snapshot', e)
    } finally {
      setTaking(false)
    }
  }, [load])

  return { snapshots, loading, taking, error, takeSnapshot, reload: load }
}
