import { useState, useEffect } from 'react'
import { sb } from '../supabase'
import Facture from '../components/Facture'

const C = { pri:'#2563EB', priL:'#EFF6FF', ok:'#16A34A', g50:'#F9FAFB', g100:'#F3F4F6', g200:'#E5E7EB', g500:'#6B7280', g600:'#4B5563', g800:'#1F2937' }
const fmt = n => (n||0).toLocaleString('fr-FR') + ' FCFA'

export default function Historique({ eid, showToast }) {
  const [ventes,  setVentes]  = useState([])
  const [loading, setLoading] = useState(true)
  const [facture, setFacture] = useState(null)
  const [search,  setSearch]  = useState('')
  const [dateFrom,setDateFrom]= useState('')
  const [dateTo,  setDateTo]  = useState('')
  const [page,    setPage]    = useState(1)
  const PER_PAGE = 20

  useEffect(() => { if (eid) load() }, [eid])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('ventes').select('*').eq('entreprise_id', eid).order('created_at', { ascending: false })
    setVentes(data || [])
    setLoading(false)
  }

  async function openFacture(v) {
    const { data: lignes } = await sb.from('lignes_vente').select('*').eq('vente_id', v.id)
    const panier = (lignes || []).map(l => ({ id: l.produit_id, nom: l.produit_nom, qty: l.quantite, prix_vente: l.prix_unitaire, prix_revient: l.prix_revient_unitaire }))
    setFacture({ ...v, panier })
  }

  const filt = ventes.filter(v => {
    const matchSearch = v.client_nom?.toLowerCase().includes(search.toLowerCase())
    const matchFrom   = !dateFrom || v.created_at?.slice(0,10) >= dateFrom
    const matchTo     = !dateTo   || v.created_at?.slice(0,10) <= dateTo
    return matchSearch && matchFrom && matchTo
  })

  const totalPages = Math.ceil(filt.length / PER_PAGE)
  const paginated  = filt.slice((page-1)*PER_PAGE, page*PER_PAGE)
  const totFiltre  = filt.reduce((s,v) => s + (v.montant_total||0), 0)
  const benFiltre  = filt.reduce((s,v) => s + (v.benefice_total||0), 0)

  return (
    <div style={{ padding:24 }}>
      {/* Filtres */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input placeholder="🔍 Rechercher un client…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${C.g200}`, fontSize:14, flex:1, minWidth:200 }}/>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          style={{ padding:'9px 12px', borderRadius:10, border:`1px solid ${C.g200}`, fontSize:14 }}/>
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          style={{ padding:'9px 12px', borderRadius:10, border:`1px solid ${C.g200}`, fontSize:14 }}/>
        <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}
          style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${C.g200}`, background:'#fff', cursor:'pointer', fontSize:14, color:C.g600 }}>
          ✕ Réinitialiser
        </button>
      </div>

      {/* Résumé */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {[
          { lb:'Transactions filtrées', v:filt.length, c:C.pri },
          { lb:'CA filtré',             v:fmt(totFiltre), c:'#7C3AED' },
          { lb:'Bénéfice filtré',       v:fmt(benFiltre), c:C.ok },
        ].map((k,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:'14px 16px' }}>
            <div style={{ fontSize:12, color:C.g600, fontWeight:500 }}>{k.lb}</div>
            <div style={{ fontSize:18, fontWeight:800, color:k.c, marginTop:4 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, overflow:'hidden' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
            <div style={{ width:32, height:32, border:'3px solid #BFDBFE', borderTop:'3px solid #2563EB', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
            <thead>
              <tr style={{ background:C.g50 }}>
                {['Date','Client','Articles','Montant','Bénéfice','Facture'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', color:C.g600, fontSize:12, fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(v => (
                <tr key={v.id} style={{ borderBottom:`1px solid ${C.g100}` }}>
                  <td style={{ padding:'11px 14px', color:C.g600, fontSize:13 }}>{v.created_at?.slice(0,10)}</td>
                  <td style={{ padding:'11px 14px', fontWeight:500 }}>{v.client_nom}</td>
                  <td style={{ padding:'11px 14px', color:C.g600 }}>{v.nb_articles}</td>
                  <td style={{ padding:'11px 14px', fontWeight:700, color:C.pri }}>{fmt(v.montant_total)}</td>
                  <td style={{ padding:'11px 14px', color:C.ok, fontWeight:600 }}>{fmt(v.benefice_total)}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <button onClick={() => openFacture(v)}
                      style={{ background:C.priL, color:C.pri, border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                      📄 Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:16 }}>
          {Array.from({ length: totalPages }, (_, i) => i+1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              style={{ width:36, height:36, borderRadius:8, border:`1px solid ${p===page?C.pri:C.g200}`, background:p===page?C.pri:'#fff', color:p===page?'#fff':C.g600, fontWeight:600, cursor:'pointer', fontSize:14 }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {facture && <Facture data={facture} onClose={() => setFacture(null)} showToast={showToast}/>}
    </div>
  )
}