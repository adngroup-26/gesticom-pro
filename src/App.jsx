// src/App.jsx — GestiCom Pro
import { useState, useEffect } from 'react'
import { sb } from './supabase'
import Auth from './components/Auth'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'
import Dashboard from './pages/Dashboard'
import Vente from './pages/Vente'
import Stock from './pages/Stock'
import Clients from './pages/Clients'
import Historique from './pages/Historique'
import Rapports from './pages/Rapports'
import Utilisateurs from './pages/Utilisateurs'
import Abonnement from './pages/Abonnement'

export default function App() {
  const [session, setSession] = useState(null)
  const [profil,  setProfil]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState('dashboard')
  const [toast,   setToast]   = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfil(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      if (session) loadProfil(session.user.id)
      else { setProfil(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfil(uid) {
    const { data } = await sb
      .from('utilisateurs')
      .select('*, entreprises(*)')
      .eq('auth_user_id', uid)
      .single()
    setProfil(data)
    setLoading(false)
  }

  async function signOut() {
    await sb.auth.signOut()
    setSession(null); setProfil(null); setPage('dashboard')
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#EFF6FF' }}>
      <div style={{ width:40, height:40, border:'3px solid #BFDBFE', borderTop:'3px solid #2563EB', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
    </div>
  )

  if (!session) return <Auth onAuth={() => {}} />

  const role  = profil?.role || 'caissier'
  const isAdm = role === 'admin'
  const isGer = role === 'gerant' || isAdm
  const isCai = role === 'caissier' || isGer
  const eid   = profil?.entreprise_id

  const pages = {
    dashboard:  <Dashboard eid={eid} showToast={showToast} />,
    vente:      <Vente eid={eid} profil={profil} showToast={showToast} />,
    stock:      <Stock eid={eid} profil={profil} showToast={showToast} isAdm={isAdm} isGer={isGer} />,
    clients:    <Clients eid={eid} showToast={showToast} isAdm={isAdm} />,
    historique: <Historique eid={eid} showToast={showToast} />,
    rapports:   <Rapports eid={eid} />,
    users:      <Utilisateurs eid={eid} showToast={showToast} />,
    abonnement: <Abonnement profil={profil} showToast={showToast} />,
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <Sidebar
        page={page} setPage={setPage}
        profil={profil} role={role}
        isAdm={isAdm} isGer={isGer} isCai={isCai}
        onSignOut={signOut}
      />
      <main style={{ flex:1, overflow:'auto' }}>
        {pages[page] || pages.dashboard}
      </main>
    </div>
  )
}