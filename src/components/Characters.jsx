import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Avatar, Btn, Modal, Badge, ImageUpload, toast } from '../components/ui'
import { supabase, getPublicUrl } from '../lib/supabase'

// ── Karakter Seçici Overlay ────────────────────────────────────────
export const CharacterSwitcher = ({ onSelect }) => {
  const { characters, profile, switchCharacter, refreshCharacters } = useAuth()
  const [showNew, setShowNew]   = useState(false)
  const [hover, setHover]       = useState(null)

  const select = (char) => { switchCharacter(char); onSelect?.() }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Soft arka plan dekor */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '80vw', height: '60vh', background: 'radial-gradient(ellipse, var(--rose-100) 0%, transparent 65%)', opacity: .55 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>💗</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: 'var(--text-primary)' }}>Merhaba, {profile?.display_name}!</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 15, fontStyle: 'italic' }}>What's your Pulse today?</p>
      </div>

      {/* Karakter grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', maxWidth: 700, position: 'relative', zIndex: 1 }}>
        {characters.map(char => (
          <div key={char.id} onClick={() => select(char)}
            onMouseEnter={() => setHover(char.id)} onMouseLeave={() => setHover(null)}
            style={{ width: 160, background: 'var(--bg-card)', border: `2px solid ${hover===char.id ? 'var(--accent)' : 'var(--border-soft)'}`, borderRadius: 20, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s', transform: hover===char.id ? 'translateY(-4px)' : 'none', boxShadow: hover===char.id ? 'var(--shadow-rose)' : 'var(--shadow-sm)' }}>
            <Avatar name={char.name} src={char.avatar_url} size={72} ring={hover===char.id} />
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginTop: 14, lineHeight: 1.3 }}>{char.name}</div>
            {char.tagline && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{char.tagline}</div>}
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 4 }}>
              {(char.tags||[]).slice(0,2).map(t => <Badge key={t} color="rose" size="xs">{t}</Badge>)}
            </div>
          </div>
        ))}

        {/* Yeni karakter ekle */}
        <div onClick={() => setShowNew(true)}
          onMouseEnter={() => setHover('new')} onMouseLeave={() => setHover(null)}
          style={{ width: 160, background: 'var(--bg-card)', border: `2px dashed ${hover==='new' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 20, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s', transform: hover==='new' ? 'translateY(-4px)' : 'none' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto', color: 'var(--accent)' }}>+</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', marginTop: 14 }}>Yeni Karakter</div>
        </div>
      </div>

      <NewCharacterModal open={showNew} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); refreshCharacters() }} />
    </div>
  )
}

// ── Header'da Karakter Seçici Dropdown ────────────────────────────
export const CharacterDropdown = () => {
  const { activeChar, characters, switchCharacter } = useAuth()
  const [open, setOpen] = useState(false)

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
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', minWidth: 200, zIndex: 50, overflow: 'hidden', animation: 'fadeDown .15s ease' }}>
            <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Pulse Kimliğin</div>
            {characters.map(c => (
              <div key={c.id} onClick={() => { switchCharacter(c); setOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: activeChar?.id===c.id ? 'var(--accent-soft)' : 'transparent', transition: 'background .15s' }}
                onMouseEnter={e => { if(activeChar?.id!==c.id) e.currentTarget.style.background='var(--bg-hover)' }}
                onMouseLeave={e => { if(activeChar?.id!==c.id) e.currentTarget.style.background='transparent' }}>
                <Avatar name={c.name} src={c.avatar_url} size={32} ring={activeChar?.id===c.id} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                  {c.tagline && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.tagline}</div>}
                </div>
                {activeChar?.id===c.id && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--accent)' }}>●</span>}
              </div>
            ))}
          </div>
        </>
      )}
      <style>{`@keyframes fadeDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}

// ── Yeni Karakter Modal ────────────────────────────────────────────
export const NewCharacterModal = ({ open, onClose, onCreated }) => {
  const { player } = useAuth()
  const [name, setName]         = useState('')
  const [tagline, setTagline]   = useState('')
  const [bio, setBio]           = useState('')
  const [tags, setTags]         = useState('')
  const [charType, setCharType] = useState('character') // 'character' | 'page'
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true)
    const { error } = await supabase.from('characters').insert({
      player_id: player.id,
      name: name.trim(),
      tagline: tagline.trim(),
      bio: bio.trim(),
      tags: tags.split(',').map(t=>t.trim()).filter(Boolean),
      char_type: charType,
      avatar_url: avatarUrl || null,
    })
    setLoading(false)
    if (error) { toast('Hata: ' + error.message, 'error'); return }
    toast('Karakter oluşturuldu!')
    setName(''); setTagline(''); setBio(''); setTags(''); setAvatarUrl('')
    onCreated?.()
  }

  return (
    <Modal open={open} onClose={onClose} title="Yeni Karakter / Sayfa">
      {/* Tip seç */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['character','🧙 Karakter'], ['page','🏢 Sayfa']].map(([v,l]) => (
          <button key={v} onClick={() => setCharType(v)} style={{ flex: 1, padding: '10px', border: `2px solid ${charType===v ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: charType===v ? 'var(--accent-soft)' : 'var(--bg)', color: charType===v ? 'var(--accent-text)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all .15s' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Avatar yükle */}
        <ImageUpload bucket="avatars" path={`char-${player?.id}`} onUploaded={setAvatarUrl} style={{ alignSelf: 'center' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <Avatar name={name || '?'} src={avatarUrl} size={80} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .2s', fontSize: 20, color: '#fff' }}
              onMouseEnter={e => e.currentTarget.style.opacity=1} onMouseLeave={e => e.currentTarget.style.opacity=0}>
              📷
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>Fotoğraf yükle</p>
        </ImageUpload>

        <input value={name} onChange={e=>setName(e.target.value)} placeholder={charType==='page' ? 'Sayfa adı (örn: Kara Şövalye Loncası)' : 'Karakter adı (örn: Lyra Ashveil)'} />
        <input value={tagline} onChange={e=>setTagline(e.target.value)} placeholder="Kısa açıklama (örn: Sürüklenen büyücü, 300 yaşında)" />
        <textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="Karakter biyografisi..." style={{ minHeight: 80, resize: 'vertical' }} />
        <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Etiketler (virgülle: elf, büyücü, dark)" />

        <Btn onClick={submit} disabled={loading || !name.trim()} fullWidth>
          {loading ? 'Oluşturuluyor...' : charType==='page' ? 'Sayfa Oluştur' : 'Karakter Oluştur'}
        </Btn>
      </div>
    </Modal>
  )
}
