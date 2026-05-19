"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
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
  BarChart3
} from "lucide-react"

import { useAuth } from "@/context/auth-context"
import { cn, withRetry } from "@/lib/utils"
import { motion } from "motion/react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useSidebar } from "@/context/sidebar-context"
import { DashboardCard, Gauge, formatCurrency } from "@/components/dashboard/dashboard-shared"
import { AdminDashboard } from "@/components/dashboard/admin-dashboard"

interface ProposalSummary {
  id_lead: string
  nome_cliente: string
  valor_producao: string | number
  updated_at: string
  data_pago_cliente?: string
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

interface User {
  id: string
  nome: string
  funcao: string
  supervisor_id: string
  supervisor_nome?: string
  equipe?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { perfil, isCorretor, isAdmin, isOperational } = useAuth()
  const isSupervisor = perfil?.role === 'Supervisor' || perfil?.role === 'Operacional' || perfil?.role === 'Administrativo' || isAdmin
  const { isCollapsed } = useSidebar()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userProposals, setUserProposals] = useState<ProposalSummary[]>([])
  const [rankings, setRankings] = useState<RankingItem[]>([])
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
  const [dashboardCampaigns, setDashboardCampaigns] = useState<Campaign[]>([])
  
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

      // Custom range for Supervisor and Admin and Operational
      const customStart = (isSupervisor || isAdmin || isOperational) && startDate ? new Date(startDate + 'T00:00:00') : null
      const customEnd = (isSupervisor || isAdmin || isOperational) && endDate ? new Date(endDate + 'T23:59:59') : null

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
          .limit(1)
      )
      setBanners(bannerData || [])

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
              
              if (Array.isArray(brokers) && brokers.length > 0) {
                return brokers.includes(userId)
              }
              
              return (Array.isArray(distribution) && distribution.includes(userId)) || 
                     (supervisorId && Array.isArray(distribution) && distribution.includes(supervisorId))
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

        if (targetSupervisorId || isAdmin || isOperational) {
          const team = (isAdmin || isOperational)
            ? allUsers.filter((u: User) => u.funcao === 'Corretor' || u.funcao === 'Supervisor')
            : allUsers.filter((u: User) => 
                u.supervisor_id === targetSupervisorId || u.id === targetSupervisorId
              )
          const teamIds = team.map((m: User) => m.id)

          // Fetch proposals for the team (or all if admin/operational)
          let teamProposalsQuery = supabase
            .from("propostas")
            .select("corretor_id, valor_producao, status, updated_at, created_at, data_pago_cliente")
          
          if (!(isAdmin || isOperational)) {
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
        })

        teamProposals?.forEach((curr: { corretor_id: string, valor_producao: string | number, updated_at: string, created_at: string, status: string, data_pago_cliente?: string }) => {
          const numericVal = isNaN(parseCurrency(curr.valor_producao)) ? 0 : parseCurrency(curr.valor_producao)
          const brokerId = curr.corretor_id || ""
          
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

          if (isPaid && isMTDPaid) {
            teamMTDTotal += numericVal
            if (brokerId === perfil?.id) {
              userMTDTotal += numericVal
            }
          }

          if (isPaid && isPaidInRange) {
            teamTotal += numericVal
            if (isTodayPaid) teamDailyTotal += numericVal
            
            if (brokerMetrics[brokerId]) {
              brokerMetrics[brokerId].totalPaid += numericVal
              brokerMetrics[brokerId].countPaid += 1
            }
          }

          if (isInProcess) {
            teamInProcessValueCalc += numericVal
            teamInProcessCountCalc += 1
            if (curr.status === "COM INCONSISTÊNCIA NO BANCO" || curr.status === "COM INCONSISTÊNCIA NO BANCO / AGUARDANDO OPERACIONAL") {
              teamPendingInconsistencyValueCalc += numericVal
              teamPendingInconsistencyCountCalc += 1
            }
            if (brokerMetrics[brokerId]) {
              brokerMetrics[brokerId].totalInProcess += numericVal
              brokerMetrics[brokerId].countInProcess += 1
            }
          }

          if (isOpInProcess) {
            opInProcessValueCalc += numericVal
            opInProcessCountCalc += 1
          }

          const isCreatedInRange = (customStart || customEnd)
            ? ((!customStart || createdDate >= customStart) && (!customEnd || createdDate <= customEnd))
            : isTodayCreated

          if (isCreatedInRange && !isCancelled && !isRetroactivePayment) {
            teamCreatedTodayValue += numericVal
            teamCreatedTodayCount += 1
            if (brokerMetrics[brokerId]) {
              brokerMetrics[brokerId].totalToday += numericVal
              brokerMetrics[brokerId].countToday += 1
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
        sortedRankings = team.map((m: { id: string, nome: string }) => ({
          corretor_id: m.id,
          nome: m.nome,
          totalPaid: brokerMetrics[m.id]?.totalPaid || 0,
          countPaid: brokerMetrics[m.id]?.countPaid || 0,
          totalInProcess: brokerMetrics[m.id]?.totalInProcess || 0,
          countInProcess: brokerMetrics[m.id]?.countInProcess || 0,
          totalToday: brokerMetrics[m.id]?.totalToday || 0,
          countToday: brokerMetrics[m.id]?.countToday || 0
        })).sort((a: RankingItem, b: RankingItem) => {
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
          .map(([corretor_id, total]) => ({ 
            corretor_id, 
            nome: `Ranking ${corretor_id.substring(0, 4)}`, 
            totalPaid: total as number,
            countPaid: 0,
            totalInProcess: 0,
            countInProcess: 0,
            totalToday: 0,
            countToday: 0
          }))
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

        // 4. Fetch Admin specific stats - Only if Admin
        if (isAdmin) {
          const now = new Date()
          const currentYear = now.getFullYear()
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
            .eq('tipo', 'empresa')
            .eq('ano', currentYear)

          const annualGoalConfig = goalsData?.find(g => g.mes === 0)
          const annualGoalValue = annualGoalConfig?.valor_mensal || 0
          const monthlyGoalValue = annualGoalValue / 12

          setAdminStats({
            monthlyGoal: monthlyGoalValue,
            monthlyProduced: teamMTDTotal,
            annualGoal: annualGoalValue,
            annualProduced: annualProducedValue,
            dailyGoal: monthlyGoalValue / 22,
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
                totalPaid: r.totalPaid,
                totalInProcess: r.totalInProcess,
                totalToday: r.totalToday,
                countPaid: r.countPaid,
                countInProcess: r.countInProcess,
                countToday: r.countToday
              }
            }),
            ticketStats: finalTicketStats
          })
        }
      } catch (err) {
        console.error("Error fetching admin dashboard stats:", err instanceof Error ? err.message : err)
      }

    } catch (error) {
      console.error("Erro dashboard:", error)
    } finally {
      setIsLoading(false)
    }
  }, [perfil?.id, perfil?.role, perfil?.supervisor_id, isCorretor, isAdmin, isOperational, isSupervisor, startDate, endDate])

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

  const monthlyProduced = useMemo(() => {
    // Respect custom filter if applied, otherwise use current month
    const startThreshold = (isSupervisor || isAdmin || isOperational) && startDate 
      ? new Date(startDate + 'T00:00:00') 
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    
    startThreshold.setHours(0, 0, 0, 0)

    const endThreshold = (isSupervisor || isAdmin || isOperational) && endDate 
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
  }, [userProposals, startDate, endDate, isSupervisor, isAdmin, isOperational])

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

  const monthlyGoal = (isSupervisor || isOperational || isAdmin) ? 448000 : 47000
  const teamGoal = 448000
  
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
  
  const getRemainingBusinessDays = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const today = now.getDate()
    const lastDay = new Date(year, month + 1, 0).getDate()
    
    const holidays = [
      { month: 4, day: 1 }, // May 1st
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
    return count
  }

  const remainingBusinessDays = getRemainingBusinessDays()
  const dailyGoal = remainingBusinessDays > 0 ? remainingValue / remainingBusinessDays : 0

  const userRank = rankings.findIndex(r => r.corretor_id === perfil?.id) + 1
  
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

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      <Header title="DASHBOARD" />
      
      <div className={cn(
        "p-4 lg:p-8 space-y-8 mx-auto w-full pb-20 transition-all duration-300",
        isCollapsed ? "max-w-full lg:px-12" : "max-w-[1600px]"
      )}>
        {isAdmin && adminStats && (
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
        
        {(!isAdmin) && (
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
            </div>

            {/* TABS SELECTION AND FILTER */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex items-center gap-2 p-1 bg-slate-100/80 w-fit rounded-2xl">
                <button
                  onClick={() => setActiveTab('propostas')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
                    activeTab === 'propostas' 
                      ? "bg-white text-[#1C2643] shadow-md shadow-[#1C2643]/5" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <TrendingUp className="w-4 h-4" />
                  METAS E PRODUÇÃO
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('chamados')}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
                      activeTab === 'chamados' 
                        ? "bg-white text-[#1C2643] shadow-md shadow-[#1C2643]/5" 
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                    CHAMADOS
                  </button>
                )}
              </div>

              {/* Filter Section - Aligned to Right, Below Tabs */}
              {isSupervisor && (
                <div className="flex justify-end">
                  <div className="flex items-end gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Início</span>
                      <input 
                        type="date" 
                        value={tempStartDate}
                        onChange={(e) => setTempStartDate(e.target.value)}
                        className="text-[12px] font-bold text-[#1C2643] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#1C2643]/20"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Fim</span>
                      <input 
                        type="date" 
                        value={tempEndDate}
                        onChange={(e) => setTempEndDate(e.target.value)}
                        className="text-[12px] font-bold text-[#1C2643] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#1C2643]/20"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setStartDate(tempStartDate);
                          setEndDate(tempEndDate);
                        }}
                        disabled={!tempStartDate && !tempEndDate}
                        className="px-4 py-2 bg-[#1C2643] text-white text-[10px] font-black rounded-lg hover:bg-[#1C2643]/90 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm h-[34px]"
                      >
                        APLICAR
                      </button>
                      <button 
                        onClick={() => {
                          const todayStr = format(new Date(), "yyyy-MM-dd");
                          setTempStartDate(todayStr);
                          setTempEndDate(todayStr);
                          setStartDate(todayStr);
                          setEndDate(todayStr);
                        }}
                        className="px-4 py-2 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg hover:bg-slate-200 transition-all active:scale-95 shadow-sm h-[34px]"
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
                        className="px-4 py-2 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg hover:bg-slate-200 transition-all active:scale-95 shadow-sm h-[34px]"
                      >
                        MÊS
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'propostas' ? (
              <motion.div 
                key="propostas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("transition-opacity duration-500", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* SECTION 1: O CORAÇÃO DO DASHBOARD (Meta Individual) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-4 lg:row-span-2">
              <DashboardCard className="h-full flex flex-col shadow-2xl shadow-[#1C2643]/5 overflow-hidden group">
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                     <p className="text-[12px] font-black text-[#718198] uppercase tracking-widest">
                       {(perfil?.role?.toLowerCase() === 'operacional' || isAdmin) ? "META MENSAL DA EMPRESA" : "Sua Meta Mensal"}
                     </p>
                     <div className="bg-[#1C2643]/5 p-2 rounded-xl">
                        <Target className="w-5 h-5 text-[#1C2643]" />
                     </div>
                  </div>
                  <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-[#1C2643] tracking-tighter mb-6 break-words">{formatCurrency(monthlyGoal)}</p>
                  
                  <div className="flex-1 flex flex-col items-center justify-center py-6 relative">
                    <div className="w-full max-w-[280px]">
                      <Gauge value={progressPercent} producedValue={displayMonthlyProduced} />
                    </div>
                    <div className="mt-4 flex flex-col items-center justify-center">
                       {isLoading ? (
                         <Loader2 className="w-8 h-8 animate-spin text-[#1C2643]" />
                       ) : (
                         <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1C2643] tracking-tighter leading-none">{progressPercent}%</p>
                       )}
                       <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest mt-2">Atingido</p>
                    </div>
                  </div>

                  <div className="space-y-6 mt-auto">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-center">
                          {progressPercent >= 100 ? "META ALCANÇADA! PARABÉNS!" : "Você está no caminho!"}
                        </span>
                      </div>
                      <p className="text-[12px] sm:text-[13px] font-bold text-slate-500 mt-2 text-center shrink-0">
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
            <div className={cn("lg:col-span-8 grid grid-cols-1 gap-6", isSupervisor ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3")}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-2 shrink-0">
                    <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
                  </div>
                  <div className="flex flex-col min-w-0 overflow-hidden">
                     <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest">Meta de Hoje</p>
                     <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-[#1C2643] tracking-tighter mt-1 break-words leading-none">{formatCurrency(dailyGoal)}</p>
                  </div>
                  <div className="mt-auto pt-4">
                     <div className="flex justify-between items-center mb-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">PAGO HOJE</p>
                        <p className="text-[11px] font-black text-[#1C2643]">
                          {isLoading ? "..." : (
                            <span className="flex items-center gap-1">
                              {Math.round((displayDailyProduced / dailyGoal) * 100)}%
                              {isSupervisor && (
                                <span className="text-slate-400 font-bold">({formatCurrency(displayDailyProduced)})</span>
                              )}
                            </span>
                          )}
                        </p>
                     </div>
                     <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
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

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4 bg-[#1C2643] text-white border-[#1C2643]">
                  <div className="flex flex-col min-w-0 overflow-hidden">
                     <div className="flex items-center gap-2 mb-2">
                       {isSupervisor ? (
                         <CheckCircle2 className="w-4 h-4 text-amber-400" />
                       ) : (
                         <Gift className="w-4 h-4 text-amber-400" />
                       )}
                       <p className="text-[13px] font-bold text-white/60 uppercase tracking-widest leading-tight">
                         {isSupervisor ? "CONTRATOS DIGITADOS" : "PRÊMIO ALCANÇADO ATÉ AGORA:"}
                       </p>
                     </div>
                     <div className="mt-2 space-y-3">
                       {isSupervisor ? (
                         <>
                           <div>
                             <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Hoje</p>
                             <div className="flex items-baseline gap-2">
                               <p className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tighter leading-none">
                                 {formatCurrency(teamDailyCreatedValue)}
                               </p>
                               <span className="text-[11px] font-bold text-white/60 uppercase">{teamDailyCreatedCount} CONTRATOS</span>
                             </div>
                           </div>
                           <div>
                             <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Esta Semana</p>
                             <div className="flex items-baseline gap-2">
                               <p className="text-xl font-black text-white tracking-tighter leading-none">
                                 {formatCurrency(teamWeeklyCreatedValue)}
                               </p>
                               <span className="text-[11px] font-bold text-white/60 uppercase">{teamWeeklyCreatedCount} CONTRATOS</span>
                             </div>
                           </div>
                           <div>
                             <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Este Mês</p>
                             <div className="flex items-baseline gap-2">
                               <p className="text-base font-black text-white tracking-tighter leading-none">
                                 {formatCurrency(teamMonthlyCreatedValue)}
                               </p>
                               <span className="text-[11px] font-bold text-white/60 uppercase">{teamMonthlyCreatedCount} CONTRATOS</span>
                             </div>
                           </div>
                         </>
                       ) : (
                         <p className="text-xl sm:text-2xl lg:text-3xl xl:text-5xl font-black text-amber-400 tracking-tighter mt-1 break-words leading-none">
                           {formatCurrency(currentPrize)}
                         </p>
                       )}
                     </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-white/5">
                     {isSupervisor ? (
                       <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                         <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest leading-tight">
                           Atualizado em Tempo Real
                         </p>
                       </div>
                     ) : nextPrizeTier ? (
                       <>
                         <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-tight">
                           Próximo Prêmio: {formatCurrency(nextPrizeTier.prize)}
                         </p>
                         <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1 shrink-0">
                           Faltam {formatCurrency(nextPrizeTier.goal - monthlyProduced)} em produção
                         </p>
                       </>
                     ) : (
                       <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest leading-tight">
                         VOCÊ ATINGIU O TOPO DAS PREMIAÇÕES!
                       </p>
                     )}
                  </div>
                </DashboardCard>
              </motion.div>

              {!isSupervisor && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                  <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-2 shrink-0">
                      <Users className="w-6 h-6 text-[#1C2643]" />
                    </div>
                    <div className="flex flex-col min-w-0 overflow-hidden flex-1">
                       <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest leading-tight">Meta Mensal do Time</p>
                       <p className="text-[13px] font-black text-[#1C2643] mt-1.5 leading-none">
                         {formatCurrency(teamGoal)}
                       </p>
                       <p className="text-2xl sm:text-3xl lg:text-5xl xl:text-7xl font-black text-[#1C2643] tracking-tighter mt-auto break-words leading-none pb-2">
                         {Math.round((teamProduced / teamGoal) * 100)}%
                       </p>
                    </div>
                  </DashboardCard>
                </motion.div>
              )}
            </div>

            {/* SECTION 3 & 4: MAPA DE OPORTUNIDADES & RANKING */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                 {/* Pagos recentemente */}
                 <div className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                       </div>
                       <div>
                          <p className="text-[14px] font-black text-[#1C2643] tracking-tight leading-none">
                            {isSupervisor ? "TOTAL DE CONTRATOS EM ANDAMENTO" : "Pagos recentemente"}
                          </p>
                       </div>
                    </div>
                    {isSupervisor ? (
                      <div className="flex flex-col justify-center py-8 gap-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Valor Total em Andamento</p>
                        <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-orange-600 tracking-tighter text-center leading-none">
                          {formatCurrency(teamInProcessValue)}
                        </p>
                        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col items-center gap-2">
                          <span className="text-[14px] font-bold text-[#1C2643]">
                            {teamInProcessCount} {teamInProcessCount === 1 ? 'Contrato' : 'Contratos'}
                          </span>
          <p className="text-[12px] sm:text-[13px] font-bold text-slate-500 mt-10 text-center shrink-0">
            Você tem <span className="text-[#1C2643] font-black">{formatCurrency(teamPendingInconsistencyValue)}</span> ({teamPendingInconsistencyCount} {teamPendingInconsistencyCount === 1 ? 'pendência' : 'pendências'}) pendentes de atuação
          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                         {recentPayments.length > 0 ? (
                           recentPayments.map((p) => (
                             <div key={p.id_lead} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                               <div className="flex flex-col">
                                 <span className="text-[11px] font-black text-[#1C2643] uppercase tracking-tight">{p.nome_cliente}</span>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {p.id_lead}</span>
                               </div>
                                 <div className="text-right">
                                 <p className="text-[11px] font-black text-emerald-600">
                                   {formatCurrency(parseCurrency(p.valor_producao))}
                                 </p>
                                 <p className="text-[9px] font-bold text-slate-400">{new Date(p.updated_at).toLocaleDateString()} {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                               </div>
                             </div>
                           ))
                         ) : (
                           <div className="flex flex-col items-center justify-center py-10 opacity-30">
                             <CheckCircle2 className="w-8 h-8 mb-2" />
                             <p className="text-[10px] font-bold uppercase tracking-widest text-center">Nenhum pagamento registrado</p>
                           </div>
                         )}
                      </div>
                    )}
                 </div>

                  {/* ACESSAR CAMPANHA (Anterior Mapa de oportunidades) */}
                  <div className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm space-y-4">
                     <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-[#1C2643] rounded-xl flex items-center justify-center">
                           <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                           <p className="text-[14px] font-black text-[#1C2643] tracking-tight leading-none">
                             {isOperational ? "CONTRATOS EM ANDAMENTO (OPERACIONAL)" : "ACESSAR CAMPANHA"}
                           </p>
                        </div>
                     </div>
                     {isOperational ? (
                       <div className="flex flex-col justify-center py-8 gap-2">
                         <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Valor Total Operacional</p>
                         <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1C2643] tracking-tighter text-center leading-none">
                           {formatCurrency(opInProcessValue)}
                         </p>
                         <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col items-center gap-2">
                           <span className="text-[14px] font-bold text-[#1C2643]">
                             {opInProcessCount} {opInProcessCount === 1 ? 'Contrato' : 'Contratos'}
                           </span>
                         </div>
                       </div>
                     ) : (
                       <div className="space-y-3">
                          {dashboardCampaigns.length > 0 ? (
                            dashboardCampaigns.map((campaign) => (
                              <div 
                                key={campaign.id} 
                                onClick={() => router.push(`/campanhas/atendimento/${campaign.id}`)}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 hover:border-primary/30 hover:bg-white transition-all cursor-pointer group"
                              >
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-black text-[#1C2643] uppercase tracking-tight group-hover:text-primary transition-colors">
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
                     )}
                  </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className={cn(isSupervisor ? "lg:col-span-12" : "lg:col-span-4")}>
              <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col bg-white">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                   <h3 className="text-xl font-black text-[#1C2643] tracking-tight">Ranking de Vendas</h3>
                   <div className="flex items-center gap-4">
                     <Trophy className="w-6 h-6 text-amber-500 fill-amber-500" />
                   </div>
                </div>

                <div className="flex-1 flex flex-col">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full py-20">
                       <Loader2 className="w-8 h-8 animate-spin text-[#1C2643]" />
                    </div>
                  ) : rankings.length > 0 ? (
                    <div>
                      {isSupervisor ? (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posição e Nome</th>
                              <th className="px-4 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right bg-emerald-100/50">Produção (Pagos)</th>
                              <th className="px-4 py-3 text-[10px] font-black text-orange-600 uppercase tracking-widest text-right bg-orange-100/50">Em Andamento</th>
                              <th className="px-4 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest text-right bg-blue-100/50">Digitadas Hoje</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rankings.map((rank, idx) => {
                              const isUser = rank.corretor_id === perfil?.id
                              const position = idx + 1
                              return (
                                <tr key={rank.corretor_id} className={cn(
                                  "transition-colors",
                                  isUser ? "bg-[#1C2643]/5" : "hover:bg-slate-50/80"
                                )}>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                                        position === 1 ? "bg-amber-100 text-amber-600" : 
                                        position === 2 ? "bg-slate-100 text-slate-600" :
                                        position === 3 ? "bg-orange-100 text-orange-600" :
                                        "bg-slate-50 text-slate-400"
                                      )}>
                                        {position}º
                                      </div>
                                      <span className={cn(
                                        "text-[13px] font-black tracking-tight",
                                        isUser ? "text-[#1C2643]" : "text-slate-600"
                                      )}>
                                        {rank.nome} {isUser && "(Você)"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className={cn(
                                    "px-4 py-4 text-right transition-colors",
                                    isUser ? "bg-emerald-100/70" : "bg-emerald-100/25"
                                  )}>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[13px] font-black text-[#1C2643]">{formatCurrency(rank.totalPaid)}</span>
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
                                      <span className="text-[13px] font-bold text-orange-600">{formatCurrency(rank.totalInProcess)}</span>
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
                                        "text-[13px] font-bold",
                                        rank.totalToday > 0 ? "text-emerald-600" : "text-slate-400"
                                      )}>
                                        {formatCurrency(rank.totalToday)}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                        {rank.countToday} {rank.countToday === 1 ? 'Contrato' : 'Contratos'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {rankings.slice(0, 2).map((rank, idx) => {
                            const isUser = rank.corretor_id === perfil?.id
                            const position = idx + 1
                            
                            return (
                              <div 
                                key={idx} 
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                                  isUser 
                                    ? "bg-[#1C2643] text-white border-[#1C2643] shadow-lg shadow-[#1C2643]/20 scale-[1.02]" 
                                    : "bg-slate-50 border-slate-200 text-[#1C2643]"
                                )}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                                    isUser ? "bg-white text-[#1C2643]" : "bg-white border border-slate-200 text-[#718198]"
                                  )}>
                                    {position}º
                                  </div>
                                  <div className="flex flex-col">
                                    <p className={cn(
                                      "text-[13px] font-black tracking-tight line-clamp-1",
                                      isUser ? "text-white" : "text-[#1C2643]"
                                    )}>
                                      {isUser ? rank.nome : `Ranking ${position}º`}
                                    </p>
                                  </div>
                                </div>
                                {isUser && (
                                  <p className={cn(
                                    "text-[13px] font-black shrink-0 ml-2",
                                    isUser ? "text-amber-400" : "text-[#718198]"
                                  )}>
                                    {formatCurrency(rank.totalPaid)}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                          
                          {/* Redundant position message removed as requested */}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-10 opacity-40">
                       <Trophy className="w-12 h-12 mb-4" />
                       <p className="text-sm font-bold uppercase tracking-widest text-[#1C2643]">Sem rankings ainda</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50">
                   <div className="bg-amber-50 p-4 rounded-2xl flex items-center gap-4 border border-amber-100">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                         <Target className="w-5 h-5 text-amber-500" />
                      </div>
                      <p className="text-[12px] font-bold text-[#1C2643] leading-tight flex-1">
                         {userRank === 1 ? (
                           <span className="text-emerald-600 font-black tracking-tight">PARABÉNS! VOCÊ É O NÚMERO 1! CONTINUE LIDERANDO!</span>
                         ) : userRank > 1 ? (
                           <>Você está na <span className="text-amber-600 font-black">{userRank}ª posição</span>. Acelere para chegar ao topo!</>
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
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="lg:col-span-8">
                {banners.length > 0 ? (
                  <DashboardCard className="relative overflow-hidden text-white w-full aspect-video flex flex-col p-3 sm:p-4 border-none bg-transparent">
                    <div className="w-full h-full">
                       <img 
                         src={banners[0].image_url} 
                         alt={banners[0].title || "Campanha SharkConsig"} 
                         className="w-full h-full object-cover rounded-[32px] sm:rounded-[40px]"
                       />
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
        ) : (
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
