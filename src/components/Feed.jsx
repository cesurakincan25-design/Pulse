import { useState, useEffect, useRef } from 'react'
import { supabase, uploadFile } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar, Btn, Badge, Spinner, timeAgo, toast, ImageUpload, Icon } from './ui'

const TYPE_META = {
  rp:   { label:'RP Sahnesi', color:'lavender', icon:'masks-theater' },
  ooc:  { label:'OOC',        color:'gold',     icon:'comment' },
  post: { label:'Pulse',      color:'rose',     icon:'heart' },
  lore: { label:'Lore',       color:'mint',     icon:'book' },
}

const REACTIONS = ['💗','❤️','😂','😢','😡','🎉']
const REACTION_LABELS = { '💗':'Beğen','❤️':'Sevdim','😂':'Haha','😢':'Üzgün','😡':'Kızgın','🎉':'Yay!' }

// ── Embed ─────────────────────────────────────────────────────────
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

  const clearImage = () => { setImageUrl(''); setImgMode(null); setLinkInput(''); setLinkError('') }

  const submit = async () => {
    if (!content.trim() && !imageUrl) return
    setLoading(true)
    const { error } = await supabase.from('posts').insert({ player_id:player.id, character_id:activeChar?.id||null, content:content.trim(), image_url:imageUrl||null, post_type:type })
    setLoading(false)
    if (error) { toast('Hata: '+error.message,'error'); return }
    setContent(''); clearImage(); onPosted?.()
  }

  return (
    <div style={{ background:'var(--bg-card)', borderBottom:'var(--divider)', padding:'14px 16px', marginBottom:1 }}>
      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
        <Avatar name={activeChar?.display_name||activeChar?.name} src={activeChar?.avatar_url} size={40} ring />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:5, fontWeight:600 }}>
            <span style={{ color:'var(--accent-text)' }}>{activeChar?.display_name||activeChar?.name||'Karakter seç'}</span> olarak Pulse'a yazıyorsun
          </div>
          <textarea value={content} onChange={e=>setContent(e.target.value)}
            placeholder={type==='rp'?'Sahneyi yaz...':"What's your Pulse?"}
            style={{ minHeight:82, resize:'vertical', borderRadius:8, fontFamily:type==='rp'?'var(--font-rp)':'var(--font-ui)', fontSize:14, lineHeight:1.7 }} />
          {embed && <EmbedPlayer embed={embed} />}
          {imageUrl && (
            <div style={{ position:'relative', marginTop:8, borderRadius:8, overflow:'hidden', maxHeight:200 }}>
              <img src={imageUrl} alt="" style={{ width:'100%', objectFit:'cover', display:'block' }} onError={e=>{ e.target.style.display='none'; setLinkError('Görsel yüklenemedi.') }} />
              <button onClick={clearImage} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:24, height:24, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
          )}
          {imgMode==='link' && !imageUrl && (
            <div style={{ marginTop:9, display:'flex', flexDirection:'column', gap:5 }}>
              <div style={{ display:'flex', gap:7 }}>
                <input autoFocus value={linkInput} onChange={e=>{ setLinkInput(e.target.value); setLinkError('') }} onKeyDown={e=>e.key==='Enter'&&applyLink()} placeholder="imgur.com/xxx veya .jpg linki" style={{ flex:1, height:34, fontSize:13 }} />
                <Btn size="sm" onClick={applyLink} disabled={!linkInput.trim()}>Ekle</Btn>
                <Btn size="sm" variant="ghost" onClick={()=>{ setImgMode(null); setLinkInput(''); setLinkError('') }}>İptal</Btn>
              </div>
              {linkError && <p style={{ fontSize:11, color:'#e05', margin:0 }}>{linkError}</p>}
              <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>💡 YouTube/Spotify linklerini metne yaz, otomatik embed olur.</p>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, flexWrap:'wrap', gap:7 }}>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {Object.entries(TYPE_META).map(([k,v]) => (
                <button key={k} onClick={()=>setType(k)} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 11px', borderRadius:'var(--radius-full)', border:`1px solid ${type===k?'var(--accent)':'var(--border)'}`, background:type===k?'var(--accent-soft)':'transparent', color:type===k?'var(--accent-text)':'var(--text-muted)', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'all .15s' }}>
                  <Icon name={v.icon} style={{ fontSize:11 }} /> {v.label}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
              {!imageUrl && <>
                <ImageUpload bucket="post-media" path={`post-${player?.id}`} onUploaded={url=>{ setImageUrl(url); setImgMode(null) }}>
                  <Btn variant="ghost" size="sm"><Icon name="upload" style={{marginRight:4}} />Yükle</Btn>
                </ImageUpload>
                <Btn variant="ghost" size="sm" onClick={()=>setImgMode(imgMode==='link'?null:'link')} style={{ borderColor:imgMode==='link'?'var(--accent)':undefined }}><Icon name="link" style={{marginRight:4}} />Link</Btn>
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

// ── Reaksiyon Picker ─────────────────────────────────────────────
const ReactionPicker = ({ myReaction, onReact }) => {
  const [open, setOpen] = useState(false)
  const timer = useRef(null)

  const show = () => { clearTimeout(timer.current); setOpen(true) }
  const hide = () => { timer.current = setTimeout(()=>setOpen(false), 200) }

  return (
    <div style={{ position:'relative' }} onMouseEnter={show} onMouseLeave={hide}>
      <button onClick={()=>onReact(myReaction==='💗'?null:'💗')}
        style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:'var(--radius-full)', border:'none', background:'transparent', color:myReaction?'var(--rose-400)':'var(--text-muted)', fontSize:13, fontWeight:myReaction?700:500, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'background .15s' }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        {myReaction||'💗'}
      </button>
      {open && (
        <div onMouseEnter={show} onMouseLeave={hide}
          style={{ position:'absolute', bottom:'100%', left:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-full)', padding:'5px 8px', display:'flex', gap:3, boxShadow:'var(--shadow-md)', zIndex:20, marginBottom:4, animation:'fadeIn .15s ease' }}>
          {REACTIONS.map(r => (
            <button key={r} onClick={()=>{ onReact(myReaction===r?null:r); setOpen(false) }} title={REACTION_LABELS[r]}
              style={{ background:myReaction===r?'var(--accent-soft)':'none', border:'none', fontSize:19, cursor:'pointer', borderRadius:'50%', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', transition:'transform .1s' }}
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

// ── Post Card ────────────────────────────────────────────────────
export const PostCard = ({ post, onReact, onComment, canEdit, onDelete, onViewProfile }) => {
  const { activeChar } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments]         = useState([])
  const [commentText, setCommentText]   = useState('')
  const [commentsLoaded, setLoaded]     = useState(false)
  const [editing, setEditing]           = useState(false)
  const [editContent, setEditContent]   = useState(post.content||'')
  const [saving, setSaving]             = useState(false)
  const embed = detectEmbed(post.content)
  const meta = TYPE_META[post.post_type]||TYPE_META.post

  const loadComments = async () => {
    if (commentsLoaded) return
    const { data } = await supabase.from('posts').select('*, characters(id,name,display_name,avatar_url)').eq('parent_id',post.id).order('created_at')
    setComments(data||[]); setLoaded(true)
  }

  const submitComment = async () => {
    if (!commentText.trim()) return
    const { data, error } = await supabase.from('posts').insert({ player_id:activeChar?.player_id, character_id:activeChar?.id, content:commentText, post_type:'post', parent_id:post.id }).select('*, characters(id,name,display_name,avatar_url)').single()
    if (!error) { setComments(p=>[...p,data]); setCommentText(''); onComment?.() }
  }

  const saveEdit = async () => {
    if (!editContent.trim()) return
    setSaving(true)
    await supabase.from('posts').update({ content:editContent }).eq('id',post.id)
    setSaving(false); post.content=editContent; setEditing(false); toast('Güncellendi ✅')
  }

  const charName = post.characters?.display_name||post.characters?.name||post.players?.display_name||'?'
  const charRealName = post.characters?.display_name ? post.characters?.name : null

  const reactionSummary = () => {
    const counts = {}
    ;(post.reactions||[]).forEach(r=>{ counts[r.emoji]=(counts[r.emoji]||0)+1 })
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3)
  }

  return (
    <div style={{ background:'var(--bg-card)', borderBottom:'var(--divider)' }}>
      <div style={{ padding:'13px 16px' }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
          <div style={{ cursor:'pointer', flexShrink:0 }} onClick={()=>onViewProfile?.(post.characters)}>
            <Avatar name={charName} src={post.characters?.avatar_url} size={42} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:5 }}>
              <span style={{ fontWeight:800, fontSize:14, color:'var(--accent-text)', cursor:'pointer' }} onClick={()=>onViewProfile?.(post.characters)}>{charName}</span>
              {charRealName && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{charRealName}</span>}
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>@{post.players?.username}</span>
              <Badge color={meta.color} size="xs"><Icon name={meta.icon} style={{fontSize:10,marginRight:3}} />{meta.label}</Badge>
              <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:'auto' }}>{timeAgo(post.created_at)}</span>
              {canEdit && (
                <div style={{ display:'flex', gap:2 }}>
                  <button onClick={()=>setEditing(e=>!e)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--text-muted)', padding:'2px 5px' }}><Icon name="pen" /></button>
                  <button onClick={()=>onDelete?.(post.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#e05', padding:'2px 5px' }}><Icon name="trash" /></button>
                </div>
              )}
            </div>

            {editing ? (
              <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:10 }}>
                <textarea value={editContent} onChange={e=>setEditContent(e.target.value)} style={{ minHeight:80, resize:'vertical', fontSize:14, lineHeight:1.7, borderRadius:8 }} />
                <div style={{ display:'flex', gap:7 }}>
                  <Btn size="sm" onClick={saveEdit} disabled={saving}>{saving?'...':'Kaydet'}</Btn>
                  <Btn size="sm" variant="ghost" onClick={()=>setEditing(false)}>İptal</Btn>
                </div>
              </div>
            ) : <>
              <p style={{ margin:'0 0 9px', fontSize:14, lineHeight:1.75, color:'var(--text-secondary)', fontFamily:post.post_type==='rp'?'var(--font-rp)':'var(--font-ui)' }}>{post.content}</p>
              {embed && <EmbedPlayer embed={embed} />}
              {post.image_url && !embed && <img src={post.image_url} alt="" style={{ width:'100%', borderRadius:8, marginBottom:9, maxHeight:420, objectFit:'cover', display:'block' }} />}
            </>}

            {reactionSummary().length>0 && (
              <div style={{ display:'flex', gap:4, marginBottom:7 }}>
                {reactionSummary().map(([emoji,count]) => (
                  <span key={emoji} style={{ fontSize:12, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:20, padding:'2px 8px', display:'flex', alignItems:'center', gap:3 }}>
                    {emoji} <span style={{ color:'var(--text-muted)', fontSize:11 }}>{count}</span>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:2, flexWrap:'wrap' }}>
              <ReactionPicker myReaction={post.myReaction} onReact={emoji=>onReact?.(post,emoji)} />
              <button onClick={()=>{ if(!showComments) loadComments(); setShowComments(s=>!s) }}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:'var(--radius-full)', border:'none', background:'transparent', color:'var(--text-muted)', fontSize:13, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <Icon name="comment" /> {post.comments_count}
              </button>
              <button style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:'var(--radius-full)', border:'none', background:'transparent', color:'var(--text-muted)', fontSize:13, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <Icon name="share" /> Paylaş
              </button>
            </div>
          </div>
        </div>
      </div>

      {showComments && (
        <div style={{ borderTop:'var(--divider)', padding:'11px 16px 13px', background:'var(--bg)' }}>
          {!commentsLoaded && <Spinner size={18} />}
          {comments.map(c => (
            <div key={c.id} style={{ display:'flex', gap:9, marginBottom:10 }}>
              <div style={{ cursor:'pointer' }} onClick={()=>onViewProfile?.(c.characters)}>
                <Avatar name={c.characters?.display_name||c.characters?.name||'?'} src={c.characters?.avatar_url} size={30} />
              </div>
              <div style={{ flex:1, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'7px 11px' }}>
                <span style={{ fontWeight:700, fontSize:12, color:'var(--accent-text)', cursor:'pointer' }} onClick={()=>onViewProfile?.(c.characters)}>{c.characters?.display_name||c.characters?.name||'?'}</span>
                <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:6 }}>{timeAgo(c.created_at)}</span>
                <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:2, lineHeight:1.5, marginBottom:0 }}>{c.content}</p>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:7, marginTop:7 }}>
            <Avatar name={activeChar?.display_name||activeChar?.name} src={activeChar?.avatar_url} size={30} />
            <input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Yorum yaz..." style={{ flex:1, height:34 }} onKeyDown={e=>e.key==='Enter'&&submitComment()} />
            <Btn size="sm" onClick={submitComment} disabled={!commentText.trim()}>↗</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Feed ─────────────────────────────────────────────────────────
export const Feed = ({ onViewProfile }) => {
  const { player, activeChar, profile } = useAuth()
  const [posts, setPosts]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data: postsData } = await supabase.from('posts').select('*, characters(id,name,display_name,avatar_url), players(username,display_name)').is('parent_id',null).order('created_at',{ascending:false}).limit(60)
    const { data: reactData } = await supabase.from('reactions').select('*').eq('player_id',player.id)
    const myR = {}; (reactData||[]).forEach(r=>{ myR[r.post_id]=r.emoji })
    const ids = (postsData||[]).map(p=>p.id)
    const { data: allR } = ids.length ? await supabase.from('reactions').select('post_id,emoji,player_id').in('post_id',ids) : { data:[] }
    const byPost = {}; (allR||[]).forEach(r=>{ (byPost[r.post_id]=byPost[r.post_id]||[]).push(r) })
    setPosts((postsData||[]).map(p=>({...p, myReaction:myR[p.id]||null, reactions:byPost[p.id]||[]})))
    setLoading(false)
  }

  useEffect(() => {
    load()
    const ch = supabase.channel('feed-rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'posts',filter:'parent_id=is.null'}, payload=>{
        supabase.from('posts').select('*, characters(id,name,display_name,avatar_url), players(username,display_name)').eq('id',payload.new.id).single()
          .then(({data})=>{ if(data) setPosts(p=>[{...data,myReaction:null,reactions:[]}, ...p]) })
      }).subscribe()
    return ()=>supabase.removeChannel(ch)
  }, [])

  const handleReact = async (post, emoji) => {
    if (emoji===null) await supabase.from('reactions').delete().eq('post_id',post.id).eq('player_id',player.id)
    else await supabase.from('reactions').upsert({ post_id:post.id, player_id:player.id, character_id:activeChar?.id, emoji },{ onConflict:'post_id,player_id' })
    setPosts(prev=>prev.map(p=>{
      if (p.id!==post.id) return p
      const filtered=(p.reactions||[]).filter(r=>r.player_id!==player.id)
      const reactions=emoji?[...filtered,{post_id:p.id,player_id:player.id,emoji}]:filtered
      return {...p, myReaction:emoji, reactions, likes_count:reactions.length}
    }))
  }

  const handleDelete = async id => {
    if (!confirm('Gönderiyi sil?')) return
    await supabase.from('posts').delete().eq('id',id)
    setPosts(p=>p.filter(x=>x.id!==id)); toast('Gönderi silindi')
  }

  return (
    <div>
      <PostComposer onPosted={load} />
      {loading && <div style={{ display:'flex', justifyContent:'center', padding:32 }}><Spinner /></div>}
      {!loading && posts.length===0 && (
        <div style={{ textAlign:'center', padding:'48px 0', color:'var(--text-muted)', background:'var(--bg-card)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>💗</div>
          <p style={{ fontWeight:600 }}>Pulse Feed sessiz...</p>
          <p style={{ fontSize:13, marginTop:5 }}>İlk nabzı sen at!</p>
        </div>
      )}
      {posts.map(post => (
        <PostCard key={post.id} post={post}
          canEdit={post.player_id===player.id||profile?.role==='admin'}
          onReact={handleReact} onDelete={handleDelete} onComment={load} onViewProfile={onViewProfile} />
      ))}
    </div>
  )
}
