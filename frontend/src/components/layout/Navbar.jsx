import { useLocation } from 'react-router-dom'

const PAGE_META = {
  '/':            { title: 'Dashboard',   sub: 'Net worth, FIRE progress & financial overview' },
  '/investments': { title: 'Investments', sub: 'Portfolio performance & allocation' },
  '/assets':      { title: 'Assets',      sub: 'Physical assets & real estate' },
  '/liabilities': { title: 'Liabilities', sub: 'Loans, EMIs & outstanding debt' },
  '/budget':      { title: 'Budget',      sub: 'Income, expenses & savings breakdown' },
  '/profile':     { title: 'Profile',     sub: 'Personal information' },
  '/settings':    { title: 'Settings',    sub: 'Financial parameters & preferences' },
}

export default function Navbar() {
  const { pathname } = useLocation()
  const { title, sub } = PAGE_META[pathname] ?? { title: 'NetWorth', sub: '' }

  return (
    <header className="navbar">
      <div>
        <div className="navbar-page-title">{title}</div>
        {sub && <div className="navbar-page-sub">{sub}</div>}
      </div>

      <div className="navbar-spacer" />

      <div className="phase-tag">
        <span>🚧</span>
        Phase 1 — Foundation
      </div>
    </header>
  )
}
