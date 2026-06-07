import { useState } from 'react'
import { sb } from '../supabase'

const C = {
  pri:'#2563EB', priL:'#EFF6FF',
  ok:'#16A34A',  okL:'#F0FDF4',
  err:'#DC2626', errL:'#FEF2F2',
  war:'#D97706', warL:'#FFFBEB',
  g200:'#E5E7EB', g500:'#6B7280', g600:'#4B5563', g800:'#1F2937'
}

const TYPES = [
  { id:'entree',     label:'📥 Entrée stock',          desc:'Réapprovisionnement, achat',    color:C.ok,  bg:C.okL  },
  { id:'sortie',     label:'📤 Sortie stock',           desc:'Perte, casse, retour client',   color:C.err, bg:C.errL },
  { id:'inventaire', label:'📋 Inventaire',             desc:'Correction manuelle du stock',  color:C.pri, bg:C.priL },
  { id:'transfert',  label:'🔄 Transfert boutique',     desc:'Envoi vers une autre boutique', color:C.war, bg:C.warL },
]

const MOTIFS = {
  entree:     ['Réapprovisionnement fournisseur', 'Retour client', 'Don / Cadeau', 'Correction erreur', 'Autre'],
  sortie:     ['Perte', 'Casse / Détérioration', 'Vol', 'Retour fournisseur', 'Usage interne', 'Périmé', 'Autre'],
  inventaire: ['Inventaire mensuel', 'Inventaire annuel', 'Correction erreur de saisie', 'Autre'],
  transfert:  ['Transfert boutique principale', 'Transfert boutique secondaire', 'Autre'],
}

export default function MouvementModal({ produit, profil, eid, onClose, onSuccess, showToast }) {
  const [type,     setType]     = useState('entree')
  const [quantite, setQuantite] = useState('')
  const [motif,    setMotif]    = useState('')
  const [motifCustom, setMotifCustom] = useState('')
  const [saving,   setSaving]   = useState(false)

  const typeInfo   = TYPES.find(t => t.id === type)
  const stockApres = () => {
    const q = parseInt(quantite) || 0
    if (type === 'entree')     return produit.stock + q
    if (type === 'sortie')     return Math.max(0, produit.stock - q)
    if (type === 'inventaire') return q
    if (type === 'transfert')  return Math.max(0, produit.stock - q)
    return produit.stock
  }

  async function enregistrer() {
    const q = parseInt(quantite) || 0
    if (q <= 0) { showToast('Quantité invalide', 'error'); return }
    if (!motif)  { showToast('Veuillez choisir un motif', 'error'); return }
    if (saving)  return
    setSaving(true)

    const motifFinal = motif === 'Autre' ? (motifCustom || 'Autre') : motif

    const { error } = await sb.rpc('enregistrer_mouvement', {
      p_entreprise_id:  eid,
      p_produit_id:     produit.id,
      p_type:           type,
      p_quantite:       q,
      p_motif:          motifFinal,
      p_utilisateur_id: profil?.auth_user_id || null,
      p_utilisateur_nom: profil?.nom || 'Inconnu',
    })

    if (error) { showToast(error.message, 'error'); setSaving(false); return }

    showToast(`Mouvement enregistré — Stock : ${produit.stock} → ${stockApres()}`)
    onSuccess()
    onClose()
    setSaving(false)
  }

  const fmt = n => new Intl.NumberFormat('fr-FR').format(n || 0)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:480, maxWidth:'100%', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>

        {/* En-tête */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:18, color:C.g800 }}>Mouvement de stock</div>
            <div style={{ fontSize:13, color:C.g500, marginTop:2 }}>{produit.nom}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:C.g500 }}>✕</button>
        </div>

        {/* Stock actuel */}
        <div style={{ background:'#F8FAFC', borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, color:C.g600 }}>Stock actuel</span>
          <span style={{ fontWeight:800, fontSize:22, color: produit.stock <= produit.seuil_alerte ? C.err : C.ok }}>
            {fmt(produit.stock)} unités
          </span>
        </div>

        {/* Choix du type */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, color:C.g600, fontWeight:500, marginBottom:10 }}>Type de mouvement</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {TYPES.map(t => (
              <button key={t.id} onClick={() => { setType(t.id); setMotif('') }}
                style={{ padding:'12px 10px', borderRadius:10, border:`2px solid ${type===t.id ? t.color : C.g200}`, background:type===t.id ? t.bg : '#fff', cursor:'pointer', textAlign:'left', transition:'all .15s' }}>
                <div style={{ fontWeight:600, fontSize:13, color:type===t.id ? t.color : C.g800 }}>{t.label}</div>
                <div style={{ fontSize:11, color:C.g500, marginTop:2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quantité */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:13, color:C.g600, fontWeight:500, display:'block', marginBottom:6 }}>
            {type === 'inventaire' ? 'Nouveau stock réel' : 'Quantité'}
            <span style={{ color:C.err }}> *</span>
          </label>
          <input
            type="number" min="0" value={quantite}
            onChange={e => setQuantite(e.target.value)}
            placeholder={type === 'inventaire' ? 'Ex: 45' : 'Ex: 10'}
            style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1.5px solid ${C.g200}`, fontSize:16, fontWeight:600, outline:'none' }}
            onFocus={e => e.target.style.borderColor = typeInfo.color}
            onBlur={e  => e.target.style.borderColor = C.g200}
          />
        </div>

        {/* Aperçu stock après */}
        {quantite && parseInt(quantite) > 0 && (
          <div style={{ background: typeInfo.bg, border:`1px solid ${typeInfo.color}40`, borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:12, color:C.g500 }}>Stock après mouvement</div>
              <div style={{ fontSize:22, fontWeight:800, color:typeInfo.color, marginTop:2 }}>
                {fmt(stockApres())} unités
              </div>
            </div>
            <div style={{ fontSize:28 }}>
              {type==='entree' ? '📈' : type==='sortie' || type==='transfert' ? '📉' : '📋'}
            </div>
          </div>
        )}

        {/* Motif */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:13, color:C.g600, fontWeight:500, display:'block', marginBottom:6 }}>
            Motif <span style={{ color:C.err }}>*</span>
          </label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {MOTIFS[type].map(m => (
              <button key={m} onClick={() => setMotif(m)}
                style={{ padding:'6px 12px', borderRadius:20, border:`1.5px solid ${motif===m ? typeInfo.color : C.g200}`, background:motif===m ? typeInfo.bg : '#fff', color:motif===m ? typeInfo.color : C.g600, cursor:'pointer', fontSize:12, fontWeight:motif===m?600:400, transition:'all .15s' }}>
                {m}
              </button>
            ))}
          </div>
          {motif === 'Autre' && (
            <input
              value={motifCustom} onChange={e => setMotifCustom(e.target.value)}
              placeholder="Précisez le motif…"
              style={{ width:'100%', marginTop:8, padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.g200}`, fontSize:14, outline:'none' }}
            />
          )}
        </div>

        {/* Boutons */}
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:11, borderRadius:10, border:`1px solid ${C.g200}`, background:'#fff', cursor:'pointer', fontWeight:600, fontSize:14 }}>
            Annuler
          </button>
          <button onClick={enregistrer} disabled={saving}
            style={{ flex:2, padding:11, borderRadius:10, border:'none', background:typeInfo.color, color:'#fff', cursor:saving?'not-allowed':'pointer', fontWeight:700, fontSize:14, opacity:saving?0.7:1 }}>
            {saving ? 'Enregistrement…' : `✅ Enregistrer ${typeInfo.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}