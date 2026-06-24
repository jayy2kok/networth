import { useState, useRef, useCallback } from 'react'
import * as profileApi from '../../services/profile'

/**
 * CAS PDF drop zone modal.
 * Accepts a CAS PDF file (drag-drop or click), prompts for password,
 * and calls the /api/cas/import endpoint.
 *
 * Props:
 *   open     — boolean
 *   onClose  — fn()
 *   onImported — fn(result) called after successful import
 */
export default function CasDropZone({ open, onClose, onImported }) {
  const [file, setFile]       = useState(null)
  const [password, setPassword] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]  = useState(0)   // simulated 0-100
  const [result, setResult]      = useState(null)
  const [error, setError]        = useState(null)
  const inputRef = useRef(null)

  const reset = () => {
    setFile(null); setPassword(''); setDragging(false)
    setUploading(false); setProgress(0); setResult(null); setError(null)
  }

  const handleClose = () => { reset(); onClose() }

  const acceptFile = (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.'); return
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('File is too large (max 20 MB).'); return
    }
    setError(null); setFile(f)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files?.[0]
    acceptFile(f)
  }, [])

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = ()  => setDragging(false)
  const onFileInput = (e) => acceptFile(e.target.files?.[0])

  const handleImport = async () => {
    if (!file)     return setError('Please select a CAS PDF file.')
    if (!password.trim()) return setError('Please enter the PDF password.')

    setUploading(true); setError(null); setProgress(10)

    // Simulate progress while waiting
    const ticker = setInterval(() => {
      setProgress(p => Math.min(p + 10, 85))
    }, 600)

    try {
      const res = await profileApi.importCAS(file, password.trim())
      clearInterval(ticker); setProgress(100)
      setResult(res)
    } catch (e) {
      clearInterval(ticker)
      setError(e.response?.data?.message || 'Import failed. Check the password or try again.')
    } finally {
      setUploading(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={handleClose} id="cas-import-modal">
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">📄 Import CAS PDF</div>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        {result ? (
          /* ── Import Success ── */
          <div style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              marginBottom: '1.25rem', padding: '1rem',
              background: 'rgba(16,185,129,0.08)', borderRadius: 10,
              border: '1px solid rgba(16,185,129,0.25)'
            }}>
              <span style={{ fontSize: '2rem' }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>Import Successful!</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {result.fileType} • {result.investorName}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                ['Schemes Imported', result.schemesImported],
                ['Schemes Updated',  result.schemesUpdated],
                ['Transactions Added', result.transactionsAdded],
                ['Duplicates Skipped', result.transactionsSkipped],
              ].map(([label, val]) => (
                <div key={label} style={{
                  padding: '0.75rem', background: 'var(--color-surface)',
                  borderRadius: 8, textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{val}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {result.warnings?.length > 0 && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem',
                background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)',
                fontSize: '0.8125rem', color: 'var(--color-warning)'
              }}>
                ⚠️ {result.warnings.length} warning(s):
                <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                  {result.warnings.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}
                  {result.warnings.length > 3 && <li>…and {result.warnings.length - 3} more</li>}
                </ul>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => { onImported(result); handleClose() }}>
                Done
              </button>
            </div>
          </div>

        ) : (
          /* ── Upload Form ── */
          <div style={{ padding: '1.5rem' }}>

            {/* Drop zone */}
            <div
              id="cas-dropzone"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => !file && inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--color-primary)' : file ? 'var(--color-success)' : 'rgba(148,163,184,0.35)'}`,
                borderRadius: 12,
                padding: '2rem 1.5rem',
                textAlign: 'center',
                cursor: file ? 'default' : 'pointer',
                background: dragging ? 'rgba(99,102,241,0.06)' : file ? 'rgba(16,185,129,0.05)' : 'var(--color-surface)',
                transition: 'all 0.2s ease',
                marginBottom: '1.25rem',
              }}
            >
              <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={onFileInput} />
              {file ? (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-success)', marginBottom: '0.25rem' }}>{file.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }}
                    onClick={e => { e.stopPropagation(); setFile(null) }}>
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{dragging ? '📥' : '☁️'}</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                    {dragging ? 'Drop it here!' : 'Drop your CAS PDF here'}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    or <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>click to browse</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                    Supports CAMS and KFintech PDFs (max 20 MB)
                  </div>
                </>
              )}
            </div>

            {/* Password */}
            <div className="form-field" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">CAS Password</label>
              <input
                id="cas-password-input"
                className="form-input"
                type="password"
                placeholder="Your PAN number (e.g. ABCDE1234F)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleImport()}
                autoComplete="off"
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.3rem' }}>
                Used only for parsing. Never stored.
              </div>
            </div>

            {/* Progress bar */}
            {uploading && (
              <div style={{
                height: 4, borderRadius: 2, background: 'var(--color-border)',
                overflow: 'hidden', marginBottom: '1rem'
              }}>
                <div style={{
                  height: '100%', width: `${progress}%`,
                  background: 'var(--color-primary)',
                  transition: 'width 0.5s ease',
                  borderRadius: 2,
                }} />
              </div>
            )}

            {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={handleClose} disabled={uploading}>Cancel</button>
              <button
                id="cas-import-btn"
                className="btn btn-primary"
                onClick={handleImport}
                disabled={uploading || !file}
              >
                {uploading ? `Importing… ${progress}%` : '📥 Import'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
