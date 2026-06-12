"use client"

import { useEffect, useState, useMemo, useCallback, Fragment } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { format } from "date-fns"
import { Header } from "@/components/layout/header"
import { 
  TrendingUp,
  Gift,
  Users,
  Trophy,
  CheckCircle2,
  Clock,
  Target,
  Zap,
  Loader2,
  MessageSquare,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Compass,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  GraduationCap
} from "lucide-react"

import { useAuth } from "@/context/auth-context"
import { cn, withRetry } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useSidebar } from "@/context/sidebar-context"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardCard, Gauge, formatCurrency } from "@/components/dashboard/dashboard-shared"
import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { HRDashboard } from "@/components/dashboard/hr-dashboard"

interface ProposalSummary {
  id_lead: string
  nome_cliente: string
  valor_producao: string | number
  updated_at: string
  data_pago_cliente?: string
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
  nome: string
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
  byBroker: { name: string; value: number }[]
}

interface Campaign {
  id: string
  nome: string
  publico_estimado: number
  created_at: string
  filtros: {
    convenio?: string
    distribuicao?: string[]
    corretores_selecionados?: string[]
    [key: string]: unknown
  }
}

const APROVADOS_LABELS = [
  'GOV SP - NOVO APROVADO', 
  'GOV SP - CARTÃO BENEFICIO APROVADO', 
  'CLT - CARTÃO APROVADO', 
  'CLT - CARTÃO BENEFICIO', 
  'CARTÃO BENEFICIO APROVADO', 
  'CLIENTE APROVADO CARTÃO', 
  'AUMENTO SIAPE - AGUARDANDO DIGITAÇÃO', 
  'MARGEM 40% - APROVADO', 
  'COMPRA DE DIVIDA CARTÃO - APROVADO', 
  'CLIENTE SEM INTERESSE', 
  'PREF SAO PAULO - CARTÃO BENEFICIO APROVADO', 
  'PREF SAO PAULO - NOVO APROVADO', 
  'PREF SAO PAULO - CARTÃO CONSIGNADO APROVADO', 
  'GOV PR - NOVO APROVADO', 
  'GOV PR - BENEFICIO APROVADO',
  'CONCLUIDO',
  'CONCLUÍDO'
]

const NAO_APROVADOS_LABELS = [
  'CLIENTE IMPOSSIBILITADO', 
  'GOV SP - NÃO APROVADO', 
  'ATIVOS - Zerado', 
  'SIAPE - ACOMPANHAR VIRADA', 
  'MARGEM 40%', 
  'CLT - Zerado',
  'CLT - Negativo', 
  'ATIVOS - Negativo', 
  'COMPRA DE DIVIDA CARTÃO - NÃO APROVADO', 
  'PREF SAO PAULO - NÃO APROVADO', 
  'GOV PR - NOVO NÃO ARPROVADO',
  'REPROVADO',
  'CANCELADO',
  'NÃO APROVADO',
  'NÃO APROVADOS'
]

const normalizeStatus = (s: string) => {
  if (!s) return "";
  return s.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
};

const NEGOCIACAO_LABELS = [
  'EM NEGOCIAÇÃO',
  'EM NEGOCIACAO',
  'PROPOSTA ENVIADA',
  'NEGOCIAÇÃO',
  'NEGOCIACAO'
]

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
  brokerRankings: {
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
  }[]
  ticketStats?: TicketStats
}

const parseCurrency = (val: string | number | null | undefined) => {
  if (!val) return 0
  const valStr = val.toString()
  const clean = valStr.replace(/[^\d,.-]/g, '')
  if (clean.includes('.') && clean.includes(',')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.'))
  } else if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.'))
  }
  return parseFloat(clean)
}

export const getRemainingBusinessDays = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const lastDay = new Date(year, month + 1, 0).getDate()
  
  const holidays = [
    { month: 4, day: 1 }, // May 1st
    { month: 5, day: 4 }, // June 4th (Corpus Christi / Feriado de Junho)
  ]

  let count = 0
  for (let d = today; d <= lastDay; d++) {
    const date = new Date(year, month, d)
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const isHoliday = holidays.some(h => h.month === month && h.day === d)
      if (!isHoliday) count++
    }
  }
  return count || 1
}

interface User {
  id: string
  nome: string
  funcao: string
  supervisor_id: string
  supervisor_nome?: string
  equipe?: string
  status?: string
}

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

export default function DashboardPage() {
  const router = useRouter()
  const { perfil, isCorretor, isAdmin, isOperational, isDeveloper, isRecursosHumanos } = useAuth()
  const isSupervisor = perfil?.role === 'Supervisor' || perfil?.role === 'Operacional' || perfil?.role === 'Administrativo' || perfil?.role === 'Administrador' || perfil?.role === 'Desenvolvedor' || isAdmin || isDeveloper
  const isEstagio = perfil?.role?.toLowerCase() === 'estágio' || perfil?.role?.toLowerCase() === 'estagio'
  const { isCollapsed } = useSidebar()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userProposals, setUserProposals] = useState<ProposalSummary[]>([])
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [expandedSupervisorIds, setExpandedSupervisorIds] = useState<Record<string, boolean>>({})
  const [teamProduced, setTeamProduced] = useState(0)
  const [teamMTDProduced, setTeamMTDProduced] = useState(0)
  const [monthlyMTDProduced, setMonthlyMTDProduced] = useState(0)
  
  const [teamDailyProduced, setTeamDailyProduced] = useState(0)
  const [teamDailyCreatedValue, setTeamDailyCreatedValue] = useState(0)
  const [teamDailyCreatedCount, setTeamDailyCreatedCount] = useState(0)
  const [teamWeeklyCreatedValue, setTeamWeeklyCreatedValue] = useState(0)
  const [teamWeeklyCreatedCount, setTeamWeeklyCreatedCount] = useState(0)
  const [teamMonthlyCreatedValue, setTeamMonthlyCreatedValue] = useState(0)
  const [teamMonthlyCreatedCount, setTeamMonthlyCreatedCount] = useState(0)
  const [teamInProcessValue, setTeamInProcessValue] = useState(0)
  const [teamInProcessCount, setTeamInProcessCount] = useState(0)
  const [teamPendingInconsistencyValue, setTeamPendingInconsistencyValue] = useState(0)
  const [banners, setBanners] = useState<{image_url: string, title: string | null}[]>([])
  const [currentBanner, setCurrentBanner] = useState(0)
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null)
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [tempStartDate, setTempStartDate] = useState<string>("")
  const [tempEndDate, setTempEndDate] = useState<string>("")
  const [activeTab, setActiveTab] = useState<'propostas' | 'chamados'>('propostas')
  const [teamPendingInconsistencyCount, setTeamPendingInconsistencyCount] = useState(0)
  const [opInProcessValue, setOpInProcessValue] = useState(0)
  const [opInProcessCount, setOpInProcessCount] = useState(0)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [dashboardInterviewTab, setDashboardInterviewTab] = useState<"ENTREVISTAS" | "LIGAÇÕES">("ENTREVISTAS")
  const [dashboardCampaigns, setDashboardCampaigns] = useState<Campaign[]>([])
  const [monthlyGoal, setMonthlyGoal] = useState<number>(47000)
  const [teamGoal, setTeamGoal] = useState<number>(448000)
  
  const fetchDashboardData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      console.error("Dashboard: Supabase não está configurado. Verifique as chaves em Settings -> Secrets.")
      setIsLoading(false)
      return
    }
    setIsLoading(true)

    // Accumulators for team/admin stats
    let teamTotal = 0
    let teamMTDTotal = 0
    let userMTDTotal = 0
    let teamDailyTotal = 0
    let teamInProcessValueCalc = 0
    let teamInProcessCountCalc = 0
    let opInProcessValueCalc = 0
    let opInProcessCountCalc = 0
    let teamPendingInconsistencyValueCalc = 0
    let teamPendingInconsistencyCountCalc = 0
    let teamCreatedTodayValue = 0
    let teamCreatedTodayCount = 0
    let teamCreatedWeekValue = 0
    let teamCreatedWeekCount = 0
    let teamCreatedMonthValue = 0
    let teamCreatedMonthCount = 0

    // Helper to fetch all records beyond the 1000 limit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchAll = async (baseQuery: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let all: any[] = []
      let from = 0
      const step = 1000
      let finished = false
      
      while (!finished) {
        // PostgrestFilterBuilder doesn't have .clone(), but .range() returns a new instance
        // so we can use baseQuery as a template for each iteration.
        const { data, error } = await withRetry(() => baseQuery.range(from, from + step - 1))
        if (error) throw error
        if (!data || data.length === 0) {
          finished = true
        } else {
          all = [...all, ...data]
          if (data.length < step) {
            finished = true
          } else {
            from += step
          }
        }
      }
      return all
    }

    try {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      const startOfMonth = new Date()
      startOfMonth.setHours(0, 0, 0, 0)
      startOfMonth.setDate(1)

      // Custom range for Supervisor and Admin and Operational and Recursos Humanos
      const customStart = (isSupervisor || isAdmin || isOperational || isRecursosHumanos) && startDate ? new Date(startDate + 'T00:00:00') : null
      const customEnd = (isSupervisor || isAdmin || isOperational || isRecursosHumanos) && endDate ? new Date(endDate + 'T23:59:59') : null

      const startOfWeek = new Date()
      startOfWeek.setHours(0, 0, 0, 0)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Munday
      startOfWeek.setDate(diff)

      // Fetch Banners for everyone first
      const { data: bannerData } = await withRetry(() => 
        supabase
          .from('dashboard_banners')
          .select('image_url, title')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      )
      setBanners(bannerData || [])

      // Fetch dynamic goal configs from DB for the current month and year
      try {
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1 // 1-12

        // Default initial structures based on user role fallbacks
        let calculatedMonthlyGoal = (isSupervisor || isOperational || isAdmin || isDeveloper) ? 448000 : 47000
        let calculatedTeamGoal = 448000

        const { data: goalsConfigs, error: goalsError } = await withRetry(() => 
          supabase
            .from('metas_config')
            .select('*')
            .eq('ano', currentYear)
            .eq('mes', currentMonth)
        )

        if (!goalsError && goalsConfigs && goalsConfigs.length > 0) {
          const targetSupervisorId = isSupervisor ? perfil?.id : perfil?.supervisor_id

          if (isSupervisor || isOperational || isAdmin || isDeveloper) {
            // Se for supervisor, operacional, admin ou dev, a sua meta principal ("monthlyGoal") é a meta de time da sua própria equipe
            let teamGoalConfig = goalsConfigs.find(g => g.tipo === 'time' && g.alvo_id === targetSupervisorId)
            if (!teamGoalConfig) {
              // Se não encontrou uma meta de time para o seu próprio ID (caso do Admin, Developer ou Operacional),
              // tentaremos encontrar qualquer meta de time para o mês
              teamGoalConfig = goalsConfigs.find(g => g.tipo === 'time')
            }
            if (teamGoalConfig) {
              calculatedMonthlyGoal = teamGoalConfig.valor_mensal
            }
          } else {
            // Se for corretor/estagiário/processo seletivo
            // A meta mensal individual deles ("monthlyGoal") vem da configuração individual (tipo === 'corretor' e alvo_id === perfil?.id)
            const indGoalConfig = goalsConfigs.find(g => g.tipo === 'corretor' && g.alvo_id === perfil?.id)
            if (indGoalConfig) {
              calculatedMonthlyGoal = indGoalConfig.valor_mensal
            }

            // A meta de time deles ("teamGoal") vem da meta de time do supervisor deles (tipo === 'time' e alvo_id === supervisor_id)
            let teamGoalConfig = goalsConfigs.find(g => g.tipo === 'time' && g.alvo_id === targetSupervisorId)
            if (!teamGoalConfig) {
              // Se o corretor não tiver o supervisor_id correspondente ou o supervisor não possuir uma meta específica,
              // então busca a primeira meta de time disponível de fallback
              teamGoalConfig = goalsConfigs.find(g => g.tipo === 'time')
            }
            if (teamGoalConfig) {
              calculatedTeamGoal = teamGoalConfig.valor_mensal
            }
          }
        }

        setMonthlyGoal(calculatedMonthlyGoal)
        setTeamGoal(calculatedTeamGoal)
      } catch (metaErr) {
        console.warn("Could not fetch goals configs from DB, using fallback:", metaErr)
      }

      // Fetch distributed campaigns for the dashboard
      try {
        const { data: campaignData, error: campaignError } = await withRetry(() => 
          supabase
            .from('campanhas')
            .select('*')
            .order('created_at', { ascending: false })
        )

        if (!campaignError && campaignData) {
          // A campaign is only visible here if it has at least one distribution entry
          // We use a more robust check for distribution
          let filteredCampaigns = campaignData.filter(c => {
            const f = c.filtros
            const distribution = f?.distribuicao || []
            const brokers = f?.corretores_selecionados || []
            return (Array.isArray(distribution) && distribution.length > 0) || 
                   (Array.isArray(brokers) && brokers.length > 0)
          })
          
          if (!isAdmin && perfil) {
            const userId = perfil.id
            const supervisorId = perfil.supervisor_id
            
            filteredCampaigns = filteredCampaigns.filter(c => {
              const f = c.filtros
              const distribution = f?.distribuicao || []
              const brokers = f?.corretores_selecionados || []
              
              const isSelectedBroker = Array.isArray(brokers) && brokers.includes(userId);
              const isSelectedSupervisor = Array.isArray(distribution) && distribution.includes(userId);
              const isUnderSelectedSupervisor = !!(supervisorId && Array.isArray(distribution) && distribution.includes(supervisorId));

              if (Array.isArray(brokers) && brokers.length > 0) {
                return isSelectedBroker || isSelectedSupervisor;
              }
              
              return isSelectedSupervisor || isUnderSelectedSupervisor;
            })
          }
          
          setDashboardCampaigns(filteredCampaigns.slice(0, 3))
        }
      } catch (err) {
        console.warn("Could not fetch dashboard campaigns:", err)
      }

      const paidStatuses = [
        "PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA", 
        "PÓS-VENDA REALIZADA"
      ]
      const inProcessStatuses = [
        "ANDAMENTO / AGUARDANDO PAGAMENTO", 
        "COM INCONSISTÊNCIA NO BANCO", 
        "COM INCONSISTÊNCIA NO BANCO / AGUARDANDO OPERACIONAL"
      ]

      const opStatuses = [
        'AGUARDANDO DIGITAÇÃO OPERACIONAL',
        'COM INCONSISTÊNCIA / AGUARDANDO OPERACIONAL',
        'COM INCONSISTÊNCIA NO BANCO / AGUARDANDO OPERACIONAL'
      ]

      // 1. Fetch user's paid proposals
      const filterStartISO = customStart ? customStart.toISOString() : startOfMonth.toISOString()
      
      let userPaidQuery = supabase
        .from("propostas")
        .select("id_lead, nome_cliente, valor_producao, updated_at, data_pago_cliente")
        .in("status", paidStatuses)
        .gte("updated_at", filterStartISO)
      
      if (customEnd) {
        userPaidQuery = userPaidQuery.lte("updated_at", customEnd.toISOString())
      }

      if (isCorretor) {
        userPaidQuery = userPaidQuery.eq("corretor_id", perfil?.id)
      }

      const userPaid = await fetchAll(userPaidQuery)
      setUserProposals(userPaid || [])

      // 2. Fetch team and their proposals
      const usersRes = await withRetry(async () => {
        const res = await fetch('/api/usuarios')
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      const allUsers = usersRes || []

        // Identify target team
        const targetSupervisorId = isSupervisor ? perfil?.id : perfil?.supervisor_id
        
        const now = new Date()
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        
        let sortedRankings: RankingItem[] = []

        if (targetSupervisorId || isAdmin || isOperational || isDeveloper || isRecursosHumanos) {
          const team = (isAdmin || isOperational || isDeveloper || isRecursosHumanos)
            ? allUsers.filter((u: User) => (u.funcao === 'Corretor' || u.funcao === 'Supervisor' || u.funcao === 'Estágio' || u.funcao === 'Estagio' || u.funcao === 'Processo Seletivo' || u.funcao === 'PROCESSO SELETIVO') && u.status?.toUpperCase() !== 'INATIVO')
            : allUsers.filter((u: User) => 
                (u.supervisor_id === targetSupervisorId || u.id === targetSupervisorId) && u.status?.toUpperCase() !== 'INATIVO'
              )
          const teamIds = team.map((m: User) => m.id)

          // Fetch proposals for the team (or all if admin/operational)
          let teamProposalsQuery = supabase
            .from("propostas")
            .select("corretor_id, valor_producao, status, updated_at, created_at, data_pago_cliente, estagiario_colaborador_id, estagiario_colaborador_nome")
          
          if (!(isAdmin || isOperational || isDeveloper || isRecursosHumanos)) {
            teamProposalsQuery = teamProposalsQuery.in("corretor_id", teamIds)
          }

          // Ensure we always fetch at least the full current month for MTD calculations
          let queryStart = startOfCurrentMonth.toISOString()
          if (customStart && customStart < startOfCurrentMonth) {
            queryStart = customStart.toISOString()
          }
          
          teamProposalsQuery = teamProposalsQuery.or(`updated_at.gte.${queryStart},created_at.gte.${queryStart}`)
        
        if (customEnd) {
          // If we have an end date, we should also limit the range if possible, 
          // but careful with OR logic as it's complex in Supabase JS client.
          // For now, fetching everything from queryStart onwards and filtering in memory is safer for complex multi-field ranges.
        }

        const teamProposals = await fetchAll(teamProposalsQuery)

        const brokerMetrics: Record<string, { 
          totalPaid: number, 
          countPaid: number, 
          totalInProcess: number, 
          countInProcess: number,
          totalToday: number,
          countToday: number 
        }> = {}

        const brokerColaboracoes: Record<string, {
          propria: {
            totalPaid: number, countPaid: number, totalInProcess: number, countInProcess: number, totalToday: number, countToday: number
          },
          estagiarios: Record<string, {
            estagiario_id: string,
            nome: string,
            totalPaid: number, countPaid: number, totalInProcess: number, countInProcess: number, totalToday: number, countToday: number
          }>
        }> = {}

        // Initialize everyone with 0
        team.forEach((m: { id: string }) => {
          brokerMetrics[m.id] = { 
            totalPaid: 0, 
            countPaid: 0, 
            totalInProcess: 0, 
            countInProcess: 0,
            totalToday: 0,
            countToday: 0 
          }
          brokerColaboracoes[m.id] = {
            propria: {
              totalPaid: 0, countPaid: 0, totalInProcess: 0, countInProcess: 0, totalToday: 0, countToday: 0
            },
            estagiarios: {}
          }
        })

        teamProposals?.forEach((curr: { 
          corretor_id: string, 
          valor_producao: string | number, 
          updated_at: string, 
          created_at: string, 
          status: string, 
          data_pago_cliente?: string,
          estagiario_colaborador_id?: string,
          estagiario_colaborador_nome?: string
        }) => {
          const numericVal = isNaN(parseCurrency(curr.valor_producao)) ? 0 : parseCurrency(curr.valor_producao)
          const brokerId = curr.corretor_id || ""

          const brokerUser = allUsers.find((u: User) => u.id === brokerId)
          const isIntern = brokerUser?.funcao === 'Estágio' || 
                           brokerUser?.funcao === 'Estagio' || 
                           brokerUser?.funcao === 'Processo Seletivo' || 
                           brokerUser?.funcao === 'PROCESSO SELETIVO'
          const supervisorId = brokerUser?.supervisor_id || ""

          let targetBrokerIdForMetrics = brokerId
          if (isIntern && supervisorId && brokerMetrics[supervisorId]) {
            targetBrokerIdForMetrics = supervisorId
          }

          let targetBrokerIdForColabs = brokerId
          if (isIntern && supervisorId && brokerColaboracoes[supervisorId]) {
            targetBrokerIdForColabs = supervisorId
          }
          
          const createdDate = new Date(curr.created_at)
          const updatedDate = new Date(curr.updated_at)
          
          // Use data_pago_cliente if available, otherwise fall back to updated_at for payment date
          const effectivePaymentDate = curr.data_pago_cliente ? new Date(curr.data_pago_cliente) : updatedDate
          
          const isPaid = paidStatuses.includes(curr.status)
          const isInProcess = inProcessStatuses.includes(curr.status)
          const isOpInProcess = opStatuses.includes(curr.status)
          const isCancelled = curr.status === "CANCELADO"

          // Check if it's a retroactive payment (paid in a month prior to the current visible month)
          // We use startOfMonth as the threshold for current month activity
          const isRetroactivePayment = isPaid && (effectivePaymentDate < startOfMonth)
          
          const isTodayCreated = createdDate >= startOfToday
          const isThisWeekCreated = createdDate >= startOfWeek
          const isThisMonthCreated = createdDate >= startOfMonth
          const isTodayPaid = effectivePaymentDate >= startOfToday
          
          const isMTDPaid = effectivePaymentDate >= startOfCurrentMonth && effectivePaymentDate <= endOfCurrentMonth

          // Fix range logic: allow filtering even if only one date is provided
          let isPaidInRange = true
          if (customStart || customEnd) {
            if (customStart && effectivePaymentDate < customStart) isPaidInRange = false
            if (customEnd && effectivePaymentDate > customEnd) isPaidInRange = false
          } else {
            isPaidInRange = effectivePaymentDate >= startOfMonth
          }

          const isCreatedInRange = (customStart || customEnd)
            ? ((!customStart || createdDate >= customStart) && (!customEnd || createdDate <= customEnd))
            : isTodayCreated

          const isDigitadaHoje = isCreatedInRange && !isCancelled && !isRetroactivePayment && !isPaid
          const isEffectiveInProcess = isInProcess || isDigitadaHoje

          if (isPaid && isMTDPaid) {
            teamMTDTotal += numericVal
            if (brokerId === perfil?.id) {
              userMTDTotal += numericVal
            }
          }

          if (isPaid && isPaidInRange) {
            teamTotal += numericVal
            if (isTodayPaid) teamDailyTotal += numericVal
            
            if (brokerMetrics[targetBrokerIdForMetrics]) {
              brokerMetrics[targetBrokerIdForMetrics].totalPaid += numericVal
              brokerMetrics[targetBrokerIdForMetrics].countPaid += 1
            }
          }

          if (isEffectiveInProcess) {
            teamInProcessValueCalc += numericVal
            teamInProcessCountCalc += 1
            if (curr.status === "COM INCONSISTÊNCIA NO BANCO" || curr.status === "COM INCONSISTÊNCIA NO BANCO / AGUARDANDO OPERACIONAL") {
              teamPendingInconsistencyValueCalc += numericVal
              teamPendingInconsistencyCountCalc += 1
            }
            if (brokerMetrics[targetBrokerIdForMetrics]) {
              brokerMetrics[targetBrokerIdForMetrics].totalInProcess += numericVal
              brokerMetrics[targetBrokerIdForMetrics].countInProcess += 1
            }
          }

          if (isOpInProcess) {
            opInProcessValueCalc += numericVal
            opInProcessCountCalc += 1
          }

          if (isCreatedInRange && !isCancelled && !isRetroactivePayment) {
            teamCreatedTodayValue += numericVal
            teamCreatedTodayCount += 1
            if (brokerMetrics[targetBrokerIdForMetrics]) {
              brokerMetrics[targetBrokerIdForMetrics].totalToday += numericVal
              brokerMetrics[targetBrokerIdForMetrics].countToday += 1
            }
          }

          if (isThisWeekCreated && !isCancelled && !isRetroactivePayment) {
            teamCreatedWeekValue += numericVal
            teamCreatedWeekCount += 1
          }

          if (isThisMonthCreated && !isCancelled && !isRetroactivePayment) {
            teamCreatedMonthValue += numericVal
            teamCreatedMonthCount += 1
          }

          // Accumulate Intern Collaborations & Self-Production (propria)
          if (brokerColaboracoes[targetBrokerIdForColabs]) {
            const estId = isIntern ? brokerId : curr.estagiario_colaborador_id
            const estNome = isIntern ? (brokerUser?.nome || "Estagiário") : curr.estagiario_colaborador_nome
            
            if (estId && estId.trim() !== "") {
              if (!brokerColaboracoes[targetBrokerIdForColabs].estagiarios[estId]) {
                brokerColaboracoes[targetBrokerIdForColabs].estagiarios[estId] = {
                  estagiario_id: estId,
                  nome: estNome || "Estagiário",
                  totalPaid: 0, countPaid: 0, totalInProcess: 0, countInProcess: 0, totalToday: 0, countToday: 0
                }
              }
              const est = brokerColaboracoes[targetBrokerIdForColabs].estagiarios[estId]
              if (isPaid && isPaidInRange) {
                est.totalPaid += numericVal
                est.countPaid += 1
              }
              if (isEffectiveInProcess) {
                est.totalInProcess += numericVal
                est.countInProcess += 1
              }
              if (isCreatedInRange && !isCancelled && !isRetroactivePayment) {
                est.totalToday += numericVal
                est.countToday += 1
              }
            } else {
              const prop = brokerColaboracoes[targetBrokerIdForColabs].propria
              if (isPaid && isPaidInRange) {
                prop.totalPaid += numericVal
                prop.countPaid += 1
              }
              if (isEffectiveInProcess) {
                prop.totalInProcess += numericVal
                prop.countInProcess += 1
              }
              if (isCreatedInRange && !isCancelled && !isRetroactivePayment) {
                prop.totalToday += numericVal
                prop.countToday += 1
              }
            }
          }
        })

        setTeamProduced(teamTotal)
        setTeamMTDProduced(teamMTDTotal)
        setMonthlyMTDProduced(userMTDTotal)
        setTeamDailyProduced(teamDailyTotal)
        setTeamDailyCreatedValue(teamCreatedTodayValue)
        setTeamDailyCreatedCount(teamCreatedTodayCount)
        setTeamWeeklyCreatedValue(teamCreatedWeekValue)
        setTeamWeeklyCreatedCount(teamCreatedWeekCount)
        setTeamMonthlyCreatedValue(teamCreatedMonthValue)
        setTeamMonthlyCreatedCount(teamCreatedMonthCount)
        setTeamInProcessValue(teamInProcessValueCalc)
        setTeamInProcessCount(teamInProcessCountCalc)
        setTeamPendingInconsistencyValue(teamPendingInconsistencyValueCalc)
        setTeamPendingInconsistencyCount(teamPendingInconsistencyCountCalc)
        setOpInProcessValue(opInProcessValueCalc)
        setOpInProcessCount(opInProcessCountCalc)

        // Form rankings for supervisor
        const filteredTeam = team.filter((m: User) => {
          const isUserIntern = m.funcao === 'Estágio' || 
                               m.funcao === 'Estagio' || 
                               m.funcao === 'Processo Seletivo' || 
                               m.funcao === 'PROCESSO SELETIVO'
          return !isUserIntern && m.status?.toUpperCase() !== 'INATIVO'
        })

        sortedRankings = filteredTeam.map((m: User) => {
          const colData = brokerColaboracoes[m.id]
          const estagiariosList = colData ? Object.values(colData.estagiarios) : []
          return {
            corretor_id: m.id,
            nome: m.nome,
            funcao: m.funcao || "",
            totalPaid: brokerMetrics[m.id]?.totalPaid || 0,
            countPaid: brokerMetrics[m.id]?.countPaid || 0,
            totalInProcess: brokerMetrics[m.id]?.totalInProcess || 0,
            countInProcess: brokerMetrics[m.id]?.countInProcess || 0,
            totalToday: brokerMetrics[m.id]?.totalToday || 0,
            countToday: brokerMetrics[m.id]?.countToday || 0,
            colaboracoes: {
              propria: colData?.propria || { totalPaid: 0, countPaid: 0, totalInProcess: 0, countInProcess: 0, totalToday: 0, countToday: 0 },
              estagiarios: estagiariosList
            }
          }
        }).sort((a: RankingItem, b: RankingItem) => {
          if (b.totalPaid !== a.totalPaid) {
            return b.totalPaid - a.totalPaid
          }
          if (b.totalInProcess !== a.totalInProcess) {
            return b.totalInProcess - a.totalInProcess
          }
          return b.totalToday - a.totalToday
        })

        setRankings(sortedRankings)
      } else {
        let rankingQuery = supabase
          .from("propostas")
          .select("corretor_id, valor_producao, updated_at, data_pago_cliente")
          .in("status", paidStatuses)
          .gte("updated_at", filterStartISO)
        
        if (customEnd) {
          rankingQuery = rankingQuery.lte("updated_at", customEnd.toISOString())
        }

        const allPaid = await fetchAll(rankingQuery)
        const aggregated = allPaid.reduce((acc: Record<string, number>, curr) => {
          const val = parseCurrency(curr.valor_producao)
          const id = curr.corretor_id || "unknown"
          
          const userInList = allUsers.find((u: User) => u.id === id)
          if (userInList?.status?.toUpperCase() === 'INATIVO') {
            return acc
          }

          const isUserIntern = userInList?.funcao === 'Estágio' ||
                               userInList?.funcao === 'Estagio' ||
                               userInList?.funcao === 'Processo Seletivo' ||
                               userInList?.funcao === 'PROCESSO SELETIVO'

          if (isUserIntern) {
            return acc
          }

          // For Corretor ranking (when not admin/supervisor), check range here too if needed
          // but normally the query handles it. Let's respect data_pago_cliente if it ever gets used here.
          const effectiveDate = curr.data_pago_cliente ? new Date(curr.data_pago_cliente) : new Date(curr.updated_at)
          
          let inRange = true
          if (customStart && effectiveDate < customStart) inRange = false
          if (customEnd && effectiveDate > customEnd) inRange = false
          if (!customStart && !customEnd && effectiveDate < startOfMonth) inRange = false

          if (inRange) {
            acc[id] = (acc[id] || 0) + (isNaN(val) ? 0 : val)
          }
          return acc
        }, {})

        sortedRankings = Object.entries(aggregated)
          .map(([corretor_id, total]) => {
            const userInList = allUsers.find((u: User) => u.id === corretor_id)
            return { 
              corretor_id, 
              nome: userInList?.nome || `Ranking ${corretor_id.substring(0, 4)}`, 
              totalPaid: total as number,
              countPaid: 0,
              totalInProcess: 0,
              countInProcess: 0,
              totalToday: 0,
              countToday: 0
            }
          })
          .sort((a, b) => b.totalPaid - a.totalPaid)
        
        setRankings(sortedRankings)
      }

      // 3. Ticket Stats (Chamados) - FETCH FOR EVERYONE
      try {
        interface Ticket {
          id?: string
          status?: string
          origem?: string
          convenio?: string
          cliente_cpf?: string
          corretor_id?: string
          user_id?: string
          user_nome?: string
          created_at?: string
        }
        
        let ticketsQuery = supabase.from('chamados').select('*')
        
        // Filter by role
        if (!isAdmin) {
          if (isSupervisor) {
            // Get team members again to be sure or reuse teamIds if we were in that block
            const targetSupervisorId = perfil?.id
            const team = allUsers.filter((u: User) => 
              u.supervisor_id === targetSupervisorId || u.id === targetSupervisorId
            )
            const teamIds = team.map((m: User) => m.id)
            ticketsQuery = ticketsQuery.in('user_id', teamIds)
          } else if (isCorretor) {
            ticketsQuery = ticketsQuery.eq('user_id', perfil?.id)
          }
        }

        if (startDate) ticketsQuery = ticketsQuery.gte('created_at', startDate + 'T00:00:00')
        if (endDate) ticketsQuery = ticketsQuery.lte('created_at', endDate + 'T23:59:59')
        
        const allTickets = (await fetchAll(ticketsQuery)) as Ticket[]
        
        const ticketSummary = allTickets.reduce((acc, ticket) => {
          acc.total++
          const status = ticket.status || 'ABERTO'
          const ticketStatusUpper = (ticket.status || 'ABERTO').toUpperCase()
          const ticketStatusNormalized = normalizeStatus(ticket.status || 'ABERTO')

          acc.byStatus[status] = (acc.byStatus[status] || 0) + 1
          
          // Check if it's Approved
          const isApproved = APROVADOS_LABELS.some(label => {
            const u = label.toUpperCase()
            const ua = normalizeStatus(u)
            return ticketStatusUpper === u || ticketStatusNormalized === ua
          })
          if (isApproved) acc.approved++

          // Check if it's Not Approved
          const isNotApproved = NAO_APROVADOS_LABELS.some(label => {
            const u = label.toUpperCase()
            const ua = normalizeStatus(u)
            return ticketStatusUpper === u || ticketStatusNormalized === ua
          })
          if (isNotApproved) acc.notApproved++

          // Check if it's in Negotiation
          const isInNegotiation = NEGOCIACAO_LABELS.some(label => {
            const u = normalizeStatus(label)
            return ticketStatusNormalized.includes(u)
          })
          if (isInNegotiation) acc.inNegotiation++

          // Check if it's Aberto
          if (ticketStatusUpper === 'ABERTO' || ticketStatusUpper === 'ABERTOS') {
            acc.aberto++
          }

          // Check if it's Aguardando Operacional
          if (ticketStatusUpper === 'AGUARDANDO OPERACIONAL') {
            acc.aguardandoOperacional++
          }

          const origin = ticket.origem || 'NÃO INFORMADO'
          acc.byOrigin[origin] = (acc.byOrigin[origin] || 0) + 1

          // Convênio Stats
          const convention = (ticket.convenio || 'NÃO INFORMADO').toUpperCase()
          let convCategory = 'OUTROS'
          if (convention.includes('SIAPE') || convention.includes('FEDERAL')) convCategory = 'SIAPE/FEDERAL'
          else if (convention.includes('GOVERNO SP') || convention.includes('GOV SP')) convCategory = 'GOVERNO SP'
          else if (convention.includes('PREFEITURA SP') || convention.includes('PREF SAO PAULO') || convention.includes('PREF SÃO PAULO')) convCategory = 'PREFEITURA SP'
          else if (convention.includes('PIAUÍ') || convention.includes('PIAUI')) convCategory = 'PREFEITURA PIAUÍ'
          else if (convention.includes('MARANHÃO') || convention.includes('MARANHAO')) convCategory = 'PREFEITURA MARANHÃO'
          else if (convention.includes('GOVBR') || convention.includes('GOVERNO BR') || convention.includes('RORAIMA')) convCategory = 'GOVERNO RORAIMA'
          
          acc.byConvenio[convCategory] = (acc.byConvenio[convCategory] || 0) + 1

          // Broker Stats - Use user_id and user_nome from ticket table
          const bId = ticket.user_id || ticket.corretor_id || 'NÃO ATRIBUÍDO'
          const bNameFromTicket = ticket.user_nome
          
          if (!acc.byBrokerRaw[bId]) {
            acc.byBrokerRaw[bId] = {
              name: bNameFromTicket || 'SEM CORRETOR',
              count: 0,
              approved: 0,
              negotiation: 0
            }
          } else if (bNameFromTicket && acc.byBrokerRaw[bId].name === 'SEM CORRETOR') {
            acc.byBrokerRaw[bId].name = bNameFromTicket
          }
          acc.byBrokerRaw[bId].count++
          if (isApproved) acc.byBrokerRaw[bId].approved++
          if (isInNegotiation) acc.byBrokerRaw[bId].negotiation++

          return acc
        }, { 
          total: 0, 
          notApproved: 0, 
          approved: 0,
          inNegotiation: 0,
          aberto: 0,
          aguardandoOperacional: 0,
          byStatus: {} as Record<string, number>, 
          byOrigin: {} as Record<string, number>,
          byConvenio: {} as Record<string, number>,
          byBrokerRaw: {} as Record<string, { name: string; count: number; approved: number; negotiation: number }>
        })

        const byBroker = Object.entries(ticketSummary.byBrokerRaw)
          .map(([id, data]) => {
            // Try to find in allUsers for a more updated name
            const userInList = (allUsers as User[]).find((u) => u.id === id)
            const finalName = userInList?.nome || data.name || (id === 'NÃO ATRIBUÍDO' ? 'SEM CORRETOR' : `Cod: ${id.substring(0, 5)}`)
            const supervisorName = userInList?.supervisor_nome || 'NÃO INFORMADO'
            
            return {
              id,
              name: finalName,
              supervisor: supervisorName,
              value: data.count,
              approved: data.approved,
              negotiation: data.negotiation
            }
          })
          .sort((a, b) => b.value - a.value)
          .slice(0, 15) // Show more brokers

        const byMainStatus = [
          { name: 'Aberto', value: ticketSummary.aberto, color: '#FE9A00' },
          { name: 'Aguardando Operacional', value: ticketSummary.aguardandoOperacional, color: '#FF6A03' },
          { name: 'Em Negociação / Proposta Enviada', value: ticketSummary.inNegotiation, color: '#06BADC' },
          { name: 'Aprovado', value: ticketSummary.approved, color: '#10b981' },
          { name: 'Não Aprovado', value: ticketSummary.notApproved, color: '#ef4444' }
        ].filter(item => item.value > 0)

        const statusColors: Record<string, string> = {
          'ABERTO': '#FE9A00',
          'AGUARDANDO OPERACIONAL': '#FF6A03',
          'EM NEGOCIAÇÃO': '#06BADC',
          'EM NEGOCIACAO': '#06BADC',
          'PROPOSTA ENVIADA': '#06BADC',
          'CONCLUÍDO': '#10b981',
          'CANCELADO': '#ef4444',
          'REPROVADO': '#ef4444'
        }

        const byStatus = Object.entries(ticketSummary.byStatus).map(([name, value]) => ({
          name,
          value: value as number,
          color: statusColors[name.toUpperCase()] || '#cbd5e1'
        }))

        const byOrigin = Object.entries(ticketSummary.byOrigin)
          .map(([name, value]) => ({
            name,
            value: value as number
          }))
          .sort((a, b) => b.value - a.value)

        const convenioOrder = ['SIAPE/FEDERAL', 'GOVERNO SP', 'PREFEITURA SP', 'PREFEITURA PIAUÍ', 'PREFEITURA MARANHÃO', 'GOVERNO RORAIMA', 'OUTROS']
        const byConvenio = convenioOrder
          .map(name => ({
            name,
            value: ticketSummary.byConvenio[name] || 0
          }))

        const finalTicketStats = {
          total: ticketSummary.total,
          notApproved: ticketSummary.notApproved,
          approved: ticketSummary.approved,
          inNegotiation: ticketSummary.inNegotiation,
          aberto: ticketSummary.aberto,
          aguardandoOperacional: ticketSummary.aguardandoOperacional,
          byStatus,
          byOrigin,
          byConvenio,
          byBroker,
          byMainStatus
        }
        
        setTicketStats(finalTicketStats)

        // 4. Fetch Admin specific stats - Only if Admin or Developer or Recursos Humanos
        if (isAdmin || isDeveloper || isRecursosHumanos) {
          const now = new Date()
          const currentYear = now.getFullYear()
          const currentMonth = now.getMonth() + 1
          const startOfYearDate = new Date(currentYear, 0, 1)
          const startOfYearISO = startOfYearDate.toISOString()

          // Fetch annual produced - use same paidStatuses as above
          const annualQuery = supabase
            .from('propostas')
            .select('valor_producao, updated_at, data_pago_cliente')
            .in('status', paidStatuses)
            .or(`updated_at.gte.${startOfYearISO},data_pago_cliente.gte.${startOfYearISO}`)
          
          const annualProposals = await fetchAll(annualQuery)
          const annualProducedValue = (annualProposals || []).reduce((acc, p) => {
            const val = parseCurrency(p.valor_producao)
            const pDate = p.data_pago_cliente ? new Date(p.data_pago_cliente) : new Date(p.updated_at)
            
            // Only count if it was paid within the current year and not in a future year (edge case)
            if (pDate >= startOfYearDate && pDate.getFullYear() === currentYear) {
              return acc + (isNaN(val) ? 0 : val)
            }
            return acc
          }, 0)
          
          const { data: goalsData } = await supabase
            .from('metas_config')
            .select('*')
            .eq('ano', currentYear)

          const annualGoalConfig = goalsData?.find(g => g.tipo === 'empresa' && g.mes === 0)
          const annualGoalValue = annualGoalConfig?.valor_mensal || 0
          const monthlyTeamConfigs = goalsData?.filter(g => g.tipo === 'time' && g.mes === currentMonth) || []
          const monthlyGoalValue = monthlyTeamConfigs.length > 0 
            ? monthlyTeamConfigs.reduce((sum, g) => sum + (g.valor_mensal || 0), 0)
            : (annualGoalValue / 12)

          setAdminStats({
            monthlyGoal: monthlyGoalValue,
            monthlyProduced: teamMTDTotal,
            annualGoal: annualGoalValue,
            annualProduced: annualProducedValue,
            dailyGoal: monthlyGoalValue / getRemainingBusinessDays(),
            dailyProduced: teamDailyTotal,
            inProcessValue: teamInProcessValueCalc,
            inProcessCount: teamInProcessCountCalc,
            pendingActionsValue: teamPendingInconsistencyValueCalc,
            pendingActionsCount: teamPendingInconsistencyCountCalc,
            createdTodayValue: teamCreatedTodayValue,
            createdTodayCount: teamCreatedTodayCount,
            createdWeekValue: teamCreatedWeekValue,
            createdWeekCount: teamCreatedWeekCount,
            createdMonthValue: teamCreatedMonthValue,
            createdMonthCount: teamCreatedMonthCount,
            brokerRankings: sortedRankings.map(r => {
              const userData = allUsers.find((u: User) => u.id === r.corretor_id)
              const supervisorName = userData?.supervisor_nome || 
                                   allUsers.find((u: User) => u.id === userData?.supervisor_id)?.nome || 
                                   "SharkConsig"
              return {
                corretor_id: r.corretor_id,
                name: userData?.nome || r.nome,
                team: userData?.equipe || "Shark",
                supervisor: supervisorName,
                funcao: userData?.funcao || r.funcao || "",
                totalPaid: r.totalPaid,
                totalInProcess: r.totalInProcess,
                totalToday: r.totalToday,
                countPaid: r.countPaid,
                countInProcess: r.countInProcess,
                countToday: r.countToday,
                colaboracoes: r.colaboracoes
              }
            }),
            ticketStats: finalTicketStats
          })
        }
      } catch (err) {
        console.error("Error fetching admin dashboard stats:", err instanceof Error ? err.message : err)
      }

      // Fetch today's interviews & ligações for Dashboard Card
      try {
        const dForCard = new Date()
        const yrForCard = dForCard.getFullYear()
        const mthForCard = String(dForCard.getMonth() + 1).padStart(2, '0')
        const dayForCard = String(dForCard.getDate()).padStart(2, '0')
        const todayDateStrForCard = `${yrForCard}-${mthForCard}-${dayForCard}`

        const { data: interviewData, error: interviewError } = await supabase
          .from('hr_interviews')
          .select('*')
          .eq('date', todayDateStrForCard)

        if (!interviewError && interviewData) {
          const mappedData: Interview[] = (interviewData as {
            id: string
            name: string
            phone?: string
            date: string
            time: string
            fase: string
            plataforma: string
            area: string
            notes?: string
            tipo?: string
          }[]).map((item) => ({
            id: item.id,
            name: item.name,
            phone: item.phone || "",
            date: item.date,
            time: item.time,
            fase: item.fase,
            plataforma: item.plataforma,
            area: item.area,
            notes: item.notes || "",
            tipo: item.tipo || "ENTREVISTAS"
          }))
          setInterviews(mappedData)
        } else {
          setInterviews([])
        }
      } catch (err) {
        console.error("Error fetching interviews for dashboard:", err)
      }

    } catch (error) {
      console.error("Erro dashboard:", error)
    } finally {
      setIsLoading(false)
    }
  }, [perfil, isRecursosHumanos, isCorretor, isAdmin, isOperational, isDeveloper, isSupervisor, startDate, endDate])

  useEffect(() => {
    setMounted(true)
    if (perfil?.id) {
      fetchDashboardData()
    }

    // Subscrever a mudanças nos banners para atualização em tempo real
    const channel = supabase
      .channel('banners-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dashboard_banners'
        },
        () => {
          fetchDashboardData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [perfil?.id, fetchDashboardData])

  useEffect(() => {
    if (banners.length <= 1) {
      setCurrentBanner(0)
      return
    }
    
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length)
    }, 8000)
    
    return () => clearInterval(timer)
  }, [banners.length])

  const monthlyProduced = useMemo(() => {
    // Respect custom filter if applied, otherwise use current month
    const startThreshold = (isSupervisor || isAdmin || isOperational || isRecursosHumanos) && startDate 
      ? new Date(startDate + 'T00:00:00') 
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    
    startThreshold.setHours(0, 0, 0, 0)

    const endThreshold = (isSupervisor || isAdmin || isOperational || isRecursosHumanos) && endDate 
      ? new Date(endDate + 'T23:59:59') 
      : null

    return userProposals
      .filter(p => {
        const pDate = p.data_pago_cliente ? new Date(p.data_pago_cliente) : new Date(p.updated_at)
        let inRange = pDate >= startThreshold
        if (endThreshold && pDate > endThreshold) inRange = false
        return inRange
      })
      .reduce((acc, p) => {
        const val = parseCurrency(p.valor_producao)
        return acc + (isNaN(val) ? 0 : val)
      }, 0)
  }, [userProposals, startDate, endDate, isSupervisor, isAdmin, isOperational, isDeveloper, isRecursosHumanos])

  const dailyProduced = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    
    return userProposals
      .filter(p => {
        const pDate = p.data_pago_cliente ? new Date(p.data_pago_cliente) : new Date(p.updated_at)
        return pDate >= startOfToday
      })
      .reduce((acc, p) => {
        const val = parseCurrency(p.valor_producao)
        return acc + (isNaN(val) ? 0 : val)
      }, 0)
  }, [userProposals])

  const recentPayments = useMemo(() => {
    return [...userProposals]
      .sort((a, b) => {
        const dateA = a.data_pago_cliente ? new Date(a.data_pago_cliente) : new Date(a.updated_at)
        const dateB = b.data_pago_cliente ? new Date(b.data_pago_cliente) : new Date(b.updated_at)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 3)
  }, [userProposals])


  
  const displayMonthlyProduced = (isSupervisor || isOperational || isAdmin) ? teamMTDProduced : monthlyMTDProduced
  const displayDailyProduced = (isSupervisor || isOperational || isAdmin) ? teamDailyProduced : dailyProduced

  const prizeTiers = useMemo(() => [
    { goal: 47000, prize: 400 },
    { goal: 63000, prize: 650 },
    { goal: 84000, prize: 1500 },
    { goal: 100000, prize: 2250 },
    { goal: 125000, prize: 3500 },
    { goal: 150000, prize: 7000 },
    { goal: 180000, prize: 10000 },
    { goal: 200000, prize: 25000 },
  ], [])

  const currentPrize = useMemo(() => {
    const achieved = [...prizeTiers].reverse().find(tier => monthlyProduced >= tier.goal)
    return achieved ? achieved.prize : 0
  }, [monthlyProduced, prizeTiers])

  const nextPrizeTier = useMemo(() => {
    return prizeTiers.find(tier => monthlyProduced < tier.goal)
  }, [monthlyProduced, prizeTiers])

  const progressPercent = Math.round((displayMonthlyProduced / monthlyGoal) * 100)
  const remainingValue = Math.max(0, monthlyGoal - displayMonthlyProduced)
  
  const remainingBusinessDays = getRemainingBusinessDays()
  const dailyGoal = remainingBusinessDays > 0 ? remainingValue / remainingBusinessDays : 0

  const userRank = rankings.findIndex(r => r.corretor_id === perfil?.id) + 1

  const missingForNextRank = useMemo(() => {
    if (userRank > 1 && rankings.length >= userRank) {
      const nextRankIndex = userRank - 2; // Index of the person just ahead of the user
      const userIndex = userRank - 1; // Index of the user
      if (nextRankIndex >= 0) {
        const nextRankTotal = rankings[nextRankIndex].totalPaid;
        const userTotal = rankings[userIndex].totalPaid;
        const missing = nextRankTotal - userTotal;
        return missing > 0 ? missing : 0;
      }
    }
    return 0;
  }, [userRank, rankings]);

  const displayRankings = useMemo(() => {
    if (rankings.length === 0) return [];
    
    // Convert current user ID to check matches
    const userRankIndex = rankings.findIndex(r => r.corretor_id === perfil?.id);
    
    if (userRankIndex === -1) {
      // User has no sales, show 1st place as anonymized, and user at bottom with 0
      const list = [
        { ...rankings[0], position: 1, isUser: false }
      ];
      list.push({
        corretor_id: perfil?.id || "user-none",
        nome: perfil?.nome || "Você",
        totalPaid: 0,
        countPaid: 0,
        totalInProcess: 0,
        countInProcess: 0,
        totalToday: 0,
        countToday: 0,
        position: rankings.length + 1,
        isUser: true
      });
      return list;
    } else if (userRankIndex === 0) {
      // User is in 1st place, only need to show user
      return [
        { ...rankings[0], position: 1, isUser: true }
      ];
    } else {
      // User is 2nd or below, show 1st place anonymized and show user under
      return [
        { ...rankings[0], position: 1, isUser: false },
        { ...rankings[userRankIndex], position: userRankIndex + 1, isUser: true }
      ];
    }
  }, [rankings, perfil]);
  
  const headerContent = useMemo(() => {
    if (typeof window === 'undefined') return { greeting: "Olá", phrase: "Sua jornada para o topo começa agora" }
    const hour = new Date().toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hour12: false,
    })
    const h = parseInt(hour)
    if (h >= 0 && h < 12) return { greeting: "Bom dia", phrase: "Sua jornada para o topo começa agora" }
    if (h >= 12 && h < 18) return { greeting: "Boa tarde", phrase: "Foco total para transformar a tarde em resultados" }
    return { greeting: "Boa noite", phrase: "Dia produtivo! Organize-se para vencer amanhã" }
  }, [])

  if (!mounted) return null

  if (isRecursosHumanos || perfil?.role === 'Recursos Humanos') {
    return (
      <div className="flex-1 flex flex-col bg-[#F8FAFC]">
        <Header title="DASHBOARD" />
        <div className={cn(
          "p-4 lg:p-8 space-y-8 mx-auto w-full pb-20 transition-all duration-300",
          isCollapsed ? "max-w-full lg:px-12" : "max-w-[1600px]"
        )}>
          <HRDashboard 
            stats={adminStats} 
            isLoading={isLoading} 
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      <Header title="DASHBOARD" />
      
      <div className={cn(
        "p-4 lg:p-8 space-y-8 mx-auto w-full pb-20 transition-all duration-300",
        isCollapsed ? "max-w-full lg:px-12" : "max-w-[1600px]"
      )}>
        {(isAdmin || isDeveloper) && adminStats && (
          <AdminDashboard 
            perfil={perfil} 
            isLoading={isLoading} 
            remainingBusinessDays={remainingBusinessDays} 
            headerContent={headerContent} 
            stats={adminStats}
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
          />
        )}
        
        {(!isAdmin && !isDeveloper) && (
          <>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h1 className="text-4xl font-black text-[#1C2643] tracking-tighter">
                  {headerContent.greeting}, {perfil?.nome?.split(' ')[0] || 'Shark'}!
                </h1>
                <p className="text-[12px] font-bold text-[#718198] uppercase tracking-[0.25em] mt-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  {headerContent.phrase}
                </p>
              </motion.div>
              
              {!isEstagio && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-5 self-start md:self-center relative group"
                >
                  <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                     <Clock className="w-7 h-7 text-amber-500" />
                  </div>
                  <div className="relative z-10">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Prazo Para Bater a Meta</p>
                     <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-[#1C2643]">{remainingBusinessDays.toString().padStart(2, '0')}</span>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Dias Restantes</span>
                     </div>
                     <p className="text-[11px] font-medium text-slate-500 mt-1 max-w-[200px] leading-tight">
                        <span className="text-amber-600 font-bold italic">Sua corrida rumo à meta.</span> Aproveite cada dia útil para transformar esforço em resultado.
                     </p>
                  </div>
                </motion.div>
              )}
            </div>

            {activeTab === 'propostas' ? (
              isEstagio ? (
                <motion.div 
                  key="estagio-propostas"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* Photo & Main Motivation Group */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* CARTÃO DA FOTO DO COLABORADOR */}
                    <div className="lg:col-span-3 relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-lg shadow-[#1C2643]/5 h-[375px] w-full shrink-0">
                      {perfil?.foto_campanha_url || perfil?.avatar_url ? (
                        <Image 
                          src={perfil?.foto_campanha_url || perfil?.avatar_url || ""} 
                          alt={perfil?.nome || "Colaborador"} 
                          fill 
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[#1C2643]/5 flex flex-col items-center justify-center text-[#1C2643]">
                          <Users className="w-12 h-12 opacity-35" />
                          <span className="text-[8.5px] font-black text-slate-400 mt-2 uppercase tracking-widest text-center px-3">Sem foto cadastrada</span>
                        </div>
                      )}
                    </div>

                    {/* Banner Column */}
                    <div className="lg:col-span-9">
                      {/* Hero Header Card / Banner */}
                      <div className="relative overflow-hidden bg-[#1C2643] text-white rounded-[32px] p-8 sm:p-10 shadow-xl border border-[#1C2643]/10">
                        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-[0.03] pointer-events-none flex items-center justify-center">
                          <Trophy className="w-64 h-64 text-amber-400" />
                        </div>
                        <div className="relative z-10 max-w-3xl font-medium">
                          <span className="bg-amber-400 text-[#1C2643] text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full inline-block mb-4">
                            Jornada do Futuro Shark
                          </span>
                          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-white">
                            Formando os Líderes de Amanhã
                          </h2>
                          <p className="text-[14px] text-slate-350 leading-relaxed mb-6">
                            Tubarões não nascem prontos; eles são moldados na consistência, no estudo e na persistência. Este período de estágio é a sua maior oportunidade de dominar o mercado, aperfeiçoar sua retórica de vendas e entender a fundo a engrenagem do crédito consignado. Cada dia é um aprendizado valioso.
                          </p>
                          <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10">
                              <BookOpen className="w-4 h-4 text-amber-400" />
                              <span className="text-xs font-bold text-slate-200">Domínio Técnico</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10">
                              <Compass className="w-4 h-4 text-[#00C896]" />
                              <span className="text-xs font-bold text-slate-200">Forte Conexão</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10">
                              <Award className="w-4 h-4 text-blue-400" />
                              <span className="text-xs font-bold text-slate-200">Mentalidade Vencedora</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Motivational Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4 bg-white border border-slate-200 rounded-[28px] p-6 relative overflow-hidden group">
                      <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-2 shrink-0 border border-amber-100">
                        <BookOpen className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">Pilar 01</span>
                        <h4 className="text-lg font-black text-[#1C2643] mt-1">Conhecimento Técnico</h4>
                        <p className="text-[13px] font-medium text-slate-500 mt-2 leading-relaxed">
                          Não se compare com os outros, mas sim com quem você era ontem. Dedique tempo para estudar os scripts de vendas, entender os fluxos operacionais e dominar os detalhes dos principais convênios.
                        </p>
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                        <span>Foco em Evolução</span>
                      </div>
                    </DashboardCard>

                    <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4 bg-white border border-slate-200 rounded-[28px] p-6 relative overflow-hidden group">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-2 shrink-0 border border-emerald-100">
                        <Compass className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Pilar 02</span>
                        <h4 className="text-lg font-black text-[#1C2643] mt-1">Conexão & Empatia</h4>
                        <p className="text-[13px] font-medium text-slate-500 mt-2 leading-relaxed">
                          Nossos clientes buscam segurança e acolhimento. Pratique a escuta ativa, demonstre empatia sincera e construa verdadeira proximidade em cada ligação de atendimento realizados.
                        </p>
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                        <span>Sintonia & Atendimento</span>
                      </div>
                    </DashboardCard>

                    <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4 bg-white border border-slate-200 rounded-[28px] p-6 relative overflow-hidden group">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-2 shrink-0 border border-blue-100">
                        <Award className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Pilar 03</span>
                        <h4 className="text-lg font-black text-[#1C2643] mt-1">Perseverança Diária</h4>
                        <p className="text-[13px] font-medium text-slate-500 mt-2 leading-relaxed">
                          Grandes conquistas decorrem da consistência diária e da paixão pelo processo. Mantenha a resiliência activa, celebre seu progresso constante e aproveite cada feedback recebido.
                        </p>
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                        <span>Paciência & Consistência</span>
                      </div>
                    </DashboardCard>
                  </div>

                  {/* Campaigns & Code of Ethics Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5 bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-[#1C2643] rounded-xl flex items-center justify-center">
                          <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-[14px] font-black text-[#1C2643] tracking-tight leading-none">
                            Minhas Campanhas Ativas
                          </p>
                          <p className="text-[11px] font-bold text-slate-400 mt-1">Desenvolva suas habilidades de comunicação praticando com bases de leads</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {dashboardCampaigns.length > 0 ? (
                           dashboardCampaigns.map((campaign) => (
                            <div 
                              key={campaign.id} 
                              onClick={() => router.push(`/campanhas/atendimento/${campaign.id}`)}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#1C2643]/35 hover:bg-white transition-all cursor-pointer group"
                            >
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black text-[#1C2643] uppercase tracking-tight group-hover:text-amber-600 transition-colors">
                                  {campaign.nome}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  {campaign.filtros?.convenio || 'Geral'}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] font-black text-[#1C2643]">
                                  {campaign.publico_estimado?.toLocaleString('pt-BR')} Leads
                                </p>
                                <p className="text-[9px] font-bold text-slate-400">
                                  {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 opacity-40">
                            <Target className="w-8 h-8 mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-center">Nenhuma campanha disponível</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-7 bg-amber-50 rounded-[28px] p-6 border border-amber-100 shadow-sm flex flex-col justify-between">
                      <div className="space-y-4">
                        <span className="text-[10px] font-black text-amber-700 bg-white px-3 py-1 rounded-full border border-amber-200 inline-block uppercase tracking-wider">
                          Suporte & Mentoria
                        </span>
                        <h3 className="text-lg font-black text-[#1C2643] tracking-tight">O Jeito SharkConsig</h3>
                        <p className="text-xs text-slate-700 leading-relaxed font-semibold space-y-2">
                          <span className="block">1. <strong className="font-black text-[#1C2643]">Transparência Total</strong>: Explicamos todas as simulações com clareza.</span>
                          <span className="block">2. <strong className="font-black text-[#1C2643]">Confiança & Ética</strong>: Respeitamos cada cliente e suas decisões.</span>
                          <span className="block">3. <strong className="font-black text-[#1C2643]">Suporte no Cardume</strong>: Em caso de dificuldades técnicas ou dúvidas, seu supervisor de equipe está de prontidão para ajudar. Use nossa mentoria!</span>
                        </p>
                      </div>
                      <div className="mt-8 pt-4 border-t border-amber-200/60 flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-800 tracking-wider font-mono">#SOMOSTUBAROES</span>
                        <div className="relative w-16 h-4 opacity-40">
                          <Image src="/logo.png" alt="SharkConsig" fill className="object-contain" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="propostas"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("transition-opacity duration-500", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}
                >
                  <div className={cn(
                    "grid grid-cols-1 gap-4",
                    isSupervisor ? "lg:grid-cols-12" : "sm:grid-cols-2 lg:grid-cols-4"
                  )}>
            {/* SECTION 1: O CORAÇÃO DO DASHBOARD (Meta Individual e Foto do Colaborador) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className={cn(
                "grid grid-cols-1 gap-4 items-stretch",
                isSupervisor 
                  ? "lg:col-span-8 md:grid-cols-12" 
                  : "col-span-1 sm:col-span-2 lg:col-span-3 lg:row-span-2 md:grid-cols-12"
              )}
            >
              {/* CARTÃO DA FOTO DO COLABORADOR */}
              <div className="md:col-span-5 relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-lg shadow-[#1C2643]/5 min-h-[250px] md:min-h-0">
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
                    <Users className="w-12 h-12 opacity-35" />
                    <span className="text-[8.5px] font-black text-slate-400 mt-2 uppercase tracking-widest text-center px-3">Sem foto cadastrada</span>
                  </div>
                )}
              </div>

              {/* CARD DE METAS ORIGINAL */}
              <DashboardCard className="md:col-span-7 flex flex-col shadow-lg shadow-[#1C2643]/5 overflow-hidden group !p-5 !rounded-[24px]">
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                     <p className="text-[9.5px] font-black text-[#718198] uppercase tracking-widest">
                       {(perfil?.role?.toLowerCase() === 'operacional' || perfil?.role?.toLowerCase() === 'desenvolvedor' || perfil?.role?.toLowerCase() === 'administrador' || isAdmin || isDeveloper) ? "META MENSAL DA EMPRESA" : "Sua Meta Mensal"}
                     </p>
                     <div className="bg-[#1C2643]/5 p-2 rounded-xl">
                        <Target className="w-4 h-4 text-[#1C2643]" />
                     </div>
                  </div>
                  <p className="text-lg sm:text-xl lg:text-[22px] xl:text-[28px] font-black text-[#1C2643] tracking-tighter mb-4 break-words">{formatCurrency(monthlyGoal)}</p>
                  
                  <div className="flex-1 flex flex-col items-center justify-center py-3.5 relative">
                     <div className="w-full max-w-[336px]">
                       <Gauge value={progressPercent} producedValue={displayMonthlyProduced} />
                     </div>
                     <div className="mt-2.5 flex flex-col items-center justify-center">
                        {isLoading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-[#1C2643]" />
                        ) : (
                          <p className="text-4xl sm:text-5xl lg:text-[61px] font-black text-[#1C2643] tracking-tighter leading-none">{progressPercent}%</p>
                        )}
                        <p className="text-[14.4px] font-bold text-[#718198] uppercase tracking-widest mt-2">Atingido</p>
                     </div>
                  </div>

                  <div className="space-y-4 mt-auto">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-center">
                          {progressPercent >= 100 ? "META ALCANÇADA! PARABÉNS!" : "Você está no caminho!"}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-1.5 text-center shrink-0">
                        {remainingValue > 0 ? (
                          <>Faltam <span className="text-[#1C2643] font-black">{formatCurrency(remainingValue)}</span> para a meta</>
                        ) : (
                          <span className="text-emerald-600 font-black">Você superou sua meta este mês!</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </DashboardCard>
            </motion.div>

            {/* SECTION 2: O FOCO DO DIA E RECOMPENSAS */}
            <div className={cn(
              "grid grid-cols-1 gap-4",
              isOperational
                ? "lg:col-span-4 lg:row-span-1 md:grid-cols-2 lg:grid-cols-1"
                : (isSupervisor ? "lg:col-span-4 lg:row-span-1 md:grid-cols-2 lg:grid-cols-1" : "col-span-1 sm:col-span-2 lg:col-span-1")
            )}>
              {isSupervisor && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
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
                          setStartDate(tempStartDate);
                          setEndDate(tempEndDate);
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
                          setStartDate(todayStr);
                          setEndDate(todayStr);
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
                          setStartDate(firstDay);
                          setEndDate(lastDay);
                        }}
                        className="px-2.5 py-2 bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-black rounded-lg hover:bg-slate-100 transition-all active:scale-95 shadow-sm flex items-center justify-center h-8"
                      >
                        MÊS
                      </button>
                    </div>
                  </DashboardCard>
                </motion.div>
              )}
              {!isSupervisor && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                  <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col gap-3 !p-[18px] sm:!p-5 !rounded-[24px]">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-1.5 shrink-0">
                      <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                    </div>
                    <div className="flex flex-col min-w-0 overflow-hidden">
                       <p className="text-[9px] font-bold text-[#718198] uppercase tracking-widest">Meta de Hoje</p>
                       <p className="text-lg sm:text-xl lg:text-[22px] xl:text-[28px] font-black text-[#1C2643] tracking-tighter mt-1 break-words leading-none">{formatCurrency(dailyGoal)}</p>
                    </div>
                    <div className="mt-auto pt-3.5">
                       <div className="flex justify-between items-center mb-1.5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PAGO HOJE</p>
                          <p className="text-[9.5px] font-black text-[#1C2643]">
                            {isLoading ? "..." : (
                              <span className="flex items-center gap-1">
                                {Math.round((displayDailyProduced / dailyGoal) * 100)}%
                              </span>
                            )}
                          </p>
                       </div>
                       <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (displayDailyProduced / dailyGoal) * 100)}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="h-full bg-amber-500" 
                          />
                       </div>
                    </div>
                  </DashboardCard>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col gap-3 bg-[#1C2643] text-white border-[#1C2643] !p-[18px] sm:!p-5 !rounded-[24px]">
                  <div className="flex flex-col min-w-0 overflow-hidden">
                     <div className="flex items-center gap-1.5 mb-1.5">
                       {isSupervisor ? (
                         <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                       ) : (
                         <Gift className="w-3.5 h-3.5 text-amber-400" />
                       )}
                       <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest leading-tight">
                         {isSupervisor ? "CONTRATOS DIGITADOS" : "PRÊMIO ALCANÇADO ATÉ AGORA:"}
                       </p>
                     </div>
                     <div className="mt-1.5 space-y-2.5">
                       {isSupervisor ? (
                         <>
                           <div>
                             <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Hoje</p>
                             <div className="flex items-baseline gap-1.5">
                               <p className="text-xl sm:text-2xl font-black text-amber-400 tracking-tighter leading-none">
                                 {formatCurrency(teamDailyCreatedValue)}
                               </p>
                               <span className="text-[9px] font-bold text-white/60 uppercase">{teamDailyCreatedCount} CONTRATOS</span>
                             </div>
                           </div>
                           <div>
                             <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Esta Semana</p>
                             <div className="flex items-baseline gap-1.5">
                               <p className="text-lg font-black text-white tracking-tighter leading-none">
                                 {formatCurrency(teamWeeklyCreatedValue)}
                               </p>
                               <span className="text-[9px] font-bold text-white/60 uppercase">{teamWeeklyCreatedCount} CONTRATOS</span>
                             </div>
                           </div>
                           <div>
                             <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Este Mês</p>
                             <div className="flex items-baseline gap-1.5">
                               <p className="text-[14px] font-black text-white tracking-tighter leading-none">
                                 {formatCurrency(teamMonthlyCreatedValue)}
                               </p>
                               <span className="text-[9px] font-bold text-white/60 uppercase">{teamMonthlyCreatedCount} CONTRATOS</span>
                             </div>
                           </div>
                         </>
                       ) : (
                         <p className="text-lg sm:text-xl lg:text-[22px] xl:text-[38px] font-black text-amber-400 tracking-tighter mt-1 break-words leading-none">
                           {formatCurrency(currentPrize)}
                         </p>
                       )}
                     </div>
                  </div>
                  <div className="mt-auto pt-2.5 border-t border-white/5">
                     {isSupervisor ? (
                       <div className="flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                         <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest leading-tight">
                           Atualizado em Tempo Real
                         </p>
                       </div>
                     ) : nextPrizeTier ? (
                       <>
                         <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest leading-tight">
                           Próximo Prêmio: {formatCurrency(nextPrizeTier.prize)}
                         </p>
                         <p className="text-[7px] font-bold text-white/30 uppercase tracking-widest mt-0.5 shrink-0">
                           Faltam {formatCurrency(nextPrizeTier.goal - monthlyProduced)} em produção
                         </p>
                       </>
                     ) : (
                       <p className="text-[8px] font-bold text-amber-400 uppercase tracking-widest leading-tight">
                         VOCÊ ATINGIU O TOPO DAS PREMIAÇÕES!
                       </p>
                     )}
                  </div>
                </DashboardCard>
              </motion.div>

              {!isSupervisor && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                  <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col gap-3 !p-[18px] sm:!p-5 !rounded-[24px]">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-1.5 shrink-0">
                      <Users className="w-5 h-5 text-[#1C2643]" />
                    </div>
                    <div className="flex flex-col min-w-0 overflow-hidden flex-1">
                       <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest leading-tight">Meta Mensal do Time</p>
                       <p className="text-[14px] font-black text-[#1C2643] mt-1.5 leading-none">
                         {formatCurrency(teamGoal)}
                       </p>
                       {!isCorretor && (
                         <p className="text-xl sm:text-2xl lg:text-[38px] xl:text-[56px] font-black text-[#1C2643] tracking-tighter mt-auto break-words leading-none pb-2">
                           {Math.round((teamProduced / teamGoal) * 100)}%
                         </p>
                       )}
                    </div>
                  </DashboardCard>
                </motion.div>
              )}
            </div>

            {/* NEW SECTION: APPOINTMENTS OF THE DAY (Interviews & Calls) */}
            {isRecursosHumanos && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.35 }}
                className="lg:col-span-8"
                id="dashboard-appointments-card"
              >
                <Card className="border border-slate-200 bg-white rounded-[28px] shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
                      {/* Left section: icon, stats and toggle */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-6 shrink-0 md:border-r border-slate-100 pr-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0 border border-amber-100 shadow-sm">
                            <Clock className="w-6 h-6 animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-[#1C2643] uppercase tracking-wider">
                                Agenda de Hoje
                              </span>
                            </div>
                            <p className="text-2xl font-black text-[#1C2643] tracking-tighter mt-1">
                              {interviews.filter(i => {
                                const itemTipo = i.tipo || "ENTREVISTAS"
                                if (dashboardInterviewTab === "ENTREVISTAS") {
                                  return itemTipo === "ENTREVISTAS" || i.fase === "Entrevista"
                                }
                                return itemTipo === "LIGAÇÕES" && i.fase !== "Entrevista"
                              }).length} agendadas
                            </p>
                          </div>
                        </div>

                        {/* Cute tabs for the card */}
                        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setDashboardInterviewTab("ENTREVISTAS")}
                            className={cn(
                              "px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl cursor-pointer",
                              dashboardInterviewTab === "ENTREVISTAS"
                                ? "bg-[#1C2643] text-white shadow-md shadow-[#1C2643]/10"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            ENTREVISTAS
                          </button>
                          <button
                            type="button"
                            onClick={() => setDashboardInterviewTab("LIGAÇÕES")}
                            className={cn(
                              "px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl cursor-pointer",
                              dashboardInterviewTab === "LIGAÇÕES"
                                ? "bg-[#1C2643] text-white shadow-md shadow-[#1C2643]/10"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            LIGAÇÕES
                          </button>
                        </div>
                      </div>

                      {/* Right section: Scheduled Categories Quantities (CLT, ESTÁGIO, PJ) */}
                      <div className="flex-1 min-w-0 w-full">
                        {(() => {
                          const activeInterviews = interviews.filter(i => {
                            const itemTipo = i.tipo || "ENTREVISTAS"
                            if (dashboardInterviewTab === "ENTREVISTAS") {
                              return itemTipo === "ENTREVISTAS" || i.fase === "Entrevista"
                            }
                            return itemTipo === "LIGAÇÕES" && i.fase !== "Entrevista"
                          });
                          
                          let cltCount = 0;
                          let estagioCount = 0;
                          let pjCount = 0;

                          activeInterviews.forEach(i => {
                            const areaLower = (i.area || "").toLowerCase().trim();
                            if (areaLower === "estágio" || areaLower === "estagio") {
                              estagioCount++;
                            } else if (areaLower === "não estudas" || areaLower === "nao estudas" || areaLower === "pj") {
                              pjCount++;
                            } else if (areaLower === "comercial" || areaLower === "operacional" || areaLower === "não estudam" || areaLower === "nao estudam") {
                              cltCount++;
                            } else {
                              // Fallback default categorization to CLT if area is specified but unmapped,
                              // or count it as unmapped, but let's default to CLT for other standard office areas
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
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* SECTION 3 & 4: MAPA DE OPORTUNIDADES & RANKING */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.4 }} 
              className={cn(
                isOperational
                  ? "lg:col-span-12"
                  : (isSupervisor ? "lg:col-span-12" : "col-span-1 sm:col-span-2 lg:col-span-2")
              )}
            >
              <div className={cn(
                "grid grid-cols-1 gap-4 h-full",
                isSupervisor ? "md:grid-cols-3" : "md:grid-cols-2"
              )}>
                 {/* Meta de Hoje */}
                 {isSupervisor && (
                   <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                     <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col gap-3 !p-[18px] sm:!p-5 !rounded-[24px]">
                       <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-1.5 shrink-0">
                         <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                       </div>
                       <div className="flex flex-col min-w-0 overflow-hidden">
                          <p className="text-[9px] font-bold text-[#718198] uppercase tracking-widest">Meta de Hoje</p>
                          <p className="text-lg sm:text-xl lg:text-[22px] xl:text-[28px] font-black text-[#1C2643] tracking-tighter mt-1 break-words leading-none">{formatCurrency(dailyGoal)}</p>
                       </div>
                       <div className="mt-auto pt-3.5">
                          <div className="flex justify-between items-center mb-1.5">
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PAGO HOJE</p>
                             <p className="text-[9.5px] font-black text-[#1C2643]">
                               {isLoading ? "..." : (
                                 <span className="flex items-center gap-1">
                                   {Math.round((displayDailyProduced / dailyGoal) * 100)}%
                                   <span className="text-slate-400 font-bold">({formatCurrency(displayDailyProduced)})</span>
                                 </span>
                               )}
                             </p>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${Math.min(100, (displayDailyProduced / dailyGoal) * 100)}%` }}
                               transition={{ duration: 1, delay: 0.5 }}
                               className="h-full bg-amber-500" 
                             />
                          </div>
                       </div>
                     </DashboardCard>
                   </motion.div>
                 )}

                 {/* Pagos recentemente */}
                 <div className="bg-white rounded-[22px] p-4.5 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 mb-1.5">
                       <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-white" />
                       </div>
                       <div>
                          <p className="text-[11.5px] font-black text-[#1C2643] tracking-tight leading-none">
                            {isSupervisor ? "TOTAL DE CONTRATOS EM ANDAMENTO" : "Pagos recentemente"}
                          </p>
                       </div>
                    </div>
                    {isSupervisor ? (
                      <div className="flex flex-col justify-center py-6 gap-1.5">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest text-center">Valor Total em Andamento</p>
                        <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-orange-600 tracking-tighter text-center leading-none">
                          {formatCurrency(teamInProcessValue)}
                        </p>
                        <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col items-center gap-1.5">
                          <span className="text-[11.5px] font-bold text-[#1C2643]">
                            {teamInProcessCount} {teamInProcessCount === 1 ? 'Contrato' : 'Contratos'}
                          </span>
                          <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-6 text-center shrink-0">
                             Você tem <span className="text-[#1C2643] font-black">{formatCurrency(teamPendingInconsistencyValue)}</span> ({teamPendingInconsistencyCount} {teamPendingInconsistencyCount === 1 ? 'pendência' : 'pendências'}) pendentes de atuação
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                         {recentPayments.length > 0 ? (
                           recentPayments.map((p) => (
                             <div key={p.id_lead} className="flex items-center justify-between p-2 px-2.5 bg-slate-50 rounded-xl border border-slate-200">
                               <div className="flex flex-col">
                                 <span className="text-[9.5px] font-black text-[#1C2643] uppercase tracking-tight">{p.nome_cliente}</span>
                                 <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ID: {p.id_lead}</span>
                               </div>
                                 <div className="text-right">
                                 <p className="text-[9.5px] font-black text-emerald-600">
                                   {formatCurrency(parseCurrency(p.valor_producao))}
                                 </p>
                                 <p className="text-[8px] font-bold text-slate-400">{new Date(p.updated_at).toLocaleDateString()} {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                               </div>
                             </div>
                           ))
                         ) : (
                           <div className="flex flex-col items-center justify-center py-8 opacity-30">
                             <CheckCircle2 className="w-6.5 h-6.5 mb-1.5" />
                             <p className="text-[8.5px] font-bold uppercase tracking-widest text-center">Nenhum pagamento registrado</p>
                           </div>
                         )}
                      </div>
                    )}
                 </div>

                   {/* ACESSAR CAMPANHA (Anterior Mapa de oportunidades) */}
                  <div className="bg-white rounded-[22px] p-4.5 border border-slate-200 shadow-sm space-y-3">
                     <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-8 h-8 bg-[#1C2643] rounded-lg flex items-center justify-center">
                           <Target className="w-5 h-5 text-white" />
                        </div>
                        <div>
                           <p className="text-[11.5px] font-black text-[#1C2643] tracking-tight leading-none">
                             {isOperational ? "CONTRATOS EM ANDAMENTO (OPERACIONAL)" : "ACESSAR CAMPANHA"}
                           </p>
                        </div>
                     </div>
                     {isOperational ? (
                       <div className="flex flex-col justify-center py-6 gap-1.5">
                         <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest text-center">Valor Total Operacional</p>
                         <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1C2643] tracking-tighter text-center leading-none">
                           {formatCurrency(opInProcessValue)}
                         </p>
                         <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col items-center gap-1.5">
                           <span className="text-[11.5px] font-bold text-[#1C2643]">
                             {opInProcessCount} {opInProcessCount === 1 ? 'Contrato' : 'Contratos'}
                           </span>
                         </div>
                       </div>
                     ) : (
                       <div className="space-y-2.5">
                          {dashboardCampaigns.length > 0 ? (
                            dashboardCampaigns.map((campaign) => (
                              <div 
                                key={campaign.id} 
                                onClick={() => router.push(`/campanhas/atendimento/${campaign.id}`)}
                                className="flex items-center justify-between p-2 px-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary/30 hover:bg-white transition-all cursor-pointer group"
                              >
                                <div className="flex flex-col">
                                  <span className="text-[9.5px] font-black text-[#1C2643] uppercase tracking-tight group-hover:text-primary transition-colors">
                                    {campaign.nome}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                    {campaign.filtros?.convenio || 'Geral'}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9.5px] font-black text-[#1C2643]">
                                    {campaign.publico_estimado?.toLocaleString('pt-BR')} Leads
                                  </p>
                                  <p className="text-[8px] font-bold text-slate-400">
                                    {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6 opacity-40">
                              <Target className="w-6.5 h-6.5 mb-1.5" />
                              <p className="text-[8.5px] font-bold uppercase tracking-widest text-center">Nenhuma campanha disponível</p>
                            </div>
                          )}
                       </div>
                     )}
                  </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.5 }} 
              className={cn(
                isSupervisor ? "lg:col-span-12" : "col-span-1 sm:col-span-2 lg:col-span-2"
              )}
            >
              <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col bg-white !p-4.5 sm:!p-5 !rounded-[24px]">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-50">
                   <h3 className="text-lg font-black text-[#1C2643] tracking-tight">Ranking de Vendas</h3>
                   <div className="flex items-center gap-3">
                     <Trophy className="w-5 h-5 text-amber-500 fill-amber-500" />
                   </div>
                </div>

                <div className="flex-1 flex flex-col">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full py-16">
                       <Loader2 className="w-6 h-6 animate-spin text-[#1C2643]" />
                    </div>
                  ) : rankings.length > 0 ? (
                    <div>
                      {isSupervisor ? (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                              <th className="px-3 py-2.5 text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Posição e Nome</th>
                              <th className="px-3 py-2.5 text-[8.5px] font-black text-emerald-600 uppercase tracking-widest text-right bg-emerald-100/50">Produção (Pagos)</th>
                              <th className="px-3 py-2.5 text-[8.5px] font-black text-orange-600 uppercase tracking-widest text-right bg-orange-100/50">Em Andamento</th>
                              <th className="px-3 py-2.5 text-[8.5px] font-black text-blue-600 uppercase tracking-widest text-right bg-blue-100/50">Digitadas Hoje</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rankings.map((rank, idx) => {
                              const isUser = rank.corretor_id === perfil?.id
                              const position = idx + 1
                              const isSupervisorRow = rank.funcao?.toLowerCase() === 'supervisor'
                              const isExpanded = !!expandedSupervisorIds[rank.corretor_id]
                              return (
                                <Fragment key={rank.corretor_id}>
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
                                        <div className="flex items-center gap-1.5 min-w-[100px]">
                                          <span className={cn(
                                            "text-[11.5px] font-black tracking-tight",
                                            isUser ? "text-[#1C2643]" : "text-slate-600"
                                          )}>
                                            {rank.nome} {isUser && "(Você)"}
                                          </span>
                                          {isSupervisorRow && (
                                            isExpanded ? (
                                              <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            ) : (
                                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            )
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className={cn(
                                      "px-3 py-3 text-right transition-colors",
                                      isUser ? "bg-emerald-100/70" : "bg-emerald-100/25"
                                    )}>
                                      <div className="flex flex-col items-end">
                                        <span className="text-[11.5px] font-black text-[#1C2643]">{formatCurrency(rank.totalPaid)}</span>
                                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tighter">
                                          {rank.countPaid} {rank.countPaid === 1 ? 'Contrato' : 'Contratos'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className={cn(
                                      "px-3 py-3 text-right transition-colors",
                                      isUser ? "bg-orange-100/70" : "bg-orange-100/25"
                                    )}>
                                      <div className="flex flex-col items-end">
                                        <span className="text-[11.5px] font-bold text-orange-600">{formatCurrency(rank.totalInProcess)}</span>
                                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tighter">
                                          {rank.countInProcess} {rank.countInProcess === 1 ? 'Contrato' : 'Contratos'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className={cn(
                                      "px-3 py-3 text-right transition-colors",
                                      isUser ? "bg-blue-100/70" : "bg-blue-100/25"
                                    )}>
                                      <div className="flex flex-col items-end">
                                        <span className={cn(
                                          "text-[11.5px] font-bold",
                                          rank.totalToday > 0 ? "text-emerald-600" : "text-slate-400"
                                        )}>
                                          {formatCurrency(rank.totalToday)}
                                        </span>
                                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tighter">
                                          {rank.countToday} {rank.countToday === 1 ? 'Contrato' : 'Contratos'}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>

                                  {isSupervisorRow && isExpanded && (
                                    <tr className="bg-slate-50/50">
                                      <td colSpan={4} className="p-3 border-t border-b border-dashed border-slate-200">
                                        <div className="space-y-3.5 pl-4 select-none">
                                          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                            <Users className="w-3.5 h-3.5 text-[#1C2643]" />
                                            <h4 className="text-[9px] font-black text-[#1C2643] uppercase tracking-wider">
                                              Detalhamento de Colaboração (Estagiários)
                                            </h4>
                                          </div>
                                          
                                          {/* Propria section */}
                                          <div className="grid grid-cols-4 gap-2 text-slate-600 bg-white p-2 border border-slate-100 shadow-sm rounded-xl">
                                            <div className="font-bold text-[9px] text-[#1C2643] uppercase tracking-wider flex items-center">
                                              Produção Própria
                                            </div>
                                            <div className="text-right">
                                              <div className="text-[9.5px] text-emerald-600 font-extrabold">{formatCurrency(rank.colaboracoes?.propria.totalPaid || 0)}</div>
                                              <div className="text-[7.5px] text-slate-400 font-bold uppercase">{rank.colaboracoes?.propria.countPaid || 0} PG</div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-[9.5px] text-orange-600 font-extrabold">{formatCurrency(rank.colaboracoes?.propria.totalInProcess || 0)}</div>
                                              <div className="text-[7.5px] text-slate-400 font-bold uppercase">{rank.colaboracoes?.propria.countInProcess || 0} AND</div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-[9.5px] text-blue-600 font-extrabold">{formatCurrency(rank.colaboracoes?.propria.totalToday || 0)}</div>
                                              <div className="text-[7.5px] text-slate-400 font-bold uppercase">{rank.colaboracoes?.propria.countToday || 0} DIG</div>
                                            </div>
                                          </div>

                                          {/* Estagiarios section */}
                                          {(!rank.colaboracoes?.estagiarios || rank.colaboracoes.estagiarios.length === 0) ? (
                                            <p className="text-[9px] font-bold text-slate-400 italic">Nenhuma colaboração de estagiário neste período.</p>
                                          ) : (
                                            <div className="space-y-1.5">
                                              {rank.colaboracoes.estagiarios.map((est) => (
                                                <div key={est.estagiario_id} className="grid grid-cols-4 gap-2 text-slate-600 bg-emerald-50/30 p-2 border border-slate-50 shadow-sm rounded-xl hover:bg-emerald-50/50 transition-colors">
                                                  <div className="font-extrabold text-[9px] text-[#1C2643] truncate flex items-center gap-1 uppercase">
                                                    <GraduationCap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    {est.nome}
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-[9.5px] text-emerald-600 font-extrabold">{formatCurrency(est.totalPaid)}</div>
                                                    <div className="text-[7.5px] text-slate-400 font-bold uppercase">{est.countPaid} PG</div>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-[9.5px] text-orange-600 font-extrabold">{formatCurrency(est.totalInProcess)}</div>
                                                    <div className="text-[7.5px] text-slate-400 font-bold uppercase">{est.countInProcess} AND</div>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-[9.5px] text-blue-600 font-extrabold">{formatCurrency(est.totalToday)}</div>
                                                    <div className="text-[7.5px] text-slate-400 font-bold uppercase">{est.countToday} DIG</div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              )
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                          {displayRankings.map((rank, idx) => {
                            const isUser = rank.isUser
                            const position = rank.position
                            
                            return (
                              <div 
                                key={idx} 
                                className={cn(
                                  "flex sm:items-center justify-between border transition-all duration-300 rounded-xl",
                                  isUser 
                                    ? "bg-[#1C2643] text-white border-[#1C2643] shadow-md shadow-[#1C2643]/20 scale-[1.01] py-4.5 px-4 sm:py-5 sm:px-5 w-full" 
                                    : "bg-slate-50 border-slate-200 text-[#1C2643] p-3"
                                )}
                              >
                                <div className="flex items-center gap-3 sm:gap-4.5 min-w-0 w-full">
                                  <div className={cn(
                                    "rounded-full flex items-center justify-center font-black shrink-0 shadow-sm",
                                    isUser 
                                      ? "w-11 h-11 text-base sm:w-16 sm:h-16 sm:text-xl bg-white text-[#1C2643]" 
                                      : "w-6.5 h-6.5 text-[10px] bg-white border border-slate-200 text-[#718198]"
                                  )}>
                                    {position}º
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <p className={cn(
                                      "font-black tracking-tight line-clamp-1 leading-tight",
                                      isUser ? "text-[16px] sm:text-[21px] text-white" : "text-[11px] text-[#1C2643]"
                                    )}>
                                      {isUser ? (rank.nome?.split(" ")[0] || "") : `Ranking ${position}º`}
                                    </p>
                                    
                                    {isUser && (
                                      <>
                                        <p className="text-[9px] sm:text-[11px] uppercase font-black tracking-widest text-slate-300 mt-0.5 leading-tight">
                                          Sua Produção
                                        </p>
                                        <p className="font-black text-amber-400 text-[18px] sm:text-[26px] leading-tight font-sans tracking-tight mt-0.5 sm:mt-1">
                                          {formatCurrency(rank.totalPaid)}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-8 opacity-40">
                       <Trophy className="w-10 h-10 mb-3" />
                       <p className="text-xs font-bold uppercase tracking-widest text-[#1C2643]">Sem rankings ainda</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-50">
                   <div className="bg-amber-50 p-3 rounded-xl flex items-center gap-3 border border-amber-100">
                      <div className="w-8.5 h-8.5 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
                         <Target className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className="text-[10px] font-bold text-[#1C2643] leading-tight flex-1">
                         {userRank === 1 ? (
                           <span className="text-emerald-600 font-black tracking-tight">PARABÉNS! VOCÊ É O NÚMERO 1! CONTINUE LIDERANDO!</span>
                         ) : userRank > 1 ? (
                           <>Você está na <span className="text-amber-600 font-black">{userRank}ª posição</span>. Falta <span className="text-amber-600 font-black">{formatCurrency(missingForNextRank)}</span> para chegar na {userRank - 1}ª posição!</>
                         ) : (
                           <>Comece a produzir para entrar no <span className="font-black">Ranking</span></>
                         )}
                      </p>
                   </div>
                </div>
              </DashboardCard>
            </motion.div>

            {/* SECTION 5: CAMPANHA DINÂMICA OU MODO TUBARÃO */}
            {!isSupervisor && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.6 }} 
                className="col-span-1 sm:col-span-2 lg:col-span-4"
              >
                {banners.length > 0 ? (
                  <DashboardCard className="relative overflow-hidden text-white w-full aspect-video flex flex-col p-3 sm:p-4 border-none bg-transparent group">
                    <div className="w-full h-full relative">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentBanner}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                          className="absolute inset-0 w-full h-full font-sans"
                        >
                          <Image 
                            src={banners[currentBanner].image_url} 
                            alt={banners[currentBanner].title || "Campanha SharkConsig"} 
                            fill
                            priority
                            referrerPolicy="no-referrer"
                            className="object-cover rounded-[32px] sm:rounded-[40px] shadow-2xl"
                          />
                        </motion.div>
                      </AnimatePresence>

                      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none rounded-b-[32px] sm:rounded-b-[40px]" />

                      {banners.length > 1 && (
                        <>
                          {/* Navigation Arrows */}
                          <button
                            onClick={() => setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length)}
                            className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 hover:bg-black/60 hover:scale-105 active:scale-95 z-20 cursor-pointer shadow-lg"
                            aria-label="Campanha anterior"
                          >
                            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                          </button>
                          <button
                            onClick={() => setCurrentBanner(prev => (prev + 1) % banners.length)}
                            className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 hover:bg-black/60 hover:scale-105 active:scale-95 z-20 cursor-pointer shadow-lg"
                            aria-label="Próxima campanha"
                          >
                            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                          </button>

                          {/* Slide Indicator Dots */}
                          <div className="absolute bottom-8 left-8 flex items-center gap-2 z-10">
                            {banners.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCurrentBanner(idx)}
                                className={cn(
                                  "h-1.5 rounded-full transition-all duration-500",
                                  idx === currentBanner 
                                    ? "bg-white w-10 shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                                    : "bg-white/30 w-3 hover:bg-white/50"
                                )}
                                title={`Ver banner ${idx + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </DashboardCard>
                ) : (
                  <DashboardCard className="relative overflow-hidden w-full aspect-video bg-transparent flex flex-col p-3 sm:p-4 border-none">
                    <div className="flex-1 flex items-center justify-center p-8">
                       <img 
                         src="/logo.png" 
                         alt="SharkConsig" 
                         className="w-48 opacity-5 grayscale"
                       />
                    </div>
                  </DashboardCard>
                )}
              </motion.div>
            )}
            </div>
          </motion.div>
        )) : (
          isAdmin && activeTab === 'chamados' && (
            <motion.div 
              key="chamados"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
              <DashboardCard className="p-6 bg-[#FE9A00]/5 border-[#FE9A00]/20 shadow-sm">
                <p className="text-[10px] font-black text-[#FE9A00] uppercase tracking-[0.2em] mb-1">Aberto</p>
                <p className="text-3xl font-black text-[#FE9A00] tracking-tighter">{ticketStats?.aberto || 0}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-black text-[#FE9A00] uppercase tracking-tighter">
                    {ticketStats?.total ? Math.round((ticketStats.aberto / ticketStats.total) * 100) : 0}%
                  </span>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">do Total</p>
                </div>
              </DashboardCard>

              <DashboardCard className="p-6 bg-[#FF6A03]/5 border-[#FF6A03]/20 shadow-sm">
                <p className="text-[10px] font-black text-[#FF6A03] uppercase tracking-[0.2em] mb-1">Aguardando Operacional</p>
                <p className="text-3xl font-black text-[#FF6A03] tracking-tighter">{ticketStats?.aguardandoOperacional || 0}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-black text-[#FF6A03] uppercase tracking-tighter">
                    {ticketStats?.total ? Math.round((ticketStats.aguardandoOperacional / ticketStats.total) * 100) : 0}%
                  </span>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">do Total</p>
                </div>
              </DashboardCard>

              <DashboardCard className="p-6 bg-[#06BADC]/5 border-[#06BADC]/20 shadow-sm">
                <p className="text-[10px] font-black text-[#06BADC] uppercase tracking-[0.2em] mb-1">Em Negociação / Proposta Enviada</p>
                <p className="text-3xl font-black text-[#06BADC] tracking-tighter">{ticketStats?.inNegotiation || 0}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-black text-[#06BADC] uppercase tracking-tighter">
                    {ticketStats?.total ? Math.round((ticketStats.inNegotiation / ticketStats.total) * 100) : 0}%
                  </span>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">do Total</p>
                </div>
              </DashboardCard>

              <DashboardCard className="p-6 bg-[#10b981]/5 border-[#10b981]/20 shadow-sm">
                <p className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em] mb-1">Aprovado</p>
                <p className="text-3xl font-black text-[#10b981] tracking-tighter">{ticketStats?.approved || 0}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-black text-[#10b981] uppercase tracking-tighter">
                    {ticketStats?.total ? Math.round((ticketStats.approved / ticketStats.total) * 100) : 0}%
                  </span>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">do Total</p>
                </div>
              </DashboardCard>

              <DashboardCard className="p-6 bg-[#ef4444]/5 border-[#ef4444]/20 shadow-sm">
                <p className="text-[10px] font-black text-[#ef4444] uppercase tracking-[0.2em] mb-1">Não Aprovado</p>
                <p className="text-3xl font-black text-[#ef4444] tracking-tighter">{ticketStats?.notApproved || 0}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-black text-[#ef4444] uppercase tracking-tighter">
                    {ticketStats?.total ? Math.round((ticketStats.notApproved / ticketStats.total) * 100) : 0}%
                  </span>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">do Total</p>
                </div>
              </DashboardCard>

              <DashboardCard className="p-6 bg-slate-50/30 border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Todos</p>
                <p className="text-3xl font-black text-slate-600 tracking-tighter">{ticketStats?.total || 0}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-tighter">
                    100%
                  </span>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">Acumulado</p>
                </div>
              </DashboardCard>
            </div>

            {/* Ticket Charts for Admin */}
            {ticketStats && ticketStats.total > 0 && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Produção por Corretor - Now at the Top */}
                <div className="lg:col-span-2">
                  <DashboardCard className="p-8 bg-white border-slate-100 h-auto flex flex-col">
                    <div className="flex items-center gap-2 mb-8">
                      <Users className="w-5 h-5 text-[#1C2643]" />
                      <h3 className="text-sm font-black text-[#1C2643] uppercase tracking-[0.15em]">Produção por Corretor</h3>
                    </div>
                    <div className="space-y-4">
                      {(ticketStats?.byBroker || []).map((item, idx) => {
                        const percentage = ticketStats.total ? Math.round((item.value / ticketStats.total) * 100) : 0
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                              <span className="text-slate-500">{item.name}</span>
                              <span className="text-slate-700">{item.value} ({percentage}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, delay: idx * 0.1 }}
                                className="h-full bg-orange-500"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </DashboardCard>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Bar Chart: Origem dos Clientes - Now here */}
                <DashboardCard className="p-8 bg-white border-slate-100 h-auto flex flex-col">
                  <div className="flex items-center gap-2 mb-8">
                    <TrendingUp className="w-5 h-5 text-[#1C2643]" />
                    <h3 className="text-sm font-black text-[#1C2643] uppercase tracking-[0.15em]">Origem dos Clientes</h3>
                  </div>
                  <div className="space-y-4">
                    {ticketStats.byOrigin.slice(0, 8).map((item, idx) => {
                      const percentage = ticketStats.total ? Math.round((item.value / ticketStats.total) * 100) : 0
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-500">{item.name}</span>
                            <span className="text-slate-700">{item.value} ({percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 }}
                              className="h-full bg-[#1C2643]"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </DashboardCard>

                {/* Distribution: Convênio */}
                <DashboardCard className="p-8 bg-white border-slate-100 h-auto flex flex-col">
                  <div className="flex items-center gap-2 mb-8">
                    <BarChart3 className="w-5 h-5 text-[#1C2643]" />
                    <h3 className="text-sm font-black text-[#1C2643] uppercase tracking-[0.15em]">CHAMADOS POR CONVÊNIO</h3>
                  </div>
                  <div className="space-y-4">
                    {(ticketStats?.byConvenio || []).map((item, idx) => {
                      const percentage = ticketStats.total ? Math.round((item.value / ticketStats.total) * 100) : 0
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-500">{item.name}</span>
                            <span className="text-slate-700">{item.value} ({percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 }}
                              className="h-full bg-blue-500"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </DashboardCard>
              </div>
              </>
            )}

            {(!ticketStats || ticketStats.total === 0) && (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <MessageSquare className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum chamado encontrado</p>
              </div>
            )}
          </motion.div>
          )
        )}
      </>
    )}
  </div>
</div>
)
}

// Components moved to dashboard-shared.tsx or removed
