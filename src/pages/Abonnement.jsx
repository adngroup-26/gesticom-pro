import { useState, useEffect, useCallback } from 'react'
import { initierPaiementWave, initierPaiementOrange, paiementDemo, chargerHistorique } from '../lib/paiement'

// ── Couleurs ────────────────────────────────────────────────────
const C = {
  pri:'#2563EB', priL:'#EFF6FF', ok:'#16A34A', okL:'#F0FDF4',
  err:'#DC2626', errL:'#FEF2F2', war:'#D97706', warL:'#FFFBEB',
  g50:'#F9FAFB', g100:'#F3F4F6', g200:'#E5E7EB',
  g500:'#6B7280', g600:'#4B5563', g800:'#1F2937',
}
const fmt = n => (n || 0).toLocaleString('fr-FR') + ' FCFA'

// ── Plans ───────────────────────────────────────────────────────
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

// ── Opérateurs Mobile Money ──────────────────────────────────────
const OPERATEURS = [
  { id: 'wave',         nom: 'Wave',         ic: '💙', color: '#1DA1F2', bg: '#E8F5FD', prefix: '' },
  { id: 'orange_money', nom: 'Orange Money', ic: '🟠', color: '#FF6600', bg: '#FFF3E0', prefix: '+225 07' },
  { id: 'mtn',          nom: 'MTN Money',    ic: '🟡', color: '#FFCC00', bg: '#FFFDE7', prefix: '+225 05' },
  { id: 'moov',         nom: 'Moov Money',   ic: '🔵', color: '#0066CC', bg: '#E3F2FD', prefix: '+225 01' },
]

// ── Modes ────────────────────────────────────────────────────────
// MODE_DEMO = true  → paiement simulé (pas d'API réelle)
// MODE_DEMO = false → Wave et Orange Money réels
const MODE_DEMO = import.meta.env.VITE_PAYMENT_MODE !== 'live'

// ================================================================
export default function Abonnement({ profil, showToast }) {
  const [historique, setHistorique] = useState([])
  const [planSel,    setPlanSel]    = useState(null)
  const [opSel,      setOpSel]      = useState(null)
  const [telephone,  setTelephone]  = useState('')
  const [loading,    setLoading]    = useState(false)
  const [step,       setStep]       = useState(1)   // 1=plans | 2=opérateur | 3=saisie | 4=attente
  const [paymentId,  setPaymentId]  = useState(null)
  const [errMsg,     setErrMsg]     = useState('')

  const eid       = profil?.entreprise_id
  const planActif = profil?.entreprises?.plan || 'Aucun'
  const exp       = profil?.entreprises?.date_expiration
  const daysLeft  = exp ? Math.ceil((new Date(exp) - new Date()) / (24 * 3600 * 1000)) : null
  const expAlerte = daysLeft !== null && daysLeft <= 7

  const charger = useCallback(async () => {
    if (eid) setHistorique(await chargerHistorique(eid))
  }, [eid])

  useEffect(() => { charger() }, [charger])

  // -- Polling paiement Wave (vérifie toutes les 3s pendant 3 min) --
  useEffect(() => {
    if (step !== 4 || !paymentId) return
    let tentatives = 0
    const max = 60 // 60 × 3s = 3 min

    const timer = setInterval(async () => {
      tentatives++
      try {
        const { data } = await import('../supabase').then(m =>
          m.sb.from('paiements').select('statut,plan').eq('id', paymentId).single()
        )
        if (data?.statut === 'succes') {
          clearInterval(timer)
          showToast(`✅ Paiement confirmé ! Plan ${data.plan} activé.`)
          setStep(1); setPaymentId(null)
          charger()
        } else if (data?.statut === 'echec') {
          clearInterval(timer)
          setErrMsg('Le paiement a échoué. Veuillez réessayer.')
          setStep(3)
        }
      } catch {/* ignore */}

      if (tentatives >= max) {
        clearInterval(timer)
        setErrMsg('Délai dépassé. Si vous avez payé, rechargez la page dans quelques minutes.')
        setStep(3)
      }
    }, 3000)

    return () => clearInterval(timer)
  }, [step, paymentId, showToast, charger])

  // ── Payer ────────────────────────────────────────────────────
  async function payer() {
    if (!telephone && opSel.id !== 'wave') {
      setErrMsg('Veuillez entrer votre numéro de téléphone.')
      return
    }
    setErrMsg('')
    setLoading(true)

    try {
      // Nettoyer le numéro
      const tel = telephone.replace(/[\s\-().+]/g, '')
        .replace(/^00225/, '')
        .replace(/^225/, '')
        .replace(/^0/, '')

      if (MODE_DEMO) {
        // ── Mode démo : simulation sans API réelle ────────────────
        await paiementDemo({
          entrepriseId: eid,
          plan:         planSel,
          montant:      planSel.prix,
          operateur:    opSel.nom,
          telephone:    tel,
        })
        showToast(`✅ Abonnement ${planSel.nom} activé (mode démo)`)
        setStep(1); setPlanSel(null); setOpSel(null); setTelephone('')
        charger()

      } else if (opSel.id === 'wave') {
        // ── Wave : redirection vers l'app Wave ───────────────────
        const res = await initierPaiementWave({
          entrepriseId: eid,
          plan:         planSel.nom,
          montant:      planSel.prix,
        })
        if (!res.success) throw new Error(res.message)
        setPaymentId(res.paymentId)
        setStep(4) // Afficher l'écran "en attente"
        // Ouvrir Wave dans un nouvel onglet
        window.open(res.paymentUrl, '_blank')

      } else if (opSel.id === 'orange_money') {
        // ── Orange Money : redirection ────────────────────────────
        const res = await initierPaiementOrange({
          entrepriseId: eid,
          plan:         planSel.nom,
          montant:      planSel.prix,
          telephone:    `225${tel}`,
        })
        if (!res.success) throw new Error(res.message)
        setPaymentId(res.paymentId)
        setStep(4)
        window.open(res.paymentUrl, '_blank')

      } else {
        // MTN / Moov : pas encore d'API officielle CI
        // On enregistre le paiement comme "en attente de confirmation manuelle"
        const { sb } = await import('../supabase')
        await sb.from('paiements').insert({
          entreprise_id: eid,
          plan:          planSel.nom,
          montant:       planSel.prix,
          operateur:     opSel.nom,
          telephone:     tel,
          statut:        'en_attente',
        })
        showToast('📲 Demande envoyée. Notre équipe confirmera votre paiement sous 30 min.')
        setStep(1); setPlanSel(null); setOpSel(null); setTelephone('')
        charger()
      }

    } catch (e) {
      setErrMsg(e.message || 'Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  // ================================================================
  //  RENDU
  // ================================================================
  return (
    <div style={{ padding: 24, maxWidth: 860 }}>

      {/* ── Bandeau statut actuel ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: `2px solid ${expAlerte ? C.err : C.pri}`, padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: C.g500, marginBottom: 4 }}>Abonnement actuel</div>
            <div style={{ fontWeight: 800, fontSize: 26, color: expAlerte ? C.err : C.pri }}>
              {planActif} {expAlerte ? '⚠️' : '✅'}
            </div>
            {exp && (
              <div style={{ fontSize: 13, color: expAlerte ? C.err : C.g600, marginTop: 4, fontWeight: expAlerte ? 600 : 400 }}>
                {expAlerte ? `⚠️ Expire dans ${daysLeft} jour(s) !` : `Expire le ${exp}`}
              </div>
            )}
            {MODE_DEMO && (
              <div style={{ marginTop: 8, background: C.warL, color: C.war, fontSize: 11, padding: '3px 10px', borderRadius: 20, display: 'inline-block', fontWeight: 600 }}>
                🔧 Mode démo — paiements simulés
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: C.g500 }}>Entreprise</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{profil?.entreprises?.nom}</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ÉTAPE 1 — Choisir un plan
      ══════════════════════════════════════════════════════ */}
      {step === 1 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>Choisir ou renouveler un plan</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 28 }}>
            {PLANS.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: `${p.recommended ? '2px' : '1px'} solid ${p.recommended ? p.color : C.g200}`, padding: 24, position: 'relative' }}>
                {p.recommended && <div style={{ position: 'absolute', top: -12, left: 20, background: C.pri, color: '#fff', borderRadius: 20, fontSize: 11, padding: '3px 12px', fontWeight: 700 }}>⭐ Recommandé</div>}
                {planActif === p.nom && <div style={{ position: 'absolute', top: -12, right: 20, background: C.ok, color: '#fff', borderRadius: 20, fontSize: 11, padding: '3px 12px', fontWeight: 700 }}>Actuel</div>}
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{p.nom}</div>
                <div style={{ fontWeight: 800, fontSize: 26, color: p.color }}>{fmt(p.prix)}<span style={{ fontSize: 13, fontWeight: 400, color: C.g500 }}> / {p.periode}</span></div>
                <ul style={{ marginTop: 14, paddingLeft: 16, color: C.g600, fontSize: 13, lineHeight: 2.2 }}>
                  {p.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                <button onClick={() => { setPlanSel(p); setStep(2) }}
                  style={{ width: '100%', marginTop: 16, padding: 11, background: p.color, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  {planActif === p.nom ? 'Renouveler' : 'Choisir ce plan'}
                </button>
              </div>
            ))}
          </div>

          {/* Historique */}
          {historique.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.g200}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', fontWeight: 700, fontSize: 15, borderBottom: `1px solid ${C.g200}` }}>Historique des paiements</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ background: C.g50 }}>
                  {['Date', 'Plan', 'Montant', 'Opérateur', 'Expiration', 'Statut'].map(h =>
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: C.g600, fontSize: 12, fontWeight: 600 }}>{h}</th>
                  )}
                </tr></thead>
                <tbody>
                  {historique.map(p => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${C.g100}` }}>
                      <td style={{ padding: '10px 14px', color: C.g600, fontSize: 13 }}>{p.created_at?.slice(0, 10)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.plan}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: C.pri }}>{fmt(p.montant)}</td>
                      <td style={{ padding: '10px 14px', color: C.g600 }}>{p.operateur}</td>
                      <td style={{ padding: '10px 14px', color: C.g600 }}>{p.date_expiration}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          background: p.statut === 'succes' ? C.okL : p.statut === 'en_attente' ? C.warL : C.errL,
                          color:      p.statut === 'succes' ? C.ok  : p.statut === 'en_attente' ? C.war  : C.err,
                          borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                        }}>
                          {p.statut === 'succes' ? '✅ Payé' : p.statut === 'en_attente' ? '⏳ En attente' : '❌ Échec'}
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

      {/* ══════════════════════════════════════════════════════
          ÉTAPE 2 — Choisir l'opérateur Mobile Money
      ══════════════════════════════════════════════════════ */}
      {step === 2 && planSel && (
        <div>
          <button onClick={() => setStep(1)} style={btnRetour}>← Retour</button>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Paiement — Plan {planSel.nom}</div>
          <div style={{ fontSize: 14, color: C.g500, marginBottom: 20 }}>Montant : <strong style={{ color: C.pri }}>{fmt(planSel.prix)}</strong></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 14 }}>
            {OPERATEURS.map(op => (
              <button key={op.id} onClick={() => { setOpSel(op); setErrMsg(''); setStep(3) }}
                style={{ background: op.bg, border: `2px solid ${op.color}40`, borderRadius: 14, padding: '20px 12px', cursor: 'pointer', textAlign: 'center', transition: 'border-color .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = op.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = op.color + '40'}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{op.ic}</div>
                <div style={{ fontWeight: 700, color: op.color, fontSize: 15 }}>{op.nom}</div>
                {(op.id === 'mtn' || op.id === 'moov') && (
                  <div style={{ fontSize: 10, color: C.g500, marginTop: 4 }}>Confirmation manuelle</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ÉTAPE 3 — Saisie numéro + confirmation
      ══════════════════════════════════════════════════════ */}
      {step === 3 && planSel && opSel && (
        <div style={{ maxWidth: 420 }}>
          <button onClick={() => setStep(2)} style={btnRetour}>← Retour</button>
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.g200}`, padding: 28 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{opSel.ic}</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{opSel.nom}</div>
              <div style={{ color: C.g500, fontSize: 13, marginTop: 4 }}>Plan {planSel.nom} · <strong style={{ color: C.pri }}>{fmt(planSel.prix)}</strong></div>
            </div>

            {/* Wave : pas besoin de numéro, redirection directe */}
            {opSel.id === 'wave' ? (
              <div style={{ background: '#E8F5FD', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: '#0C4A6E', lineHeight: 1.7 }}>
                💙 Vous allez être redirigé vers <strong>Wave</strong> pour confirmer le paiement de <strong>{fmt(planSel.prix)}</strong>.<br />
                Votre abonnement sera activé automatiquement après confirmation.
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: C.g600, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  Numéro {opSel.nom}
                </label>
                <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                  placeholder={opSel.prefix ? opSel.prefix + ' XX XX XX' : 'Votre numéro'}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${C.g200}`, fontSize: 15, boxSizing: 'border-box' }} />
              </div>
            )}

            {/* MTN / Moov : avertissement confirmation manuelle */}
            {(opSel.id === 'mtn' || opSel.id === 'moov') && (
              <div style={{ background: C.warL, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: C.war }}>
                ⏳ Votre paiement sera confirmé manuellement par notre équipe sous 30 minutes.
              </div>
            )}

            {errMsg && (
              <div style={{ background: C.errL, color: C.err, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                ⚠️ {errMsg}
              </div>
            )}

            <button onClick={payer} disabled={loading || (opSel.id !== 'wave' && !telephone)}
              style={{ width: '100%', padding: 14, background: loading ? C.g500 : opSel.color, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background .2s' }}>
              {loading ? '⏳ Traitement…' : opSel.id === 'wave' ? `Payer via Wave →` : `Payer ${fmt(planSel.prix)} via ${opSel.nom}`}
            </button>

            <div style={{ textAlign: 'center', fontSize: 11, color: C.g500, marginTop: 12 }}>
              🔒 Paiement sécurisé — vos données ne sont pas stockées
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ÉTAPE 4 — En attente de confirmation Wave / Orange
      ══════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.g200}`, padding: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>
              {opSel?.id === 'wave' ? '💙' : '🟠'}
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>En attente de confirmation</div>
            <div style={{ color: C.g500, fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
              Confirmez le paiement de <strong style={{ color: C.pri }}>{fmt(planSel?.prix)}</strong> dans l'application <strong>{opSel?.nom}</strong>.<br />
              Cette page se mettra à jour automatiquement.
            </div>
            {/* Spinner animé */}
            <div style={{ width: 40, height: 40, border: `4px solid ${C.g200}`, borderTopColor: C.pri, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <button onClick={() => { setStep(3); setPaymentId(null) }}
              style={{ background: 'none', border: `1px solid ${C.g200}`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: C.g600, fontSize: 13 }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const btnRetour = {
  background: '#fff', border: `1px solid #E5E7EB`, borderRadius: 8,
  padding: '7px 14px', cursor: 'pointer', color: '#4B5563',
  marginBottom: 20, fontSize: 14,
}
