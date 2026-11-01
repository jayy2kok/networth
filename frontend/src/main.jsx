import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './App.css'
import App from './App.jsx'
import { getInitialTheme } from './hooks/useTheme'

// Phase 4: Apply saved theme before first paint to prevent flash
;(function bootstrapTheme() {
  if (getInitialTheme() === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
