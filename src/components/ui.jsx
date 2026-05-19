import { useState, useRef, useEffect } from 'react'
import { uploadFile } from '../lib/supabase'

const COLORS = ['#f9648e','#c4a8d8','#7ec8b4','#e8a84a','#6a9ed4','#c47eb4']
const initBg = n => COLORS[(n||'?').charCodeAt(0) % COLORS.length]
const initials = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

export const Avatar = ({ name, src, size=40, ring=false, onClick, online=false }) => {
  const s = { width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0,
    border: ring ? '2.5px solid var(--accent)' : '2px solid var(--border-soft)',
    boxShadow: ring ? 'var(--shadow-rose)' : 'none', cursor: onClick?'pointer':'default' }
  return (
    <div style={{ position:'relative', flexShrink:0, width:size, height:size }}>
      {src
        ? <img src={src} alt={name} style={s} onClick={onClick} onError={e=>{e.target.style.display='none'}} />
        : <div onClick={onClick} style={{...s, background:initBg(name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.36, fontWeight:700, color:'#fff', letterSpacing:-.5}}>{initials(name)}</div>
      }
      {online && <div style={{ position:'absolute', bottom:0, right:0, width:Math.max(8,size*.2), height:Math.max(8,size*.2), borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 6px rgba(34,197,94,.8)', border:'2px solid var(--sidebar-bg)' }} />}
    </div>
  )
}

export const Btn = ({ children, variant='primary', size='md', onClick, disabled, style={}, type='button', fullWidth }) => {
  const sz = size==='sm'?{fontSize:12,padding:'5px 13px'}:size==='lg'?{fontSize:15,padding:'11px 26px'}:{fontSize:13,padding:'8px 18px'}
  const vars = {
    primary: { background:'var(--accent)', color:'#fff', border:'none', boxShadow:'var(--shadow-rose)' },
    soft:    { background:'var(--accent-soft)', color:'var(--accent-text)', border:'none' },
    ghost:   { background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border)' },
    danger:  { background:'#fee2e2', color:'#b91c1c', border:'none' },
    dark:    { background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' },
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'var(--font-ui)', fontWeight:700, borderRadius:'var(--radius-full)', whiteSpace:'nowrap', cursor:disabled?'not-allowed':'pointer', opacity:disabled?.55:1, transition:'all .15s', width:fullWidth?'100%':'auto', ...sz, ...vars[variant], ...style }}
      onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.filter='brightness(1.08)' }}
      onMouseLeave={e=>{ e.currentTarget.style.filter='' }}>
      {children}
    </button>
  )
}

export const Badge = ({ children, color='rose', size='sm' }) => {
  const c = { rose:{bg:'var(--rose-100)',txt:'var(--rose-600)'}, lavender:{bg:'#ede8f5',txt:'#7c5cbf'}, mint:{bg:'#e0f5ee',txt:'#2a7a5e'}, gold:{bg:'#fdf3dc',txt:'#9a6e10'}, gray:{bg:'#f0f0f0',txt:'#555'}, blue:{bg:'#e0f0ff',txt:'#1a5fa3'}, red:{bg:'#fee2e2',txt:'#b91c1c'} }[color]||{bg:'var(--rose-100)',txt:'var(--rose-600)'}
  return <span style={{ background:c.bg, color:c.txt, fontSize:size==='xs'?10:11, fontWeight:700, padding:size==='xs'?'2px 7px':'3px 10px', borderRadius:'var(--radius-full)', letterSpacing:.3, display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>{children}</span>
}

export const Modal = ({ open, onClose, title, children, width=480 }) => {
  if (!open) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', width:'100%', maxWidth:width, maxHeight:'90vh', overflowY:'auto', animation:'modalIn .2s ease', boxShadow:'var(--shadow-md)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
          <h2 style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer', lineHeight:1, padding:4 }}>×</button>
        </div>
        <div style={{ padding:'16px 20px 20px' }}>{children}</div>
      </div>
    </div>
  )
}

export const resizeImage = (file, maxW=1280, quality=.82) => new Promise((res,rej) => {
  const img = new Image(), url = URL.createObjectURL(file)
  img.onload = () => {
    URL.revokeObjectURL(url)
    const scale = Math.min(1, maxW/img.width), w=Math.round(img.width*scale), h=Math.round(img.height*scale)
    const c = document.createElement('canvas'); c.width=w; c.height=h
    c.getContext('2d').drawImage(img,0,0,w,h)
    c.toBlob(b=>b?res(new File([b],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'})):rej(new Error('Canvas boş')),'image/jpeg',quality)
  }
  img.onerror=rej; img.src=url
})

export const ImageUpload = ({ bucket, path, onUploaded, children, style={}, maxW=1280, quality=.82 }) => {
  const [loading, setLoading] = useState(false)
  const [hint, setHint] = useState('')
  const ref = useRef()
  const handle = async e => {
    const file = e.target.files[0]; if(!file) return
    setLoading(true)
    try {
      setHint('Sıkıştırılıyor...')
      const compressed = await resizeImage(file, maxW, quality)
      setHint(`Yükleniyor... (%${((1-compressed.size/file.size)*100).toFixed(0)} küçüldü)`)
      onUploaded(await uploadFile(bucket, `${path}-${Date.now()}`, compressed))
    } catch(err) { alert('Yükleme hatası: '+err.message) }
    finally { setLoading(false); setHint('') }
  }
  return (
    <div style={{ cursor:loading?'default':'pointer', ...style }} onClick={()=>!loading&&ref.current?.click()}>
      <input ref={ref} type="file" accept="image/*" onChange={handle} style={{display:'none'}} />
      {loading ? <span style={{fontSize:12,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:6}}><Spinner size={13}/> {hint}</span> : children}
    </div>
  )
}

export const Spinner = ({ size=24 }) => (
  <div style={{ width:size, height:size, border:`2.5px solid var(--border)`, borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0 }} />
)

let _setToasts = null
export const toast = (msg, type='success') => _setToasts?.(p=>[...p,{id:Date.now(),msg,type}])
export const ToastContainer = () => {
  const [toasts, setToasts] = useState([])
  _setToasts = setToasts
  useEffect(() => {
    if (!toasts.length) return
    const t = setTimeout(()=>setToasts(p=>p.slice(1)), 3200)
    return ()=>clearTimeout(t)
  }, [toasts])
  if (!toasts.length) return null
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t=>(
        <div key={t.id} onClick={()=>setToasts(p=>p.filter(x=>x.id!==t.id))}
          style={{ background:t.type==='error'?'#fee2e2':'var(--bg-card)', color:t.type==='error'?'#b91c1c':'var(--text-primary)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'10px 16px', boxShadow:'var(--shadow-md)', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8, animation:'toastIn .25s ease', cursor:'pointer', minWidth:200 }}>
          {t.type==='error'?'❌':'✅'} {t.msg}
        </div>
      ))}
    </div>
  )
}

export const timeAgo = iso => {
  const d=(Date.now()-new Date(iso))/1000
  if(d<60) return 'şimdi'; if(d<3600) return `${Math.floor(d/60)}dk`
  if(d<86400) return `${Math.floor(d/3600)}sa`; if(d<604800) return `${Math.floor(d/86400)}g`
  return new Date(iso).toLocaleDateString('tr-TR',{day:'numeric',month:'short'})
}

// FA v6 icon
export const Icon = ({ name, className='', style={} }) => (
  <i className={`fa-solid fa-${name} ${className}`} style={{ fontSize:'inherit', lineHeight:'inherit', ...style }} aria-hidden="true" />
)

// ── Emoji Picker ───────────────────────────────────────────────────
const EMOJI_LIST = [
  '😀','😁','😂','🤣','😊','😍','🥰','😘','😎','🤩','🥳','😏',
  '😒','😔','😢','😭','😡','🤬','😱','🤯','🥺','😴','🤔','🤭',
  '❤️','💗','💔','🔥','✨','🌟','💫','⭐','🎭','🎪','🎬','🎵',
  '🎶','🎸','🎹','🎺','🎻','🥁','🎤','🎧','🎮','🕹️','🎲','🎯',
  '🏆','🥇','🏅','🎖️','🍕','🍔','🍣','🍜','☕','🍵','🥤','🍺',
  '🚗','🏎️','🚀','✈️','🌍','🌸','🌹','🌺','🦋','🐱','🐶','🦊',
  '💪','👏','🙌','🤝','👍','👎','🫶','💅','🙏','✌️','🤞','👀',
]

export const EmojiPicker = ({ onSelect }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <button type="button" onClick={()=>setOpen(o=>!o)}
        style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, padding:'4px 6px', borderRadius:6, color:'var(--text-muted)', transition:'color .15s', lineHeight:1 }}
        onMouseEnter={e=>e.currentTarget.style.color='var(--accent)'}
        onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
        <i className="fa-regular fa-face-smile" />
      </button>
      {open && (
        <div style={{ position:'absolute', bottom:'calc(100% + 6px)', left:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:10, boxShadow:'var(--shadow-md)', zIndex:50, width:280, animation:'fadeIn .15s ease' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:2, maxHeight:200, overflowY:'auto' }}>
            {EMOJI_LIST.map(e=>(
              <button key={e} type="button" onClick={()=>{ onSelect(e); setOpen(false) }}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, padding:'4px', borderRadius:6, lineHeight:1, transition:'background .1s' }}
                onMouseEnter={x=>x.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={x=>x.currentTarget.style.background='none'}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
