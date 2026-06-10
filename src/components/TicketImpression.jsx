import { useEffect, useRef } from 'react'
import '../styles/thermal.css'

// ── Formatage montant sans unicode ────────────────────────────────────────────
function fmtT(n) {
  return new Intl.NumberFormat('fr-FR')
    .format(Math.round(n || 0))
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ')
}

// ── Alignement colonne monospace ──────────────────────────────────────────────
function pad(str, len, right) {
  const s = String(str || '').substring(0, len)
  return right ? s.padStart(len, ' ') : s.padEnd(len, ' ')
}

function formatLigne(nom, qty, pu, total) {
  // 42 chars pour imprimante 80mm : 16 nom | 4 qte | 11 pu | 11 total
  const n = pad(nom,        16, false)
  const q = pad(qty,         4, true)
  const p = pad(fmtT(pu),   11, true)
  const t = pad(fmtT(total), 11, true)
  return n + q + p + t

}

// ── Tronquer le texte pour 80mm ───────────────────────────────────────────────
function trunc(str, max) {
  if (!str) return ''
  return str.length > max ? str.substring(0, max - 1) + '.' : str
}

// ── Ligne séparatrice ─────────────────────────────────────────────────────────
function sep(char, len) {
  return char.repeat(len || 32)
}

export default function TicketImpression({ data, entreprise, ventesIndex, onClose }) {
  const ticketRef = useRef(null)

  const {
    id, client_nom, montant_total, created_at, panier
  } = data

  const entNom  = entreprise?.nom      || 'Mon Entreprise'
  const entTel  = entreprise?.telephone || ''
  const entAdr  = entreprise?.adresse   || ''
  const msgMerci = entreprise?.message_remerciement || 'Merci pour votre achat !\nA bientot chez nous.'

  const dateStr = created_at
    ? new Date(created_at).toLocaleDateString('fr-FR') + ' ' + new Date(created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
    : new Date().toLocaleDateString('fr-FR')

  // Même numéro que la facture PDF
  const numRecu = 'REC-' + String((ventesIndex || 0) + 1).padStart(6, '0')

  function imprimer() {
    // Rendre le ticket visible pour l'impression
    if (ticketRef.current) ticketRef.current.classList.add('preview')
    setTimeout(() => {
      window.print()
      if (ticketRef.current) ticketRef.current.classList.remove('preview')
    }, 100)
  }

  // Aperçu du ticket dans la modale
  const lignes = (panier || []).map(item => ({
    nom:   item.nom || '',
    qty:   item.qty || 0,
    pu:    item.prix_vente || 0,
    total: (item.prix_vente || 0) * (item.qty || 0),
  }))

  return (
    <>
      {/* ── Ticket caché utilisé pour l'impression ── */}
      <div id="thermal-ticket" ref={ticketRef}>
        {/* En-tête */}
        <div className="th-center th-bold th-large">{entNom}</div>
        {entTel && <div className="th-center th-small">Tel: {entTel}</div>}
        {entAdr && <div className="th-center th-small">{entAdr}</div>}
        <div className="th-sep2"/>

        {/* Infos reçu */}
        <div>RECU N° : {numRecu}</div>
        <div>Date    : {dateStr}</div>
        <div>Client  : {trunc(client_nom || 'Direct', 24)}</div>
        <div className="th-sep"/>

        {/* En-tête colonnes */}
        <div className="th-bold">{pad('Designation',16) + pad('Qte',4,true) + pad('P.U',11,true) + pad('Total',11,true)}</div>
        <div className="th-sep"/>

        {/* Articles */}
        {lignes.map((l, i) => (
          <div key={i}>
            {l.nom.length > 16 && <div className="th-small">{trunc(l.nom, 30)}</div>}
            <div style={{ whiteSpace:'pre' }}>
              {formatLigne(l.nom.length > 16 ? '' : l.nom, l.qty, l.pu, l.total)}
            </div>
          </div>
        ))}
        <div className="th-sep"/>

        {/* Total */}
        <div className="th-total">
          <span>TOTAL</span>
          <span>{fmtT(montant_total)} FCFA</span>
        </div>
        <div className="th-sep2"/>

        {/* Message de remerciement */}
        {msgMerci.split('\n').map((line, i) => (
          <div key={i} className="th-center th-small">{line}</div>
        ))}
        <div className="th-center th-small" style={{ marginTop: 4 }}>
          *** GestiCom Pro ***
        </div>

        {/* Espace de coupe */}
        <div style={{ marginTop: 8 }}>&nbsp;</div>
      </div>

      {/* ── Modale d'aperçu et d'impression ── */}
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
        <div style={{ background:'#fff', borderRadius:16, padding:24, width:400, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}>

          {/* Titre */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontWeight:700, fontSize:17 }}>🖨️ Impression thermique 80mm</div>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#6B7280' }}>✕</button>
          </div>

          {/* Aperçu ticket */}
          <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, padding:12, marginBottom:20, fontFamily:'Courier New, monospace', fontSize:11, lineHeight:1.5 }}>
            <div style={{ textAlign:'center', fontWeight:700, fontSize:13 }}>{entNom}</div>
            {entTel && <div style={{ textAlign:'center', fontSize:10 }}>Tel: {entTel}</div>}
            {entAdr && <div style={{ textAlign:'center', fontSize:10 }}>{entAdr}</div>}
            <div style={{ borderTop:'2px solid #000', margin:'4px 0' }}/>
            <div>RECU N° : {numRecu}</div>
            <div>Date    : {dateStr}</div>
            <div>Client  : {trunc(client_nom || 'Direct', 24)}</div>
            <div style={{ borderTop:'1px dashed #000', margin:'4px 0' }}/>
            <div style={{ fontWeight:'bold', whiteSpace:'pre', fontFamily:'Courier New, monospace', fontSize:11 }}>
              {pad('Designation',16) + pad('Qte',4,true) + pad('P.U',11,true) + pad('Total',11,true)}
            </div>
            <div style={{ borderTop:'1px dashed #000', margin:'4px 0' }}/>
            {lignes.map((l, i) => (
              <div key={i}>
                {l.nom.length > 16 && <div style={{ fontSize:10 }}>{trunc(l.nom, 30)}</div>}
                <div style={{ whiteSpace:'pre', fontFamily:'Courier New, monospace', fontSize:11 }}>
                  {formatLigne(l.nom.length > 16 ? '' : l.nom, l.qty, l.pu, l.total)}
                </div>
              </div>
            ))}
            <div style={{ borderTop:'1px dashed #000', margin:'4px 0' }}/>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:13 }}>
              <span>TOTAL</span>
              <span>{fmtT(montant_total)} FCFA</span>
            </div>
            <div style={{ borderTop:'2px solid #000', margin:'4px 0' }}/>
            {msgMerci.split('\n').map((line, i) => (
              <div key={i} style={{ textAlign:'center', fontSize:10 }}>{line}</div>
            ))}
            <div style={{ textAlign:'center', fontSize:10, marginTop:4 }}>*** GestiCom Pro ***</div>
          </div>

          {/* Boutons */}
          <button onClick={imprimer}
            style={{ width:'100%', padding:13, background:'#2563EB', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:'pointer', marginBottom:10 }}>
            🖨️ Imprimer le reçu
          </button>
          <div style={{ fontSize:12, color:'#6B7280', textAlign:'center', marginBottom:12 }}>
            Assurez-vous que votre imprimante thermique est connectée et sélectionnée dans la boîte de dialogue d'impression.
          </div>
          <button onClick={onClose}
            style={{ width:'100%', padding:10, background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer', color:'#6B7280', fontSize:13 }}>
            Fermer
          </button>
        </div>
      </div>
    </>
  )
}