const C = {
  pri:'#2563EB', priL:'#EFF6FF',
  ok:'#16A34A',  okL:'#F0FDF4',
  war:'#D97706', warL:'#FFFBEB',
  err:'#DC2626',
  g50:'#F9FAFB', g100:'#F3F4F6', g200:'#E5E7EB',
  g500:'#6B7280', g600:'#4B5563', g800:'#1F2937'
}

function Badge({ txt, fg, bg }) {
  return <span style={{ background:bg, color:fg, borderRadius:20, padding:'2px 9px', fontSize:11, fontWeight:600 }}>{txt}</span>
}

export default function Sidebar({ page, setPage, profil, role, isAdm, isGer, isCai, onSignOut }) {
  const entNom = profil?.entreprises?.nom || 'Mon Entreprise'
  const nom    = profil?.nom || ''

  const navItems = [
    { id:'dashboard',  ic:'📊', lb:'Tableau de bord', show: true    },
    { id:'vente',      ic:'🛒', lb:'Vente rapide',     show: true    },
    { id:'stock',      ic:'📦', lb:'Stock',            show: true    },
    { id:'clients',    ic:'👥', lb:'Clients',          show: true    },
    { id:'historique', ic:'📋', lb:'Historique',       show: isGer   },
    { id:'rapports',   ic:'📈', lb:'Rapports',         show: isGer   },
    { id:'users',      ic:'👤', lb:'Utilisateurs',     show: isAdm   },
    { id:'abonnement', ic:'💳', lb:'Abonnement',       show: isAdm   },
  ].filter(n => n.show)

  function bdgRole(r) {
    const fg = r==='admin' ? C.pri : r==='gerant' ? C.war : C.ok
    const bg = r==='admin' ? C.priL : r==='gerant' ? C.warL : C.okL
    return <Badge txt={r} fg={fg} bg={bg}/>
  }

  return (
    <aside style={{ width:220, background:'#fff', borderRight:`1px solid ${C.g200}`, display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', overflowY:'auto', flexShrink:0 }}>

      {/* Logo + profil */}
      <div style={{ padding:'18px 16px 12px', borderBottom:`1px solid ${C.g100}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <div style={{ width:34, height:34, background:C.pri, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:16 }}>G</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:C.g800 }}>GestiCom Pro</div>
            <div style={{ fontSize:11, color:C.ok, fontWeight:600 }}>● Connecté</div>
          </div>
        </div>
        <div style={{ background:C.g50, borderRadius:9, padding:'9px 10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:C.pri, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>
              {nom.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontWeight:600, fontSize:13, color:C.g800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nom}</div>
              {bdgRole(role)}
            </div>
          </div>
          <div style={{ fontSize:11, color:C.g500, marginTop:7, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>🏪 {entNom}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding:8, flex:1 }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:8, border:'none', background:page===n.id?C.priL:'transparent', color:page===n.id?C.pri:C.g600, fontWeight:page===n.id?700:400, fontSize:14, cursor:'pointer', marginBottom:2, textAlign:'left' }}>
            <span>{n.ic}</span>{n.lb}
          </button>
        ))}
      </nav>

      {/* Déconnexion */}
      <div style={{ padding:12, borderTop:`1px solid ${C.g100}` }}>
        <button onClick={onSignOut}
          style={{ width:'100%', padding:9, borderRadius:9, border:`1px solid ${C.g200}`, background:'#fff', color:C.err, fontWeight:600, fontSize:13, cursor:'pointer' }}>
          🚪 Se déconnecter
        </button>
      </div>
    </aside>
  )
}