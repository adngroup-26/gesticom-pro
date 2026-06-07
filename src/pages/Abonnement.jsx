import { useState, useEffect } from 'react'
import { sb } from '../supabase'

const C = { pri:'#2563EB', priL:'#EFF6FF', ok:'#16A34A', okL:'#F0FDF4', err:'#DC2626', errL:'#FEF2F2', war:'#D97706', g50:'#F9FAFB', g100:'#F3F4F6', g200:'#E5E7EB', g500:'#6B7280', g600:'#4B5563', g800:'#1F2937' }
const fmt = n => (n||0).toLocaleString('fr-FR') + ' FCFA'

const PLANS = [
  {
    id: 'essentiel', nom: 'Essentiel', prix: 5000, periode: 'mois',
    features: ['1 utilisateur', '500 produits max', 'Ventes & stock', 'Support email'],
    color: C.g600,
  },
  {
    id: 'pro', nom: 'Pro', prix: 12000, periode: 'mois',
    features: ['5 utilisateurs', 'Produits illimités', 'PDF & WhatsApp', 'Rapports avancés', 'Support prioritaire'],
    color: C.pri, recommended: true,
  },
  {
    id: 'business', nom: 'Business', prix: 25000, periode: 'mois',
    features: ['Utilisateurs illimités', 'Multi-boutique', 'API accès', 'Manager dédié', 'Formation incluse'],
    color: '#7C3AED',
  },
]

const MOBILE_MONEY = [
  { nom:'Orange Money', ic:'🟠', color:'#FF6600', bg:'#FFF3E0', prefix:'+225 07' },
  { nom:'MTN Money',    ic:'🟡', color:'#FFCC00', bg:'#FFFDE7', prefix:'+225 05' },
  { nom:'Moov Money',   ic:'🔵', color:'#0066CC', bg:'#E3F2FD', prefix:'+225 01' },
  { nom:'Wave',         ic:'💙', color:'#1DA1F2', bg:'#E8F5FD', prefix:'' },
]

export default function Abonnement({ profil, showToast }) {
  const [abos,    setAbos]    = useState([])
  const [planSel, setPlanSel] = useState(null)
  const [mmSel,   setMmSel]   = useState(null)
  const [phone,   setPhone]   = useState('')
  const [paying,  setPaying]  = useState(false)
  const [step,    setStep]    = useState(1) // 1=choix plan | 2=choix MM | 3=confirmation

  const eid  = profil?.entreprise_id
  const plan = profil?.entreprises?.plan || 'Essentiel'
  const exp  = profil?.entreprises?.date_expiration

  useEffect(() => { if (eid) loadAbos() }, [eid])

  async function loadAbos() {
    const { data } = await sb.from('abonnements').select('*').eq('entreprise_id', eid).order('date_paiement', { ascending:false })
    setAbos(data || [])
  }

  function selectPlan(p) { setPlanSel(p); setStep(2) }
  function selectMM(mm)  { setMmSel(mm); setStep(3) }

  async function confirmerPaiement() {
    if (!phone || paying) return
    setPaying(true)
    // Simulation paiement Mobile Money (à connecter à la vraie API)
    await new Promise(r => setTimeout(r, 1500))
    const { error } = await sb.from('abonnements').insert({
      entreprise_id: eid,
      plan: planSel.nom,
      montant: planSel.prix,
      moyen_paiement: mmSel.nom,
      date_expiration: new Date(Date.now() + 30*24*3600*1000).toISOString().slice(0,10),
      statut: 'actif',
    })
    if (error) { showToast(error.message, 'error'); setPaying(false); return }
    showToast(`Abonnement ${planSel.nom} activé via ${mmSel.nom} ✅`)
    setStep(1); setPlanSel(null); setMmSel(null); setPhone('')
    loadAbos()
    setPaying(false)
  }

  // Jours restants
  const daysLeft = exp ? Math.ceil((new Date(exp) - new Date()) / (24*3600*1000)) : null
  const expAlert = daysLeft !== null && daysLeft <= 7

  return (
    <div style={{ padding:24, maxWidth:860 }}>

      {/* Statut abonnement actuel */}
      <div style={{ background:'#fff', borderRadius:16, border:`2px solid ${expAlert?C.err:C.pri}`, padding:24, marginBottom:28 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:12, color:C.g500, marginBottom:4 }}>Abonnement actuel</div>
            <div style={{ fontWeight:800, fontSize:26, color:expAlert?C.err:C.pri }}>{plan} {!expAlert?'✅':'⚠️'}</div>
            {exp && <div style={{ fontSize:13, color:expAlert?C.err:C.g600, marginTop:4, fontWeight:expAlert?600:400 }}>
              {expAlert ? `⚠️ Expire dans ${daysLeft} jour(s) !` : `Expire le ${exp}`}
            </div>}
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:12, color:C.g500 }}>Entreprise</div>
            <div style={{ fontWeight:600, fontSize:15 }}>{profil?.entreprises?.nom}</div>
          </div>
        </div>
      </div>

      {/* ÉTAPE 1 — Choisir un plan */}
      {step === 1 && (
        <>
          <div style={{ fontWeight:700, fontSize:17, marginBottom:16 }}>Choisir ou renouveler un plan</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16, marginBottom:28 }}>
            {PLANS.map(p => (
              <div key={p.id} style={{ background:'#fff', borderRadius:14, border:`${p.recommended?'2px':'1px'} solid ${p.recommended?p.color:C.g200}`, padding:24, position:'relative' }}>
                {p.recommended && <div style={{ position:'absolute', top:-12, left:20, background:C.pri, color:'#fff', borderRadius:20, fontSize:11, padding:'3px 12px', fontWeight:700 }}>⭐ Recommandé</div>}
                {plan===p.nom && <div style={{ position:'absolute', top:-12, right:20, background:C.ok, color:'#fff', borderRadius:20, fontSize:11, padding:'3px 12px', fontWeight:700 }}>Actuel</div>}
                <div style={{ fontWeight:700, fontSize:18, marginBottom:6 }}>{p.nom}</div>
                <div style={{ fontWeight:800, fontSize:26, color:p.color }}>{fmt(p.prix)}<span style={{ fontSize:13, fontWeight:400, color:C.g500 }}> / {p.periode}</span></div>
                <ul style={{ marginTop:14, paddingLeft:16, color:C.g600, fontSize:13, lineHeight:2.2 }}>
                  {p.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                <button onClick={() => selectPlan(p)} style={{ width:'100%', marginTop:16, padding:'11px', background:p.color, color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer' }}>
                  {plan===p.nom ? 'Renouveler' : 'Choisir ce plan'}
                </button>
              </div>
            ))}
          </div>

          {/* Historique paiements */}
          {abos.length > 0 && (
            <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${C.g200}`, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', fontWeight:700, fontSize:15, borderBottom:`1px solid ${C.g200}` }}>Historique des paiements</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                <thead><tr style={{ background:C.g50 }}>
                  {['Date','Plan','Montant','Moyen','Expiration','Statut'].map(h => <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:C.g600, fontSize:12, fontWeight:600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {abos.map(a => (
                    <tr key={a.id} style={{ borderBottom:`1px solid ${C.g100}` }}>
                      <td style={{ padding:'10px 14px', color:C.g600, fontSize:13 }}>{a.date_paiement?.slice(0,10)}</td>
                      <td style={{ padding:'10px 14px', fontWeight:600 }}>{a.plan}</td>
                      <td style={{ padding:'10px 14px', fontWeight:700, color:C.pri }}>{fmt(a.montant)}</td>
                      <td style={{ padding:'10px 14px', color:C.g600 }}>{a.moyen_paiement}</td>
                      <td style={{ padding:'10px 14px', color:C.g600 }}>{a.date_expiration}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ background:a.statut==='actif'?C.okL:C.errL, color:a.statut==='actif'?C.ok:C.err, borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600 }}>
                          {a.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ÉTAPE 2 — Choisir Mobile Money */}
      {step === 2 && planSel && (
        <div>
          <button onClick={() => setStep(1)} style={{ background:'#fff', border:`1px solid ${C.g200}`, borderRadius:8, padding:'7px 14px', cursor:'pointer', color:C.g600, marginBottom:20, fontSize:14 }}>← Retour</button>
          <div style={{ fontWeight:700, fontSize:17, marginBottom:6 }}>Paiement — Plan {planSel.nom}</div>
          <div style={{ fontSize:14, color:C.g500, marginBottom:20 }}>Montant : <strong style={{ color:C.pri }}>{fmt(planSel.prix)}</strong></div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14 }}>
            {MOBILE_MONEY.map(mm => (
              <button key={mm.nom} onClick={() => selectMM(mm)}
                style={{ background:mm.bg, border:`2px solid ${mm.color}30`, borderRadius:14, padding:'20px 12px', cursor:'pointer', textAlign:'center', transition:'all .2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor=mm.color}
                onMouseLeave={e => e.currentTarget.style.borderColor=mm.color+'30'}>
                <div style={{ fontSize:36, marginBottom:8 }}>{mm.ic}</div>
                <div style={{ fontWeight:700, color:mm.color, fontSize:15 }}>{mm.nom}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ÉTAPE 3 — Confirmation + saisie numéro */}
      {step === 3 && planSel && mmSel && (
        <div style={{ maxWidth:420 }}>
          <button onClick={() => setStep(2)} style={{ background:'#fff', border:`1px solid ${C.g200}`, borderRadius:8, padding:'7px 14px', cursor:'pointer', color:C.g600, marginBottom:20, fontSize:14 }}>← Retour</button>
          <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.g200}`, padding:28 }}>
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <div style={{ fontSize:48, marginBottom:8 }}>{mmSel.ic}</div>
              <div style={{ fontWeight:700, fontSize:18 }}>{mmSel.nom}</div>
              <div style={{ color:C.g500, fontSize:13, marginTop:4 }}>Plan {planSel.nom} · {fmt(planSel.prix)}</div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, color:C.g600, fontWeight:500, display:'block', marginBottom:6 }}>Numéro {mmSel.nom}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder={mmSel.prefix ? mmSel.prefix + ' XX XX XX' : 'Votre numéro'}
                style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:`1.5px solid ${C.g200}`, fontSize:15 }}/>
            </div>
            <div style={{ background:C.g50, borderRadius:8, padding:'12px 14px', marginBottom:20, fontSize:13, color:C.g600 }}>
              Un code de confirmation sera envoyé sur ce numéro. Validez-le pour activer votre abonnement.
            </div>
            <button onClick={confirmerPaiement} disabled={!phone || paying}
              style={{ width:'100%', padding:14, background:mmSel.color, color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:16, cursor:(!phone||paying)?'not-allowed':'pointer', opacity:(!phone||paying)?0.7:1 }}>
              {paying ? 'Traitement en cours…' : `Payer ${fmt(planSel.prix)} via ${mmSel.nom}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}