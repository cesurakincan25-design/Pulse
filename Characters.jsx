import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { Avatar, Btn, Modal, Badge, ImageUpload, toast, Card, Spinner } from './ui'
import { supabase } from '../lib/supabase'

// ── Karakter Seçici Overlay ────────────────────────────────────────
export const CharacterSwitcher = ({ onSelect }) => {
  const { characters, profile, switchCharacter, refreshCharacters } = useAuth()
  const [showNew, setShowNew]       = useState(false)
  const [editChar, setEditChar]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [hover, setHover]           = useState(null)

  const deleteChar = async (char) => {
    const { error } = await supabase.from('characters').delete().eq('id', char.id)
    if (error) { toast('Silinemedi: ' + error.message, 'error'); return }
    toast(`${char.name} silindi`)
    setConfirmDel(null)
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
          <div key={char.id} onMouseEnter={() => setHover(char.id)} onMouseLeave={() => setHover(null)}
            style={{ width: 160, background: 'var(--bg-card)', border: `2px solid ${hover===char.id ? 'var(--accent)' : 'var(--border-soft)'}`, borderRadius: 20, padding: '20px 14px 14px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s', transform: hover===char.id ? 'translateY(-4px)' : 'none', boxShadow: hover===char.id ? 'var(--shadow-rose)' : 'var(--shadow-sm)', position: 'relative' }}>
            {hover===char.id && (
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setEditChar(char)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)' }}>✏️</button>
                <button onClick={() => setConfirmDel(char)} style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '3px 6px', fontSize: 11, cursor: 'pointer', color: '#b91c1c' }}>🗑</button>
              </div>
            )}
            <div onClick={() => { switchCharacter(char); onSelect?.() }}>
              <Avatar name={char.name} src={char.avatar_url} size={72} ring={hover===char.id} />
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginTop: 14, lineHeight: 1.3 }}>{char.name}</div>
              {char.tagline && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{char.tagline}</div>}
            </div>
          </div>
        ))}
        <div onClick={() => setShowNew(true)} onMouseEnter={() => setHover('new')} onMouseLeave={() => setHover(null)}
          style={{ width: 160, background: 'var(--bg-card)', border: `2px dashed ${hover==='new' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 20, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s', transform: hover==='new' ? 'translateY(-4px)' : 'none' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto', color: 'var(--accent)' }}>+</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', marginTop: 14 }}>Yeni Karakter</div>
        </div>
      </div>
      <NewCharacterModal open={showNew} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); refreshCharacters() }} />
      <EditCharacterModal char={editChar} onClose={() => setEditChar(null)} onSaved={() => { setEditChar(null); refreshCharacters() }} />
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Karakteri Sil" width={380}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}><strong>{confirmDel?.name}</strong> silinsin mi? Bu işlem geri alınamaz.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" fullWidth onClick={() => setConfirmDel(null)}>İptal</Btn>
          <Btn variant="danger" fullWidth onClick={() => deleteChar(confirmDel)}>Sil</Btn>
        </div>
      </Modal>
    </div>
  )
}

// ── Header Dropdown ────────────────────────────────────────────────
export const CharacterDropdown = ({ onViewProfile }) => {
  const { activeChar, characters, switchCharacter, refreshCharacters } = useAuth()
  const [open, setOpen]       = useState(false)
  const [editChar, setEditChar] = useState(null)
  const [showNew, setShowNew] = useState(false)

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
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', minWidth: 230, zIndex: 50, overflow: 'hidden', animation: 'fadeDown .15s ease' }}>
            <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Pulse Kimliğin</div>
            {characters.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: activeChar?.id===c.id ? 'var(--accent-soft)' : 'transparent', transition: 'background .15s' }}
                onMouseEnter={e => { if(activeChar?.id!==c.id) e.currentTarget.style.background='var(--bg-hover)' }}
                onMouseLeave={e => { if(activeChar?.id!==c.id) e.currentTarget.style.background=activeChar?.id===c.id?'var(--accent-soft)':'transparent' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 0 }} onClick={() => { switchCharacter(c); setOpen(false) }}>
                  <Avatar name={c.name} src={c.avatar_url} size={32} ring={activeChar?.id===c.id} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    {c.tagline && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.tagline}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); setEditChar(c); setOpen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 3, color: 'var(--text-muted)' }} title="Düzenle">✏️</button>
                  {onViewProfile && <button onClick={e => { e.stopPropagation(); onViewProfile(c); setOpen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 3, color: 'var(--text-muted)' }} title="Profil">👤</button>}
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
  const [f, setF] = useState({ name: '', tagline: '', charType: 'character', avatarUrl: '' })
  const [loading, setLoading] = useState(false)
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!f.name.trim()) return
    setLoading(true)
    const { error } = await supabase.from('characters').insert({ player_id: player.id, name: f.name.trim(), tagline: f.tagline.trim() || null, char_type: f.charType, avatar_url: f.avatarUrl || null })
    setLoading(false)
    if (error) { toast('Hata: ' + error.message, 'error'); return }
    toast('Karakter oluşturuldu! ✨')
    setF({ name: '', tagline: '', charType: 'character', avatarUrl: '' })
    onCreated?.()
  }

  return (
    <Modal open={open} onClose={onClose} title="Yeni Karakter / Sayfa">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['character','🧙 Karakter'],['page','🏢 Sayfa']].map(([v,l]) => (
          <button key={v} onClick={() => upd('charType', v)} style={{ flex: 1, padding: 10, border: `2px solid ${f.charType===v ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: f.charType===v ? 'var(--accent-soft)' : 'var(--bg)', color: f.charType===v ? 'var(--accent-text)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all .15s' }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ImageUpload bucket="avatars" path={`char-${player?.id}-new`} onUploaded={v => upd('avatarUrl', v)} style={{ alignSelf: 'center' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <Avatar name={f.name || '?'} src={f.avatarUrl} size={80} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', opacity: 0, transition: 'opacity .2s' }} onMouseEnter={e => e.currentTarget.style.opacity=1} onMouseLeave={e => e.currentTarget.style.opacity=0}>📷</div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>Fotoğraf yükle</p>
        </ImageUpload>
        <input value={f.name} onChange={e => upd('name', e.target.value)} placeholder={f.charType==='page' ? 'Sayfa adı' : 'Karakter adı'} />
        <input value={f.tagline} onChange={e => upd('tagline', e.target.value)} placeholder="Meslek / lakap" />
        <Btn onClick={submit} disabled={loading || !f.name.trim()} fullWidth>{loading ? 'Oluşturuluyor...' : f.charType==='page' ? 'Sayfa Oluştur' : 'Karakter Oluştur'}</Btn>
      </div>
    </Modal>
  )
}

// ── Karakter Düzenleme Modal (detaylı) ────────────────────────────
export const EditCharacterModal = ({ char, onClose, onSaved }) => {
  const [f, setF] = useState({})
  const [loading, setLoading] = useState(false)
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (char) setF({
      name:         char.name || '',
      tagline:      char.tagline || '',
      quote:        char.quote || '',
      location:     char.location || '',
      occupation:   char.occupation || '',
      gender:       char.gender || '',
      relationship: char.relationship || '',
      birth_date:   char.birth_date || '',
      avatar_url:   char.avatar_url || '',
      banner_url:   char.banner_url || '',
    })
  }, [char])

  const save = async () => {
    if (!f.name?.trim()) return
    setLoading(true)
    const { error } = await supabase.from('characters').update({
      name: f.name.trim(),
      tagline: f.tagline || null,
      quote: f.quote || null,
      location: f.location || null,
      occupation: f.occupation || null,
      gender: f.gender || null,
      relationship: f.relationship || null,
      birth_date: f.birth_date || null,
      avatar_url: f.avatar_url || null,
      banner_url: f.banner_url || null,
    }).eq('id', char.id)
    setLoading(false)
    if (error) { toast('Hata: ' + error.message, 'error'); return }
    toast('Kaydedildi! ✅')
    onSaved?.()
  }

  const Field = ({ label, k, placeholder, type = 'text' }) => (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={f[k] || ''} onChange={e => upd(k, e.target.value)} placeholder={placeholder} />
    </div>
  )

  const imgField = (label, key, bucket) => (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {key === 'avatar_url'
          ? <Avatar name={f.name} src={f[key]} size={56} />
          : f[key] ? <img src={f[key]} style={{ height: 48, width: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} /> : <div style={{ height: 48, width: 120, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)' }}>Banner yok</div>
        }
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ImageUpload bucket={bucket} path={`${key}-${char?.id}`} onUploaded={v => upd(key, v)}>
            <Btn variant="soft" size="sm">📤 Yükle</Btn>
          </ImageUpload>
          <input value={f[key] || ''} onChange={e => upd(key, e.target.value)} placeholder="veya link yapıştır" style={{ fontSize: 12, height: 30 }} />
        </div>
      </div>
    </div>
  )

  return (
    <Modal open={!!char} onClose={onClose} title={`✏️ ${char?.name || ''}`} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {imgField('Profil Fotoğrafı', 'avatar_url', 'avatars')}
        {imgField('Banner', 'banner_url', 'banners')}
        <Field label="Karakter Adı *" k="name" placeholder="Karakter adı" />
        <Field label="Meslek / Lakap" k="tagline" placeholder="örn: Dedektif · Tokyo MPD" />
        <Field label="Alıntı / Motto" k="quote" placeholder='"Consistency defines everything."' />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Şehir / Konum" k="location" placeholder="Tokyo, Shibuya" />
          <Field label="Meslek (detaylı)" k="occupation" placeholder="Racing Driver" />
          <Field label="Cinsiyet" k="gender" placeholder="Kadın / Erkek" />
          <Field label="İlişki Durumu" k="relationship" placeholder="Bekar / İlişkide" />
          <Field label="Doğum Tarihi" k="birth_date" type="date" />
        </div>
        <Btn onClick={save} disabled={loading || !f.name?.trim()} fullWidth>{loading ? 'Kaydediliyor...' : 'Kaydet'}</Btn>
      </div>
    </Modal>
  )
}

// ── Karakter Profil Sayfası ────────────────────────────────────────
export const CharacterProfile = ({ char: initialChar, onBack, onViewProfile }) => {
  const { activeChar, player, profile: myProfile, refreshCharacters } = useAuth()
  const [char, setChar]       = useState(initialChar)
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [gridView, setGridView] = useState(false)
  const isOwner = char.player_id === player?.id
  const isAdmin = myProfile?.role === 'admin'

  useEffect(() => {
    setChar(initialChar)
    loadPosts(initialChar.id)
  }, [initialChar.id])

  const loadPosts = async (charId) => {
    setLoading(true)
    const { data } = await supabase.from('posts')
      .select('*, characters(id,name,avatar_url), players(username)')
      .eq('character_id', charId)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(50)
    setPosts(data || [])
    setLoading(false)
  }

  const deletePost = async (postId) => {
    if (!confirm('Gönderiyi sil?')) return
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(p => p.filter(x => x.id !== postId))
    toast('Gönderi silindi')
  }

  const AGE_LABELS = { 'Kadın': '👩', 'Erkek': '👨' }
  const calcAge = (dateStr) => {
    if (!dateStr) return null
    const diff = Date.now() - new Date(dateStr).getTime()
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
  }

  const TYPE_COLORS = { rp: 'lavender', ooc: 'gold', post: 'rose', lore: 'mint' }
  const TYPE_LABELS = { rp: '🎭 RP', ooc: '💬 OOC', post: '💗 Pulse', lore: '📖 Lore' }

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, marginBottom: 16, fontFamily: 'var(--font-ui)', padding: 0 }}>← Geri</button>

      {/* Banner + Avatar */}
      <Card style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: 180, background: char.banner_url ? 'none' : 'linear-gradient(135deg, var(--rose-100), var(--rose-200))', position: 'relative', overflow: 'hidden' }}>
          {char.banner_url && <img src={char.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          {(isOwner || isAdmin) && (
            <button onClick={() => setShowEdit(true)} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}>
              ✏️ Düzenle
            </button>
          )}
          <div style={{ position: 'absolute', bottom: -36, left: 24, border: '4px solid var(--bg-card)', borderRadius: '50%' }}>
            <Avatar name={char.name} src={char.avatar_url} size={80} />
          </div>
        </div>
        <div style={{ padding: '48px 24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{char.name}</h1>
              {char.tagline && <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>{char.tagline}</p>}
              {char.quote && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 0', fontStyle: 'italic', fontFamily: 'var(--font-rp)' }}>"{char.quote}"</p>}
            </div>
            <Badge color={char.char_type === 'page' ? 'blue' : 'rose'}>{char.char_type === 'page' ? '🏢 Sayfa' : '🧙 Karakter'}</Badge>
          </div>

          {/* Profil bilgileri */}
          {(char.occupation || char.location || char.gender || char.birth_date || char.relationship) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
              {char.occupation   && <InfoItem icon="💼" text={char.occupation} />}
              {char.location     && <InfoItem icon="📍" text={char.location} />}
              {char.gender       && <InfoItem icon={AGE_LABELS[char.gender] || '🧑'} text={char.gender} />}
              {char.birth_date   && <InfoItem icon="🎂" text={`${new Date(char.birth_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}${calcAge(char.birth_date) ? ` (${calcAge(char.birth_date)} yaşında)` : ''}`} />}
              {char.relationship && <InfoItem icon="💝" text={char.relationship} />}
            </div>
          )}

          <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-soft)', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>{posts.length}</strong> gönderi</span>
            {/* Grid / Liste toggle */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
              <button onClick={() => setGridView(false)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: !gridView ? 'var(--bg-card)' : 'transparent', cursor: 'pointer', fontSize: 14 }}>☰</button>
              <button onClick={() => setGridView(true)}  style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: gridView ? 'var(--bg-card)' : 'transparent', cursor: 'pointer', fontSize: 14 }}>⊞</button>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid görünümü */}
      {gridView ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {posts.map(post => (
            <div key={post.id} onClick={() => setGridView(false)}
              style={{ aspectRatio: '1', background: post.image_url ? 'none' : 'var(--bg-card)', border: '1px solid var(--border-soft)', cursor: 'pointer', overflow: 'hidden', position: 'relative', borderRadius: 4 }}>
              {post.image_url
                ? <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ padding: 10, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: post.post_type==='rp' ? 'var(--font-rp)' : 'var(--font-ui)' }}>{post.content?.slice(0, 80)}</div>
              }
            </div>
          ))}
        </div>
      ) : (
        /* Liste görünümü */
        <div>
          {loading && <div style={{ textAlign: 'center', padding: 32 }}><Spinner /></div>}
          {!loading && posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💗</div>
              <p>Henüz Pulse yok.</p>
            </div>
          )}
          {posts.map(post => (
            <ProfilePostCard key={post.id} post={post} canEdit={isOwner || isAdmin}
              onDelete={() => deletePost(post.id)}
              onViewProfile={onViewProfile} />
          ))}
        </div>
      )}

      <EditCharacterModal char={showEdit ? char : null} onClose={() => setShowEdit(false)}
        onSaved={async () => {
          setShowEdit(false)
          const { data } = await supabase.from('characters').select('*').eq('id', char.id).single()
          if (data) setChar(data)
          refreshCharacters()
        }} />
    </div>
  )
}

const InfoItem = ({ icon, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
    <span>{icon}</span> <span>{text}</span>
  </div>
)

// ── Profil sayfasındaki gönderi kartı ─────────────────────────────
const ProfilePostCard = ({ post, canEdit, onDelete, onViewProfile }) => {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content || '')
  const [saving, setSaving] = useState(false)
  const TYPE_COLORS = { rp: 'lavender', ooc: 'gold', post: 'rose', lore: 'mint' }
  const TYPE_LABELS = { rp: '🎭 RP', ooc: '💬 OOC', post: '💗 Pulse', lore: '📖 Lore' }

  const saveEdit = async () => {
    if (!editContent.trim()) return
    setSaving(true)
    await supabase.from('posts').update({ content: editContent }).eq('id', post.id)
    setSaving(false)
    post.content = editContent
    setEditing(false)
    toast('Gönderi güncellendi ✅')
  }

  return (
    <Card style={{ marginBottom: 14, padding: '16px 20px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ cursor: 'pointer' }} onClick={() => onViewProfile?.(post.characters)}>
          <Avatar name={post.characters?.name} src={post.characters?.avatar_url} size={40} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-text)', cursor: 'pointer' }} onClick={() => onViewProfile?.(post.characters)}>{post.characters?.name}</span>
            <Badge color={TYPE_COLORS[post.post_type] || 'rose'} size="xs">{TYPE_LABELS[post.post_type] || '💗'}</Badge>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {new Date(post.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            {canEdit && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setEditing(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', padding: '2px 4px' }}>✏️</button>
                <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#e05', padding: '2px 4px' }}>🗑</button>
              </div>
            )}
          </div>

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ minHeight: 80, resize: 'vertical', fontSize: 14, lineHeight: 1.7, borderRadius: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn size="sm" onClick={saveEdit} disabled={saving}>{saving ? '...' : 'Kaydet'}</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setEditing(false)}>İptal</Btn>
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-secondary)', margin: '0 0 10px', fontFamily: post.post_type==='rp' ? 'var(--font-rp)' : 'var(--font-ui)' }}>{post.content}</p>
              {post.image_url && <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 10, maxHeight: 400, objectFit: 'cover' }} />}
            </>
          )}
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            <span>♡ {post.likes_count}</span>
            <span>💬 {post.comments_count}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
