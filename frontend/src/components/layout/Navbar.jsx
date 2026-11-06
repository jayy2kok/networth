import { useLocation, NavLink } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { NavIcon } from './Sidebar'

const PAGE_META = {
  '/':            { title: 'Dashboard',   sub: 'Net worth, FIRE progress & financial overview' },
  '/investments': { title: 'Investments', sub: 'Portfolio performance & allocation' },
  '/news':        { title: 'News Analyzer', sub: 'Portfolio news, evidence & 1–5 year hypotheses' },
  '/assets':      { title: 'Assets',      sub: 'Physical assets & real estate' },
  '/liabilities': { title: 'Liabilities', sub: 'Loans, EMIs & outstanding debt' },
  '/budget':      { title: 'Budget',      sub: 'Income, expenses & savings breakdown' },
  '/profile':     { title: 'Profile',     sub: 'Personal information' },
  '/settings':    { title: 'Settings',    sub: 'Financial parameters & preferences' },
}

export default function Navbar() {
  const { pathname } = useLocation()
  const { title, sub } = PAGE_META[pathname] ?? { title: 'NetWorth', sub: '' }
  const { isDark, toggleTheme } = useTheme()

  return (
    <header className="navbar">
      <div>
        <div className="navbar-page-title">{title}</div>
        {sub && <div className="navbar-page-sub">{sub}</div>}
      </div>

      <div className="navbar-spacer" />

      {/* Mobile-only profile/settings links (sidebar hidden on mobile) */}
      <div className="navbar-mobile-actions">
        <NavLink to="/profile" className={({isActive}) => `navbar-action-btn${isActive ? ' active' : ''}`} aria-label="Profile" title="Profile"><NavIcon name="user" /></NavLink>
        <NavLink to="/settings" className={({isActive}) => `navbar-action-btn${isActive ? ' active' : ''}`} aria-label="Settings" title="Settings"><NavIcon name="settings" /></NavLink>
      </div>

      {/* Phase 4: Theme toggle */}
      <button
        id="theme-toggle-btn"
        onClick={toggleTheme}
        className="theme-toggle-btn"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? '☀' : '☾'}
      </button>
    </header>
  )
}
