"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { User, Session } from "@supabase/supabase-js"

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
  session: Session | null
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
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true;

    // Função para inicializar o estado de forma mais rápida
    const initAuth = async () => {
      try {
        // Tenta obter a sessão atual imediatamente
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Liberamos o loading assim que temos o usuário básico
          // O perfil será carregado em segundo plano
          setIsLoading(false);

          // Busca o perfil
          const { data: perfilData } = await supabase
            .from('perfis')
            .select('*')
            .eq('id', initialSession.user.id)
            .single();
          
          if (mounted) setPerfil(perfilData);
        } else {
          if (mounted) setIsLoading(false);
        }
      } catch (e) {
        console.error("Erro na inicialização rápida do auth:", e);
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    // Listener para mudanças de estado (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log("Auth State Change:", event);
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const { data: perfilData } = await supabase
            .from('perfis')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          
          if (mounted) setPerfil(perfilData);
        } catch (e) {
          console.error("Erro ao carregar perfil no state change:", e);
        }
      } else {
        if (mounted) setPerfil(null);
      }
      
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const adminEmails = ['souendrionovo@gmail.com', 'acertofacilpromotoradecredito@gmail.com']
  const isSpecialAdmin = user?.email ? adminEmails.includes(user.email) : false
  
  const isAdmin = isSpecialAdmin || perfil?.role === 'Administrador'
  const isDeveloper = isSpecialAdmin || perfil?.role === 'Desenvolvedor'
  const isSupervisor = isSpecialAdmin || perfil?.role === 'Supervisor'
  const isOperational = isSpecialAdmin || perfil?.role === 'Operacional'
  const isCorretor = isSpecialAdmin || perfil?.role === 'Corretor' || (!isAdmin && !!user)

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      perfil, 
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
