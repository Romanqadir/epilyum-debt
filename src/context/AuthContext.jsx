import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({ session: null, profile: null, loading: true })

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) { setProfile(null); setLoading(false) }
    })

    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session?.user) return
    let active = true
    supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!active) return
        setProfile(data ?? { id: session.user.id, email: session.user.email, role: 'user' })
        setLoading(false)
      })
    return () => { active = false }
  }, [session])

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, profile, loading, isAdmin: profile?.role === 'admin', signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
