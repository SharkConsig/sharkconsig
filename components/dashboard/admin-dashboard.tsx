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
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Percent
} from "lucide-react"
import { format } from "date-fns"
import { cn, formatName } from "@/lib/utils"
import Image from "next/image"
import { DashboardCard, Gauge, formatCurrency } from "./dashboard-shared"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts"

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
  const [analysisTab, setAnalysisTab] = React.useState<'produtos' | 'convenios' | 'bancos' | 'comercial'>('produtos')
  const [rankingMetric, setRankingMetric] = React.useState<'producao' | 'receita' | 'crescimento'>('producao')
  const [expandedSupervisorIds, setExpandedSupervisorIds] = React.useState<Record<string, boolean>>({})

  // Date states for the financial panel - defaults to current month (mês em exercício)
  const [financialPeriod, setFinancialPeriod] = React.useState<'dia' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'personalizado'>('mes')
  const [financialStartDate, setFinancialStartDate] = React.useState(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    return format(firstDay, "yyyy-MM-dd")
  })
  const [financialEndDate, setFinancialEndDate] = React.useState(() => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return format(lastDay, "yyyy-MM-dd")
  })

  // Financial fetching state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [financialProposals, setFinancialProposals] = React.useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dbProdutosConfigs, setDbProdutosConfigs] = React.useState<any[]>([])
  const [isFinancialLoading, setIsFinancialLoading] = React.useState(false)
  const [customCommissionPercents, setCustomCommissionPercents] = React.useState<Record<string, number>>({})
  const [compareChartMetric, setCompareChartMetric] = React.useState<'producao' | 'receita'>('producao')

  // Load localstorage values on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const storedPercents = window.localStorage.getItem("receber_custom_commission_percents")
      if (storedPercents) {
        try {
          setCustomCommissionPercents(JSON.parse(storedPercents))
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])

  const handlePeriodChange = (period: 'dia' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'personalizado') => {
    setFinancialPeriod(period)
    const now = new Date()
    
    if (period === 'dia') {
      const todayStr = format(now, "yyyy-MM-dd")
      setFinancialStartDate(todayStr)
      setFinancialEndDate(todayStr)
    } else if (period === 'semana') {
      // Monday of current week to today
      const dayOfWeek = now.getDay()
      const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const monday = new Date(now.setDate(diffToMonday))
      setFinancialStartDate(format(monday, "yyyy-MM-dd"))
      setFinancialEndDate(format(new Date(), "yyyy-MM-dd"))
    } else if (period === 'mes') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setFinancialStartDate(format(firstDay, "yyyy-MM-dd"))
      setFinancialEndDate(format(lastDay, "yyyy-MM-dd"))
    } else if (period === 'trimestre') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3
      const firstDay = new Date(now.getFullYear(), quarterMonth, 1)
      const lastDay = new Date(now.getFullYear(), quarterMonth + 3, 0)
      setFinancialStartDate(format(firstDay, "yyyy-MM-dd"))
      setFinancialEndDate(format(lastDay, "yyyy-MM-dd"))
    } else if (period === 'ano') {
      const firstDay = new Date(now.getFullYear(), 0, 1)
      const lastDay = new Date(now.getFullYear(), 11, 31)
      setFinancialStartDate(format(firstDay, "yyyy-MM-dd"))
      setFinancialEndDate(format(lastDay, "yyyy-MM-dd"))
    }
  }

  const fetchFinancialData = React.useCallback(async () => {
    setIsFinancialLoading(true)
    try {
      // 1. Fetch proposals with status in ['PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA', 'PÓS-VENDA REALIZADA']
      const { data: propData, error: propErr } = await supabase
        .from("propostas")
        .select("*")
        .in("status", ["PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA", "PÓS-VENDA REALIZADA"])

      if (propErr) throw propErr
      setFinancialProposals(propData || [])

      // 2. Fetch products config table regras
      let configsData = null
      const resQuery = await supabase
        .from('produtos_config')
        .select(`
          id,
          nome_tabela,
          prazo,
          coeficiente,
          percentual_producao,
          percentual_comissao,
          convenio_id,
          regras,
          ativo,
          convenios (nome)
        `)
      configsData = resQuery.data

      if (resQuery.error) {
        const fallbackRes = await supabase
          .from('produtos_config')
          .select('*')
        configsData = fallbackRes.data
      }

      setDbProdutosConfigs(configsData || [])
    } catch (error) {
      const err = error as Error
      console.error("Erro ao carregar dados financeiros:", err.message)
      toast.error("Erro ao carregar dados do painel financeiro.")
    } finally {
      setIsFinancialLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (activeTab === 'financeiro') {
      fetchFinancialData()
    }
  }, [activeTab, fetchFinancialData])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCommissionPercentage = React.useCallback((proposal: any) => {
    const commissionRate = 6 // default rate
    if (!proposal.coeficiente_prazo || dbProdutosConfigs.length === 0) {
      return commissionRate
    }

    const parsePercent = (val: string | number | null | undefined) => {
      if (val === undefined || val === null || val === "") return undefined
      const parsed = typeof val === "string" ? parseFloat(val.replace(",", ".")) : parseFloat(val)
      return isNaN(parsed) ? undefined : parsed
    }

    const extractPrazoNum = (label: string | null | undefined): number | null => {
      if (!label) return null
      const match = label.match(/(\d+)\s*x/i)
      if (match) return parseInt(match[1], 10)
      const genericMatch = label.match(/\((\d{1,3})\s*\|/)
      if (genericMatch) return parseInt(genericMatch[1], 10)
      return null
    }

    const extractCoeficienteNum = (label: string | null | undefined): number | null => {
      if (!label) return null
      const match = label.match(/x\s*[| ]\s*([0-9]+[.,][0-9]+)/i)
      if (match) return parseFloat(match[1].replace(',', '.'))
      const genericMatch = label.match(/(0[.,][0-9]{2,})/)
      if (genericMatch) return parseFloat(genericMatch[0].replace(',', '.'))
      return null
    }

    let parsedTableName = ""
    const cpStr = proposal.coeficiente_prazo.trim()
    if (cpStr.includes('(')) {
      parsedTableName = cpStr.split('(')[0].trim()
    } else if (cpStr.includes('-')) {
      parsedTableName = cpStr.split('-')[0].trim()
    } else {
      parsedTableName = cpStr
    }

    const normalizeStr = (s: string | null | undefined) => {
      if (!s) return ""
      return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, "")      // remove non-alphanumeric
        .trim()
    }

    const normParsedName = normalizeStr(parsedTableName)
    const parsedPrazo = extractPrazoNum(proposal.coeficiente_prazo)
    const parsedCoef = extractCoeficienteNum(proposal.coeficiente_prazo)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allOptions = dbProdutosConfigs.flatMap((config: any) => {
      const getConvenioName = () => {
        if (!config.convenios) return undefined
        if (Array.isArray(config.convenios)) return config.convenios[0]?.nome
        return (config.convenios as unknown as { nome: string }).nome
      }
      const convNome = getConvenioName()

      if (config.regras && config.regras.length > 0) {
        return config.regras
          .filter((r: { ativo?: boolean }) => r.ativo !== false)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((regra: any) => ({
            nome_tabela: config.nome_tabela,
            prazo: typeof regra.prazo === 'string' ? parseInt(regra.prazo, 10) : regra.prazo,
            coeficiente: typeof regra.coeficiente === 'string' ? parseFloat(regra.coeficiente.replace(',', '.')) : regra.coeficiente,
            percentual_producao: parsePercent(regra.percentual_producao),
            percentual_comissao: parsePercent(regra.percentual_comissao),
            convenioNome: convNome
          }))
      }
      return [{
        nome_tabela: config.nome_tabela,
        prazo: typeof config.prazo === 'string' ? parseInt(config.prazo, 10) : (config.prazo || 0),
        coeficiente: typeof config.coeficiente === 'string' ? parseFloat(config.coeficiente.replace(',', '.')) : (config.coeficiente || 0),
        percentual_producao: parsePercent(config.percentual_producao),
        percentual_comissao: parsePercent(config.percentual_comissao),
        convenioNome: convNome
      }]
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bestMatch: any = null
    let highestScore = -1

    for (const opt of allOptions) {
      let score = 0
      const matchesPrazo = parsedPrazo !== null && opt.prazo === parsedPrazo
      const matchesCoef = parsedCoef !== null && opt.coeficiente !== null && Math.abs(opt.coeficiente - parsedCoef) < 0.0001

      if (matchesPrazo && matchesCoef) {
        score += 150
      } else if (matchesPrazo) {
        score += 15
      } else if (matchesCoef) {
        score += 15
      }

      const optName = opt.nome_tabela || opt.convenioNome || ""
      const normOptName = normalizeStr(optName)

      if (normParsedName && normOptName) {
        if (normOptName === normParsedName) {
          score += 100
        } else if (normParsedName.startsWith(normOptName) || normOptName.startsWith(normParsedName)) {
          score += 60
        } else {
          const wordsParsed = normParsedName.split(/\s+/).filter(w => w.length > 2)
          const wordsOpt = normOptName.split(/\s+/).filter(w => w.length > 2)
          let matchCount = 0
          for (const wp of wordsParsed) {
            if (wordsOpt.includes(wp)) matchCount++
          }
          score += matchCount * 15
        }
      }

      if (score > highestScore) {
        highestScore = score
        bestMatch = opt
      }
    }

    if (bestMatch && highestScore >= 15 && bestMatch.percentual_comissao !== undefined) {
      return bestMatch.percentual_comissao
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exactClean = allOptions.find((opt: any) => {
      const labelTextDot = opt.nome_tabela 
        ? `${opt.nome_tabela} (${opt.prazo}x | ${opt.coeficiente})`
        : `${opt.convenioNome || 'Tabela'} - ${opt.prazo}x ${opt.coeficiente}`

      const labelTextComma = opt.nome_tabela 
        ? `${opt.nome_tabela} (${opt.prazo}x | ${opt.coeficiente.toString().replace('.', ',')})`
        : `${opt.convenioNome || 'Tabela'} - ${opt.prazo}x ${opt.coeficiente.toString().replace('.', ',')}`

      const cleanLabel = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
      const cpClean = cleanLabel(proposal.coeficiente_prazo)
      return cleanLabel(labelTextDot) === cpClean || cleanLabel(labelTextComma) === cpClean
    })

    if (exactClean && exactClean.percentual_comissao !== undefined) {
      return exactClean.percentual_comissao
    }

    return commissionRate
  }, [dbProdutosConfigs])

  // Memoized filter of proposals by active date range
  const filteredFinancialProposals = React.useMemo(() => {
    return financialProposals.filter((proposal) => {
      if (!financialStartDate && !financialEndDate) return true
      const compareDate = proposal.data_pago_cliente || proposal.updated_at || proposal.created_at
      if (!compareDate) return true

      try {
        const pDate = new Date(compareDate)
        if (isNaN(pDate.getTime())) return true
        const formattedCompare = format(pDate, "yyyy-MM-dd")

        if (financialStartDate && formattedCompare < financialStartDate) return false
        if (financialEndDate && formattedCompare > financialEndDate) return false
      } catch (err) {
        console.error("Erro data filtro financeiro:", err)
        return true
      }
      return true
    })
  }, [financialProposals, financialStartDate, financialEndDate])

  // Calculate Produção Total: sum of p.valor_cliente || p.valor_cliente_operacional || p.valor_operacao || 0
  const totalProduction = React.useMemo(() => {
    return filteredFinancialProposals.reduce((sum, p) => {
      const val = p.valor_cliente || p.valor_cliente_operacional || p.valor_operacao || 0
      return sum + val
    }, 0)
  }, [filteredFinancialProposals])

  // Calculate Receita Total: sum of (val * comPercent) / 100
  const totalRevenue = React.useMemo(() => {
    return filteredFinancialProposals.reduce((sum, p) => {
      const val = p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0
      const comPercent = customCommissionPercents[p.id_lead] !== undefined ? customCommissionPercents[p.id_lead] : getCommissionPercentage(p)
      return sum + (val * comPercent) / 100
    }, 0)
  }, [filteredFinancialProposals, customCommissionPercents, getCommissionPercentage])

  // Previous equivalent period dates based on financial filter dates
  const prevPeriodDates = React.useMemo(() => {
    if (!financialStartDate || !financialEndDate) {
      const now = new Date()
      const firstDayCurrent = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd")
      const lastDayCurrent = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd")
      const firstDayPrev = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), "yyyy-MM-dd")
      const lastDayPrev = format(new Date(now.getFullYear(), now.getMonth(), 0), "yyyy-MM-dd")
      return {
        start: firstDayCurrent,
        end: lastDayCurrent,
        prevStart: firstDayPrev,
        prevEnd: lastDayPrev
      }
    }
    
    try {
      const start = new Date(financialStartDate)
      const end = new Date(financialEndDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 30
      
      const prevStart = new Date(start)
      prevStart.setDate(prevStart.getDate() - diffDays - 1)
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      
      return {
        start: financialStartDate,
        end: financialEndDate,
        prevStart: format(prevStart, "yyyy-MM-dd"),
        prevEnd: format(prevEnd, "yyyy-MM-dd")
      }
    } catch {
      return {
        start: financialStartDate,
        end: financialEndDate,
        prevStart: "",
        prevEnd: ""
      }
    }
  }, [financialStartDate, financialEndDate])

  // Get proposals in previous period
  const previousPeriodProposals = React.useMemo(() => {
    const { prevStart, prevEnd } = prevPeriodDates
    if (!prevStart || !prevEnd) return []
    return financialProposals.filter((proposal) => {
      const compareDate = proposal.data_pago_cliente || proposal.updated_at || proposal.created_at
      if (!compareDate) return false

      try {
        const pDate = new Date(compareDate)
        if (isNaN(pDate.getTime())) return false
        const formattedCompare = format(pDate, "yyyy-MM-dd")

        if (formattedCompare < prevStart) return false
        if (formattedCompare > prevEnd) return false
      } catch {
        return false
      }
      return true
    })
  }, [financialProposals, prevPeriodDates])

  // Ranking data for top banks, products and agreements
  const rankingsData = React.useMemo(() => {
    const currentProps = filteredFinancialProposals
    const previousProps = previousPeriodProposals

    const calcPct = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0
      return ((curr - prev) / prev) * 100
    }

    const aggregate = (
      propsList: typeof filteredFinancialProposals,
      getKey: (p: typeof filteredFinancialProposals[0]) => string,
      getName: (p: typeof filteredFinancialProposals[0]) => string
    ) => {
      const data: Record<string, { key: string; name: string; prod: number; rev: number; count: number }> = {}
      propsList.forEach((p) => {
        const key = getKey(p).toUpperCase()
        const name = getName(p)
        const val = p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0
        const comPercent = customCommissionPercents[p.id_lead] !== undefined ? customCommissionPercents[p.id_lead] : getCommissionPercentage(p)
        const rev = (val * comPercent) / 100

        if (!data[key]) {
          data[key] = { key, name, prod: 0, rev: 0, count: 0 }
        }
        data[key].prod += val
        data[key].rev += rev
        data[key].count += 1
      })
      return data
    }

    const getProductInfo = (p: typeof filteredFinancialProposals[0]) => {
      let name = (p.tipo_operacao || "Outros / Não Informado").trim()
      const upper = name.toUpperCase()
      if (upper.includes("NOVO")) name = "Crédito Novo"
      else if (upper.includes("PORT")) name = "Portabilidade"
      else if (upper.includes("REFIN")) name = "Refinanciamento"
      else if (upper.includes("SAQUE") && upper.includes("COMP")) name = "Saque Complementar"
      else if (upper.includes("BENEF")) name = "Cartão Benefício"
      else if (upper.includes("CONSIG") || upper.includes("CARTAO")) name = "Cartão Consignado"
      return { key: name.toUpperCase(), name }
    }

    const getConvenioInfo = (p: typeof filteredFinancialProposals[0]) => {
      let name = (p.convenio || "Outros / Não Informado").trim()
      const upper = name.toUpperCase()
      if (upper.includes("SIAPE")) name = "SIAPE"
      else if (upper.includes("MARANH")) name = "Governo do Maranhão"
      else if (upper.includes("PIAU")) name = "Governo do Piauí"
      else if (upper.includes("PMSP") || upper.includes("PREFEITURA SP") || upper.includes("SÃO PAULO")) name = "Prefeitura de São Paulo (PMSP)"
      return { key: name.toUpperCase(), name }
    }

    const getBancoInfo = (p: typeof filteredFinancialProposals[0]) => {
      const name = (p.banco || "Outros / Não Informado").trim()
      return { key: name.toUpperCase(), name }
    }

    const currBancos = aggregate(currentProps, p => getBancoInfo(p).key, p => getBancoInfo(p).name)
    const currProducts = aggregate(currentProps, p => getProductInfo(p).key, p => getProductInfo(p).name)
    const currConvenios = aggregate(currentProps, p => getConvenioInfo(p).key, p => getConvenioInfo(p).name)

    const prevBancos = aggregate(previousProps, p => getBancoInfo(p).key, p => getBancoInfo(p).name)
    const prevProducts = aggregate(previousProps, p => getProductInfo(p).key, p => getProductInfo(p).name)
    const prevConvenios = aggregate(previousProps, p => getConvenioInfo(p).key, p => getConvenioInfo(p).name)

    const compileRankings = (
      curr: Record<string, { key: string; name: string; prod: number; rev: number; count: number }>,
      prev: Record<string, { key: string; name: string; prod: number; rev: number; count: number }>
    ) => {
      const keys = Array.from(new Set([...Object.keys(curr), ...Object.keys(prev)]))
      return keys.map(k => {
        const c = curr[k] || { key: k, name: prev[k]?.name || "Outros", prod: 0, rev: 0, count: 0 }
        const p = prev[k] || { key: k, name: curr[k]?.name || "Outros", prod: 0, rev: 0, count: 0 }
        
        const prodGrowth = calcPct(c.prod, p.prod)
        const revGrowth = calcPct(c.rev, p.rev)

        return {
          key: k,
          name: c.name,
          prod: c.prod,
          rev: c.rev,
          count: c.count,
          prevProd: p.prod,
          prevRev: p.rev,
          prodGrowth,
          revGrowth
        }
      }).filter(item => item.prod > 0 || item.prevProd > 0)
    }

    const bancosRank = compileRankings(currBancos, prevBancos)
    const productsRank = compileRankings(currProducts, prevProducts)
    const conveniosRank = compileRankings(currConvenios, prevConvenios)

    return {
      bancos: bancosRank,
      products: productsRank,
      convenios: conveniosRank
    }
  }, [filteredFinancialProposals, previousPeriodProposals, customCommissionPercents, getCommissionPercentage])

  // Map brokers to their supervisor names for commercial attribution
  const brokerToSupervisorMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    if (brokerRankings) {
      brokerRankings.forEach((b) => {
        if (b.corretor_id && b.supervisor) {
          map[b.corretor_id] = b.supervisor
        }
      })
    }
    return map
  }, [brokerRankings])

  // Memoized mix analysis / breakdown of products, organs, banks, and commercial leaders
  const businessBreakdown = React.useMemo(() => {
    const products: Record<string, { name: string; prod: number; rev: number; count: number }> = {}
    const convenios: Record<string, { name: string; prod: number; rev: number; count: number }> = {}
    const bancos: Record<string, { name: string; prod: number; rev: number; count: number }> = {}
    const corretores: Record<string, { name: string; prod: number; rev: number; count: number }> = {}
    const supervisores: Record<string, { name: string; prod: number; rev: number; count: number }> = {}

    filteredFinancialProposals.forEach((p) => {
      const val = p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0
      const comPercent = customCommissionPercents[p.id_lead] !== undefined ? customCommissionPercents[p.id_lead] : getCommissionPercentage(p)
      const rev = (val * comPercent) / 100

      // 1. Produto (tipo_operacao)
      let prodName = (p.tipo_operacao || "Outros / Não Informado").trim()
      const prodUpper = prodName.toUpperCase()
      if (prodUpper.includes("NOVO")) prodName = "Crédito Novo"
      else if (prodUpper.includes("PORT")) prodName = "Portabilidade"
      else if (prodUpper.includes("REFIN")) prodName = "Refinanciamento"
      else if (prodUpper.includes("SAQUE") && prodUpper.includes("COMP")) prodName = "Saque Complementar"
      else if (prodUpper.includes("BENEF")) prodName = "Cartão Benefício"
      else if (prodUpper.includes("CONSIG") || prodUpper.includes("CARTAO")) prodName = "Cartão Consignado"
      
      const prodKey = prodName.toUpperCase()
      if (!products[prodKey]) {
        products[prodKey] = { name: prodName, prod: 0, rev: 0, count: 0 }
      }
      products[prodKey].prod += val
      products[prodKey].rev += rev
      products[prodKey].count += 1

      // 2. Convenio
      let convName = (p.convenio || "Outros / Não Informado").trim()
      const convUpper = convName.toUpperCase()
      if (convUpper.includes("SIAPE")) convName = "SIAPE"
      else if (convUpper.includes("MARANH")) convName = "Governo do Maranhão"
      else if (convUpper.includes("PIAU")) convName = "Governo do Piauí"
      else if (convUpper.includes("PMSP") || convUpper.includes("PREFEITURA SP") || convUpper.includes("SÃO PAULO")) convName = "Prefeitura de São Paulo (PMSP)"
      
      const convKey = convName.toUpperCase()
      if (!convenios[convKey]) {
        convenios[convKey] = { name: convName, prod: 0, rev: 0, count: 0 }
      }
      convenios[convKey].prod += val
      convenios[convKey].rev += rev
      convenios[convKey].count += 1

      // 3. Banco
      const bancoName = (p.banco || "Outros / Não Informado").trim()
      const bancoKey = bancoName.toUpperCase()
      if (!bancos[bancoKey]) {
        bancos[bancoKey] = { name: bancoName, prod: 0, rev: 0, count: 0 }
      }
      bancos[bancoKey].prod += val
      bancos[bancoKey].rev += rev
      bancos[bancoKey].count += 1

      // 4. Corretor
      const corrName = (p.corretor || "Não Informado").trim()
      const corrKey = (p.corretor_id || corrName).toUpperCase()
      if (!corretores[corrKey]) {
        corretores[corrKey] = { name: corrName, prod: 0, rev: 0, count: 0 }
      }
      corretores[corrKey].prod += val
      corretores[corrKey].rev += rev
      corretores[corrKey].count += 1

      // 5. Supervisor
      const supName = (brokerToSupervisorMap[p.corretor_id] || p.equipe || "SHARKCONSIG").trim()
      const supKey = supName.toUpperCase()
      if (!supervisores[supKey]) {
        supervisores[supKey] = { name: supName, prod: 0, rev: 0, count: 0 }
      }
      supervisores[supKey].prod += val
      supervisores[supKey].rev += rev
      supervisores[supKey].count += 1
    })

    const sortByRev = (a: { rev: number }, b: { rev: number }) => b.rev - a.rev

    return {
      products: Object.values(products).sort(sortByRev),
      convenios: Object.values(convenios).sort(sortByRev),
      bancos: Object.values(bancos).sort(sortByRev),
      corretores: Object.values(corretores).sort(sortByRev),
      supervisores: Object.values(supervisores).sort(sortByRev)
    }
  }, [filteredFinancialProposals, customCommissionPercents, getCommissionPercentage, brokerToSupervisorMap])

  // Memoized historical statistics for YoY and MoM comparisons
  const comparisonStats = React.useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const previousYear = currentYear - 1
    const currentMonthIdx = now.getMonth() // 0-11
    
    // Previous month logic
    let prevMonthIdx = currentMonthIdx - 1
    let prevMonthYear = currentYear
    if (prevMonthIdx < 0) {
      prevMonthIdx = 11
      prevMonthYear = previousYear
    }

    let prodCurrentYear = 0
    let prodPreviousYear = 0
    let prodCurrentMonth = 0
    let prodPreviousMonth = 0

    let revCurrentYear = 0
    let revPreviousYear = 0
    let revCurrentMonth = 0
    let revPreviousMonth = 0

    financialProposals.forEach((p) => {
      const compareDateStr = p.data_pago_cliente || p.updated_at || p.created_at
      if (!compareDateStr) return

      const pDate = new Date(compareDateStr)
      if (isNaN(pDate.getTime())) return

      const year = pDate.getFullYear()
      const month = pDate.getMonth()

      const val = p.valor_cliente || p.valor_cliente_operacional || p.valor_operacao || 0
      const comPercent = customCommissionPercents[p.id_lead] !== undefined 
        ? customCommissionPercents[p.id_lead] 
        : getCommissionPercentage(p)
      const rev = (val * comPercent) / 100

      // Year comparisons
      if (year === currentYear) {
        prodCurrentYear += val
        revCurrentYear += rev
      } else if (year === previousYear) {
        prodPreviousYear += val
        revPreviousYear += rev
      }

      // Month comparisons
      if (year === currentYear && month === currentMonthIdx) {
        prodCurrentMonth += val
        revCurrentMonth += rev
      } else if (year === prevMonthYear && month === prevMonthIdx) {
        prodPreviousMonth += val
        revPreviousMonth += rev
      }
    })

    // Calculate variations
    const calcPct = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0
      return ((curr - prev) / prev) * 100
    }

    const yearProdDiff = prodCurrentYear - prodPreviousYear
    const yearProdPct = calcPct(prodCurrentYear, prodPreviousYear)

    const monthProdDiff = prodCurrentMonth - prodPreviousMonth
    const monthProdPct = calcPct(prodCurrentMonth, prodPreviousMonth)

    const yearRevDiff = revCurrentYear - revPreviousYear
    const yearRevPct = calcPct(revCurrentYear, revPreviousYear)

    const monthRevDiff = revCurrentMonth - revPreviousMonth
    const monthRevPct = calcPct(revCurrentMonth, revPreviousMonth)

    return {
      currentYear,
      previousYear,
      currentMonthIdx,
      prevMonthIdx,
      prodCurrentYear,
      prodPreviousYear,
      yearProdDiff,
      yearProdPct,
      prodCurrentMonth,
      prodPreviousMonth,
      monthProdDiff,
      monthProdPct,
      revCurrentYear,
      revPreviousYear,
      yearRevDiff,
      yearRevPct,
      revCurrentMonth,
      revPreviousMonth,
      monthRevDiff,
      monthRevPct
    }
  }, [financialProposals, customCommissionPercents, getCommissionPercentage])

  const monthlyComparisonData = React.useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const previousYear = currentYear - 1

    const months = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ]

    const data = months.map((monthName) => ({
      name: monthName,
      productionCurrent: 0,
      productionPrevious: 0,
      revenueCurrent: 0,
      revenuePrevious: 0
    }))

    financialProposals.forEach((p) => {
      const compareDateStr = p.data_pago_cliente || p.updated_at || p.created_at
      if (!compareDateStr) return

      const pDate = new Date(compareDateStr)
      if (isNaN(pDate.getTime())) return

      const year = pDate.getFullYear()
      const monthIdx = pDate.getMonth()

      const val = p.valor_cliente || p.valor_cliente_operacional || p.valor_operacao || 0
      const comPercent = customCommissionPercents[p.id_lead] !== undefined 
        ? customCommissionPercents[p.id_lead] 
        : getCommissionPercentage(p)
      const rev = (val * comPercent) / 100

      if (monthIdx >= 0 && monthIdx < 12) {
        if (year === currentYear) {
          data[monthIdx].productionCurrent += val
          data[monthIdx].revenueCurrent += rev
        } else if (year === previousYear) {
          data[monthIdx].productionPrevious += val
          data[monthIdx].revenuePrevious += rev
        }
      }
    })

    return data
  }, [financialProposals, customCommissionPercents, getCommissionPercentage])

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
              "px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer",
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
              "px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer",
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
              "px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer",
              activeTab === 'financeiro' 
                ? "bg-white text-[#1C2643] shadow-md shadow-[#1C2643]/5" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <TrendingUp className="w-4 h-4" />
            FINANCEIRO E ESTRATÉGICO
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
          className="space-y-6"
        >
          {/* Header Row with Period Filter at the top-right (Sticky) */}
          <div className="sticky top-16 lg:top-20 z-30 bg-[#F8FAFC]/95 backdrop-blur-md flex items-center justify-end py-3 border-b border-slate-200/80 -mx-4 px-4 lg:-mx-8 lg:px-8 shadow-sm transition-all">
            {/* Filter controls */}
            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
              <div className="flex flex-wrap bg-slate-100/80 p-1 rounded-xl border border-slate-200 gap-1">
                {(['dia', 'semana', 'mes', 'trimestre', 'ano', 'personalizado'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => handlePeriodChange(period)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                      financialPeriod === period
                        ? "bg-white text-[#1C2643] shadow-sm font-extrabold"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {period === 'mes' ? 'Mês' : period === 'trimestre' ? 'Trimestre' : period}
                  </button>
                ))}
              </div>

              {financialPeriod === 'personalizado' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 mt-1 self-end"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">De:</span>
                    <input 
                      type="date" 
                      value={financialStartDate}
                      onChange={(e) => setFinancialStartDate(e.target.value)}
                      className="text-[10px] font-bold text-[#1C2643] bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-[#1C2643]/20"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Até:</span>
                    <input 
                      type="date" 
                      value={financialEndDate}
                      onChange={(e) => setFinancialEndDate(e.target.value)}
                      className="text-[10px] font-bold text-[#1C2643] bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-[#1C2643]/20"
                    />
                  </div>
                  <button
                    onClick={fetchFinancialData}
                    className="px-2.5 py-1 bg-[#1C2643] text-white text-[9px] font-black rounded-md hover:bg-[#1C2643]/90 transition-all active:scale-95"
                  >
                    FILTRAR
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Section Title (Static/Non-Sticky) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <div>
              <h2 className="text-xl font-black text-[#1C2643] tracking-tight mt-1 uppercase">SUSTENTABILIDADE E RECEITA</h2>
            </div>
          </div>

          {/* Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Column 1: Produção Total + Receita Total stacked vertically */}
            <div className="flex flex-col gap-6 h-full justify-between">
              {/* Card: Produção Total do Período */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#1C2643]/10 transition-all duration-300 flex-1 min-h-[160px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#1C2643]/2 rounded-full blur-3xl group-hover:bg-[#1C2643]/5 transition-all duration-300" />
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-[#718198] uppercase tracking-widest">
                        Produção Total do Período
                      </span>
                      <div className="bg-[#1C2643]/5 p-2 rounded-xl text-[#1C2643]">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                    </div>
                    
                    {isFinancialLoading ? (
                      <div className="h-8 flex items-center">
                        <Loader2 className="w-5 h-5 animate-spin text-[#1C2643]" />
                      </div>
                    ) : (
                      <h3 className="text-xl sm:text-2xl font-black text-[#1C2643] tracking-tight">
                        {formatCurrency(totalProduction)}
                      </h3>
                    )}
                  </div>
                  
                  <p className="text-[10px] font-bold text-slate-400 mt-2">
                    Soma de todos os <span className="text-[#1C2643] font-extrabold">Valores do Cliente</span> liberados no período.
                  </p>
                </div>
              </motion.div>

              {/* Card: Receita Total da Empresa */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/10 transition-all duration-300 flex-1 min-h-[160px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/2 rounded-full blur-3xl group-hover:bg-emerald-500/5 transition-all duration-300" />
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-[#718198] uppercase tracking-widest">
                        Receita Total da Empresa
                      </span>
                      <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    
                    {isFinancialLoading ? (
                      <div className="h-8 flex items-center">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                      </div>
                    ) : (
                      <h3 className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
                        {formatCurrency(totalRevenue)}
                      </h3>
                    )}
                  </div>
                  
                  <p className="text-[10px] font-bold text-slate-400 mt-2">
                    Soma das comissões faturadas (<span className="text-emerald-600 font-extrabold">Contas a Receber</span>) no período.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Column 2: Quantidade de Contratos Pagos */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/10 transition-all duration-300 min-h-[340px]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/2 rounded-full blur-3xl group-hover:bg-indigo-500/5 transition-all duration-300" />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-[#718198] uppercase tracking-widest">
                      Contratos Pagos
                    </span>
                    <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  
                  {isFinancialLoading ? (
                    <div className="h-10 flex items-center">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-6xl sm:text-7xl lg:text-[8rem] leading-none font-black text-[#1C2643] tracking-tighter mt-4 mb-2">
                        {filteredFinancialProposals.length}
                      </h3>
                      <p className="text-[11px] font-extrabold text-indigo-600 uppercase mt-2 tracking-wider">
                        Contratos Efetivados
                      </p>
                    </div>
                  )}
                </div>
                
                <p className="text-[11px] font-bold text-slate-400 mt-4 leading-relaxed">
                  Total de operações efetivadas/pagas no período. Considera exclusivamente propostas com status <span className="text-indigo-600 font-extrabold">‘PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA’</span> e <span className="text-indigo-600 font-extrabold">‘PÓS-VENDA REALIZADA’</span>.
                </p>
              </div>
            </motion.div>

            {/* Column 3: Ticket Médio + Receita Média stacked vertically */}
            <div className="flex flex-col gap-6 h-full justify-between">
              {/* Card: Ticket Médio de Produção */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/10 transition-all duration-300 flex-1 min-h-[160px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/2 rounded-full blur-3xl group-hover:bg-amber-500/5 transition-all duration-300" />
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-[#718198] uppercase tracking-widest">
                        Ticket Médio de Produção
                      </span>
                      <div className="bg-amber-50 text-amber-600 p-2 rounded-xl">
                        <Trophy className="w-4 h-4" />
                      </div>
                    </div>
                    
                    {isFinancialLoading ? (
                      <div className="h-8 flex items-center">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                      </div>
                    ) : (
                      <h3 className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight">
                        {formatCurrency(
                          filteredFinancialProposals.length === 0
                            ? 0
                            : totalProduction / filteredFinancialProposals.length
                        )}
                      </h3>
                    )}
                  </div>
                  
                  <p className="text-[10px] font-bold text-slate-400 mt-2">
                    Soma da produção total dividida pela <span className="text-amber-600 font-extrabold">quantidade de contratos pagos</span>.
                  </p>
                </div>
              </motion.div>

              {/* Card: Receita Média por Contrato */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#1C2643]/10 transition-all duration-300 flex-1 min-h-[160px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#1C2643]/2 rounded-full blur-3xl group-hover:bg-[#1C2643]/5 transition-all duration-300" />
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-[#718198] uppercase tracking-widest">
                        Receita Média por Contrato
                      </span>
                      <div className="bg-[#1C2643]/5 p-2 rounded-xl text-[#1C2643]">
                        <Target className="w-4 h-4" />
                      </div>
                    </div>
                    
                    {isFinancialLoading ? (
                      <div className="h-8 flex items-center">
                        <Loader2 className="w-5 h-5 animate-spin text-[#1C2643]" />
                      </div>
                    ) : (
                      <h3 className="text-xl sm:text-2xl font-black text-[#1C2643] tracking-tight">
                        {formatCurrency(
                          filteredFinancialProposals.length === 0
                            ? 0
                            : totalRevenue / filteredFinancialProposals.length
                        )}
                      </h3>
                    )}
                  </div>
                  
                  <p className="text-[10px] font-bold text-slate-400 mt-2">
                    Soma da receita total dividida pela <span className="text-[#1C2643] font-extrabold">quantidade de contratos pagos</span>.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* COMPARATIVE SECTION: YoY and MoM Comparisons + Recharts Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="mt-8 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-6">
              <div>
                <h3 className="text-lg font-black text-[#1C2643] tracking-tight mt-1 uppercase">ANALISE COMPARATIVA</h3>
              </div>
              
              {/* Chart Metric Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mt-2 sm:mt-0 self-start sm:self-center">
                <button
                  onClick={() => setCompareChartMetric('producao')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    compareChartMetric === 'producao'
                      ? "bg-[#1C2643] text-white shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Produção (R$)
                </button>
                <button
                  onClick={() => setCompareChartMetric('receita')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    compareChartMetric === 'receita'
                      ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Receita (R$)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card Comparativo MoM */}
              <div className="col-span-1">
                {/* MoM Card */}
                <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#1C2643]/10 transition-all duration-300 h-full min-h-[380px]">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/2 rounded-full blur-2xl" />
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-[#718198] uppercase tracking-widest">
                          Comparativo Mensal
                        </span>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                          {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][comparisonStats.currentMonthIdx]} vs {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][comparisonStats.prevMonthIdx]}
                        </span>
                      </div>

                      <div className="space-y-4">
                        {/* MoM Produção */}
                        <div>
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Produção</p>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className="text-lg font-black text-[#1C2643]">{formatCurrency(comparisonStats.prodCurrentMonth)}</p>
                            <div className={cn(
                              "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black",
                              comparisonStats.monthProdPct > 0 
                                ? "bg-emerald-50 text-emerald-600" 
                                : comparisonStats.monthProdPct < 0 
                                  ? "bg-rose-50 text-rose-600" 
                                  : "bg-slate-100 text-slate-500"
                            )}>
                              {comparisonStats.monthProdPct > 0 ? <ArrowUpRight className="w-3 h-3" /> : comparisonStats.monthProdPct < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                              {Math.abs(comparisonStats.monthProdPct).toFixed(1)}%
                            </div>
                          </div>
                          <p className="text-[9px] font-medium text-slate-400 mt-0.5">
                            Anterior: {formatCurrency(comparisonStats.prodPreviousMonth)}
                          </p>
                        </div>

                        {/* MoM Receita */}
                        <div className="pt-3 border-t border-slate-50">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Receita</p>
                          <div className="flex items-baseline justify-between mt-1">
                            <p className="text-lg font-black text-emerald-600">{formatCurrency(comparisonStats.revCurrentMonth)}</p>
                            <div className={cn(
                              "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black",
                              comparisonStats.monthRevPct > 0 
                                ? "bg-emerald-50 text-emerald-600" 
                                : comparisonStats.monthRevPct < 0 
                                  ? "bg-rose-50 text-rose-600" 
                                  : "bg-slate-100 text-slate-500"
                            )}>
                              {comparisonStats.monthRevPct > 0 ? <ArrowUpRight className="w-3 h-3" /> : comparisonStats.monthRevPct < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                              {Math.abs(comparisonStats.monthRevPct).toFixed(1)}%
                            </div>
                          </div>
                          <p className="text-[9px] font-medium text-slate-400 mt-0.5">
                            Anterior: {formatCurrency(comparisonStats.revPreviousMonth)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-[9px] font-medium text-slate-400 leading-normal">
                        Métricas de desempenho calculadas comparando o mês corrente contra o mês imediatamente anterior para monitorar evolução imediata.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart Card */}
              <div className="lg:col-span-2 bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <span className="text-[10px] font-black text-[#718198] uppercase tracking-widest">
                        Distribuição Mensal E Tendência Histórica
                      </span>
                      <h4 className="text-xs font-bold text-slate-400 mt-0.5">
                        {compareChartMetric === 'producao' ? 'Produção Total' : 'Receita Gerada'} por mês
                      </h4>
                    </div>
                  </div>

                  <div className="w-full h-[290px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={monthlyComparisonData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                          tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const val = payload[0].value;
                              return (
                                <div className="bg-[#1c2643] p-3 rounded-xl border-none shadow-md text-white text-xs font-bold">
                                  <p className="text-white mb-1">{label}</p>
                                  <p className="text-white text-[13px] font-black">{formatCurrency(Number(val))}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          name={compareChartMetric === 'producao' ? "Produção Mensal" : "Receita Mensal"} 
                          dataKey={compareChartMetric === 'producao' ? "productionCurrent" : "revenueCurrent"} 
                          radius={[4, 4, 0, 0]} 
                        >
                          {monthlyComparisonData.map((entry, index) => {
                            let barColor = "#cbd5e1"
                            if (compareChartMetric === 'producao') {
                              if (index === comparisonStats.currentMonthIdx) {
                                barColor = "#1c2643"
                              } else if (index === comparisonStats.prevMonthIdx) {
                                barColor = "#6366f1"
                              }
                            } else {
                              if (index === comparisonStats.currentMonthIdx) {
                                barColor = "#10b981"
                              } else if (index === comparisonStats.prevMonthIdx) {
                                barColor = "#34d399"
                              }
                            }
                            return <Cell key={`cell-${index}`} fill={barColor} />
                          })}
                        </Bar>
                        <Line 
                          type="linear" 
                          name="Tendência" 
                          dataKey={compareChartMetric === 'producao' ? "productionCurrent" : "revenueCurrent"} 
                          stroke={compareChartMetric === 'producao' ? "#1c2643" : "#10b981"} 
                          strokeWidth={3}
                          dot={{ r: 5, strokeWidth: 2, fill: "#ffffff" }}
                          activeDot={{ r: 7 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <p className="text-[10px] font-bold text-slate-400 mt-4 leading-relaxed">
                  * Os dados mostram a distribuição mensal de propostas efetivadas no ano atual. As barras do mês atual e anterior são destacadas em cores diferentes. Use os botões acima para alternar o foco da análise entre volume de <span className={cn("font-extrabold", compareChartMetric === 'producao' ? "text-[#1C2643]" : "text-emerald-600")}>{compareChartMetric === 'producao' ? 'Produção' : 'Receita'}</span>.
                </p>
              </div>
            </div>
          </motion.div>

          {/* MIX DE MERCADO & CANAIS */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="mt-8 pt-8 border-t border-slate-100 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-[#1C2643] tracking-tight mt-1 uppercase">DIAGNÓSTICO DE DESEMPENHO</h3>
              </div>

              {/* Seletor de abas de canais */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mt-3 sm:mt-0 overflow-x-auto max-w-full">
                <button
                  onClick={() => setAnalysisTab('produtos')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    analysisTab === 'produtos'
                      ? "bg-[#1C2643] text-white shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Produtos
                </button>
                <button
                  onClick={() => setAnalysisTab('convenios')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    analysisTab === 'convenios'
                      ? "bg-[#1C2643] text-white shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Convênios
                </button>
                <button
                  onClick={() => setAnalysisTab('bancos')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    analysisTab === 'bancos'
                      ? "bg-[#1C2643] text-white shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Bancos
                </button>
                <button
                  onClick={() => setAnalysisTab('comercial')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    analysisTab === 'comercial'
                      ? "bg-[#1C2643] text-white shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Equipe Comercial
                </button>
              </div>
            </div>

            {/* Conteúdo dinâmico da aba de análise */}
            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
              {analysisTab === 'produtos' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xs font-black text-[#1C2643] uppercase tracking-widest">Participação por Produto</h4>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      {businessBreakdown.products.length} produtos ativos
                    </span>
                  </div>
                  {businessBreakdown.products.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      Nenhuma proposta processada neste período
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {businessBreakdown.products.map((p, idx) => {
                        const prodShare = totalProduction > 0 ? (p.prod / totalProduction) * 100 : 0
                        const revShare = totalRevenue > 0 ? (p.rev / totalRevenue) * 100 : 0
                        return (
                          <div key={idx} className="p-4 border border-slate-50 rounded-2xl bg-slate-50/30 hover:bg-slate-50/60 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="text-xs font-black text-[#1C2643] uppercase tracking-tight">{p.name}</h5>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">{p.count} {p.count === 1 ? 'contrato pago' : 'contratos pagos'}</p>
                              </div>
                            </div>

                            <div className="space-y-3 mt-3">
                              <div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                  <span>Produção: {formatCurrency(p.prod)}</span>
                                  <span className="font-extrabold text-[#1C2643]">{prodShare.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#1C2643] rounded-full transition-all duration-500" style={{ width: `${prodShare}%` }} />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                  <span>Receita: {formatCurrency(p.rev)}</span>
                                  <span className="font-extrabold text-emerald-600">{revShare.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${revShare}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {analysisTab === 'convenios' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xs font-black text-[#1C2643] uppercase tracking-widest">Participação por Convênio / Órgão</h4>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      {businessBreakdown.convenios.length} convênios ativos
                    </span>
                  </div>
                  {businessBreakdown.convenios.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      Nenhuma proposta processada neste período
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {businessBreakdown.convenios.map((c, idx) => {
                        const prodShare = totalProduction > 0 ? (c.prod / totalProduction) * 100 : 0
                        const revShare = totalRevenue > 0 ? (c.rev / totalRevenue) * 100 : 0
                        return (
                          <div key={idx} className="p-4 border border-slate-50 rounded-2xl bg-slate-50/30 hover:bg-slate-50/60 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="text-xs font-black text-[#1C2643] uppercase tracking-tight">{c.name}</h5>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">{c.count} {c.count === 1 ? 'contrato pago' : 'contratos pagos'}</p>
                              </div>
                            </div>

                            <div className="space-y-3 mt-3">
                              <div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                  <span>Produção: {formatCurrency(c.prod)}</span>
                                  <span className="font-extrabold text-[#1C2643]">{prodShare.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#1C2643] rounded-full transition-all duration-500" style={{ width: `${prodShare}%` }} />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                  <span>Receita: {formatCurrency(c.rev)}</span>
                                  <span className="font-extrabold text-emerald-600">{revShare.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${revShare}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {analysisTab === 'bancos' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xs font-black text-[#1C2643] uppercase tracking-widest">Participação por Instituição Financeira</h4>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      {businessBreakdown.bancos.length} bancos parceiros
                    </span>
                  </div>
                  {businessBreakdown.bancos.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      Nenhuma proposta processada neste período
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {businessBreakdown.bancos.map((b, idx) => {
                        const prodShare = totalProduction > 0 ? (b.prod / totalProduction) * 100 : 0
                        const revShare = totalRevenue > 0 ? (b.rev / totalRevenue) * 100 : 0
                        return (
                          <div key={idx} className="p-4 border border-slate-50 rounded-2xl bg-slate-50/30 hover:bg-slate-50/60 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="text-xs font-black text-[#1C2643] uppercase tracking-tight">{b.name}</h5>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">{b.count} {b.count === 1 ? 'contrato pago' : 'contratos pagos'}</p>
                              </div>
                            </div>

                            <div className="space-y-3 mt-3">
                              <div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                  <span>Produção: {formatCurrency(b.prod)}</span>
                                  <span className="font-extrabold text-[#1C2643]">{prodShare.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#1C2643] rounded-full transition-all duration-500" style={{ width: `${prodShare}%` }} />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                  <span>Receita: {formatCurrency(b.rev)}</span>
                                  <span className="font-extrabold text-emerald-600">{revShare.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${revShare}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {analysisTab === 'comercial' && (
                <div className="space-y-8">
                  {/* Broker Breakdown */}
                  <div>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                      <h4 className="text-xs font-black text-[#1C2643] uppercase tracking-widest">Participação por Consultor (Corretor)</h4>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Detalhamento Individual</span>
                    </div>
                    {businessBreakdown.corretores.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        Nenhuma atribuição de corretor identificada
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {businessBreakdown.corretores.map((c, idx) => {
                          const prodShare = totalProduction > 0 ? (c.prod / totalProduction) * 100 : 0
                          const revShare = totalRevenue > 0 ? (c.rev / totalRevenue) * 100 : 0
                          return (
                            <div key={idx} className="p-3 border border-slate-50 rounded-xl bg-slate-50/20 hover:bg-slate-50/50 transition-all">
                              <div>
                                <h5 className="text-[11px] font-black text-[#1C2643] uppercase truncate">{c.name}</h5>
                                <p className="text-[8px] font-bold text-slate-400 mt-0.5">{c.count} {c.count === 1 ? 'contrato' : 'contratos'}</p>
                              </div>

                              <div className="space-y-1.5 mt-2">
                                <div className="flex justify-between text-[8.5px] font-bold text-slate-500">
                                  <span>Prod: {formatCurrency(c.prod)}</span>
                                  <span>{prodShare.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between text-[8.5px] font-bold text-slate-500">
                                  <span className="text-emerald-600">Rec: {formatCurrency(c.rev)}</span>
                                  <span className="text-emerald-600">{revShare.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* RANKING DE PERFORMANCE DE CANAIS */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.7 }}
            className="mt-8 pt-8 border-t border-slate-100 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-[#1C2643] tracking-tight mt-1 uppercase">RANKING DE PERFORMANCE POR CANAL</h3>
              </div>

              {/* Seletor de métrica do ranking */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
                <button
                  onClick={() => setRankingMetric('producao')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    rankingMetric === 'producao'
                      ? "bg-[#1C2643] text-white shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Produção
                </button>
                <button
                  onClick={() => setRankingMetric('receita')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    rankingMetric === 'receita'
                      ? "bg-[#1C2643] text-white shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Receita
                </button>
                <button
                  onClick={() => setRankingMetric('crescimento')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    rankingMetric === 'crescimento'
                      ? "bg-[#1C2643] text-white shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Crescimento
                </button>
              </div>
            </div>

            {/* Grid com as 3 tabelas de Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* CARD 1: BANCOS */}
              <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-600" />
                    <h4 className="text-xs font-black text-[#1C2643] uppercase tracking-wider">Top Bancos</h4>
                  </div>
                  <span className="text-[9px] font-black text-[#718198] uppercase tracking-widest">
                    Por {rankingMetric === 'producao' ? 'Produção' : rankingMetric === 'receita' ? 'Receita' : 'Crescimento'}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
                  {(() => {
                    const sortedBancos = [...rankingsData.bancos].sort((a, b) => {
                      if (rankingMetric === 'producao') return b.prod - a.prod
                      if (rankingMetric === 'receita') return b.rev - a.rev
                      return b.prodGrowth - a.prodGrowth
                    })

                    if (sortedBancos.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                          Nenhum banco com volume
                        </div>
                      )
                    }

                    return sortedBancos.map((item, idx) => {
                      const position = idx + 1
                      const displayVal = rankingMetric === 'producao' 
                        ? formatCurrency(item.prod)
                        : rankingMetric === 'receita'
                        ? formatCurrency(item.rev)
                        : `${item.prodGrowth >= 0 ? '+' : ''}${item.prodGrowth.toFixed(1)}%`

                      return (
                        <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-50 bg-slate-50/20 hover:bg-slate-50/50 transition-all">
                          <div className="flex items-center gap-3 truncate max-w-[70%]">
                            <span className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                              position === 1 ? "bg-amber-100 text-amber-700" :
                              position === 2 ? "bg-slate-200 text-slate-700" :
                              position === 3 ? "bg-orange-100 text-orange-700" :
                              "bg-slate-100 text-slate-500"
                            )}>
                              {position}
                            </span>
                            <div className="truncate">
                              <p className="text-[11px] font-bold text-[#1C2643] truncate uppercase">{item.name}</p>
                              <p className="text-[8px] font-bold text-slate-400 mt-0.5">{item.count} {item.count === 1 ? 'contrato' : 'contratos'}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={cn(
                              "text-[10px] font-black",
                              rankingMetric === 'crescimento' 
                                ? (item.prodGrowth >= 0 ? "text-emerald-600" : "text-rose-500")
                                : "text-[#1C2643]"
                            )}>
                              {displayVal}
                            </span>
                            {rankingMetric !== 'crescimento' && (
                              <p className={cn(
                                "text-[8px] font-extrabold mt-0.5",
                                item.prodGrowth >= 0 ? "text-emerald-600" : "text-rose-500"
                              )}>
                                {item.prodGrowth >= 0 ? '↑' : '↓'} {Math.abs(item.prodGrowth).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* CARD 2: PRODUTOS */}
              <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-600" />
                    <h4 className="text-xs font-black text-[#1C2643] uppercase tracking-wider">Top Produtos</h4>
                  </div>
                  <span className="text-[9px] font-black text-[#718198] uppercase tracking-widest">
                    Por {rankingMetric === 'producao' ? 'Produção' : rankingMetric === 'receita' ? 'Receita' : 'Crescimento'}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
                  {(() => {
                    const sortedProducts = [...rankingsData.products].sort((a, b) => {
                      if (rankingMetric === 'producao') return b.prod - a.prod
                      if (rankingMetric === 'receita') return b.rev - a.rev
                      return b.prodGrowth - a.prodGrowth
                    })

                    if (sortedProducts.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                          Nenhum produto com volume
                        </div>
                      )
                    }

                    return sortedProducts.map((item, idx) => {
                      const position = idx + 1
                      const displayVal = rankingMetric === 'producao' 
                        ? formatCurrency(item.prod)
                        : rankingMetric === 'receita'
                        ? formatCurrency(item.rev)
                        : `${item.prodGrowth >= 0 ? '+' : ''}${item.prodGrowth.toFixed(1)}%`

                      return (
                        <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-50 bg-slate-50/20 hover:bg-slate-50/50 transition-all">
                          <div className="flex items-center gap-3 truncate max-w-[70%]">
                            <span className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                              position === 1 ? "bg-amber-100 text-amber-700" :
                              position === 2 ? "bg-slate-200 text-slate-700" :
                              position === 3 ? "bg-orange-100 text-orange-700" :
                              "bg-slate-100 text-slate-500"
                            )}>
                              {position}
                            </span>
                            <div className="truncate">
                              <p className="text-[11px] font-bold text-[#1C2643] truncate uppercase">{item.name}</p>
                              <p className="text-[8px] font-bold text-slate-400 mt-0.5">{item.count} {item.count === 1 ? 'contrato' : 'contratos'}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={cn(
                              "text-[10px] font-black",
                              rankingMetric === 'crescimento' 
                                ? (item.prodGrowth >= 0 ? "text-emerald-600" : "text-rose-500")
                                : "text-[#1C2643]"
                            )}>
                              {displayVal}
                            </span>
                            {rankingMetric !== 'crescimento' && (
                              <p className={cn(
                                "text-[8px] font-extrabold mt-0.5",
                                item.prodGrowth >= 0 ? "text-emerald-600" : "text-rose-500"
                              )}>
                                {item.prodGrowth >= 0 ? '↑' : '↓'} {Math.abs(item.prodGrowth).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* CARD 3: CONVÊNIOS */}
              <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-600" />
                    <h4 className="text-xs font-black text-[#1C2643] uppercase tracking-wider">Top Convênios</h4>
                  </div>
                  <span className="text-[9px] font-black text-[#718198] uppercase tracking-widest">
                    Por {rankingMetric === 'producao' ? 'Produção' : rankingMetric === 'receita' ? 'Receita' : 'Crescimento'}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
                  {(() => {
                    const sortedConvenios = [...rankingsData.convenios].sort((a, b) => {
                      if (rankingMetric === 'producao') return b.prod - a.prod
                      if (rankingMetric === 'receita') return b.rev - a.rev
                      return b.prodGrowth - a.prodGrowth
                    })

                    if (sortedConvenios.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                          Nenhum convênio com volume
                        </div>
                      )
                    }

                    return sortedConvenios.map((item, idx) => {
                      const position = idx + 1
                      const displayVal = rankingMetric === 'producao' 
                        ? formatCurrency(item.prod)
                        : rankingMetric === 'receita'
                        ? formatCurrency(item.rev)
                        : `${item.prodGrowth >= 0 ? '+' : ''}${item.prodGrowth.toFixed(1)}%`

                      return (
                        <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-50 bg-slate-50/20 hover:bg-slate-50/50 transition-all">
                          <div className="flex items-center gap-3 truncate max-w-[70%]">
                            <span className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                              position === 1 ? "bg-amber-100 text-amber-700" :
                              position === 2 ? "bg-slate-200 text-slate-700" :
                              position === 3 ? "bg-orange-100 text-orange-700" :
                              "bg-slate-100 text-slate-500"
                            )}>
                              {position}
                            </span>
                            <div className="truncate">
                              <p className="text-[11px] font-bold text-[#1C2643] truncate uppercase">{item.name}</p>
                              <p className="text-[8px] font-bold text-slate-400 mt-0.5">{item.count} {item.count === 1 ? 'contrato' : 'contratos'}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={cn(
                              "text-[10px] font-black",
                              rankingMetric === 'crescimento' 
                                ? (item.prodGrowth >= 0 ? "text-emerald-600" : "text-rose-500")
                                : "text-[#1C2643]"
                            )}>
                              {displayVal}
                            </span>
                            {rankingMetric !== 'crescimento' && (
                              <p className={cn(
                                "text-[8px] font-extrabold mt-0.5",
                                item.prodGrowth >= 0 ? "text-emerald-600" : "text-rose-500"
                              )}>
                                {item.prodGrowth >= 0 ? '↑' : '↓'} {Math.abs(item.prodGrowth).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
