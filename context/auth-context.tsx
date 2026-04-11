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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const adminEmails = ['souendrionovo@gmail.com', 'acertofacilpromotoradecredito@gmail.com']
  const isAdmin = user?.email ? adminEmails.includes(user.email) : false
  const isDeveloper = isAdmin // Simplificando já que não temos mais a tabela de perfis
  const isSupervisor = isAdmin
  const isOperational = isAdmin
  const isCorretor = !isAdmin && !!user

  return (
    <AuthContext.Provider value={{ 
      user, 
      perfil: null, 
      isLoading, 
      isAdmin, 
      isDeveloper,
      isSupervisor,
      isOperational,
      isCorretor 
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
