import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './App.css'
import App from './App.jsx'

// Phase 4: Apply saved theme before first paint to prevent flash
;(function bootstrapTheme() {
  try {
    const saved = localStorage.getItem('nw-theme')
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  } catch (_) { /* storage unavailable */ }
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
