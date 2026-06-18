"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Lock } from "lucide-react"

export type UserRole = 'Desenvolvedor' | 'Administrador' | 'Operacional' | 'Supervisor' | 'Corretor' | 'Estágio' | 'Processo Seletivo' | 'PROCESSO SELETIVO' | 'Recursos Humanos' | 'Monitoramento' | 'MONITORAMENTO'

interface Perfil {
  id: string
  email: string
  nome: string
  username?: string
  role: UserRole
  status: 'Ativo' | 'Inativo'
  permissoes: any
  avatar_url?: string
  foto_campanha_url?: string
  supervisor_id?: string
  supervisor_nome?: string
  regime_contratacao?: string
}

interface AuthContextType {
  user: User | null
  perfil: Perfil | null
  isLoading: boolean
  isAdmin: boolean
  isDeveloper: boolean
  isSupervisor: boolean
  isOperational: boolean
  isMonitoramento: boolean
  isCorretor: boolean
  isEstagio: boolean
  isRecursosHumanos: boolean
  canAccessAdminAreas: boolean
  refreshPerfil: () => Promise<void>
}

const DEFAULT_HOURS_CLT = {
  seg: { enabled: true, start: "08:00", end: "19:00" },
  ter: { enabled: true, start: "08:00", end: "19:00" },
  qua: { enabled: true, start: "08:00", end: "19:00" },
  qui: { enabled: true, start: "08:00", end: "19:00" },
  sex: { enabled: true, start: "08:00", end: "19:00" },
  sab: { enabled: true, start: "09:00", end: "15:00" },
  dom: { enabled: false, start: "00:00", end: "00:00" }
}

const DEFAULT_HOURS_PJ = {
  seg: { enabled: true, start: "08:00", end: "19:00" },
  ter: { enabled: true, start: "08:00", end: "19:00" },
  qua: { enabled: true, start: "08:00", end: "19:00" },
  qui: { enabled: true, start: "08:00", end: "19:00" },
  sex: { enabled: true, start: "08:00", end: "19:00" },
  sab: { enabled: true, start: "09:00", end: "15:00" },
  dom: { enabled: false, start: "00:00", end: "00:00" }
}

const DEFAULT_HOURS_ESTAGIO = {
  seg: { enabled: true, start: "07:45", end: "19:45" },
  ter: { enabled: true, start: "07:45", end: "19:45" },
  qua: { enabled: true, start: "07:45", end: "19:45" },
  qui: { enabled: true, start: "07:45", end: "19:45" },
  sex: { enabled: true, start: "07:45", end: "19:45" },
  sab: { enabled: false, start: "00:00", end: "00:00" },
  dom: { enabled: false, start: "00:00", end: "00:00" }
}

const getStandardDefaultHours = (regimeRaw: string | undefined) => {
  const norm = (regimeRaw || "").toUpperCase().trim()
  if (norm === "ESTÁGIO" || norm === "ESTAGIO") {
    return DEFAULT_HOURS_ESTAGIO
  }
  if (norm === "PJ") {
    return DEFAULT_HOURS_PJ
  }
  return DEFAULT_HOURS_CLT
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Block overlay state
  const [isBlocked, setIsBlocked] = useState(false)
  const [allowedHoursText, setAllowedHoursText] = useState("")
  const [spTimeStr, setSpTimeStr] = useState("")

  const refreshPerfil = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
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
          avatar_url: metadata.avatar_url,
          foto_campanha_url: metadata.foto_campanha_url,
          supervisor_id: metadata.supervisor_id,
          supervisor_nome: metadata.supervisor_nome,
          regime_contratacao: metadata.regime_contratacao || ""
        })
      }
    } catch (e) {
      console.error("refreshPerfil error:", e)
    }
  }

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
            avatar_url: metadata.avatar_url,
            foto_campanha_url: metadata.foto_campanha_url,
            supervisor_id: metadata.supervisor_id,
            supervisor_nome: metadata.supervisor_nome,
            regime_contratacao: metadata.regime_contratacao || ""
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
  const isAdmin = user?.email ? adminEmails.includes(user.email) || perfil?.role === 'Administrador' || perfil?.role === 'Admin' || perfil?.role === 'Administrativo' : false
  const isDeveloper = isAdmin || perfil?.role === 'Desenvolvedor'
  const isSupervisor = isAdmin || perfil?.role === 'Supervisor'
  const isMonitoramento = perfil?.role === 'Monitoramento' || perfil?.role === 'MONITORAMENTO'
  const isOperational = isAdmin || perfil?.role === 'Operacional' || perfil?.role === 'Administrativo' || isMonitoramento
  const isCorretor = perfil?.role === 'Corretor' || perfil?.role === 'Estágio' || perfil?.role === 'Processo Seletivo' || perfil?.role === 'PROCESSO SELETIVO' || (!isAdmin && !!user && !perfil?.role)
  const isEstagio = perfil?.role === 'Estágio'
  const isRecursosHumanos = perfil?.role === 'Recursos Humanos'
  const canAccessAdminAreas = isAdmin || isDeveloper

  // Real-time Active Access Hour Control check
  useEffect(() => {
    if (!user) {
      setIsBlocked(false)
      return
    }

    // Unrestricted access for admin and developer roles 24/7/365
    if (isAdmin || isDeveloper) {
      setIsBlocked(false)
      return
    }

    let active = true
    let intervalId: NodeJS.Timeout

    async function checkAccess() {
      try {
        let customConfig: any = {}
        const { data } = await supabase
          .from("dashboard_banners")
          .select("image_url")
          .eq("title", "SYSTEM_ACCESS_HOURS")
          .maybeSingle()

        if (data && data.image_url) {
          try {
            customConfig = JSON.parse(data.image_url)
          } catch (e) {
            console.error("Error parsing hours:", e)
          }
        }

        const runValidation = () => {
          if (!active) return

          // 1. Get current America/Sao_Paulo time using Intl
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: false,
          })
          const parts = formatter.formatToParts(new Date())
          const valOf = (type: string) => parts.find(p => p.type === type)?.value || "0"
          
          // Construct date representation matching São Paulo
          const spY = parseInt(valOf("year"), 10)
          const spM = parseInt(valOf("month"), 10) - 1
          const spD = parseInt(valOf("day"), 10)
          const spH = parseInt(valOf("hour"), 10)
          const spMin = parseInt(valOf("minute"), 10)
          const spSec = parseInt(valOf("second"), 10)
          const spTime = new Date(spY, spM, spD, spH, spMin, spSec)

          const days_map = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"]
          const dayName = days_map[spTime.getDay()]

          const regime = perfil?.regime_contratacao || user?.user_metadata?.regime_contratacao || ""
          const userConfig = customConfig[user.id] || getStandardDefaultHours(regime)
          const dayConfig = userConfig ? userConfig[dayName] : null

          const todayStr = spTime.toLocaleDateString("pt-BR", { weekday: "long" })
          const currentTimeStr = `${String(spH).padStart(2, "0")}:${String(spMin).padStart(2, "0")}`
          setSpTimeStr(currentTimeStr)

          if (!dayConfig || !dayConfig.enabled) {
            setIsBlocked(true)
            setAllowedHoursText(`acesso bloqueado para este dia (${todayStr})`)
            return
          }

          const currentMinutes = spH * 60 + spMin
          const [startH, startM] = dayConfig.start.split(":").map(Number)
          const [endH, endM] = dayConfig.end.split(":").map(Number)
          const startMinutes = startH * 60 + startM
          const endMinutes = endH * 60 + endM

          if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
            setIsBlocked(true)
            setAllowedHoursText(`permitido das ${dayConfig.start} às ${dayConfig.end} (hoje é ${todayStr})`)
          } else {
            setIsBlocked(false)
          }
        }

        // Run validation immediately and then start interval
        runValidation()
        intervalId = setInterval(runValidation, 10000)

      } catch (err) {
        console.error("Error in checkAccess:", err)
      }
    }

    checkAccess()

    return () => {
      active = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [user, perfil, isAdmin, isDeveloper])

  return (
    <AuthContext.Provider value={{ 
      user, 
      perfil, 
      isLoading, 
      isAdmin, 
      isDeveloper,
      isSupervisor,
      isOperational,
      isMonitoramento,
      isCorretor,
      isEstagio,
      isRecursosHumanos,
      canAccessAdminAreas,
      refreshPerfil
    }}>
      {isBlocked && user ? (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0F172A] text-white p-4">
          <div className="w-full max-w-md bg-[#1E293B] border border-slate-700/60 rounded-[24px] p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8" />
            </div>
            
            <h1 className="text-2xl font-black tracking-tight mb-2">
              Acesso Suspenso
            </h1>
            
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Seu usuário não está autorizado a acessar o sistema fora do horário determinado para o seu expediente.
            </p>

            <div className="bg-[#0F172A] rounded-xl p-4 mb-6 space-y-2.5 text-left text-sm border border-slate-800">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Expediente de Hoje:</span>
                <span className="font-bold text-red-400 uppercase tracking-wider">{allowedHoursText || "Bloqueado"}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-800 pt-2.5 mt-2.5">
                <span>Horário de São Paulo:</span>
                <span className="font-bold text-white text-base font-mono">{spTimeStr || "--:--"}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-800 pt-2.5 mt-2.5">
                <span>Regime de Contrato:</span>
                <span className="font-bold text-amber-500 uppercase">
                  {perfil?.regime_contratacao || user?.user_metadata?.regime_contratacao || "Não Informado"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  setIsBlocked(false)
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition duration-200 cursor-pointer shadow-md shadow-red-900/20"
              >
                Desconectar do Sistema
              </button>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-4">
                SharkConsig Proteção de Horários
              </p>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
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
