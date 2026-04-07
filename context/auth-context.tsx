"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"

interface Perfil {
  id: string
  email: string
  nome: string
  role: 'admin' | 'corretor'
}

interface AuthContextType {
  user: User | null
  perfil: Perfil | null
  isLoading: boolean
  isAdmin: boolean
  isCorretor: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPerfil = async (currentUser: any) => {
      try {
        const { data, error } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        const adminEmails = ['souendrionovo@gmail.com', 'acertofacilpromotoradecredito@gmail.com']
        const isSuperAdmin = currentUser.email && adminEmails.includes(currentUser.email)

        if (data) {
          // Se o e-mail for de um administrador e o cargo não for admin, vamos atualizar no banco
          if (isSuperAdmin && data.role !== 'admin') {
            const { data: updated } = await supabase
              .from('perfis')
              .update({ role: 'admin' })
              .eq('id', currentUser.id)
              .select()
              .single()
            setPerfil((updated || data) as Perfil)
          } else {
            setPerfil(data as Perfil)
          }
        } else if (error && error.code === 'PGRST116') {
          // Perfil não existe, vamos criar um padrão
          const novoPerfil = {
            id: currentUser.id,
            email: currentUser.email!,
            nome: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuário',
            role: isSuperAdmin ? 'admin' : 'corretor' as const
          }
          const { data: created } = await supabase.from('perfis').insert(novoPerfil).select().single()
          if (created) setPerfil(created as Perfil)
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err)
      } finally {
        setIsLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchPerfil(currentUser)
      } else {
        setPerfil(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const adminEmails = ['souendrionovo@gmail.com', 'acertofacilpromotoradecredito@gmail.com']
  const isAdmin = perfil?.role === 'admin' || (user?.email && adminEmails.includes(user.email))
  const isCorretor = perfil?.role === 'corretor' && !(user?.email && adminEmails.includes(user.email))

  return (
    <AuthContext.Provider value={{ user, perfil, isLoading, isAdmin, isCorretor }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}
