import { memo, useCallback } from 'react'

const C = {
  pri:'#2563EB', priL:'#EFF6FF',
  ok:'#16A34A',  okL:'#F0FDF4',
  err:'#DC2626',
  g200:'#E5E7EB', g500:'#6B7280', g600:'#4B5563'
}

const fmtNum = n => new Intl.NumberFormat('fr-FR').format(n || 0)

// ── Field stable (jamais recréé) ──────────────────────────────────────────────
const Field = memo(function Field({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 13, color: C.g600, fontWeight: 500, display: 'block', marginBottom: 4 }}>
        {label}{required && <span style={{ color: C.err }}> *</span>}
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

// ── ProduitForm — sans memo() car form change à chaque frappe ────────────────
function ProduitForm({ form, onChange, onSubmit, onCancel, saving }) {
  // Recalcul à chaque changement de form (pa, tr, qt, pv)
  const pa = parseFloat(form.pa) || 0
  const tr = parseFloat(form.tr) || 0
  const qt = parseFloat(form.qt) || 1
  const pr = pa + tr / qt
  const pv = parseFloat(form.pv) || 0

  // Handlers stables grâce à useCallback
  const handleNom = useCallback(e => onChange('nom', e.target.value), [onChange])
  const handleRef = useCallback(e => onChange('ref', e.target.value), [onChange])
  const handleCat = useCallback(e => onChange('cat', e.target.value), [onChange])
  const handlePa  = useCallback(e => onChange('pa',  e.target.value), [onChange])
  const handleTr  = useCallback(e => onChange('tr',  e.target.value), [onChange])
  const handleQt  = useCallback(e => onChange('qt',  e.target.value), [onChange])
  const handleAl  = useCallback(e => onChange('al',  e.target.value), [onChange])
  const handlePv  = useCallback(e => onChange('pv',  e.target.value), [onChange])

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <Field label="Désignation" value={form.nom} onChange={handleNom} placeholder="Ex: Ciment CFA 50kg" required />
        </div>
        <Field label="Référence"                      value={form.ref} onChange={handleRef} placeholder="Ex: CIM-001" />
        <Field label="Catégorie"                      value={form.cat} onChange={handleCat} placeholder="Ex: Matériaux" />
        <Field label="Prix d'achat unitaire (FCFA)"   value={form.pa}  onChange={handlePa}  type="number" placeholder="0" />
        <Field label="Montant transport (FCFA)"        value={form.tr}  onChange={handleTr}  type="number" placeholder="0" />
        <Field label="Qté totale achetée"              value={form.qt}  onChange={handleQt}  type="number" placeholder="0" />
        <Field label="Seuil d'alerte stock"            value={form.al}  onChange={handleAl}  type="number" placeholder="10" />
      </div>

      {/* Prix de revient calculé */}
      <div style={{ background: C.priL, border: `1px solid #93C5FD`, borderRadius: 9, padding: '12px 14px', margin: '4px 0 12px' }}>
        <div style={{ fontSize: 12, color: C.pri, fontWeight: 600 }}>Prix de revient (calculé)</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.pri, marginTop: 3 }}>
          {form.qt && parseFloat(form.qt) > 0 ? fmtNum(Math.round(pr)) + ' FCFA' : '—'}
        </div>
        <div style={{ fontSize: 11, color: C.g500, marginTop: 2 }}>PR = Prix achat + Transport ÷ Qté</div>
      </div>

      <Field label="Prix de vente (FCFA)" value={form.pv} onChange={handlePv} type="number" placeholder="0" required />

      {/* Aperçu marge */}
      {pv > 0 && pr > 0 && (
        <div style={{ background: C.okL, border: `1px solid #86EFAC`, borderRadius: 9, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.ok, fontWeight: 600 }}>Marge bénéficiaire</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ok, marginTop: 2 }}>
            {Math.round(((pv - pr) / pr) * 100)}% · {fmtNum(Math.round(pv - pr))} FCFA / unité
          </div>
        </div>
      )}

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
}

export default ProduitForm