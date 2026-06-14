import { useState, useEffect, useCallback } from 'react'

const THEME_KEY  = 'nw-theme'
const DARK_VAL   = 'dark'
const LIGHT_VAL  = 'light'

/** Reads the saved theme from localStorage, falling back to system preference. */
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === DARK_VAL || saved === LIGHT_VAL) return saved
  } catch (_) { /* storage blocked */ }
  // Fall back to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_VAL : LIGHT_VAL
}

/**
 * Phase 4: Theme hook.
 * Applies data-theme attribute on <html> and persists choice to localStorage.
 * Returns { theme: 'light'|'dark', isDark: boolean, toggleTheme, setTheme }
 */
export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme)

  // Apply theme to <html> whenever it changes
  useEffect(() => {
    const root = document.documentElement
    if (theme === DARK_VAL) {
      root.setAttribute('data-theme', DARK_VAL)
    } else {
      root.removeAttribute('data-theme')
    }
    try { localStorage.setItem(THEME_KEY, theme) } catch (_) { /* storage blocked */ }
  }, [theme])

  const setTheme = useCallback((t) => {
    if (t === DARK_VAL || t === LIGHT_VAL) setThemeState(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === DARK_VAL ? LIGHT_VAL : DARK_VAL)
  }, [])

  return { theme, isDark: theme === DARK_VAL, toggleTheme, setTheme }
}
