import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const C = { pri:'#2563EB', priL:'#EFF6FF', ok:'#16A34A', g200:'#E5E7EB', g500:'#6B7280' }
const fmt = n => (n||0).toLocaleString('fr-FR') + ' FCFA'

export default function Facture({ data, onClose, showToast }) {
  const { id, client_nom, montant_total, benefice_total, created_at, panier, entreprise_nom } = data

  function genPDF() {
    const doc = new jsPDF()

    // En-tête
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20); doc.setFont('helvetica','bold')
    doc.text('GestiCom Pro', 14, 15)
    doc.setFontSize(10); doc.setFont('helvetica','normal')
    doc.text(entreprise_nom || 'Mon Entreprise', 14, 23)
    doc.text('FACTURE / REÇU', 14, 30)

    // Infos facture
    doc.setTextColor(0,0,0)
    doc.setFontSize(10)
    doc.text(`N° Facture : ${id?.slice(0,8)}…`, 14, 45)
    doc.text(`Date       : ${created_at?.slice(0,10) || new Date().toISOString().slice(0,10)}`, 14, 52)
    doc.text(`Client     : ${client_nom}`, 14, 59)

    // Tableau articles
    if (panier?.length) {
      autoTable(doc, {
        startY: 68,
        head: [['Article', 'Qté', 'Prix unit.', 'Sous-total']],
        body: panier.map(item => [
          item.nom,
          item.qty,
          fmt(item.prix_vente),
          fmt(item.prix_vente * item.qty),
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [37, 99, 235] },
      })
    }

    // Total
    const finalY = doc.lastAutoTable?.finalY || 80
    doc.setFontSize(13); doc.setFont('helvetica','bold')
    doc.text(`TOTAL : ${fmt(montant_total)}`, 14, finalY + 14)

    // Pied de page
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.setTextColor(150)
    doc.text('GestiCom Pro — Gestion commerciale Afrique francophone', 14, 285)

    doc.save(`facture-${id?.slice(0,8)}.pdf`)
    showToast('Facture PDF téléchargée !')
  }

  function sendWhatsApp() {
    const msg = encodeURIComponent(
      `*GestiCom Pro — Reçu de paiement*\n` +
      `Client : ${client_nom}\n` +
      `Montant : ${fmt(montant_total)}\n` +
      `Date : ${created_at?.slice(0,10)}\n` +
      `N° : ${id?.slice(0,8)}\n\n` +
      `Merci pour votre achat !`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
    showToast('WhatsApp ouvert !')
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:32, width:460, maxWidth:'90vw', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ width:48, height:48, background:C.pri, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:22, margin:'0 auto 10px' }}>G</div>
          <div style={{ fontWeight:800, fontSize:20 }}>GestiCom Pro</div>
          <div style={{ color:C.g500, fontSize:13 }}>FACTURE / REÇU</div>
        </div>

        {/* Infos */}
        <div style={{ background:'#F9FAFB', borderRadius:10, padding:14, marginBottom:14 }}>
          {[['N° Facture', id?.slice(0,8)+'…'], ['Date', created_at?.slice(0,10)], ['Client', client_nom], ['Entreprise', entreprise_nom]].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
              <span style={{ color:C.g500 }}>{k}</span>
              <span style={{ fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Articles */}
        {panier?.map(item => (
          <div key={item.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:`1px solid ${C.g200}` }}>
            <span>{item.nom} × {item.qty}</span>
            <span style={{ fontWeight:600 }}>{fmt(item.prix_vente * item.qty)}</span>
          </div>
        ))}

        {/* Total */}
        <div style={{ borderTop:`2px solid ${C.g200}`, padding:'14px 0', marginTop:8, marginBottom:16, display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:20 }}>
          <span>TOTAL</span>
          <span style={{ color:C.pri }}>{fmt(montant_total)}</span>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <button onClick={genPDF} style={{ flex:1, padding:12, background:C.priL, color:C.pri, border:`1px solid ${C.pri}`, borderRadius:10, fontWeight:700, cursor:'pointer' }}>
            📄 Télécharger PDF
          </button>
          <button onClick={sendWhatsApp} style={{ flex:1, padding:12, background:'#25D36620', color:'#128C7E', border:'1px solid #25D366', borderRadius:10, fontWeight:700, cursor:'pointer' }}>
            💬 Envoyer WhatsApp
          </button>
        </div>
        <button onClick={onClose} style={{ width:'100%', padding:10, background:'#fff', border:`1px solid ${C.g200}`, borderRadius:10, cursor:'pointer', color:C.g500 }}>
          Fermer
        </button>
      </div>
    </div>
  )
}