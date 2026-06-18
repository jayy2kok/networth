import { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import Modal from '../components/common/Modal'
import * as profileApi from '../services/profile'
import { formatINR } from '../utils/formatCurrency'
import useIsMobile from '../hooks/useIsMobile'
import MobileAccordionRow from '../components/common/MobileAccordionRow'

const INCOME_SRCS = ['SALARY','RENTAL','FREELANCE','BUSINESS','OTHER']
const EXP_CATS   = ['NEED','WANT','SAVINGS']
const FREQS      = ['MONTHLY','YEARLY','QUARTERLY']

const BLANK_INC  = { source:'SALARY', amount:'', currency:'INR', frequency:'MONTHLY' }
const BLANK_EXP  = { name:'', category:'NEED', amount:'', frequency:'MONTHLY', currency:'INR', isProjected:true, includeInRunway:true, includeInFIRE:true }

function catBadge(c) { return `badge badge--${(c||'').toLowerCase()}` }
function srcBadge(s) {
  const m = { SALARY:'salary', RENTAL:'rental', FREELANCE:'equity', BUSINESS:'etf', OTHER:'default' }
  return `badge badge--${m[s]||'default'}`
}

export default function BudgetPage() {
  const isMobile = useIsMobile()
  const { profile, loading, reload } = useProfile()
  const [incModal, setIncModal] = useState({ open:false, item:null })
  const [expModal, setExpModal] = useState({ open:false, item:null })
  const [incForm,  setIncForm]  = useState(BLANK_INC)
  const [expForm,  setExpForm]  = useState(BLANK_EXP)
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState(null)

  const incomes  = profile?.incomes  || []
  const expenses = profile?.expenses || []

  // Summary calculations
  const annualMultiplier = freq => freq==='YEARLY'?1:freq==='QUARTERLY'?4:12
  const totalIncomePA  = incomes.reduce((s,i)  => s+(i.amountInr||0)*annualMultiplier(i.frequency),0)
  const totalExpensePA = expenses
    .filter(e => e.category !== 'SAVINGS')
    .reduce((s,e) => s+(e.annualAmountINR||0),0)
  const savingsPA      = totalIncomePA - totalExpensePA
  const savingsRate    = totalIncomePA>0 ? (savingsPA/totalIncomePA)*100 : 0

  // ── Income CRUD ──────────────────────────────────────────────────────────
  const openAddInc  = ()     => { setIncForm(BLANK_INC); setErr(null); setIncModal({open:true,item:null}) }
  const openEditInc = (item) => {
    setIncForm({ source:item.source||'SALARY', amount:item.amount??'', currency:item.currency||'INR', frequency:item.frequency||'MONTHLY' })
    setErr(null); setIncModal({open:true,item})
  }
  const closeInc = () => setIncModal({open:false,item:null})

  const saveInc = async () => {
    if (!incForm.amount) return setErr('Amount is required')
    setSaving(true); setErr(null)
    try {
      const payload = { ...incForm, amount:+incForm.amount }
      incModal.item ? await profileApi.updateIncome(incModal.item.id, payload)
                    : await profileApi.addIncome(payload)
      await reload(); closeInc()
    } catch(e) { setErr(e.response?.data?.error||'Save failed') }
    finally    { setSaving(false) }
  }

  const delInc = async (id) => {
    if (!confirm('Delete this income?')) return
    try { await profileApi.deleteIncome(id); await reload() }
    catch { alert('Delete failed') }
  }

  // ── Expense CRUD ─────────────────────────────────────────────────────────
  const openAddExp  = ()     => { setExpForm(BLANK_EXP); setErr(null); setExpModal({open:true,item:null}) }
  const openEditExp = (item) => {
    setExpForm({ name:item.name||'', category:item.category||'NEED', amount:item.amount??'',
      frequency:item.frequency||'MONTHLY', currency:item.currency||'INR', isProjected:item.isProjected!==false,
      includeInRunway: item.includeInRunway!==false, includeInFIRE: item.includeInFIRE!==false })
    setErr(null); setExpModal({open:true,item})
  }
  const closeExp = () => setExpModal({open:false,item:null})

  const saveExp = async () => {
    if (!expForm.name.trim()||!expForm.amount) return setErr('Name and amount are required')
    setSaving(true); setErr(null)
    try {
      const payload = { ...expForm, amount:+expForm.amount }
      expModal.item ? await profileApi.updateExpense(expModal.item.id, payload)
                    : await profileApi.addExpense(payload)
      await reload(); closeExp()
    } catch(e) { setErr(e.response?.data?.error||'Save failed') }
    finally    { setSaving(false) }
  }

  const delExp = async (id) => {
    if (!confirm('Delete this expense?')) return
    try { await profileApi.deleteExpense(id); await reload() }
    catch { alert('Delete failed') }
  }

  if (loading) return <div className="empty-state"><div className="empty-desc">Loading…</div></div>

  return (
    <>
      {/* Summary stats */}
      <div className="stat-row">
        <div className="stat-pill"><div className="stat-pill-label">Income PA</div><div className="stat-pill-value text-gain">{formatINR(totalIncomePA)}</div></div>
        <div className="stat-pill"><div className="stat-pill-label">Expenses PA</div><div className="stat-pill-value text-loss">{formatINR(totalExpensePA)}</div></div>
        <div className="stat-pill"><div className="stat-pill-label">Savings PA</div><div className={`stat-pill-value ${savingsPA>=0?'text-gain':'text-loss'}`}>{formatINR(savingsPA)}</div></div>
        <div className="stat-pill"><div className="stat-pill-label">Savings Rate</div><div className={`stat-pill-value ${savingsRate>=20?'text-gain':savingsRate>=10?'text-neutral':'text-loss'}`}>{savingsRate.toFixed(1)}%</div></div>
      </div>

      {/* ── INCOME section ─────────────────────────────────────────────────── */}
      <div className="section-header">
        <div className="section-title">💰 Income Sources</div>
        <button className="btn btn-primary btn-sm" onClick={openAddInc}>+ Add Income</button>
      </div>

      {incomes.length === 0 ? (
        <div className="card" style={{marginBottom:'1.5rem'}}><div className="empty-state">
          <div className="empty-icon">💼</div><div className="empty-title">No income sources</div>
          <div className="empty-desc">Add salary, rental income, freelance earnings, etc.</div>
        </div></div>
      ) : isMobile ? (
        <div style={{marginBottom:'1.5rem'}}>
          <div className="accordion-list">
            {incomes.map(inc => (
              <MobileAccordionRow
                key={inc.id}
                summaryLeft={<span className={srcBadge(inc.source)}>{inc.source}</span>}
                summaryRight={<span className="text-gain">{formatINR(inc.amountInr)}</span>}
                actions={
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={()=>openEditInc(inc)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>delInc(inc.id)}>Del</button>
                  </>
                }
              >
                <span className="accordion-detail-label">Amount</span>
                <span style={{fontWeight:600}}>{inc.amount?.toLocaleString()} {inc.currency}</span>
                
                <span className="accordion-detail-label">Frequency</span>
                <span className="badge badge--default" style={{alignSelf:'start'}}>{inc.frequency}</span>
                
                <span className="accordion-detail-label">Amount (INR)</span>
                <span className="text-gain">{formatINR(inc.amountInr)}</span>
              </MobileAccordionRow>
            ))}
          </div>
          <div className="table-footer" style={{ borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', marginTop: '0.5rem' }}>
            <span>Annual income</span>
            <span className="table-total text-gain">{formatINR(totalIncomePA)}</span>
          </div>
        </div>
      ) : (
        <div className="table-wrap" style={{marginBottom:'1.5rem'}}>
          <table className="data-table">
            <thead><tr>
              <th>Source</th><th>Amount</th><th>Currency</th><th>Frequency</th><th>Amount (INR)</th><th></th>
            </tr></thead>
            <tbody>
              {incomes.map(inc => (
                <tr key={inc.id}>
                  <td><span className={srcBadge(inc.source)}>{inc.source}</span></td>
                  <td style={{fontWeight:600}}>{inc.amount?.toLocaleString()}</td>
                  <td style={{color:'var(--color-text-secondary)'}}>{inc.currency}</td>
                  <td><span className="badge badge--default">{inc.frequency}</span></td>
                  <td className="text-gain">{formatINR(inc.amountInr)}</td>
                  <td><div className="actions-cell">
                    <button className="btn btn-ghost btn-sm" onClick={()=>openEditInc(inc)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>delInc(inc.id)}>Del</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">
            <span>Annual income</span>
            <span className="table-total text-gain">{formatINR(totalIncomePA)}</span>
          </div>
        </div>
      )}

      {/* ── EXPENSE section ────────────────────────────────────────────────── */}
      <div className="section-header">
        <div className="section-title">📊 Expenses</div>
        <button className="btn btn-primary btn-sm" onClick={openAddExp}>+ Add Expense</button>
      </div>

      {expenses.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">🧾</div><div className="empty-title">No expenses</div>
          <div className="empty-desc">Add monthly bills, EMIs, food, travel — categorise as NEED, WANT, or SAVINGS.</div>
        </div></div>
      ) : isMobile ? (
        <div style={{marginBottom:'1.5rem'}}>
          <div className="accordion-list">
            {expenses.map(exp => (
              <MobileAccordionRow
                key={exp.id}
                summaryLeft={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 600, display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
                      {exp.name}
                      {exp.includeInRunway === false && <span className="badge badge--default" style={{fontSize:'0.65rem'}}>No Runway</span>}
                      {exp.includeInFIRE === false && <span className="badge badge--default" style={{fontSize:'0.65rem'}}>No FIRE</span>}
                    </span>
                    <span className={catBadge(exp.category)} style={{ alignSelf: 'flex-start' }}>{exp.category}</span>
                  </div>
                }
                summaryRight={<span className="text-loss">{formatINR(exp.annualAmountINR)}</span>}
                actions={
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={()=>openEditExp(exp)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>delExp(exp.id)}>Del</button>
                  </>
                }
              >
                <span className="accordion-detail-label">Amount</span>
                <span>{exp.amount?.toLocaleString()} {exp.currency}</span>

                <span className="accordion-detail-label">Frequency</span>
                <span className="badge badge--default" style={{alignSelf:'start'}}>{exp.frequency}</span>

                <span className="accordion-detail-label">Monthly (INR)</span>
                <span>{formatINR(exp.monthlyAmountINR)}</span>

                <span className="accordion-detail-label">Annual (INR)</span>
                <span className="text-loss">{formatINR(exp.annualAmountINR)}</span>

                <span className="accordion-detail-label">Projected</span>
                <span>{exp.isProjected ? 'Yes' : 'No'}</span>
              </MobileAccordionRow>
            ))}
          </div>
          <div className="table-footer" style={{ borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', marginTop: '0.5rem' }}>
            <span>Annual expenses</span>
            <span className="table-total text-loss">{formatINR(totalExpensePA)}</span>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>Name</th><th>Category</th><th>Amount</th><th>Frequency</th>
              <th>Monthly (INR)</th><th>Annual (INR)</th><th>Proj?</th><th></th>
            </tr></thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp.id}>
                  <td style={{fontWeight:600}}>
                    {exp.name}
                    {exp.includeInRunway === false && <span className="badge badge--default" style={{marginLeft:'0.5rem',fontSize:'0.65rem'}}>No Runway</span>}
                    {exp.includeInFIRE === false && <span className="badge badge--default" style={{marginLeft:'0.5rem',fontSize:'0.65rem'}}>No FIRE</span>}
                  </td>
                  <td><span className={catBadge(exp.category)}>{exp.category}</span></td>
                  <td>{exp.amount?.toLocaleString()} {exp.currency}</td>
                  <td><span className="badge badge--default">{exp.frequency}</span></td>
                  <td>{formatINR(exp.monthlyAmountINR)}</td>
                  <td>{formatINR(exp.annualAmountINR)}</td>
                  <td style={{color:'var(--color-text-muted)',fontSize:'0.8125rem'}}>{exp.isProjected?'Yes':'No'}</td>
                  <td><div className="actions-cell">
                    <button className="btn btn-ghost btn-sm" onClick={()=>openEditExp(exp)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>delExp(exp.id)}>Del</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">
            <span>Annual expenses</span>
            <span className="table-total text-loss">{formatINR(totalExpensePA)}</span>
          </div>
        </div>
      )}

      {/* Income Modal */}
      <Modal open={incModal.open} title={incModal.item?'Edit Income':'Add Income'} onClose={closeInc}>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">Source</label>
            <select className="form-select" value={incForm.source} onChange={e=>setIncForm(f=>({...f,source:e.target.value}))}>
              {INCOME_SRCS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Frequency</label>
            <select className="form-select" value={incForm.frequency} onChange={e=>setIncForm(f=>({...f,frequency:e.target.value}))}>
              {FREQS.map(fr=><option key={fr} value={fr}>{fr}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Amount *</label>
            <input className="form-input" type="number" min="0" placeholder="0" value={incForm.amount}
              onChange={e=>setIncForm(f=>({...f,amount:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Currency</label>
            <input className="form-input" placeholder="INR" value={incForm.currency} maxLength={3}
              onChange={e=>setIncForm(f=>({...f,currency:e.target.value.toUpperCase()}))} />
          </div>
        </div>
        {err && <div className="form-error">{err}</div>}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={closeInc}>Cancel</button>
          <button className="btn btn-primary" onClick={saveInc} disabled={saving}>
            {saving?'Saving…':incModal.item?'Update':'Add'}
          </button>
        </div>
      </Modal>

      {/* Expense Modal */}
      <Modal open={expModal.open} title={expModal.item?'Edit Expense':'Add Expense'} onClose={closeExp}>
        <div className="form-grid">
          <div className="form-field form-field--span2">
            <label className="form-label">Expense Name *</label>
            <input className="form-input" placeholder="e.g. Home Loan EMI" value={expForm.name}
              onChange={e=>setExpForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Category</label>
            <select className="form-select" value={expForm.category} onChange={e=>setExpForm(f=>({...f,category:e.target.value}))}>
              {EXP_CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Frequency</label>
            <select className="form-select" value={expForm.frequency} onChange={e=>setExpForm(f=>({...f,frequency:e.target.value}))}>
              {FREQS.map(fr=><option key={fr} value={fr}>{fr}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Amount *</label>
            <input className="form-input" type="number" min="0" placeholder="0" value={expForm.amount}
              onChange={e=>setExpForm(f=>({...f,amount:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Currency</label>
            <input className="form-input" placeholder="INR" value={expForm.currency} maxLength={3}
              onChange={e=>setExpForm(f=>({...f,currency:e.target.value.toUpperCase()}))} />
          </div>
          <div className="form-field form-field--span2" style={{flexDirection:'row',alignItems:'center',gap:'0.625rem'}}>
            <input type="checkbox" id="projected" checked={expForm.isProjected}
              onChange={e=>setExpForm(f=>({...f,isProjected:e.target.checked}))} />
            <label htmlFor="projected" className="form-label" style={{marginBottom:0}}>Projected</label>
            <input type="checkbox" id="includeInRunway" checked={expForm.includeInRunway}
              onChange={e=>setExpForm(f=>({...f,includeInRunway:e.target.checked}))} style={{marginLeft:'1rem'}} />
            <label htmlFor="includeInRunway" className="form-label" style={{marginBottom:0}}>Include in Runway</label>
            <input type="checkbox" id="includeInFIRE" checked={expForm.includeInFIRE}
              onChange={e=>setExpForm(f=>({...f,includeInFIRE:e.target.checked}))} style={{marginLeft:'1rem'}} />
            <label htmlFor="includeInFIRE" className="form-label" style={{marginBottom:0}}>Include in FIRE</label>
          </div>
        </div>
        {err && <div className="form-error">{err}</div>}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={closeExp}>Cancel</button>
          <button className="btn btn-primary" onClick={saveExp} disabled={saving}>
            {saving?'Saving…':expModal.item?'Update':'Add'}
          </button>
        </div>
      </Modal>
    </>
  )
}
