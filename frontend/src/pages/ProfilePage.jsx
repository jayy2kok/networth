import { useState, useEffect } from 'react'
import { useUser } from '../hooks/useUser'
import * as userApi from '../services/user'

export default function ProfilePage() {
  const { user, loading, reload } = useUser()
  const [form,   setForm]   = useState({ firstName:'', lastName:'', dateOfBirth:'' })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [err,    setErr]    = useState(null)

  useEffect(() => {
    if (user) setForm({
      firstName:   user.firstName  || '',
      lastName:    user.lastName   || '',
      dateOfBirth: user.settings?.dateOfBirth || '',
    })
  }, [user])

  const initials = user
    ? `${(user.firstName||'D')[0]}${(user.lastName||'U')[0]}`.toUpperCase()
    : 'DU'

  const save = async () => {
    setSaving(true); setErr(null); setSaved(false)
    try {
      await userApi.updateProfile({ firstName: form.firstName, lastName: form.lastName })
      if (user?.settings) {
        await userApi.updateSettings({ ...user.settings, dateOfBirth: form.dateOfBirth || null })
      }
      await reload()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch(e) {
      setErr(e.response?.data?.error || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="empty-state"><div className="empty-desc">Loading…</div></div>

  return (
    <div style={{ maxWidth: 520 }}>
      {/* Avatar */}
      <div className="profile-avatar-lg">{initials}</div>
      <div className="profile-name">{user?.firstName} {user?.lastName}</div>
      <div className="profile-email">{user?.email}</div>

      {/* Edit form */}
      <div className="card">
        <div className="card-title" style={{marginBottom:'1rem'}}>Edit Profile</div>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">First Name</label>
            <input className="form-input" placeholder="Dev" value={form.firstName}
              onChange={e=>setForm(f=>({...f,firstName:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Last Name</label>
            <input className="form-input" placeholder="User" value={form.lastName}
              onChange={e=>setForm(f=>({...f,lastName:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Date of Birth</label>
            <input className="form-input" type="date" value={form.dateOfBirth}
              onChange={e=>setForm(f=>({...f,dateOfBirth:e.target.value}))} />
          </div>
          <div className="form-field">
            <label className="form-label">Email (read-only)</label>
            <input className="form-input" value={user?.email||''} disabled
              style={{opacity:0.5,cursor:'not-allowed'}} />
          </div>
        </div>

        {err && <div className="form-error" style={{marginTop:'0.75rem'}}>{err}</div>}

        <div style={{marginTop:'1.25rem',display:'flex',alignItems:'center',gap:'1rem'}}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          {saved && <span className="save-success">✅ Saved!</span>}
        </div>
      </div>

      {/* Phase 5 note */}
      <div style={{marginTop:'1rem',padding:'0.875rem 1rem',background:'rgba(212,160,23,0.06)',
        border:'1px solid rgba(212,160,23,0.2)',borderRadius:'var(--radius-input)',
        fontSize:'0.8125rem',color:'var(--color-text-secondary)'}}>
        🔐 Google avatar sync — Phase 5 (Google OAuth)
      </div>
    </div>
  )
}
