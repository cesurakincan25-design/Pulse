import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar, Btn, Spinner, timeAgo } from './ui'

export const Messages = () => {
  const { player, activeChar } = useAuth()
  const [conversations, setConvos] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [searchQuery, setSearch]    = useState('')
  const [allChars, setAllChars]     = useState([])
  const bottomRef = useRef()

  // Konuşmaları yükle
  useEffect(() => {
    loadConversations()
    // Tüm karakterleri yükle (yeni konuşma başlatmak için)
    supabase.from('characters').select('*, players(username)').order('name').then(({ data }) => setAllChars(data || []))
  }, [])

  const loadConversations = async () => {
    const { data } = await supabase.from('conversation_members')
      .select('conversation_id, conversations(id, updated_at), characters(id, name, avatar_url, players(username))')
      .eq('character_id', activeChar?.id)
      .order('conversations(updated_at)', { ascending: false })
    setConvos(data || [])
    setLoading(false)
  }

  // Mesajları yükle + realtime
  useEffect(() => {
    if (!activeConvo) return
    loadMessages(activeConvo)

    const channel = supabase.channel(`convo-${activeConvo}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvo}` },
        (payload) => setMessages(p => [...p, payload.new]))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [activeConvo])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async (convoId) => {
    const { data } = await supabase.from('messages')
      .select('*, characters(name, avatar_url)')
      .eq('conversation_id', convoId)
      .order('created_at')
    setMessages(data || [])
    // Okundu işaretle
    await supabase.from('messages').update({ is_read: true })
      .eq('conversation_id', convoId).neq('character_id', activeChar?.id)
  }

  const sendMessage = async () => {
    if (!input.trim() || !activeConvo) return
    const text = input.trim()
    setInput('')
    await supabase.from('messages').insert({
      conversation_id: activeConvo,
      character_id: activeChar?.id,
      content: text,
    })
    // updated_at güncelle
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvo)
  }

  const startConvo = async (targetCharId) => {
    // Zaten var mı?
    const existing = conversations.find(c =>
      c.characters?.id === targetCharId
    )
    if (existing) { setActiveConvo(existing.conversation_id); return }

    const { data: convo } = await supabase.from('conversations').insert({}).select().single()
    await supabase.from('conversation_members').insert([
      { conversation_id: convo.id, character_id: activeChar?.id },
      { conversation_id: convo.id, character_id: targetCharId },
    ])
    await loadConversations()
    setActiveConvo(convo.id)
  }

  const filtered = allChars.filter(c => c.id !== activeChar?.id &&
    c.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile() ? '1fr' : '280px 1fr', height: 'calc(100vh - 80px)', gap: 0, background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1.5px solid var(--border-soft)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>

      {/* Sol: Konuşma listesi */}
      {(!activeConvo || !isMobile()) && (
        <div style={{ borderRight: '1.5px solid var(--border-soft)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: '1.5px solid var(--border-soft)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10, color: 'var(--text-primary)' }}>💗 Pulse Messages</h2>
            <input value={searchQuery} onChange={e=>setSearch(e.target.value)} placeholder="Karakter ara..." style={{ fontSize: 13, height: 34 }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Arama sonuçları */}
            {searchQuery && (
              <div style={{ borderBottom: '1.5px solid var(--border-soft)' }}>
                <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Yeni Mesaj</div>
                {filtered.slice(0,5).map(c => (
                  <ConvoRow key={c.id} name={c.name} avatar={c.avatar_url} sub={`@${c.players?.username}`}
                    active={false} onClick={() => { startConvo(c.id); setSearch('') }} />
                ))}
              </div>
            )}

            {loading && <div style={{ padding: 24, textAlign: 'center' }}><Spinner size={20} /></div>}
            {!searchQuery && conversations.map(c => (
              <ConvoRow key={c.conversation_id}
                name={c.characters?.name || '?'}
                avatar={c.characters?.avatar_url}
                sub={`@${c.characters?.players?.username}`}
                active={activeConvo === c.conversation_id}
                onClick={() => setActiveConvo(c.conversation_id)} />
            ))}
            {!loading && !searchQuery && conversations.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <p>Henüz Pulse mesajın yok.</p>
                <p style={{ marginTop: 6 }}>Yukarıdan karakter arayarak başla!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sağ: Mesaj alanı */}
      {activeConvo ? (
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          {(() => {
            const convo = conversations.find(c => c.conversation_id === activeConvo)
            return (
              <div style={{ padding: '12px 16px', borderBottom: '1.5px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
                {isMobile() && <button onClick={() => setActiveConvo(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 16, padding: 4 }}>←</button>}
                <Avatar name={convo?.characters?.name || '?'} src={convo?.characters?.avatar_url} size={36} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{convo?.characters?.name || '?'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{convo?.characters?.players?.username}</div>
                </div>
              </div>
            )
          })()}

          {/* Mesajlar */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map(msg => {
              const isMine = msg.character_id === activeChar?.id
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                  {!isMine && <Avatar name={msg.characters?.name} src={msg.characters?.avatar_url} size={28} />}
                  <div style={{ maxWidth: '70%', background: isMine ? 'var(--accent)' : 'var(--bg)', border: isMine ? 'none' : '1.5px solid var(--border-soft)', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', boxShadow: 'var(--shadow-sm)' }}>
                    <p style={{ fontSize: 13, lineHeight: 1.5, color: isMine ? '#fff' : 'var(--text-primary)', margin: 0 }}>{msg.content}</p>
                    <div style={{ fontSize: 10, color: isMine ? 'rgba(255,255,255,.65)' : 'var(--text-muted)', marginTop: 4, textAlign: isMine ? 'right' : 'left' }}>{timeAgo(msg.created_at)}</div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1.5px solid var(--border-soft)', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()} placeholder="Mesaj yaz..." style={{ flex: 1, height: 40 }} />
            <Btn onClick={sendMessage} disabled={!input.trim()} style={{ height: 40, padding: '0 16px' }}>↗</Btn>
          </div>
        </div>
      ) : !isMobile() && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 40 }}>💗</span>
          <p style={{ fontSize: 14 }}>Bir Pulse Messages konuşması seç</p>
        </div>
      )}
    </div>
  )
}

const ConvoRow = ({ name, avatar, sub, active, onClick }) => (
  <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', background: active ? 'var(--accent-soft)' : 'transparent', borderLeft: `3px solid ${active ? 'var(--accent)' : 'transparent'}`, transition: 'background .15s' }}
    onMouseEnter={e => { if(!active) e.currentTarget.style.background='var(--bg-hover)' }}
    onMouseLeave={e => { if(!active) e.currentTarget.style.background='transparent' }}>
    <Avatar name={name} src={avatar} size={38} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  </div>
)

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768
