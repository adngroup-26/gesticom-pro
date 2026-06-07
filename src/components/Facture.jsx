import { useState, useEffect } from 'react'
import { sb } from '../supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const C = { pri:'#2563EB', priL:'#EFF6FF', ok:'#16A34A', g200:'#E5E7EB', g500:'#6B7280', g800:'#1F2937' }

// ── Formatage des montants ────────────────────────────────────────────────────
function fmtMontant(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA'
}

// ── Numéro de facture séquentiel ─────────────────────────────────────────────
function fmtNumero(index) {
  return 'REC-' + String(index + 1).padStart(6, '0')
}

// ── Formatage date lisible ────────────────────────────────────────────────────
function fmtDate(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('fr-FR')
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

// ── Générateur PDF professionnel ──────────────────────────────────────────────
function genererPDF(data, ventesIndex) {
  const {
    id, client_nom, montant_total, created_at,
    panier, entreprise_nom, entreprise_adresse,
    entreprise_tel
  } = data

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margeG = 20
  const margeD = pageW - 20

  // ── Couleurs ──────────────────────────────────────────────────────────────
  const bleu  = [37, 99, 235]
  const blanc = [255, 255, 255]
  const gris  = [100, 116, 139]
  const noir  = [31, 41, 55]
  const grisClair = [248, 250, 252]

  // ── EN-TÊTE : bandeau bleu ────────────────────────────────────────────────
  doc.setFillColor(...bleu)
  doc.rect(0, 0, pageW, 42, 'F')

  // Logo G
  doc.setFillColor(...blanc)
  doc.roundedRect(margeG, 8, 20, 20, 3, 3, 'F')
  doc.setTextColor(...bleu)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('G', margeG + 10, 21, { align: 'center' })

  // Nom application
  doc.setTextColor(...blanc)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('GESTICOM PRO', margeG + 26, 16)

  // Slogan
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Gestion commerciale · Afrique francophone', margeG + 26, 23)

  // Mention FACTURE / REÇU à droite
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURE / REÇU', margeD, 16, { align: 'right' })

  // ── INFOS ENTREPRISE (sous le bandeau gauche) ─────────────────────────────
  let y = 54
  doc.setTextColor(...noir)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(entreprise_nom || 'Mon Entreprise', margeG, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gris)
  if (entreprise_adresse) { y += 5; doc.text(entreprise_adresse, margeG, y) }
  if (entreprise_tel)     { y += 5; doc.text('Tél : ' + entreprise_tel, margeG, y) }

  // ── INFOS FACTURE (droite) ────────────────────────────────────────────────
  const yInfo = 54
  doc.setTextColor(...noir)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('N° Facture :', margeD - 70, yInfo)
  doc.text('Date :', margeD - 70, yInfo + 7)
  doc.text('Client :', margeD - 70, yInfo + 14)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...bleu)
  doc.text(fmtNumero(ventesIndex || 0), margeD, yInfo, { align: 'right' })
  doc.setTextColor(...noir)
  doc.text(fmtDate(created_at), margeD, yInfo + 7, { align: 'right' })
  doc.text(client_nom || 'Client direct', margeD, yInfo + 14, { align: 'right' })

  // ── LIGNE SÉPARATRICE ─────────────────────────────────────────────────────
  y = Math.max(y, yInfo + 14) + 10
  doc.setDrawColor(...bleu)
  doc.setLineWidth(0.5)
  doc.line(margeG, y, margeD, y)
  y += 8

  // ── TABLEAU DES ARTICLES ──────────────────────────────────────────────────
  const lignes = (panier || []).map(item => [
    item.nom || '',
    String(item.qty || 0),
    fmtMontant(item.prix_vente),
    fmtMontant((item.prix_vente || 0) * (item.qty || 0)),
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: margeG, right: 20 },
    head: [['Désignation', 'Qté', 'Prix unitaire', 'Total']],
    body: lignes,
    styles: {
      fontSize: 10,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      textColor: noir,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: bleu,
      textColor: blanc,
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left',   cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right',  cellWidth: 42 },
      3: { halign: 'right',  cellWidth: 42 },
    },
    alternateRowStyles: { fillColor: grisClair },
    bodyStyles: { halign: 'left' },
    didDrawPage: () => {},
  })

  // ── BLOC TOTAL ────────────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 8

  // Fond total
  doc.setFillColor(...bleu)
  doc.roundedRect(pageW - 20 - 90, finalY, 90, 16, 3, 3, 'F')

  doc.setTextColor(...blanc)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL :', pageW - 20 - 88 + 4, finalY + 10)
  doc.text(fmtMontant(montant_total), margeD - 2, finalY + 10, { align: 'right' })

  // ── MESSAGE DE REMERCIEMENT ───────────────────────────────────────────────
  const yMerci = finalY + 28
  doc.setTextColor(...gris)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'italic')
  doc.text('Merci pour votre achat. Ce reçu fait office de facture.', pageW / 2, yMerci, { align: 'center' })

  // ── PIED DE PAGE ──────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFillColor(...bleu)
  doc.rect(0, pageH - 18, pageW, 18, 'F')
  doc.setTextColor(...blanc)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('GestiCom Pro — Gestion commerciale Afrique francophone', pageW / 2, pageH - 8, { align: 'center' })

  // ── SAUVEGARDE ────────────────────────────────────────────────────────────
  doc.save('facture-' + fmtNumero(ventesIndex || 0) + '.pdf')
}

// ── Composant Facture ────────────────────────────────────────────────────────
export default function Facture({ data, onClose, showToast }) {
  const [ventesIndex, setVentesIndex] = useState(0)

  useEffect(() => {
    async function fetchIndex() {
      try {
        const { count } = await sb
          .from('ventes')
          .select('*', { count: 'exact', head: true })
          .eq('entreprise_id', data.entreprise_id)
          .lte('created_at', data.created_at)
        setVentesIndex((count || 1) - 1)
      } catch(e) {
        setVentesIndex(0)
      }
    }
    if (data?.created_at) fetchIndex()
  }, [data])

  function handlePDF() {
    genererPDF(data, ventesIndex)
    showToast('Facture PDF téléchargée !')
  }

  function handleWhatsApp() {
    const lignes = (data.panier || []).map(item =>
      item.nom + ' x' + item.qty + ' = ' + fmtMontant((item.prix_vente || 0) * (item.qty || 0))
    ).join('\n')

    const msg = encodeURIComponent(
      '*' + (data.entreprise_nom || 'GestiCom Pro') + '*\n' +
      'FACTURE / REÇU\n\n' +
      'N° : ' + fmtNumero(ventesIndex) + '\n' +
      'Date : ' + fmtDate(data.created_at) + '\n' +
      'Client : ' + (data.client_nom || 'Client direct') + '\n\n' +
      '――――――――――――――――――\n' +
      lignes + '\n' +
      '――――――――――――――――――\n' +
      '*TOTAL : ' + fmtMontant(data.montant_total) + '*\n\n' +
      'Merci pour votre achat !'
    )
    window.open('https://wa.me/?text=' + msg, '_blank')
    showToast('WhatsApp ouvert !')
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:32, width:480, maxWidth:'92vw', maxHeight:'90vh', overflowY:'auto' }}>

        {/* En-tête aperçu */}
        <div style={{ background:`linear-gradient(135deg, #1D4ED8, #2563EB)`, borderRadius:12, padding:20, marginBottom:20, color:'#fff', textAlign:'center' }}>
          <div style={{ fontWeight:800, fontSize:22, letterSpacing:1 }}>GESTICOM PRO</div>
          <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>Gestion commerciale · Afrique francophone</div>
          <div style={{ marginTop:10, fontSize:13, fontWeight:600, background:'rgba(255,255,255,0.2)', borderRadius:20, padding:'4px 16px', display:'inline-block' }}>
            FACTURE / REÇU
          </div>
        </div>

        {/* Infos facture */}
        <div style={{ background:'#F8FAFC', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
          {[
            ['N° Facture', fmtNumero(ventesIndex)],
            ['Date',       fmtDate(data.created_at)],
            ['Client',     data.client_nom || 'Client direct'],
            ['Entreprise', data.entreprise_nom || 'Mon Entreprise'],
          ].map(([k, v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #E5E7EB', fontSize:13 }}>
              <span style={{ color:C.g500 }}>{k}</span>
              <span style={{ fontWeight:600, color:k==='N° Facture'?C.pri:C.g800 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Articles */}
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, marginBottom:16 }}>
          <thead>
            <tr style={{ background:'#2563EB', color:'#fff' }}>
              <th style={{ padding:'8px 10px', textAlign:'left', borderRadius:'6px 0 0 0' }}>Désignation</th>
              <th style={{ padding:'8px 6px', textAlign:'center' }}>Qté</th>
              <th style={{ padding:'8px 10px', textAlign:'right' }}>Prix unit.</th>
              <th style={{ padding:'8px 10px', textAlign:'right', borderRadius:'0 6px 0 0' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(data.panier || []).map((item, i) => (
              <tr key={item.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                <td style={{ padding:'8px 10px', borderBottom:'1px solid #E5E7EB' }}>{item.nom}</td>
                <td style={{ padding:'8px 6px', textAlign:'center', borderBottom:'1px solid #E5E7EB' }}>{item.qty}</td>
                <td style={{ padding:'8px 10px', textAlign:'right', borderBottom:'1px solid #E5E7EB' }}>{fmtMontant(item.prix_vente)}</td>
                <td style={{ padding:'8px 10px', textAlign:'right', borderBottom:'1px solid #E5E7EB', fontWeight:600 }}>{fmtMontant((item.prix_vente || 0) * (item.qty || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div style={{ background:'#2563EB', borderRadius:10, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <span style={{ color:'#fff', fontWeight:700, fontSize:15 }}>TOTAL</span>
          <span style={{ color:'#fff', fontWeight:800, fontSize:20 }}>{fmtMontant(data.montant_total)}</span>
        </div>

        <div style={{ textAlign:'center', fontSize:12, color:C.g500, fontStyle:'italic', marginBottom:20 }}>
          Merci pour votre achat. Ce reçu fait office de facture.
        </div>

        {/* Boutons */}
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <button onClick={handlePDF}
            style={{ flex:1, padding:12, background:C.priL, color:C.pri, border:`1px solid ${C.pri}`, borderRadius:10, fontWeight:700, cursor:'pointer', fontSize:14 }}>
            📄 Télécharger PDF
          </button>
          <button onClick={handleWhatsApp}
            style={{ flex:1, padding:12, background:'#F0FDF4', color:'#128C7E', border:'1px solid #25D366', borderRadius:10, fontWeight:700, cursor:'pointer', fontSize:14 }}>
            💬 Envoyer WhatsApp
          </button>
        </div>
        <button onClick={onClose}
          style={{ width:'100%', padding:10, background:'#fff', border:`1px solid ${C.g200}`, borderRadius:10, cursor:'pointer', color:C.g500, fontSize:13 }}>
          Fermer
        </button>
      </div>
    </div>
  )
}