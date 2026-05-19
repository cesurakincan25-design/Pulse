import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { Avatar, Btn, Modal, Badge, ImageUpload, toast, Card, Spinner } from './ui'
import { supabase } from '../lib/supabase'

// ── Karakter Seçici Overlay ────────────────────────────────────────
export const CharacterSwitcher = ({ onSelect }) => {
  const { characters, profile, switchCharacter, refreshCharacters } = useAuth()
  const [showNew, setShowNew] = useState(false)
  const [editChar, setEditChar] = useState(null)
  const [hover, setHover] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const select = (char) => { switchCharacter(char); onSelect?.() }

  const deleteChar = async (char) => {
    const { error } = await supabase.from('characters').delete().eq('id', char.id)
    if (error) { toast('Silinemedi: ' + error.message, 'error'); return }
    toast(`${char.name} silindi`)
    setConfirmDelete(null)
    refreshCharacters()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '80vw', height: '60vh', background: 'radial-gradient(ellipse, var(--rose-100) 0%, transparent 65%)', opacity: .55 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>💗</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: 'var(--text-primary)' }}>Merhaba, {profile?.display_name}!</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 15, fontStyle: 'italic' }}>What's your Pulse today?</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', maxWidth: 780, position: 'relative', zIndex: 1 }}>
        {characters.map(char => (
          <div key={char.id}
            onMouseEnter={() => setHover(char.id)} onMouseLeave={() => setHover(null)}
            style={{ width: 160, background: 'var(--bg-card)', border: `2px solid ${hover===char.id ? 'var(--accent)' : 'var(--border-soft)'}`, borderRadius: 20, padding: '20px 14px 14px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s', transform: hover===char.id ? 'translateY(-4px)' : 'none', boxShadow: hover===char.id ? 'var(--shadow-rose)' : 'var(--shadow-sm)', position: 'relative' }}>

            {/* Düzenle / Sil butonları — hover'da görünür */}
            {hover===char.id && (
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setEditChar(char)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)' }}>✏️</button>
                <button onClick={() => setConfirmDelete(char)} style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '3px 6px', fontSize: 11, cursor: 'pointer', color: '#b91c1c' }}>🗑</button>
              </div>
            )}

            <div onClick={() => select(char)}>
              <Avatar name={char.name} src={char.avatar_url} size={72} ring={hover===char.id} />
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginTop: 14, lineHeight: 1.3 }}>{char.name}</div>
              {char.tagline && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{char.tagline}</div>}
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 4 }}>
                {(char.tags||[]).slice(0,2).map(t => <Badge key={t} color="rose" size="xs">{t}</Badge>)}
              </div>
            </div>
          </div>
        ))}

        {/* Yeni karakter */}
        <div onClick={() => setShowNew(true)}
          onMouseEnter={() => setHover('new')} onMouseLeave={() => setHover(null)}
          style={{ width: 160, background: 'var(--bg-card)', border: `2px dashed ${hover==='new' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 20, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s', transform: hover==='new' ? 'translateY(-4px)' : 'none' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto', color: 'var(--accent)' }}>+</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', marginTop: 14 }}>Yeni Karakter</div>
        </div>
      </div>

      <NewCharacterModal open={showNew} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); refreshCharacters() }} />
      <EditCharacterModal char={editChar} onClose={() => setEditChar(null)} onSaved={() => { setEditChar(null); refreshCharacters() }} />

      {/* Silme onayı */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Karakteri Sil" width={380}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
          <strong>{confirmDelete?.name}</strong> karakterini silmek istediğine emin misin? Bu işlem geri alınamaz.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" fullWidth onClick={() => setConfirmDelete(null)}>İptal</Btn>
          <Btn variant="danger" fullWidth onClick={() => deleteChar(confirmDelete)}>Evet, Sil</Btn>
        </div>
      </Modal>
    </div>
  )
}

// ── Header Dropdown ────────────────────────────────────────────────
export const CharacterDropdown = ({ onViewProfile }) => {
  const { activeChar, characters, switchCharacter } = useAuth()
  const [open, setOpen] = useState(false)
  const [editChar, setEditChar] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const { refreshCharacters } = useAuth()

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-hover)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius-full)', padding: '6px 12px 6px 6px', cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'border-color .2s' }}>
        <Avatar name={activeChar?.name} src={activeChar?.avatar_url} size={28} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeChar?.name}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', minWidth: 220, zIndex: 50, overflow: 'hidden', animation: 'fadeDown .15s ease' }}>
            <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Pulse Kimliğin</div>
            {characters.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: activeChar?.id===c.id ? 'var(--accent-soft)' : 'transparent', transition: 'background .15s' }}
                onMouseEnter={e => { if(activeChar?.id!==c.id) e.currentTarget.style.background='var(--bg-hover)' }}
                onMouseLeave={e => { if(activeChar?.id!==c.id) e.currentTarget.style.background=activeChar?.id===c.id?'var(--accent-soft)':'transparent' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => { switchCharacter(c); setOpen(false) }}>
                  <Avatar name={c.name} src={c.avatar_url} size={32} ring={activeChar?.id===c.id} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                    {c.tagline && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.tagline}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); setEditChar(c); setOpen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 3, color: 'var(--text-muted)' }} title="Düzenle">✏️</button>
                  {onViewProfile && <button onClick={(e) => { e.stopPropagation(); onViewProfile(c); setOpen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 3, color: 'var(--text-muted)' }} title="Profil">👤</button>}
                </div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border-soft)', padding: '6px 8px' }}>
              <button onClick={() => { setShowNew(true); setOpen(false) }} style={{ width: '100%', padding: '8px 10px', background: 'none', border: 'none', color: 'var(--accent-text)', fontWeight: 700, fontSize: 12, cursor: 'pointer', borderRadius: 8, textAlign: 'left', fontFamily: 'var(--font-ui)' }}>+ Yeni Karakter Ekle</button>
            </div>
          </div>
        </>
      )}

      <EditCharacterModal char={editChar} onClose={() => setEditChar(null)} onSaved={() => { setEditChar(null); refreshCharacters() }} />
      <NewCharacterModal open={showNew} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); refreshCharacters() }} />
      <style>{`@keyframes fadeDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}

// ── Yeni Karakter Modal ────────────────────────────────────────────
export const NewCharacterModal = ({ open, onClose, onCreated }) => {
  const { player } = useAuth()
  const [name, setName]         = useState('')
  const [tagline, setTagline]   = useState('')
  const [charType, setCharType] = useState('character')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true)
    const { error } = await supabase.from('characters').insert({
      player_id: player.id,
      name: name.trim(),
      tagline: tagline.trim() || null,
      char_type: charType,
      avatar_url: avatarUrl || null,
    })
    setLoading(false)
    if (error) { toast('Hata: ' + error.message, 'error'); return }
    toast('Karakter oluşturuldu! ✨')
    setName(''); setTagline(''); setAvatarUrl('')
    onCreated?.()
  }

  return (
    <Modal open={open} onClose={onClose} title="Yeni Karakter / Sayfa">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['character','🧙 Karakter'], ['page','🏢 Sayfa']].map(([v,l]) => (
          <button key={v} onClick={() => setCharType(v)} style={{ flex: 1, padding: '10px', border: `2px solid ${charType===v ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: charType===v ? 'var(--accent-soft)' : 'var(--bg)', color: charType===v ? 'var(--accent-text)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all .15s' }}>
            {l}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ImageUpload bucket="avatars" path={`char-${player?.id}-new`} onUploaded={setAvatarUrl} style={{ alignSelf: 'center' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <Avatar name={name || '?'} src={avatarUrl} size={80} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', opacity: 0, transition: 'opacity .2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity=1} onMouseLeave={e => e.currentTarget.style.opacity=0}>📷</div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>Fotoğraf yükle</p>
        </ImageUpload>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder={charType==='page' ? 'Sayfa adı' : 'Karakter adı'} />
        <input value={tagline} onChange={e=>setTagline(e.target.value)} placeholder="Kısa açıklama / meslek / lakap" />
        <Btn onClick={submit} disabled={loading || !name.trim()} fullWidth>
          {loading ? 'Oluşturuluyor...' : charType==='page' ? 'Sayfa Oluştur' : 'Karakter Oluştur'}
        </Btn>
      </div>
    </Modal>
  )
}

// ── Karakter Düzenleme Modal ───────────────────────────────────────
export const EditCharacterModal = ({ char, onClose, onSaved }) => {
  const { player } = useAuth()
  const [name, setName]         = useState('')
  const [tagline, setTagline]   = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (char) {
      setName(char.name || '')
      setTagline(char.tagline || '')
      setAvatarUrl(char.avatar_url || '')
    }
  }, [char])

  const save = async () => {
    if (!name.trim()) return
    setLoading(true)
    const { error } = await supabase.from('characters').update({
      name: name.trim(),
      tagline: tagline.trim() || null,
      avatar_url: avatarUrl || null,
    }).eq('id', char.id)
    setLoading(false)
    if (error) { toast('Hata: ' + error.message, 'error'); return }
    toast('Kaydedildi! ✅')
    onSaved?.()
  }

  return (
    <Modal open={!!char} onClose={onClose} title={`✏️ Düzenle — ${char?.name || ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Avatar */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar name={name} src={avatarUrl} size={72} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ImageUpload bucket="avatars" path={`char-${char?.id}`} onUploaded={setAvatarUrl}>
              <Btn variant="soft" size="sm">📤 Yükle</Btn>
            </ImageUpload>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} placeholder="veya resim linki yapıştır" style={{ fontSize: 12, height: 30 }} />
            </div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Karakter Adı</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Karakter adı" />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Meslek / Takma Ad / Kısa Açıklama</label>
          <input value={tagline} onChange={e=>setTagline(e.target.value)} placeholder="örn: Dedektif · Tokyo MPD" />
        </div>

        <Btn onClick={save} disabled={loading || !name.trim()} fullWidth>
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </Btn>
      </div>
    </Modal>
  )
}

// ── Karakter Profil Sayfası (Duvar) ───────────────────────────────
export const CharacterProfile = ({ char, onBack }) => {
  const { activeChar, player } = useAuth()
  const [posts, setPosts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const { refreshCharacters }   = useAuth()
  const isOwner = char.player_id === player?.id

  useEffect(() => {
    supabase.from('posts')
      .select('*, characters(name, avatar_url), players(username)')
      .eq('character_id', char.id)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => { setPosts(data || []); setLoading(false) })
  }, [char.id])

  return (
    <div>
      {/* Geri butonu */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, marginBottom: 16, fontFamily: 'var(--font-ui)', padding: 0 }}>
        ← Geri
      </button>

      {/* Profil kartı */}
      <Card style={{ marginBottom: 20, overflow: 'hidden' }}>
        {/* Banner */}
        <div style={{ height: 120, background: 'linear-gradient(135deg, var(--rose-100), var(--rose-200))', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: -32, left: 24 }}>
            <Avatar name={char.name} src={char.avatar_url} size={72} ring />
          </div>
          {isOwner && (
            <button onClick={() => setShowEdit(true)} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,.85)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 5 }}>
              ✏️ Düzenle
            </button>
          )}
        </div>

        <div style={{ padding: '44px 24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{char.name}</h1>
              {char.tagline && <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0', fontStyle: 'italic' }}>{char.tagline}</p>}
            </div>
            <Badge color={char.char_type === 'page' ? 'blue' : 'rose'}>{char.char_type === 'page' ? '🏢 Sayfa' : '🧙 Karakter'}</Badge>
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
            <div><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{posts.length}</span> <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pulse</span></div>
          </div>
        </div>
      </Card>

      {/* Gönderiler */}
      {loading && <div style={{ textAlign: 'center', padding: 32 }}><Spinner /></div>}
      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💗</div>
          <p>Henüz Pulse yok.</p>
        </div>
      )}
      {posts.map(post => {
        const TYPE_COLORS = { rp: 'lavender', ooc: 'gold', post: 'rose', lore: 'mint' }
        const TYPE_LABELS = { rp: '🎭 RP', ooc: '💬 OOC', post: '💗 Pulse', lore: '📖 Lore' }
        return (
          <Card key={post.id} style={{ marginBottom: 14, padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar name={char.name} src={char.avatar_url} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{char.name}</span>
                  <Badge color={TYPE_COLORS[post.post_type] || 'rose'} size="xs">{TYPE_LABELS[post.post_type] || '💗 Pulse'}</Badge>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {new Date(post.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0, fontFamily: post.post_type === 'rp' ? 'var(--font-rp)' : 'var(--font-ui)' }}>{post.content}</p>
                {post.image_url && <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 10, marginTop: 10, maxHeight: 360, objectFit: 'cover' }} />}
                <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
                  <span>♡ {post.likes_count}</span>
                  <span>💬 {post.comments_count}</span>
                </div>
              </div>
            </div>
          </Card>
        )
      })}

      <EditCharacterModal char={showEdit ? char : null} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); refreshCharacters() }} />
    </div>
  )
}
