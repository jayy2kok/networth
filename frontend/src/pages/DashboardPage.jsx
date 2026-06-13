import { useState, useRef } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { useDashboard } from '../hooks/useDashboard'
import { useUser }      from '../hooks/useUser'
import { formatINR, formatPercent } from '../utils/formatCurrency'
import * as userApi from '../services/user'

/* ── Palette ──────────────────────────────────────────────────────────────── */
const CAT_COLORS = {
  DOMESTIC:      '#3B82F6',
  INTERNATIONAL: '#8B5CF6',
  LIQUID:        '#10B981',
  METALS:        '#F59E0B',
}
const EXP_COLORS = { NEED: '#EF4444', WANT: '#F59E0B', SAVINGS: '#10B981' }

/* ── FIRE Gauge (half-circle SVG) ─────────────────────────────────────────── */
function FireGauge({ progress = 0 }) {
  const pct = Math.min(100, Math.max(0, progress || 0))
  const cx = 90, cy = 90, r = 66
  const angleRad = (180 - pct * 1.8) * Math.PI / 180
  const ex = cx + r * Math.cos(angleRad)
  const ey = cy - r * Math.sin(angleRad)
  const largeArc = pct > 50 ? 1 : 0
  const color = pct >= 100 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#D4A017'

  return (
    <svg viewBox="0 0 180 100" style={{ width: '100%', maxWidth: 220, display: 'block', margin: '0 auto' }}>
      <defs>
        <linearGradient id="fireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D4A017" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      {/* Track */}
      <path d="M 24 90 A 66 66 0 0 1 156 90"
        fill="none" stroke="var(--color-border)" strokeWidth="13" strokeLinecap="round" />
      {/* Progress arc */}
      {pct > 0.5 && (
        <path d={`M 24 90 A 66 66 0 ${largeArc} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`}
          fill="none" stroke="url(#fireGrad)" strokeWidth="13" strokeLinecap="round" />
      )}
      {/* Labels */}
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>
        {pct.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 7} textAnchor="middle" fontSize="9.5" fill="var(--color-text-secondary)"
        letterSpacing="0.05em" fontWeight="600">
        FIRE ACHIEVED
      </text>
    </svg>
  )
}

/* ── Tooltip formatters ────────────────────────────────────────────────────── */
const inrTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '0.5rem 0.875rem', fontSize: '0.8125rem', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
      <strong>{payload[0].name}</strong>: {formatINR(payload[0].value)}
    </div>
  )
}

/* ── Main Dashboard ────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { summary, loading, reload: reloadDash } = useDashboard()
  const { user, reload: reloadUser }              = useUser()
  const [editingRetAge, setEditingRetAge] = useState(false)
  const [retAgeInput,   setRetAgeInput]   = useState('')
  const [savingRetAge,  setSavingRetAge]  = useState(false)
  const retAgeRef = useRef(null)

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: '4rem' }}>
        <div className="empty-icon">⏳</div>
        <div className="empty-title">Calculating your wealth…</div>
      </div>
    )
  }
  if (!summary) return null

  const s = summary  // shorthand

  /* ── Inline retirement age edit ──────────────────────────────────────── */
  const startEditRetAge = () => {
    setRetAgeInput(String(s.retirementAge || 60))
    setEditingRetAge(true)
    setTimeout(() => retAgeRef.current?.select(), 30)
  }
  const saveRetAge = async () => {
    const newAge = parseInt(retAgeInput)
    if (!isNaN(newAge) && newAge >= 30 && newAge <= 80 && newAge !== s.retirementAge) {
      setSavingRetAge(true)
      try {
        const settings = user?.settings || {}
        await userApi.updateSettings({ ...settings, retirementAge: newAge })
        await reloadUser()
        await reloadDash()
      } catch (e) { console.error('Retirement age save failed', e) }
      finally { setSavingRetAge(false) }
    }
    setEditingRetAge(false)
  }

  /* ── Chart data ──────────────────────────────────────────────────────── */
  const catData = Object.entries(s.investmentByCategory || {})
    .map(([name, value]) => ({ name, value }))
    .filter(d => d.value > 0)

  const expData = Object.entries(s.expenseByCategory || {})
    .map(([name, value]) => ({ name, value }))
    .filter(d => d.value > 0)

  const hasInvestments = catData.length > 0
  const hasExpenses    = expData.length > 0

  /* ── Summary KPI row ─────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Primary KPI Cards ───────────────────────────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-card--networth">
          <div className="kpi-icon-bg">₹</div>
          <div className="kpi-label">Net Worth</div>
          <div className="kpi-value">{formatINR(s.netWorth)}</div>
          <div className="kpi-sub">
            Assets {formatINR(s.totalAssets)} – Liabilities {formatINR(s.totalLiabilities)}
          </div>
        </div>

        <div className="kpi-card kpi-card--income">
          <div className="kpi-icon-bg">📥</div>
          <div className="kpi-label">Annual Income</div>
          <div className="kpi-value">{formatINR(s.incomePA)}</div>
          <div className="kpi-sub">
            {formatINR(s.incomePA / 12)}/month
          </div>
        </div>

        <div className="kpi-card kpi-card--savings">
          <div className="kpi-icon-bg">💰</div>
          <div className="kpi-label">Annual Savings</div>
          <div className={`kpi-value ${s.savingsPA >= 0 ? '' : 'text-loss'}`}>{formatINR(s.savingsPA)}</div>
          <div className="kpi-sub">
            Rate: {s.savingsRate.toFixed(1)}% · EMI {formatINR(s.totalMonthlyEmi)}/mo
          </div>
        </div>

        <div className="kpi-card kpi-card--fire">
          <div className="kpi-icon-bg">🔥</div>
          <div className="kpi-label">FIRE Progress</div>
          <div className="kpi-value" style={{ color: '#8B5CF6' }}>{s.fireProgress.toFixed(1)}%</div>
          <div className="kpi-sub">
            {formatINR(s.netWorth)} / {formatINR(s.fireAmount)} target
          </div>
        </div>
      </div>

      {/* ── Secondary stat pills ─────────────────────────────────────────── */}
      <div className="stat-row">
        <div className="stat-pill">
          <div className="stat-pill-label">Liquid Assets</div>
          <div className="stat-pill-value">{formatINR(s.liquidAssets)}</div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-label">Runway</div>
          <div className={`stat-pill-value ${s.runwayYears < 1 ? 'text-loss' : s.runwayYears < 3 ? 'text-neutral' : 'text-gain'}`}>
            {s.runwayYears.toFixed(1)} yrs ({Math.round(s.runwayMonths)} mo)
          </div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-label">Emergency Fund ({formatINR(s.emergencyFundTarget)})</div>
          <div className={`stat-pill-value ${s.emergencySurplus >= 0 ? 'text-gain' : 'text-loss'}`}>
            {s.emergencySurplus >= 0 ? '+' : ''}{formatINR(s.emergencySurplus)}
          </div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-label">Investments</div>
          <div className="stat-pill-value">{formatINR(s.totalInvestments)}</div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-label">Real Estate</div>
          <div className="stat-pill-value">{formatINR(s.totalRealEstate)}</div>
        </div>
        {s.yearsToFire != null && (
          <div className="stat-pill">
            <div className="stat-pill-label">Years to FIRE</div>
            <div className="stat-pill-value">{s.yearsToFire.toFixed(1)} yrs</div>
          </div>
        )}
      </div>

      {/* ── Chart Grid 2×2 ───────────────────────────────────────────────── */}
      <div className="chart-grid">

        {/* ── Investment Allocation Pie ──────────────────────────────────── */}
        <div className="card">
          <div className="card-title">Investment Allocation</div>
          <div className="card-sub">METALS · LIQUID · DOMESTIC · INTERNATIONAL</div>
          {hasInvestments ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" outerRadius={80}
                  innerRadius={44} paddingAngle={3} dataKey="value">
                  {catData.map(entry => (
                    <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip content={inrTooltip} />
                <Legend
                  formatter={(name) => {
                    const d = catData.find(x => x.name === name)
                    const total = catData.reduce((a, x) => a + x.value, 0)
                    const pct   = total > 0 ? ((d?.value || 0) / total * 100).toFixed(1) : '0.0'
                    return `${name} ${pct}%`
                  }}
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: '0.75rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🥧</div>
              <div className="empty-title">No allocation data</div>
              <div className="empty-desc">Add investments and assign categories to see pie chart.</div>
            </div>
          )}
        </div>

        {/* ── Expense Breakdown Bar ─────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">Expense Breakdown</div>
          <div className="card-sub">Annual NEED / WANT / SAVINGS split</div>
          {hasExpenses ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={expData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                  tickFormatter={v => formatINR(v)} />
                <YAxis type="category" dataKey="name" width={68}
                  tick={{ fontSize: 12, fill: 'var(--color-text-secondary)', fontWeight: 600 }} />
                <Tooltip content={inrTooltip} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={32}>
                  {expData.map(entry => (
                    <Cell key={entry.name} fill={EXP_COLORS[entry.name] || '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-title">No expense data</div>
              <div className="empty-desc">Add expenses categorised as NEED, WANT, or SAVINGS.</div>
            </div>
          )}
        </div>

        {/* ── FIRE Progress Card ────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">F.I.R.E. Progress</div>
          <div className="card-sub">25× annual non-savings expenses</div>

          <FireGauge progress={s.fireProgress} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
            {[
              ['Net Worth',    formatINR(s.netWorth),    s.netWorth >= 0 ? 'text-gain' : 'text-loss'],
              ['FIRE Target',  formatINR(s.fireAmount),  ''],
              ['Still Need',   formatINR(s.fireDiff),    'text-loss'],
              ['Years to FIRE', s.yearsToFire != null ? `${s.yearsToFire.toFixed(1)} yrs` : '—', ''],
            ].map(([label, value, cls]) => (
              <div key={label} style={{ padding: '0.5rem 0.75rem', background: 'var(--color-surface-secondary)',
                borderRadius: '8px', fontSize: '0.8125rem' }}>
                <div style={{ color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                <div className={cls} style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Inline retirement age ──────────────────────────────────────── */}
          <div style={{ marginTop: '0.875rem', padding: '0.75rem', background: 'rgba(212,160,23,0.06)',
            border: '1px solid rgba(212,160,23,0.2)', borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Retire at:</span>
            {editingRetAge ? (
              <input
                ref={retAgeRef}
                type="number" min={30} max={80} value={retAgeInput}
                onChange={e => setRetAgeInput(e.target.value)}
                onBlur={saveRetAge}
                onKeyDown={e => { if (e.key === 'Enter') saveRetAge(); if (e.key === 'Escape') setEditingRetAge(false) }}
                style={{ width: 56, padding: '0.25rem 0.5rem', border: '1px solid var(--color-accent)',
                  borderRadius: 6, background: 'var(--color-surface-primary)',
                  color: 'var(--color-text-primary)', fontWeight: 700, fontSize: '0.9375rem', textAlign: 'center' }}
              />
            ) : (
              <button onClick={startEditRetAge}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--color-accent)' }}>
                  {savingRetAge ? '…' : s.retirementAge}
                </span>
                <span style={{ fontSize: '0.8125rem' }}>✏️</span>
              </button>
            )}
            {s.currentAge != null && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                · Age {s.currentAge}
                {s.retirementMonthsLeft != null && ` · ${Math.max(0, s.retirementMonthsLeft)} months left`}
              </span>
            )}
          </div>
        </div>

        {/* ── Net Worth Snapshot Placeholder (Phase 4) ──────────────────── */}
        <div className="card">
          <div className="card-title">Net Worth Over Time</div>
          <div className="card-sub">Monthly snapshot history</div>

          {/* Mini breakdown stats while no chart data */}
          <div style={{ display: 'grid', gap: '0.625rem', marginBottom: '1rem' }}>
            {[
              { label: '📈 Investments', value: s.totalInvestments,   cls: 'text-gain' },
              { label: '🏠 Real Estate', value: s.totalRealEstate,    cls: '' },
              { label: '🎒 Other Assets', value: s.totalAssetValue - s.totalRealEstate, cls: '' },
              { label: '💳 Liabilities', value: -s.totalLiabilities,  cls: 'text-loss' },
              { label: '🏦 Net Worth',   value: s.netWorth,           cls: s.netWorth >= 0 ? 'text-gain' : 'text-loss' },
            ].map(({ label, value, cls }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '0.5rem 0.75rem',
                background: 'var(--color-surface-secondary)', borderRadius: 8 }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{label}</span>
                <span className={cls} style={{ fontWeight: 700, fontSize: '0.875rem' }}>{formatINR(Math.abs(value))}</span>
              </div>
            ))}
          </div>

          <div className="empty-state" style={{ padding: '1rem 0.5rem' }}>
            <div className="empty-icon" style={{ fontSize: '1.5rem' }}>📈</div>
            <div className="empty-desc">Take monthly snapshots to track net worth over time. Coming in Phase 4.</div>
          </div>
        </div>

      </div>
    </>
  )
}
