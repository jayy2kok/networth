import { useState, useEffect } from 'react'
import * as profileApi from '../../services/profile'
import { formatINR, formatCompact } from '../../utils/formatCurrency'

const TYPE_COLORS = {
  PURCHASE:              { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  PURCHASE_SIP:          { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  REDEMPTION:            { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  SWITCH_IN:             { bg: 'rgba(99,102,241,0.12)',  color: '#6366f1' },
  SWITCH_OUT:            { bg: 'rgba(251,146,60,0.12)',  color: '#fb923c' },
  DIVIDEND_PAYOUT:       { bg: 'rgba(34,211,238,0.12)', color: '#22d3ee' },
  DIVIDEND_REINVESTMENT: { bg: 'rgba(34,211,238,0.12)', color: '#22d3ee' },
  SEGREGATION:           { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  STAMP_DUTY_TAX:        { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  TDS_TAX:               { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  STT_TAX:               { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  MISC:                  { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  REVERSAL:              { bg: 'rgba(251,146,60,0.12)',  color: '#fb923c' },
}

const TYPE_LABELS = {
  ALL: 'All',
  PURCHASE: 'Purchase', PURCHASE_SIP: 'SIP',
  REDEMPTION: 'Redemption', SWITCH_IN: 'Switch In', SWITCH_OUT: 'Switch Out',
  DIVIDEND_PAYOUT: 'Dividend', DIVIDEND_REINVESTMENT: 'Div. Reinvest',
}

const FILTER_TYPES = ['ALL', 'PURCHASE', 'PURCHASE_SIP', 'REDEMPTION', 'SWITCH_IN', 'SWITCH_OUT', 'DIVIDEND_PAYOUT', 'DIVIDEND_REINVESTMENT']

/**
 * Transaction history drill-down modal for a mutual fund investment.
 * Props:
 *   open       — boolean
 *   investment — InvestmentEntry object (MFInvestment)
 *   onClose    — fn()
 */
export default function TransactionHistoryModal({ open, investment, onClose }) {
  const [txns, setTxns]       = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter]   = useState('ALL')
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!open || !investment?.id) return
    setLoading(true); setError(null); setFilter('ALL')
    profileApi.getTransactions(investment.id)
      .then(data => setTxns(data || []))
      .catch(() => setError('Failed to load transactions.'))
      .finally(() => setLoading(false))
  }, [open, investment?.id])

  const filteredTxns = filter === 'ALL'
    ? txns
    : txns.filter(t => t.type === filter)

  const totalPurchased = txns
    .filter(t => t.type === 'PURCHASE' || t.type === 'PURCHASE_SIP')
    .reduce((s, t) => s + (t.amount || 0), 0)

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose} id="txn-history-modal">
      <div className="modal" style={{ maxWidth: 760, width: '95vw' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">📜 Transaction History</div>
            {investment && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {investment.name}
                {investment.folio && <> &nbsp;•&nbsp; Folio: {investment.folio}</>}
                {investment.units != null && <> &nbsp;•&nbsp; {investment.units.toFixed(3)} units</>}
                {investment.latestNav != null && <> &nbsp;•&nbsp; NAV ₹{investment.latestNav.toFixed(4)}</>}
              </div>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '0 1.5rem 0.75rem' }}>
          {/* Type filter chips */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {FILTER_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: 20,
                  border: filter === t ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: filter === t ? 'var(--color-primary)' : 'transparent',
                  color: filter === t ? '#fff' : 'var(--color-text-secondary)',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {TYPE_LABELS[t] || t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state" style={{ padding: '3rem 0' }}>
              <div className="empty-desc">Loading transactions…</div>
            </div>
          ) : error ? (
            <div className="form-error">{error}</div>
          ) : filteredTxns.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 0' }}>
              <div className="empty-icon">📋</div>
              <div className="empty-title">No transactions</div>
              <div className="empty-desc">{filter !== 'ALL' ? `No ${TYPE_LABELS[filter] || filter} transactions found.` : 'No transactions found for this investment.'}</div>
            </div>
          ) : (
            <div className="table-wrap" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                    <th style={{ textAlign: 'right' }}>Units</th>
                    <th style={{ textAlign: 'right' }}>NAV</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.map((t, i) => {
                    const style = TYPE_COLORS[t.type] || TYPE_COLORS.MISC
                    return (
                      <tr key={t.id || i}>
                        <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          {t.date}
                        </td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.5rem', borderRadius: 4,
                            fontSize: '0.7rem', fontWeight: 700,
                            background: style.bg, color: style.color,
                            whiteSpace: 'nowrap',
                          }}>
                            {TYPE_LABELS[t.type] || t.type}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.description}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {t.amount != null ? formatINR(t.amount) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {t.units != null ? t.units.toFixed(3) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {t.nav != null ? t.nav.toFixed(4) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {t.balance != null ? t.balance.toFixed(3) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer summary */}
          {!loading && txns.length > 0 && (
            <div style={{
              display: 'flex', gap: '1rem', flexWrap: 'wrap',
              marginTop: '0.75rem', padding: '0.75rem 0',
              borderTop: '1px solid var(--color-border)',
              fontSize: '0.8125rem', color: 'var(--color-text-secondary)'
            }}>
              <span><strong style={{ color: 'var(--color-text)' }}>{filteredTxns.length}</strong> of {txns.length} transactions</span>
              {totalPurchased > 0 && (
                <span>Total purchased: <strong style={{ color: 'var(--color-text)' }}>{formatINR(totalPurchased)}</strong></span>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
