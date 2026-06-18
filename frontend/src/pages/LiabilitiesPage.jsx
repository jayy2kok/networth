import { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import Modal from '../components/common/Modal'
import * as profileApi from '../services/profile'
import { formatINR } from '../utils/formatCurrency'
import useIsMobile from '../hooks/useIsMobile'
import MobileAccordionRow from '../components/common/MobileAccordionRow'

const TYPES      = ['HOME_LOAN','PERSONAL_LOAN','CAR_LOAN','EDUCATION_LOAN','OTHER']
const LOAN_TYPES = ['REGULAR','OD']
const BLANK = { name:'', type:'HOME_LOAN', outstandingAmount:'', emi:'', roi:'',
  loanType:'REGULAR', currency:'INR', firstEmiDate:'', tenureYears:'', remainingEmis:'' }

function typeBadge(t) {
  const m = { HOME_LOAN:'home-loan', PERSONAL_LOAN:'need', CAR_LOAN:'want', EDUCATION_LOAN:'equity', OTHER:'default' }
  return `badge badge--${m[t]||'default'}`
}

export default function LiabilitiesPage() {
  const isMobile = useIsMobile()
  const { profile, loading, reload } = useProfile()
  const [modal,  setModal]  = useState({ open:false, item:null })
  const [form,   setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)

  const list = profile?.liabilities || []
  const totalOut = list.reduce((s,l) => s+(l.outstandingAmount||0), 0)
  const totalEmi = list.reduce((s,l) => s+(l.emi||0), 0)

  const openAdd  = ()     => { setForm(BLANK); setErr(null); setModal({open:true,item:null}) }
  const openEdit = (item) => {
    setForm({ name:item.name||'', type:item.type||'HOME_LOAN',
      outstandingAmount:item.outstandingAmount??'', emi:item.emi??'', roi:item.roi??'',
      loanType:item.loanType||'REGULAR', currency:item.currency||'INR',
      firstEmiDate:item.firstEmiDate||'', tenureYears:item.tenureYears??'',
      remainingEmis:item.remainingEmis??'' })
    setErr(null); setModal({open:true,item})
  }
  const close = () => setModal({open:false,item:null})

  const save = async () => {
    if (!form.name.trim()||!form.outstandingAmount) return setErr('Name and outstanding amount are required')
    setSaving(true); setErr(null)
    try {
      const payload = {
        ...form,
        outstandingAmount: +form.outstandingAmount,
        emi:              form.emi       ? +form.emi       : null,
        roi:              form.roi       ? +form.roi       : null,
        tenureYears:      form.tenureYears  ? +form.tenureYears  : null,
        remainingEmis:    form.remainingEmis ? +form.remainingEmis : null,
        firstEmiDate:     form.firstEmiDate || null,
      }
      modal.item ? await profileApi.updateLiability(modal.item.id, payload)
                 : await profileApi.addLiability(payload)
      await reload(); close()
    } catch(e) { setErr(e.response?.data?.error||'Save failed') }
    finally    { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this loan?')) return
    try { await profileApi.deleteLiability(id); await reload() }
    catch { alert('Delete failed') }
  }

  const f = (v) => form[v]

  if (loading) return <div className="empty-state"><div className="empty-desc">Loading…</div></div>

  return (
    <>
      <div className="stat-row">
        <div className="stat-pill"><div className="stat-pill-label">Total Outstanding</div><div className="stat-pill-value text-loss">{formatINR(totalOut)}</div></div>
        <div className="stat-pill"><div className="stat-pill-label">Monthly EMI</div><div className="stat-pill-value text-loss">{formatINR(totalEmi)}</div></div>
        <div className="stat-pill"><div className="stat-pill-label">Annual EMI Outflow</div><div className="stat-pill-value text-loss">{formatINR(totalEmi*12)}</div></div>
        <div className="stat-pill"><div className="stat-pill-label">Active Loans</div><div className="stat-pill-value">{list.length}</div></div>
      </div>

      <div className="page-header">
        <div><div className="page-title">Liabilities</div><div className="page-meta">{list.length} {list.length===1?'loan':'loans'}</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Loan</button>
      </div>

      {list.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">💳</div>
          <div className="empty-title">No liabilities</div>
          <div className="empty-desc">Add home loans, car loans, personal loans and other debts.</div>
        </div></div>
      ) : isMobile ? (
        <div>
          <div className="accordion-list">
            {list.map(l => (
              <MobileAccordionRow
                key={l.id}
                summaryLeft={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 600 }}>{l.name}</span>
                    <span className={typeBadge(l.type)} style={{ alignSelf: 'flex-start' }}>{l.type?.replace(/_/g,' ')}</span>
                  </div>
                }
                summaryRight={<span className="text-loss">{formatINR(l.outstandingAmount)}</span>}
                actions={
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(l)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>del(l.id)}>Del</button>
                  </>
                }
              >
                <span className="accordion-detail-label">Outstanding</span>
                <span className="text-loss">{formatINR(l.outstandingAmount)}</span>

                <span className="accordion-detail-label">EMI / Month</span>
                <span>{l.emi ? formatINR(l.emi) : '—'}</span>

                <span className="accordion-detail-label">Interest Rate</span>
                <span>{l.roi != null ? `${l.roi}%` : '—'}</span>

                <span className="accordion-detail-label">Loan Type</span>
                <span className="badge badge--default" style={{alignSelf:'start'}}>{l.loanType}</span>

                <span className="accordion-detail-label">Remaining EMIs</span>
                <span>{l.remainingEmis ?? '—'}</span>
              </MobileAccordionRow>
            ))}
          </div>
          <div className="table-footer" style={{ borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', marginTop: '0.5rem' }}>
            <span>Total outstanding: <span className="table-total text-loss">{formatINR(totalOut)}</span></span>
            <span>Monthly EMI: <span className="table-total text-loss">{formatINR(totalEmi)}</span></span>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>Name</th><th>Type</th><th>Outstanding</th><th>EMI/mo</th>
              <th>ROI %</th><th>Loan Type</th><th>Rem. EMIs</th><th></th>
            </tr></thead>
            <tbody>
              {list.map(l => (
                <tr key={l.id}>
                  <td style={{fontWeight:600}}>{l.name}</td>
                  <td><span className={typeBadge(l.type)}>{l.type?.replace(/_/g,' ')}</span></td>
                  <td className="text-loss">{formatINR(l.outstandingAmount)}</td>
                  <td>{l.emi ? formatINR(l.emi) : '—'}</td>
                  <td>{l.roi != null ? `${l.roi}%` : '—'}</td>
                  <td><span className="badge badge--default">{l.loanType}</span></td>
                  <td>{l.remainingEmis ?? '—'}</td>
                  <td><div className="actions-cell">
                    <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(l)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>del(l.id)}>Del</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">
            <span>Total outstanding: <span className="table-total text-loss">{formatINR(totalOut)}</span></span>
            <span>Monthly EMI: <span className="table-total text-loss">{formatINR(totalEmi)}</span></span>
          </div>
        </div>
      )}

      <Modal open={modal.open} title={modal.item?'Edit Loan':'Add Loan'} onClose={close}>
        <div className="form-grid">
          <div className="form-field form-field--span2">
            <label className="form-label">Loan Name *</label>
            <input className="form-input" placeholder="e.g. Bank of India HL" value={f('name')}
              onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Type</label>
            <select className="form-select" value={f('type')} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
              {TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Loan Sub-type</label>
            <select className="form-select" value={f('loanType')} onChange={e=>setForm(p=>({...p,loanType:e.target.value}))}>
              {LOAN_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Outstanding Amount *</label>
            <input className="form-input" type="number" min="0" placeholder="0" value={f('outstandingAmount')}
              onChange={e=>setForm(p=>({...p,outstandingAmount:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">EMI / Month</label>
            <input className="form-input" type="number" min="0" placeholder="0" value={f('emi')}
              onChange={e=>setForm(p=>({...p,emi:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Interest Rate (%)</label>
            <input className="form-input" type="number" step="0.01" placeholder="7.25" value={f('roi')}
              onChange={e=>setForm(p=>({...p,roi:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Currency</label>
            <input className="form-input" placeholder="INR" value={f('currency')} maxLength={3}
              onChange={e=>setForm(p=>({...p,currency:e.target.value.toUpperCase()}))} />
          </div>
          <div className="form-field">
            <label className="form-label">First EMI Date</label>
            <input className="form-input" type="date" value={f('firstEmiDate')}
              onChange={e=>setForm(p=>({...p,firstEmiDate:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Tenure (years)</label>
            <input className="form-input" type="number" min="0" placeholder="20" value={f('tenureYears')}
              onChange={e=>setForm(p=>({...p,tenureYears:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Remaining EMIs</label>
            <input className="form-input" type="number" min="0" placeholder="233" value={f('remainingEmis')}
              onChange={e=>setForm(p=>({...p,remainingEmis:e.target.value}))} />
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
