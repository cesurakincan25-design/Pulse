import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import LoginPage from './pages/Login'
import { CharacterSwitcher, CharacterDropdown, CharacterProfile } from './components/Characters'
import { Feed } from './components/Feed'
import { AdminPanel } from './components/Admin'
import { NotificationBell } from './components/Notifications'
import { Avatar, Btn, Spinner, ToastContainer, Icon, timeAgo } from './components/ui'
import { supabase } from './lib/supabase'
import './index.css'

// ── Dark Mode ─────────────────────────────────────────────────────
const useDarkMode = () => {
  const [dark, setDark] = useState(() => {
    const s = localStorage.getItem('theme')
    return s ? s==='dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark?'dark':'light')
    localStorage.setItem('theme', dark?'dark':'light')
  }, [dark])
  return [dark, ()=>setDark(d=>!d)]
}

// ── Sol Sidebar ───────────────────────────────────────────────────
const LeftSidebar = ({ tab, setTab, onViewProfile, onCharScreen }) => {
  const { activeChar, characters, profile, signOut } = useAuth()
  const NAV = [
    { id:'feed',    icon:'heart',         label:'Pulse Feed' },
    { id:'explore', icon:'satellite-dish', label:'Pulse Live' },
    ...(profile?.role==='admin' ? [{id:'admin', icon:'gear', label:'Admin'}] : []),
  ]

  return (
    <aside style={{ width:'var(--left-w)', flexShrink:0, position:'sticky', top:'var(--topbar-h)', height:'calc(100vh - var(--topbar-h))', overflowY:'auto', background:'var(--sidebar-bg)', borderRight:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column', paddingBottom:16 }}>
      {/* Aktif karakter özeti */}
      <div style={{ padding:'16px 14px 12px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={()=>activeChar&&onViewProfile(activeChar)}>
          <Avatar name={activeChar?.display_name||activeChar?.name} src={activeChar?.avatar_url} size={42} ring />
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#f0eaf8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activeChar?.display_name||activeChar?.name||'—'}</div>
            {activeChar?.tagline && <div style={{ fontSize:11, color:'#7a6d8f', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activeChar?.tagline}</div>}
          </div>
        </div>
        <button onClick={onCharScreen} style={{ marginTop:10, width:'100%', padding:'7px', background:'rgba(249,100,142,.12)', border:'1px solid rgba(249,100,142,.25)', borderRadius:8, color:'#f9648e', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-ui)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <Icon name="shuffle" style={{ color:'#f9648e' }} /> Karakter Değiştir
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding:'10px 8px' }}>
        {NAV.map(n => (
          <button key={n.id} onClick={()=>setTab(n.id)}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:9, border:'none', background:tab===n.id?'rgba(249,100,142,.15)':'transparent', color:tab===n.id?'#f9648e':'#a090b8', fontWeight:tab===n.id?700:500, fontSize:13, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'all .15s', marginBottom:2, textAlign:'left' }}
            onMouseEnter={e=>{ if(tab!==n.id) e.currentTarget.style.background='rgba(255,255,255,.06)' }}
            onMouseLeave={e=>{ if(tab!==n.id) e.currentTarget.style.background='transparent' }}>
            <Icon name={n.icon} style={{ fontSize:15, color:tab===n.id?'#f9648e':'#7060a0', width:18, textAlign:'center' }} />
            {n.label}
          </button>
        ))}
      </nav>

      <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', margin:'4px 8px', paddingTop:10 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#5a4e6e', letterSpacing:.7, textTransform:'uppercase', padding:'0 8px 8px' }}>Hesaplarım</div>
        {characters.map(c => (
          <div key={c.id} onClick={()=>onViewProfile(c)}
            style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:9, cursor:'pointer', transition:'background .15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <Avatar name={c.display_name||c.name} src={c.avatar_url} size={32} ring={activeChar?.id===c.id} />
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#d0c4e8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.display_name||c.name}</div>
              {c.tagline && <div style={{ fontSize:10, color:'#6a5e7e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.tagline}</div>}
            </div>
            {activeChar?.id===c.id && <div style={{ width:7, height:7, borderRadius:'50%', background:'#f9648e', flexShrink:0 }} />}
          </div>
        ))}
      </div>

      <div style={{ marginTop:'auto', padding:'8px 8px 0', borderTop:'1px solid rgba(255,255,255,.07)' }}>
        <button onClick={signOut} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, border:'none', background:'transparent', color:'#7060a0', fontSize:12, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'background .15s', textAlign:'left' }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <Icon name="right-from-bracket" style={{ fontSize:14, color:'#7060a0' }} /> Çıkış Yap
        </button>
      </div>
    </aside>
  )
}

// ── Sağ Sidebar ───────────────────────────────────────────────────
const RightSidebar = ({ onViewProfile, onOpenDM }) => {
  const [chars, setChars]   = useState([])
  const [notifs, setNotifs] = useState([])
  const { activeChar }      = useAuth()

  useEffect(() => {
    supabase.from('characters').select('*, players(username)').order('name').limit(20).then(({data})=>setChars(data||[]))
    if (activeChar?.id) {
      supabase.from('notifications').select('*, actor_character:characters!actor_character_id(name,display_name,avatar_url)').eq('target_character_id',activeChar.id).eq('is_read',false).order('created_at',{ascending:false}).limit(5).then(({data})=>setNotifs(data||[]))
    }
  }, [activeChar?.id])

  const NOTIF_TEXT = { like:'gönderini beğendi', comment:'yorum yaptı', follow:'seni takip etti', mention:'senden bahsetti' }

  return (
    <aside style={{ width:'var(--right-w)', flexShrink:0, position:'sticky', top:'var(--topbar-h)', height:'calc(100vh - var(--topbar-h))', overflowY:'auto', borderLeft:'var(--divider)', paddingBottom:16 }}>
      {/* Bildirimler */}
      {notifs.length>0 && (
        <div style={{ padding:'14px 14px 10px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:.7, textTransform:'uppercase', marginBottom:8 }}>Yeni Bildirimler</div>
          {notifs.map(n => (
            <div key={n.id} style={{ display:'flex', gap:8, alignItems:'center', padding:'6px 0', borderBottom:'var(--divider)' }}>
              <Avatar name={n.actor_character?.display_name||n.actor_character?.name||'?'} src={n.actor_character?.avatar_url} size={28} />
              <p style={{ fontSize:12, color:'var(--text-secondary)', margin:0, flex:1, lineHeight:1.4 }}>
                <strong style={{ color:'var(--text-primary)' }}>{n.actor_character?.display_name||n.actor_character?.name}</strong> {NOTIF_TEXT[n.type]||'bildirim'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Karakterler */}
      <div style={{ padding:'14px 14px 0' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:.7, textTransform:'uppercase', marginBottom:10 }}>Pulse Live</div>
        {chars.map(c => (
          <div key={c.id} onClick={()=>onViewProfile(c)}
            style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 0', borderBottom:'var(--divider)', cursor:'pointer' }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <Avatar name={c.display_name||c.name} src={c.avatar_url} size={36} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.display_name||c.name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>@{c.players?.username}</div>
            </div>
            <button onClick={e=>{ e.stopPropagation(); onOpenDM(c) }} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius-full)', padding:'4px 10px', fontSize:11, cursor:'pointer', color:'var(--text-muted)', fontFamily:'var(--font-ui)', flexShrink:0 }}>DM</button>
          </div>
        ))}
      </div>
    </aside>
  )
}

// ── FB Tarzı DM Popup ─────────────────────────────────────────────
const DMPopup = ({ target, onClose, activeChar, player }) => {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [convoId, setConvoId]   = useState(null)
  const bottomRef = useRef()

  useEffect(() => {
    if (!target||!activeChar) return
    initConvo()
  }, [target?.id, activeChar?.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])

  const initConvo = async () => {
    // Mevcut konuşmayı bul
    const { data: members } = await supabase.from('conversation_members').select('conversation_id').eq('character_id',activeChar.id)
    const myConvoIds = (members||[]).map(m=>m.conversation_id)
    let found = null
    for (const cid of myConvoIds) {
      const { data } = await supabase.from('conversation_members').select('character_id').eq('conversation_id',cid).eq('character_id',target.id)
      if (data?.length) { found=cid; break }
    }
    if (!found) {
      const { data:c } = await supabase.from('conversations').insert({}).select().single()
      await supabase.from('conversation_members').insert([{conversation_id:c.id,character_id:activeChar.id},{conversation_id:c.id,character_id:target.id}])
      found = c.id
    }
    setConvoId(found)
    const { data:msgs } = await supabase.from('messages').select('*, characters(name,display_name,avatar_url)').eq('conversation_id',found).order('created_at').limit(50)
    setMessages(msgs||[])

    // Realtime
    const ch = supabase.channel(`dm-${found}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${found}`},p=>setMessages(prev=>[...prev,p.new])).subscribe()
    return ()=>supabase.removeChannel(ch)
  }

  const send = async () => {
    if (!input.trim()||!convoId) return
    const text=input.trim(); setInput('')
    await supabase.from('messages').insert({ conversation_id:convoId, character_id:activeChar.id, content:text })
    await supabase.from('conversations').update({updated_at:new Date().toISOString()}).eq('id',convoId)
  }

  return (
    <div style={{ position:'fixed', bottom:0, right:320, width:300, background:'var(--bg-card)', border:'1px solid var(--border)', borderBottom:'none', borderRadius:'12px 12px 0 0', boxShadow:'var(--shadow-md)', zIndex:200, display:'flex', flexDirection:'column', maxHeight:380, animation:'fadeIn .2s ease' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 12px', borderBottom:'var(--divider)', cursor:'pointer' }}>
        <Avatar name={target.display_name||target.name} src={target.avatar_url} size={32} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{target.display_name||target.name}</div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16, padding:4, lineHeight:1 }}>×</button>
      </div>
      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>
        {messages.map(m => {
          const isMine = m.character_id===activeChar?.id
          return (
            <div key={m.id} style={{ display:'flex', justifyContent:isMine?'flex-end':'flex-start' }}>
              <div style={{ maxWidth:'75%', background:isMine?'var(--accent)':'var(--bg)', border:isMine?'none':'1px solid var(--border)', borderRadius:isMine?'14px 14px 3px 14px':'14px 14px 14px 3px', padding:'7px 11px', fontSize:13, color:isMine?'#fff':'var(--text-primary)', lineHeight:1.5 }}>
                {m.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      {/* Input */}
      <div style={{ padding:'8px 10px', borderTop:'var(--divider)', display:'flex', gap:7 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="Mesaj yaz..." style={{ flex:1, height:34, fontSize:13 }} />
        <Btn size="sm" onClick={send} disabled={!input.trim()}>↗</Btn>
      </div>
    </div>
  )
}

// ── Explore ───────────────────────────────────────────────────────
const Explore = ({ onViewProfile }) => {
  const [chars, setChars]   = useState([])
  const [gridView, setGrid] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('characters').select('*, players(username)').order('name').then(({data})=>setChars(data||[]))
  }, [])

  const filtered = chars.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())||(c.display_name||'').toLowerCase().includes(search.toLowerCase())||(c.tagline||'').toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, gap:10, flexWrap:'wrap', padding:'14px 16px', background:'var(--bg-card)', borderBottom:'var(--divider)' }}>
        <h2 style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', margin:0, display:'flex', alignItems:'center', gap:8 }}><Icon name="satellite-dish" style={{ color:'var(--accent)' }} /> Pulse Live</h2>
        <div style={{ display:'flex', gap:7, alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Karakter ara..." style={{ height:32, fontSize:13, width:170 }} />
          <div style={{ display:'flex', gap:2, background:'var(--bg)', borderRadius:7, padding:2, border:'1px solid var(--border)' }}>
            <button onClick={()=>setGrid(true)}  style={{ padding:'4px 9px', borderRadius:6, border:'none', background:gridView?'var(--bg-card)':'transparent', cursor:'pointer', color:gridView?'var(--text-primary)':'var(--text-muted)' }}><Icon name="grid-2" /></button>
            <button onClick={()=>setGrid(false)} style={{ padding:'4px 9px', borderRadius:6, border:'none', background:!gridView?'var(--bg-card)':'transparent', cursor:'pointer', color:!gridView?'var(--text-primary)':'var(--text-muted)' }}><Icon name="bars" /></button>
          </div>
        </div>
      </div>

      {gridView ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))', gap:1, background:'var(--border)' }}>
          {filtered.map(c => (
            <div key={c.id} onClick={()=>onViewProfile(c)} style={{ background:'var(--bg-card)', padding:'16px 12px', textAlign:'center', cursor:'pointer', transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--bg-card)'}>
              <Avatar name={c.display_name||c.name} src={c.avatar_url} size={52} />
              <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)', marginTop:9, lineHeight:1.3 }}>{c.display_name||c.name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>@{c.players?.username}</div>
              {c.tagline && <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:4, lineHeight:1.4 }}>{c.tagline}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div>
          {filtered.map(c => (
            <div key={c.id} onClick={()=>onViewProfile(c)} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'var(--bg-card)', borderBottom:'var(--divider)', cursor:'pointer', transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--bg-card)'}>
              <Avatar name={c.display_name||c.name} src={c.avatar_url} size={44} />
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{c.display_name||c.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>@{c.players?.username}{c.tagline&&` · ${c.tagline}`}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────
const Shell = () => {
  const { player, profile, activeChar, characters, loading, signOut } = useAuth()
  const [dark, toggleDark]      = useDarkMode()
  const [tab, setTab]           = useState('feed')
  const [charScreen, setCharScreen] = useState(false)
  const [viewingChar, setViewingChar] = useState(null)
  const [dmTarget, setDmTarget] = useState(null)

  const goToProfile = char => { if (!char?.id) return; setViewingChar(char); setTab('profile') }
  const backFromProfile = () => { setViewingChar(null); setTab('explore') }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}><Spinner size={36} /><p style={{ color:'var(--text-muted)', marginTop:16, fontSize:14 }}>Yükleniyor...</p></div>
    </div>
  )
  if (!player) return <LoginPage />
  if (!profile?.is_approved) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:40, maxWidth:380, textAlign:'center', boxShadow:'var(--shadow-md)' }}>
        <div style={{ fontSize:44, marginBottom:14 }}>💗</div>
        <h2 style={{ fontSize:19, fontWeight:800, color:'var(--text-primary)', marginBottom:8 }}>Pulse'a Hoş Geldin!</h2>
        <p style={{ color:'var(--text-secondary)', fontSize:14, lineHeight:1.6 }}>Hesabın admin tarafından inceleniyor.</p>
        <Btn variant="ghost" onClick={signOut} style={{ marginTop:18 }}>Çıkış Yap</Btn>
      </div>
    </div>
  )
  if (charScreen||characters.length===0) return (
    <>
      <div style={{ position:'fixed', top:14, right:14, zIndex:100, display:'flex', gap:7 }}>
        <button onClick={toggleDark} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-full)', padding:'7px 11px', cursor:'pointer', fontSize:13 }}>{dark?'☀️':'🌙'}</button>
      </div>
      <CharacterSwitcher onSelect={()=>setCharScreen(false)} />
    </>
  )

  return (
    <div style={{ minHeight:'100vh' }}>
      {/* TOP BAR */}
      <header style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'var(--topbar-h)', background:'var(--topbar-bg)', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', padding:'0 16px', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:20 }}>💗</span>
          <span style={{ fontSize:16, fontWeight:800, color:'#f0eaf8', letterSpacing:-.5 }}>Pulse</span>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <NotificationBell />
          <button onClick={toggleDark} style={{ background:'rgba(255,255,255,.08)', border:'none', borderRadius:'var(--radius-full)', padding:'6px 10px', cursor:'pointer', fontSize:13 }}>{dark?'☀️':'🌙'}</button>
          <CharacterDropdown onViewProfile={goToProfile} />
        </div>
      </header>

      {/* BODY */}
      <div style={{ display:'flex', paddingTop:'var(--topbar-h)' }}>
        <LeftSidebar tab={tab} setTab={t=>{ setTab(t); setViewingChar(null) }} onViewProfile={goToProfile} onCharScreen={()=>setCharScreen(true)} />

        {/* MAIN */}
        <main style={{ flex:1, minWidth:0, borderRight:'var(--divider)' }}>
          {tab==='feed' && !viewingChar && <Feed onViewProfile={goToProfile} />}
          {tab==='explore' && !viewingChar && <Explore onViewProfile={goToProfile} />}
          {(tab==='profile'||(viewingChar&&tab!=='admin')) && viewingChar && <CharacterProfile char={viewingChar} onBack={backFromProfile} onViewProfile={goToProfile} />}
          {tab==='admin' && !viewingChar && <AdminPanel />}
        </main>

        <RightSidebar onViewProfile={goToProfile} onOpenDM={setDmTarget} />
      </div>

      {/* FB DM Popup */}
      {dmTarget && <DMPopup target={dmTarget} onClose={()=>setDmTarget(null)} activeChar={activeChar} player={player} />}

      {/* Mobil alt nav */}
      <nav style={{ display:'none', position:'fixed', bottom:0, left:0, right:0, background:'var(--topbar-bg)', borderTop:'1px solid rgba(255,255,255,.07)', padding:'6px 0', justifyContent:'space-around', zIndex:90 }}>
        {[{id:'feed',icon:'heart',label:'Feed'},{id:'explore',icon:'satellite-dish',label:'Live'},{id:'char',icon:'shuffle',label:'Karakter'},...(profile?.role==='admin'?[{id:'admin',icon:'gear',label:'Admin'}]:[])].map(n=>(
          <button key={n.id} onClick={()=>n.id==='char'?setCharScreen(true):setTab(n.id)}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'none', border:'none', color:tab===n.id&&n.id!=='char'?'#f9648e':'#7060a0', cursor:'pointer', padding:'4px 14px', fontFamily:'var(--font-ui)' }}>
            <Icon name={n.icon} style={{ fontSize:19, color:'inherit' }} />
            <span style={{ fontSize:10, fontWeight:600 }}>{n.label}</span>
          </button>
        ))}
      </nav>
      <style>{`@media(max-width:768px){nav[style*="position:fixed"]{display:flex!important}}`}</style>

      <ToastContainer />
    </div>
  )
}

export default function App() { return <AuthProvider><Shell /></AuthProvider> }
