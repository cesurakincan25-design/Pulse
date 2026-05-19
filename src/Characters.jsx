import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../lib/auth'
import { Avatar, Btn, Modal, Badge, ImageUpload, toast, Spinner, Icon, EmojiPicker } from './ui'
import { EmojiTextarea, EmojiInput, PostModal } from './Feed'
import { supabase } from '../lib/supabase'

// ── Karakter Seçici Overlay ────────────────────────────────────────
export const CharacterSwitcher = ({ onSelect }) => {
  const { characters, profile, switchCharacter, refreshCharacters } = useAuth()
  const [showNew, setShowNew]   = useState(false)
  const [editChar, setEditChar] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [hover, setHover]       = useState(null)

  const deleteChar = async char => {
    await supabase.from('characters').delete().eq('id', char.id)
    toast(`${char.name} silindi`)
    setConfirmDel(null); refreshCharacters()
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, background:'var(--bg)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'-15%', left:'50%', transform:'translateX(-50%)', width:'80vw', height:'60vh', background:'radial-gradient(ellipse, var(--rose-100) 0%, transparent 65%)', opacity:.4 }} />
      </div>
      <div style={{ position:'relative', zIndex:1, textAlign:'center', marginBottom:40 }}>
        <div style={{ fontSize:42, marginBottom:8 }}>💗</div>
        <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:-1, color:'var(--text-primary)' }}>Merhaba, {profile?.display_name}!</h1>
        <p style={{ color:'var(--text-muted)', marginTop:6, fontSize:15, fontStyle:'italic' }}>What's your Pulse today?</p>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:18, justifyContent:'center', maxWidth:820, position:'relative', zIndex:1 }}>
        {characters.map(char => (
          <div key={char.id} onMouseEnter={()=>setHover(char.id)} onMouseLeave={()=>setHover(null)}
            style={{ width:155, background:'var(--bg-card)', border:`2px solid ${hover===char.id?'var(--accent)':'var(--border)'}`, borderRadius:18, padding:'18px 12px 14px', textAlign:'center', transition:'all .2s', transform:hover===char.id?'translateY(-4px)':'none', boxShadow:hover===char.id?'var(--shadow-rose)':'var(--shadow-sm)', position:'relative' }}>
            {hover===char.id && (
              <div style={{ position:'absolute', top:8, right:8, display:'flex', gap:3 }} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>setEditChar(char)} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, padding:'3px 7px', fontSize:11, cursor:'pointer', color:'var(--text-muted)' }}><Icon name="pen" /></button>
                <button onClick={()=>setConfirmDel(char)} style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:6, padding:'3px 7px', fontSize:11, cursor:'pointer', color:'#b91c1c' }}><Icon name="trash" /></button>
              </div>
            )}
            <div style={{ cursor:'pointer' }} onClick={()=>{ switchCharacter(char); onSelect?.() }}>
              <Avatar name={char.display_name||char.name} src={char.avatar_url} size={68} ring={hover===char.id} />
              <div style={{ fontWeight:800, fontSize:14, color:'var(--text-primary)', marginTop:12, lineHeight:1.3 }}>{char.display_name||char.name}</div>
              {char.name !== (char.display_name||char.name) && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{char.name}</div>}
              {char.tagline && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, lineHeight:1.4 }}>{char.tagline}</div>}
            </div>
          </div>
        ))}
        <div onMouseEnter={()=>setHover('new')} onMouseLeave={()=>setHover(null)} onClick={()=>setShowNew(true)}
          style={{ width:155, background:'var(--bg-card)', border:`2px dashed ${hover==='new'?'var(--accent)':'var(--border)'}`, borderRadius:18, padding:'24px 12px', textAlign:'center', cursor:'pointer', transition:'all .2s', transform:hover==='new'?'translateY(-4px)':'none' }}>
          <div style={{ width:68, height:68, borderRadius:'50%', background:'var(--accent-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto', color:'var(--accent)' }}>+</div>
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text-muted)', marginTop:12 }}>Yeni Karakter</div>
        </div>
      </div>
      <NewCharacterModal open={showNew} onClose={()=>setShowNew(false)} onCreated={()=>{ setShowNew(false); refreshCharacters() }} />
      <EditCharacterModal char={editChar} onClose={()=>setEditChar(null)} onSaved={()=>{ setEditChar(null); refreshCharacters() }} />
      <Modal open={!!confirmDel} onClose={()=>setConfirmDel(null)} title="Karakteri Sil" width={360}>
        <p style={{ color:'var(--text-secondary)', fontSize:14, marginBottom:18 }}><strong>{confirmDel?.display_name||confirmDel?.name}</strong> silinsin mi?</p>
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" fullWidth onClick={()=>setConfirmDel(null)}>İptal</Btn>
          <Btn variant="danger" fullWidth onClick={()=>deleteChar(confirmDel)}>Sil</Btn>
        </div>
      </Modal>
    </div>
  )
}

// ── Header Dropdown ────────────────────────────────────────────────
export const CharacterDropdown = ({ onViewProfile }) => {
  const { activeChar, characters, switchCharacter, refreshCharacters } = useAuth()
  const [open, setOpen]         = useState(false)
  const [editChar, setEditChar] = useState(null)
  const [showNew, setShowNew]   = useState(false)

  return (
    <div style={{ position:'relative' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg-hover)', border:'1px solid var(--border)', borderRadius:'var(--radius-full)', padding:'5px 11px 5px 5px', cursor:'pointer', fontFamily:'var(--font-ui)', transition:'border-color .2s' }}>
        <Avatar name={activeChar?.display_name||activeChar?.name} src={activeChar?.avatar_url} size={26} />
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activeChar?.display_name||activeChar?.name}</span>
        <span style={{ fontSize:9, color:'var(--text-muted)', transform:open?'rotate(180deg)':'none', transition:'transform .2s' }}>▼</span>
      </button>
      {open && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:49 }} onClick={()=>setOpen(false)} />
          <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-md)', minWidth:220, zIndex:50, overflow:'hidden', animation:'fadeDown .15s ease' }}>
            <div style={{ padding:'9px 14px 5px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:.5, textTransform:'uppercase' }}>Pulse Kimliğin</div>
            {characters.map(c => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', background:activeChar?.id===c.id?'var(--accent-soft)':'transparent', transition:'background .15s' }}
                onMouseEnter={e=>{ if(activeChar?.id!==c.id) e.currentTarget.style.background='var(--bg-hover)' }}
                onMouseLeave={e=>{ if(activeChar?.id!==c.id) e.currentTarget.style.background=activeChar?.id===c.id?'var(--accent-soft)':'transparent' }}>
                <div style={{ flex:1, display:'flex', alignItems:'center', gap:9, cursor:'pointer', minWidth:0 }} onClick={()=>{ switchCharacter(c); setOpen(false) }}>
                  <Avatar name={c.display_name||c.name} src={c.avatar_url} size={30} ring={activeChar?.id===c.id} />
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.display_name||c.name}</div>
                    {c.tagline && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.tagline}</div>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                  <button onClick={e=>{ e.stopPropagation(); setEditChar(c); setOpen(false) }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, padding:3, color:'var(--text-muted)' }}><Icon name="pen" /></button>
                  {onViewProfile && <button onClick={e=>{ e.stopPropagation(); onViewProfile(c); setOpen(false) }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, padding:3, color:'var(--text-muted)' }}><Icon name="user" /></button>}
                </div>
              </div>
            ))}
            <div style={{ borderTop:'var(--divider)', padding:'5px 8px' }}>
              <button onClick={()=>{ setShowNew(true); setOpen(false) }} style={{ width:'100%', padding:'7px 10px', background:'none', border:'none', color:'var(--accent-text)', fontWeight:700, fontSize:12, cursor:'pointer', borderRadius:8, textAlign:'left', fontFamily:'var(--font-ui)' }}>+ Yeni Karakter Ekle</button>
            </div>
          </div>
        </>
      )}
      <EditCharacterModal char={editChar} onClose={()=>setEditChar(null)} onSaved={()=>{ setEditChar(null); refreshCharacters() }} />
      <NewCharacterModal open={showNew} onClose={()=>setShowNew(false)} onCreated={()=>{ setShowNew(false); refreshCharacters() }} />
    </div>
  )
}

// ── Yeni Karakter ──────────────────────────────────────────────────
export const NewCharacterModal = ({ open, onClose, onCreated }) => {
  const { player } = useAuth()
  const [f, setF] = useState({ name:'', display_name:'', tagline:'', charType:'character', avatarUrl:'' })
  const [loading, setLoading] = useState(false)
  const upd = (k,v) => setF(p=>({...p,[k]:v}))

  const submit = async () => {
    if (!f.name.trim()) return
    setLoading(true)
    const { error } = await supabase.from('characters').insert({ player_id:player.id, name:f.name.trim(), display_name:f.display_name.trim()||null, tagline:f.tagline.trim()||null, char_type:f.charType, avatar_url:f.avatarUrl||null })
    setLoading(false)
    if (error) { toast('Hata: '+error.message,'error'); return }
    toast('Karakter oluşturuldu! ✨')
    setF({ name:'', display_name:'', tagline:'', charType:'character', avatarUrl:'' }); onCreated?.()
  }

  return (
    <Modal open={open} onClose={onClose} title="Yeni Karakter / Sayfa">
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['character','🧙 Karakter'],['page','🏢 Sayfa']].map(([v,l]) => (
          <button key={v} onClick={()=>upd('charType',v)} style={{ flex:1, padding:9, border:`2px solid ${f.charType===v?'var(--accent)':'var(--border)'}`, borderRadius:'var(--radius-md)', background:f.charType===v?'var(--accent-soft)':'var(--bg)', color:f.charType===v?'var(--accent-text)':'var(--text-secondary)', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'all .15s' }}>{l}</button>
        ))}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
        <ImageUpload bucket="avatars" path={`char-${player?.id}-new`} onUploaded={v=>upd('avatarUrl',v)} style={{ alignSelf:'center' }}>
          <div style={{ position:'relative', cursor:'pointer' }}>
            <Avatar name={f.display_name||f.name||'?'} src={f.avatarUrl} size={76} />
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#fff', opacity:0, transition:'opacity .2s' }} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0}><Icon name="camera" style={{ fontSize:20, color:'#fff' }} /></div>
          </div>
          <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', marginTop:5 }}>Fotoğraf yükle</p>
        </ImageUpload>
        <div>
          <label style={lbl}>Karakter Adı (Gerçek İsim) *</label>
          <input value={f.name} onChange={e=>upd('name',e.target.value)} placeholder="örn: Lalisa Manobal" />
        </div>
        <div>
          <label style={lbl}>Görünen İsim / Nick</label>
          <input value={f.display_name} onChange={e=>upd('display_name',e.target.value)} placeholder="örn: Lisa" />
        </div>
        <div>
          <label style={lbl}>Meslek / Lakap</label>
          <input value={f.tagline} onChange={e=>upd('tagline',e.target.value)} placeholder="örn: Racing Driver" />
        </div>
        <Btn onClick={submit} disabled={loading||!f.name.trim()} fullWidth>{loading?'Oluşturuluyor...':f.charType==='page'?'Sayfa Oluştur':'Karakter Oluştur'}</Btn>
      </div>
    </Modal>
  )
}

// ── Karakter Düzenleme ─────────────────────────────────────────────
export const EditCharacterModal = ({ char, onClose, onSaved }) => {
  const [name,         setName]         = useState('')
  const [displayName,  setDisplayName]  = useState('')
  const [tagline,      setTagline]      = useState('')
  const [quote,        setQuote]        = useState('')
  const [bio,          setBio]          = useState('')
  const [location,     setLocation]     = useState('')
  const [occupation,   setOccupation]   = useState('')
  const [gender,       setGender]       = useState('')
  const [relationship, setRelationship] = useState('')
  const [birthDate,    setBirthDate]    = useState('')
  const [avatarUrl,    setAvatarUrl]    = useState('')
  const [bannerUrl,    setBannerUrl]    = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('basic')

  useEffect(() => {
    if (!char) return
    setName(char.name||'')
    setDisplayName(char.display_name||'')
    setTagline(char.tagline||'')
    setQuote(char.quote||'')
    setBio(char.bio||'')
    setLocation(char.location||'')
    setOccupation(char.occupation||'')
    setGender(char.gender||'')
    setRelationship(char.relationship||'')
    setBirthDate(char.birth_date||'')
    setAvatarUrl(char.avatar_url||'')
    setBannerUrl(char.banner_url||'')
    setTab('basic')
  }, [char?.id])

  const save = async () => {
    if (!name.trim()) return
    setLoading(true)
    const { error } = await supabase.from('characters').update({
      name: name.trim(), display_name: displayName||null, tagline: tagline||null,
      quote: quote||null, bio: bio||null, location: location||null,
      occupation: occupation||null, gender: gender||null,
      relationship: relationship||null, birth_date: birthDate||null,
      avatar_url: avatarUrl||null, banner_url: bannerUrl||null,
    }).eq('id', char.id)
    setLoading(false)
    if (error) { toast('Hata: '+error.message,'error'); return }
    toast('Kaydedildi! ✅'); onSaved?.()
  }

  const tabs = [['basic','Temel'],['details','Detaylar'],['media','Görseller']]

  return (
    <Modal open={!!char} onClose={onClose} title={`Düzenle — ${char?.display_name||char?.name||''}`} width={520}>
      <div style={{ display:'flex', gap:3, marginBottom:14, background:'var(--bg)', borderRadius:'var(--radius-md)', padding:3, border:'1px solid var(--border)' }}>
        {tabs.map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{ flex:1, padding:'7px 8px', borderRadius:7, border:'none', background:tab===v?'var(--bg-card)':'transparent', color:tab===v?'var(--text-primary)':'var(--text-muted)', fontWeight:tab===v?700:500, fontSize:12, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'all .15s', boxShadow:tab===v?'var(--shadow-sm)':'none' }}>{l}</button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
        {tab==='basic' && <>
          <Lbl t="Karakter Adı (Gerçek İsim) *"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Lalisa Manobal" /></Lbl>
          <Lbl t="Görünen İsim / Nick"><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Lisa" /></Lbl>
          <Lbl t="Meslek / Lakap"><input value={tagline} onChange={e=>setTagline(e.target.value)} placeholder="International Assassin" /></Lbl>
          <Lbl t="Alıntı / Motto"><input value={quote} onChange={e=>setQuote(e.target.value)} placeholder='"Consistency defines everything."' /></Lbl>
          <Lbl t="Biyografi">
            <div style={{ position:'relative' }}>
              <textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="Karakter hakkında..." style={{ minHeight:80, resize:'vertical', paddingBottom:32 }} />
              <div style={{ position:'absolute', bottom:8, right:8 }} onMouseDown={e=>e.preventDefault()}>
                <EmojiPicker onSelect={e=>setBio(p=>p+e)} />
              </div>
            </div>
          </Lbl>
        </>}
        {tab==='details' && <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
            <Lbl t="Şehir / Konum"><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Tokyo, Shibuya" /></Lbl>
            <Lbl t="Meslek"><input value={occupation} onChange={e=>setOccupation(e.target.value)} placeholder="Racing Driver" /></Lbl>
            <Lbl t="Cinsiyet"><input value={gender} onChange={e=>setGender(e.target.value)} placeholder="Kadın / Erkek" /></Lbl>
            <Lbl t="İlişki Durumu"><input value={relationship} onChange={e=>setRelationship(e.target.value)} placeholder="Bekar" /></Lbl>
            <Lbl t="Doğum Tarihi"><input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} /></Lbl>
          </div>
        </>}
        {tab==='media' && <>
          <Lbl t="Profil Fotoğrafı">
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <Avatar name={displayName||name} src={avatarUrl} size={64} />
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                <ImageUpload bucket="avatars" path={`avatar-${char?.id}`} onUploaded={setAvatarUrl}>
                  <Btn variant="soft" size="sm"><Icon name="upload" style={{marginRight:5}} />Yükle</Btn>
                </ImageUpload>
                <input value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} placeholder="veya resim linki" style={{ fontSize:12, height:30 }} />
              </div>
            </div>
          </Lbl>
          <Lbl t="Banner">
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              {bannerUrl
                ? <img src={bannerUrl} style={{ height:52, width:130, objectFit:'cover', borderRadius:8, border:'1px solid var(--border)', flexShrink:0 }} />
                : <div style={{ height:52, width:130, borderRadius:8, background:'var(--bg)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>Banner yok</div>
              }
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                <ImageUpload bucket="banners" path={`banner-${char?.id}`} onUploaded={setBannerUrl}>
                  <Btn variant="soft" size="sm"><Icon name="upload" style={{marginRight:5}} />Yükle</Btn>
                </ImageUpload>
                <input value={bannerUrl} onChange={e=>setBannerUrl(e.target.value)} placeholder="veya banner linki" style={{ fontSize:12, height:30 }} />
              </div>
            </div>
          </Lbl>
        </>}
        <Btn onClick={save} disabled={loading||!name.trim()} fullWidth>{loading?'Kaydediliyor...':'Kaydet'}</Btn>
      </div>
    </Modal>
  )
}

const Lbl = ({ t, children }) => (
  <div>
    <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:4 }}>{t}</label>
    {children}
  </div>
)


// ── Karakter Profil Sayfası ────────────────────────────────────────
export const CharacterProfile = ({ char: initialChar, onBack, onViewProfile, friendStatus, onSendFriend }) => {
  const { player, profile: myProfile, refreshCharacters } = useAuth()
  const [char, setChar]         = useState(initialChar)
  const [posts, setPosts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [gridView, setGridView] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const isOwner = char.player_id === player?.id
  const isAdmin = myProfile?.role === 'admin'

  useEffect(() => { setChar(initialChar); loadPosts(initialChar.id) }, [initialChar.id])

  const loadPosts = async id => {
    setLoading(true)
    const { data } = await supabase.from('posts').select('*, characters(id,name,display_name,avatar_url), players(username)').eq('character_id',id).is('parent_id',null).order('created_at',{ascending:false}).limit(50)
    setPosts(data||[]); setLoading(false)
  }

  const deletePost = async id => {
    if (!confirm('Gönderiyi sil?')) return
    await supabase.from('posts').delete().eq('id',id)
    setPosts(p=>p.filter(x=>x.id!==id)); toast('Gönderi silindi')
  }

  const calcAge = d => { if(!d) return null; return Math.floor((Date.now()-new Date(d))/(365.25*24*3600*1000)) }
  const displayName = char.display_name || char.name
  const TYPE_C = {rp:'lavender',ooc:'gold',post:'rose',lore:'mint'}
  const TYPE_L = {rp:'🎭 RP',ooc:'💬 OOC',post:'💗 Pulse',lore:'📖 Lore'}

  return (
    <div>
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, marginBottom:14, fontFamily:'var(--font-ui)', padding:0 }}>
        <Icon name="arrow-left" /> Geri
      </button>

      {/* Banner + Avatar */}
      <div style={{ background:'var(--bg-card)', borderBottom:'var(--divider)', marginBottom:1 }}>
        <div style={{ height:200, background:char.banner_url?'none':'linear-gradient(135deg,var(--rose-100),var(--rose-200))', position:'relative', overflow:'hidden' }}>
          {char.banner_url && <img src={char.banner_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
          <div style={{ position:'absolute', top:12, right:12, display:'flex', gap:7 }}>
            {!isOwner && friendStatus && (() => {
              const st = friendStatus(char.id)
              if (st==='friend') return <span style={{ background:'rgba(34,197,94,.8)', backdropFilter:'blur(6px)', border:'none', borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:700, color:'#fff' }}>✓ Arkadaş</span>
              if (st==='pending_sent') return <span style={{ background:'rgba(0,0,0,.5)', backdropFilter:'blur(6px)', border:'1px solid rgba(255,255,255,.2)', borderRadius:20, padding:'6px 14px', fontSize:12, color:'rgba(255,255,255,.7)' }}>İstek Gönderildi</span>
              return (
                <button onClick={()=>onSendFriend?.(char.id)} style={{ background:'rgba(249,100,142,.8)', backdropFilter:'blur(6px)', border:'none', borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-ui)', color:'#fff', display:'flex', alignItems:'center', gap:6 }}>
                  <Icon name="user-plus" style={{ color:'#fff' }} /> Arkadaş Ekle
                </button>
              )
            })()}
            {(isOwner||isAdmin) && (
              <button onClick={()=>setShowEdit(true)} style={{ background:'rgba(0,0,0,.5)', backdropFilter:'blur(6px)', border:'1px solid rgba(255,255,255,.2)', borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-ui)', color:'#fff', display:'flex', alignItems:'center', gap:6 }}>
                <Icon name="pen" style={{ color:'#fff' }} /> Düzenle
              </button>
            )}
          </div>
        </div>
        <div style={{ padding:'0 24px 20px' }}>
          <div style={{ marginTop:-44, marginBottom:12, position:'relative', zIndex:2 }}>
            <div style={{ border:'4px solid var(--bg-card)', borderRadius:'50%', display:'inline-block' }}>
              <Avatar name={displayName} src={char.avatar_url} size={88} />
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)', margin:0 }}>{displayName}</h1>
              {char.display_name && char.name !== char.display_name && <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:1 }}>{char.name}</div>}
              {char.tagline && <p style={{ fontSize:13, color:'var(--text-muted)', margin:'4px 0 0' }}>{char.tagline}</p>}
              {char.quote && <p style={{ fontSize:13, color:'var(--text-secondary)', margin:'8px 0 0', fontStyle:'italic', fontFamily:'var(--font-rp)' }}>"{char.quote}"</p>}
            </div>
            <Badge color={char.char_type==='page'?'blue':'rose'}>{char.char_type==='page'?<><Icon name="building" style={{marginRight:4}}/>Sayfa</>:<><Icon name="user" style={{marginRight:4}}/>Karakter</>}</Badge>
          </div>

          {/* Bio */}
          {char.bio && <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:12, lineHeight:1.65, padding:'12px 0', borderTop:'var(--divider)', borderBottom:'var(--divider)', marginBottom:0 }}>{char.bio}</p>}

          {/* Profil detayları */}
          {(char.occupation||char.location||char.gender||char.birth_date||char.relationship) && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 18px', marginTop:12 }}>
              {char.occupation   && <Info icon="briefcase" text={char.occupation} />}
              {char.location     && <Info icon="location-dot" text={char.location} />}
              {char.gender       && <Info icon="venus-mars" text={char.gender} />}
              {char.birth_date   && <Info icon="cake-candles" text={`${new Date(char.birth_date).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})}${calcAge(char.birth_date)?` · ${calcAge(char.birth_date)} yaşında`:''}` } />}
              {char.relationship && <Info icon="heart" text={char.relationship} />}
            </div>
          )}

          <div style={{ display:'flex', gap:20, marginTop:14, paddingTop:14, borderTop:'var(--divider)', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}><strong style={{ color:'var(--text-primary)', fontWeight:700 }}>{posts.length}</strong> gönderi</span>
            <div style={{ display:'flex', gap:3, background:'var(--bg)', borderRadius:7, padding:3, border:'1px solid var(--border)' }}>
              <button onClick={()=>setGridView(false)} style={{ padding:'4px 10px', borderRadius:5, border:'none', background:!gridView?'var(--bg-card)':'transparent', cursor:'pointer', color:!gridView?'var(--text-primary)':'var(--text-muted)' }}><Icon name="bars" /></button>
              <button onClick={()=>setGridView(true)}  style={{ padding:'4px 10px', borderRadius:5, border:'none', background:gridView?'var(--bg-card)':'transparent', cursor:'pointer', color:gridView?'var(--text-primary)':'var(--text-muted)' }}><Icon name="grid-2" /></button>
            </div>
          </div>
        </div>
      </div>

      {gridView ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginTop:2 }}>
          {posts.map(p => (
            <div key={p.id} onClick={()=>setGridView(false)} style={{ aspectRatio:'1', overflow:'hidden', cursor:'pointer', background:'var(--bg-card)', position:'relative' }}>
              {p.image_url ? <img src={p.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <div style={{ padding:10, fontSize:12, color:'var(--text-secondary)', lineHeight:1.5, height:'100%', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', overflow:'hidden' }}>{p.content?.slice(0,60)}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div>
          {loading && <div style={{ textAlign:'center', padding:32 }}><Spinner /></div>}
          {!loading && posts.length===0 && <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}><div style={{ fontSize:36, marginBottom:10 }}>💗</div><p>Henüz Pulse yok.</p></div>}
          {posts.map(p => (
            <div key={p.id} style={{ background:'var(--bg-card)', borderBottom:'var(--divider)', padding:'14px 20px' }}>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ cursor:'pointer' }} onClick={()=>onViewProfile?.(p.characters)}><Avatar name={p.characters?.display_name||p.characters?.name} src={p.characters?.avatar_url} size={38} /></div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:5 }}>
                    <span style={{ fontWeight:800, fontSize:13, color:'var(--accent-text)', cursor:'pointer' }} onClick={()=>onViewProfile?.(p.characters)}>{p.characters?.display_name||p.characters?.name}</span>
                    {p.characters?.display_name && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{p.characters?.name}</span>}
                    <Badge color={TYPE_C[p.post_type]||'rose'} size="xs">{TYPE_L[p.post_type]||'💗'}</Badge>
                    <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:'auto' }}>{new Date(p.created_at).toLocaleDateString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                    {(isOwner||isAdmin) && <>
                      <button onClick={()=>{ const nc=prompt('Gönderiyi düzenle:',p.content); if(nc&&nc!==p.content){ supabase.from('posts').update({content:nc}).eq('id',p.id).then(()=>{ setPosts(prev=>prev.map(x=>x.id===p.id?{...x,content:nc}:x)); toast('Güncellendi ✅') }) } }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--text-muted)', padding:'2px 4px' }}><Icon name="pen" /></button>
                      <button onClick={()=>deletePost(p.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#e05', padding:'2px 4px' }}><Icon name="trash" /></button>
                    </>}
                  </div>
                  <p style={{ fontSize:13.5, lineHeight:1.7, color:'var(--text-secondary)', margin:'0 0 8px', fontFamily:p.post_type==='rp'?'var(--font-rp)':'var(--font-ui)' }}>{p.content}</p>
                  {p.image_url && (
                    <div onClick={()=>setSelectedPost(p)} style={{ cursor:'pointer', marginBottom:8, borderRadius:8, overflow:'hidden' }}>
                      <img src={p.image_url} alt="" style={{ width:'100%', maxHeight:400, objectFit:'cover', display:'block', objectPosition:'center top' }} />
                    </div>
                  )}
                  <div style={{ display:'flex', gap:14, fontSize:12, color:'var(--text-muted)' }}>
                    <span><Icon name="heart" style={{marginRight:4}} />{p.likes_count}</span>
                    <span><Icon name="comment" style={{marginRight:4}} />{p.comments_count}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <EditCharacterModal char={showEdit?char:null} onClose={()=>setShowEdit(false)} onSaved={async()=>{ setShowEdit(false); const {data}=await supabase.from('characters').select('*').eq('id',char.id).single(); if(data) setChar(data); refreshCharacters() }} />
      {selectedPost && <PostModal post={selectedPost} onClose={()=>setSelectedPost(null)} onViewProfile={onViewProfile} onReact={()=>{}} onDelete={async id=>{ await supabase.from('posts').delete().eq('id',id); setPosts(p=>p.filter(x=>x.id!==id)); setSelectedPost(null) }} canEdit={isOwner||isAdmin} player={player} />}
    </div>
  )
}

const Info = ({ icon, text }) => (
  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--text-secondary)' }}>
    <Icon name={icon} style={{ color:'var(--text-muted)', fontSize:13 }} /> {text}
  </div>
)

const lbl = { fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:4 }
