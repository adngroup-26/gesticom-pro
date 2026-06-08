import { useState, useEffect, useCallback } from 'react'
import { sb } from '../supabase'
import MouvementModal from '../components/MouvementModal'
import AlertesStock   from '../components/AlertesStock'
import ProduitForm    from '../components/ProduitForm'
import Modal          from '../components/Modal'

const C = {
  pri:'#2563EB', priL:'#EFF6FF',
  ok:'#16A34A',  okL:'#F0FDF4',
  err:'#DC2626', errL:'#FEF2F2',
  war:'#D97706', warL:'#FFFBEB',
  g50:'#F9FAFB', g100:'#F3F4F6', g200:'#E5E7EB',
  g500:'#6B7280', g600:'#4B5563', g800:'#1F2937'
}

const fmt    = n => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA'
const fmtNum = n => new Intl.NumberFormat('fr-FR').format(n || 0)

const EMPTY_PRODUIT = { nom:'', ref:'', cat:'', pa:'', tr:'', qt:'', pv:'', al:'10' }

const MVT_COLORS = {
  entree:     { color:C.ok,  bg:C.okL,  label:'📥 Entrée',     sign:'+' },
  sortie:     { color:C.err, bg:C.errL, label:'📤 Sortie',      sign:'-' },
  inventaire: { color:C.pri, bg:C.priL, label:'📋 Inventaire',  sign:'=' },
  transfert:  { color:C.war, bg:C.warL, label:'🔄 Transfert',   sign:'-' },
}

// ── UI atoms ──────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type='text', placeholder, required }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:13, color:C.g600, fontWeight:500, display:'block', marginBottom:4 }}>
        {label}{required && <span style={{ color:C.err }}> *</span>}
      </label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder||''}
        style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.g200}`, fontSize:14, outline:'none' }}
        onFocus={e=>e.target.style.borderColor=C.pri}
        onBlur={e=>e.target.style.borderColor=C.g200}
      />
    </div>
  )
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:360, maxWidth:'100%', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize:36, textAlign:'center', marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:15, color:C.g800, textAlign:'center', marginBottom:24, lineHeight:1.6 }}>{message}</div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:11, borderRadius:10, border:`1px solid ${C.g200}`, background:'#fff', cursor:'pointer', fontWeight:600 }}>Annuler</button>
          <button onClick={onConfirm} style={{ flex:1, padding:11, borderRadius:10, border:'none', background:C.err, color:'#fff', cursor:'pointer', fontWeight:700 }}>🗑️ Supprimer</button>
        </div>
      </div>
    </div>
  )
}

// ── Page Stock ────────────────────────────────────────────────────────────────
export default function Stock({ eid, profil, showToast, isAdm }) {
  const [onglet,       setOnglet]       = useState('produits') // produits | mouvements | alertes
  const [prods,        setProds]        = useState([])
  const [mouvements,   setMouvements]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [search,       setSearch]       = useState('')
  const [showAdd,      setShowAdd]      = useState(false)
  const [editProduit,  setEditProduit]  = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [mvtProduit,   setMvtProduit]   = useState(null)
  const [form,         setForm]         = useState(EMPTY_PRODUIT)
  const [filtreType,   setFiltreType]   = useState('tous')
  const [nbAlertes,    setNbAlertes]    = useState(0)

  useEffect(() => { if (eid) { loadProds(); loadMouvements(); loadNbAlertes() } }, [eid])

  // ── Chargements ───────────────────────────────────────────────────────────
  async function loadProds() {
    setLoading(true)
    const { data } = await sb.from('produits').select('*').eq('entreprise_id', eid).order('nom')
    setProds(data || [])
    setLoading(false)
  }

  async function loadMouvements() {
    const { data } = await sb.from('mouvements_stock').select('*').eq('entreprise_id', eid).order('created_at', { ascending:false }).limit(200)
    setMouvements(data || [])
  }

  async function loadNbAlertes() {
    const { count } = await sb.from('alertes_stock').select('*', { count:'exact', head:true }).eq('entreprise_id', eid).eq('vue', false)
    setNbAlertes(count || 0)
  }

  function reloadAll() { loadProds(); loadMouvements(); loadNbAlertes() }

  // ── Handler stable pour ProduitForm ──────────────────────────────────────
  const handleFormChange = useCallback((key, value) => {
    setForm(f => ({ ...f, [key]: value }))
  }, [])

  const handleCancel = useCallback(() => {
    setShowAdd(false)
    setEditProduit(null)
    setForm(EMPTY_PRODUIT)
  }, [])

  // ── Prix de revient ───────────────────────────────────────────────────────
  const prCalc = () => {
    const pa = parseFloat(form.pa) || 0
    const tr = parseFloat(form.tr) || 0
    const qt = parseFloat(form.qt) || 1
    return pa + tr / qt
  }

  // ── CRUD Produits ─────────────────────────────────────────────────────────
  async function createProduit() {
    if (!form.nom.trim() || saving) return
    setSaving(true)
    const { error } = await sb.from('produits').insert({
      entreprise_id:eid, nom:form.nom.trim(), reference:form.ref.trim(),
      categorie:form.cat.trim(), prix_achat:parseFloat(form.pa)||0,
      prix_transport:parseFloat(form.tr)||0, qte_achetee:parseInt(form.qt)||0,
      prix_vente:parseFloat(form.pv)||0, stock:parseInt(form.qt)||0,
      seuil_alerte:parseInt(form.al)||10,
    })
    if (error) showToast(error.message,'error')
    else { showToast('Produit ajouté ✅'); setForm(EMPTY_PRODUIT); setShowAdd(false); reloadAll() }
    setSaving(false)
  }

  async function updateProduit() {
    if (!editProduit || !form.nom.trim() || saving) return
    setSaving(true)
    const { error } = await sb.from('produits')
      .update({ nom:form.nom.trim(), reference:form.ref.trim(), categorie:form.cat.trim(),
        prix_achat:parseFloat(form.pa)||0, prix_transport:parseFloat(form.tr)||0,
        qte_achetee:parseInt(form.qt)||0, prix_vente:parseFloat(form.pv)||0,
        stock:parseInt(form.qt)||0, seuil_alerte:parseInt(form.al)||10 })
      .eq('id', editProduit.id).eq('entreprise_id', eid)
    if (error) showToast(error.message,'error')
    else { showToast('Produit mis à jour ✅'); setEditProduit(null); setForm(EMPTY_PRODUIT); reloadAll() }
    setSaving(false)
  }

  async function deleteProduit(id) {
    const { error } = await sb.from('produits').delete().eq('id', id).eq('entreprise_id', eid)
    if (error) showToast(error.message,'error')
    else { showToast('Produit supprimé','error'); setDeleteTarget(null); reloadAll() }
  }

  function openEdit(p) {
    setForm({ nom:p.nom||'', ref:p.reference||'', cat:p.categorie||'',
      pa:String(p.prix_achat||''), tr:String(p.prix_transport||''),
      qt:String(p.stock||''), pv:String(p.prix_vente||''), al:String(p.seuil_alerte||'10') })
    setEditProduit(p)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Filtres ───────────────────────────────────────────────────────────────
  const filt = prods.filter(p =>
    p.nom?.toLowerCase().includes(search.toLowerCase()) ||
    p.categorie?.toLowerCase().includes(search.toLowerCase()) ||
    p.reference?.toLowerCase().includes(search.toLowerCase())
  )

  const mvtFilt = filtreType === 'tous'
    ? mouvements
    : mouvements.filter(m => m.type === filtreType)

  // ── Formulaire produit ────────────────────────────────────────────────────
  function ProduitForm({ onSubmit, submitLabel }) {
    const pr = prCalc()
    return (
      <>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ gridColumn:'1/-1' }}>
            <Field label="Désignation" value={form.nom} onChange={set('nom')} placeholder="Ex: Ciment CFA 50kg" required />
          </div>
          <Field label="Référence"  value={form.ref} onChange={set('ref')} placeholder="Ex: CIM-001" />
          <Field label="Catégorie"  value={form.cat} onChange={set('cat')} placeholder="Ex: Matériaux" />
          <Field label="Prix d'achat unitaire (FCFA)" type="number" value={form.pa} onChange={set('pa')} placeholder="0" />
          <Field label="Montant transport (FCFA)"     type="number" value={form.tr} onChange={set('tr')} placeholder="0" />
          <Field label="Qté totale achetée"           type="number" value={form.qt} onChange={set('qt')} placeholder="0" />
          <Field label="Seuil d'alerte stock"         type="number" value={form.al} onChange={set('al')} placeholder="10" />
        </div>
        <div style={{ background:C.priL, border:`1px solid #93C5FD`, borderRadius:9, padding:'12px 14px', margin:'4px 0 12px' }}>
          <div style={{ fontSize:12, color:C.pri, fontWeight:600 }}>Prix de revient (calculé)</div>
          <div style={{ fontSize:20, fontWeight:800, color:C.pri, marginTop:3 }}>
            {form.qt && parseFloat(form.qt) > 0 ? fmtNum(Math.round(pr)) + ' FCFA' : '—'}
          </div>
          <div style={{ fontSize:11, color:C.g500, marginTop:2 }}>PR = Prix achat + Transport ÷ Qté</div>
        </div>
        <Field label="Prix de vente (FCFA)" type="number" value={form.pv} onChange={set('pv')} placeholder="0" required />
        {form.pv && parseFloat(form.pv) > 0 && pr > 0 && (
          <div style={{ background:C.okL, border:`1px solid #86EFAC`, borderRadius:9, padding:'10px 14px', marginBottom:12 }}>
            <div style={{ fontSize:12, color:C.ok, fontWeight:600 }}>Marge bénéficiaire</div>
            <div style={{ fontSize:16, fontWeight:700, color:C.ok, marginTop:2 }}>
              {Math.round(((parseFloat(form.pv)-pr)/pr)*100)}% · {fmtNum(Math.round(parseFloat(form.pv)-pr))} FCFA/unité
            </div>
          </div>
        )}
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button onClick={() => { setShowAdd(false); setEditProduit(null); setForm(EMPTY_PRODUIT) }}
            style={{ flex:1, padding:11, borderRadius:10, border:`1px solid ${C.g200}`, background:'#fff', cursor:'pointer', fontWeight:600, fontSize:14 }}>
            Annuler
          </button>
          <button onClick={onSubmit} disabled={saving}
            style={{ flex:1, padding:11, borderRadius:10, border:'none', background:C.pri, color:'#fff', cursor:saving?'not-allowed':'pointer', fontWeight:700, fontSize:14, opacity:saving?0.7:1 }}>
            {saving ? 'Enregistrement…' : submitLabel}
          </button>
        </div>
      </>
    )
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const ONGLETS = [
    { id:'produits',   label:'📦 Produits',          badge: null },
    { id:'mouvements', label:'📊 Mouvements',         badge: null },
    { id:'alertes',    label:'🔔 Alertes',            badge: nbAlertes > 0 ? nbAlertes : null },
  ]

  return (
    <div style={{ padding:24 }}>

      {/* Onglets */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'#fff', borderRadius:12, padding:6, border:`1px solid ${C.g200}`, width:'fit-content' }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            style={{ padding:'9px 18px', borderRadius:9, border:'none', background:onglet===o.id?C.pri:'transparent', color:onglet===o.id?'#fff':C.g600, fontWeight:onglet===o.id?700:400, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:6, transition:'all .2s' }}>
            {o.label}
            {o.badge && <span style={{ background:C.err, color:'#fff', borderRadius:10, fontSize:11, padding:'1px 7px', fontWeight:700 }}>{o.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── ONGLET PRODUITS ─────────────────────────────────────────────── */}
      {onglet === 'produits' && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, gap:12 }}>
            <input placeholder="🔍 Rechercher produit, référence, catégorie…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${C.g200}`, fontSize:14, flex:1, maxWidth:360 }}
            />
            <button onClick={() => { setForm(EMPTY_PRODUIT); setShowAdd(true) }}
              style={{ background:C.pri, color:'#fff', border:'none', borderRadius:10, padding:'10px 18px', fontWeight:600, fontSize:14, cursor:'pointer', whiteSpace:'nowrap' }}>
              + Nouveau produit
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:60, color:C.g500 }}>Chargement…</div>
          ) : (
            <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14, minWidth:800 }}>
                <thead>
                  <tr style={{ background:C.g50 }}>
                    {['Produit','Réf.','Catégorie','Prix revient','Prix vente','Marge','Stock','Statut','Actions'].map(h => (
                      <th key={h} style={{ padding:'12px 12px', textAlign:'left', color:C.g600, fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filt.map(p => {
                    const mg = p.prix_revient > 0 ? Math.round(((p.prix_vente-p.prix_revient)/p.prix_revient)*100) : 0
                    const al = p.stock <= p.seuil_alerte
                    const ep = p.stock === 0
                    return (
                      <tr key={p.id} style={{ borderBottom:`1px solid ${C.g100}` }}>
                        <td style={{ padding:'11px 12px', fontWeight:600, color:C.g800 }}>{p.nom}</td>
                        <td style={{ padding:'11px 12px', color:C.g500, fontSize:12 }}>{p.reference||'—'}</td>
                        <td style={{ padding:'11px 12px' }}>
                          {p.categorie && <span style={{ background:C.priL, color:C.pri, borderRadius:20, padding:'3px 10px', fontSize:12 }}>{p.categorie}</span>}
                        </td>
                        <td style={{ padding:'11px 12px', color:C.g600 }}>{fmt(p.prix_revient)}</td>
                        <td style={{ padding:'11px 12px', fontWeight:600 }}>{fmt(p.prix_vente)}</td>
                        <td style={{ padding:'11px 12px', color:C.ok, fontWeight:600 }}>{mg}%</td>
                        <td style={{ padding:'11px 12px', fontWeight:700, color:ep?C.err:al?C.war:C.g800 }}>{fmtNum(p.stock)}</td>
                        <td style={{ padding:'11px 12px' }}>
                          <span style={{ background:ep?C.errL:al?C.warL:C.okL, color:ep?C.err:al?C.war:C.ok, borderRadius:20, padding:'4px 10px', fontSize:12, fontWeight:600 }}>
                            {ep?'🚫 Épuisé':al?'⚠️ Faible':'✅ OK'}
                          </span>
                        </td>
                        <td style={{ padding:'11px 12px' }}>
                          <div style={{ display:'flex', gap:5 }}>
                            <button onClick={() => setMvtProduit(p)} title="Mouvement de stock"
                              style={{ width:30, height:30, borderRadius:7, border:`1px solid #86EFAC`, background:C.okL, color:C.ok, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              📦
                            </button>
                            <button onClick={() => openEdit(p)} title="Modifier"
                              style={{ width:30, height:30, borderRadius:7, border:`1px solid ${C.g200}`, background:C.priL, color:C.pri, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              ✏️
                            </button>
                            {isAdm && (
                              <button onClick={() => setDeleteTarget(p)} title="Supprimer"
                                style={{ width:30, height:30, borderRadius:7, border:`1px solid #FCA5A5`, background:C.errL, color:C.err, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── ONGLET MOUVEMENTS ────────────────────────────────────────────── */}
      {onglet === 'mouvements' && (
        <>
          {/* Filtres type */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            {[['tous','Tous'],['entree','📥 Entrées'],['sortie','📤 Sorties'],['inventaire','📋 Inventaire'],['transfert','🔄 Transferts']].map(([k,lb]) => (
              <button key={k} onClick={() => setFiltreType(k)}
                style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${filtreType===k?C.pri:C.g200}`, background:filtreType===k?C.priL:'#fff', color:filtreType===k?C.pri:C.g600, fontWeight:filtreType===k?700:400, fontSize:13, cursor:'pointer' }}>
                {lb}
              </button>
            ))}
          </div>

          <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, overflow:'auto' }}>
            {mvtFilt.length === 0 ? (
              <div style={{ textAlign:'center', padding:48, color:C.g500 }}>Aucun mouvement enregistré</div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14, minWidth:700 }}>
                <thead>
                  <tr style={{ background:C.g50 }}>
                    {['Date & Heure','Produit','Type','Quantité','Stock avant','Stock après','Motif','Utilisateur'].map(h => (
                      <th key={h} style={{ padding:'11px 12px', textAlign:'left', color:C.g600, fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mvtFilt.map(m => {
                    const t = MVT_COLORS[m.type] || MVT_COLORS.entree
                    return (
                      <tr key={m.id} style={{ borderBottom:`1px solid ${C.g100}` }}>
                        <td style={{ padding:'10px 12px', color:C.g600, fontSize:12, whiteSpace:'nowrap' }}>
                          {new Date(m.created_at).toLocaleDateString('fr-FR')} {new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                        </td>
                        <td style={{ padding:'10px 12px', fontWeight:600 }}>{m.produit_nom}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ background:t.bg, color:t.color, borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600 }}>{t.label}</span>
                        </td>
                        <td style={{ padding:'10px 12px', fontWeight:700, color:t.color }}>
                          {t.sign}{fmtNum(m.quantite)}
                        </td>
                        <td style={{ padding:'10px 12px', color:C.g600 }}>{fmtNum(m.stock_avant)}</td>
                        <td style={{ padding:'10px 12px', fontWeight:700, color:m.stock_apres===0?C.err:C.g800 }}>{fmtNum(m.stock_apres)}</td>
                        <td style={{ padding:'10px 12px', color:C.g600, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.motif||'—'}</td>
                        <td style={{ padding:'10px 12px', color:C.g500, fontSize:12 }}>{m.utilisateur_nom||'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── ONGLET ALERTES ───────────────────────────────────────────────── */}
      {onglet === 'alertes' && (
        <AlertesStock eid={eid} showToast={showToast} />
      )}

      {/* Modals */}
      {showAdd && (
        <Modal title="➕ Nouveau produit" onClose={handleCancel} wide>
          <ProduitForm form={form} onChange={handleFormChange} onSubmit={createProduit} onCancel={handleCancel} saving={saving} />
        </Modal>
      )}
      {editProduit && (
        <Modal title={`✏️ Modifier — ${editProduit.nom}`} onClose={handleCancel} wide>
          <ProduitForm form={form} onChange={handleFormChange} onSubmit={updateProduit} onCancel={handleCancel} saving={saving} />
        </Modal>
      )}
      {deleteTarget && (
        <ConfirmModal
          message={`Voulez-vous vraiment supprimer "${deleteTarget.nom}" ? Cette action est irréversible.`}
          onConfirm={() => deleteProduit(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {mvtProduit && (
        <MouvementModal
          produit={mvtProduit}
          profil={profil}
          eid={eid}
          onClose={() => setMvtProduit(null)}
          onSuccess={reloadAll}
          showToast={showToast}
        />
      )}
    </div>
  )
}