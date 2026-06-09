import { useState, useEffect } from 'react'
import { sb } from '../supabase'

const C = { pri:'#2563EB', priL:'#EFF6FF', ok:'#16A34A', okL:'#F0FDF4', err:'#DC2626', errL:'#FEF2F2', war:'#D97706', g100:'#F3F4F6', g200:'#E5E7EB', g500:'#6B7280', g600:'#4B5563', g800:'#1F2937' }
const fmt = n => (n||0).toLocaleString('fr-FR') + ' FCFA'
const today = new Date().toISOString().slice(0,10)

export default function Dashboard({ eid, isGer }) {
  const [prods,  setProds]  = useState([])
  const [ventes, setVentes] = useState([])
  const [clis,   setClis]   = useState([])
  const [load,   setLoad]   = useState(true)

  useEffect(() => { if (eid) fetchAll() }, [eid])

  async function fetchAll() {
    setLoad(true)
    const [rP, rV, rC] = await Promise.all([
      sb.from('produits').select('*').eq('entreprise_id', eid),
      sb.from('ventes').select('*').eq('entreprise_id', eid).order('created_at', { ascending:false }).limit(50),
      sb.from('clients').select('id').eq('entreprise_id', eid),
    ])
    setProds(rP.data || [])
    setVentes(rV.data || [])
    setClis(rC.data || [])
    setLoad(false)
  }

  const alerts   = prods.filter(p => p.stock <= p.seuil_alerte)
  const totV     = ventes.reduce((s,v) => s + (v.montant_total||0), 0)
  const totB     = ventes.reduce((s,v) => s + (v.benefice_total||0), 0)
  const todayV   = ventes.filter(v => v.created_at?.slice(0,10) === today).reduce((s,v) => s + v.montant_total, 0)

  const kpis = [
    { lb:'Ventes du jour', v:fmt(todayV),    ic:'💰', c:C.pri },
    ...(isGer ? [
      { lb:'CA total',     v:fmt(totV),       ic:'📊', c:'#7C3AED' },
      { lb:'Bénéfice total',v:fmt(totB),      ic:'📈', c:C.ok },
    ] : []),
    { lb:'Produits',       v:prods.length,    ic:'📦', c:C.war },
    { lb:'Alertes stock',  v:alerts.length,   ic:'⚠️', c:C.err },
    { lb:'Clients',        v:clis.length,     ic:'👥', c:'#0891B2' },
  ]

  if (load) return <Spin/>

  return (
    <div style={{ padding:24 }}>
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginBottom:24 }}>
        {kpis.map((k,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:16 }}>
            <div style={{ fontSize:22 }}>{k.ic}</div>
            <div style={{ fontSize:12, color:C.g600, fontWeight:500, marginTop:6 }}>{k.lb}</div>
            <div style={{ fontSize:20, fontWeight:800, color:k.c, marginTop:4 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div style={{ background:C.errL, border:'1px solid #FCA5A5', borderRadius:12, padding:16, marginBottom:24 }}>
          <div style={{ fontWeight:700, color:C.err, marginBottom:10 }}>⚠️ Alertes stock faible</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {alerts.map(p => <span key={p.id} style={{ background:'#fff', border:'1px solid #FCA5A5', borderRadius:20, padding:'4px 12px', fontSize:13, color:C.err }}>{p.nom} — {p.stock} restants</span>)}
          </div>
        </div>
      )}

      {/* Dernières ventes */}
      <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:20 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Dernières ventes</div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.g200}` }}>
              {['Date','Client','Montant','Bénéfice','Articles'].map(h => <th key={h} style={{ textAlign:'left', padding:'8px 12px', color:C.g600, fontSize:12, fontWeight:600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {ventes.slice(0,8).map(v => (
              <tr key={v.id} style={{ borderBottom:`1px solid ${C.g100}` }}>
                <td style={{ padding:'10px 12px', color:C.g600, fontSize:13 }}>{v.created_at?.slice(0,10)}</td>
                <td style={{ padding:'10px 12px', fontWeight:500 }}>{v.client_nom}</td>
                <td style={{ padding:'10px 12px', fontWeight:700, color:C.pri }}>{fmt(v.montant_total)}</td>
                <td style={{ padding:'10px 12px', color:C.ok, fontWeight:600 }}>{fmt(v.benefice_total)}</td>
                <td style={{ padding:'10px 12px', color:C.g500 }}>{v.nb_articles}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Spin() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
    <div style={{ width:36, height:36, border:'3px solid #BFDBFE', borderTop:'3px solid #2563EB', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
  </div>
}