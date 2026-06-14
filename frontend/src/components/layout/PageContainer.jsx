import { NavLink } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

const MOBILE_NAV = [
  { to: '/',            icon: '🏠', label: 'Home' },
  { to: '/investments', icon: '📈', label: 'Invest' },
  { to: '/assets',      icon: '🏛️', label: 'Assets' },
  { to: '/liabilities', icon: '💳', label: 'Loans' },
  { to: '/budget',      icon: '💰', label: 'Budget' },
]

export default function PageContainer({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <main className="page-content">
          {children}
        </main>
      </div>

      {/* Phase 4: Mobile bottom navigation */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {MOBILE_NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
          >
            <span className="mobile-nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
