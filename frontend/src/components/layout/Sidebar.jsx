import { NavLink } from 'react-router-dom'

/*
 * Adapted from TailAdmin's app-layout/sidebar at revision
 * df1e9f37e56e0bf83030e8063f5353da2e0ecf18.
 * MIT License — Copyright (c) 2023 TailAdmin
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const MAIN_NAV = [
  { to: '/',            icon: 'dashboard', label: 'Dashboard', end: true },
  { to: '/investments', icon: 'chart', label: 'Investments' },
  { to: '/assets',      icon: 'home', label: 'Assets' },
  { to: '/liabilities', icon: 'card', label: 'Liabilities' },
  { to: '/budget',      icon: 'budget', label: 'Budget' },
]

const ACCOUNT_NAV = [
  { to: '/profile',  icon: 'user', label: 'Profile' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
]

const ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  chart: <><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 6-7" /></>,
  home: <><path d="m3 10 9-7 9 7v10H3z" /><path d="M9 20v-6h6v6" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
  budget: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h2m4 0h2M8 15h2m4 0h2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
}

export function NavIcon({ name }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>
}

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
            <span className="nav-icon"><NavIcon name={item.icon} /></span>
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
            <span className="nav-icon"><NavIcon name={item.icon} /></span>
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* User chip */}
      <div className="sidebar-footer">
        <NavLink to="/profile" className="user-chip" aria-label="Open profile for Dev User">
          <div className="user-avatar">D</div>
          <div className="user-info">
            <div className="user-name">Dev User</div>
          </div>
        </NavLink>
      </div>

    </nav>
  )
}
