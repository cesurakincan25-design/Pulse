import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Btn, Divider, Spinner } from '../components/ui'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [tab, setTab]         = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const submit = async () => {
    setError('')
    setLoading(true)
    if (tab === 'login') {
      const err = await signIn(email, password)
      if (err) setError(err.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı.' : err.message)
    } else {
      if (!username.trim() || !displayName.trim()) { setError('Tüm alanları doldur.'); setLoading(false); return }
      // Davetiye kontrolü
      const { data: inv } = await import('../lib/supabase').then(m =>
        m.supabase.from('invites').select('*').eq('code', inviteCode).is('used_by', null).single()
      )
      if (!inv) { setError('Geçersiz veya kullanılmış davetiye kodu.'); setLoading(false); return }
      const err = await signUp(email, password, username, displayName)
      if (err) setError(err.message)
      else setDone(true)
    }
    setLoading(false)
  }

  if (done) return (
    <div style={centeredStyle}>
      <div style={boxStyle}>
        <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🎉</div>
        <h2 style={headStyle}>Kayıt tamam!</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: 14, lineHeight: 1.6 }}>
          Hesabın oluşturuldu. Admin onayı bekleniyor. Onaylandıktan sonra giriş yapabilirsin.
        </p>
        <Btn variant="soft" fullWidth onClick={() => { setDone(false); setTab('login') }} style={{ marginTop: 20 }}>Giriş Yap</Btn>
      </div>
    </div>
  )

  return (
    <div style={centeredStyle}>
      {/* Dekoratif arka plan */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, var(--rose-100) 0%, transparent 70%)', opacity: .6 }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, #ede8f5 0%, transparent 70%)', opacity: .5 }} />
      </div>

      <div style={{ ...boxStyle, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>💗</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -1 }}>Pulse</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>What's your Pulse?</p>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 'var(--radius-full)', padding: 4, marginBottom: 24, border: '1.5px solid var(--border-soft)' }}>
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }} style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-full)', border: 'none', background: tab === t ? 'var(--bg-card)' : 'transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: tab === t ? 700 : 500, fontSize: 13, transition: 'all .2s', boxShadow: tab === t ? 'var(--shadow-sm)' : 'none', fontFamily: 'var(--font-ui)', cursor: 'pointer' }}>
              {t === 'login' ? '🔑 Giriş Yap' : '✨ Kayıt Ol'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'register' && (
            <>
              <input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Adın (gerçek/takma)" />
              <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Kullanıcı adı (@pulse)" />
            </>
          )}
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-posta" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Şifre" onKeyDown={e=>e.key==='Enter'&&submit()} />
          {tab === 'register' && (
            <input value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="Davetiye kodu (örn: ab12cd34)" />
          )}
          {error && <p style={{ color: '#e05', fontSize: 13, background: '#fee2e2', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>{error}</p>}
          <Btn onClick={submit} disabled={loading} fullWidth size="lg" style={{ marginTop: 4 }}>
            {loading ? <Spinner size={18} /> : tab === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

const centeredStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
const boxStyle      = { background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius-xl)', padding: 32, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-md)' }
const headStyle     = { fontSize: 20, fontWeight: 800, textAlign: 'center', color: 'var(--text-primary)', marginBottom: 8 }
