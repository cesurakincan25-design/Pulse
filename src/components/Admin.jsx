import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar, Btn, Card, Badge, Modal, Spinner, toast } from './ui'

export const AdminPanel = () => {
  const { profile } = useAuth()
  const [tab, setTab]       = useState('members')
  const [players, setPlayers] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [newInviteModal, setNewInviteModal] = useState(false)
  const [inviteNote, setInviteNote] = useState('')

  if (profile?.role !== 'admin') return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <p>Bu sayfaya erişim yetkin yok.</p>
    </div>
  )

  useEffect(() => {
    load()
  }, [tab])

  const load = async () => {
    setLoading(true)
    if (tab === 'members') {
      const { data } = await supabase.from('players').select('*, characters(id)').order('created_at', { ascending: false })
      setPlayers(data || [])
    } else {
      const { data } = await supabase.from('invites').select('*, players!created_by(username), players!used_by(username)').order('created_at', { ascending: false })
      setInvites(data || [])
    }
    setLoading(false)
  }

  const approvePlayer = async (id, approve) => {
    await supabase.from('players').update({ is_approved: approve }).eq('id', id)
    toast(approve ? 'Üye onaylandı ✅' : 'Üye askıya alındı')
    load()
  }

  const changeRole = async (id, role) => {
    await supabase.from('players').update({ role }).eq('id', id)
    toast('Rol güncellendi')
    load()
  }

  const deletePlayer = async (id) => {
    if (!confirm('Bu oyuncuyu ve tüm karakterlerini sil?')) return
    await supabase.from('players').delete().eq('id', id)
    toast('Oyuncu silindi')
    load()
  }

  const createInvite = async () => {
    const { data: me } = await supabase.from('players').select('id').eq('id', (await supabase.auth.getUser()).data.user?.id).single()
    const { data, error } = await supabase.from('invites').insert({ created_by: me?.id, note: inviteNote }).select().single()
    if (error) { toast('Hata: ' + error.message, 'error'); return }
    toast(`Davetiye oluşturuldu: ${data.code}`)
    setInviteNote('')
    setNewInviteModal(false)
    load()
  }

  const deleteInvite = async (id) => {
    await supabase.from('invites').delete().eq('id', id)
    toast('Davetiye silindi')
    load()
  }

  const copyInviteLink = (code) => {
    navigator.clipboard.writeText(`${window.location.origin}?invite=${code}`)
    toast('Davetiye linki kopyalandı!')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>⚙️ Pulse Admin</h1>
        {tab === 'invites' && <Btn onClick={() => setNewInviteModal(true)}>✉️ Davetiye Oluştur</Btn>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius-full)', padding: 4, width: 'fit-content' }}>
        {[['members','👥 Üyeler'], ['invites','🎟️ Davetiyeler'], ['chars','💗 Karakterler']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ padding: '8px 18px', borderRadius: 'var(--radius-full)', border: 'none', background: tab===v ? 'var(--bg-card)' : 'transparent', color: tab===v ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: tab===v ? 700 : 500, fontSize: 13, cursor: 'pointer', boxShadow: tab===v ? 'var(--shadow-sm)' : 'none', transition: 'all .2s', fontFamily: 'var(--font-ui)' }}>
            {l}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 32 }}><Spinner /></div>}

      {/* ÜYELER */}
      {!loading && tab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {players.map(p => (
            <Card key={p.id} style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Avatar name={p.display_name} src={p.avatar_url} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{p.display_name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{p.username}</span>
                    <Badge color={p.role==='admin' ? 'lavender' : 'gray'}>{p.role==='admin' ? '👑 Admin' : '👤 Üye'}</Badge>
                    <Badge color={p.is_approved ? 'mint' : 'gold'}>{p.is_approved ? '✅ Onaylı' : '⏳ Bekliyor'}</Badge>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.characters?.length || 0} karakter</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    {new Date(p.created_at).toLocaleDateString('tr-TR')} tarihinde katıldı
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {!p.is_approved && <Btn size="sm" onClick={() => approvePlayer(p.id, true)}>✅ Onayla</Btn>}
                  {p.is_approved && <Btn size="sm" variant="ghost" onClick={() => approvePlayer(p.id, false)}>⏸ Askıya Al</Btn>}
                  {p.role !== 'admin' && <Btn size="sm" variant="soft" onClick={() => changeRole(p.id, 'admin')}>👑 Admin Yap</Btn>}
                  {p.role === 'admin' && <Btn size="sm" variant="ghost" onClick={() => changeRole(p.id, 'member')}>⬇ Üye Yap</Btn>}
                  <Btn size="sm" variant="danger" onClick={() => deletePlayer(p.id)}>🗑</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* DAVETİYELER */}
      {!loading && tab === 'invites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {invites.map(inv => (
            <Card key={inv.id} style={{ padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <code style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, color: 'var(--accent-text)', background: 'var(--accent-soft)', padding: '4px 10px', borderRadius: 8 }}>{inv.code}</code>
                    <Badge color={inv.used_by ? 'gray' : 'mint'}>{inv.used_by ? `✅ Kullanıldı (@${inv['players!used_by']?.username})` : '⏳ Bekliyor'}</Badge>
                    {inv.note && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Not: {inv.note}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(inv.created_at).toLocaleDateString('tr-TR')} • Oluşturan: @{inv['players!created_by']?.username}
                    {inv.expires_at && ` • Geçerlilik: ${new Date(inv.expires_at).toLocaleDateString('tr-TR')}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!inv.used_by && <Btn size="sm" variant="soft" onClick={() => copyInviteLink(inv.code)}>🔗 Kopyala</Btn>}
                  <Btn size="sm" variant="danger" onClick={() => deleteInvite(inv.id)}>🗑</Btn>
                </div>
              </div>
            </Card>
          ))}
          {invites.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Henüz davetiye oluşturulmamış.</div>}
        </div>
      )}

      {/* KARAKTERler */}
      {!loading && tab === 'chars' && <CharactersAdmin />}

      {/* Yeni Davetiye Modal */}
      <Modal open={newInviteModal} onClose={() => setNewInviteModal(false)} title="🎟️ Yeni Davetiye Oluştur">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Davetiye kodu otomatik oluşturulacak. İsteğe bağlı bir not ekleyebilirsin.</p>
          <input value={inviteNote} onChange={e=>setInviteNote(e.target.value)} placeholder="Not (opsiyonel, örn: Melih için)" />
          <Btn onClick={createInvite} fullWidth>Davetiye Oluştur</Btn>
        </div>
      </Modal>
    </div>
  )
}

const CharactersAdmin = () => {
  const [chars, setChars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('characters').select('*, players(username, display_name)').order('created_at', { ascending: false })
      .then(({ data }) => { setChars(data || []); setLoading(false) })
  }, [])

  const deleteChar = async (id) => {
    if (!confirm('Karakteri sil?')) return
    await supabase.from('characters').delete().eq('id', id)
    setChars(p => p.filter(c => c.id !== id))
    toast('Karakter silindi')
  }

  if (loading) return <Spinner />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {chars.map(c => (
        <Card key={c.id} style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={c.name} src={c.avatar_url} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{c.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{c.players?.username} • {c.char_type === 'page' ? '🏢 Sayfa' : '🧙 Karakter'}</div>
            </div>
            <Btn size="sm" variant="danger" onClick={() => deleteChar(c.id)}>🗑</Btn>
          </div>
        </Card>
      ))}
    </div>
  )
}
