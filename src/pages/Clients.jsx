import { useState, useEffect, useCallback } from 'react'
import { sb } from '../supabase'
import ClientForm from '../components/ClientForm'
import Modal from '../components/Modal'

const C = {
  pri:'#2563EB', priL:'#EFF6FF',
  ok:'#16A34A',  okL:'#F0FDF4',
  err:'#DC2626', errL:'#FEF2F2',
  war:'#D97706',
  g50:'#F9FAFB', g100:'#F3F4F6', g200:'#E5E7EB',
  g500:'#6B7280', g600:'#4B5563', g800:'#1F2937'
}

const fmt = n => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA'

const EMPTY_CLIENT = { nom:'', tel:'', adresse:'', email:'' }

// ── Composants UI ─────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize:13, color:C.g600, fontWeight:500, display:'block', marginBottom:4 }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder || ''}
        style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.g200}`, fontSize:14, outline:'none', transition:'border .2s' }}
        onFocus={e => e.target.style.borderColor = C.pri}
        onBlur={e  => e.target.style.borderColor = C.g200}
      />
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:420, maxWidth:'100%', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:18, color:C.g800 }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:C.g500, lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
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
          <button onClick={onCancel}
            style={{ flex:1, padding:11, borderRadius:10, border:`1px solid ${C.g200}`, background:'#fff', cursor:'pointer', fontWeight:600, fontSize:14, color:C.g600 }}>
            Annuler
          </button>
          <button onClick={onConfirm}
            style={{ flex:1, padding:11, borderRadius:10, border:'none', background:C.err, color:'#fff', cursor:'pointer', fontWeight:700, fontSize:14 }}>
            🗑️ Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page Clients ──────────────────────────────────────────────────────────────
export default function Clients({ eid, showToast, isAdm }) {
  const [clis,    setClis]    = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState('')

  // Modals
  const [showAdd,     setShowAdd]     = useState(false)
  const [editClient,  setEditClient]  = useState(null)   // client en cours d'édition
  const [deleteTarget,setDeleteTarget]= useState(null)   // client à supprimer
  const [selected,    setSelected]    = useState(null)   // client pour historique

  const [form, setForm] = useState(EMPTY_CLIENT)

  useEffect(() => { if (eid) load() }, [eid])

  // ── Handlers stables pour ClientForm ─────────────────────────────────────
  const handleFormChange = useCallback((key, value) => {
    setForm(f => ({ ...f, [key]: value }))
  }, [])

  const handleCancel = useCallback(() => {
    setShowAdd(false)
    setEditClient(null)
    setForm(EMPTY_CLIENT)
  }, [])

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async function load() {
    setLoading(true)
    const { data, error } = await sb.from('clients').select('*').eq('entreprise_id', eid).order('nom')
    if (error) showToast(error.message, 'error')
    else setClis(data || [])
    setLoading(false)
  }

  async function createClient() {
    if (!form.nom.trim() || saving) return
    setSaving(true)
    const { error } = await sb.from('clients').insert({
      entreprise_id: eid,
      nom:       form.nom.trim(),
      telephone: form.tel.trim(),
      adresse:   form.adresse.trim(),
      email:     form.email.trim(),
      total_achats: 0,
    })
    if (error) showToast(error.message, 'error')
    else { showToast('Client ajouté ✅'); setForm(EMPTY_CLIENT); setShowAdd(false); load() }
    setSaving(false)
  }

  async function updateClient() {
    if (!editClient || !form.nom.trim() || saving) return
    setSaving(true)
    const { error } = await sb.from('clients')
      .update({
        nom:       form.nom.trim(),
        telephone: form.tel.trim(),
        adresse:   form.adresse.trim(),
        email:     form.email.trim(),
      })
      .eq('id', editClient.id)
      .eq('entreprise_id', eid) // sécurité RLS double vérification
    if (error) showToast(error.message, 'error')
    else { showToast('Client mis à jour ✅'); setEditClient(null); setForm(EMPTY_CLIENT); load() }
    setSaving(false)
  }

  async function deleteClient(id) {
    const { error } = await sb.from('clients').delete().eq('id', id).eq('entreprise_id', eid)
    if (error) showToast(error.message, 'error')
    else { showToast('Client supprimé', 'error'); setDeleteTarget(null); load() }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function openEdit(c) {
    setForm({ nom: c.nom || '', tel: c.telephone || '', adresse: c.adresse || '', email: c.email || '' })
    setEditClient(c)
  }

  function openAdd() {
    setForm(EMPTY_CLIENT)
    setShowAdd(true)
  }

  async function loadHistorique(cli) {
    const { data } = await sb.from('ventes').select('*').eq('client_id', cli.id).order('created_at', { ascending:false })
    setSelected({ ...cli, historique: data || [] })
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const filt = clis.filter(c =>
    c.nom?.toLowerCase().includes(search.toLowerCase()) ||
    c.telephone?.includes(search)
  )

  // ── Formulaire partagé ────────────────────────────────────────────────────
  function ClientForm({ onSubmit, submitLabel }) {
    return (
      <>
        <Field label="Nom complet *"  value={form.nom}     onChange={set('nom')}     placeholder="Ex: Kouassi Julien" />
        <Field label="Téléphone"      value={form.tel}     onChange={set('tel')}     placeholder="+225 07 XX XX XX" type="tel" />
        <Field label="Adresse"        value={form.adresse} onChange={set('adresse')} placeholder="Quartier, Ville" />
        <Field label="Email"          value={form.email}   onChange={set('email')}   placeholder="client@email.com" type="email" />
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button
            onClick={() => { setShowAdd(false); setEditClient(null); setForm(EMPTY_CLIENT) }}
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
  return (
    <div style={{ padding:24 }}>

      {/* Barre de recherche + bouton ajout */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, gap:12 }}>
        <input
          placeholder="🔍 Rechercher un client…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${C.g200}`, fontSize:14, flex:1, maxWidth:320 }}
        />
        <button onClick={openAdd}
          style={{ background:C.pri, color:'#fff', border:'none', borderRadius:10, padding:'10px 18px', fontWeight:600, fontSize:14, cursor:'pointer', whiteSpace:'nowrap' }}>
          + Nouveau client
        </button>
      </div>

      {/* Liste clients */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:C.g500 }}>Chargement…</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
          {filt.map(c => (
            <div key={c.id} style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:20, position:'relative' }}>

              {/* Boutons action */}
              <div style={{ position:'absolute', top:14, right:14, display:'flex', gap:6 }}>
                <button onClick={() => openEdit(c)} title="Modifier"
                  style={{ width:32, height:32, borderRadius:8, border:`1px solid ${C.g200}`, background:C.priL, color:C.pri, cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  ✏️
                </button>
                {isAdm && (
                  <button onClick={() => setDeleteTarget(c)} title="Supprimer"
                    style={{ width:32, height:32, borderRadius:8, border:`1px solid #FCA5A5`, background:C.errL, color:C.err, cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    🗑️
                  </button>
                )}
              </div>

              {/* Infos client */}
              <div
                onClick={() => loadHistorique(c)}
                style={{ cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, paddingRight:80 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:C.priL, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:C.pri, fontSize:18, flexShrink:0 }}>
                    {c.nom?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, color:C.g800 }}>{c.nom}</div>
                    <div style={{ fontSize:12, color:C.g500, marginTop:2 }}>{c.adresse}</div>
                  </div>
                </div>
                <div style={{ fontSize:13, color:C.g600, marginBottom:4 }}>📞 {c.telephone || '—'}</div>
                {c.email && <div style={{ fontSize:13, color:C.g600, marginBottom:8 }}>✉️ {c.email}</div>}
                <div style={{ padding:10, background:C.g50, borderRadius:8, display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:C.g600 }}>Total achats</span>
                  <span style={{ fontWeight:700, color:C.pri }}>{fmt(c.total_achats)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal AJOUT */}
      {showAdd && (
        <Modal title="➕ Nouveau client" onClose={handleCancel}>
          <ClientForm form={form} onChange={handleFormChange} onSubmit={createClient} onCancel={handleCancel} saving={saving} />
        </Modal>
      )}

      {/* Modal MODIFICATION */}
      {editClient && (
        <Modal title={`✏️ Modifier — ${editClient.nom}`} onClose={handleCancel}>
          <ClientForm form={form} onChange={handleFormChange} onSubmit={updateClient} onCancel={handleCancel} saving={saving} />
        </Modal>
      )}

      {/* Modal CONFIRMATION SUPPRESSION */}
      {deleteTarget && (
        <ConfirmModal
          message={`Voulez-vous vraiment supprimer le client "${deleteTarget.nom}" ? Cette action est irréversible.`}
          onConfirm={() => deleteClient(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Modal HISTORIQUE */}
      {selected && (
        <Modal title={`📋 Historique — ${selected.nom}`} onClose={() => setSelected(null)}>
          <div style={{ background:C.priL, borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:C.pri, fontWeight:500 }}>Total achats</span>
            <span style={{ fontWeight:800, color:C.pri, fontSize:18 }}>{fmt(selected.total_achats)}</span>
          </div>
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
        </Modal>
      )}
    </div>
  )
}