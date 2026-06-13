import { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import Modal from '../components/common/Modal'
import * as profileApi from '../services/profile'
import { formatINR, formatPercent } from '../utils/formatCurrency'

const TYPES = ['REAL_ESTATE','VEHICLE','JEWELRY','GOLD','OTHER']
const BLANK = { name:'', type:'REAL_ESTATE', acquisitionCost:'', currentValue:'', currency:'INR' }

function typeBadge(t) {
  const m = { REAL_ESTATE:'real-estate', VEHICLE:'default', JEWELRY:'want', GOLD:'equity', OTHER:'default' }
  return `badge badge--${m[t]||'default'}`
}

export default function AssetsPage() {
  const { profile, loading, reload } = useProfile()
  const [modal,  setModal]  = useState({ open:false, item:null })
  const [form,   setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)

  const list = profile?.assets || []
  const totalAcq  = list.reduce((s,a) => s+(a.acquisitionCost||0), 0)
  const totalCurr = list.reduce((s,a) => s+(a.currentValueINR||a.currentValue||0), 0)
  const totalGain = totalCurr - totalAcq

  const openAdd  = ()     => { setForm(BLANK); setErr(null); setModal({open:true,item:null}) }
  const openEdit = (item) => {
    setForm({ name:item.name||'', type:item.type||'REAL_ESTATE',
      acquisitionCost:item.acquisitionCost??'', currentValue:item.currentValue??'',
      currency:item.currency||'INR' })
    setErr(null); setModal({open:true,item})
  }
  const close = () => setModal({open:false,item:null})

  const save = async () => {
    if (!form.name.trim()||!form.currentValue) return setErr('Name and current value are required')
    setSaving(true); setErr(null)
    try {
      const payload = { ...form, acquisitionCost:+form.acquisitionCost||0, currentValue:+form.currentValue }
      modal.item ? await profileApi.updateAsset(modal.item.id, payload)
                 : await profileApi.addAsset(payload)
      await reload(); close()
    } catch(e) { setErr(e.response?.data?.error||'Save failed') }
    finally    { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this asset?')) return
    try { await profileApi.deleteAsset(id); await reload() }
    catch { alert('Delete failed') }
  }

  if (loading) return <div className="empty-state"><div className="empty-desc">Loading…</div></div>

  return (
    <>
      <div className="stat-row">
        <div className="stat-pill"><div className="stat-pill-label">Acquisition Cost</div><div className="stat-pill-value">{formatINR(totalAcq)}</div></div>
        <div className="stat-pill"><div className="stat-pill-label">Current Value (INR)</div><div className="stat-pill-value">{formatINR(totalCurr)}</div></div>
        <div className="stat-pill">
          <div className="stat-pill-label">Appreciation</div>
          <div className={`stat-pill-value ${totalGain>=0?'text-gain':'text-loss'}`}>{formatINR(totalGain)}</div>
        </div>
        <div className="stat-pill"><div className="stat-pill-label">Assets</div><div className="stat-pill-value">{list.length}</div></div>
      </div>

      <div className="page-header">
        <div><div className="page-title">Assets</div><div className="page-meta">{list.length} {list.length===1?'entry':'entries'}</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Asset</button>
      </div>

      {list.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">🏠</div>
          <div className="empty-title">No assets yet</div>
          <div className="empty-desc">Add real estate, vehicles, jewellery, gold, and other physical assets.</div>
        </div></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>Name</th><th>Type</th><th>Acquisition Cost</th><th>Current Value (INR)</th>
              <th>Currency</th><th>Change %</th><th></th>
            </tr></thead>
            <tbody>
              {list.map(a => {
                const pct = a.percentChange || 0
                return (
                  <tr key={a.id}>
                    <td style={{fontWeight:600}}>{a.name}</td>
                    <td><span className={typeBadge(a.type)}>{a.type?.replace('_',' ')}</span></td>
                    <td>{formatINR(a.acquisitionCost)}</td>
                    <td>{formatINR(a.currentValueINR||a.currentValue)}</td>
                    <td style={{color:'var(--color-text-secondary)'}}>{a.currency}</td>
                    <td className={pct>=0?'text-gain':'text-loss'}>{formatPercent(pct)}</td>
                    <td><div className="actions-cell">
                      <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(a)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>del(a.id)}>Del</button>
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="table-footer">
            <span>Total assets: {list.length}</span>
            <span className="table-total">Current Value: {formatINR(totalCurr)}</span>
          </div>
        </div>
      )}

      <Modal open={modal.open} title={modal.item?'Edit Asset':'Add Asset'} onClose={close}>
        <div className="form-grid">
          <div className="form-field form-field--span2">
            <label className="form-label">Name *</label>
            <input className="form-input" placeholder="e.g. Ganga Kalash Flat" value={form.name}
              onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Type *</label>
            <select className="form-select" value={form.type}
              onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
              {TYPES.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Currency</label>
            <input className="form-input" placeholder="INR" value={form.currency} maxLength={3}
              onChange={e=>setForm(f=>({...f,currency:e.target.value.toUpperCase()}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Acquisition Cost</label>
            <input className="form-input" type="number" min="0" placeholder="0" value={form.acquisitionCost}
              onChange={e=>setForm(f=>({...f,acquisitionCost:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Current Value * (in {form.currency||'INR'})</label>
            <input className="form-input" type="number" min="0" placeholder="0" value={form.currentValue}
              onChange={e=>setForm(f=>({...f,currentValue:e.target.value}))} />
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
