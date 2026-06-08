import { memo, useCallback } from 'react'

const Modal = memo(function Modal({ title, children, onClose, wide }) {
  // Handler stable — ne change pas entre les renders
  const handleBackdrop = useCallback(e => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onMouseDown={handleBackdrop}
    >
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:wide?560:440, maxWidth:'100%', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:18, color:'#1F2937' }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#6B7280', lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
})

export default Modal