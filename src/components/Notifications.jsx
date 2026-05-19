import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar, timeAgo } from './ui'

export const NotificationBell = () => {
  const { activeChar } = useAuth()
  const [notifs, setNotifs]   = useState([])
  const [open, setOpen]       = useState(false)
  const unread = notifs.filter(n => !n.is_read).length

  useEffect(() => {
    if (!activeChar) return
    loadNotifs()

    const channel = supabase.channel(`notifs-${activeChar.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `target_character_id=eq.${activeChar.id}` },
        (payload) => setNotifs(p => [payload.new, ...p]))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [activeChar?.id])

  const loadNotifs = async () => {
    const { data } = await supabase.from('notifications')
      .select('*, actor_character:characters!actor_character_id(name, avatar_url)')
      .eq('target_character_id', activeChar.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data || [])
  }

  const markRead = async () => {
    if (!unread) return
    await supabase.from('notifications').update({ is_read: true })
      .eq('target_character_id', activeChar.id).eq('is_read', false)
    setNotifs(p => p.map(n => ({ ...n, is_read: true })))
  }

  const notifText = (n) => {
    switch(n.type) {
      case 'like':    return 'gönderini beğendi'
      case 'comment': return 'gönderine yorum yaptı'
      case 'follow':  return 'seni takip etmeye başladı'
      case 'mention': return 'senden bahsetti'
      default:        return 'bildirim gönderdi'
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(o => !o); if (!open) markRead() }}
        style={{ position: 'relative', background: 'none', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius-full)', padding: '6px 12px', cursor: 'pointer', fontSize: 16, transition: 'border-color .2s', color: 'var(--text-primary)' }}
        onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-soft)'}>
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--accent)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, maxHeight: 420, overflowY: 'auto', background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', zIndex: 50, animation: 'fadeDown .15s ease' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1.5px solid var(--border-soft)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              💗 Pulse Bildirimleri
            </div>
            {notifs.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Henüz bildirim yok</div>
            )}
            {notifs.map(n => (
              <div key={n.id} style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border-soft)', background: n.is_read ? 'transparent' : 'var(--accent-soft)', cursor: 'pointer', transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background=n.is_read ? 'transparent' : 'var(--accent-soft)'}>
                <Avatar name={n.actor_character?.name || '?'} src={n.actor_character?.avatar_url} size={36} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{n.actor_character?.name}</strong> {notifText(n)}
                  </p>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(n.created_at)}</span>
                </div>
                {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
              </div>
            ))}
          </div>
        </>
      )}
      <style>{`@keyframes fadeDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}
