import { useState, useEffect } from 'react'
import { sb } from '../supabase'

const C = {
  err:'#DC2626', errL:'#FEF2F2',
  war:'#D97706', warL:'#FFFBEB',
  ok:'#16A34A',  okL:'#F0FDF4',
  g200:'#E5E7EB', g500:'#6B7280', g600:'#4B5563', g800:'#1F2937'
}

export default function AlertesStock({ eid, showToast }) {
  const [alertes, setAlertes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre,  setFiltre]  = useState('tous') // tous | faible | epuise

  useEffect(() => { if (eid) load() }, [eid])

  async function load() {
    setLoading(true)
    const { data, error } = await sb
      .from('alertes_stock')
      .select('*')
      .eq('entreprise_id', eid)
      .eq('vue', false)
      .order('created_at', { ascending: false })
    if (error) showToast(error.message, 'error')
    else setAlertes(data || [])
    setLoading(false)
  }

  async function marquerVue(id) {
    await sb.from('alertes_stock').update({ vue: true }).eq('id', id)
    setAlertes(prev => prev.filter(a => a.id !== id))
    showToast('Alerte marquée comme traitée ✅')
  }

  async function marquerToutesVues() {
    await sb.from('alertes_stock').update({ vue: true }).eq('entreprise_id', eid).eq('vue', false)
    setAlertes([])
    showToast('Toutes les alertes ont été traitées ✅')
  }

  const filt = filtre === 'tous' ? alertes : alertes.filter(a => a.type_alerte === filtre)
  const nbEpuises = alertes.filter(a => a.type_alerte === 'epuise').length
  const nbFaibles = alertes.filter(a => a.type_alerte === 'faible').length

  return (
    <div style={{ padding:24 }}>

      {/* Résumé */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
        {[
          { label:'Total alertes',   val:alertes.length, color:C.err,  bg:C.errL, ic:'🔔' },
          { label:'Stock épuisé',    val:nbEpuises,      color:C.err,  bg:C.errL, ic:'🚫' },
          { label:'Stock faible',    val:nbFaibles,      color:C.war,  bg:C.warL, ic:'⚠️' },
        ].map((k,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:16 }}>
            <div style={{ fontSize:22 }}>{k.ic}</div>
            <div style={{ fontSize:12, color:C.g600, fontWeight:500, marginTop:6 }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:k.color, marginTop:4 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filtres + actions */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:8 }}>
          {[['tous','Toutes'],['epuise','Épuisées'],['faible','Faibles']].map(([k,lb]) => (
            <button key={k} onClick={() => setFiltre(k)}
              style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${filtre===k?C.err:C.g200}`, background:filtre===k?C.errL:'#fff', color:filtre===k?C.err:C.g600, fontWeight:filtre===k?700:400, fontSize:13, cursor:'pointer' }}>
              {lb}
            </button>
          ))}
        </div>
        {alertes.length > 0 && (
          <button onClick={marquerToutesVues}
            style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${C.ok}`, background:C.okL, color:C.ok, fontWeight:600, fontSize:13, cursor:'pointer' }}>
            ✅ Tout marquer comme traité
          </button>
        )}
      </div>

      {/* Liste alertes */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:C.g500 }}>Chargement…</div>
      ) : filt.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:48, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
          <div style={{ fontWeight:700, fontSize:18, color:C.g800, marginBottom:6 }}>Aucune alerte</div>
          <div style={{ color:C.g500, fontSize:14 }}>Tous vos stocks sont à un niveau correct.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filt.map(a => {
            const epuise = a.type_alerte === 'epuise'
            return (
              <div key={a.id} style={{ background:'#fff', borderRadius:12, border:`1.5px solid ${epuise?'#FCA5A5':'#FCD34D'}`, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, flex:1 }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:epuise?C.errL:C.warL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                    {epuise ? '🚫' : '⚠️'}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, color:C.g800, fontSize:15 }}>{a.produit_nom}</div>
                    <div style={{ fontSize:13, color:epuise?C.err:C.war, fontWeight:600, marginTop:2 }}>
                      {epuise ? 'Stock épuisé' : `Stock faible — ${a.stock_actuel} unité(s) restante(s)`}
                    </div>
                    <div style={{ fontSize:12, color:C.g500, marginTop:2 }}>
                      Seuil : {a.seuil_alerte} · {new Date(a.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </div>
                </div>
                <button onClick={() => marquerVue(a.id)}
                  style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${C.ok}`, background:C.okL, color:C.ok, cursor:'pointer', fontWeight:600, fontSize:13, whiteSpace:'nowrap' }}>
                  ✅ Traité
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}