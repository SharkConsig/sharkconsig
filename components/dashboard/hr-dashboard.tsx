"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Cake,
  Target,
  TrendingUp,
  Trophy,
  Loader2,
  ChevronDown,
  ChevronUp,
  GraduationCap
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { DashboardCard, Gauge, formatCurrency } from "./dashboard-shared"
import { format } from "date-fns"

interface Interview {
  id: string
  name: string
  phone: string
  date: string
  time: string
  fase: string
  plataforma: string
  area: string
  notes: string
  tipo?: string
}

interface HRMetric {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  href: string
}

interface InternCollaboration {
  estagiario_id: string
  nome: string
  totalPaid: number
  countPaid: number
  totalInProcess: number
  countInProcess: number
  totalToday: number
  countToday: number
}

interface RankingItem {
  corretor_id: string
  name: string
  team: string
  supervisor: string
  totalPaid: number
  totalInProcess: number
  totalToday: number
  countPaid: number
  countInProcess: number
  countToday: number
  funcao?: string
  colaboracoes?: {
    propria: {
      totalPaid: number
      countPaid: number
      totalInProcess: number
      countInProcess: number
      totalToday: number
      countToday: number
    }
    estagiarios: InternCollaboration[]
  }
}

interface TicketStats {
  total: number
  notApproved: number
  approved: number
  inNegotiation: number
  aberto: number
  aguardandoOperacional: number
  byStatus: { name: string; value: number; color: string }[]
  byMainStatus: { name: string; value: number; color: string }[]
  byOrigin: { name: string; value: number }[]
  byConvenio: { name: string; value: number }[]
  byBroker: { id: string; name: string; supervisor: string; value: number; approved: number; negotiation: number }[]
}

interface AdminStats {
  monthlyGoal: number
  monthlyProduced: number
  annualGoal: number
  annualProduced: number
  dailyGoal: number
  dailyProduced: number
  inProcessValue: number
  inProcessCount: number
  pendingActionsValue: number
  pendingActionsCount: number
  createdTodayValue: number
  createdTodayCount: number
  createdWeekValue: number
  createdWeekCount: number
  createdMonthValue: number
  createdMonthCount: number
  brokerRankings: RankingItem[]
  ticketStats?: TicketStats
}

interface HRDashboardProps {
  stats?: AdminStats | null
  isLoading?: boolean
  startDate?: string
  endDate?: string
  setStartDate?: (d: string) => void
  setEndDate?: (d: string) => void
}

interface DBCollaborator {
  id: string
  status?: string | null
  data_admissao?: string | null
  joinDate?: string | null
  data_nascimento?: string | null
  birthDate?: string | null
}

// Helper to parse birthday month safely (0-indexed)
const getBirthdayMonth = (dateStr: string): number | null => {
  if (!dateStr) return null
  const cleanStr = dateStr.trim()
  
  if (cleanStr.includes("/")) {
    const parts = cleanStr.split("/")
    if (parts.length >= 2) {
      return parseInt(parts[1], 10) - 1
    }
  } else if (cleanStr.includes("-")) {
    const parts = cleanStr.split("-")
    if (parts.length >= 2) {
      if (parts[0].length === 4) {
        return parseInt(parts[1], 10) - 1 // YYYY-MM-DD
      } else {
        return parseInt(parts[1], 10) - 1 // DD-MM-YYYY
      }
    }
  }
  // Try fallback to date parse
  const parsed = Date.parse(cleanStr)
  if (!isNaN(parsed)) {
    return new Date(parsed).getMonth()
  }
  return null
}

export function HRDashboard({ 
  stats, 
  isLoading: isDashboardLoading,
  startDate = "",
  endDate = "",
  setStartDate,
  setEndDate
}: HRDashboardProps) {
  const { perfil } = useAuth()
  const [colaboradoresCount, setColaboradoresCount] = useState(0)
  const [expandedSupervisorIds, setExpandedSupervisorIds] = useState<Record<string, boolean>>({})
  const [entrevistasCount, setEntrevistasCount] = useState(0)
  const [advertenciasCount, setAdvertenciasCount] = useState(0)
  const [birthdaysCount, setBirthdaysCount] = useState(0)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [dashboardInterviewTab, setDashboardInterviewTab] = useState<"ENTREVISTAS" | "LIGAÇÕES">("ENTREVISTAS")

  const [tempStartDate, setTempStartDate] = useState(startDate)
  const [tempEndDate, setTempEndDate] = useState(endDate)

  useEffect(() => {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
  }, [startDate, endDate])

  const firstName = useMemo(() => {
    if (!perfil?.nome) return "GESTOR"
    return perfil.nome.trim().split(/\s+/)[0].toUpperCase()
  }, [perfil?.nome])

  // UseEffect to load actual numbers and fallback safely to offline local cache
  useEffect(() => {
    async function loadStats() {
      // 1. Initial Local Cache Fallback
      let colabsLocal: DBCollaborator[] = []
      let interviewsLocal: Record<string, unknown>[] = []
      let warningsLocal: Record<string, unknown>[] = []

      try {
        const savedColabs = localStorage.getItem("shark_hr_collaborators_spreadsheet")
        if (savedColabs) {
          colabsLocal = JSON.parse(savedColabs)
        }
      } catch (e) {
        console.error("Local colabs read err:", e)
      }

      try {
        const savedInterviews = localStorage.getItem("shark_hr_interviews_spreadsheet")
        if (savedInterviews) {
          interviewsLocal = JSON.parse(savedInterviews)
        }
      } catch (e) {
        console.error("Local interviews read err:", e)
      }

      try {
        const savedWarnings = localStorage.getItem("hr_warning_records_v2")
        if (savedWarnings) {
          warningsLocal = JSON.parse(savedWarnings)
        }
      } catch (e) {
        console.error("Local warnings read err:", e)
      }

      const activeColabsLocal = colabsLocal.filter((item: DBCollaborator) => {
        const status = item.status || "Ativo"
        return status !== "Inativo"
      })
      setColaboradoresCount(activeColabsLocal.length)
      setEntrevistasCount(interviewsLocal.length)
      setAdvertenciasCount(warningsLocal.length)

      try {
        const mappedLocal = (interviewsLocal as unknown as Interview[]).map((item) => ({
          id: item.id || "",
          name: item.name || "",
          phone: item.phone || "",
          date: item.date || "",
          time: item.time || "",
          fase: item.fase || "",
          plataforma: item.plataforma || "",
          area: item.area || "",
          notes: item.notes || "",
          tipo: item.tipo || "ENTREVISTAS"
        }))
        setInterviews(mappedLocal)
      } catch (err) {
        console.error("Local interviews map err:", err)
      }

      const today = new Date()
      const currentMonth = today.getMonth()

      const birthLocalCount = activeColabsLocal.filter((item: DBCollaborator) => {
        const dateStr = item.birthDate || item.data_nascimento || ""
        const m = getBirthdayMonth(dateStr)
        return m === currentMonth
      }).length
      setBirthdaysCount(birthLocalCount)

      // 2. Direct Supabase Query fetch
      try {
        const { data: colabsData } = await supabase
          .from("hr_colaboradores")
          .select("id, status, data_admissao, data_nascimento")
        
        if (colabsData) {
          const activeSupa = (colabsData as DBCollaborator[]).filter((item: DBCollaborator) => {
            const status = item.status || "Ativo"
            return status !== "Inativo"
          })
          setColaboradoresCount(activeSupa.length)

          const birthSupaCount = activeSupa.filter((item: DBCollaborator) => {
            const dateStr = item.data_nascimento || ""
            const m = getBirthdayMonth(dateStr)
            return m === currentMonth
          }).length
          setBirthdaysCount(birthSupaCount)
        }

        const { data: interviewsData } = await supabase
          .from("hr_interviews")
          .select("*")
        
        if (interviewsData) {
          setEntrevistasCount(interviewsData.length)
          const mappedSupa = (interviewsData as unknown as Interview[]).map((item) => ({
            id: item.id || "",
            name: item.name || "",
            phone: item.phone || "",
            date: item.date || "",
            time: item.time || "",
            fase: item.fase || "",
            plataforma: item.plataforma || "",
            area: item.area || "",
            notes: item.notes || "",
            tipo: item.tipo || "ENTREVISTAS"
          }))
          setInterviews(mappedSupa)
        }

        const { data: warningsData } = await supabase
          .from("hr_advertencias")
          .select("id")
        
        if (warningsData) {
          setAdvertenciasCount(warningsData.length)
        }
      } catch (err) {
        console.warn("Failed to query live dashboard statistics, offline cache remains active:", err)
      }
    }

    loadStats()
  }, [])

  // Custom HR Metrics Cards
  const metrics: HRMetric[] = [
    {
      title: "Colaboradores Ativos",
      value: colaboradoresCount,
      description: "Profissionais contratados",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/colaboradores"
    },
    {
      title: "Aniversariantes do Mês",
      value: birthdaysCount,
      description: "Datas de nascimento este mês",
      icon: Cake,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      href: "/colaboradores"
    },
    {
      title: "Entrevistas Agendadas",
      value: entrevistasCount,
      description: "Recrutamento ativo este mês",
      icon: Calendar,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      href: "/entrevistas"
    },
    {
      title: "Advertências",
      value: advertenciasCount,
      description: "Registros de disciplina",
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      href: "/advertencias"
    }
  ]

  const getTodayDateStr = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const todayDateStr = getTodayDateStr()
  const todayList = interviews.filter(i => {
    if (i.date !== todayDateStr) return false
    const itemTipo = i.tipo || "ENTREVISTAS"
    if (dashboardInterviewTab === "ENTREVISTAS") {
      return itemTipo === "ENTREVISTAS" || i.fase === "Entrevista"
    }
    return itemTipo === "LIGAÇÕES" && i.fase !== "Entrevista"
  })
  const countToday = todayList.length

  const monthlyGoal = stats?.monthlyGoal || 350000
  const monthlyProduced = stats?.monthlyProduced || 0
  const progressPercent = monthlyGoal > 0 ? Math.round((monthlyProduced / monthlyGoal) * 100) : 0
  const remainingValue = Math.max(0, monthlyGoal - monthlyProduced)
  const brokerRankings = stats?.brokerRankings || []

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Greetings Hero & Period Filter (Aligned on the same line) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-2">
        <div className="space-y-2 max-w-xl">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-[#1C2643]">
            Olá, {firstName}
          </h1>
          <p className="text-[#1C2643] text-[11px] sm:text-[13px] font-medium leading-relaxed">
            Seja bem-vindo ao painel central de Recursos Humanos. Aqui você pode gerenciar todas as rotinas internas, acompanhar contratações e acompanhar termos comportamentais.
          </p>
        </div>

        {/* Dynamic Period Filter UI in HR Dashboard */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ delay: 0.05 }} 
          className="w-full lg:max-w-[380px]"
        >
          <DashboardCard className="shadow-lg shadow-[#1C2643]/5 flex flex-col gap-3.5 !p-[18px] sm:!p-5 !rounded-[24px] bg-white border border-slate-200">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
              <p className="text-[11px] font-black text-[#1C2643] uppercase tracking-widest">Filtrar por Período</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">Início</span>
                <input 
                  type="date" 
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="w-full text-[11px] font-bold text-[#1C2643] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:ring-1 focus:ring-[#1C2643]/20"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">Fim</span>
                <input 
                  type="date" 
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="w-full text-[11px] font-bold text-[#1C2643] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:ring-1 focus:ring-[#1C2643]/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mt-1">
              <button 
                onClick={() => {
                  if (setStartDate && setEndDate) {
                    setStartDate(tempStartDate);
                    setEndDate(tempEndDate);
                  }
                }}
                disabled={!tempStartDate && !tempEndDate}
                className="px-2.5 py-2 bg-[#1C2643] text-white text-[10px] font-black rounded-lg hover:bg-[#1C2643]/90 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm flex items-center justify-center h-8"
              >
                FILTRAR
              </button>
              <button 
                onClick={() => {
                  const todayStr = format(new Date(), "yyyy-MM-dd");
                  setTempStartDate(todayStr);
                  setTempEndDate(todayStr);
                  if (setStartDate && setEndDate) {
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                  }
                }}
                className="px-2.5 py-2 bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-black rounded-lg hover:bg-slate-100 transition-all active:scale-95 shadow-sm flex items-center justify-center h-8"
              >
                HOJE
              </button>
              <button 
                onClick={() => {
                  const now = new Date();
                  const firstDay = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
                  const lastDay = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd");
                  setTempStartDate(firstDay);
                  setTempEndDate(lastDay);
                  if (setStartDate && setEndDate) {
                    setStartDate(firstDay);
                    setEndDate(lastDay);
                  }
                }}
                className="px-2.5 py-2 bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-black rounded-lg hover:bg-slate-100 transition-all active:scale-95 shadow-sm flex items-center justify-center h-8"
              >
                MÊS
              </button>
            </div>
          </DashboardCard>
        </motion.div>
      </div>

      {/* NEW SECTION: PHOTO, META MENSAL DA EMPRESA & RANKING DE VENDAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full" id="dashboard-meta-ranking-container">
        {/* Photo and Meta subgrid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.28 }}
          className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch"
        >
          {/* PHOTO CARD */}
          <div className="md:col-span-5 relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm min-h-[320px] md:min-h-0">
            {perfil?.foto_campanha_url || perfil?.avatar_url ? (
              <Image 
                src={perfil?.foto_campanha_url || perfil?.avatar_url || ""} 
                alt={perfil.nome || "Colaborador"} 
                fill 
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 bg-[#1C2643]/5 flex flex-col items-center justify-center text-[#1C2643]">
                <Users className="w-16 h-16 opacity-35" />
                <span className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-widest text-center px-4">Sem foto cadastrada</span>
              </div>
            )}
          </div>

          {/* Meta mensal da empresa (velocimetro) */}
          <DashboardCard className="md:col-span-7 flex flex-col shadow-sm border-slate-200">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                   <p className="text-[12px] font-black text-[#718198] uppercase tracking-widest">Meta Mensal da Empresa</p>
                   <div className="bg-[#1C2643]/5 p-2 rounded-xl">
                      <Target className="w-5 h-5 text-[#1C2643]" />
                   </div>
                </div>
                <p className="text-xl font-black text-[#1C2643] tracking-tighter mb-4 break-words">{formatCurrency(monthlyGoal)}</p>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
                <div className="w-full max-w-[260px]">
                  <Gauge value={progressPercent} producedValue={monthlyProduced} />
                </div>
                <div className="mt-4 flex flex-col items-center justify-center">
                   {isDashboardLoading ? (
                     <Loader2 className="w-8 h-8 animate-spin text-[#1C2643]" />
                   ) : (
                     <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1C2643] tracking-tighter leading-none">{progressPercent}%</p>
                   )}
                   <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest mt-2 tracking-[0.3em]">PROGRESSO TOTAL</p>
                </div>
              </div>

              <div className="space-y-4 mt-auto">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-center">
                      ESTATÍSTICAS EM TEMPO REAL
                    </span>
                  </div>
                  <p className="text-[12px] sm:text-[13px] font-bold text-slate-500 mt-2 text-center">
                    {remainingValue > 0 ? (
                      <>Faltam <span className="text-[#1C2643] font-black">{formatCurrency(remainingValue)}</span> para a meta</>
                    ) : (
                      <span className="text-emerald-600 font-black">A meta da empresa foi superada!</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </DashboardCard>
        </motion.div>

        {/* Ranking de Vendas dos corretores */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: 0.3 }} 
          className="lg:col-span-4"
        >
          <DashboardCard className="lg:h-[540px] shadow-sm flex flex-col bg-white border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 shrink-0">
               <div className="flex items-center gap-3">
                 <h3 className="text-xl font-black text-[#1C2643] tracking-tighter uppercase">Ranking de Vendas</h3>
                 <Trophy className="w-6 h-6 text-amber-500 fill-amber-500" />
               </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
            {isDashboardLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#1C2643] opacity-20" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
                  Atualizando Rankings...
                </p>
              </div>
            ) : brokerRankings && brokerRankings.length > 0 ? (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posição e Nome</th>
                    <th className="px-4 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-[#1C2643] text-right bg-emerald-100/50 justify-end">Produção (Pagos)</th>
                    <th className="px-4 py-3 text-[10px] font-black text-orange-600 uppercase tracking-widest text-[#1C2643] text-right bg-orange-100/50 justify-end">Em Andamento</th>
                    <th className="px-4 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest text-[#1C2643] text-right bg-blue-100/50 justify-end">Digitadas Hoje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brokerRankings.map((rank, idx) => {
                    const isUser = rank.corretor_id === perfil?.id
                    const position = idx + 1
                    const isSupervisorRow = rank.funcao?.toLowerCase() === "supervisor"
                    const isExpanded = !!expandedSupervisorIds[rank.corretor_id]
                    return (
                      <React.Fragment key={rank.corretor_id || idx}>
                        <tr 
                          onClick={isSupervisorRow ? () => {
                            setExpandedSupervisorIds(prev => ({
                              ...prev,
                              [rank.corretor_id]: !prev[rank.corretor_id]
                            }))
                          } : undefined}
                          className={cn(
                            "transition-colors",
                            isUser ? "bg-[#1C2643]/5" : "hover:bg-slate-50/80",
                            isSupervisorRow && "cursor-pointer"
                          )}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 border",
                                position === 1 ? "bg-amber-100 text-amber-600 border-amber-200" : 
                                position === 2 ? "bg-slate-100 text-slate-500 border-slate-200" :
                                position === 3 ? "bg-orange-100 text-orange-600 border-orange-200" :
                                "bg-white text-slate-400 border-slate-100"
                              )}>
                                {position}º
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 min-w-[120px]">
                                  <p className={cn(
                                    "text-[14px] font-black tracking-tight uppercase",
                                    isUser ? "text-[#1C2643]" : "text-slate-700"
                                  )}>
                                    {rank.name} {isUser && "(Você)"}
                                  </p>
                                  {isSupervisorRow && (
                                    isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                    )
                                  )}
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">SUP: {rank.supervisor}</p>
                              </div>
                            </div>
                          </td>
                          <td className={cn(
                            "px-4 py-4 text-right transition-colors",
                            isUser ? "bg-emerald-100/70" : "bg-emerald-100/25"
                          )}>
                            <div className="flex flex-col items-end">
                              <span className="text-[14px] font-black text-[#1C2643]">{formatCurrency(rank.totalPaid)}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {rank.countPaid} {rank.countPaid === 1 ? 'Contrato' : 'Contratos'}
                              </span>
                            </div>
                          </td>
                          <td className={cn(
                            "px-4 py-4 text-right transition-colors",
                            isUser ? "bg-orange-100/70" : "bg-orange-100/25"
                          )}>
                            <div className="flex flex-col items-end">
                              <span className="text-[14px] font-bold text-orange-600">{formatCurrency(rank.totalInProcess)}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {rank.countInProcess} {rank.countInProcess === 1 ? 'Contrato' : 'Contratos'}
                              </span>
                            </div>
                          </td>
                          <td className={cn(
                            "px-4 py-4 text-right transition-colors",
                            isUser ? "bg-blue-100/70" : "bg-blue-100/25"
                          )}>
                            <div className="flex flex-col items-end">
                              <span className={cn(
                                "text-[14px] font-bold",
                                rank.totalToday > 0 ? "text-blue-600" : "text-slate-400"
                              )}>
                                {formatCurrency(rank.totalToday)}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {rank.countToday} {rank.countToday === 1 ? 'Contrato' : 'Contratos'}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {isSupervisorRow && isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={4} className="p-4 border-t border-b border-dashed border-slate-250">
                              <div className="space-y-4 pl-6 select-none">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                  <Users className="w-4 h-4 text-[#1C2643]" />
                                  <h4 className="text-[10px] font-black text-[#1C2643] uppercase tracking-wider">
                                    Detalhamento de Colaboração (Estagiários)
                                  </h4>
                                </div>
                                
                                {/* Propria section */}
                                <div className="grid grid-cols-4 gap-4 text-slate-600 bg-white p-3 border border-slate-100 shadow-sm rounded-2xl">
                                  <div className="font-bold text-[10px] text-[#1C2643] uppercase tracking-wider flex items-center">
                                    Produção Própria
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[11.5px] text-emerald-600 font-extrabold">{formatCurrency(rank.colaboracoes?.propria.totalPaid || 0)}</div>
                                    <div className="text-[8.5px] text-slate-400 font-bold uppercase">{rank.colaboracoes?.propria.countPaid || 0} PG</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[11.5px] text-orange-600 font-extrabold">{formatCurrency(rank.colaboracoes?.propria.totalInProcess || 0)}</div>
                                    <div className="text-[8.5px] text-slate-400 font-bold uppercase">{rank.colaboracoes?.propria.countInProcess || 0} AND</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[11.5px] text-blue-600 font-extrabold">{formatCurrency(rank.colaboracoes?.propria.totalToday || 0)}</div>
                                    <div className="text-[8.5px] text-slate-400 font-bold uppercase">{rank.colaboracoes?.propria.countToday || 0} DIG</div>
                                  </div>
                                </div>

                                {/* Estagiarios section */}
                                {(!rank.colaboracoes?.estagiarios || rank.colaboracoes.estagiarios.length === 0) ? (
                                  <p className="text-[10px] font-bold text-slate-400 italic">Nenhuma colaboração de estagiário neste período.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {rank.colaboracoes.estagiarios.map((est) => (
                                      <div key={est.estagiario_id} className="grid grid-cols-4 gap-4 text-slate-600 bg-emerald-50/20 p-3 border border-slate-50 shadow-sm rounded-2xl hover:bg-emerald-50/40 transition-colors">
                                        <div className="font-extrabold text-[10px] text-[#1C2643] truncate flex items-center gap-1.5 uppercase">
                                          <GraduationCap className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                                          {est.nome}
                                        </div>
                                        <div className="text-right">
                                          <div className="text-[11.5px] text-emerald-600 font-extrabold">{formatCurrency(est.totalPaid)}</div>
                                          <div className="text-[8.5px] text-slate-400 font-bold uppercase">{est.countPaid} PG</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-[11.5px] text-orange-600 font-extrabold">{formatCurrency(est.totalInProcess)}</div>
                                          <div className="text-[8.5px] text-slate-400 font-bold uppercase">{est.countInProcess} AND</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-[11.5px] text-blue-600 font-extrabold">{formatCurrency(est.totalToday)}</div>
                                          <div className="text-[8.5px] text-slate-400 font-bold uppercase">{est.countToday} DIG</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-30">
                <Trophy className="w-12 h-12 mb-4" />
                <p className="text-[11px] font-black text-[#1C2643] uppercase tracking-[0.2em]">Sem resultados para este período</p>
              </div>
            )}
            </div>
          </DashboardCard>
        </motion.div>
      </div>

      {/* Grid Summary Cards (Fully functional real numbers with interactive Link wraps) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={metric.href} className="block transition-all hover:-translate-y-1 duration-200">
                <Card className="border border-slate-150 rounded-2xl shadow-sm hover:shadow-md bg-white overflow-hidden">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {metric.title}
                      </p>
                      <p className="text-2xl font-black text-[#1C2643]">
                        {metric.value}
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">
                        {metric.description}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${metric.bgColor} ${metric.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* NEW SECTION: APPOINTMENTS OF THE DAY (Interviews & Calls) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="w-full"
        id="dashboard-appointments-card-hr"
      >
        <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
          <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 h-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 shrink-0 md:border-r border-slate-100 pr-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                    {dashboardInterviewTab === "ENTREVISTAS" ? "Entrevistas de Hoje" : "Ligações de Hoje"}
                  </p>
                  <p className="text-2xl font-black text-[#1C2643] leading-none">
                    {countToday} {countToday === 1 ? "agendada" : "agendadas"}
                  </p>
                </div>
              </div>

              {/* Toggle switch inside the card */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setDashboardInterviewTab("ENTREVISTAS")}
                  className={cn(
                    "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded-lg cursor-pointer",
                    dashboardInterviewTab === "ENTREVISTAS"
                      ? "bg-[#1C2643] text-white shadow shadow-[#1C2643]/20"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  ENTREVISTAS
                </button>
                <button
                  type="button"
                  onClick={() => setDashboardInterviewTab("LIGAÇÕES")}
                  className={cn(
                    "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded-lg cursor-pointer",
                    dashboardInterviewTab === "LIGAÇÕES"
                      ? "bg-[#1C2643] text-white shadow shadow-[#1C2643]/20"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  LIGAÇÕES
                </button>
              </div>
            </div>

            {/* Horários e Nomes de Hoje */}
            <div className="flex-1 min-w-0 w-full pl-1">
              {(() => {
                let cltCount = 0;
                let estagioCount = 0;
                let pjCount = 0;

                todayList.forEach(i => {
                  const areaLower = (i.area || "").toLowerCase().trim();
                  if (areaLower === "estágio" || areaLower === "estagio") {
                    estagioCount++;
                  } else if (areaLower === "não estudas" || areaLower === "nao estudas" || areaLower === "pj") {
                    pjCount++;
                  } else if (areaLower === "comercial" || areaLower === "operacional" || areaLower === "não estudam" || areaLower === "nao estudam") {
                    cltCount++;
                  } else {
                    cltCount++;
                  }
                });

                return (
                  <div className="grid grid-cols-3 gap-3 md:gap-4 w-full">
                    {/* CLT block */}
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center text-center shadow-sm hover:border-[#1C2643]/20 transition-all">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 mb-1 pointer-events-none">
                        CLT
                      </span>
                      <span className="text-2xl md:text-3xl font-black text-[#1C2643] tracking-tighter">
                        {cltCount}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        {cltCount === 1 ? "vaga" : "vagas"}
                      </span>
                    </div>

                    {/* ESTÁGIO block */}
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center text-center shadow-sm hover:border-[#1C2643]/20 transition-all">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 mb-1 pointer-events-none">
                        ESTÁGIO
                      </span>
                      <span className="text-2xl md:text-3xl font-black text-[#1C2643] tracking-tighter">
                        {estagioCount}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        {estagioCount === 1 ? "vaga" : "vagas"}
                      </span>
                    </div>

                    {/* PJ block */}
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center text-center shadow-sm hover:border-[#1C2643]/20 transition-all">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 mb-1 pointer-events-none">
                        PJ
                      </span>
                      <span className="text-2xl md:text-3xl font-black text-[#1C2643] tracking-tighter">
                        {pjCount}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        {pjCount === 1 ? "vaga" : "vagas"}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
