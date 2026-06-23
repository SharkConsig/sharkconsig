"use client"

import React from "react"
import { motion, AnimatePresence } from "motion/react"
import { 
  Target, 
  Zap, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Trophy,
  Loader2,
  BarChart3,
  MessageSquare,
  Users,
  Calendar,
  FileSpreadsheet,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Briefcase
} from "lucide-react"
import { format } from "date-fns"
import { cn, formatName } from "@/lib/utils"
import Image from "next/image"
import { DashboardCard, Gauge, formatCurrency } from "./dashboard-shared"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Perfil {
  id: string
  nome: string
  role: string
  avatar_url?: string
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
  isPJ?: boolean
  approvedTicketsCount: number
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

interface AdminDashboardProps {
  perfil: Perfil | null
  isLoading: boolean
  remainingBusinessDays: number
  headerContent: { greeting: string, phrase: string }
  stats: AdminStats
  startDate: string
  endDate: string
  setStartDate: (d: string) => void
  setEndDate: (d: string) => void
  estagioRankingGroup?: RankingItem | null
}

export function AdminDashboard({ 
  perfil, 
  isLoading, 
  remainingBusinessDays, 
  headerContent, 
  stats,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  estagioRankingGroup
}: AdminDashboardProps) {
  const {
    monthlyGoal,
    monthlyProduced,
    annualGoal,
    annualProduced,
    dailyProduced,
    inProcessValue,
    inProcessCount,
    pendingActionsValue,
    createdTodayValue,
    createdTodayCount,
    createdWeekValue,
    createdWeekCount,
    createdMonthValue,
    createdMonthCount,
    brokerRankings,
    ticketStats
  } = stats

  const [tempStartDate, setTempStartDate] = React.useState(startDate)
  const [tempEndDate, setTempEndDate] = React.useState(endDate)
  const [activeTab, setActiveTab] = React.useState<'propostas' | 'chamados' | 'financeiro'>('propostas')
  const [expandedSupervisorIds, setExpandedSupervisorIds] = React.useState<Record<string, boolean>>({})

  // ==========================================
  // ESTADOS E FUNÇÕES DO TAB FINANCEIRO (EXCLUSIVO ADMIN)
  // ==========================================
  interface FinanceiroProposal {
    id: number
    id_lead?: string
    created_at: string
    updated_at?: string
    data_venda?: string
    data_pago_cliente?: string
    data_digitacao?: string
    nome_cliente?: string
    banco?: string
    tipo_operacao?: string
    convenio?: string
    valor_cliente?: number | string
    valor_operacao?: number | string
    prazo?: number | string
    taxa?: number | string
    status?: string
    corretor?: string
    corretor_id?: string
  }

  const [propostasList, setPropostasList] = React.useState<FinanceiroProposal[]>([])
  const [loadingFinanceiro, setLoadingFinanceiro] = React.useState(false)

  // Period filter mode: 'DIA' | 'SEMANA' | 'MES' | 'TRIMESTRE' | 'ANO' | 'CUSTOM'
  const [periodoFilter, setPeriodoFilter] = React.useState<'DIA' | 'SEMANA' | 'MES' | 'TRIMESTRE' | 'ANO' | 'CUSTOM'>('MES')
  const [finStartDate, setFinStartDate] = React.useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [finEndDate, setFinEndDate] = React.useState(() => {
    const d = new Date()
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
  })

  // Dropdown filter selections
  const [valProdutoFilter, setValProdutoFilter] = React.useState<string>('TODOS')
  const [valConvenioFilter, setValConvenioFilter] = React.useState<string>('TODOS')
  const [valBancoFilter, setValBancoFilter] = React.useState<string>('TODOS')
  const [valCorretorFilter, setValCorretorFilter] = React.useState<string>('TODOS')
  const [valStatusFilter, setValStatusFilter] = React.useState<string>('TODOS')

  // Set dates dynamically based on period preset
  React.useEffect(() => {
    const now = new Date()
    const format = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, "0")
      const r = String(d.getDate()).padStart(2, "0")
      return `${y}-${m}-${r}`
    }

    if (periodoFilter === 'DIA') {
      const todayStr = format(now)
      setFinStartDate(todayStr)
      setFinEndDate(todayStr)
    } else if (periodoFilter === 'SEMANA') {
      const dayOfWeek = now.getDay()
      const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const monday = new Date(now.setDate(diffToMonday))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      setFinStartDate(format(monday))
      setFinEndDate(format(sunday))
    } else if (periodoFilter === 'MES') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setFinStartDate(format(first))
      setFinEndDate(format(last))
    } else if (periodoFilter === 'TRIMESTRE') {
      const currentQuarter = Math.floor(now.getMonth() / 3)
      const firstMonth = currentQuarter * 3
      const first = new Date(now.getFullYear(), firstMonth, 1)
      const last = new Date(now.getFullYear(), firstMonth + 3, 0)
      setFinStartDate(format(first))
      setFinEndDate(format(last))
    } else if (periodoFilter === 'ANO') {
      const first = new Date(now.getFullYear(), 0, 1)
      const last = new Date(now.getFullYear(), 11, 31)
      setFinStartDate(format(first))
      setFinEndDate(format(last))
    }
  }, [periodoFilter])

  // Fetch proposals
  const fetchFinanceiroPropostas = React.useCallback(async () => {
    setLoadingFinanceiro(true)
    try {
      const { data, error } = await supabase
        .from('propostas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000)

      if (error) {
        console.error("Error fetching propostas (Financeiro):", error.message, "Details:", error.details, "Hint:", error.hint, "Code:", error.code)
      } else if (data) {
        setPropostasList(data as unknown as FinanceiroProposal[])
      }
    } catch (err) {
      console.error("Error fetching propostas in catch: ", err)
    } finally {
      setLoadingFinanceiro(false)
    }
  }, [])

  React.useEffect(() => {
    if (activeTab === 'financeiro') {
      fetchFinanceiroPropostas()
    }
  }, [activeTab, fetchFinanceiroPropostas])

  // Get normalized status type mapping
  const getNormalizedStatusType = (dbStatus: string | undefined): 'digitado' | 'aprovado' | 'pago' | 'cancelado' | 'pendente' | 'reprovado' | 'outro' => {
    if (!dbStatus) return 'outro'
    const s = dbStatus.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    if (s.includes('pago') || s.includes('concluido') || s.includes('concluído') || s.includes('paga')) return 'pago'
    if (s.includes('reprovad')) return 'reprovado'
    if (s.includes('cancelad')) return 'cancelado'
    if (s.includes('aprovad')) return 'aprovado'
    if (s.includes('digitad') || s.includes('digitac')) return 'digitado'
    if (s.includes('pendent') || s.includes('aguardando') || s.includes('inconsistenc')) return 'pendente'
    return 'outro'
  }

  // Parse money field
  const parseMoney = (val: string | number | null | undefined): number => {
    if (val === null || val === undefined) return 0
    if (typeof val === 'number') return val
    const valStr = val.toString().trim()
    const clean = valStr.replace(/[^\d,.-]/g, '')
    if (clean.includes('.') && clean.includes(',')) {
      return parseFloat(clean.replace(/\./g, '').replace(',', '.'))
    } else if (clean.includes(',')) {
      return parseFloat(clean.replace(',', '.'))
    }
    const parsed = parseFloat(clean)
    return isNaN(parsed) ? 0 : parsed
  }

  // Proposal Date resolver
  const getProposalDate = (p: FinanceiroProposal): Date => {
    const rawDate = p.data_pago_cliente || p.data_venda || p.data_digitacao || p.created_at
    return rawDate ? new Date(rawDate) : new Date()
  }

  // Previous Period boundaries calculation
  const previousPeriod = React.useMemo(() => {
    const start = new Date(finStartDate + 'T00:00:00')
    const end = new Date(finEndDate + 'T23:59:59')
    const diffTime = end.getTime() - start.getTime()
    const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000)
    const prevStart = new Date(prevEnd.getTime() - diffTime)
    
    return {
      start: prevStart,
      end: prevEnd
    }
  }, [finStartDate, finEndDate])

  // Compute stats and structures
  const computedData = React.useMemo(() => {
    const start = new Date(finStartDate + 'T00:00:00')
    const end = new Date(finEndDate + 'T23:59:59')
    const prevStart = previousPeriod.start
    const prevEnd = previousPeriod.end

    const currentProps: FinanceiroProposal[] = []
    const prevProps: FinanceiroProposal[] = []

    propostasList.forEach(p => {
      const pDate = getProposalDate(p)
      if (pDate >= start && pDate <= end) {
        currentProps.push(p)
      } else if (pDate >= prevStart && pDate <= prevEnd) {
        prevProps.push(p)
      }
    })

    const applyFilters = (list: FinanceiroProposal[]) => {
      return list.filter(p => {
        if (valProdutoFilter !== 'TODOS') {
          const prodLower = (p.tipo_operacao || "").toLowerCase()
          const filterLower = valProdutoFilter.toLowerCase()
          if (!prodLower.includes(filterLower) && !filterLower.includes(prodLower)) {
            return false
          }
        }
        if (valConvenioFilter !== 'TODOS') {
          const convLower = (p.convenio || "").toLowerCase()
          const filterLower = valConvenioFilter.toLowerCase()
          if (!convLower.includes(filterLower) && !filterLower.includes(convLower)) {
            return false
          }
        }
        if (valBancoFilter !== 'TODOS') {
          const bnkLower = (p.banco || "").toLowerCase()
          const filterLower = valBancoFilter.toLowerCase()
          if (!bnkLower.includes(filterLower) && !filterLower.includes(bnkLower)) {
            return false
          }
        }
        if (valCorretorFilter !== 'TODOS') {
          if (p.corretor !== valCorretorFilter && p.corretor_id !== valCorretorFilter) {
            return false
          }
        }
        if (valStatusFilter !== 'TODOS') {
          const nStatus = getNormalizedStatusType(p.status)
          if (nStatus !== valStatusFilter.toLowerCase()) {
            return false
          }
        }
        return true
      })
    }

    const currentFiltered = applyFilters(currentProps)
    const prevFiltered = applyFilters(prevProps)

    let currentProducaoTotal = 0
    let currentReceitaTotal = 0
    let currentPaidContractsCount = 0

    currentFiltered.forEach(p => {
      const statusType = getNormalizedStatusType(p.status)
      const valLiberado = parseMoney(p.valor_cliente || p.valor_producao)
      const valReceita = parseMoney(p.valor_operacao)

      if (statusType === 'pago') {
        currentPaidContractsCount++
      }
      currentProducaoTotal += valLiberado
      currentReceitaTotal += valReceita
    })

    const currentTicketMedio = currentPaidContractsCount > 0 ? currentProducaoTotal / currentPaidContractsCount : 0
    const currentReceitaMedia = currentPaidContractsCount > 0 ? currentReceitaTotal / currentPaidContractsCount : 0

    let prevProducaoTotal = 0
    let prevReceitaTotal = 0
    let prevPaidContractsCount = 0

    prevFiltered.forEach(p => {
      const statusType = getNormalizedStatusType(p.status)
      const valLiberado = parseMoney(p.valor_cliente || p.valor_producao)
      const valReceita = parseMoney(p.valor_operacao)

      if (statusType === 'pago') {
        prevPaidContractsCount++
      }
      prevProducaoTotal += valLiberado
      prevReceitaTotal += valReceita
    })

    const prevTicketMedio = prevPaidContractsCount > 0 ? prevProducaoTotal / prevPaidContractsCount : 0
    const prevReceitaMedia = prevPaidContractsCount > 0 ? prevReceitaTotal / prevPaidContractsCount : 0

    const getGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    const growthProducao = getGrowth(currentProducaoTotal, prevProducaoTotal)
    const growthReceita = getGrowth(currentReceitaTotal, prevReceitaTotal)
    const growthContratos = getGrowth(currentPaidContractsCount, prevPaidContractsCount)
    const growthTicketMedio = getGrowth(currentTicketMedio, prevTicketMedio)
    const growthReceitaMedia = getGrowth(currentReceitaMedia, prevReceitaMedia)

    // Analysis by Product
    const mapProdutos: Record<string, { contracts: number; producao: number; receita: number }> = {}
    currentFiltered.forEach(p => {
      const prod = p.tipo_operacao || 'NÃO INFORMADO'
      const statusType = getNormalizedStatusType(p.status)
      const pVal = parseMoney(p.valor_cliente || p.valor_producao)
      const rVal = parseMoney(p.valor_operacao)

      if (!mapProdutos[prod]) {
        mapProdutos[prod] = { contracts: 0, producao: 0, receita: 0 }
      }
      if (statusType === 'pago') {
        mapProdutos[prod].contracts++
      }
      mapProdutos[prod].producao += pVal
      mapProdutos[prod].receita += rVal
    })

    const listProdutos = Object.entries(mapProdutos).map(([name, data]) => {
      const ticket = data.contracts > 0 ? data.producao / data.contracts : 0
      const recMedia = data.contracts > 0 ? data.receita / data.contracts : 0
      const partProducao = currentProducaoTotal > 0 ? (data.producao / currentProducaoTotal) * 100 : 0
      const partReceita = currentReceitaTotal > 0 ? (data.receita / currentReceitaTotal) * 100 : 0
      return {
        name,
        contracts: data.contracts,
        producao: data.producao,
        receita: data.receita,
        ticket,
        recMedia,
        partProducao,
        partReceita
      }
    }).sort((a, b) => b.receita - a.receita)

    // Analysis by Convênio
    const mapConvenio: Record<string, { contracts: number; producao: number; receita: number }> = {}
    currentFiltered.forEach(p => {
      const conv = p.convenio || 'NÃO INFORMADO'
      const statusType = getNormalizedStatusType(p.status)
      const pVal = parseMoney(p.valor_cliente || p.valor_producao)
      const rVal = parseMoney(p.valor_operacao)

      if (!mapConvenio[conv]) {
        mapConvenio[conv] = { contracts: 0, producao: 0, receita: 0 }
      }
      if (statusType === 'pago') {
        mapConvenio[conv].contracts++
      }
      mapConvenio[conv].producao += pVal
      mapConvenio[conv].receita += rVal
    })

    const listConvenios = Object.entries(mapConvenio).map(([name, data]) => {
      const part = currentReceitaTotal > 0 ? (data.receita / currentReceitaTotal) * 100 : 0
      return {
        name,
        contracts: data.contracts,
        producao: data.producao,
        receita: data.receita,
        participation: part
      }
    }).sort((a, b) => b.receita - a.receita)

    // Analysis by Banco
    const mapBancos: Record<string, { contracts: number; producao: number; receita: number }> = {}
    currentFiltered.forEach(p => {
      const bco = p.banco || 'NÃO INFORMADO'
      const statusType = getNormalizedStatusType(p.status)
      const pVal = parseMoney(p.valor_cliente || p.valor_producao)
      const rVal = parseMoney(p.valor_operacao)

      if (!mapBancos[bco]) {
        mapBancos[bco] = { contracts: 0, producao: 0, receita: 0 }
      }
      if (statusType === 'pago') {
        mapBancos[bco].contracts++
      }
      mapBancos[bco].producao += pVal
      mapBancos[bco].receita += rVal
    })

    const listBancos = Object.entries(mapBancos).map(([name, data]) => {
      const recMedia = data.contracts > 0 ? data.receita / data.contracts : 0
      const part = currentReceitaTotal > 0 ? (data.receita / currentReceitaTotal) * 100 : 0
      return {
        name,
        contracts: data.contracts,
        producao: data.producao,
        receita: data.receita,
        recMedia,
        participation: part
      }
    }).sort((a, b) => b.receita - a.receita)

    // History Evolution (monthly grouping)
    const mapHisto: Record<string, { producao: number; receita: number; contracts: number }> = {}
    currentFiltered.forEach(p => {
      const pDate = getProposalDate(p)
      const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`
      const statusType = getNormalizedStatusType(p.status)
      const pVal = parseMoney(p.valor_cliente || p.valor_producao)
      const rVal = parseMoney(p.valor_operacao)

      if (!mapHisto[key]) {
        mapHisto[key] = { producao: 0, receita: 0, contracts: 0 }
      }
      if (statusType === 'pago') {
        mapHisto[key].contracts++
      }
      mapHisto[key].producao += pVal
      mapHisto[key].receita += rVal
    })

    const listHistory = Object.entries(mapHisto).map(([month, data]) => {
      const [y, m] = month.split('-')
      const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      const label = `${labels[parseInt(m) - 1]}/${y}`
      return {
        month,
        label,
        producao: data.producao,
        receita: data.receita,
        contracts: data.contracts
      }
    }).sort((a, b) => a.month.localeCompare(b.month))

    return {
      currentProducaoTotal,
      currentReceitaTotal,
      currentPaidContractsCount,
      currentTicketMedio,
      currentReceitaMedia,
      prevProducaoTotal,
      prevReceitaTotal,
      prevPaidContractsCount,
      prevTicketMedio,
      prevReceitaMedia,
      growthProducao,
      growthReceita,
      growthContratos,
      growthTicketMedio,
      growthReceitaMedia,
      listProdutos,
      listConvenios,
      listBancos,
      listHistory
    }
  }, [propostasList, finStartDate, finEndDate, previousPeriod, valProdutoFilter, valConvenioFilter, valBancoFilter, valCorretorFilter, valStatusFilter])

  // Get dynamic Filter dropdown options directly mapped from database records to guarantee coherence
  const filterOptions = React.useMemo(() => {
    const produtos = new Set<string>()
    const convenios = new Set<string>()
    const bancos = new Set<string>()
    const corretores = new Set<string>()

    propostasList.forEach(p => {
      if (p.tipo_operacao) produtos.add(p.tipo_operacao.trim().toUpperCase())
      if (p.convenio) convenios.add(p.convenio.trim().toUpperCase())
      if (p.banco) bancos.add(p.banco.trim().toUpperCase())
      if (p.corretor) corretores.add(p.corretor.trim())
    })

    return {
      produtos: Array.from(produtos).filter(Boolean).sort(),
      convenios: Array.from(convenios).filter(Boolean).sort(),
      bancos: Array.from(bancos).filter(Boolean).sort(),
      corretores: Array.from(corretores).filter(Boolean).sort()
    }
  }, [propostasList])

  React.useEffect(() => {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
  }, [startDate, endDate])

  const progressPercent = monthlyGoal > 0 ? Math.round((monthlyProduced / monthlyGoal) * 100) : 0
  const remainingValue = Math.max(0, monthlyGoal - monthlyProduced)

  // Recalculate daily goal based on remaining value and remaining business days
  const calculatedDailyGoal = remainingBusinessDays > 0 ? remainingValue / remainingBusinessDays : 0

  const dailyProgressPercent = calculatedDailyGoal > 0 ? Math.round((dailyProduced / calculatedDailyGoal) * 100) : 0

  const annualProgressPercent = annualGoal > 0 ? Math.round((annualProduced / annualGoal) * 100) : 0
  const annualRemainingValue = Math.max(0, annualGoal - annualProduced)

  return (
    <div className="space-y-8">
      {/* 1. Linha da saudação e o prazo para bater a meta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-[#1C2643] tracking-tighter">
            {headerContent.greeting}, {perfil?.nome?.split(' ')[0] || 'Admin'}!
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
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-amber-100">
             <Clock className="w-7 h-7 text-amber-500" />
          </div>
          <div className="relative z-10">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Prazo Para Bater a Meta</p>
             <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#1C2643]">{remainingBusinessDays.toString().padStart(2, '0')}</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Dias Restantes</span>
             </div>
             <p className="text-[11px] font-medium text-slate-500 mt-1 max-w-[200px] leading-tight">
                <span className="text-amber-600 font-bold italic">Sua corrida rumo à meta.</span> Faltam apenas {remainingBusinessDays} dias úteis.
             </p>
          </div>
        </motion.div>
      </div>

      {/* TABS SELECTION */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-2 p-1 bg-slate-100/80 w-fit rounded-2xl">
          <button
            onClick={() => setActiveTab('propostas')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer",
              activeTab === 'propostas' 
                ? "bg-white text-[#1C2643] shadow-md shadow-[#1C2643]/5" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            METAS E PRODUÇÃO
          </button>
          <button
            onClick={() => setActiveTab('chamados')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer",
              activeTab === 'chamados' 
                ? "bg-white text-[#1C2643] shadow-md shadow-[#1C2643]/5" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            CHAMADOS
          </button>
          <button
            onClick={() => setActiveTab('financeiro')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer",
              activeTab === 'financeiro' 
                ? "bg-white text-[#1C2643] shadow-md shadow-[#1C2643]/5" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <TrendingUp className="w-4 h-4" />
            FINANCEIRO & ESTRATÉGICO
          </button>
        </div>
      </div>

      {activeTab === 'propostas' && (
        <motion.div 
          key="propostas"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Existing Proposal Content */}
          {/* 2. Meta mensal da empresa (velocimetro) */}
          {/* Subproject containing Photo and Meta cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="lg:col-span-8 lg:row-span-2 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch"
          >
            {/* 1. COLLABORATOR PHOTO CARD */}
            <div className="md:col-span-5 relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-[#1C2643]/5 min-h-[320px] md:min-h-0">
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

            {/* 2. Meta mensal da empresa (velocimetro) */}
            <DashboardCard className="md:col-span-7 flex flex-col shadow-2xl shadow-[#1C2643]/5 overflow-hidden group border-slate-100">
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-[12px] font-black text-[#718198] uppercase tracking-widest">Meta Mensal da Empresa</p>
                   <div className="bg-[#1C2643]/5 p-2 rounded-xl">
                      <Target className="w-5 h-5 text-[#1C2643]" />
                   </div>
                </div>
                <p className="text-lg sm:text-xl lg:text-2xl font-black text-[#1C2643] tracking-tighter mb-6 break-words">{formatCurrency(monthlyGoal)}</p>
                
                <div className="flex-1 flex flex-col items-center justify-center py-6 relative">
                  <div className="w-full max-w-[280px]">
                    <Gauge value={progressPercent} producedValue={monthlyProduced} />
                  </div>
                  <div className="mt-4 flex flex-col items-center justify-center">
                     {isLoading ? (
                       <Loader2 className="w-8 h-8 animate-spin text-[#1C2643]" />
                     ) : (
                       <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1C2643] tracking-tighter leading-none">{progressPercent}%</p>
                     )}
                     <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest mt-2 tracking-[0.3em]">PROGRESSO TOTAL</p>
                  </div>
                </div>

                <div className="space-y-6 mt-auto">
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

          {/* 3. Meta de Hoje e 4. Meta Mensal do Time */}
          <div className="lg:col-span-4 lg:row-span-2 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1">
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



          {/* Meta Anual da Empresa */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col justify-between bg-[#1C2643] text-white border-[#1C2643]">
              <div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                   <Target className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest leading-tight">Meta Anual da Empresa</p>
                <div className="flex flex-col mt-2">
                  <p className="text-xl lg:text-2xl font-black text-emerald-400 tracking-tighter leading-none">{formatCurrency(annualGoal)}</p>
                  <p className="text-[10px] font-bold text-white/30 uppercase mt-1">Total acumulado: {formatCurrency(annualProduced)}</p>
                </div>
              </div>
              
              <div className="mt-8">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <p className="text-xl lg:text-2xl font-black tracking-tighter leading-none text-white">{annualProgressPercent}%</p>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">Atingido</p>
                  </div>
                  <div className="text-right pb-1">
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Faltam para bater:</p>
                    <p className="text-[11px] font-black text-white/90 uppercase tracking-tight">{formatCurrency(annualRemainingValue)}</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${annualProgressPercent}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]" 
                  />
                </div>
              </div>
            </DashboardCard>
          </motion.div>
        </div>

        {/* 5. Total de contratos em andamento e Pendente de atuação */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
             {/* Meta de Hoje */}
             <div className="bg-white rounded-[22px] p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
                <div className="w-full font-sans">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0 border border-amber-100">
                        <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                     </div>
                     <p className="text-[11.5px] font-black text-[#1C2643] tracking-tight uppercase leading-none">META DE HOJE</p>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                    <p className="text-[9px] font-semibold text-[#718198] uppercase tracking-widest">VALOR DA META DE HOJE</p>
                    <p className="text-2xl lg:text-3xl font-black text-[#1C2643] tracking-tighter leading-none">
                      {formatCurrency(calculatedDailyGoal)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100">
                   <div className="flex justify-between items-center mb-1.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">PAGO HOJE: {formatCurrency(dailyProduced)}</p>
                      <p className="text-[10px] font-black text-[#1C2643] leading-none">{dailyProgressPercent}%</p>
                   </div>
                   <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${dailyProgressPercent}%` }}
                        transition={{ duration: 1 }}
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                      />
                   </div>
                </div>
             </div>

             {/* Total de contratos em andamento */}
             <div className="bg-white rounded-[22px] p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-2 mb-1.5">
                   <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                   </div>
                   <div>
                      <p className="text-[11.5px] font-black text-[#1C2643] tracking-tight leading-none uppercase">TOTAL DE CONTRATOS EM ANDAMENTO</p>
                   </div>
                </div>

                <div className="flex flex-col justify-center py-4 gap-1.5">
                  <p className="text-[9px] font-semibold text-[#718198] uppercase tracking-widest text-center">Valor Total em Andamento</p>
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FF4A00] tracking-tighter text-center leading-none">
                    {formatCurrency(inProcessValue)}
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col items-center gap-1.5">
                    <span className="text-[11.5px] font-bold text-[#1C2643]">
                      {inProcessCount} {inProcessCount === 1 ? 'Contrato' : 'Contratos'}
                    </span>
                    <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-2 text-center shrink-0">
                       Você tem <span className="text-[#1C2643] font-black">{formatCurrency(pendingActionsValue)}</span> pendentes de atuação
                    </p>
                  </div>
                </div>
             </div>

             {/* Contratos Digitados (Replacing redundant Pendente de Atuação) */}
             <div className="bg-[#1C2643] rounded-[22px] p-4.5 border border-[#1C2643] shadow-lg shadow-[#1C2643]/10 flex flex-col justify-between text-white">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                     <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-amber-400" />
                     </div>
                     <div>
                        <p className="text-[11.5px] font-black text-white tracking-tight leading-none uppercase">CONTRATOS DIGITADOS</p>
                        <p className="text-[8.5px] font-bold text-white/40 uppercase tracking-widest mt-1">Produção Bruta</p>
                     </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Hoje</p>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-[15px] font-black text-amber-400 tracking-tight">
                          {formatCurrency(createdTodayValue)}
                        </p>
                        <span className="text-[8.5px] font-bold text-white/60 uppercase">({createdTodayCount} contr.)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Esta Semana</p>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-[14px] font-black text-white tracking-tight">
                          {formatCurrency(createdWeekValue)}
                        </p>
                        <span className="text-[8.5px] font-bold text-white/60 uppercase">({createdWeekCount} contr.)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Este Mês</p>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-[14px] font-black text-white tracking-tight">
                          {formatCurrency(createdMonthValue)}
                        </p>
                        <span className="text-[8.5px] font-bold text-white/60 uppercase">({createdMonthCount} contr.)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                     <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest leading-none">
                       Atualizado em Tempo Real
                     </p>
                   </div>
                </div>
             </div>
          </div>
        </motion.div>

        {/* 6. Ranking de Vendas dos corretores */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-12">
          <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col bg-white border-slate-100">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
               <div className="flex items-center gap-3">
                 <h3 className="text-xl font-black text-[#1C2643] tracking-tighter uppercase">Ranking de Vendas</h3>
                 <Trophy className="w-6 h-6 text-amber-500 fill-amber-500" />
               </div>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar">
              {isLoading ? (
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
                      <th className="px-4 py-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-right bg-slate-50">Clientes Aprovados</th>
                      <th className="px-4 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right bg-emerald-100/50">Produção (Pagos)</th>
                      <th className="px-4 py-3 text-[10px] font-black text-orange-600 uppercase tracking-widest text-right bg-orange-100/50">Em Andamento</th>
                      <th className="px-4 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest text-right bg-blue-100/50">Digitadas Hoje</th>
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
                            <td className="px-4 py-4 text-right bg-slate-50/50">
                              <div className="flex flex-col items-end">
                                <span className="text-[14px] font-black text-[#1C2643]">{rank.approvedTicketsCount || 0}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                  {(rank.approvedTicketsCount || 0) === 1 ? 'Chamado' : 'Chamados'}
                                </span>
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
                              <td colSpan={5} className="p-4 border-t border-b border-dashed border-slate-250">
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
                                        <div key={est.estagiario_id} className="grid grid-cols-5 gap-4 text-slate-600 bg-emerald-50/20 p-3 border border-slate-50 shadow-sm rounded-2xl hover:bg-emerald-50/40 transition-colors">
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
                                            <div className="text-[11.5px] text-[#1C2643] font-extrabold">{est.approvedTicketsCount || 0}</div>
                                            <div className="text-[8.5px] text-slate-400 font-bold uppercase">Chamados</div>
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
            className="lg:col-span-12 mt-6"
            id="estagio-pj-ranking-card-admin"
          >
            <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col bg-white !p-4.5 sm:!p-5 !rounded-[24px] border-slate-100">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                 <div className="flex items-center gap-3">
                   <h3 className="text-xl font-black text-[#1C2643] tracking-tighter uppercase">Estagiários e Colaboradores PJ</h3>
                   <GraduationCap className="w-6 h-6 text-emerald-500" />
                 </div>
              </div>

              <div className="flex-1 flex flex-col overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posição e Nome</th>
                      <th className="px-4 py-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-right bg-slate-50">Clientes Aprovados</th>
                      <th className="px-4 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right bg-emerald-100/50">Produção (Pagos)</th>
                      <th className="px-4 py-3 text-[10px] font-black text-orange-600 uppercase tracking-widest text-right bg-orange-100/50">Em Andamento</th>
                      <th className="px-4 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest text-right bg-blue-100/50">Digitadas Hoje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estagioRankingGroup.colaboracoes.estagiarios.map((est, idx) => {
                      const position = idx + 1
                      return (
                        <tr key={est.estagiario_id} className="hover:bg-slate-50/80 transition-colors">
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
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  {est.isPJ ? (
                                    <Briefcase className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  ) : (
                                    <GraduationCap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  )}
                                  <span className="text-[14px] font-black tracking-tight text-[#1C2643]">
                                    {formatName(est.nome)}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-400 ml-1">
                                    ({est.isPJ ? "PJ" : "ESTÁGIO"})
                                  </span>
                                </div>
                                {est.supervisor && (
                                  <p className="text-[10px] font-bold text-slate-400 tracking-tighter mt-0.5">
                                    SUP: {formatName(est.supervisor)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right bg-slate-50/50">
                            <div className="flex flex-col items-end">
                              <span className="text-[14px] font-black text-[#1C2643]">{est.approvedTicketsCount || 0}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {(est.approvedTicketsCount || 0) === 1 ? 'Chamado' : 'Chamados'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right bg-emerald-100/25">
                            <div className="flex flex-col items-end">
                              <span className="text-[14px] font-black text-[#1C2643]">{formatCurrency(est.totalPaid)}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {est.countPaid} {est.countPaid === 1 ? 'Contrato' : 'Contratos'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right bg-orange-100/25">
                            <div className="flex flex-col items-end">
                              <span className="text-[14px] font-bold text-orange-600">{formatCurrency(est.totalInProcess)}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {est.countInProcess} {est.countInProcess === 1 ? 'Contrato' : 'Contratos'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right bg-blue-100/25">
                            <div className="flex flex-col items-end">
                              <span className={cn(
                                "text-[14px] font-bold",
                                est.totalToday > 0 ? "text-blue-600" : "text-slate-400"
                              )}>
                                {formatCurrency(est.totalToday)}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
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
      </motion.div>
      )}

      {activeTab === 'chamados' && (
        <motion.div 
          key="chamados"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Ticket Stats Dashboard */}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart: Origem dos Clientes - Expanded to fill-row since we removed the Pie Chart */}
          <div className="lg:col-span-2">
            <DashboardCard className="p-8 bg-white border-slate-100 h-auto flex flex-col">
              <div className="flex items-center gap-2 mb-8">
                <Users className="w-5 h-5 text-[#1C2643]" />
                <h3 className="text-sm font-black text-[#1C2643] uppercase tracking-[0.15em]">Produção por Corretor</h3>
              </div>
              <div className="space-y-4">
                {(ticketStats?.byBroker || []).map((rank, idx) => {
                  const percentage = ticketStats.total ? Math.round((rank.value / ticketStats.total) * 100) : 0
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-500">{rank.name}</span>
                        <span className="text-slate-700">{rank.value} ({percentage}%)</span>
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
          <DashboardCard className="p-8 bg-white border-slate-100 h-auto flex flex-col">
            <div className="flex items-center gap-2 mb-8">
              <TrendingUp className="w-5 h-5 text-[#1C2643]" />
              <h3 className="text-sm font-black text-[#1C2643] uppercase tracking-[0.15em]">Origem dos Clientes</h3>
            </div>
            <div className="space-y-4">
              {ticketStats?.byOrigin.slice(0, 8).map((item, idx) => {
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
        </motion.div>
      )}

      {activeTab === 'financeiro' && (
        <motion.div
          key="financeiro"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8 font-sans"
        >
          {/* HEADER DEDICADO DO CONTROLADOR FINANCEIRO */}
          <div className="bg-white rounded-[28px] border border-slate-100 p-6 md:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#1C2643] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-6 rounded bg-[#1C2643] inline-block" />
                  Painel Estratégico & Financeiro
                </h2>
                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Consolidação corporativa, margem de comissionamento e evolução histórica de propostas
                </p>
              </div>
              <button
                onClick={() => fetchFinanceiroPropostas()}
                disabled={loadingFinanceiro}
                className="self-start md:self-auto px-4 py-2 bg-slate-50 hover:bg-[#1C2643]/5 border border-slate-200 text-[#1C2643] text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Clock className={cn("w-3.5 h-3.5", loadingFinanceiro && "animate-spin")} />
                {loadingFinanceiro ? "Atualizando..." : "Sincronizar Dados"}
              </button>
            </div>

            {/* SEPARADOR DE FILTROS TEMPORAIS E PRESETS */}
            <div className="border-t border-slate-100 pt-6">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                
                {/* 1. Quick Presets Ribbon */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 w-fit">
                  {(['DIA', 'SEMANA', 'MES', 'TRIMESTRE', 'ANO', 'CUSTOM'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setPeriodoFilter(preset)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer",
                        periodoFilter === preset
                          ? "bg-[#1C2643] text-white shadow-md shadow-[#1C2643]/15"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                      )}
                    >
                      {preset === 'DIA' && "Hoje"}
                      {preset === 'SEMANA' && "Esta Semana"}
                      {preset === 'MES' && "Este Mês"}
                      {preset === 'TRIMESTRE' && "Trimestre"}
                      {preset === 'ANO' && "Este Ano"}
                      {preset === 'CUSTOM' && "Personalizado ⚙️"}
                    </button>
                  ))}
                </div>

                {/* 2. Custom Date pickers when active */}
                <AnimatePresence>
                  {periodoFilter === 'CUSTOM' && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2 md:p-3 shrink-0"
                    >
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">De:</span>
                        <input
                          type="date"
                          value={finStartDate}
                          onChange={(e) => setFinStartDate(e.target.value)}
                          className="bg-transparent border-none text-[11px] font-bold text-[#1C2643] outline-none max-w-[120px]"
                        />
                      </div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Até:</span>
                        <input
                          type="date"
                          value={finEndDate}
                          onChange={(e) => setFinEndDate(e.target.value)}
                          className="bg-transparent border-none text-[11px] font-bold text-[#1C2643] outline-none max-w-[120px]"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* FILTROS SEGMENTADOS DE PRODUTOS, CONVÊNIOS, BANCOS, CONSULTORES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                
                {/* Produto Selection */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">PRODUTO</span>
                  <select
                    value={valProdutoFilter}
                    onChange={(e) => setValProdutoFilter(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-black text-[#1C2643] outline-none cursor-pointer border-none p-0"
                  >
                    <option value="TODOS">TODOS OS PRODUTOS</option>
                    {filterOptions.produtos.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Convênio Selection */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">CONVÊNIO / ÓRGÃO</span>
                  <select
                    value={valConvenioFilter}
                    onChange={(e) => setValConvenioFilter(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-black text-[#1C2643] outline-none cursor-pointer border-none p-0"
                  >
                    <option value="TODOS">TODOS OS CONVÊNIOS</option>
                    {filterOptions.convenios.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Banco Selection */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">CANAIS / BANCOS</span>
                  <select
                    value={valBancoFilter}
                    onChange={(e) => setValBancoFilter(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-black text-[#1C2643] outline-none cursor-pointer border-none p-0"
                  >
                    <option value="TODOS">TODOS OS BANCOS</option>
                    {filterOptions.bancos.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Consultor Selection */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">RESPONSÁVEL COMERCIAL</span>
                  <select
                    value={valCorretorFilter}
                    onChange={(e) => setValCorretorFilter(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-black text-[#1C2643] outline-none cursor-pointer border-none p-0"
                  >
                    <option value="TODOS">TODOS OS CONSULTORES</option>
                    {filterOptions.corretores.map(corr => (
                      <option key={corr} value={corr}>{corr}</option>
                    ))}
                  </select>
                </div>

                {/* Status Selection */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">STATUS DA OPERAÇÃO</span>
                  <select
                    value={valStatusFilter}
                    onChange={(e) => setValStatusFilter(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-black text-[#1C2643] outline-none cursor-pointer border-none p-0"
                  >
                    <option value="TODOS">TODOS OS STATUS</option>
                    <option value="DIGITADO">DIGITADO / EM ANÁLISE</option>
                    <option value="APROVADO">APROVADO</option>
                    <option value="PAGO">PAGO AO CLIENTE</option>
                    <option value="PENDENTE">INCONSISTENTES / EM PENDÊNCIA</option>
                    <option value="REPROVADO">REPROVADO / RECUSADO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </div>

              </div>
            </div>
          </div>

          {loadingFinanceiro ? (
            /* FINANCE LOADING SKELETON SCREENS */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-[24px] border border-slate-100 p-6 animate-pulse space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100" />
                    <div className="h-6 bg-slate-100 rounded w-1/2" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white h-96 rounded-[28px] border border-slate-100 p-6 animate-pulse" />
                <div className="bg-white h-96 rounded-[28px] border border-slate-100 p-6 animate-pulse" />
              </div>
            </div>
          ) : propostasList.length === 0 ? (
            /* EMPTY STATE */
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[28px] border border-dashed border-slate-200 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100 shadow-sm">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-black text-[#1C2643] uppercase tracking-widest">Nenhuma proposta encontrada</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm px-6">
                Não há registros na base de dados para o período e filtros definidos no topo. Tente ajustar os parâmetros.
              </p>
            </div>
          ) : (
            /* REAL DATA VIEW */
            <>
              {/* INDICADORES EM CARTÕES PREMIUM (GRID 4 COLUNAS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. PRODUÇÃO TOTAL DO PERÍODO */}
                <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PRODUÇÃO CORPORATIVA</span>
                      <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-[#1C2643] mt-3 tracking-tighter">
                      {formatCurrency(computedData.currentProducaoTotal)}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 block pt-1.5 border-t border-slate-50">
                      Soma total dos valores concedidos aos clientes
                    </span>
                  </div>
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Período Anterior</span>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1",
                      computedData.growthProducao >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {computedData.growthProducao >= 0 ? "+" : ""}{computedData.growthProducao.toFixed(1)}% MoM
                    </span>
                  </div>
                </div>

                {/* 2. RECEITA TOTAL DA EMPRESA */}
                <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FATURAMENTO / COMISSÃO</span>
                      <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100">
                        <Zap className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-[#10b981] mt-3 tracking-tighter">
                      {formatCurrency(computedData.currentReceitaTotal)}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 block pt-1.5 border-t border-slate-50">
                      Volume arrecadado s/ novos contratos digitados
                    </span>
                  </div>
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Crescimento Financeiro</span>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1",
                      computedData.growthReceita >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {computedData.growthReceita >= 0 ? "+" : ""}{computedData.growthReceita.toFixed(1)}% MoM
                    </span>
                  </div>
                </div>

                {/* 3. CONTRATOS PAGOS */}
                <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CONTRATOS QUITADOS</span>
                      <div className="w-7 h-7 bg-[#1C2643]/5 text-[#1C2643] rounded-lg flex items-center justify-center border border-[#1C2643]/10">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-[#1C2643] mt-3 tracking-tighter">
                      {computedData.currentPaidContractsCount} <span className="text-xs text-slate-400 font-bold tracking-normal uppercase">pagos</span>
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 block pt-1.5 border-t border-slate-50">
                      Operações aprovadas consolidadas no período
                    </span>
                  </div>
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Volumetria de Vendas</span>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1",
                      computedData.growthContratos >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {computedData.growthContratos >= 0 ? "+" : ""}{computedData.growthContratos.toFixed(1)}% MoM
                    </span>
                  </div>
                </div>

                {/* 4. TICKET MÉDIO */}
                <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TICKET MÉDIO</span>
                      <div className="w-7 h-7 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center border border-amber-100">
                        <Trophy className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-[#1C2643] mt-3 tracking-tighter">
                      {formatCurrency(computedData.currentTicketMedio)}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 block pt-1.5 border-t border-slate-50">
                      Média financeira líquida de cada operação paga
                    </span>
                  </div>
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Receita Média /Contrato</span>
                    <span className="text-[10.5px] font-bold text-amber-600 tracking-tight">
                      {formatCurrency(computedData.currentReceitaMedia)}
                    </span>
                  </div>
                </div>

              </div>

              {/* BLOCO GRÁFICO 1: PORTFOLIO MIX (PRODUTO) E DESEMPENHO CONVÊNIOS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* SEÇÃO ANALÍTICA LINHAS DE NEGÓCIO */}
                <div className="lg:col-span-7 bg-white rounded-[28px] border border-slate-100 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#1C2643]">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#1C2643] uppercase tracking-wider">
                        Mix de Produtos e Eficiência Comercial
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Breakdown de faturamento comercial agrupado por canal de venda
                      </p>
                    </div>
                  </div>

                  {computedData.listProdutos.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-black">Nenhuma venda consolidada registrada no período</div>
                  ) : (
                    <div className="space-y-6">
                      {computedData.listProdutos.slice(0, 8).map((prod, idx) => (
                        <div key={prod.name} className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-black uppercase">
                            <span className="text-slate-600 tracking-tight flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {prod.name}
                            </span>
                            <span className="text-[#1C2643] tracking-widest">
                              {formatCurrency(prod.receita)} <span className="text-slate-400 font-bold">({prod.partReceita.toFixed(1)}%)</span>
                            </span>
                          </div>
                          
                          {/* Progress Meter with proportional width */}
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${prod.partReceita}%` }}
                              transition={{ duration: 0.8, delay: idx * 0.05 }}
                              className="h-full bg-slate-800 rounded-full"
                            />
                          </div>

                          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>{prod.contracts} {prod.contracts === 1 ? "venda paga" : "vendas pagas"}</span>
                            <span>Produção: {formatCurrency(prod.producao)}</span>
                            <span>Ticket: {formatCurrency(prod.ticket)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DESEMPENHO DOS CONVÊNIOS E ÓRGÃOS */}
                <div className="lg:col-span-5 bg-white rounded-[28px] border border-slate-100 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#1C2643]">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#1C2643] uppercase tracking-wider">
                        Rank de Convênios & Concentração
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Performance de conversão financeira por esfera de órgão
                      </p>
                    </div>
                  </div>

                  {computedData.listConvenios.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-black">Nenhum convênio registrado para os filtros correntes</div>
                  ) : (
                    <div className="space-y-4">
                      {computedData.listConvenios.map((conv, idx) => (
                        <div key={conv.name} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-black text-[#1C2643] uppercase tracking-tight block">
                                {idx + 1}º. {conv.name}
                              </span>
                              <span className="text-[8.5px] font-bold text-slate-400 uppercase mt-0.5 block">
                                {conv.contracts} {conv.contracts === 1 ? "operação consolidada" : "operações consolidadas"}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] font-black text-slate-800 block">
                                {formatCurrency(conv.receita)}
                              </span>
                              <span className="text-[8.5px] font-bold text-emerald-600 block">
                                {conv.participation.toFixed(1)}% Share
                              </span>
                            </div>
                          </div>
                          
                          {/* Segment bar */}
                          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${conv.participation}%` }}
                              transition={{ duration: 0.8 }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* BLOCO GRÁFICO 2: DESEMPENHO BANCÁRIO E EVOLUÇÃO TEMPORAL */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* EVOLUÇÃO TEMPORAL HISTÓRICA */}
                <div className="bg-white rounded-[28px] border border-slate-100 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#1C2643]">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#1C2643] uppercase tracking-wider">
                        Evolução Mensal & Sazonalidade
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Histórico comparativo do faturamento de produção líquido
                      </p>
                    </div>
                  </div>

                  {computedData.listHistory.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-black">Histórico indisponível no filtro selecionado</div>
                  ) : (
                    <div className="space-y-5">
                      {computedData.listHistory.map((hist) => {
                        return (
                          <div key={hist.month} className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase">
                              <span className="text-slate-600 flex items-center gap-1">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                                {hist.label}
                              </span>
                              <span className="text-[#1C2643] tracking-wider">
                                Prod: {formatCurrency(hist.producao)} | <span className="text-emerald-600">Rec: {formatCurrency(hist.receita)}</span>
                              </span>
                            </div>
                            
                            <div className="relative pt-0.5">
                              {/* Production visual bar */}
                              <div className="w-full h-1.5 bg-slate-100 rounded-full mb-1">
                                <div
                                  style={{ width: `${Math.min(100, (hist.producao / (computedData.currentProducaoTotal || 1)) * 100)}%` }}
                                  className="h-full bg-slate-400 rounded-full"
                                />
                              </div>
                              {/* Revenue visual bar */}
                              <div className="w-full h-1.5 bg-slate-100 rounded-full">
                                <div
                                  style={{ width: `${Math.min(100, (hist.receita / (computedData.currentReceitaTotal || 1)) * 100)}%` }}
                                  className="h-full bg-emerald-500 rounded-full"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* CANAIS BANCÁRIOS PARCEIROS */}
                <div className="bg-white rounded-[28px] border border-slate-100 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#1C2643]">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#1C2643] uppercase tracking-wider">
                        Yield & Distribuição de Bancos Parceiros
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Relação das instituições parceiras que mais aprovaram crédito
                      </p>
                    </div>
                  </div>

                  {computedData.listBancos.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-black">Nenhum banco registrado no período</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-[11px] border-collapse">
                        <thead>
                          <tr className="border-b border-slate-150 bg-slate-50/50">
                            <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Instituição Bancária</th>
                            <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Op. Pagas</th>
                            <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Produção Concedida</th>
                            <th className="px-3 py-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-right">Faturamento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {computedData.listBancos.slice(0, 10).map((banco) => (
                            <tr key={banco.name} className="hover:bg-slate-50/65 transition-colors">
                              <td className="px-3 py-3.5 text-[#1C2643] font-extrabold uppercase pr-6">
                                {banco.name}
                              </td>
                              <td className="px-3 py-3.5 text-center font-bold text-slate-500">
                                {banco.contracts}
                              </td>
                              <td className="px-3 py-3.5 text-right font-bold text-slate-600">
                                {formatCurrency(banco.producao)}
                              </td>
                              <td className="px-3 py-3.5 text-right font-black text-emerald-600">
                                {formatCurrency(banco.receita)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}
