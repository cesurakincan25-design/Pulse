import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export const AuthProvider = ({ children }) => {
  const [player, setPlayer]       = useState(null)   // auth.users kaydı
  const [profile, setProfile]     = useState(null)   // players tablosu
  const [activeChar, setActiveChar] = useState(null) // seçili karakter
  const [characters, setCharacters] = useState([])   // oyuncunun tüm karakterleri
  const [loading, setLoading]     = useState(true)

  // --- Session yükle ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) initPlayer(session.user)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) initPlayer(session.user)
      else { setPlayer(null); setProfile(null); setActiveChar(null); setCharacters([]); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const initPlayer = async (user) => {
    setPlayer(user)
    // Oyuncu profilini çek
    const { data: prof } = await supabase.from('players').select('*').eq('id', user.id).single()
    setProfile(prof)
    // Karakterleri çek
    await loadCharacters(user.id)
    setLoading(false)
  }

  const loadCharacters = async (playerId) => {
    const { data } = await supabase.from('characters')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: true })
    setCharacters(data || [])
    // Son aktif karakteri yükle
    const savedId = localStorage.getItem('active_char_id')
    const found = data?.find(c => c.id === savedId) || data?.[0]
    if (found) setActiveChar(found)
  }

  const switchCharacter = (char) => {
    setActiveChar(char)
    localStorage.setItem('active_char_id', char.id)
  }

  const refreshCharacters = () => loadCharacters(player?.id)

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }

  const signUp = async (email, password, username, displayName) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) return error
    // Oyuncu profilini oluştur
    await supabase.from('players').insert({
      id: data.user.id,
      username,
      display_name: displayName,
      is_approved: false
    })
    return null
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('active_char_id')
  }

  return (
    <AuthCtx.Provider value={{ player, profile, activeChar, characters, loading, switchCharacter, refreshCharacters, signIn, signUp, signOut }}>
      {children}
    </AuthCtx.Provider>
  )
}
