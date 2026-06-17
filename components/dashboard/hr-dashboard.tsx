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
  GraduationCap,
  Briefcase
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"
import { cn, formatName } from "@/lib/utils"
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
  supervisor?: string
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
  estagioRankingGroup?: RankingItem | null
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
  setEndDate,
  estagioRankingGroup
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
      {/* Greetings Hero & Campaign Photo Row (Photo on the left, Greetings on the right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-4 w-full items-stretch py-2" id="dashboard-greetings-photo-container">
        {/* PHOTO CARD (Matched exactly to other dashboards proportions and size) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.28 }}
          className="md:col-span-3 relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-lg shadow-[#1C2643]/5 h-[315px] md:h-[336px] lg:h-[406px] xl:h-[448px] w-full max-w-[343px] shrink-0"
        >
          {perfil?.foto_campanha_url || perfil?.avatar_url ? (
            <Image 
              src={perfil?.foto_campanha_url || perfil?.avatar_url || ""} 
              alt={perfil.nome || "Colaborador"} 
              fill 
              className="object-cover object-top"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 bg-[#1C2643]/5 flex flex-col items-center justify-center text-[#1C2643]">
              <Users className="w-16 h-16 opacity-35" />
              <span className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-widest text-center px-4">Sem foto cadastrada</span>
            </div>
          )}
        </motion.div>

        {/* GREETINGS HERO (Located on the right side of the photo) */}
        <div className="md:col-span-9 flex flex-col justify-center space-y-2 md:pl-[6px]">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-[#1C2643]">
            Olá, {firstName}
          </h1>
          <p className="text-[#1C2643] text-[11px] sm:text-[13px] font-medium leading-relaxed">
            Seja bem-vindo ao painel central de Recursos Humanos. Aqui você pode gerenciar todas as rotinas internas, acompanhar contratações e acompanhar termos comportamentais.
          </p>
        </div>
      </div>

      {/* ROW 1: SUMMARY CARDS (TWO COLUMNS, TWO ROWS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full" id="dashboard-summary-cards-grid">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={metric.href} className="block transition-all hover:-translate-y-1 duration-200 h-full">
                <Card className="border border-slate-150 rounded-2xl shadow-sm hover:shadow-md bg-white overflow-hidden h-full">
                  <CardContent className="p-6 flex items-center justify-between h-full">
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

      {/* ROW 2: APPOINTMENTS OF THE DAY (Interviews & Calls) */}
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

      {/* ROW 3: HORIZONTAL PERIOD FILTER */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.26 }} 
        className="w-full"
      >
        <DashboardCard className="shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200">
          {/* Title & Icon */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <p className="text-[11px] font-black text-[#1C2643] uppercase tracking-widest">Filtrar por Período</p>
          </div>
          
          {/* Date Picker inputs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 max-w-xl">
            <div className="flex items-center gap-2 w-full">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Início</span>
              <input 
                type="date" 
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                className="w-full text-[11px] font-bold text-[#1C2643] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-[#1C2643]/20"
              />
            </div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Fim</span>
              <input 
                type="date" 
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                className="w-full text-[11px] font-bold text-[#1C2643] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-[#1C2643]/20"
              />
            </div>
          </div>

          {/* Buttons on the right */}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => {
                if (setStartDate && setEndDate) {
                  setStartDate(tempStartDate);
                  setEndDate(tempEndDate);
                }
              }}
              disabled={!tempStartDate && !tempEndDate}
              className="px-4 py-2 bg-[#1C2643] text-white text-[10px] font-black rounded-lg hover:bg-[#1C2643]/90 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm h-8 flex items-center justify-center cursor-pointer"
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
              className="px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-black rounded-lg hover:bg-slate-100 transition-all active:scale-95 shadow-sm h-8 flex items-center justify-center cursor-pointer"
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
              className="px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-black rounded-lg hover:bg-slate-100 transition-all active:scale-95 shadow-sm h-8 flex items-center justify-center cursor-pointer"
            >
              MÊS
            </button>
          </div>
        </DashboardCard>
      </motion.div>

      {/* ROW 4: META MENSAL DA EMPRESA & RANKING DE VENDAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Meta mensal da empresa (velocimetro) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.28 }}
          className="lg:col-span-4"
        >
          <DashboardCard className="flex flex-col shadow-sm border-slate-200 h-full">
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
          className="lg:col-span-8"
        >
          <DashboardCard className="lg:h-[540px] shadow-sm flex flex-col bg-white border-slate-200 overflow-hidden h-full">
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
                      const isGroupRow = rank.corretor_id === 'ESTAGIL_AND_PJ'
                      const isExpanded = !!expandedSupervisorIds[rank.corretor_id]
                      return (
                        <React.Fragment key={rank.corretor_id || idx}>
                          <tr 
                            onClick={isGroupRow ? () => {
                              setExpandedSupervisorIds(prev => ({
                                ...prev,
                                [rank.corretor_id]: !prev[rank.corretor_id]
                              }))
                            } : undefined}
                            className={cn(
                              "transition-colors",
                              isUser ? "bg-[#1C2643]/5" : "hover:bg-slate-50/80",
                              isGroupRow && "cursor-pointer"
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
                                      "text-[14px] font-black tracking-tight",
                                      isUser ? "text-[#1C2643]" : "text-slate-700"
                                    )}>
                                      {formatName(rank.name)} {isUser && !isSupervisorRow && !isGroupRow && "(Você)"}
                                    </p>
                                    {isGroupRow && (
                                      isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                      )
                                    )}
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-400 tracking-tighter">SUP: {formatName(rank.supervisor)}</p>
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

                          {isGroupRow && isExpanded && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={4} className="p-4 border-t border-b border-dashed border-slate-250">
                                <div className="space-y-4 pl-6 select-none">
                                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Users className="w-4 h-4 text-[#1C2643]" />
                                    <h4 className="text-[10px] font-black text-[#1C2643] uppercase tracking-wider">
                                      Detalhamento do Grupo (Estágio & PJ)
                                    </h4>
                                  </div>

                                  {(!rank.colaboracoes?.estagiarios || rank.colaboracoes.estagiarios.length === 0) ? (
                                    <p className="text-[10px] font-bold text-slate-400 italic">Nenhum colaborador estágio ou PJ ativo neste período.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {rank.colaboracoes.estagiarios.map((est, idx) => (
                                        <div key={est.estagiario_id} className="grid grid-cols-4 gap-4 text-slate-600 bg-emerald-50/20 p-3 border border-slate-50 shadow-sm rounded-2xl hover:bg-emerald-50/40 transition-colors">
                                          <div className="font-extrabold text-[10px] text-[#1C2643] truncate flex flex-col justify-center min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[9px] font-black text-[#1C2643]/70 bg-slate-100 border border-slate-200 rounded px-1 shrink-0 min-w-[18px] text-center">
                                                {idx + 1}º
                                              </span>
                                              {est.isPJ ? (
                                                <Briefcase className="w-4.5 h-4.5 text-blue-500 shrink-0" />
                                              ) : (
                                                <GraduationCap className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                                              )}
                                              <span className="truncate">{formatName(est.nome)}</span>
                                              <span className="text-[8px] text-slate-400 ml-1.5 font-bold uppercase shrink-0">
                                                ({est.isPJ ? "PJ" : "ESTÁGIO"})
                                              </span>
                                            </div>
                                            {est.supervisor && (
                                              <span className="text-[8px] font-bold text-slate-400 mt-0.5 pl-6 block shrink-0">
                                                SUP: {formatName(est.supervisor)}
                                              </span>
                                            )}
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

        {estagioRankingGroup && estagioRankingGroup.colaboracoes?.estagiarios && estagioRankingGroup.colaboracoes.estagiarios.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.35 }} 
            className="lg:col-span-12 mt-6 animate-fade-in"
            id="estagio-pj-ranking-card-hr"
          >
            <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col bg-white !p-4.5 sm:!p-5 !rounded-[24px] border border-slate-100">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-50">
                 <div className="flex items-center gap-2">
                   <GraduationCap className="w-5 h-5 text-emerald-500" />
                   <h3 className="text-lg font-black text-[#1C2643] tracking-tight uppercase">Estagiários e Colaboradores PJ</h3>
                 </div>
              </div>

              <div className="flex-1 flex flex-col overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posição e Nome</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right bg-emerald-100/50">Produção (Pagos)</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-orange-600 uppercase tracking-widest text-right bg-orange-100/50">Em Andamento</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-blue-600 uppercase tracking-widest text-right bg-blue-100/50">Digitadas Hoje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estagioRankingGroup.colaboracoes.estagiarios.map((est, idx) => {
                      const position = idx + 1
                      return (
                        <tr key={est.estagiario_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center text-[8.5px] font-black shrink-0",
                                position === 1 ? "bg-amber-100 text-amber-600" : 
                                position === 2 ? "bg-slate-100 text-slate-600" :
                                position === 3 ? "bg-orange-100 text-orange-600" :
                                "bg-slate-50 text-slate-400"
                              )}>
                                {position}º
                              </div>
                              <div className="flex flex-col min-w-[100px]">
                                <div className="flex items-center gap-1.5">
                                  {est.isPJ ? (
                                    <Briefcase className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  ) : (
                                    <GraduationCap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  )}
                                  <span className="text-[11.5px] font-black tracking-tight text-[#1C2643]">
                                    {formatName(est.nome)}
                                  </span>
                                  <span className="text-[8px] font-black text-slate-400">
                                    ({est.isPJ ? "PJ" : "ESTÁGIO"})
                                  </span>
                                </div>
                                {est.supervisor && (
                                  <span className="text-[8px] font-bold text-slate-400 mt-0.5">
                                    SUPERVISOR: {formatName(est.supervisor)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right bg-emerald-100/25">
                            <div className="flex flex-col items-end">
                              <span className="text-[11.5px] font-black text-[#1C2643]">{formatCurrency(est.totalPaid)}</span>
                              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tighter">
                                {est.countPaid} {est.countPaid === 1 ? 'Contrato' : 'Contratos'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right bg-orange-100/25">
                            <div className="flex flex-col items-end">
                              <span className="text-[11.5px] font-bold text-orange-600">{formatCurrency(est.totalInProcess)}</span>
                              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tighter">
                                {est.countInProcess} {est.countInProcess === 1 ? 'Contrato' : 'Contratos'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right bg-blue-100/25">
                            <div className="flex flex-col items-end">
                              <span className={cn(
                                "text-[11.5px] font-bold",
                                est.totalToday > 0 ? "text-blue-600" : "text-slate-400"
                              )}>
                                {formatCurrency(est.totalToday)}
                              </span>
                              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tighter">
                                {est.countToday} {est.countToday === 1 ? 'Contrato' : 'Contratos'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          </motion.div>
        )}
      </div>
    </div>
  )
}
