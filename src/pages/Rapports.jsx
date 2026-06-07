import { useState, useEffect } from 'react'
import { sb } from '../supabase'

const C = { pri:'#2563EB', priL:'#EFF6FF', ok:'#16A34A', okL:'#F0FDF4', err:'#DC2626', war:'#D97706', g50:'#F9FAFB', g100:'#F3F4F6', g200:'#E5E7EB', g500:'#6B7280', g600:'#4B5563', g800:'#1F2937' }
const fmt = n => (n||0).toLocaleString('fr-FR') + ' FCFA'

export default function Rapports({ eid }) {
  const [ventes, setVentes] = useState([])
  const [prods,  setProds]  = useState([])
  const [period, setPeriod] = useState('month') // week | month | year | all
  const [load,   setLoad]   = useState(true)

  useEffect(() => { if (eid) fetchAll() }, [eid])

  async function fetchAll() {
    setLoad(true)
    const [rV, rP] = await Promise.all([
      sb.from('ventes').select('*').eq('entreprise_id', eid).order('created_at', { ascending: false }),
      sb.from('produits').select('*').eq('entreprise_id', eid),
    ])
    setVentes(rV.data || [])
    setProds(rP.data  || [])
    setLoad(false)
  }

  // Filtrer par période
  const now = new Date()
  const filtered = ventes.filter(v => {
    if (!v.created_at) return false
    const d = new Date(v.created_at)
    if (period === 'week')  return (now - d) <= 7*24*3600*1000
    if (period === 'month') return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()
    if (period === 'year')  return d.getFullYear()===now.getFullYear()
    return true
  })

  const totV   = filtered.reduce((s,v) => s+(v.montant_total||0), 0)
  const totB   = filtered.reduce((s,v) => s+(v.benefice_total||0), 0)
  const marge  = totV > 0 ? Math.round((totB/totV)*100) : 0
  const txMoy  = filtered.length > 0 ? Math.round(totV/filtered.length) : 0

  // Ventes par jour (7 derniers jours)
  const byDay = {}
  filtered.slice().reverse().forEach(v => {
    const d = v.created_at?.slice(0,10)
    if (d) byDay[d] = (byDay[d]||0) + v.montant_total
  })
  const dayKeys = Object.keys(byDay).sort().slice(-7)
  const dayMax  = Math.max(...dayKeys.map(d => byDay[d]), 1)

  // Top 5 produits par valeur stock
  const topProds = [...prods].sort((a,b) => (b.prix_vente*b.stock)-(a.prix_vente*a.stock)).slice(0,5)

  // Top clients par CA
  const byCli = {}
  filtered.forEach(v => {
    if (!v.client_nom || v.client_nom==='Client direct') return
    byCli[v.client_nom] = (byCli[v.client_nom]||0) + v.montant_total
  })
  const topClis = Object.entries(byCli).sort((a,b)=>b[1]-a[1]).slice(0,5)

  const periods = [['week','7 jours'],['month','Ce mois'],['year','Cette année'],['all','Tout']]

  if (load) return <Spin/>

  return (
    <div style={{ padding:24 }}>
      {/* Sélecteur période */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {periods.map(([k,lb]) => (
          <button key={k} onClick={() => setPeriod(k)}
            style={{ padding:'8px 16px', borderRadius:20, border:`1px solid ${period===k?C.pri:C.g200}`, background:period===k?C.pri:'#fff', color:period===k?'#fff':C.g600, fontWeight:period===k?700:400, fontSize:14, cursor:'pointer' }}>
            {lb}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
        {[
          { lb:'Chiffre d\'affaires', v:fmt(totV),         c:C.pri,  ic:'📊' },
          { lb:'Bénéfice net',        v:fmt(totB),         c:C.ok,   ic:'📈' },
          { lb:'Marge moyenne',       v:marge+'%',         c:'#7C3AED', ic:'💹' },
          { lb:'Ticket moyen',        v:fmt(txMoy),        c:C.war,  ic:'🎫' },
          { lb:'Transactions',        v:filtered.length,   c:'#0891B2', ic:'🔢' },
        ].map((k,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:16 }}>
            <div style={{ fontSize:22 }}>{k.ic}</div>
            <div style={{ fontSize:12, color:C.g600, fontWeight:500, marginTop:6 }}>{k.lb}</div>
            <div style={{ fontSize:20, fontWeight:800, color:k.c, marginTop:4 }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Graphique ventes par jour */}
        <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:20 }}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>📊 Ventes par jour</div>
          {dayKeys.length === 0
            ? <div style={{ color:C.g500, textAlign:'center', padding:'20px 0' }}>Aucune donnée</div>
            : dayKeys.map(d => (
              <div key={d} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                  <span style={{ color:C.g600 }}>{d}</span>
                  <span style={{ fontWeight:700, color:C.pri }}>{fmt(byDay[d])}</span>
                </div>
                <div style={{ height:8, background:C.g100, borderRadius:10 }}>
                  <div style={{ height:8, background:C.pri, borderRadius:10, width:`${Math.round((byDay[d]/dayMax)*100)}%`, transition:'width .4s' }}/>
                </div>
              </div>
            ))
          }
        </div>

        {/* Top clients */}
        <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:20 }}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>🏆 Top clients</div>
          {topClis.length === 0
            ? <div style={{ color:C.g500, textAlign:'center', padding:'20px 0' }}>Aucun client nommé</div>
            : topClis.map(([nom,total],i) => (
              <div key={nom} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${C.g100}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:C.priL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:C.pri }}>{i+1}</div>
                  <span style={{ fontSize:14, fontWeight:500 }}>{nom}</span>
                </div>
                <span style={{ fontWeight:700, color:C.pri, fontSize:14 }}>{fmt(total)}</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Top produits en stock */}
      <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:20 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>📦 Top 5 produits — valeur stock</div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead>
            <tr style={{ background:C.g50 }}>
              {['Produit','Catégorie','Prix vente','Stock','Valeur stock','Marge'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:C.g600, fontSize:12, fontWeight:600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topProds.map(p => {
              const mg = p.prix_revient > 0 ? Math.round(((p.prix_vente-p.prix_revient)/p.prix_revient)*100) : 0
              return (
                <tr key={p.id} style={{ borderBottom:`1px solid ${C.g100}` }}>
                  <td style={{ padding:'10px 14px', fontWeight:600 }}>{p.nom}</td>
                  <td style={{ padding:'10px 14px' }}><span style={{ background:C.priL, color:C.pri, borderRadius:20, padding:'2px 9px', fontSize:12 }}>{p.categorie}</span></td>
                  <td style={{ padding:'10px 14px', fontWeight:600 }}>{fmt(p.prix_vente)}</td>
                  <td style={{ padding:'10px 14px' }}>{p.stock}</td>
                  <td style={{ padding:'10px 14px', fontWeight:700, color:C.pri }}>{fmt(p.prix_vente*p.stock)}</td>
                  <td style={{ padding:'10px 14px', color:C.ok, fontWeight:600 }}>{mg}%</td>
                </tr>
              )
            })}
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