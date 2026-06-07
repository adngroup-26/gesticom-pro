import { useState, useEffect } from 'react'
import { sb } from '../supabase'

const C = { pri:'#2563EB', priL:'#EFF6FF', ok:'#16A34A', okL:'#F0FDF4', err:'#DC2626', errL:'#FEF2F2', g50:'#F9FAFB', g100:'#F3F4F6', g200:'#E5E7EB', g500:'#6B7280', g600:'#4B5563', g800:'#1F2937' }
const fmt = n => (n||0).toLocaleString('fr-FR') + ' FCFA'

const EMPTY = { nom:'', cat:'', pa:'', tr:'', qt:'', pv:'', al:'10' }

export default function Stock({ eid, showToast, isAdm }) {
  const [prods,  setProds]  = useState([])
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(false)
  const [form,   setForm]   = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (eid) load() }, [eid])

  async function load() {
    const { data } = await sb.from('produits').select('*').eq('entreprise_id', eid).order('nom')
    setProds(data || [])
  }

  const prCalc = () => {
    const pa = parseFloat(form.pa)||0, tr = parseFloat(form.tr)||0, qt = parseFloat(form.qt)||1
    return pa + tr/qt
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function saveProd() {
    if (!form.nom || saving) return; setSaving(true)
    const { error } = await sb.from('produits').insert({
      entreprise_id: eid, nom: form.nom, categorie: form.cat,
      prix_achat: parseFloat(form.pa)||0, prix_transport: parseFloat(form.tr)||0,
      qte_achetee: parseInt(form.qt)||0, prix_vente: parseFloat(form.pv)||0,
      stock: parseInt(form.qt)||0, seuil_alerte: parseInt(form.al)||10,
    })
    if (error) showToast(error.message, 'error')
    else { setForm(EMPTY); setModal(false); showToast('Produit ajouté ✅'); load() }
    setSaving(false)
  }

  async function delProd(id) {
    const { error } = await sb.from('produits').delete().eq('id', id)
    if (error) showToast(error.message, 'error')
    else { showToast('Produit supprimé', 'error'); load() }
  }

  const filt = prods.filter(p => p.nom?.toLowerCase().includes(search.toLowerCase()) || p.categorie?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <input placeholder="🔍 Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${C.g200}`, fontSize:14, width:280 }}/>
        <button onClick={() => setModal(true)} style={{ background:C.pri, color:'#fff', border:'none', borderRadius:10, padding:'10px 18px', fontWeight:600, fontSize:14, cursor:'pointer' }}>+ Nouveau produit</button>
      </div>

      <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead>
            <tr style={{ background:C.g50 }}>
              {['Produit','Catégorie','Prix revient','Prix vente','Marge','Stock','Statut',''].map(h => (
                <th key={h} style={{ padding:'12px 14px', textAlign:'left', color:C.g600, fontSize:12, fontWeight:600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filt.map(p => {
              const mg = p.prix_revient > 0 ? Math.round(((p.prix_vente - p.prix_revient) / p.prix_revient) * 100) : 0
              const al = p.stock <= p.seuil_alerte
              return (
                <tr key={p.id} style={{ borderBottom:`1px solid ${C.g100}` }}>
                  <td style={{ padding:'12px 14px', fontWeight:600 }}>{p.nom}</td>
                  <td style={{ padding:'12px 14px' }}><span style={{ background:C.priL, color:C.pri, borderRadius:20, padding:'3px 10px', fontSize:12 }}>{p.categorie}</span></td>
                  <td style={{ padding:'12px 14px', color:C.g500 }}>{fmt(p.prix_revient)}</td>
                  <td style={{ padding:'12px 14px', fontWeight:600 }}>{fmt(p.prix_vente)}</td>
                  <td style={{ padding:'12px 14px', color:C.ok, fontWeight:600 }}>{mg}%</td>
                  <td style={{ padding:'12px 14px', fontWeight:700, color:al?C.err:C.g800 }}>{p.stock}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ background:al?C.errL:C.okL, color:al?C.err:C.ok, borderRadius:20, padding:'4px 10px', fontSize:12, fontWeight:600 }}>{al?'⚠️ Faible':'✅ OK'}</span>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    {isAdm && <button onClick={() => delProd(p.id)} style={{ background:C.errL, color:C.err, border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:12 }}>Suppr.</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal ajout produit */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:430, maxWidth:'93vw', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ fontWeight:700, fontSize:18, marginBottom:18 }}>+ Nouveau produit</div>
            {[['Nom du produit','nom','text'],['Catégorie','cat','text'],['Prix d\'achat unitaire (FCFA)','pa','number'],['Montant transport (FCFA)','tr','number'],['Qté totale achetée','qt','number']].map(([lb,k,tp]) => (
              <div key={k} style={{ marginBottom:12 }}>
                <label style={{ fontSize:13, color:C.g600, fontWeight:500, display:'block', marginBottom:4 }}>{lb}</label>
                <input type={tp} value={form[k]} onChange={set(k)} style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${C.g200}`, fontSize:14 }}/>
              </div>
            ))}
            {/* Prix de revient calculé */}
            <div style={{ background:C.priL, border:`1px solid #93C5FD`, borderRadius:8, padding:'10px 12px', marginBottom:12 }}>
              <div style={{ fontSize:12, color:C.pri, fontWeight:600 }}>Prix de revient (calculé automatiquement)</div>
              <div style={{ fontSize:18, fontWeight:800, color:C.pri, marginTop:2 }}>
                {form.qt && +form.qt > 0 ? prCalc().toLocaleString('fr-FR', { maximumFractionDigits:0 }) + ' FCFA' : '—'}
              </div>
              <div style={{ fontSize:11, color:C.g500, marginTop:2 }}>PR = Prix achat + Transport ÷ Qté</div>
            </div>
            {[['Prix de vente (FCFA)','pv','number'],['Seuil d\'alerte stock','al','number']].map(([lb,k,tp]) => (
              <div key={k} style={{ marginBottom:12 }}>
                <label style={{ fontSize:13, color:C.g600, fontWeight:500, display:'block', marginBottom:4 }}>{lb}</label>
                <input type={tp} value={form[k]} onChange={set(k)} style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${C.g200}`, fontSize:14 }}/>
              </div>
            ))}
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={() => setModal(false)} style={{ flex:1, padding:10, borderRadius:10, border:`1px solid ${C.g200}`, background:'#fff', cursor:'pointer', fontWeight:600 }}>Annuler</button>
              <button onClick={saveProd} disabled={saving} style={{ flex:1, padding:10, borderRadius:10, background:C.pri, color:'#fff', border:'none', cursor:'pointer', fontWeight:700 }}>{saving?'…':'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}