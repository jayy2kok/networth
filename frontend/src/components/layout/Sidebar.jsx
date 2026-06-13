import { NavLink } from 'react-router-dom'

const MAIN_NAV = [
  { to: '/',            icon: '⊞', label: 'Dashboard',   end: true },
  { to: '/investments', icon: '📈', label: 'Investments' },
  { to: '/assets',      icon: '🏠', label: 'Assets' },
  { to: '/liabilities', icon: '💳', label: 'Liabilities' },
  { to: '/budget',      icon: '📊', label: 'Budget' },
]

const ACCOUNT_NAV = [
  { to: '/profile',  icon: '👤', label: 'Profile' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function Sidebar() {
  return (
    <nav className="sidebar">

      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">₹</div>
        <div>
          <div className="sidebar-logo-name">NetWorth</div>
          <span className="sidebar-logo-tagline">Finance Tracker</span>
        </div>
      </div>

      {/* Main navigation */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Main</div>
        {MAIN_NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive ? 'nav-item active' : 'nav-item'
            }
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-divider" />

      {/* Account navigation */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Account</div>
        {ACCOUNT_NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? 'nav-item active' : 'nav-item'
            }
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* User chip */}
      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">D</div>
          <div className="user-info">
            <div className="user-name">Dev User</div>
            <div className="user-role">Phase 1 · Local</div>
          </div>
        </div>
      </div>

    </nav>
  )
}
