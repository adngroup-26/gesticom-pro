import { memo, useCallback } from 'react'

const C = {
  pri: '#2563EB',
  err: '#DC2626',
  g200: '#E5E7EB', g500: '#6B7280', g600: '#4B5563'
}

// ── Field stable ──────────────────────────────────────────────────────────────
const Field = memo(function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, color: C.g600, fontWeight: 500, display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder || ''}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${C.g200}`, fontSize: 14, outline: 'none' }}
        onFocus={e => e.target.style.borderColor = C.pri}
        onBlur={e  => e.target.style.borderColor = C.g200}
      />
    </div>
  )
})

// ── ClientForm — composant EXTERNE et stable ──────────────────────────────────
const ClientForm = memo(function ClientForm({ form, onChange, onSubmit, onCancel, saving }) {
  // Handlers stables — ne changent pas entre les renders
  const handleNom     = useCallback(e => onChange('nom',     e.target.value), [onChange])
  const handleTel     = useCallback(e => onChange('tel',     e.target.value), [onChange])
  const handleAdresse = useCallback(e => onChange('adresse', e.target.value), [onChange])
  const handleEmail   = useCallback(e => onChange('email',   e.target.value), [onChange])

  return (
    <>
      <Field label="Nom complet *"  value={form.nom}     onChange={handleNom}     placeholder="Ex: Kouassi Julien" />
      <Field label="Téléphone"      value={form.tel}     onChange={handleTel}     placeholder="+225 07 XX XX XX" type="tel" />
      <Field label="Adresse"        value={form.adresse} onChange={handleAdresse} placeholder="Quartier, Ville" />
      <Field label="Email"          value={form.email}   onChange={handleEmail}   placeholder="client@email.com" type="email" />

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${C.g200}`, background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          Annuler
        </button>
        <button onClick={onSubmit} disabled={saving}
          style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: C.pri, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </>
  )
})

export default ClientForm