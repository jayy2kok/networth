import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ReferenceLine,
} from 'recharts'
import { useDashboard } from '../hooks/useDashboard'
import { useUser }      from '../hooks/useUser'
import { useSnapshots } from '../hooks/useSnapshots'
import { formatINR, formatPercent } from '../utils/formatCurrency'
import * as userApi from '../services/user'

/* ── Risk groupings ───────────────────────────────────────────────────────── */
const HIGH_RISK  = new Set(['EQUITY', 'ETF', 'CRYPTO'])
const LOW_RISK   = new Set(['RETIRALS', 'FIXED_DEPOSITS', 'BONDS', 'DEBT', 'CASH_EQUIVALENT'])
const STABLE     = new Set(['METALS'])

const RISK_COLORS = {
  'High Risk':  '#EF4444',
  'Low Risk':   '#3B82F6',
  'Stable':     '#F59E0B',
}

const EXP_COLORS  = { NEED: '#EF4444', WANT: '#F59E0B', SAVINGS: '#10B981' }
const DOM_COLORS  = { Domestic: '#3B82F6', International: '#8B5CF6' }

/* ── FIRE Gauge (half-circle SVG) ─────────────────────────────────────────── */
function FireGauge({ progress = 0 }) {
  const pct = Math.min(100, Math.max(0, progress || 0))
  const cx = 90, cy = 90, r = 66
  const angleRad = (180 - pct * 1.8) * Math.PI / 180
  const ex = cx + r * Math.cos(angleRad)
  const ey = cy - r * Math.sin(angleRad)
  const largeArc = 0
  const color = pct >= 100 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#D4A017'

  return (
    <svg viewBox="0 0 180 100" style={{ width: '100%', maxWidth: 220, display: 'block', margin: '0 auto' }}>
      <defs>
        <linearGradient id="fireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#D4A017" />
          <stop offset="60%"  stopColor="#F59E0B" />
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

/* ── Custom tooltip ────────────────────────────────────────────────────────── */
const inrTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '0.5rem 0.875rem', fontSize: '0.8125rem', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
      <strong>{payload[0].name}</strong>: {formatINR(payload[0].value)}
    </div>
  )
}

const pctTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const total = payload[0]?.payload?.total || 1
  const pct = ((payload[0].value / total) * 100).toFixed(1)
  return (
    <div style={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '0.5rem 0.875rem', fontSize: '0.8125rem', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
      <strong>{payload[0].name}</strong>: {formatINR(payload[0].value)} ({pct}%)
    </div>
  )
}

/* ── Pct Label inside bar ─────────────────────────────────────────────────── */
const PctBarLabel = ({ x, y, width, height, value, total }) => {
  if (!total || width < 40) return null
  const pct = ((value / total) * 100).toFixed(1)
  return (
    <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle"
      fontSize={11} fontWeight={700} fill="#fff" opacity={0.9}>
      {pct}%
    </text>
  )
}

/* ── Pie label ────────────────────────────────────────────────────────────── */
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700} fill="#fff">
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

/* ── Main Dashboard ────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { summary, loading, reload: reloadDash } = useDashboard()
  const { user, reload: reloadUser }              = useUser()
  const { snapshots, taking, takeSnapshot }        = useSnapshots()
  const [editingRetAge, setEditingRetAge] = useState(false)
  const [retAgeInput,   setRetAgeInput]   = useState('')
  const [savingRetAge,  setSavingRetAge]  = useState(false)
  const retAgeRef = useRef(null)
  const navigate  = useNavigate()

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: '4rem' }}>
        <div className="empty-icon">⏳</div>
        <div className="empty-title">Calculating your wealth…</div>
      </div>
    )
  }
  if (!summary) return null

  const s = summary

  /* ── Retirement age inline edit ─────────────────────────────────────── */
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

  /* ── Chart data ─────────────────────────────────────────────────────── */

  // 1) Domestic vs International (from investmentByCategory)
  const domTotal = (s.investmentByCategory?.DOMESTIC || 0) + (s.investmentByCategory?.INTERNATIONAL || 0)
  const domIntlData = domTotal > 0 ? [
    { name: 'Domestic',      value: s.investmentByCategory?.DOMESTIC      || 0, total: domTotal, fill: DOM_COLORS.Domestic },
    { name: 'International', value: s.investmentByCategory?.INTERNATIONAL || 0, total: domTotal, fill: DOM_COLORS.International },
  ].filter(d => d.value > 0) : []

  // 2) Risk breakdown from investmentByType
  const typeMap  = s.investmentByType || {}
  const highRisk = Object.entries(typeMap).filter(([k]) => HIGH_RISK.has(k)).reduce((a,[,v]) => a+v, 0)
  const lowRisk  = Object.entries(typeMap).filter(([k]) => LOW_RISK.has(k)).reduce((a,[,v]) => a+v, 0)
  const stable   = Object.entries(typeMap).filter(([k]) => STABLE.has(k)).reduce((a,[,v]) => a+v, 0)
  const riskTotal = highRisk + lowRisk + stable
  const riskData = [
    { name: 'High Risk', value: highRisk, total: riskTotal, fill: RISK_COLORS['High Risk'] },
    { name: 'Low Risk',  value: lowRisk,  total: riskTotal, fill: RISK_COLORS['Low Risk']  },
    { name: 'Stable',    value: stable,   total: riskTotal, fill: RISK_COLORS['Stable']    },
  ].filter(d => d.value > 0)

  // 3) Expense pie (NEED / WANT / SAVINGS)
  const expData = Object.entries(s.expenseByCategory || {})
    .map(([name, value]) => ({ name, value }))
    .filter(d => d.value > 0)
  const hasExpenses = expData.length > 0

  // 4) Snapshots data
  const snapshotChartData = snapshots.map(snap => ({
    date: snap.snapshotDate,
    netWorth: Math.round(snap.netWorth),
    assets: Math.round(snap.totalAssets),
    liabilities: Math.round(snap.totalLiabilities),
  }))

  return (
    <>
      {/* ── Primary KPI Cards ─────────────────────────────────────────────── */}
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
          <div className="kpi-sub">{formatINR(s.incomePA / 12)}/month</div>
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

      {/* ── Secondary stat pills ──────────────────────────────────────────── */}
      <div className="stat-row">

        {/* Total Liquidity — clickable → /investments?filter=LIQUID */}
        <div
          className="stat-pill stat-pill--clickable"
          onClick={() => navigate('/investments?filter=LIQUID')}
          title="Click to view liquid investments"
          id="total-liquidity-pill"
        >
          <div className="stat-pill-label">Total Liquidity 🔗</div>
          <div className="stat-pill-value text-gain">{formatINR(s.liquidAssets)}</div>
        </div>

        <div className="stat-pill">
          <div className="stat-pill-label">Runway (NEED only)</div>
          <div className={`stat-pill-value ${s.runwayYears < 1 ? 'text-loss' : s.runwayYears < 3 ? 'text-neutral' : 'text-gain'}`}>
            {s.runwayYears.toFixed(1)} yrs ({Math.round(s.runwayMonths)} mo)
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

        {/* Years to FIRE vs Retirement */}
        <div className="stat-pill stat-pill--dual">
          <div className="stat-pill-label">FIRE vs Retirement</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span className="stat-pill-value" style={{ fontSize: '0.9rem' }}>
              {s.yearsToFire != null ? `🔥 ${s.yearsToFire.toFixed(1)} yrs` : '🔥 —'}
            </span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>vs</span>
            <span className="stat-pill-value" style={{ fontSize: '0.9rem', color: 'var(--color-info)' }}>
              {s.yearsToRetirement != null ? `🏖️ ${s.yearsToRetirement.toFixed(1)} yrs` : '🏖️ —'}
            </span>
          </div>
        </div>

      </div>

      {/* ── Chart Grid Row 1: Dom/Intl + Risk Breakdown ───────────────────── */}
      <div className="chart-grid" style={{ marginBottom: '1rem' }}>

        {/* Chart 1: Domestic vs International Bar */}
        <div className="card">
          <div className="card-title">Investments: Domestic vs International</div>
          <div className="card-sub">Geographic allocation by current value</div>
          {domIntlData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={domIntlData} margin={{ left: 10, right: 20, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                  tickFormatter={v => formatINR(v)} width={68} />
                <Tooltip content={pctTooltip} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  {domIntlData.map(entry => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                  <PctBarLabel total={domTotal} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🌏</div>
              <div className="empty-title">No allocation data</div>
              <div className="empty-desc">Tag investments as DOMESTIC or INTERNATIONAL to see split.</div>
            </div>
          )}
          {domIntlData.length > 0 && (
            <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {domIntlData.map(d => (
                <span key={d.name} style={{ fontSize: '0.75rem', fontWeight: 600, color: d.fill, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, display: 'inline-block' }} />
                  {d.name} {domTotal > 0 ? ((d.value / domTotal) * 100).toFixed(1) : 0}%
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chart 2: Risk Breakdown Bar */}
        <div className="card">
          <div className="card-title">Investments: Risk Profile</div>
          <div className="card-sub">High risk · Low risk · Stable (by current value)</div>
          {riskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={riskData} margin={{ left: 10, right: 20, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                  tickFormatter={v => formatINR(v)} width={68} />
                <Tooltip content={pctTooltip} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  {riskData.map(entry => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                  <PctBarLabel total={riskTotal} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">⚖️</div>
              <div className="empty-title">No investment data</div>
              <div className="empty-desc">Add investments with types (EQUITY, BONDS, etc.) to see risk profile.</div>
            </div>
          )}
          {riskData.length > 0 && (
            <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {riskData.map(d => (
                <span key={d.name} style={{ fontSize: '0.75rem', fontWeight: 600, color: d.fill, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, display: 'inline-block' }} />
                  {d.name} {riskTotal > 0 ? ((d.value / riskTotal) * 100).toFixed(1) : 0}%
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Chart Grid Row 2: Expense Pie + FIRE Gauge ───────────────────── */}
      <div className="chart-grid" style={{ marginBottom: '1rem' }}>

        {/* Chart 3: Expense Pie */}
        <div className="card">
          <div className="card-title">Expense Breakdown</div>
          <div className="card-sub">Annual NEED / WANT / SAVINGS split</div>
          {hasExpenses ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={expData} cx="50%" cy="50%"
                  outerRadius={90} innerRadius={46}
                  paddingAngle={3} dataKey="value"
                  labelLine={false}
                  label={renderPieLabel}
                >
                  {expData.map(entry => (
                    <Cell key={entry.name} fill={EXP_COLORS[entry.name] || '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip content={inrTooltip} />
                <Legend
                  formatter={(name) => {
                    const d = expData.find(x => x.name === name)
                    const total = expData.reduce((a, x) => a + x.value, 0)
                    const pct = total > 0 ? ((d?.value || 0) / total * 100).toFixed(1) : '0.0'
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
              <div className="empty-title">No expense data</div>
              <div className="empty-desc">Add expenses categorised as NEED, WANT, or SAVINGS.</div>
            </div>
          )}
        </div>

        {/* Chart 4: FIRE Progress Gauge */}
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

          {/* Retirement age editor */}
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
      </div>

      {/* ── Chart 5: Net Worth Over Time (full width) ─────────────────────── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <div>
            <div className="card-title">Net Worth Over Time</div>
            <div className="card-sub">Monthly snapshot history</div>
          </div>
          <button
            id="take-snapshot-btn"
            onClick={takeSnapshot}
            disabled={taking}
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0, marginTop: '0.125rem' }}
          >
            {taking ? '⏳ Saving…' : '📸 Snapshot'}
          </button>
        </div>

        {snapshots.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={snapshotChartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                tickFormatter={d => {
                  if (!d) return ''
                  const parts = d.split('-')
                  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                  return `${months[parseInt(parts[1]) - 1] ?? ''} '${parts[0]?.slice(2) ?? ''}`
                }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                tickFormatter={v => {
                  if (Math.abs(v) >= 10000000) return `₹${(v/10000000).toFixed(1)}Cr`
                  if (Math.abs(v) >= 100000)   return `₹${(v/100000).toFixed(0)}L`
                  return `₹${(v/1000).toFixed(0)}K`
                }}
                width={62}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div style={{
                      background: 'var(--color-surface-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8, padding: '0.625rem 0.875rem',
                      fontSize: '0.8rem', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                      minWidth: 160,
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.375rem', color: 'var(--color-text-primary)' }}>{label}</div>
                      {payload.map(p => (
                        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem',
                          color: p.color, fontWeight: 600, marginBottom: 2 }}>
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{p.name}</span>
                          <span>{formatINR(p.value)}</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="netWorth" name="Net Worth"
                stroke="var(--color-accent)" strokeWidth={2.5} dot={{ r: 3.5, fill: 'var(--color-accent)' }}
                activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="assets" name="Total Assets"
                stroke="var(--color-success)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              <Line type="monotone" dataKey="liabilities" name="Liabilities"
                stroke="var(--color-danger)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.625rem', marginBottom: '1rem' }}>
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
            <div className="empty-state" style={{ padding: '0.75rem 0.5rem' }}>
              <div className="empty-icon" style={{ fontSize: '1.5rem' }}>📈</div>
              <div className="empty-title">No history yet</div>
              <div className="empty-desc">Click <strong>📸 Snapshot</strong> to record today's net worth. Take monthly snapshots to see trends over time.</div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
