import { useState, useEffect } from 'react'
import { useUser } from '../hooks/useUser'
import * as userApi from '../services/user'

export default function SettingsPage() {
  const { user, loading, reload } = useUser()
  const [form,   setForm]   = useState({ currencyCode:'INR', retirementAge:60, expectedReturnRate:12, inflationRate:6 })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [err,    setErr]    = useState(null)
  const [mcpKeys, setMcpKeys] = useState([])
  const [mcpLabel, setMcpLabel] = useState('Hermes')
  const [createdMcpKey, setCreatedMcpKey] = useState(null)
  const [mcpError, setMcpError] = useState(null)
  const [creatingMcpKey, setCreatingMcpKey] = useState(false)

  useEffect(() => {
    if (user?.settings) {
      const s = user.settings
      setForm({
        currencyCode:       s.currencyCode       ?? 'INR',
        retirementAge:      s.retirementAge       ?? 60,
        expectedReturnRate: s.expectedReturnRate  ?? 12,
        inflationRate:      s.inflationRate       ?? 6,
      })
    }
  }, [user])

  const loadMcpKeys = async () => {
    try {
      setMcpKeys(await userApi.listMcpKeys())
    } catch (e) {
      setMcpError(e.response?.data?.error || 'Failed to load MCP keys')
    }
  }

  useEffect(() => { if (!loading) loadMcpKeys() }, [loading])

  const save = async () => {
    setSaving(true); setErr(null); setSaved(false)
    try {
      await userApi.updateSettings({
        ...user?.settings,
        currencyCode:       form.currencyCode,
        retirementAge:      +form.retirementAge,
        expectedReturnRate: +form.expectedReturnRate,
        inflationRate:      +form.inflationRate,
      })
      await reload()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch(e) {
      setErr(e.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const createMcpKey = async () => {
    setCreatingMcpKey(true); setMcpError(null); setCreatedMcpKey(null)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 90)
      const result = await userApi.createMcpKey({
        label: mcpLabel,
        scopes: ['financial:summary', 'portfolio:read', 'history:read', 'budget:read'],
        expiresAt: expiresAt.toISOString(),
      })
      setCreatedMcpKey(result.plaintextKey)
      await loadMcpKeys()
    } catch (e) {
      setMcpError(e.response?.data?.error || 'Failed to create MCP key')
    } finally {
      setCreatingMcpKey(false)
    }
  }

  const revokeMcpKey = async (id) => {
    if (!window.confirm('Revoke this MCP key? Existing clients will lose access.')) return
    setMcpError(null)
    try {
      await userApi.revokeMcpKey(id)
      await loadMcpKeys()
    } catch (e) {
      setMcpError(e.response?.data?.error || 'Failed to revoke MCP key')
    }
  }

  if (loading) return <div className="empty-state"><div className="empty-desc">Loading…</div></div>

  return (
    <div style={{ maxWidth: 520 }}>

      {/* Financial parameters */}
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title" style={{marginBottom:'0.25rem'}}>Financial Parameters</div>
        <div className="card-sub">Used for FIRE calculations, runway, and net worth projections.</div>

        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">Currency Code (ISO 4217)</label>
            <input className="form-input" placeholder="INR" value={form.currencyCode} maxLength={3}
              onChange={e=>setForm(f=>({...f,currencyCode:e.target.value.toUpperCase()}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Retirement Age</label>
            <input className="form-input" type="number" min="30" max="80" value={form.retirementAge}
              onChange={set('retirementAge')} />
          </div>
          <div className="form-field">
            <label className="form-label">Expected Return Rate (%)</label>
            <input className="form-input" type="number" step="0.1" min="0" max="50" value={form.expectedReturnRate}
              onChange={set('expectedReturnRate')} />
          </div>
          <div className="form-field">
            <label className="form-label">Inflation Rate (%)</label>
            <input className="form-input" type="number" step="0.1" min="0" max="30" value={form.inflationRate}
              onChange={set('inflationRate')} />
          </div>
        </div>

        {/* Helper hints */}
        <div style={{marginTop:'0.875rem',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
          {[
            ['Real Return','= (1+Return)/(1+Inflation) − 1'],
            ['FIRE Target','25 × Annual Non-Savings Expenses'],
            ['Runway','Liquid Assets ÷ Monthly Expenses'],
            ['Savings Rate','(Income − Expenses) / Income × 100'],
          ].map(([k,v]) => (
            <div key={k} style={{padding:'0.5rem 0.75rem',background:'var(--color-surface-secondary)',
              borderRadius:'6px',fontSize:'0.75rem'}}>
              <div style={{fontWeight:600,color:'var(--color-text-secondary)',marginBottom:'2px'}}>{k}</div>
              <div style={{color:'var(--color-text-muted)',fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>

        {err && <div className="form-error" style={{marginTop:'0.75rem'}}>{err}</div>}
        <div style={{marginTop:'1.25rem',display:'flex',alignItems:'center',gap:'1rem'}}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && <span className="save-success">✅ Saved!</span>}
        </div>
      </div>

      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title" style={{marginBottom:'0.25rem'}}>MCP access</div>
        <div className="card-sub">Create a read-only key for Hermes. Store it in Hermes’ secret store; the secret is shown once.</div>
        <div className="form-grid" style={{marginTop:'1rem'}}>
          <label className="field-label">Key label
            <input value={mcpLabel} onChange={e => setMcpLabel(e.target.value)} maxLength="80" />
          </label>
        </div>
        <button className="btn btn-primary" type="button" onClick={createMcpKey} disabled={creatingMcpKey || !mcpLabel.trim()}>
          {creatingMcpKey ? 'Creating…' : 'Create read-only key'}
        </button>
        {createdMcpKey && <div className="alert success" role="status" style={{marginTop:'1rem'}}>
          <strong>Copy now — this key will not be shown again.</strong>
          <code style={{display:'block', overflowWrap:'anywhere', marginTop:'0.5rem'}}>{createdMcpKey}</code>
        </div>}
        {mcpError && <div className="alert error" role="alert" style={{marginTop:'1rem'}}>{mcpError}</div>}
        <div style={{marginTop:'1rem'}}>
          {mcpKeys.length === 0 ? <div className="empty-desc">No MCP keys yet.</div> : mcpKeys.map(key => <div key={key.id} className="list-row">
            <div><strong>{key.label}</strong><div className="card-sub">{key.keyId} · expires {new Date(key.expiresAt).toLocaleDateString()}</div></div>
            {key.revokedAt ? <span className="badge">Revoked</span> : <button className="btn btn-ghost" type="button" onClick={() => revokeMcpKey(key.id)}>Revoke</button>}
          </div>)}
        </div>
      </div>

      {/* FX info */}
      <div style={{padding:'0.875rem 1rem',background:'rgba(59,130,246,0.06)',
        border:'1px solid rgba(59,130,246,0.2)',borderRadius:'var(--radius-input)',
        fontSize:'0.8125rem',color:'var(--color-text-secondary)'}}>
        🔄 Exchange rates auto-fetched from <strong>open.er-api.com</strong> and cached for 1 hour.
        Foreign currency values are auto-converted to INR — no manual entry needed.
      </div>
    </div>
  )
}
