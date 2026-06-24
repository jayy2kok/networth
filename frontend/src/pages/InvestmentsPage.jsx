import { useState, useEffect } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useSearchParams } from 'react-router-dom'
import Modal from '../components/common/Modal'
import CasDropZone from '../components/common/CasDropZone'
import TransactionHistoryModal from '../components/common/TransactionHistoryModal'
import * as profileApi from '../services/profile'
import { formatINR, formatCompact, formatPercent } from '../utils/formatCurrency'
import useIsMobile from '../hooks/useIsMobile'
import MobileAccordionRow from '../components/common/MobileAccordionRow'

const TYPES = ['EQUITY','BONDS','DEBT','ETF','RETIRALS','FIXED_DEPOSITS','CASH_EQUIVALENT']
const CATS  = ['METALS','LIQUID','DOMESTIC','INTERNATIONAL']
const BLANK = { name:'', investmentType:'EQUITY', investedValue:'', currentValue:'', currency:'INR', categories:[] }

function typeBadge(t) {
  const m = { EQUITY:'equity', BONDS:'bonds', DEBT:'bonds', ETF:'etf', RETIRALS:'retirals', FIXED_DEPOSITS:'bonds', CASH_EQUIVALENT:'default' }
  return `badge badge--${m[t]||'default'}`
}

function NavBadge({ inv }) {
  if (inv.source !== 'CAS_IMPORT') return null
  return (
    <span title={inv.navDate ? `NAV: ₹${inv.latestNav?.toFixed(4)} as of ${inv.navDate}` : 'Live priced'}
      style={{
        display:'inline-flex', alignItems:'center', gap:'0.2rem',
        padding:'0.1rem 0.45rem', borderRadius:4,
        fontSize:'0.65rem', fontWeight:700,
        background:'rgba(99,102,241,0.12)', color:'#6366f1',
        marginLeft:'0.35rem', verticalAlign:'middle',
        cursor:'default'
      }}>
      ⚡ LIVE
    </span>
  )
}

export default function InvestmentsPage() {
  const isMobile = useIsMobile()
  const { profile, loading, reload } = useProfile()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modal,  setModal]  = useState({ open:false, item:null, casEdit:false })
  const [form,   setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || '')

  // CAS import state
  const [casOpen, setCasOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Transaction drill-down state
  const [txnModal, setTxnModal] = useState({ open: false, investment: null })

  // Sync filter from URL on mount
  useEffect(() => {
    const f = searchParams.get('filter') || ''
    setActiveFilter(f)
  }, [searchParams])

  const clearFilter = () => {
    setActiveFilter('')
    setSearchParams({})
  }

  const list = profile?.investments || []
  const filteredList = activeFilter
    ? list.filter(inv => (inv.categories || []).includes(activeFilter))
    : list
  const totalInvested = filteredList.reduce((s,i) => s+(i.investedValueINR||i.investedValue||0), 0)
  const totalCurrent  = filteredList.reduce((s,i) => s+(i.currentValueINR||i.currentValue||0), 0)
  const totalGain     = totalCurrent - totalInvested
  const gainPct       = totalInvested > 0 ? (totalGain/totalInvested)*100 : 0

  const openAdd  = ()     => { setForm(BLANK); setErr(null); setModal({open:true,item:null,casEdit:false}) }
  const openEdit = (item) => {
    const isCas = item.source === 'CAS_IMPORT'
    setForm({ name:item.name||'', investmentType:item.investmentType||'EQUITY',
      investedValue:item.investedValue??'', currentValue:item.currentValue??'',
      currency:item.currency||'INR', categories:item.categories||[] })
    setErr(null); setModal({open:true, item, casEdit:isCas})
  }
  const close = () => setModal({open:false,item:null,casEdit:false})

  const toggle = (cat) => setForm(f => ({
    ...f, categories: f.categories.includes(cat)
      ? f.categories.filter(c=>c!==cat)
      : [...f.categories, cat]
  }))

  const save = async () => {
    if (!modal.casEdit && (!form.name.trim()||!form.investedValue||!form.currentValue))
      return setErr('Name, invested value and current value are required')
    setSaving(true); setErr(null)
    try {
      let payload
      if (modal.casEdit) {
        // For CAS imports only type + categories are user-editable;
        // all other fields are managed by the import pipeline.
        payload = { ...modal.item, investmentType: form.investmentType, categories: form.categories }
      } else {
        payload = { ...form, investedValue:+form.investedValue, currentValue:+form.currentValue }
      }
      modal.item ? await profileApi.updateInvestment(modal.item.id, payload)
                 : await profileApi.addInvestment(payload)
      await reload(); close()
    } catch(e) { setErr(e.response?.data?.error||'Save failed') }
    finally    { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this investment?')) return
    try { await profileApi.deleteInvestment(id); await reload() }
    catch { alert('Delete failed') }
  }

  const handleRefreshNav = async () => {
    setRefreshing(true)
    try {
      const r = await profileApi.refreshNav()
      await reload()
      alert(`✅ ${r.message}`)
    } catch { alert('NAV refresh failed') }
    finally { setRefreshing(false) }
  }

  const hasCasInvestments = list.some(i => i.source === 'CAS_IMPORT')

  if (loading) return <div className="empty-state"><div className="empty-desc">Loading…</div></div>

  return (
    <>
      {/* Stats */}
      <div className="stat-row">
        <div className="stat-pill"><div className="stat-pill-label">Total Invested</div><div className="stat-pill-value">{formatINR(totalInvested)}</div></div>
        <div className="stat-pill"><div className="stat-pill-label">Current (INR)</div><div className="stat-pill-value">{formatINR(totalCurrent)}</div></div>
        <div className="stat-pill">
          <div className="stat-pill-label">Gain / Loss</div>
          <div className={`stat-pill-value ${totalGain>=0?'text-gain':'text-loss'}`}>
            {formatINR(totalGain)} ({formatPercent(gainPct)})
          </div>
        </div>
        <div className="stat-pill"><div className="stat-pill-label">Holdings</div><div className="stat-pill-value">{list.length}</div></div>
      </div>

      {activeFilter && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 0.875rem', marginBottom: '0.75rem',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '8px', fontSize: '0.8125rem',
        }}>
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>🔍 Filtered: {activeFilter}</span>
          <button onClick={clearFilter} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '1rem',
          }}>✕ Clear</button>
        </div>
      )}

      <div className="page-header">
        <div><div className="page-title">Investments</div><div className="page-meta">{filteredList.length} of {list.length} {list.length===1?'entry':'entries'}</div></div>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          {hasCasInvestments && (
            <button id="refresh-nav-btn" className="btn btn-ghost" onClick={handleRefreshNav} disabled={refreshing}>
              {refreshing ? '⏳ Refreshing…' : '🔄 Refresh NAV'}
            </button>
          )}
          <button id="import-cas-btn" className="btn btn-ghost" onClick={() => setCasOpen(true)}>
            📄 Import CAS
          </button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Investment</button>
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">📈</div>
          <div className="empty-title">{activeFilter ? `No ${activeFilter} investments` : 'No investments yet'}</div>
          <div className="empty-desc">{activeFilter ? `No investments tagged with ${activeFilter}.` : 'Add mutual funds, stocks, NPS, FDs and more — or import your CAS PDF for live NAV pricing.'}</div>
        </div></div>
      ) : isMobile ? (
        <div className="accordion-list">
          {filteredList.map(inv => {
            const invInr = inv.investedValueINR || inv.investedValue || 0
            const curInr = inv.currentValueINR || inv.currentValue || 0
            const gain = curInr - invInr
            const pct  = invInr ? (gain/invInr)*100 : 0
            const isCas = inv.source === 'CAS_IMPORT'
            return (
              <MobileAccordionRow
                key={inv.id}
                summaryLeft={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 600 }}>{inv.name}<NavBadge inv={inv} /></span>
                    <span className={typeBadge(inv.investmentType)} style={{ alignSelf: 'flex-start' }}>{inv.investmentType}</span>
                  </div>
                }
                summaryRight={<span>{formatINR(inv.currentValueINR||inv.currentValue)}</span>}
                actions={
                  <>
                    {isCas && inv.transactionsLinked && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setTxnModal({ open:true, investment:inv })}>📜 Txns</button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(inv)}>
                      {isCas ? '🏷️ Tags' : 'Edit'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={()=>del(inv.id)}>Del</button>
                  </>
                }
              >
                <span className="accordion-detail-label">Invested</span>
                <span>{formatCompact(inv.investedValue, inv.currency)}</span>

                <span className="accordion-detail-label">Current (INR)</span>
                <span>{formatINR(inv.currentValueINR||inv.currentValue)}</span>

                {isCas && inv.units != null && <>
                  <span className="accordion-detail-label">Units</span>
                  <span>{inv.units?.toFixed(3)}</span>
                  <span className="accordion-detail-label">Latest NAV</span>
                  <span>{inv.latestNav ? `₹${inv.latestNav.toFixed(4)}` : '—'}</span>
                </>}

                <span className="accordion-detail-label">Currency</span>
                <span>{inv.currency}</span>

                <span className="accordion-detail-label">Categories</span>
                <div style={{display:'flex',gap:'0.25rem',flexWrap:'wrap'}}>
                  {(inv.categories||[]).map(c=><span key={c} className="badge badge--default">{c}</span>)}
                </div>

                <span className="accordion-detail-label">Gain / Loss</span>
                <span className={gain>=0?'text-gain':'text-loss'}>{formatINR(gain)} ({formatPercent(pct)})</span>
              </MobileAccordionRow>
            )
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>Name</th><th>Type</th><th>Invested</th><th>Current (INR)</th>
              <th>Currency</th><th>Categories</th><th>Gain / Loss</th><th></th>
            </tr></thead>
            <tbody>
              {filteredList.map(inv => {
                const invInr = inv.investedValueINR || inv.investedValue || 0
                const curInr = inv.currentValueINR || inv.currentValue || 0
                const gain = curInr - invInr
                const pct  = invInr ? (gain/invInr)*100 : 0
                const isCas = inv.source === 'CAS_IMPORT'
                return (
                  <tr key={inv.id}>
                    <td style={{fontWeight:600}}>
                      {inv.name}<NavBadge inv={inv} />
                      {isCas && inv.amc && (
                        <div style={{ fontSize:'0.7rem', color:'var(--color-text-secondary)', marginTop:2 }}>{inv.amc}</div>
                      )}
                    </td>
                    <td><span className={typeBadge(inv.investmentType)}>{inv.investmentType}</span></td>
                    <td>{formatCompact(inv.investedValue, inv.currency)}</td>
                    <td>
                      {formatINR(inv.currentValueINR||inv.currentValue)}
                      {isCas && inv.navDate && (
                        <div style={{ fontSize:'0.7rem', color:'var(--color-text-secondary)' }}>
                          {inv.units?.toFixed(3)} units @ ₹{inv.latestNav?.toFixed(4)}
                        </div>
                      )}
                    </td>
                    <td style={{color:'var(--color-text-secondary)'}}>{inv.currency}</td>
                    <td><div style={{display:'flex',gap:'0.25rem',flexWrap:'wrap'}}>
                      {(inv.categories||[]).map(c=><span key={c} className="badge badge--default">{c}</span>)}
                    </div></td>
                    <td className={gain>=0?'text-gain':'text-loss'}>{formatINR(gain)} ({formatPercent(pct)})</td>
                    <td><div className="actions-cell">
                      {isCas && inv.transactionsLinked && (
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => setTxnModal({ open:true, investment:inv })}>
                          📜 Txns
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(inv)}>
                        {isCas ? '🏷️ Tags' : 'Edit'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={()=>del(inv.id)}>Del</button>
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Investment Modal */}
      <Modal open={modal.open} title={modal.casEdit ? '🏷️ Edit Type & Categories' : modal.item ? 'Edit Investment' : 'Add Investment'} onClose={close}>
        <div className="form-grid">

          {/* Name — read-only for CAS */}
          <div className="form-field form-field--span2">
            <label className="form-label">Name {!modal.casEdit && '*'}</label>
            <input className="form-input" placeholder="e.g. Mutual funds" value={form.name}
              readOnly={modal.casEdit}
              style={modal.casEdit ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
              onChange={e=>!modal.casEdit && setForm(f=>({...f,name:e.target.value}))} />
          </div>

          {/* Type — always editable */}
          <div className="form-field">
            <label className="form-label">Type *</label>
            <select className="form-select" value={form.investmentType}
              onChange={e=>setForm(f=>({...f,investmentType:e.target.value}))}>
              {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Currency — read-only for CAS */}
          <div className="form-field">
            <label className="form-label">Currency</label>
            <input className="form-input" placeholder="INR" value={form.currency} maxLength={3}
              readOnly={modal.casEdit}
              style={modal.casEdit ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
              onChange={e=>!modal.casEdit && setForm(f=>({...f,currency:e.target.value.toUpperCase()}))} />
          </div>

          {/* Invested / Current — hidden for CAS (NAV-managed) */}
          {!modal.casEdit && (
            <>
              <div className="form-field">
                <label className="form-label">Invested Value *</label>
                <input className="form-input" type="number" min="0" placeholder="0" value={form.investedValue}
                  onChange={e=>setForm(f=>({...f,investedValue:e.target.value}))} />
              </div>
              <div className="form-field">
                <label className="form-label">Current Value * (in {form.currency||'INR'})</label>
                <input className="form-input" type="number" min="0" placeholder="0" value={form.currentValue}
                  onChange={e=>setForm(f=>({...f,currentValue:e.target.value}))} />
              </div>
            </>
          )}

          {/* CAS info note */}
          {modal.casEdit && (
            <div className="form-field form-field--span2">
              <div style={{
                padding: '0.6rem 0.875rem', borderRadius: 8, fontSize: '0.8rem',
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                color: 'var(--color-text-secondary)'
              }}>
                ⚡ Values and units are managed automatically via live NAV. Only <strong>Type</strong> and <strong>Categories</strong> can be customised.
              </div>
            </div>
          )}

          {/* Categories — always editable */}
          <div className="form-field form-field--span2">
            <label className="form-label">Categories</label>
            <div className="categories-grid">
              {CATS.map(cat=>(
                <label key={cat} className={`category-check${form.categories.includes(cat)?' checked':''}`}>
                  <input type="checkbox" checked={form.categories.includes(cat)} onChange={()=>toggle(cat)} />
                  {cat}
                </label>
              ))}
            </div>
          </div>

        </div>
        {err && <div className="form-error">{err}</div>}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : modal.item ? 'Update' : 'Add'}
          </button>
        </div>
      </Modal>

      {/* CAS Import Modal */}
      <CasDropZone
        open={casOpen}
        onClose={() => setCasOpen(false)}
        onImported={() => reload()}
      />

      {/* Transaction History Modal */}
      <TransactionHistoryModal
        open={txnModal.open}
        investment={txnModal.investment}
        onClose={() => setTxnModal({ open:false, investment:null })}
      />
    </>
  )
}
