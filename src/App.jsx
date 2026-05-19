import { useState, useEffect, useRef, useCallback } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import LoginPage from './pages/Login'
import { CharacterSwitcher, CharacterDropdown, CharacterProfile } from './components/Characters'
import { Feed } from './components/Feed'
import { AdminPanel } from './components/Admin'
import { NotificationBell } from './components/Notifications'
import { Avatar, Btn, Spinner, ToastContainer, Icon, EmojiPicker, toast } from './components/ui'
import { supabase } from './lib/supabase'
import './index.css'

// ── Dark Mode ────────────────────────────────────────────────────
const useDarkMode = () => {
  const [dark, setDark] = useState(()=>{ const s=localStorage.getItem('theme'); return s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches })
  useEffect(()=>{ document.documentElement.setAttribute('data-theme',dark?'dark':'light'); localStorage.setItem('theme',dark?'dark':'light') },[dark])
  return [dark,()=>setDark(d=>!d)]
}

// ── Arkadaşlık ───────────────────────────────────────────────────
const useFriends = (charId) => {
  const [friends,     setFriends]     = useState([])
  const [pending,     setPending]     = useState([])
  const [pendingSent, setPendingSent] = useState([])

  const load = useCallback(async () => {
    if (!charId) return
    try {
      const { data } = await supabase.from('friends')
        .select('*, requester:characters!character_id(id,name,display_name,avatar_url,player_id,tagline,players(username)), receiver:characters!friend_id(id,name,display_name,avatar_url,player_id,tagline,players(username))')
        .or(`character_id.eq.${charId},friend_id.eq.${charId}`)
      const acc=[], pend=[], sent=[]
      ;(data||[]).forEach(f=>{
        const other = f.character_id===charId ? f.receiver : f.requester
        if (!other) return
        if (f.status==='accepted') acc.push(other)
        else if (f.status==='pending' && f.friend_id===charId) pend.push({...other,requestId:f.id})
        else if (f.status==='pending' && f.character_id===charId) sent.push(other.id)
      })
      setFriends(acc); setPending(pend); setPendingSent(sent)
    } catch(e) { /* friends tablosu henüz yoksa sessizce geç */ }
  }, [charId])

  useEffect(()=>{ load() },[load])

  const sendRequest = async (targetId) => {
    try {
      await supabase.from('friends').insert({ character_id:charId, friend_id:targetId, status:'pending' })
      setPendingSent(p=>[...p,targetId])
      toast('Arkadaşlık isteği gönderildi 💌')
    } catch(e) { toast('Hata: '+e.message,'error') }
  }

  const acceptRequest = async (requestId) => {
    await supabase.from('friends').update({status:'accepted'}).eq('id',requestId)
    toast('Arkadaşlık kabul edildi! 🎉'); load()
  }

  const friendStatus = useCallback((cid) => {
    if (!cid || cid===charId) return 'self'
    if (friends.find(f=>f.id===cid)) return 'friend'
    if (pending.find(p=>p.id===cid)) return 'pending_received'
    if (pendingSent.includes(cid)) return 'pending_sent'
    return 'none'
  }, [friends, pending, pendingSent, charId])

  return { friends, pending, sendRequest, acceptRequest, friendStatus, reload:load }
}

// ── DM Input bileşeni ────────────────────────────────────────────
const DMInput = ({ onSend }) => {
  const [val, setVal] = useState('')
  const ref = useRef()
  const send = () => { if(!val.trim()) return; onSend(val.trim()); setVal('') }
  const insertEmoji = useCallback(e => {
    const el=ref.current; if(!el) return
    const s=el.selectionStart, en=el.selectionEnd
    const nv=val.slice(0,s)+e+val.slice(en); setVal(nv)
    requestAnimationFrame(()=>{ el.focus(); el.setSelectionRange(s+e.length,s+e.length) })
  },[val])
  return (
    <div style={{ padding:'8px 10px', borderTop:'1px solid var(--border)', display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
      <div style={{ flex:1, position:'relative' }}>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="Mesaj yaz..." style={{ height:36, paddingRight:40, fontSize:13 }} />
        <div style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)' }} onMouseDown={e=>e.preventDefault()}>
          <EmojiPicker onSelect={insertEmoji} />
        </div>
      </div>
      <button onClick={send} disabled={!val.trim()} style={{ background:'var(--accent)', border:'none', borderRadius:8, width:36, height:36, cursor:val.trim()?'pointer':'default', color:'#fff', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity:val.trim()?1:.4 }}>
        <Icon name="paper-plane" />
      </button>
    </div>
  )
}

// ── DM Popup ─────────────────────────────────────────────────────
const DMPopup = ({ target, onClose, activeChar }) => {
  const [messages,  setMessages]  = useState([])
  const [convoId,   setConvoId]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const bottomRef  = useRef()
  const channelRef = useRef()

  useEffect(()=>{
    if (!target||!activeChar) return
    initConvo()
    return ()=>{ if(channelRef.current) supabase.removeChannel(channelRef.current) }
  },[target?.id, activeChar?.id])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const initConvo = async () => {
    setLoading(true); setMessages([])
    const { data:m1 } = await supabase.from('conversation_members').select('conversation_id').eq('character_id',activeChar.id)
    const myIds=(m1||[]).map(x=>x.conversation_id)
    let found=null
    for (const cid of myIds) {
      const { data } = await supabase.from('conversation_members').select('character_id').eq('conversation_id',cid).eq('character_id',target.id)
      if (data?.length) { found=cid; break }
    }
    if (!found) {
      const { data:conv } = await supabase.from('conversations').insert({}).select().single()
      if (conv) {
        await supabase.from('conversation_members').insert([{conversation_id:conv.id,character_id:activeChar.id},{conversation_id:conv.id,character_id:target.id}])
        found=conv.id
      }
    }
    if (!found) { setLoading(false); return }
    setConvoId(found)
    const { data:msgs } = await supabase.from('messages').select('*').eq('conversation_id',found).order('created_at').limit(60)
    setMessages(msgs||[]); setLoading(false)
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const ch = supabase.channel(`dm-${found}-${Date.now()}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${found}`},p=>setMessages(prev=>[...prev,p.new]))
      .subscribe()
    channelRef.current=ch
  }

  const handleSend = async text => {
    if (!convoId) return
    await supabase.from('messages').insert({conversation_id:convoId,character_id:activeChar.id,content:text})
    await supabase.from('conversations').update({updated_at:new Date().toISOString()}).eq('id',convoId)
  }

  const tName = target.display_name||target.name
  return (
    <div style={{ position:'fixed', bottom:0, right:24, width:320, background:'var(--bg-card)', border:'1px solid var(--border)', borderBottom:'none', borderRadius:'14px 14px 0 0', boxShadow:'0 -4px 24px rgba(0,0,0,.3)', zIndex:600, display:'flex', flexDirection:'column', height:400, animation:'fadeIn .2s ease' }}>
      <div style={{ display:'flex', alignItems:'center', gap:9, padding:'11px 14px', borderBottom:'1px solid var(--border)', background:'var(--topbar-bg)', borderRadius:'14px 14px 0 0', flexShrink:0 }}>
        <Avatar name={tName} src={target.avatar_url} size={34} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#f0eaf8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tName}</div>
        </div>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,.1)', border:'none', cursor:'pointer', color:'#f0eaf8', fontSize:18, padding:'2px 8px', borderRadius:6, lineHeight:1 }}>×</button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', display:'flex', flexDirection:'column', gap:7 }}>
        {loading && <div style={{ textAlign:'center', padding:16 }}><Spinner size={20} /></div>}
        {!loading&&messages.length===0 && <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, marginTop:16 }}>İlk mesajı sen at!</p>}
        {messages.map(m=>{
          const isMine=m.character_id===activeChar?.id
          return (
            <div key={m.id} style={{ display:'flex', justifyContent:isMine?'flex-end':'flex-start' }}>
              <div style={{ maxWidth:'80%', background:isMine?'var(--accent)':'var(--bg)', border:isMine?'none':'1px solid var(--border)', borderRadius:isMine?'14px 14px 3px 14px':'14px 14px 14px 3px', padding:'8px 12px', fontSize:13, color:isMine?'#fff':'var(--text-primary)', lineHeight:1.5, wordBreak:'break-word' }}>
                {m.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <DMInput onSend={handleSend} />
    </div>
  )
}

// ── Sol Sidebar — tek sütun, Pulse Live dahil ─────────────────────
const LeftSidebar = ({ tab, setTab, onViewProfile, onCharScreen, pending, onAccept, sendRequest, friendStatus, onOpenDM, activeChar }) => {
  const { characters, profile, signOut } = useAuth()
  const [liveSearch, setLiveSearch]   = useState('')
  const [allChars, setAllChars]       = useState([])
  const [showOnlineOnly, setOnlineOnly] = useState(false)
  const [liveExpanded, setLiveExpanded] = useState(true)

  useEffect(()=>{
    supabase.from('characters').select('*, players(username)').eq('is_active',true).order('name')
      .then(({data})=>setAllChars(data||[]))
  },[])

  const NAV = [
    { id:'feed',    icon:'heart',          label:'Pulse Feed' },
    { id:'explore', icon:'satellite-dish', label:'Pulse Live' },
    ...(profile?.role==='admin'?[{id:'admin',icon:'gear',label:'Admin'}]:[]),
  ]

  const filteredLive = allChars
    .filter(c=>!liveSearch||(c.display_name||c.name).toLowerCase().includes(liveSearch.toLowerCase())||(c.tagline||'').toLowerCase().includes(liveSearch.toLowerCase()))
    .sort((a,b)=>(a.display_name||a.name).localeCompare(b.display_name||b.name))

  return (
    <aside style={{ width:'var(--left-w)', flexShrink:0, position:'sticky', top:'var(--topbar-h)', height:'calc(100vh - var(--topbar-h))', overflowY:'auto', background:'var(--sidebar-bg)', borderRight:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column', paddingBottom:16 }}>
      {/* Aktif karakter */}
      <div style={{ padding:'14px 12px 11px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:10 }} onClick={()=>activeChar&&onViewProfile(activeChar)}>
          <Avatar name={activeChar?.display_name||activeChar?.name} src={activeChar?.avatar_url} size={42} online />
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#f0eaf8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activeChar?.display_name||activeChar?.name||'—'}</div>
            {activeChar?.tagline && <div style={{ fontSize:11, color:'#7a6d8f', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activeChar?.tagline}</div>}
          </div>
        </div>
        <button onClick={onCharScreen} style={{ width:'100%', padding:'6px', background:'rgba(249,100,142,.12)', border:'1px solid rgba(249,100,142,.22)', borderRadius:8, color:'#f9648e', fontSize:11.5, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-ui)', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
          <Icon name="shuffle" style={{ color:'#f9648e', fontSize:12 }} /> Karakter Değiştir
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding:'8px 7px 4px' }}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 11px', borderRadius:8, border:'none', background:tab===n.id?'rgba(249,100,142,.14)':'transparent', color:tab===n.id?'#f9648e':'#a090b8', fontWeight:tab===n.id?700:500, fontSize:13, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'all .15s', marginBottom:1, textAlign:'left' }}
            onMouseEnter={e=>{ if(tab!==n.id) e.currentTarget.style.background='rgba(255,255,255,.05)' }}
            onMouseLeave={e=>{ if(tab!==n.id) e.currentTarget.style.background='transparent' }}>
            <Icon name={n.icon} style={{ fontSize:14, color:tab===n.id?'#f9648e':'#6050a0', width:16, textAlign:'center' }} />
            {n.label}
          </button>
        ))}
      </nav>

      {/* Arkadaşlık istekleri */}
      {pending?.length>0 && (
        <div style={{ margin:'0 7px 8px', padding:'8px 10px', background:'rgba(249,100,142,.08)', border:'1px solid rgba(249,100,142,.2)', borderRadius:10 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#f9648e', letterSpacing:.5, textTransform:'uppercase', marginBottom:7 }}>
            <Icon name="user-plus" style={{ marginRight:5, color:'#f9648e', fontSize:10 }} />Arkadaşlık İstekleri
          </div>
          {pending.map(p=>(
            <div key={p.requestId} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
              <Avatar name={p.display_name||p.name} src={p.avatar_url} size={28} />
              <span style={{ flex:1, fontSize:12, color:'#d0c0e8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.display_name||p.name}</span>
              <button onClick={()=>onAccept(p.requestId)} style={{ background:'#22c55e', border:'none', borderRadius:5, padding:'3px 8px', fontSize:11, cursor:'pointer', color:'#fff', fontWeight:700, fontFamily:'var(--font-ui)' }}>✓</button>
            </div>
          ))}
        </div>
      )}

      {/* Pulse Live bölümü */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', margin:'0 7px', paddingTop:8, flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 7px 8px', gap:6 }}>
          <span style={{ fontSize:10, fontWeight:700, color:'#4a3e62', letterSpacing:.6, textTransform:'uppercase' }}>Pulse Live</span>
          <button onClick={()=>setLiveExpanded(e=>!e)} style={{ background:'none', border:'none', cursor:'pointer', color:'#5a4e72', fontSize:11, padding:2 }}>
            <Icon name={liveExpanded?'chevron-up':'chevron-down'} />
          </button>
        </div>

        {liveExpanded && (
          <>
            {/* Arama */}
            <div style={{ position:'relative', marginBottom:8, padding:'0 7px' }}>
              <input value={liveSearch} onChange={e=>setLiveSearch(e.target.value)} placeholder="Karakter ara..." style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'var(--radius-full)', padding:'6px 12px 6px 30px', color:'#d0c0e8', fontSize:12, height:30 }} />
              <Icon name="magnifying-glass" style={{ position:'absolute', left:19, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.3)', fontSize:11 }} />
            </div>

            {/* Karakter listesi */}
            <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
              {filteredLive.map(c=>{
                const status = friendStatus(c.id)
                const isSelf = c.id===activeChar?.id
                return (
                  <div key={c.id}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, cursor:'pointer', transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.05)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{ flexShrink:0 }} onClick={()=>onViewProfile(c)}>
                      <Avatar name={c.display_name||c.name} src={c.avatar_url} size={32} online={isSelf} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }} onClick={()=>onViewProfile(c)}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#c0b4d8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.display_name||c.name}</div>
                      {c.tagline && <div style={{ fontSize:10, color:'#5a4e72', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.tagline}</div>}
                    </div>
                    {/* Aksiyonlar */}
                    {!isSelf && (
                      <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                        {status==='friend' && (
                          <button onClick={()=>onOpenDM(c)} title="Mesaj gönder" style={{ background:'rgba(249,100,142,.15)', border:'none', borderRadius:6, width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#f9648e', fontSize:12 }}>
                            <Icon name="message" />
                          </button>
                        )}
                        {status==='none' && (
                          <button onClick={()=>sendRequest(c.id)} title="Arkadaş ekle" style={{ background:'rgba(255,255,255,.08)', border:'none', borderRadius:6, width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#a090b8', fontSize:12 }}>
                            <Icon name="user-plus" />
                          </button>
                        )}
                        {status==='pending_sent' && (
                          <div title="İstek gönderildi" style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', color:'#6050a0', fontSize:12 }}>
                            <Icon name="clock" />
                          </div>
                        )}
                        {status==='friend' && (
                          <div title="Arkadaş" style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', color:'#22c55e', fontSize:12 }}>
                            <Icon name="check" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div style={{ padding:'8px 7px 0', borderTop:'1px solid rgba(255,255,255,.06)', marginTop:'auto', flexShrink:0 }}>
        <button onClick={signOut} style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'8px 11px', borderRadius:8, border:'none', background:'transparent', color:'#6050a0', fontSize:12, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'background .15s', textAlign:'left' }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.05)'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <Icon name="right-from-bracket" style={{ fontSize:13, color:'#6050a0' }} /> Çıkış Yap
        </button>
      </div>
    </aside>
  )
}

// ── Explore ───────────────────────────────────────────────────────
const Explore = ({ onViewProfile, sendRequest, friendStatus, activeChar }) => {
  const [chars, setChars]   = useState([])
  const [gridView, setGrid] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(()=>{
    supabase.from('characters').select('*, players(username)').eq('is_active',true).order('name').then(({data})=>setChars(data||[]))
  },[])

  const filtered = [...chars]
    .filter(c=>!search||(c.display_name||c.name).toLowerCase().includes(search.toLowerCase())||(c.tagline||'').toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>(a.display_name||a.name).localeCompare(b.display_name||b.name))

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--bg-card)', borderBottom:'1px solid var(--border)', flexWrap:'wrap', gap:10 }}>
        <h2 style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', margin:0, display:'flex', alignItems:'center', gap:7 }}><Icon name="satellite-dish" style={{ color:'var(--accent)' }} /> Pulse Live</h2>
        <div style={{ display:'flex', gap:7, alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Karakter ara..." style={{ height:32, fontSize:13, width:160 }} />
          <div style={{ display:'flex', gap:2, background:'var(--bg)', borderRadius:7, padding:2, border:'1px solid var(--border)' }}>
            <button onClick={()=>setGrid(true)}  style={{ padding:'4px 9px', borderRadius:5, border:'none', background:gridView?'var(--bg-card)':'transparent', cursor:'pointer', color:gridView?'var(--text-primary)':'var(--text-muted)' }}><Icon name="grid-2" /></button>
            <button onClick={()=>setGrid(false)} style={{ padding:'4px 9px', borderRadius:5, border:'none', background:!gridView?'var(--bg-card)':'transparent', cursor:'pointer', color:!gridView?'var(--text-primary)':'var(--text-muted)' }}><Icon name="bars" /></button>
          </div>
        </div>
      </div>
      {gridView ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:1, background:'var(--border)' }}>
          {filtered.map(c=>{
            const status = friendStatus(c.id)
            return (
              <div key={c.id} style={{ background:'var(--bg-card)', padding:'16px 10px', textAlign:'center', cursor:'pointer', transition:'background .15s', position:'relative' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--bg-card)'}>
                <div onClick={()=>onViewProfile(c)}>
                  <Avatar name={c.display_name||c.name} src={c.avatar_url} size={50} />
                  <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)', marginTop:8, lineHeight:1.3 }}>{c.display_name||c.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>@{c.players?.username}</div>
                  {c.tagline && <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:3, lineHeight:1.4 }}>{c.tagline}</div>}
                </div>
                {status==='none' && c.id!==activeChar?.id && (
                  <button onClick={e=>{ e.stopPropagation(); sendRequest(c.id) }} style={{ marginTop:8, background:'var(--accent-soft)', border:'none', borderRadius:'var(--radius-full)', padding:'4px 12px', fontSize:11, cursor:'pointer', color:'var(--accent-text)', fontFamily:'var(--font-ui)', fontWeight:600, width:'100%' }}>
                    <Icon name="user-plus" style={{marginRight:4}} />Ekle
                  </button>
                )}
                {status==='friend' && <div style={{ marginTop:6, fontSize:11, color:'#22c55e', fontWeight:600 }}>✓ Arkadaş</div>}
                {status==='pending_sent' && <div style={{ marginTop:6, fontSize:11, color:'var(--text-muted)', fontStyle:'italic' }}>İstek gönderildi</div>}
              </div>
            )
          })}
        </div>
      ) : (
        filtered.map(c=>{
          const status = friendStatus(c.id)
          return (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', background:'var(--bg-card)', borderBottom:'1px solid var(--border)', transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--bg-card)'}>
              <div style={{ cursor:'pointer' }} onClick={()=>onViewProfile(c)}><Avatar name={c.display_name||c.name} src={c.avatar_url} size={44} /></div>
              <div style={{ flex:1, cursor:'pointer' }} onClick={()=>onViewProfile(c)}>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)' }}>{c.display_name||c.name}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>@{c.players?.username}{c.tagline&&` · ${c.tagline}`}</div>
              </div>
              {status==='none' && c.id!==activeChar?.id && (
                <button onClick={()=>sendRequest(c.id)} style={{ background:'var(--accent-soft)', border:'none', borderRadius:'var(--radius-full)', padding:'5px 12px', fontSize:11.5, cursor:'pointer', color:'var(--accent-text)', fontFamily:'var(--font-ui)', fontWeight:600, flexShrink:0 }}>
                  <Icon name="user-plus" style={{marginRight:4}} />Ekle
                </button>
              )}
              {status==='friend' && <span style={{ fontSize:11, color:'#22c55e', fontWeight:600, flexShrink:0 }}>✓ Arkadaş</span>}
            </div>
          )
        })
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

  const { friends, pending, sendRequest, acceptRequest, friendStatus } = useFriends(activeChar?.id)

  const goToProfile = char => { if(!char?.id) return; setViewingChar(char); setTab('profile') }
  const backFromProfile = () => { setViewingChar(null); setTab(prev=>prev==='profile'?'explore':prev) }

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ textAlign:'center' }}><Spinner size={36} /><p style={{ color:'var(--text-muted)', marginTop:16, fontSize:14 }}>Yükleniyor...</p></div></div>
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
      <header style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'var(--topbar-h)', background:'var(--topbar-bg)', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', padding:'0 18px', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span className="pulse-logo" style={{ fontSize:22 }}>💗</span>
          <span style={{ fontSize:16, fontWeight:800, color:'#f0eaf8', letterSpacing:-.5 }}>Pulse</span>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <NotificationBell />
          <button onClick={toggleDark} style={{ background:'rgba(255,255,255,.08)', border:'none', borderRadius:'var(--radius-full)', padding:'6px 10px', cursor:'pointer', fontSize:13 }}>{dark?'☀️':'🌙'}</button>
          <CharacterDropdown onViewProfile={goToProfile} />
        </div>
      </header>

      {/* 2 SÜTUN (sol sidebar geniş + main) */}
      <div style={{ display:'flex', paddingTop:'var(--topbar-h)' }}>
        <LeftSidebar
          tab={tab}
          setTab={t=>{ setTab(t); setViewingChar(null) }}
          onViewProfile={goToProfile}
          onCharScreen={()=>setCharScreen(true)}
          pending={pending}
          onAccept={acceptRequest}
          sendRequest={sendRequest}
          friendStatus={friendStatus}
          onOpenDM={setDmTarget}
          activeChar={activeChar}
        />

        <main style={{ flex:1, minWidth:0 }}>
          {tab==='feed' && !viewingChar && <Feed onViewProfile={goToProfile} />}
          {tab==='explore' && !viewingChar && <Explore onViewProfile={goToProfile} sendRequest={sendRequest} friendStatus={friendStatus} activeChar={activeChar} />}
          {(tab==='profile'||viewingChar) && viewingChar && <CharacterProfile char={viewingChar} onBack={backFromProfile} onViewProfile={goToProfile} friendStatus={friendStatus} onSendFriend={sendRequest} />}
          {tab==='admin' && !viewingChar && <AdminPanel />}
        </main>
      </div>

      {dmTarget && <DMPopup target={dmTarget} onClose={()=>setDmTarget(null)} activeChar={activeChar} />}

      {/* Mobil */}
      <nav style={{ display:'none', position:'fixed', bottom:0, left:0, right:0, background:'var(--topbar-bg)', borderTop:'1px solid rgba(255,255,255,.07)', padding:'6px 0', justifyContent:'space-around', zIndex:90 }}>
        {[{id:'feed',icon:'heart',label:'Feed'},{id:'explore',icon:'satellite-dish',label:'Live'},{id:'char',icon:'shuffle',label:'Karakter'},...(profile?.role==='admin'?[{id:'admin',icon:'gear',label:'Admin'}]:[])].map(n=>(
          <button key={n.id} onClick={()=>n.id==='char'?setCharScreen(true):setTab(n.id)}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'none', border:'none', color:tab===n.id&&n.id!=='char'?'#f9648e':'#7060a0', cursor:'pointer', padding:'4px 14px', fontFamily:'var(--font-ui)' }}>
            <Icon name={n.icon} style={{ fontSize:18, color:'inherit' }} />
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
