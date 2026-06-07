export default function Toast({ msg, type }) {
  const bg = type === 'error' ? '#DC2626' : '#16A34A'
  const ic = type === 'error' ? '❌' : '✅'
  return (
    <div style={{ position:'fixed', top:16, right:16, zIndex:9999, background:bg, color:'#fff', padding:'10px 18px', borderRadius:10, fontWeight:500, fontSize:14, boxShadow:'0 4px 20px rgba(0,0,0,0.18)', maxWidth:320 }}>
      {ic} {msg}
    </div>
  )
}