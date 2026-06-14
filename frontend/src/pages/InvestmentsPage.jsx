import { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import Modal from '../components/common/Modal'
import * as profileApi from '../services/profile'
import { formatINR, formatCompact, formatPercent } from '../utils/formatCurrency'

const TYPES = ['EQUITY','BONDS','DEBT','ETF','RETIRALS','FIXED_DEPOSITS','CASH_EQUIVALENT']
const CATS  = ['METALS','LIQUID','DOMESTIC','INTERNATIONAL']
const BLANK = { name:'', investmentType:'EQUITY', investedValue:'', currentValue:'', currency:'INR', categories:[] }

function typeBadge(t) {
  const m = { EQUITY:'equity', BONDS:'bonds', DEBT:'bonds', ETF:'etf', RETIRALS:'retirals', FIXED_DEPOSITS:'bonds', CASH_EQUIVALENT:'default' }
  return `badge badge--${m[t]||'default'}`
}

export default function InvestmentsPage() {
  const { profile, loading, reload } = useProfile()
  const [modal,  setModal]  = useState({ open:false, item:null })
  const [form,   setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)

  const list = profile?.investments || []
  const totalInvested = list.reduce((s,i) => s+(i.investedValue||0), 0)
  const totalCurrent  = list.reduce((s,i) => s+(i.currentValueINR||i.currentValue||0), 0)
  const totalGain     = totalCurrent - totalInvested
  const gainPct       = totalInvested > 0 ? (totalGain/totalInvested)*100 : 0

  const openAdd  = ()     => { setForm(BLANK); setErr(null); setModal({open:true,item:null}) }
  const openEdit = (item) => {
    setForm({ name:item.name||'', investmentType:item.investmentType||'EQUITY',
      investedValue:item.investedValue??'', currentValue:item.currentValue??'',
      currency:item.currency||'INR', categories:item.categories||[] })
    setErr(null); setModal({open:true,item})
  }
  const close = () => setModal({open:false,item:null})

  const toggle = (cat) => setForm(f => ({
    ...f, categories: f.categories.includes(cat)
      ? f.categories.filter(c=>c!==cat)
      : [...f.categories, cat]
  }))

  const save = async () => {
    if (!form.name.trim()||!form.investedValue||!form.currentValue)
      return setErr('Name, invested value and current value are required')
    setSaving(true); setErr(null)
    try {
      const payload = { ...form, investedValue:+form.investedValue, currentValue:+form.currentValue }
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

      <div className="page-header">
        <div><div className="page-title">Investments</div><div className="page-meta">{list.length} {list.length===1?'entry':'entries'}</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Investment</button>
      </div>

      {list.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">📈</div>
          <div className="empty-title">No investments yet</div>
          <div className="empty-desc">Add mutual funds, stocks, NPS, FDs and more to track your portfolio.</div>
        </div></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>Name</th><th>Type</th><th>Invested</th><th>Current (INR)</th>
              <th>Currency</th><th>Categories</th><th>Gain / Loss</th><th></th>
            </tr></thead>
            <tbody>
              {list.map(inv => {
                const gain = (inv.currentValueINR||inv.currentValue||0)-(inv.investedValue||0)
                const pct  = inv.investedValue ? (gain/inv.investedValue)*100 : 0
                return (
                  <tr key={inv.id}>
                    <td style={{fontWeight:600}}>{inv.name}</td>
                    <td><span className={typeBadge(inv.investmentType)}>{inv.investmentType}</span></td>
                    <td>{formatCompact(inv.investedValue, inv.currency)}</td>
                    <td>{formatINR(inv.currentValueINR||inv.currentValue)}</td>
                    <td style={{color:'var(--color-text-secondary)'}}>{inv.currency}</td>
                    <td><div style={{display:'flex',gap:'0.25rem',flexWrap:'wrap'}}>
                      {(inv.categories||[]).map(c=><span key={c} className="badge badge--default">{c}</span>)}
                    </div></td>
                    <td className={gain>=0?'text-gain':'text-loss'}>{formatINR(gain)} ({formatPercent(pct)})</td>
                    <td><div className="actions-cell">
                      <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(inv)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>del(inv.id)}>Del</button>
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal.open} title={modal.item?'Edit Investment':'Add Investment'} onClose={close}>
        <div className="form-grid">
          <div className="form-field form-field--span2">
            <label className="form-label">Name *</label>
            <input className="form-input" placeholder="e.g. Mutual funds" value={form.name}
              onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Type *</label>
            <select className="form-select" value={form.investmentType}
              onChange={e=>setForm(f=>({...f,investmentType:e.target.value}))}>
              {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Currency</label>
            <input className="form-input" placeholder="INR" value={form.currency} maxLength={3}
              onChange={e=>setForm(f=>({...f,currency:e.target.value.toUpperCase()}))} />
          </div>
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
            {saving?'Saving…':modal.item?'Update':'Add'}
          </button>
        </div>
      </Modal>
    </>
  )
}
