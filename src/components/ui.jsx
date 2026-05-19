import { useState, useRef } from 'react'
import { uploadFile } from '../lib/supabase'

// ── Avatar ─────────────────────────────────────────────────────────
const COLORS = ['#f9648e','#c4a8d8','#a8d8c4','#e8c87a','#f0a090','#90c0f0']
const initBg = (name) => COLORS[(name||'?').charCodeAt(0) % COLORS.length]
const initials = (name) => (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

export const Avatar = ({ name, src, size = 40, ring = false, onClick }) => {
  const s = {
    width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, cursor: onClick ? 'pointer' : 'default',
    border: ring ? '2.5px solid var(--accent)' : '2px solid var(--border-soft)',
    boxShadow: ring ? 'var(--shadow-rose)' : 'none',
    transition: 'transform .15s',
  }
  if (src) return <img src={src} alt={name} style={s} onClick={onClick} />
  return (
    <div onClick={onClick} style={{ ...s, background: initBg(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>
      {initials(name)}
    </div>
  )
}

// ── Button ─────────────────────────────────────────────────────────
export const Btn = ({ children, variant = 'primary', size = 'md', onClick, disabled, style = {}, type = 'button', fullWidth }) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? .55 : 1, border: 'none', transition: 'all .15s',
    borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap',
    width: fullWidth ? '100%' : 'auto',
    ...(size === 'sm' ? { fontSize: 12, padding: '6px 14px' } :
        size === 'lg' ? { fontSize: 15, padding: '12px 28px' } :
                        { fontSize: 13, padding: '9px 20px' }),
  }
  const variants = {
    primary:  { background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-rose)' },
    soft:     { background: 'var(--accent-soft)', color: 'var(--accent-text)', boxShadow: 'none' },
    ghost:    { background: 'transparent', color: 'var(--text-secondary)', boxShadow: 'none', border: '1.5px solid var(--border)' },
    danger:   { background: '#fee2e2', color: '#b91c1c', boxShadow: 'none' },
  }
  return (
    <button type={type} style={{ ...base, ...variants[variant], ...style }} onClick={onClick} disabled={disabled}
      onMouseEnter={e => { if(!disabled) e.currentTarget.style.filter='brightness(1.07)' }}
      onMouseLeave={e => { e.currentTarget.style.filter='' }}>
      {children}
    </button>
  )
}

// ── Card ───────────────────────────────────────────────────────────
export const Card = ({ children, style = {}, onClick, hover = false }) => (
  <div onClick={onClick} style={{
    background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)',
    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
    transition: 'box-shadow .2s, border-color .2s, transform .15s',
    cursor: onClick ? 'pointer' : 'default', ...style
  }}
    onMouseEnter={e => { if(onClick||hover){ e.currentTarget.style.boxShadow='var(--shadow-md)'; e.currentTarget.style.borderColor='var(--rose-200)' } }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow='var(--shadow-sm)'; e.currentTarget.style.borderColor='var(--border-soft)' }}>
    {children}
  </div>
)

// ── Badge ──────────────────────────────────────────────────────────
export const Badge = ({ children, color = 'rose', size = 'sm' }) => {
  const colors = {
    rose:     { bg: 'var(--rose-100)',    color: 'var(--rose-600)' },
    lavender: { bg: '#ede8f5',            color: '#7c5cbf' },
    mint:     { bg: '#e0f5ee',            color: '#2a7a5e' },
    gold:     { bg: '#fdf3dc',            color: '#9a6e10' },
    gray:     { bg: 'var(--stone-100)',   color: 'var(--stone-700)' },
    red:      { bg: '#fee2e2',            color: '#b91c1c' },
    blue:     { bg: '#e0f0ff',            color: '#1a5fa3' },
  }
  const c = colors[color] || colors.rose
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: size==='xs' ? 10 : 11, fontWeight: 700, padding: size==='xs' ? '2px 7px' : '3px 10px', borderRadius: 'var(--radius-full)', letterSpacing: 0.3, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

// ── Divider ────────────────────────────────────────────────────────
export const Divider = ({ label, style = {} }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }}>
    <div style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} />
    {label && <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>{label}</span>}
    <div style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} />
  </div>
)

// ── Modal ──────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, width = 480 }) => {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(46,31,40,.55)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <Card style={{ width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto', animation: 'modalIn .2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', padding: 4, borderRadius: 6, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '16px 24px 24px' }}>{children}</div>
      </Card>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(.96) } to { opacity:1; transform:scale(1) } }`}</style>
    </div>
  )
}

// ── Görsel sıkıştırıcı (canvas) ───────────────────────────────────
export const resizeImage = (file, maxW = 1280, quality = 0.82) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxW / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => blob
          ? resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
          : reject(new Error('Canvas boş')),
        'image/jpeg', quality
      )
    }
    img.onerror = reject
    img.src = url
  })

// ── ImageUpload (canvas sıkıştırmalı) ─────────────────────────────
export const ImageUpload = ({ bucket, path, onUploaded, children, style = {}, maxW = 1280, quality = 0.82 }) => {
  const [loading, setLoading] = useState(false)
  const [hint, setHint] = useState('')
  const ref = useRef()

  const handle = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    try {
      setHint('Sıkıştırılıyor...')
      const compressed = await resizeImage(file, maxW, quality)
      const saved = ((1 - compressed.size / file.size) * 100).toFixed(0)
      setHint(`Yükleniyor... (%${saved} küçüldü)`)
      const url = await uploadFile(bucket, `${path}-${Date.now()}`, compressed)
      onUploaded(url)
    } catch(err) {
      alert('Yükleme hatası: ' + err.message)
    } finally { setLoading(false); setHint('') }
  }

  return (
    <div style={{ position: 'relative', cursor: loading ? 'default' : 'pointer', ...style }}
      onClick={() => !loading && ref.current?.click()}>
      <input ref={ref} type="file" accept="image/*" onChange={handle} style={{ display: 'none' }} />
      {loading
        ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
            <span style={{ animation: 'spin .7s linear infinite', display: 'inline-block' }}>⏳</span> {hint}
          </div>
        : children}
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────────
export const Spinner = ({ size = 24 }) => (
  <>
    <div style={{ width: size, height: size, border: `3px solid var(--border)`, borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto' }} />
    <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
  </>
)

// ── Toast ──────────────────────────────────────────────────────────
let _setToasts = null
export const toast = (msg, type = 'success') => {
  _setToasts?.(prev => [...prev, { id: Date.now(), msg, type }])
}
export const ToastContainer = () => {
  const [toasts, setToasts] = useState([])
  _setToasts = setToasts
  const remove = (id) => setToasts(p => p.filter(t => t.id !== id))
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: t.type==='error' ? '#fee2e2' : 'var(--bg-card)', color: t.type==='error' ? '#b91c1c' : 'var(--text-primary)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: '12px 16px', boxShadow: 'var(--shadow-md)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, animation: 'toastIn .25s ease', minWidth: 220 }}
          onClick={() => remove(t.id)}>
          {t.type === 'error' ? '❌' : '✅'} {t.msg}
        </div>
      ))}
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }`}</style>
    </div>
  )
}

// ── timeAgo ────────────────────────────────────────────────────────
export const timeAgo = (iso) => {
  const d = (Date.now() - new Date(iso)) / 1000
  if (d < 60) return 'şimdi'
  if (d < 3600) return `${Math.floor(d/60)}dk`
  if (d < 86400) return `${Math.floor(d/3600)}sa`
  if (d < 604800) return `${Math.floor(d/86400)}g`
  return new Date(iso).toLocaleDateString('tr-TR', { day:'numeric', month:'short' })
}
