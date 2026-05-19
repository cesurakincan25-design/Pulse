import { useState, useEffect, useRef } from 'react'
import { supabase, uploadFile } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar, Btn, Badge, Card, Modal, Spinner, timeAgo, toast, ImageUpload } from './ui'

const TYPE_META = {
  rp:   { label: 'RP Sahnesi', color: 'lavender', emoji: '🎭' },
  ooc:  { label: 'OOC',        color: 'gold',     emoji: '💬' },
  post: { label: 'Pulse',      color: 'rose',     emoji: '💗' },
  lore: { label: 'Lore',       color: 'mint',     emoji: '📖' },
}

// ── Gönderi Compose ───────────────────────────────────────────────
export const PostComposer = ({ onPosted }) => {
  const { activeChar, player } = useAuth()
  const [content, setContent]   = useState('')
  const [type, setType]         = useState('post')
  const [imageUrl, setImageUrl] = useState('')
  const [imgMode, setImgMode]   = useState(null)   // null | 'upload' | 'link'
  const [linkInput, setLinkInput] = useState('')
  const [linkError, setLinkError] = useState('')
  const [loading, setLoading]   = useState(false)

  const applyLink = () => {
    const raw = linkInput.trim()
    if (!raw) return
    // Imgur sayfası linkini direkt görsel linkine çevir
    // https://imgur.com/abc123  →  https://i.imgur.com/abc123.jpg
    const imgurPage = raw.match(/^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)$/)
    const url = imgurPage ? `https://i.imgur.com/${imgurPage[1]}.jpg` : raw
    // Basit URL kontrolü
    if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url) && !url.includes('i.imgur.com') && !url.includes('cdn.discordapp') && !url.includes('media.discordapp') && !url.includes('pbs.twimg')) {
      setLinkError('Geçerli bir görsel URL\'si girilmedi. (.jpg .png .gif .webp veya Imgur/Discord/Twitter linki)')
      return
    }
    setLinkError('')
    setImageUrl(url)
    setLinkInput('')
    setImgMode(null)
  }

  const clearImage = () => { setImageUrl(''); setImgMode(null); setLinkInput(''); setLinkError('') }

  const submit = async () => {
    if (!content.trim() && !imageUrl) return
    setLoading(true)
    const { error } = await supabase.from('posts').insert({
      player_id: player.id,
      character_id: activeChar?.id || null,
      content: content.trim(),
      image_url: imageUrl || null,
      post_type: type,
    })
    setLoading(false)
    if (error) { toast('Gönderi hatası: ' + error.message, 'error'); return }
    setContent(''); clearImage()
    onPosted?.()
  }

  return (
    <Card style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar name={activeChar?.name} src={activeChar?.avatar_url} size={44} ring />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
            {activeChar?.name || 'Karakter seç'} olarak Pulse'a yazıyorsun
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={type==='rp' ? 'Sahneyi yaz... (italic için *yıldız* kullan)' : "What's your Pulse?"}
            style={{ minHeight: 90, resize: 'vertical', borderRadius: 12, fontFamily: type==='rp' ? 'var(--font-rp)' : 'var(--font-ui)', fontSize: 14, lineHeight: 1.7 }}
          />

          {/* Görsel önizleme */}
          {imageUrl && (
            <div style={{ position: 'relative', marginTop: 8, borderRadius: 10, overflow: 'hidden', maxHeight: 220, background: 'var(--bg)' }}>
              <img src={imageUrl} alt="" style={{ width: '100%', objectFit: 'cover', borderRadius: 10, display: 'block' }}
                onError={e => { e.target.style.display='none'; setLinkError('Görsel yüklenemedi, link geçersiz olabilir.') }} />
              <button onClick={clearImage} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.65)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* Link girişi */}
          {imgMode === 'link' && !imageUrl && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={linkInput}
                  onChange={e => { setLinkInput(e.target.value); setLinkError('') }}
                  onKeyDown={e => e.key === 'Enter' && applyLink()}
                  placeholder="https://i.imgur.com/... veya imgur.com/abc123 veya direkt .jpg linki"
                  style={{ flex: 1, fontSize: 13, height: 36, borderColor: linkError ? '#f97' : undefined }}
                />
                <Btn size="sm" onClick={applyLink} disabled={!linkInput.trim()}>Ekle</Btn>
                <Btn size="sm" variant="ghost" onClick={() => { setImgMode(null); setLinkInput(''); setLinkError('') }}>İptal</Btn>
              </div>
              {linkError && <p style={{ fontSize: 12, color: '#e05', margin: 0 }}>{linkError}</p>}
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                💡 Imgur: görsel sayfasını yapıştır, otomatik çevrilir. Discord/Twitter CDN linkleri de çalışır.
              </p>
            </div>
          )}

          {/* Alt bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
            {/* Tip seçici */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(TYPE_META).map(([k, v]) => (
                <button key={k} onClick={() => setType(k)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 'var(--radius-full)', border: `1.5px solid ${type===k ? 'var(--accent)' : 'var(--border)'}`, background: type===k ? 'var(--accent-soft)' : 'transparent', color: type===k ? 'var(--accent-text)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all .15s' }}>
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>

            {/* Görsel + paylaş */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {!imageUrl && (
                <>
                  {/* Supabase'e yükle (sıkıştırmalı) */}
                  <ImageUpload bucket="post-media" path={`post-${player?.id}`} onUploaded={url => { setImageUrl(url); setImgMode(null) }}>
                    <Btn variant="ghost" size="sm" title="Bilgisayardan yükle (otomatik sıkıştırılır)">
                      📤 Yükle
                    </Btn>
                  </ImageUpload>

                  {/* Direkt link */}
                  <Btn variant="ghost" size="sm" onClick={() => setImgMode(imgMode === 'link' ? null : 'link')} title="Imgur, Discord, Twitter vs. görsel linki yapıştır"
                    style={{ borderColor: imgMode==='link' ? 'var(--accent)' : undefined, color: imgMode==='link' ? 'var(--accent-text)' : undefined }}>
                    🔗 Link
                  </Btn>
                </>
              )}

              <Btn onClick={submit} disabled={loading || (!content.trim() && !imageUrl)} size="sm">
                {loading ? <Spinner size={14} /> : 'Paylaş'}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── Tekil Gönderi ─────────────────────────────────────────────────
export const PostCard = ({ post, onLike, onComment }) => {
  const { activeChar } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments]         = useState([])
  const [commentText, setCommentText]   = useState('')
  const [commentsLoaded, setLoaded]     = useState(false)
  const meta = TYPE_META[post.post_type] || TYPE_META.post

  const loadComments = async () => {
    if (commentsLoaded) return
    const { data } = await supabase.from('posts')
      .select('*, characters(name, avatar_url)')
      .eq('parent_id', post.id)
      .order('created_at')
    setComments(data || [])
    setLoaded(true)
  }

  const toggleComments = () => {
    if (!showComments) loadComments()
    setShowComments(s => !s)
  }

  const submitComment = async () => {
    if (!commentText.trim()) return
    const { data, error } = await supabase.from('posts').insert({
      player_id: activeChar?.player_id,
      character_id: activeChar?.id,
      content: commentText,
      post_type: 'post',
      parent_id: post.id,
    }).select('*, characters(name, avatar_url)').single()
    if (!error) {
      setComments(p => [...p, data])
      setCommentText('')
      onComment?.()
    }
  }

  const charName = post.characters?.name || post.players?.display_name || '?'
  const charAvatar = post.characters?.avatar_url

  return (
    <Card style={{ marginBottom: 16 }} hover>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Avatar name={charName} src={charAvatar} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{charName}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{post.players?.username}</span>
              <Badge color={meta.color} size="xs">{meta.emoji} {meta.label}</Badge>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(post.created_at)}</span>
            </div>

            {/* İçerik */}
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-secondary)', fontFamily: post.post_type==='rp' ? 'var(--font-rp)' : 'var(--font-ui)', margin: '0 0 10px' }}>
              {post.content}
            </p>

            {post.image_url && (
              <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 12, maxHeight: 400, objectFit: 'cover' }} />
            )}

            {/* Aksiyonlar */}
            <div style={{ display: 'flex', gap: 4 }}>
              <ActionBtn icon={post.liked ? '❤️' : '🤍'} count={post.likes_count} color="var(--rose-400)" active={post.liked} onClick={() => onLike(post)} />
              <ActionBtn icon="💬" count={post.comments_count} onClick={toggleComments} />
              <ActionBtn icon="↗" label="Pulse'ta Paylaş" />
            </div>
          </div>
        </div>
      </div>

      {/* Yorumlar */}
      {showComments && (
        <div style={{ borderTop: '1.5px solid var(--border-soft)', padding: '12px 20px', background: 'var(--bg)' }}>
          {!commentsLoaded && <Spinner size={20} />}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <Avatar name={c.characters?.name || '?'} src={c.characters?.avatar_url} size={32} />
              <div style={{ flex: 1, background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)', borderRadius: 12, padding: '8px 12px' }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>{c.characters?.name || '?'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{timeAgo(c.created_at)}</span>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{c.content}</p>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Avatar name={activeChar?.name} src={activeChar?.avatar_url} size={32} />
            <input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Yorum yaz..." style={{ flex: 1, height: 36 }} onKeyDown={e=>e.key==='Enter'&&submitComment()} />
            <Btn size="sm" onClick={submitComment} disabled={!commentText.trim()}>↗</Btn>
          </div>
        </div>
      )}
    </Card>
  )
}

const ActionBtn = ({ icon, count, label, color, active, onClick }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 'var(--radius-full)', border: 'none', background: 'transparent', color: active ? color : 'var(--text-muted)', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'background .15s', fontFamily: 'var(--font-ui)' }}
    onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
    {icon} {count !== undefined ? count : label}
  </button>
)

// ── Feed ──────────────────────────────────────────────────────────
export const Feed = () => {
  const { player, activeChar } = useAuth()
  const [posts, setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [likedSet, setLiked] = useState(new Set())

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('posts')
      .select('*, characters(name, avatar_url), players(username, display_name)')
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(50)
    // Beğenileri çek
    const { data: likes } = await supabase.from('likes')
      .select('post_id').eq('player_id', player.id)
    const likedIds = new Set((likes||[]).map(l => l.post_id))
    setLiked(likedIds)
    setPosts((data||[]).map(p => ({ ...p, liked: likedIds.has(p.id) })))
    setLoading(false)
  }

  // Realtime subscription
  useEffect(() => {
    load()
    const channel = supabase.channel('feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: 'parent_id=is.null' },
        (payload) => {
          // Yeni gönderiyi başa ekle
          supabase.from('posts')
            .select('*, characters(name, avatar_url), players(username, display_name)')
            .eq('id', payload.new.id).single()
            .then(({ data }) => {
              if (data) setPosts(p => [{ ...data, liked: false }, ...p])
            })
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const handleLike = async (post) => {
    if (post.liked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('player_id', player.id)
      setPosts(p => p.map(x => x.id===post.id ? { ...x, liked: false, likes_count: x.likes_count-1 } : x))
    } else {
      await supabase.from('likes').insert({ post_id: post.id, player_id: player.id, character_id: activeChar?.id })
      setPosts(p => p.map(x => x.id===post.id ? { ...x, liked: true, likes_count: x.likes_count+1 } : x))
    }
  }

  return (
    <div>
      <PostComposer onPosted={load} />
      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>}
      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💗</div>
          <p style={{ fontWeight: 600 }}>Pulse Feed sessiz...</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>İlk nabzı sen at!</p>
        </div>
      )}
      {posts.map(post => (
        <PostCard key={post.id} post={post} onLike={handleLike} onComment={load} />
      ))}
    </div>
  )
}
