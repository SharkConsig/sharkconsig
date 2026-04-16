"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"

export type UserRole = 'Desenvolvedor' | 'Administrador' | 'Operacional' | 'Supervisor' | 'Corretor'

interface Perfil {
  id: string
  email: string
  nome: string
  username?: string
  role: UserRole
  status: 'Ativo' | 'Inativo'
  permissoes: any
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  perfil: Perfil | null
  isLoading: boolean
  isAdmin: boolean
  isDeveloper: boolean
  isSupervisor: boolean
  isOperational: boolean
  isCorretor: boolean
  canAccessAdminAreas: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      try {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        if (currentUser) {
          const metadata = currentUser.user_metadata
          setPerfil({
            id: currentUser.id,
            email: currentUser.email || "",
            nome: metadata.nome_completo || currentUser.email || "Usuário",
            username: metadata.username,
            role: metadata.funcao || "Corretor",
            status: "Ativo",
            permissoes: {},
            avatar_url: metadata.avatar_url
          })
        } else {
          setPerfil(null)
        }
      } catch (err) {
        console.error("Erro no AuthProvider onAuthStateChange:", err)
      } finally {
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const adminEmails = ['souendrionovo@gmail.com', 'acertofacilpromotoradecredito@gmail.com']
  const isAdmin = user?.email ? adminEmails.includes(user.email) || perfil?.role === 'Administrador' : false
  const isDeveloper = isAdmin || perfil?.role === 'Desenvolvedor'
  const isSupervisor = isAdmin || perfil?.role === 'Supervisor'
  const isOperational = isAdmin || perfil?.role === 'Operacional'
  const isCorretor = perfil?.role === 'Corretor' || (!isAdmin && !!user && !perfil?.role)
  const canAccessAdminAreas = isAdmin || isDeveloper

  return (
    <AuthContext.Provider value={{ 
      user, 
      perfil, 
      isLoading, 
      isAdmin, 
      isDeveloper,
      isSupervisor,
      isOperational,
      isCorretor,
      canAccessAdminAreas
    }}>
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
