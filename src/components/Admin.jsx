import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Avatar, Btn, Badge, Modal, Spinner, toast, Icon } from './ui'

export const AdminPanel = () => {
  const { profile } = useAuth()
  const [tab, setTab]         = useState('members')
  const [players, setPlayers] = useState([])
  const [invites, setInvites] = useState([])
  const [chars, setChars]     = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteNote, setInviteNote]   = useState('')

  if (profile?.role !== 'admin') return (
    <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🔒</div><p>Erişim yetkin yok.</p>
    </div>
  )

  useEffect(()=>{ load() }, [tab])

  const load = async () => {
    setLoading(true)
    if (tab==='members') {
      const { data } = await supabase.from('players').select('*, characters(id,is_active)').order('display_name')
      setPlayers(data||[])
    } else if (tab==='invites') {
      const { data } = await supabase.from('invites').select('*').order('created_at',{ascending:false})
      setInvites(data||[])
    } else {
      const { data } = await supabase.from('characters').select('*, players(username,display_name)').order('name')
      setChars(data||[])
    }
    setLoading(false)
  }

  const approvePlayer = async (id, val) => {
    await supabase.from('players').update({is_approved:val}).eq('id',id)
    toast(val?'Onaylandı ✅':'Askıya alındı'); load()
  }
  const changeRole = async (id, role) => {
    await supabase.from('players').update({role}).eq('id',id)
    toast('Rol güncellendi'); load()
  }
  const toggleChar = async (id, val) => {
    await supabase.from('characters').update({is_active:val}).eq('id',id)
    toast(val?'Karakter aktif edildi ✅':'Karakter deaktif edildi'); load()
  }
  const deletePlayer = async id => {
    if (!confirm('Oyuncuyu sil?')) return
    await supabase.from('players').delete().eq('id',id)
    toast('Silindi'); load()
  }
  const createInvite = async () => {
    const { data:me } = await supabase.auth.getUser()
    const { data,error } = await supabase.from('invites').insert({ created_by:me.user?.id, note:inviteNote }).select().single()
    if (error) { toast('Hata: '+error.message,'error'); return }
    toast(`Davetiye: ${data.code}`)
    setInviteNote(''); setInviteModal(false); load()
  }
  const copyInviteLink = code => {
    navigator.clipboard.writeText(`${window.location.origin}?invite=${code}`)
    toast('Link kopyalandı!')
  }

  const tabs = [['members','users','Üyeler'],['chars','masks-theater','Karakterler'],['invites','ticket','Davetiyeler']]

  return (
    <div style={{ padding:'16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h1 style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8 }}>
          <Icon name="gear" style={{ color:'var(--accent)' }} /> Pulse Admin
        </h1>
        {tab==='invites' && <Btn onClick={()=>setInviteModal(true)} size="sm"><Icon name="plus" style={{marginRight:5}} />Davetiye</Btn>}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, marginBottom:16, background:'var(--bg)', borderRadius:'var(--radius-md)', padding:3, border:'1px solid var(--border)', width:'fit-content' }}>
        {tabs.map(([v,icon,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{ padding:'7px 16px', borderRadius:8, border:'none', background:tab===v?'var(--bg-card)':'transparent', color:tab===v?'var(--text-primary)':'var(--text-muted)', fontWeight:tab===v?700:500, fontSize:13, cursor:'pointer', fontFamily:'var(--font-ui)', transition:'all .15s', display:'flex', alignItems:'center', gap:6, boxShadow:tab===v?'var(--shadow-sm)':'none' }}>
            <Icon name={icon} style={{ fontSize:13 }} /> {l}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:32 }}><Spinner /></div>}

      {/* ÜYELER */}
      {!loading && tab==='members' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {players.map(p=>(
            <div key={p.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'14px 18px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <Avatar name={p.display_name} src={p.avatar_url} size={44} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:800, fontSize:14, color:'var(--text-primary)' }}>{p.display_name}</span>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>@{p.username}</span>
                  <Badge color={p.role==='admin'?'lavender':'gray'}>{p.role==='admin'?<><Icon name="crown" style={{marginRight:3}} />Admin</>:<><Icon name="user" style={{marginRight:3}} />Üye</>}</Badge>
                  <Badge color={p.is_approved?'mint':'gold'}>{p.is_approved?<><Icon name="check" style={{marginRight:3}} />Onaylı</>:<><Icon name="clock" style={{marginRight:3}} />Bekliyor</>}</Badge>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>{p.characters?.length||0} karakter</span>
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{new Date(p.created_at).toLocaleDateString('tr-TR')} tarihinde katıldı</div>
              </div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {!p.is_approved && <Btn size="sm" onClick={()=>approvePlayer(p.id,true)}><Icon name="check" style={{marginRight:4}} />Onayla</Btn>}
                {p.is_approved && <Btn size="sm" variant="ghost" onClick={()=>approvePlayer(p.id,false)}><Icon name="pause" style={{marginRight:4}} />Askıya Al</Btn>}
                {p.role!=='admin' && <Btn size="sm" variant="soft" onClick={()=>changeRole(p.id,'admin')}><Icon name="crown" style={{marginRight:4}} />Admin Yap</Btn>}
                {p.role==='admin' && <Btn size="sm" variant="ghost" onClick={()=>changeRole(p.id,'member')}><Icon name="arrow-down" style={{marginRight:4}} />Üye Yap</Btn>}
                <Btn size="sm" variant="danger" onClick={()=>deletePlayer(p.id)}><Icon name="trash" /></Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KARAKTERler */}
      {!loading && tab==='chars' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>Deaktif karakterler Feed ve Pulse Live'da görünmez, seçilemez.</p>
          {chars.map(c=>(
            <div key={c.id} style={{ background:'var(--bg-card)', border:`1px solid ${c.is_active===false?'#fca5a5':'var(--border)'}`, borderRadius:'var(--radius-md)', padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
              <Avatar name={c.display_name||c.name} src={c.avatar_url} size={40} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)' }}>{c.display_name||c.name}</span>
                  {c.display_name && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{c.name}</span>}
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>@{c.players?.username}</span>
                  <Badge color={c.char_type==='page'?'blue':'gray'}>{c.char_type==='page'?'Sayfa':'Karakter'}</Badge>
                  <Badge color={c.is_active===false?'red':'mint'}>{c.is_active===false?<><Icon name="ban" style={{marginRight:3}} />Deaktif</>:<><Icon name="circle-check" style={{marginRight:3}} />Aktif</>}</Badge>
                </div>
              </div>
              <div style={{ display:'flex', gap:5 }}>
                {c.is_active===false
                  ? <Btn size="sm" onClick={()=>toggleChar(c.id,true)}><Icon name="circle-play" style={{marginRight:4}} />Aktif Et</Btn>
                  : <Btn size="sm" variant="ghost" onClick={()=>toggleChar(c.id,false)}><Icon name="ban" style={{marginRight:4}} />Deaktif Et</Btn>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DAVETİYELER */}
      {!loading && tab==='invites' && (
        <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
          {invites.map(inv=>(
            <div key={inv.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'13px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <code style={{ fontSize:15, fontWeight:800, letterSpacing:2, color:'var(--accent-text)', background:'var(--accent-soft)', padding:'3px 10px', borderRadius:7 }}>{inv.code}</code>
                  <Badge color={inv.used_by?'gray':'mint'}>{inv.used_by?'Kullanıldı':'Bekliyor'}</Badge>
                  {inv.note && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{inv.note}</span>}
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{new Date(inv.created_at).toLocaleDateString('tr-TR')}</div>
              </div>
              <div style={{ display:'flex', gap:5 }}>
                {!inv.used_by && <Btn size="sm" variant="soft" onClick={()=>copyInviteLink(inv.code)}><Icon name="copy" style={{marginRight:4}} />Kopyala</Btn>}
                <Btn size="sm" variant="danger" onClick={async()=>{ await supabase.from('invites').delete().eq('id',inv.id); load() }}><Icon name="trash" /></Btn>
              </div>
            </div>
          ))}
          {invites.length===0 && <div style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>Henüz davetiye yok.</div>}
        </div>
      )}

      <Modal open={inviteModal} onClose={()=>setInviteModal(false)} title="Yeni Davetiye" width={380}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <p style={{ fontSize:13, color:'var(--text-secondary)' }}>Kod otomatik oluşturulacak.</p>
          <input value={inviteNote} onChange={e=>setInviteNote(e.target.value)} placeholder="Not (opsiyonel, örn: Melih için)" />
          <Btn onClick={createInvite} fullWidth>Davetiye Oluştur</Btn>
        </div>
      </Modal>
    </div>
  )
}
