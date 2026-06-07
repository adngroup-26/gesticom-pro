import { useState, useEffect } from 'react'
import { sb } from '../supabase'

const C = { pri:'#2563EB', priL:'#EFF6FF', ok:'#16A34A', g50:'#F9FAFB', g100:'#F3F4F6', g200:'#E5E7EB', g500:'#6B7280', g600:'#4B5563', g800:'#1F2937' }
const fmt = n => (n||0).toLocaleString('fr-FR') + ' FCFA'
const EMPTY = { nom:'', tel:'', adr:'' }

export default function Clients({ eid, showToast }) {
  const [clis,   setClis]   = useState([])
  const [modal,  setModal]  = useState(false)
  const [form,   setForm]   = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => { if (eid) load() }, [eid])

  async function load() {
    const { data } = await sb.from('clients').select('*').eq('entreprise_id', eid).order('nom')
    setClis(data || [])
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function saveCli() {
    if (!form.nom || saving) return; setSaving(true)
    const { error } = await sb.from('clients').insert({
      entreprise_id: eid, nom: form.nom, telephone: form.tel, adresse: form.adr, total_achats: 0
    })
    if (error) showToast(error.message, 'error')
    else { setForm(EMPTY); setModal(false); showToast('Client ajouté ✅'); load() }
    setSaving(false)
  }

  async function loadHistorique(cli) {
    const { data } = await sb.from('ventes').select('*').eq('client_id', cli.id).order('created_at', { ascending: false })
    setSelected({ ...cli, historique: data || [] })
  }

  const filt = clis.filter(c => c.nom?.toLowerCase().includes(search.toLowerCase()) || c.telephone?.includes(search))

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <input placeholder="🔍 Rechercher un client…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${C.g200}`, fontSize:14, width:280 }}/>
        <button onClick={() => setModal(true)}
          style={{ background:C.pri, color:'#fff', border:'none', borderRadius:10, padding:'10px 18px', fontWeight:600, fontSize:14, cursor:'pointer' }}>
          + Nouveau client
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:16 }}>
        {filt.map(c => (
          <div key={c.id} onClick={() => loadHistorique(c)}
            style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:20, cursor:'pointer', transition:'box-shadow .2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(37,99,235,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:C.priL, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:C.pri, fontSize:18, flexShrink:0 }}>
                {c.nom?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight:700, color:C.g800 }}>{c.nom}</div>
                <div style={{ fontSize:12, color:C.g500, marginTop:2 }}>{c.adresse}</div>
              </div>
            </div>
            <div style={{ fontSize:13, color:C.g600, marginBottom:10 }}>📞 {c.telephone}</div>
            <div style={{ padding:10, background:C.g50, borderRadius:8, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:C.g600 }}>Total achats</span>
              <span style={{ fontWeight:700, color:C.pri }}>{fmt(c.total_achats)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal ajout client */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:380, maxWidth:'93vw' }}>
            <div style={{ fontWeight:700, fontSize:18, marginBottom:18 }}>+ Nouveau client</div>
            {[['Nom complet','nom','text'],['Téléphone','tel','tel'],['Adresse','adr','text']].map(([lb,k,tp]) => (
              <div key={k} style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, color:C.g600, fontWeight:500, display:'block', marginBottom:4 }}>{lb}</label>
                <input type={tp} value={form[k]} onChange={set(k)} style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${C.g200}`, fontSize:14 }}/>
              </div>
            ))}
            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              <button onClick={() => setModal(false)} style={{ flex:1, padding:10, borderRadius:10, border:`1px solid ${C.g200}`, background:'#fff', cursor:'pointer', fontWeight:600 }}>Annuler</button>
              <button onClick={saveCli} disabled={saving} style={{ flex:1, padding:10, borderRadius:10, background:C.pri, color:'#fff', border:'none', cursor:'pointer', fontWeight:700 }}>{saving?'…':'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal historique client */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:520, maxWidth:'93vw', maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:18 }}>{selected.nom}</div>
                <div style={{ fontSize:13, color:C.g500 }}>{selected.telephone} · {selected.adresse}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:'#fff', border:`1px solid ${C.g200}`, borderRadius:8, padding:'6px 12px', cursor:'pointer', color:C.g600 }}>✕ Fermer</button>
            </div>
            <div style={{ background:C.priL, borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:C.pri, fontWeight:500 }}>Total achats</span>
              <span style={{ fontWeight:800, color:C.pri, fontSize:18 }}>{fmt(selected.total_achats)}</span>
            </div>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:10, color:C.g800 }}>Historique des achats ({selected.historique.length})</div>
            {selected.historique.length === 0
              ? <div style={{ color:C.g500, textAlign:'center', padding:'20px 0' }}>Aucun achat enregistré</div>
              : selected.historique.map(v => (
                <div key={v.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${C.g100}`, fontSize:14 }}>
                  <span style={{ color:C.g600 }}>{v.created_at?.slice(0,10)}</span>
                  <span>{v.nb_articles} article(s)</span>
                  <span style={{ fontWeight:700, color:C.pri }}>{fmt(v.montant_total)}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}