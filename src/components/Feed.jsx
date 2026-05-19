import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, uploadFile } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar, Btn, Badge, Spinner, timeAgo, toast, ImageUpload, Icon, EmojiPicker } from './ui'

const TYPE_META = {
  rp:   { label:'RP Sahnesi', color:'lavender', icon:'masks-theater' },
  ooc:  { label:'OOC',        color:'gold',     icon:'comment' },
  post: { label:'Pulse',      color:'rose',     icon:'heart' },
  lore: { label:'Lore',       color:'mint',     icon:'book' },
}
const REACTIONS = ['💗','❤️','😂','😢','😡','🎉']
const REACTION_LABELS = {'💗':'Beğen','❤️':'Sevdim','😂':'Haha','😢':'Üzgün','😡':'Kızgın','🎉':'Yay!'}

const detectEmbed = text => {
  if (!text) return null
  const yt = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)
  if (yt) return { type:'youtube', id:yt[1] }
  const sp = text.match(/open\.spotify\.com\/(track|playlist|album|episode)\/([\w]+)/)
  if (sp) return { type:'spotify', kind:sp[1], id:sp[2] }
  return null
}

const EmbedPlayer = ({ embed }) => {
  if (!embed) return null
  if (embed.type==='youtube') return (
    <div style={{ borderRadius:10, overflow:'hidden', marginTop:10, aspectRatio:'16/9' }}>
      <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${embed.id}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ display:'block' }} />
    </div>
  )
  if (embed.type==='spotify') return (
    <div style={{ borderRadius:10, overflow:'hidden', marginTop:10 }}>
      <iframe src={`https://open.spotify.com/embed/${embed.kind}/${embed.id}`} width="100%" height={embed.kind==='track'?80:152} frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" style={{ display:'block' }} />
    </div>
  )
  return null
}

// ── Smart Image — Instagram tarzı boyutlandırma ───────────────────
const SmartImage = ({ src, onClick }) => {
  const [dims, setDims] = useState(null)
  const onLoad = e => {
    const w = e.target.naturalWidth, h = e.target.naturalHeight
    setDims({ w, h, ratio: h/w })
  }
  // Portrait: max 500px yükseklik, Landscape: max 420px yükseklik
  const isPortrait = dims && dims.ratio > 1
  const maxH = isPortrait ? 500 : 420
  return (
    <div onClick={onClick} style={{ marginTop:10, borderRadius:10, overflow:'hidden', background:'#000', cursor:onClick?'pointer':'default', display:'inline-block', width:'100%', lineHeight:0 }}>
      <img src={src} alt="" onLoad={onLoad}
        style={{ width:'100%', maxHeight:maxH, objectFit:'contain', display:'block', background:'#000' }} />
    </div>
  )
}

// ── Emoji Textarea (focus kaybetmez) ──────────────────────────────
export const EmojiTextarea = ({ value, onChange, placeholder, style={}, minHeight=90 }) => {
  const ref = useRef()
  const insertEmoji = useCallback(emoji => {
    const el = ref.current; if (!el) return
    const start = el.selectionStart, end = el.selectionEnd
    const newVal = value.slice(0,start) + emoji + value.slice(end)
    onChange(newVal)
    requestAnimationFrame(()=>{ if(el) { el.focus(); el.setSelectionRange(start+emoji.length, start+emoji.length) } })
  }, [value, onChange])

  return (
    <div style={{ position:'relative' }}>
      <textarea ref={ref} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ minHeight, resize:'vertical', borderRadius:8, fontSize:14, lineHeight:1.7, paddingBottom:34, ...style }} />
      <div style={{ position:'absolute', bottom:8, right:8 }} onMouseDown={e=>e.preventDefault()}>
        <EmojiPicker onSelect={insertEmoji} />
      </div>
    </div>
  )
}

export const EmojiInput = ({ value, onChange, placeholder, style={} }) => {
  const ref = useRef()
  const insertEmoji = useCallback(emoji => {
    const el = ref.current; if (!el) return
    const start = el.selectionStart, end = el.selectionEnd
    const newVal = value.slice(0,start) + emoji + value.slice(end)
    onChange(newVal)
    requestAnimationFrame(()=>{ if(el) { el.focus(); el.setSelectionRange(start+emoji.length, start+emoji.length) } })
  }, [value, onChange])

  return (
    <div style={{ position:'relative' }}>
      <input ref={ref} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ paddingRight:38, ...style }} />
      <div style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)' }} onMouseDown={e=>e.preventDefault()}>
        <EmojiPicker onSelect={insertEmoji} />
      </div>
    </div>
  )
}

// ── Composer ─────────────────────────────────────────────────────
export const PostComposer = ({ onPosted }) => {
  const { activeChar, player } = useAuth()
  const [content, setContent]   = useState('')
  const [type, setType]         = useState('post')
  const [imageUrl, setImageUrl] = useState('')
  const [imgMode, setImgMode]   = useState(null)
  const [linkInput, setLinkInput] = useState('')
  const [linkError, setLinkError] = useState('')
  const [loading, setLoading]   = useState(false)
  const embed = detectEmbed(content)

  const applyLink = () => {
    const raw = linkInput.trim(); if (!raw) return
    const imgurPage = raw.match(/^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)$/)
    const url = imgurPage ? `https://i.imgur.com/${imgurPage[1]}.jpg` : raw
    if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url) && !url.includes('i.imgur.com') && !url.includes('cdn.discordapp') && !url.includes('pbs.twimg')) {
      setLinkError('Geçerli bir görsel URL\'si gir.'); return
    }
    setLinkError(''); setImageUrl(url); setLinkInput(''); setImgMode(null)
  }

  const submit = async () => {
    if (!content.trim() && !imageUrl) return
    setLoading(true)
    const { error } = await supabase.from('posts').insert({ player_id:player.id, character_id:activeChar?.id||null, content:content.trim(), image_url:imageUrl||null, post_type:type })
    setLoading(false)
    if (error) { toast('Hata: '+error.message,'error'); return }
    setContent(''); setImageUrl(''); setImgMode(null); onPosted?.()
  }

  return (
    <div style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border)', padding:'14px 16px' }}>
      <div style={{ display:'flex', gap:10 }}>
        <Avatar name={activeChar?.display_name||activeChar?.name} src={activeChar?.avatar_url} size={40} ring />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:5, fontWeight:600 }}>
            <span style={{ color:'var(--accent-text)' }}>{activeChar?.display_name||activeChar?.name||'Karakter seç'}</span> olarak paylaşıyorsun
          </div>
          <EmojiTextarea value={content} onChange={setContent} placeholder={type==='rp'?'Sahneyi yaz...':"What's your Pulse?"} style={{ fontFamily:type==='rp'?'var(--font-rp)':'var(--font-ui)' }} />
          {embed && <EmbedPlayer embed={embed} />}
          {imageUrl && (
            <div style={{ position:'relative', marginTop:8 }}>
              <SmartImage src={imageUrl} />
              <button onClick={()=>setImageUrl('')} style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,.7)', color:'#fff', border:'none', borderRadius:'50%', width:26, height:26, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
          )}
          {imgMode==='link' && !imageUrl && (
            <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:5 }}>
              <div style={{ display:'flex', gap:7 }}>
                <input autoFocus value={linkInput} onChange={e=>{ setLinkInput(e.target.value); setLinkError('') }} onKeyDown={e=>e.key==='Enter'&&applyLink()} placeholder="imgur.com/xxx veya .jpg linki" style={{ flex:1, height:34, fontSize:13 }} />
                <Btn size="sm" onClick={applyLink} disabled={!linkInput.trim()}>Ekle</Btn>
                <Btn size="sm" variant="ghost" onClick={()=>{ setImgMode(null); setLinkInput(''); }}>İptal</Btn>
              </div>
              {linkError && <p style={{ fontSize:11, color:'#e05', margin:0 }}>{linkError}</p>}
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, flexWrap:'wrap', gap:7 }}>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {Object.entries(TYPE_META).map(([k,v])=>(
                <button key={k} onClick={()=>setType(k)} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:'var(--radius-full)', border:`1px solid ${type===k?'var(--accent)':'var(--border)'}`, background:type===k?'var(--accent-soft)':'transparent', color:type===k?'var(--accent-text)':'var(--text-muted)', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'all .15s' }}>
                  <Icon name={v.icon} style={{ fontSize:11 }} /> {v.label}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
              {!imageUrl && <>
                <ImageUpload bucket="post-media" path={`post-${player?.id}`} onUploaded={url=>{ setImageUrl(url); setImgMode(null) }}>
                  <Btn variant="ghost" size="sm"><Icon name="upload" style={{marginRight:4}} />Yükle</Btn>
                </ImageUpload>
                <Btn variant="ghost" size="sm" onClick={()=>setImgMode(p=>p==='link'?null:'link')} style={{ borderColor:imgMode==='link'?'var(--accent)':undefined }}><Icon name="link" style={{marginRight:4}} />Link</Btn>
              </>}
              <Btn onClick={submit} disabled={loading||(!content.trim()&&!imageUrl)} size="sm">
                {loading?<Spinner size={13}/>:<><Icon name="paper-plane" style={{marginRight:4}} />Paylaş</>}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Reaction Picker ───────────────────────────────────────────────
const ReactionPicker = ({ myReaction, onReact }) => {
  const [open, setOpen] = useState(false)
  const timer = useRef(null)
  const show = () => { clearTimeout(timer.current); setOpen(true) }
  const hide = () => { timer.current = setTimeout(()=>setOpen(false), 300) }
  return (
    <div style={{ position:'relative' }} onMouseEnter={show} onMouseLeave={hide}>
      <button onClick={()=>onReact(myReaction==='💗'?null:'💗')}
        style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:'var(--radius-full)', border:'none', background:'transparent', color:myReaction?'var(--rose-400)':'var(--text-muted)', fontSize:13, fontWeight:myReaction?700:500, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'background .15s' }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        {myReaction||'💗'}
      </button>
      {open && (
        <div onMouseEnter={show} onMouseLeave={hide}
          style={{ position:'absolute', bottom:'100%', left:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-full)', padding:'5px 8px', display:'flex', gap:2, boxShadow:'var(--shadow-md)', zIndex:30, marginBottom:4, animation:'fadeIn .15s ease' }}>
          {REACTIONS.map(r=>(
            <button key={r} onClick={()=>{ onReact(myReaction===r?null:r); setOpen(false) }} title={REACTION_LABELS[r]}
              style={{ background:myReaction===r?'var(--accent-soft)':'none', border:'none', fontSize:20, cursor:'pointer', borderRadius:'50%', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', transition:'transform .1s' }}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.35)'}
              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Instagram tarzı Gönderi Modal ────────────────────────────────
export const PostModal = ({ post, onClose, onReact, onDelete, canEdit, onViewProfile, player }) => {
  const { activeChar } = useAuth()
  const [comments, setComments]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo]       = useState(null) // { id, charName }
  const [editing, setEditing]       = useState(false)
  const [editContent, setEditContent] = useState(post.content||'')
  const bottomRef = useRef()
  const commentRef = useRef()

  useEffect(()=>{
    loadComments()
    return ()=>{}
  },[post.id])

  const loadComments = async () => {
    const { data } = await supabase.from('posts')
      .select('*, characters(id,name,display_name,avatar_url), replies:posts(id,content,created_at,characters(id,name,display_name,avatar_url))')
      .eq('parent_id', post.id)
      .is('posts.parent_id', post.id)
      .order('created_at')
    setComments(data||[])
    setLoading(false)
  }

  // Basit: sadece direkt yorumları + reply_to_id ile çek
  const loadAllComments = async () => {
    const { data } = await supabase.from('posts')
      .select('*, characters(id,name,display_name,avatar_url)')
      .eq('parent_id', post.id)
      .order('created_at')
    setComments(data||[]); setLoading(false)
  }

  useEffect(()=>{ loadAllComments() },[post.id])

  const submitComment = async () => {
    if (!commentText.trim()) return
    const content = replyTo ? `@${replyTo.charName} ${commentText}` : commentText
    await supabase.from('posts').insert({ player_id:activeChar?.player_id, character_id:activeChar?.id, content, post_type:'post', parent_id:post.id, reply_to_id:replyTo?.id||null })
    setCommentText(''); setReplyTo(null); loadAllComments()
    requestAnimationFrame(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}))
  }

  const saveEdit = async () => {
    if (!editContent.trim()) return
    await supabase.from('posts').update({content:editContent}).eq('id',post.id)
    post.content=editContent; setEditing(false); toast('Güncellendi ✅')
  }

  const embed = detectEmbed(post.content)
  const charName = post.characters?.display_name||post.characters?.name||'?'
  const hasImage = post.image_url && !embed

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:800, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'var(--bg-card)', borderRadius:14, overflow:'hidden', display:'flex', width:'100%', maxWidth:hasImage?960:600, maxHeight:'92vh', boxShadow:'0 20px 60px rgba(0,0,0,.5)' }} onClick={e=>e.stopPropagation()}>

        {/* Sol: Görsel / içerik */}
        {hasImage && (
          <div style={{ flex:'0 0 55%', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', maxHeight:'92vh', overflow:'hidden' }}>
            <img src={post.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }} />
          </div>
        )}

        {/* Sağ: detay + yorumlar */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, maxHeight:'92vh' }}>
          {/* Header */}
          <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <div style={{ cursor:'pointer' }} onClick={()=>{ onViewProfile?.(post.characters); onClose() }}>
              <Avatar name={charName} src={post.characters?.avatar_url} size={38} />
            </div>
            <div style={{ flex:1 }}>
              <span style={{ fontWeight:800, fontSize:14, color:'var(--accent-text)', cursor:'pointer' }} onClick={()=>{ onViewProfile?.(post.characters); onClose() }}>{charName}</span>
              {post.characters?.display_name&&post.characters.name!==charName && <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:6 }}>{post.characters.name}</span>}
            </div>
            {canEdit && (
              <div style={{ display:'flex', gap:4 }}>
                <button onClick={()=>setEditing(e=>!e)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'4px 6px', borderRadius:6 }}><Icon name="pen" style={{ fontSize:13 }} /></button>
                <button onClick={()=>{ onDelete?.(post.id); onClose() }} style={{ background:'none', border:'none', cursor:'pointer', color:'#e05', padding:'4px 6px', borderRadius:6 }}><Icon name="trash" style={{ fontSize:13 }} /></button>
              </div>
            )}
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20, padding:'2px 6px', marginLeft:4 }}>×</button>
          </div>

          {/* İçerik (görsel yoksa burada) */}
          {(!hasImage) && (
            <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              {editing ? (
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  <EmojiTextarea value={editContent} onChange={setEditContent} placeholder="Düzenle..." minHeight={60} />
                  <div style={{ display:'flex', gap:7 }}>
                    <Btn size="sm" onClick={saveEdit}><Icon name="check" style={{marginRight:4}} />Kaydet</Btn>
                    <Btn size="sm" variant="ghost" onClick={()=>setEditing(false)}>İptal</Btn>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize:14, lineHeight:1.75, color:'var(--text-secondary)', margin:0, fontFamily:post.post_type==='rp'?'var(--font-rp)':'var(--font-ui)', wordBreak:'break-word' }}>{post.content}</p>
              )}
              {embed && <EmbedPlayer embed={embed} />}
            </div>
          )}

          {/* Yorumlar listesi */}
          <div style={{ flex:1, overflowY:'auto', padding:'10px 16px' }}>
            {/* Görsel varsa içerik başa */}
            {hasImage && post.content && (
              <div style={{ display:'flex', gap:9, marginBottom:14 }}>
                <Avatar name={charName} src={post.characters?.avatar_url} size={32} />
                <div>
                  <span style={{ fontWeight:700, fontSize:13, color:'var(--accent-text)' }}>{charName}</span>
                  <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:2, lineHeight:1.6, margin:0, fontFamily:post.post_type==='rp'?'var(--font-rp)':'var(--font-ui)' }}>{post.content}</p>
                </div>
              </div>
            )}
            {loading && <Spinner size={20} />}
            {comments.map(c=>{
              const cName = c.characters?.display_name||c.characters?.name||'?'
              return (
                <div key={c.id} style={{ display:'flex', gap:9, marginBottom:12 }}>
                  <div style={{ cursor:'pointer' }} onClick={()=>{ onViewProfile?.(c.characters); onClose() }}>
                    <Avatar name={cName} src={c.characters?.avatar_url} size={32} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, lineHeight:1.6 }}>
                      <span style={{ fontWeight:700, color:'var(--accent-text)', cursor:'pointer', marginRight:6 }} onClick={()=>{ onViewProfile?.(c.characters); onClose() }}>{cName}</span>
                      <span style={{ color:'var(--text-secondary)' }}>{c.content}</span>
                    </div>
                    <div style={{ display:'flex', gap:12, marginTop:4 }}>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
                      <button onClick={()=>{ setReplyTo({id:c.id, charName:cName}); commentRef.current?.focus() }} style={{ fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', fontWeight:600, fontFamily:'var(--font-ui)', padding:0 }}>Yanıtla</button>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reaksiyonlar + tarih */}
          <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ display:'flex', gap:4, marginBottom:8 }}>
              <ReactionPicker myReaction={post.myReaction} onReact={emoji=>onReact?.(post,emoji)} />
              <button style={{ background:'none', border:'none', cursor:'pointer', padding:'5px 8px', color:'var(--text-muted)', fontSize:14 }}><Icon name="comment" /></button>
              <button style={{ background:'none', border:'none', cursor:'pointer', padding:'5px 8px', color:'var(--text-muted)', fontSize:14 }}><Icon name="share" /></button>
            </div>
            {post.likes_count>0 && <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{post.likes_count} beğeni</p>}
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:0 }}>{timeAgo(post.created_at)}</p>
          </div>

          {/* Yorum yazma */}
          <div style={{ borderTop:'1px solid var(--border)', padding:'10px 14px', flexShrink:0 }}>
            {replyTo && (
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                <Icon name="reply" style={{ fontSize:11 }} />
                <span>@{replyTo.charName} yanıtlanıyor</span>
                <button onClick={()=>setReplyTo(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, padding:0, marginLeft:4 }}>×</button>
              </div>
            )}
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <Avatar name={activeChar?.display_name||activeChar?.name} src={activeChar?.avatar_url} size={28} />
              <div style={{ flex:1, position:'relative' }}>
                <input ref={commentRef} value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Yorum ekle..." style={{ height:36, paddingRight:72, fontSize:13 }} onKeyDown={e=>e.key==='Enter'&&submitComment()} />
                <div style={{ position:'absolute', right:38, top:'50%', transform:'translateY(-50%)' }} onMouseDown={e=>e.preventDefault()}>
                  <EmojiPicker onSelect={e=>setCommentText(p=>p+e)} />
                </div>
                <button onClick={submitComment} disabled={!commentText.trim()}
                  style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:commentText.trim()?'pointer':'default', color:commentText.trim()?'var(--accent)':'var(--text-muted)', fontWeight:700, fontSize:13, padding:'0 4px', fontFamily:'var(--font-ui)', opacity:commentText.trim()?1:.4 }}>
                  Paylaş
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Feed Post Card ────────────────────────────────────────────────
export const PostCard = ({ post, onReact, onComment, canEdit, onDelete, onViewProfile, onClick }) => {
  const meta = TYPE_META[post.post_type]||TYPE_META.post
  const embed = detectEmbed(post.content)
  const charName = post.characters?.display_name||post.characters?.name||'?'
  const charReal = post.characters?.display_name ? post.characters?.name : null

  const reactionSummary = () => {
    const c={}; (post.reactions||[]).forEach(r=>{ c[r.emoji]=(c[r.emoji]||0)+1 })
    return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,3)
  }

  return (
    <div style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border)' }}>
      <div style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ cursor:'pointer', flexShrink:0 }} onClick={()=>onViewProfile?.(post.characters)}>
            <Avatar name={charName} src={post.characters?.avatar_url} size={42} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:5 }}>
              <span style={{ fontWeight:800, fontSize:14, color:'var(--accent-text)', cursor:'pointer' }} onClick={()=>onViewProfile?.(post.characters)}>{charName}</span>
              {charReal && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{charReal}</span>}
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>@{post.players?.username}</span>
              <Badge color={meta.color} size="xs"><Icon name={meta.icon} style={{fontSize:10,marginRight:3}} />{meta.label}</Badge>
              <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:'auto' }}>{timeAgo(post.created_at)}</span>
              {canEdit && (
                <div style={{ display:'flex', gap:2 }}>
                  <button onClick={e=>{e.stopPropagation(); onClick?.(post)}} style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 5px', color:'var(--text-muted)', borderRadius:4 }} title="Düzenle"><Icon name="pen" style={{ fontSize:12 }} /></button>
                  <button onClick={e=>{e.stopPropagation(); onDelete?.(post.id)}} style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 5px', color:'#e05', borderRadius:4 }}><Icon name="trash" style={{ fontSize:12 }} /></button>
                </div>
              )}
            </div>

            {post.content && <p style={{ margin:'0 0 8px', fontSize:14, lineHeight:1.75, color:'var(--text-secondary)', fontFamily:post.post_type==='rp'?'var(--font-rp)':'var(--font-ui)', wordBreak:'break-word' }}>{post.content}</p>}
            {embed && <EmbedPlayer embed={embed} />}
            {post.image_url && !embed && <SmartImage src={post.image_url} onClick={()=>onClick?.(post)} />}

            {reactionSummary().length>0 && (
              <div style={{ display:'flex', gap:4, marginTop:8, marginBottom:4 }}>
                {reactionSummary().map(([emoji,count])=>(
                  <span key={emoji} style={{ fontSize:12, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:20, padding:'2px 8px', display:'flex', alignItems:'center', gap:3 }}>
                    {emoji} <span style={{ color:'var(--text-muted)', fontSize:11 }}>{count}</span>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:2, marginTop:6 }}>
              <ReactionPicker myReaction={post.myReaction} onReact={emoji=>onReact?.(post,emoji)} />
              <button onClick={()=>onClick?.(post)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:'var(--radius-full)', border:'none', background:'transparent', color:'var(--text-muted)', fontSize:13, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <Icon name="comment" style={{ fontSize:12 }} /> {post.comments_count}
              </button>
              <button style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:'var(--radius-full)', border:'none', background:'transparent', color:'var(--text-muted)', fontSize:13, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <Icon name="share" style={{ fontSize:12 }} /> Paylaş
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Feed ──────────────────────────────────────────────────────────
export const Feed = ({ onViewProfile }) => {
  const { player, activeChar, profile } = useAuth()
  const [posts, setPosts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [activePost, setActivePost] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('posts')
      .select('*, characters!inner(id,name,display_name,avatar_url,is_active), players(username,display_name)')
      .is('parent_id',null).eq('characters.is_active',true)
      .order('created_at',{ascending:false}).limit(60)
    const { data:rD } = await supabase.from('reactions').select('*').eq('player_id',player.id)
    const myR={}; (rD||[]).forEach(r=>{ myR[r.post_id]=r.emoji })
    const ids=(data||[]).map(p=>p.id)
    const { data:allR } = ids.length ? await supabase.from('reactions').select('post_id,emoji,player_id').in('post_id',ids) : {data:[]}
    const byPost={}; (allR||[]).forEach(r=>{ (byPost[r.post_id]=byPost[r.post_id]||[]).push(r) })
    setPosts((data||[]).map(p=>({...p, myReaction:myR[p.id]||null, reactions:byPost[p.id]||[]})))
    setLoading(false)
  }

  useEffect(()=>{
    load()
    const ch=supabase.channel('feed-rt').on('postgres_changes',{event:'INSERT',schema:'public',table:'posts',filter:'parent_id=is.null'},payload=>{
      supabase.from('posts').select('*, characters(id,name,display_name,avatar_url,is_active), players(username,display_name)').eq('id',payload.new.id).single()
        .then(({data})=>{ if(data&&data.characters?.is_active!==false) setPosts(p=>[{...data,myReaction:null,reactions:[]}, ...p]) })
    }).subscribe()
    return ()=>supabase.removeChannel(ch)
  },[])

  const handleReact = async (post, emoji) => {
    if (emoji===null) await supabase.from('reactions').delete().eq('post_id',post.id).eq('player_id',player.id)
    else await supabase.from('reactions').upsert({post_id:post.id,player_id:player.id,character_id:activeChar?.id,emoji},{onConflict:'post_id,player_id'})
    setPosts(prev=>prev.map(p=>{
      if(p.id!==post.id) return p
      const filtered=(p.reactions||[]).filter(r=>r.player_id!==player.id)
      const reactions=emoji?[...filtered,{post_id:p.id,player_id:player.id,emoji}]:filtered
      return {...p,myReaction:emoji,reactions,likes_count:reactions.length}
    }))
  }

  const handleDelete = async id => {
    if (!confirm('Gönderiyi sil?')) return
    await supabase.from('posts').delete().eq('id',id)
    setPosts(p=>p.filter(x=>x.id!==id)); toast('Gönderi silindi')
  }

  const openPost = post => setActivePost(post)

  return (
    <div>
      <PostComposer onPosted={load} />
      {loading && <div style={{ display:'flex', justifyContent:'center', padding:32 }}><Spinner /></div>}
      {!loading && posts.length===0 && (
        <div style={{ textAlign:'center', padding:'48px 16px', color:'var(--text-muted)', background:'var(--bg-card)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>💗</div>
          <p style={{ fontWeight:600 }}>Pulse Feed sessiz...</p>
        </div>
      )}
      {posts.map(post=>(
        <PostCard key={post.id} post={post}
          canEdit={post.player_id===player.id||profile?.role==='admin'}
          onReact={handleReact} onDelete={handleDelete} onComment={load}
          onViewProfile={onViewProfile} onClick={openPost} />
      ))}
      {activePost && (
        <PostModal post={activePost} onClose={()=>setActivePost(null)}
          onReact={(post,emoji)=>{ handleReact(post,emoji); setActivePost(p=>({...p,myReaction:emoji})) }}
          onDelete={id=>{ handleDelete(id); setActivePost(null) }}
          canEdit={activePost.player_id===player.id||profile?.role==='admin'}
          onViewProfile={onViewProfile} player={player} />
      )}
    </div>
  )
}
