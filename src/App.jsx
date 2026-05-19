import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import LoginPage from './pages/Login'
import { CharacterSwitcher, CharacterDropdown, CharacterProfile } from './components/Characters'
import { Feed } from './components/Feed'
import { Messages } from './components/Messages'
import { AdminPanel } from './components/Admin'
import { NotificationBell } from './components/Notifications'
import { Avatar, Btn, Spinner, ToastContainer } from './components/ui'
import './index.css'

const useDarkMode = () => {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return [dark, () => setDark(d => !d)]
}

// ── Pulse Live (Explore) ──────────────────────────────────────────
const Explore = ({ onViewProfile }) => {
  const [chars, setChars] = useState([])
  useEffect(() => {
    import('./lib/supabase').then(({ supabase }) =>
      supabase.from('characters').select('*, players(username)').order('name').then(({ data }) => setChars(data || []))
    )
  }, [])
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: 'var(--text-primary)' }}>📡 Pulse Live — Karakterler & Sayfalar</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 14 }}>
        {chars.map(c => (
          <div key={c.id} onClick={() => onViewProfile(c)}
            style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)', borderRadius: 16, padding: '20px 14px', textAlign: 'center', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.boxShadow='var(--shadow-md)' }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.borderColor='var(--border-soft)'; e.currentTarget.style.boxShadow='var(--shadow-sm)' }}>
            <Avatar name={c.name} src={c.avatar_url} size={56} />
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginTop: 10, lineHeight: 1.3 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>@{c.players?.username}</div>
            {c.tagline && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>{c.tagline}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Ana Shell ─────────────────────────────────────────────────────
const Shell = () => {
  const { player, profile, activeChar, characters, loading, signOut } = useAuth()
  const [dark, toggleDark] = useDarkMode()
  const [tab, setTab]           = useState('feed')
  const [charScreen, setCharScreen] = useState(false)
  const [viewingChar, setViewingChar] = useState(null)  // profil sayfası

  const goToProfile = (char) => { setViewingChar(char); setTab('profile') }
  const backFromProfile = () => { setViewingChar(null); setTab('explore') }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <Spinner size={36} />
        <p style={{ color: 'var(--text-muted)', marginTop: 16, fontSize: 14 }}>Yükleniyor...</p>
      </div>
    </div>
  )

  if (!player) return <LoginPage />

  if (!profile?.is_approved) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)', borderRadius: 24, padding: 40, maxWidth: 400, textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💗</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Pulse'a Hoş Geldin!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>Hesabın admin tarafından inceleniyor. Onaylandıktan sonra Pulse'a katılabilirsin.</p>
        <Btn variant="ghost" onClick={signOut} style={{ marginTop: 20 }}>Çıkış Yap</Btn>
      </div>
    </div>
  )

  if (charScreen || characters.length === 0) return (
    <>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, display: 'flex', gap: 8 }}>
        <button onClick={toggleDark} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius-full)', padding: '8px 12px', cursor: 'pointer', fontSize: 14 }}>{dark ? '☀️' : '🌙'}</button>
        <Btn variant="ghost" size="sm" onClick={signOut}>Çıkış</Btn>
      </div>
      <CharacterSwitcher onSelect={() => setCharScreen(false)} />
    </>
  )

  const NAV = [
    { id: 'feed',    icon: '💗', label: 'Pulse Feed' },
    { id: 'explore', icon: '📡', label: 'Pulse Live' },
    { id: 'dm',      icon: '✉️', label: 'Mesajlar' },
    ...(profile?.role === 'admin' ? [{ id: 'admin', icon: '⚙️', label: 'Admin' }] : []),
  ]

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg-card)', borderBottom: '1.5px solid var(--border-soft)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 16px', height: 58, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setTab('feed')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span style={{ fontSize: 22 }}>💗</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>Pulse</span>
          </button>

          <nav style={{ display: 'flex', gap: 2, flex: 1, justifyContent: 'center' }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); setViewingChar(null) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-full)', border: 'none', background: tab===n.id ? 'var(--accent-soft)' : 'transparent', color: tab===n.id ? 'var(--accent-text)' : 'var(--text-muted)', fontWeight: tab===n.id ? 700 : 500, fontSize: 13, cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font-ui)' }}
                onMouseEnter={e => { if(tab!==n.id) e.currentTarget.style.background='var(--bg-hover)' }}
                onMouseLeave={e => { if(tab!==n.id) e.currentTarget.style.background='transparent' }}>
                <span>{n.icon}</span>
                <span style={{ display: window.innerWidth < 600 ? 'none' : 'inline' }}>{n.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <NotificationBell />
            <button onClick={toggleDark} style={{ background: 'none', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius-full)', padding: '6px 10px', cursor: 'pointer', fontSize: 14, transition: 'border-color .2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-soft)'}>
              {dark ? '☀️' : '🌙'}
            </button>
            <CharacterDropdown onViewProfile={goToProfile} />
            <button onClick={() => setCharScreen(true)} title="Karakter seç" style={{ background: 'none', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius-full)', padding: '6px 10px', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', transition: 'all .2s', fontFamily: 'var(--font-ui)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-soft)'}>
              🫀
            </button>
            <button onClick={signOut} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-ui)', padding: '4px 8px' }}>çıkış</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: tab==='dm' ? 1000 : 680, margin: '0 auto', padding: '24px 16px' }}>
        {tab === 'feed'    && <Feed onViewProfile={goToProfile} />}
        {tab === 'explore' && !viewingChar && <Explore onViewProfile={goToProfile} />}
        {tab === 'profile' && viewingChar  && <CharacterProfile char={viewingChar} onBack={backFromProfile} />}
        {tab === 'dm'      && <Messages />}
        {tab === 'admin'   && <AdminPanel />}
      </main>

      <nav style={{ display: window.innerWidth > 768 ? 'none' : 'flex', position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-card)', borderTop: '1.5px solid var(--border-soft)', padding: '8px 0', justifyContent: 'space-around', zIndex: 90 }}>
        {[...NAV, { id: 'char', icon: '🫀', label: 'Karakterim' }].map(n => (
          <button key={n.id} onClick={() => n.id==='char' ? setCharScreen(true) : setTab(n.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', color: (tab===n.id && n.id!=='char') ? 'var(--accent)' : 'var(--text-muted)', fontSize: 20, cursor: 'pointer', padding: '4px 12px', fontFamily: 'var(--font-ui)' }}>
            {n.icon}
            <span style={{ fontSize: 10, fontWeight: 600 }}>{n.label}</span>
          </button>
        ))}
      </nav>

      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
