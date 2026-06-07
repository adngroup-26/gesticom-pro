import { useState, useEffect } from 'react'
import { sb } from '../supabase'

const C = { pri:'#2563EB', priL:'#EFF6FF', ok:'#16A34A', okL:'#F0FDF4', err:'#DC2626', errL:'#FEF2F2', war:'#D97706', warL:'#FFFBEB', g50:'#F9FAFB', g100:'#F3F4F6', g200:'#E5E7EB', g500:'#6B7280', g600:'#4B5563', g800:'#1F2937' }

const PERMS = [
  ['Effectuer une vente',    true,  true,  true ],
  ['Gérer le stock',         true,  true,  false],
  ['Voir les rapports',      true,  true,  false],
  ['Gérer les clients',      true,  true,  false],
  ['Inviter des utilisateurs',true, false, false],
  ['Supprimer des données',  true,  false, false],
  ['Gérer l\'abonnement',    true,  false, false],
]

function Badge({ txt, fg, bg }) {
  return <span style={{ background:bg, color:fg, borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600 }}>{txt}</span>
}

function bdgRole(r) {
  const fg = r==='admin'?C.pri:r==='gerant'?C.war:C.ok
  const bg = r==='admin'?C.priL:r==='gerant'?C.warL:C.okL
  return <Badge txt={r} fg={fg} bg={bg}/>
}

export default function Utilisateurs({ eid, showToast }) {
  const [users,  setUsers]  = useState([])
  const [modal,  setModal]  = useState(false)
  const [form,   setForm]   = useState({ email:'', nom:'', role:'caissier' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (eid) load() }, [eid])

  async function load() {
    const { data } = await sb.from('utilisateurs').select('*').eq('entreprise_id', eid).order('nom')
    setUsers(data || [])
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function saveInv() {
    if (!form.email || !form.nom || saving) return; setSaving(true)
    const { error } = await sb.rpc('inviter_utilisateur', { p_email: form.email, p_nom: form.nom, p_role: form.role })
    if (error) showToast(error.message, 'error')
    else { setForm({ email:'', nom:'', role:'caissier' }); setModal(false); showToast('Invitation enregistrée ✅'); load() }
    setSaving(false)
  }

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
        <div style={{ fontSize:14, color:C.g600 }}>{users.length} utilisateur(s) dans votre entreprise</div>
        <button onClick={() => setModal(true)} style={{ background:C.pri, color:'#fff', border:'none', borderRadius:10, padding:'10px 18px', fontWeight:600, fontSize:14, cursor:'pointer' }}>
          + Inviter un collaborateur
        </button>
      </div>

      {/* Cartes utilisateurs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:16, marginBottom:28 }}>
        {users.map(u => (
          <div key={u.id} style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:C.priL, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:C.pri, fontSize:18, flexShrink:0 }}>
                {u.nom?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:700, color:C.g800 }}>{u.nom}</div>
                <div style={{ fontSize:12, color:C.g500, marginTop:2 }}>{u.email}</div>
                <div style={{ marginTop:5 }}>{bdgRole(u.role)}</div>
              </div>
            </div>
            <div style={{ fontSize:12, color: u.auth_user_id ? C.ok : C.war, fontWeight:500 }}>
              {u.auth_user_id ? '✅ Compte actif' : '⏳ En attente de connexion'}
            </div>
          </div>
        ))}
      </div>

      {/* Tableau des permissions */}
      <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', fontWeight:700, fontSize:15, borderBottom:`1px solid ${C.g200}` }}>🛡️ Permissions par rôle</div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead>
            <tr style={{ background:C.g50 }}>
              {['Permission','Admin','Gérant','Caissier'].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:C.g600, fontSize:12, fontWeight:600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMS.map(([perm, adm, ger, cai]) => (
              <tr key={perm} style={{ borderBottom:`1px solid ${C.g100}` }}>
                <td style={{ padding:'11px 16px', color:C.g800 }}>{perm}</td>
                {[adm,ger,cai].map((ok,i) => (
                  <td key={i} style={{ padding:'11px 16px', fontSize:16, textAlign:'center' }}>{ok ? '✅' : '❌'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal invitation */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:400, maxWidth:'93vw' }}>
            <div style={{ fontWeight:700, fontSize:18, marginBottom:6 }}>👤 Inviter un collaborateur</div>
            <div style={{ fontSize:13, color:C.g500, marginBottom:18 }}>Il créera son mot de passe lors de sa première connexion.</div>
            {[['Nom complet','nom','text'],['Adresse email','email','email']].map(([lb,k,tp]) => (
              <div key={k} style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, color:C.g600, fontWeight:500, display:'block', marginBottom:4 }}>{lb}</label>
                <input type={tp} value={form[k]} onChange={set(k)} style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${C.g200}`, fontSize:14 }}/>
              </div>
            ))}
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:13, color:C.g600, fontWeight:500, display:'block', marginBottom:4 }}>Rôle</label>
              <select value={form.role} onChange={set('role')} style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${C.g200}`, fontSize:14 }}>
                <option value="caissier">Caissier — Ventes uniquement</option>
                <option value="gerant">Gérant — Ventes + stock + rapports</option>
                <option value="admin">Admin — Accès complet</option>
              </select>
            </div>
            {/* Aperçu permissions */}
            <div style={{ background:C.g50, borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:C.g600 }}>
              {form.role==='caissier' && '✅ Ventes · ❌ Stock · ❌ Rapports · ❌ Gestion utilisateurs'}
              {form.role==='gerant'   && '✅ Ventes · ✅ Stock · ✅ Rapports · ❌ Gestion utilisateurs'}
              {form.role==='admin'    && '✅ Ventes · ✅ Stock · ✅ Rapports · ✅ Gestion complète'}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setModal(false)} style={{ flex:1, padding:10, borderRadius:10, border:`1px solid ${C.g200}`, background:'#fff', cursor:'pointer', fontWeight:600 }}>Annuler</button>
              <button onClick={saveInv} disabled={saving} style={{ flex:1, padding:10, borderRadius:10, background:C.pri, color:'#fff', border:'none', cursor:'pointer', fontWeight:700 }}>{saving?'Envoi…':'Inviter'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}