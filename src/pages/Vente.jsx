import { useState, useEffect } from 'react'
import { sb } from '../supabase'
import Facture from '../components/Facture'

const C = { pri:'#2563EB', priL:'#EFF6FF', ok:'#16A34A', okL:'#F0FDF4', err:'#DC2626', errL:'#FEF2F2', g100:'#F3F4F6', g200:'#E5E7EB', g500:'#6B7280', g600:'#4B5563', g800:'#1F2937' }
const fmt = n => (n||0).toLocaleString('fr-FR') + ' FCFA'

export default function Vente({ eid, profil, showToast }) {
  const [prods,   setProds]   = useState([])
  const [clis,    setClis]    = useState([])
  const [panier,  setPanier]  = useState([])
  const [clv,     setClv]     = useState('Client direct')
  const [search,  setSearch]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [facture, setFacture] = useState(null)

  useEffect(() => { if (eid) fetchAll() }, [eid])

  async function fetchAll() {
    const [rP, rC] = await Promise.all([
      sb.from('produits').select('*').eq('entreprise_id', eid).order('nom'),
      sb.from('clients').select('*').eq('entreprise_id', eid).order('nom'),
    ])
    setProds(rP.data || [])
    setClis(rC.data  || [])
  }

  // ── Panier ────────────────────────────────────────────────────────────────
  function addCart(p) {
    if (p.stock <= 0) { showToast('Stock épuisé pour ' + p.nom, 'error'); return }
    setPanier(prev => {
      const ex = prev.find(x => x.id === p.id)
      if (ex) {
        if (ex.qty >= p.stock) { showToast('Stock insuffisant — max ' + p.stock + ' unité(s)', 'error'); return prev }
        return prev.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x)
      }
      return [...prev, { ...p, qty: 1 }]
    })
    showToast(p.nom + ' ajouté')
  }

  function updQty(id, qty) {
    if (qty < 1) return rmCart(id)
    setPanier(prev => prev.map(x => {
      if (x.id !== id) return x
      if (qty > x.stock) { showToast('Stock insuffisant — max ' + x.stock + ' unité(s)', 'error'); return x }
      return { ...x, qty }
    }))
  }

  function rmCart(id) { setPanier(p => p.filter(x => x.id !== id)) }

  const totPan = panier.reduce((s, x) => s + x.prix_vente * x.qty, 0)
  const benPan = panier.reduce((s, x) => s + (x.prix_vente - x.prix_revient) * x.qty, 0)

  // ── Valider la vente ──────────────────────────────────────────────────────
  async function valider() {
    if (!panier.length || saving) return
    setSaving(true)
    try {
      const cObj = clis.find(c => c.nom === clv)
      const { data: [vente], error } = await sb.from('ventes').insert({
        entreprise_id:  eid,
        client_id:      cObj?.id || null,
        client_nom:     clv,
        montant_total:  totPan,
        benefice_total: benPan,
        nb_articles:    panier.reduce((s, x) => s + x.qty, 0),
      }).select()
      if (error) throw error

      // Lignes de vente
      await sb.from('lignes_vente').insert(
        panier.map(x => ({
          vente_id:               vente.id,
          produit_id:             x.id,
          produit_nom:            x.nom,
          quantite:               x.qty,
          prix_unitaire:          x.prix_vente,
          prix_revient_unitaire:  x.prix_revient,
          sous_total:             x.prix_vente * x.qty,
        }))
      )

      // Décrémenter stock
      await Promise.all(panier.map(x =>
        sb.from('produits').update({ stock: x.stock - x.qty }).eq('id', x.id)
      ))

      // ── Alertes stock email ─────────────────────────────────────────────
const { data: produitsUpdates } = await sb
  .from('produits')
  .select('id, nom, stock, seuil_alerte')
  .in('id', panier.map(x => x.id))

for (const p of produitsUpdates || []) {
  if (p.stock <= p.seuil_alerte) {
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-stock-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        entreprise_id: eid,
        produit_nom:   p.nom,
        stock_actuel:  p.stock,
        seuil_alerte:  p.seuil_alerte,
        type_alerte:   p.stock === 0 ? 'epuise' : 'faible',
      }),
    }).catch(console.error) // non bloquant
  }
}

      // Afficher la facture
      setFacture({
        ...vente,
        panier:          panier.slice(),
        entreprise_nom:  profil?.entreprises?.nom,
        entreprise_id:   eid,
      })
      setPanier([])
      setClv('Client direct')
      showToast('Vente enregistrée !')
      fetchAll()
    } catch(e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  const filt = prods.filter(p =>
    p.nom?.toLowerCase().includes(search.toLowerCase()) ||
    p.categorie?.toLowerCase().includes(search.toLowerCase())
  )

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:24, display:'grid', gridTemplateColumns:'1fr 330px', gap:20 }}>

      {/* Produits */}
      <div>
        <input
          placeholder="🔍 Rechercher un produit…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${C.g200}`, fontSize:14, marginBottom:14 }}
        />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:12 }}>
          {filt.map(p => (
            <div key={p.id} onClick={() => addCart(p)}
              style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:14, cursor:p.stock>0?'pointer':'default', opacity:p.stock>0?1:0.55 }}>
              <div style={{ fontSize:11, color:C.g500 }}>{p.categorie}</div>
              <div style={{ fontWeight:600, fontSize:14, color:C.g800, margin:'4px 0 8px' }}>{p.nom}</div>
              <div style={{ fontWeight:700, color:C.pri, fontSize:16 }}>{fmt(p.prix_vente)}</div>
              <div style={{ fontSize:11, color:C.g500, marginTop:2 }}>PR: {fmt(p.prix_revient)}</div>
              <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, color:p.stock<=p.seuil_alerte?C.err:C.ok, fontWeight:500 }}>Stock: {p.stock}</span>
                <span style={{ background:p.stock>0?C.priL:C.g100, color:p.stock>0?C.pri:C.g500, borderRadius:20, padding:'3px 9px', fontSize:12, fontWeight:600 }}>
                  {p.stock > 0 ? '+ Ajouter' : 'Épuisé'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panier */}
      <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:20, position:'sticky', top:0, height:'fit-content', maxHeight:'calc(100vh - 40px)', overflowY:'auto' }}>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:14 }}>🛒 Panier ({panier.length})</div>

        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, color:C.g600, fontWeight:500 }}>Client</label>
          <select value={clv} onChange={e => setClv(e.target.value)}
            style={{ width:'100%', marginTop:4, padding:'8px 10px', borderRadius:8, border:`1px solid ${C.g200}`, fontSize:14 }}>
            <option>Client direct</option>
            {clis.map(c => <option key={c.id}>{c.nom}</option>)}
          </select>
        </div>

        {panier.length === 0
          ? <div style={{ textAlign:'center', color:C.g500, padding:'30px 0', fontSize:14 }}>Panier vide</div>
          : <>
            {panier.map(item => (
              <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.g100}` }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{item.nom}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                    <button onClick={() => updQty(item.id, item.qty-1)} style={{ width:22, height:22, borderRadius:'50%', border:`1px solid ${C.g200}`, background:'#fff', cursor:'pointer', fontSize:14 }}>−</button>
                    <span style={{ fontSize:13, fontWeight:600 }}>{item.qty}</span>
                    <button onClick={() => updQty(item.id, item.qty+1)} style={{ width:22, height:22, borderRadius:'50%', border:`1px solid ${C.g200}`, background:'#fff', cursor:'pointer', fontSize:14 }}>+</button>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontWeight:700, color:C.pri, fontSize:14 }}>{fmt(item.prix_vente * item.qty)}</span>
                  <button onClick={() => rmCart(item.id)} style={{ background:C.errL, border:'none', color:C.err, borderRadius:6, padding:'3px 7px', cursor:'pointer' }}>✕</button>
                </div>
              </div>
            ))}

            <div style={{ marginTop:16, paddingTop:12, borderTop:`2px solid ${C.g200}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ color:C.g600, fontSize:13 }}>Total</span>
                <span style={{ fontWeight:800, fontSize:18 }}>{fmt(totPan)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <span style={{ color:C.g600, fontSize:13 }}>Bénéfice estimé</span>
                <span style={{ fontWeight:600, color:C.ok }}>{fmt(benPan)}</span>
              </div>
              <button onClick={valider} disabled={saving}
                style={{ width:'100%', padding:12, background:C.pri, color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1 }}>
                {saving ? 'Enregistrement…' : '✅ Valider la vente'}
              </button>
            </div>
          </>
        }
      </div>

      {facture && <Facture data={facture} onClose={() => setFacture(null)} showToast={showToast}/>}
    </div>
  )
}