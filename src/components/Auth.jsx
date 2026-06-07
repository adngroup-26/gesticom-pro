import { useState } from 'react'
import { sb } from '../supabase'

const C = { pri:'#2563EB', priL:'#EFF6FF', ok:'#16A34A', okL:'#F0FDF4', err:'#DC2626', errL:'#FEF2F2', g500:'#6B7280', g600:'#4B5563', g800:'#1F2937', g200:'#E5E7EB', g100:'#F3F4F6' }

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email:'', pw:'', nom:'', ent:'' })
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit() {
    setMsg(''); setBusy(true)
    try {
      if (mode === 'signup') {
        if (!form.nom || !form.ent) throw new Error('Tous les champs sont requis.')
        if (form.pw.length < 6) throw new Error('Mot de passe : 6 caractères minimum.')
        const { error } = await sb.auth.signUp({
          email: form.email, password: form.pw,
          options: { data: { nom: form.nom, entreprise_nom: form.ent } }
        })
        if (error) throw error
        setMode('login')
        setMsg('ok:Compte créé ! Connectez-vous maintenant.')
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: form.email, password: form.pw })
        if (error) throw error
      }
    } catch(e) { setMsg(e.message) }
    setBusy(false)
  }

  const isOk = msg.startsWith('ok:')
  const txt  = isOk ? msg.slice(3) : msg

  const inputStyle = { width:'100%', padding:'10px 13px', borderRadius:9, border:`1.5px solid ${C.g200}`, fontSize:14, marginTop:5 }
  const labelStyle = { fontSize:13, color:C.g600, fontWeight:500 }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1D4ED8,#2563EB,#0891B2)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:40, width:420, maxWidth:'100%', boxShadow:'0 24px 60px rgba(0,0,0,0.18)' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, background:C.pri, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:26, margin:'0 auto 12px' }}>G</div>
          <div style={{ fontWeight:800, fontSize:24, color:C.g800 }}>GestiCom Pro</div>
          <div style={{ fontSize:13, color:C.g500, marginTop:4 }}>Gestion commerciale · Afrique francophone</div>
        </div>

        {/* Onglets */}
        <div style={{ display:'flex', background:C.g100, borderRadius:10, padding:4, marginBottom:28 }}>
          {[['login','🔑 Connexion'],['signup','📝 Inscription']].map(([m,lb]) => (
            <button key={m} onClick={() => { setMode(m); setMsg('') }}
              style={{ flex:1, padding:9, borderRadius:8, border:'none', background:mode===m?'#fff':'transparent', color:mode===m?C.pri:C.g500, fontWeight:mode===m?700:400, fontSize:14, cursor:'pointer' }}>
              {lb}
            </button>
          ))}
        </div>

        {/* Message */}
        {msg && <div style={{ background:isOk?C.okL:C.errL, color:isOk?C.ok:C.err, borderRadius:9, padding:'10px 14px', fontSize:13, marginBottom:18, fontWeight:500 }}>
          {isOk ? '✅ ' : ''}{txt}
        </div>}

        {/* Champs inscription */}
        {mode === 'signup' && <>
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Votre nom complet</label>
            <input value={form.nom} onChange={set('nom')} placeholder="Ex: Kouassi Julien" style={inputStyle}/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Nom de votre entreprise</label>
            <input value={form.ent} onChange={set('ent')} placeholder="Ex: Boutique Kouassi & Frères" style={inputStyle}/>
          </div>
        </>}

        {/* Email + mot de passe */}
        <div style={{ marginBottom:14 }}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="vous@exemple.com" style={inputStyle}/>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={labelStyle}>Mot de passe</label>
          <input type="password" value={form.pw} onChange={set('pw')} placeholder="Minimum 6 caractères" style={inputStyle}/>
        </div>

        <button onClick={submit} disabled={busy}
          style={{ width:'100%', padding:13, background:C.pri, color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:busy?'not-allowed':'pointer', opacity:busy?0.7:1 }}>
          {busy ? 'Chargement…' : mode==='login' ? '🔑 Se connecter' : '🚀 Créer mon compte'}
        </button>

        {mode === 'login' && <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:C.g500 }}>
          Pas encore de compte ?{' '}
          <span onClick={() => setMode('signup')} style={{ color:C.pri, fontWeight:600, cursor:'pointer' }}>S'inscrire gratuitement</span>
        </div>}

        <div style={{ textAlign:'center', marginTop:24, fontSize:11, color:'#9CA3AF' }}>
          🔒 Données sécurisées · Supabase RLS · Multi-entreprises
        </div>
      </div>
    </div>
  )
}