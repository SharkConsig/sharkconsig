"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { 
  X, 
  Sparkles, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Award, 
  Filter, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown,
  Building2, 
  Flame, 
  BarChart3, 
  Layers,
  Search,
  ExternalLink,
  ShieldAlert,
  Zap,
  Copy,
  Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"

export interface PipelineIntelligenceDrawerProps {
  isOpen: boolean
  onClose: () => void
  tickets: any[]
  usersList: any[]
  cltCollaborators?: any[]
  getValorOperacaoDeAbertura: (ticket: any) => {
    valor: string
    label: string
    color: string
    num: number
    valorProducao?: string
    numProducao?: number
  }
  onSelectTicket?: (ticket: any) => void
}

type PeriodFilter = "today" | "7d" | "15d" | "30d" | "month" | "all"
type ActiveTab = "speed" | "aging" | "affinity" | "risk"

export function PipelineIntelligenceDrawer({
  isOpen,
  onClose,
  tickets,
  usersList,
  cltCollaborators = [],
  getValorOperacaoDeAbertura,
  onSelectTicket
}: PipelineIntelligenceDrawerProps) {
  const handleClose = () => {
    onClose()
  }

  // Filtros
  const [period, setPeriod] = useState<PeriodFilter>("all")
  const [selectedConvenios, setSelectedConvenios] = useState<string[]>([])
  const [selectedOperators, setSelectedOperators] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>("speed")
  const [affinityMode, setAffinityMode] = useState<"convenio" | "valor">("convenio")
  const [isExecSummaryOpen, setIsExecSummaryOpen] = useState(false)
  const [searchRiskQuery, setSearchRiskQuery] = useState("")
  const [riskTierFilter, setRiskTierFilter] = useState<"all" | "high" | "mid" | "low">("all")
  const [riskStageFilters, setRiskStageFilters] = useState<string[]>([])
  const [openDropdown, setOpenDropdown] = useState<"convenio" | "operator" | "stage" | null>(null)
  const convenioDropdownRef = useRef<HTMLDivElement>(null)
  const operatorDropdownRef = useRef<HTMLDivElement>(null)
  const stageDropdownRef = useRef<HTMLDivElement>(null)
  const affinityBodyScrollRef = useRef<HTMLDivElement>(null)
  const [copiedFieldKey, setCopiedFieldKey] = useState<string | null>(null)

  useEffect(() => {
    if (!openDropdown) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (openDropdown === "convenio" && convenioDropdownRef.current && !convenioDropdownRef.current.contains(target)) {
        setOpenDropdown(null)
      } else if (openDropdown === "operator" && operatorDropdownRef.current && !operatorDropdownRef.current.contains(target)) {
        setOpenDropdown(null)
      } else if (openDropdown === "stage" && stageDropdownRef.current && !stageDropdownRef.current.contains(target)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [openDropdown])

  const handleCopyField = (key: string, rawValue?: string) => {
    const text = String(rawValue || "").trim()
    if (!text || text === "---") return
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {})
    } else if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand("copy")
      } catch {}
      document.body.removeChild(textarea)
    }
    setCopiedFieldKey(key)
    setTimeout(() => {
      setCopiedFieldKey(prev => (prev === key ? null : prev))
    }, 1500)
  }

  // Apenas fichas que estão efetivamente no Kanban (excluindo gavetas ocultas de WhatsApp)
  const kanbanTickets = useMemo(() => {
    return tickets.filter(t => {
      const s = String(t.status || "").trim().toUpperCase()
      const motivo = String(t.motivo_perda || "").trim().toUpperCase()
      if (
        s === "NÃO EXISTE WHATSAPP" ||
        s === "NAO_EXISTE_WHATSAPP" ||
        s === "WHATSAPP DIVERGENTE" ||
        motivo === "NÃO EXISTE WHATSAPP" ||
        motivo === "WHATSAPP DIVERGENTE"
      ) {
        return false
      }
      return true
    })
  }, [tickets])

  // Lista única de convênios que já possuem lead em atendimento no Kanban
  const conveniosList = useMemo(() => {
    const set = new Set<string>()
    kanbanTickets.forEach(t => {
      const c = String(t.convenio || "").trim()
      if (c && c !== "-" && c.toLowerCase() !== "não informado" && c.toLowerCase() !== "nao informado") {
        set.add(c)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [kanbanTickets])

  // Lista unificada de operadores (para resolução de nomes nas análises)
  const operatorsList = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; equipe?: string; regime_contratacao?: string; funcao?: string; role?: string }>()
    usersList.forEach(u => {
      if (u.id) {
        map.set(String(u.id), {
          id: String(u.id),
          nome: u.nome || "Sem Nome",
          equipe: u.equipe,
          regime_contratacao: u.regime_contratacao,
          funcao: u.funcao,
          role: u.role
        })
      }
    })
    cltCollaborators.forEach(c => {
      if (c.id && !map.has(String(c.id))) {
        map.set(String(c.id), {
          id: String(c.id),
          nome: c.nome || "Sem Nome",
          equipe: c.equipe,
          regime_contratacao: c.regime_contratacao,
          funcao: c.funcao,
          role: c.role
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  }, [usersList, cltCollaborators])

  // Lista para o seletor de equipe: somente usuários CLT e Estágio com atendimento no Kanban
  const teamOperatorsList = useMemo(() => {
    const kanbanUserIds = new Set<string>()
    kanbanTickets.forEach(t => {
      const uid = String(t.user_id || "").trim().toLowerCase()
      if (uid) kanbanUserIds.add(uid)
    })

    return operatorsList
      .filter(u => {
        const regime = String(u.regime_contratacao || "").trim().toUpperCase()
        const roleStr = String(u.funcao || u.role || "").trim().toUpperCase()
        const isCltOrEstagio =
          regime === "CLT" ||
          regime === "ESTÁGIO" ||
          regime === "ESTAGIO" ||
          (!regime && (roleStr === "ESTÁGIO" || roleStr === "ESTAGIO"))
        if (!isCltOrEstagio) return false
        return kanbanUserIds.has(u.id.trim().toLowerCase())
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  }, [operatorsList, kanbanTickets])

  // Filtragem inicial dos tickets por período, convênio e operador
  const filteredTickets = useMemo(() => {
    const now = new Date().getTime()
    const selectedOpSet = selectedOperators.length > 0
      ? new Set(selectedOperators.map(id => id.trim().toLowerCase()))
      : null
    const selectedConvSet = selectedConvenios.length > 0
      ? new Set(selectedConvenios.map(c => c.trim().toUpperCase()))
      : null

    return kanbanTickets.filter(t => {
      // Filtro de Operador (múltipla seleção)
      if (selectedOpSet) {
        const opId = String(t.user_id || "").trim().toLowerCase()
        if (!selectedOpSet.has(opId)) return false
      }

      // Filtro de Convênio (múltipla seleção)
      if (selectedConvSet) {
        const c = (t.convenio || "").trim().toUpperCase()
        if (!selectedConvSet.has(c)) return false
      }

      // Filtro de Período (baseado em created_at ou updated_at)
      if (period !== "all") {
        const ticketDate = new Date(t.created_at || t.updated_at || Date.now()).getTime()
        const diffMs = now - ticketDate
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (period === "today" && diffDays > 1) return false
        if (period === "7d" && diffDays > 7) return false
        if (period === "15d" && diffDays > 15) return false
        if (period === "30d" && diffDays > 30) return false
        if (period === "month") {
          const tDate = new Date(ticketDate)
          const nowDate = new Date()
          if (tDate.getMonth() !== nowDate.getMonth() || tDate.getFullYear() !== nowDate.getFullYear()) {
            return false
          }
        }
      }

      return true
    })
  }, [kanbanTickets, period, selectedConvenios, selectedOperators])

  // 1. CÁLCULO DE TEMPO MÉDIO: Em negociação -> Gerada a ADE
  // Regra: Tempo em minutos entre o momento em que o lead entrou na etapa 'Em negociação' até a geração da ADE (entrada em 'Fechado' com proposta digitada).
  const speedToLeadData = useMemo(() => {
    interface OperatorSpeed {
      userId: string
      userName: string
      totalNegociacoes: number
      totalPropostasDigitadas: number
      avgMinutesToAde: number
      minMinutes: number
      maxMinutes: number
      sampleCount: number
    }

    const opMap = new Map<string, {
      userId: string
      userName: string
      totalNegociacoes: number
      totalPropostasDigitadas: number
      durationsMinutes: number[]
    }>()

    // Helper para achar nome
    const getName = (userId: string, fallbackName?: string) => {
      const found = operatorsList.find(o => o.id === userId)
      return found?.nome || fallbackName || "Não Atribuído"
    }

    const parseTimestampMs = (dateStr?: string | null, requireTime = false): number | null => {
      if (!dateStr) return null
      const s = String(dateStr).trim()
      if (!s || s === "-") return null
      const hasTime = s.includes("T") || /\d{2}:\d{2}/.test(s)
      if (requireTime && !hasTime) return null
      const ms = new Date(s).getTime()
      return isNaN(ms) ? null : ms
    }

    filteredTickets.forEach(t => {
      const uId = t.user_id || "unassigned"
      const uName = getName(uId, t.user_nome)

      if (!opMap.has(uId)) {
        opMap.set(uId, {
          userId: uId,
          userName: uName,
          totalNegociacoes: 0,
          totalPropostasDigitadas: 0,
          durationsMinutes: []
        })
      }

      const op = opMap.get(uId)!
      const statusUpper = (t.status || "").toUpperCase()
      const movs = Array.isArray(t.historico_movimentacoes) ? t.historico_movimentacoes : []

      const hasNegociacao =
        statusUpper.includes("NEGOCIA") ||
        movs.some(
          (m: any) =>
            (m.etapa_anterior || "").toUpperCase().includes("NEGOCIA") ||
            (m.etapa_nova || "").toUpperCase().includes("NEGOCIA")
        )

      const propAde = t.proposta_info?.ade ? String(t.proposta_info.ade).trim() : ""
      const hasValidAde = Boolean(propAde && propAde !== "-" && propAde !== "null" && propAde !== "undefined")
      const isFechadoStatus = statusUpper === "FECHADO" || statusUpper.includes("FECHAD")
      const isPerdidoStatus = statusUpper.includes("PERDID")
      const movToFechado = movs.some((m: any) => (m.etapa_nova || "").toUpperCase().includes("FECHAD"))
      const isPropostaDigitada = isFechadoStatus || (hasValidAde && !isPerdidoStatus) || (movToFechado && !isPerdidoStatus)

      if (hasNegociacao) {
        op.totalNegociacoes++
      }

      if (isPropostaDigitada) {
        op.totalPropostasDigitadas++
      }

      // Procurar tempo exato: entrada em 'Em negociação' até geração da ADE / entrada em 'Fechado'
      let negociacaoTime: number | null = null
      let movToFechadoTime: number | null = null

      if (movs.length > 0) {
        const sorted = [...movs].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        for (const m of sorted) {
          const toStage = (m.etapa_nova || "").toUpperCase()
          const fromStage = (m.etapa_anterior || "").toUpperCase()
          const mTime = parseTimestampMs(m.data)
          if (!mTime) continue

          if (!negociacaoTime) {
            if (toStage.includes("NEGOCIA")) {
              negociacaoTime = mTime
            } else if (fromStage.includes("NEGOCIA")) {
              negociacaoTime = parseTimestampMs(t.created_at) ?? mTime
            }
          }

          if (negociacaoTime && !movToFechadoTime && toStage.includes("FECHAD") && mTime >= negociacaoTime) {
            movToFechadoTime = mTime
          }
        }
      }

      if (!negociacaoTime && statusUpper.includes("NEGOCIA")) {
        negociacaoTime = parseTimestampMs(t.created_at)
      }

      let adeTime: number | null = null
      if (isPropostaDigitada && negociacaoTime) {
        const propInfo = t.proposta_info
        // 1. Prioriza data_digitacao com horário completo da proposta gerada
        const digitacaoExact = parseTimestampMs(propInfo?.data_digitacao, true)
        if (digitacaoExact && digitacaoExact >= negociacaoTime) {
          adeTime = digitacaoExact
        }

        // 2. Fallback para created_at da proposta se possuir horário e for >= entrada em negociação
        if (!adeTime) {
          const propCreated = parseTimestampMs(propInfo?.created_at, true)
          if (propCreated && propCreated >= negociacaoTime) {
            adeTime = propCreated
          }
        }

        // 3. Fallback para movimentação explícita para FECHADO após entrada em negociação
        if (!adeTime && movToFechadoTime && movToFechadoTime >= negociacaoTime) {
          adeTime = movToFechadoTime
        }

        // 4. Fallback para updated_at do cartão quando já está em FECHADO sem horário detalhado em data_digitacao
        if (!adeTime && isFechadoStatus) {
          const updatedMs = parseTimestampMs(t.updated_at, true)
          if (updatedMs && updatedMs >= negociacaoTime) {
            adeTime = updatedMs
          }
        }
      }

      if (negociacaoTime && adeTime && adeTime >= negociacaoTime) {
        const diffMin = Math.round((adeTime - negociacaoTime) / (1000 * 60))
        // Sanity filter: descartar anomalias > 30 dias (43200 min) para média executiva
        if (diffMin >= 0 && diffMin <= 43200) {
          op.durationsMinutes.push(diffMin)
        }
      }
    })

    const result: OperatorSpeed[] = []
    let totalGeneralMinutes = 0
    let totalGeneralSamples = 0

    opMap.forEach(op => {
      if (op.totalNegociacoes === 0 && op.totalPropostasDigitadas === 0 && op.durationsMinutes.length === 0) return

      const count = op.durationsMinutes.length
      const avg = count > 0 ? Math.round(op.durationsMinutes.reduce((a, b) => a + b, 0) / count) : 0
      const min = count > 0 ? Math.min(...op.durationsMinutes) : 0
      const max = count > 0 ? Math.max(...op.durationsMinutes) : 0

      if (count > 0) {
        totalGeneralMinutes += op.durationsMinutes.reduce((a, b) => a + b, 0)
        totalGeneralSamples += count
      }

      result.push({
        userId: op.userId,
        userName: op.userName,
        totalNegociacoes: op.totalNegociacoes,
        totalPropostasDigitadas: op.totalPropostasDigitadas,
        avgMinutesToAde: avg,
        minMinutes: min,
        maxMinutes: max,
        sampleCount: count
      })
    })

    // Ordenar do menor tempo médio (mais rápido) para o mais demorado
    result.sort((a, b) => {
      if (a.sampleCount === 0 && b.sampleCount === 0) {
        return b.totalPropostasDigitadas - a.totalPropostasDigitadas || b.totalNegociacoes - a.totalNegociacoes
      }
      if (a.sampleCount === 0) return 1
      if (b.sampleCount === 0) return -1
      return a.avgMinutesToAde - b.avgMinutesToAde
    })

    const generalAvgMinutes = totalGeneralSamples > 0 ? Math.round(totalGeneralMinutes / totalGeneralSamples) : 0

    return {
      ranking: result,
      generalAvgMinutes,
      totalSamples: totalGeneralSamples
    }
  }, [filteredTickets, operatorsList])

  // 2. CÁLCULO DE CAPITAL IMOBILIZADO POR ETAPA
  const stageAgingData = useMemo(() => {
    const STAGES = [
      { key: "EM RETOMADA", label: "Em Retomada / Interação", color: "amber" },
      { key: "EM NEGOCIAÇÃO", label: "Em Negociação", color: "indigo" },
      { key: "EM REATIVAÇÃO", label: "Em Reativação", color: "purple" },
      { key: "SEM INTERESSE", label: "Sem Interesse", color: "slate" }
    ]

    const now = Date.now()
    let grandTotalCapital = 0
    let grandTotalProducao = 0
    let grandTotalStuck48hCount = 0

    const stageResults = STAGES.map(stageDef => {
      const stageTickets = filteredTickets.filter(t => {
        const s = (t.status || "").toUpperCase()
        if (stageDef.key === "EM RETOMADA") {
          return s.includes("RETOMADA") || s.includes("INTERAÇÃO") || s.includes("INTERACAO")
        }
        if (stageDef.key === "EM NEGOCIAÇÃO") {
          return s.includes("NEGOCIA")
        }
        if (stageDef.key === "EM REATIVAÇÃO") {
          return s.includes("REATIVA")
        }
        if (stageDef.key === "SEM INTERESSE") {
          return s.includes("SEM INTERESSE")
        }
        return s === stageDef.key
      })

      let totalOperacao = 0
      let totalProducao = 0
      let totalHours = 0

      let highTicketCount = 0 // > 30k
      let highTicketVal = 0
      let midTicketCount = 0  // 10k a 30k
      let midTicketVal = 0
      let lowTicketCount = 0  // < 10k
      let lowTicketVal = 0

      let stuckCount48h = 0
      let stuckCapital48h = 0

      stageTickets.forEach(t => {
        const opData = getValorOperacaoDeAbertura(t)
        const opVal = opData.num || 0
        const prodVal = opData.numProducao || 0

        totalOperacao += opVal
        totalProducao += prodVal

        // Horas na etapa (baseado em updated_at ou created_at)
        const tDate = new Date(t.updated_at || t.created_at || now).getTime()
        const hoursInStage = Math.max(0, (now - tDate) / (1000 * 60 * 60))
        totalHours += hoursInStage

        if (hoursInStage > 48) {
          stuckCount48h++
          stuckCapital48h += opVal
        }

        // Segmentação por ticket
        if (opVal >= 30000) {
          highTicketCount++
          highTicketVal += opVal
        } else if (opVal >= 10000) {
          midTicketCount++
          midTicketVal += opVal
        } else {
          lowTicketCount++
          lowTicketVal += opVal
        }
      })

      grandTotalCapital += totalOperacao
      grandTotalProducao += totalProducao
      grandTotalStuck48hCount += stuckCount48h

      const count = stageTickets.length
      const avgHours = count > 0 ? Math.round(totalHours / count) : 0

      return {
        ...stageDef,
        count,
        totalOperacao,
        totalProducao,
        avgHours,
        avgDays: (avgHours / 24).toFixed(1),
        stuckCount48h,
        stuckCapital48h,
        ticketsByTier: {
          high: { count: highTicketCount, val: highTicketVal },
          mid: { count: midTicketCount, val: midTicketVal },
          low: { count: lowTicketCount, val: lowTicketVal }
        }
      }
    })

    return {
      stages: stageResults,
      grandTotalCapital,
      grandTotalProducao,
      grandTotalStuck48hCount
    }
  }, [filteredTickets, getValorOperacaoDeAbertura])

  // 3. MATRIZ DE AFINIDADE: Operador x Convênio / Valor Financeiro
  const affinityMatrixData = useMemo(() => {
    const valueTiers = ["Alto (>30k)", "Médio (10k-30k)", "Baixo (<10k)"]

    // Top convênios com maior volume + índice rápido de operadores
    const topConveniosCountMap = new Map<string, number>()
    const operatorNameMap = new Map<string, string>()
    operatorsList.forEach(o => {
      if (o.id) operatorNameMap.set(o.id, o.nome)
    })

    interface CellMetric {
      total: number
      converted: number
      rate: number
      strength: "forte" | "neutro" | "fraco"
    }

    interface OperatorAffinity {
      userId: string
      userName: string
      totalTickets: number
      totalConverted: number
      overallRate: number
      byConvenio: Record<string, CellMetric>
      byTier: Record<string, CellMetric>
      bestConvenio?: string
      worstConvenio?: string
      bestTier?: string
      worstTier?: string
    }

    const opMap = new Map<string, {
      userId: string
      userName: string
      totalTickets: number
      totalConverted: number
      byConvenio: Record<string, { total: number; converted: number }>
      byTier: Record<string, { total: number; converted: number }>
    }>()

    filteredTickets.forEach(t => {
      const statusUpper = (t.status || "").toUpperCase()
      const movs = Array.isArray(t.historico_movimentacoes) ? t.historico_movimentacoes : []

      // Analisar apenas atendimentos a partir da etapa 'Em negociação' (igual à aba Tempo Médio)
      const hasNegociacao =
        statusUpper.includes("NEGOCIA") ||
        movs.some(
          (m: any) =>
            (m.etapa_anterior || "").toUpperCase().includes("NEGOCIA") ||
            (m.etapa_nova || "").toUpperCase().includes("NEGOCIA")
        )

      if (!hasNegociacao) return

      const c = (t.convenio || "Outros").trim().toUpperCase()
      topConveniosCountMap.set(c, (topConveniosCountMap.get(c) || 0) + 1)

      const opVal = getValorOperacaoDeAbertura(t).num || 0
      const tier = opVal >= 30000 ? "Alto (>30k)" : opVal >= 10000 ? "Médio (10k-30k)" : "Baixo (<10k)"

      const uId = t.user_id || "unassigned"
      const uName = operatorNameMap.get(uId) || t.user_nome || "Não Atribuído"

      if (!opMap.has(uId)) {
        opMap.set(uId, {
          userId: uId,
          userName: uName,
          totalTickets: 0,
          totalConverted: 0,
          byConvenio: {},
          byTier: {}
        })
      }

      const op = opMap.get(uId)!
      op.totalTickets++

      if (!op.byConvenio[c]) {
        op.byConvenio[c] = { total: 0, converted: 0 }
      }
      op.byConvenio[c].total++

      if (!op.byTier[tier]) {
        op.byTier[tier] = { total: 0, converted: 0 }
      }
      op.byTier[tier].total++

      // Conversão = proposta digitada / ADE gerada (ou entrada em Fechado), igual à aba Tempo Médio
      const propAde = t.proposta_info?.ade ? String(t.proposta_info.ade).trim() : ""
      const hasValidAde = Boolean(propAde && propAde !== "-" && propAde !== "null" && propAde !== "undefined")
      const isFechadoStatus = statusUpper === "FECHADO" || statusUpper.includes("FECHAD")
      const isPerdidoStatus = statusUpper.includes("PERDID")
      const movToFechado = movs.some((m: any) => (m.etapa_nova || "").toUpperCase().includes("FECHAD"))
      const isConverted = isFechadoStatus || (hasValidAde && !isPerdidoStatus) || (movToFechado && !isPerdidoStatus)

      if (isConverted) {
        op.totalConverted++
        op.byConvenio[c].converted++
        op.byTier[tier].converted++
      }
    })

    const convenioUniverse = new Set<string>()
    const selectedConvSet = selectedConvenios.length > 0
      ? new Set(selectedConvenios.map(c => c.trim().toUpperCase()))
      : null

    conveniosList.forEach(rawConv => {
      const normalized = rawConv.trim().toUpperCase()
      if (!normalized) return
      if (selectedConvSet && !selectedConvSet.has(normalized)) return
      convenioUniverse.add(normalized)
    })

    const topConvenios = Array.from(convenioUniverse).sort((a, b) => {
      const countDiff = (topConveniosCountMap.get(b) || 0) - (topConveniosCountMap.get(a) || 0)
      if (countDiff !== 0) return countDiff
      return a.localeCompare(b, "pt-BR")
    })

    const evaluateDimension = (
      keys: string[],
      rawMap: Record<string, { total: number; converted: number }>,
      overallRate: number
    ) => {
      const evaluated: Record<string, CellMetric> = {}
      let bestRate = -1
      let bestName = ""
      let worstRate = 999
      let worstName = ""

      keys.forEach(key => {
        const data = rawMap[key] || { total: 0, converted: 0 }
        const rate = data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0
        let strength: "forte" | "neutro" | "fraco" = "neutro"

        if (data.total >= 3) {
          if (rate >= 40 || rate > overallRate + 15) {
            strength = "forte"
          } else if (rate <= 15 || rate < overallRate - 15) {
            strength = "fraco"
          }
        }

        if (data.total >= 2) {
          if (rate > bestRate) {
            bestRate = rate
            bestName = key
          }
          if (rate < worstRate) {
            worstRate = rate
            worstName = key
          }
        }

        evaluated[key] = {
          total: data.total,
          converted: data.converted,
          rate,
          strength
        }
      })

      return {
        evaluated,
        best: bestName && bestRate >= 30 ? `${bestName} (${bestRate}%)` : undefined,
        worst: worstName && worstRate <= 20 && worstName !== bestName ? `${worstName} (${worstRate}%)` : undefined
      }
    }

    const matrixRows: OperatorAffinity[] = []

    opMap.forEach(op => {
      if (op.totalTickets === 0) return

      const overallRate = Math.round((op.totalConverted / op.totalTickets) * 100)
      const convenioEval = evaluateDimension(topConvenios, op.byConvenio, overallRate)
      const tierEval = evaluateDimension(valueTiers, op.byTier, overallRate)

      matrixRows.push({
        userId: op.userId,
        userName: op.userName,
        totalTickets: op.totalTickets,
        totalConverted: op.totalConverted,
        overallRate,
        byConvenio: convenioEval.evaluated,
        byTier: tierEval.evaluated,
        bestConvenio: convenioEval.best,
        worstConvenio: convenioEval.worst,
        bestTier: tierEval.best,
        worstTier: tierEval.worst
      })
    })

    matrixRows.sort((a, b) => b.totalTickets - a.totalTickets)

    return {
      topConvenios,
      valueTiers,
      rows: matrixRows
    }
  }, [filteredTickets, operatorsList, conveniosList, selectedConvenios, getValorOperacaoDeAbertura])

  // 4. RADAR DE RISCO DE QUEIMA DE LEADS
  // Todos os atendimentos das etapas ativas parados sem avanço há mais de 48 horas
  const riskLeadsData = useMemo(() => {
    const now = Date.now()

    return filteredTickets
      .filter(t => {
        const s = (t.status || "").toUpperCase()
        if (s.includes("FECHAD") || s.includes("PERDID")) return false
        return (
          s.includes("RETOMADA") ||
          s.includes("INTERAÇÃO") ||
          s.includes("INTERACAO") ||
          s.includes("NEGOCIA") ||
          s.includes("REATIVA") ||
          s.includes("SEM INTERESSE")
        )
      })
      .map(t => {
        const opData = getValorOperacaoDeAbertura(t)
        const opVal = opData.num || 0
        const prodVal = opData.numProducao || 0
        const dateMs = new Date(t.updated_at || t.created_at || now).getTime()
        const exactHoursInactive = Math.max(0, (now - dateMs) / (1000 * 60 * 60))
        const hoursInactive = Math.floor(exactHoursInactive)

        return {
          ticket: t,
          valorOperacao: opVal,
          valorProducao: prodVal,
          hoursInactive,
          exactHoursInactive,
          isHighRisk: opVal >= 25000 && exactHoursInactive > 48
        }
      })
      .filter(item => item.exactHoursInactive > 48)
      .sort((a, b) => b.valorOperacao - a.valorOperacao || b.hoursInactive - a.hoursInactive)
  }, [filteredTickets, getValorOperacaoDeAbertura])

  const getRiskStageKey = (status?: string) => {
    const s = String(status || "").trim().toUpperCase()
    if (s.includes("RETOMADA") || s.includes("INTERAÇÃO") || s.includes("INTERACAO")) return "EM RETOMADA"
    if (s.includes("NEGOCIA")) return "EM NEGOCIAÇÃO"
    if (s.includes("REATIVA")) return "EM REATIVAÇÃO"
    if (s.includes("SEM INTERESSE")) return "SEM INTERESSE"
    return s
  }

  const riskStageOptions = useMemo(() => {
    const STAGE_DEFS = [
      { value: "EM RETOMADA", label: "Em Retomada / Interação" },
      { value: "EM NEGOCIAÇÃO", label: "Em Negociação" },
      { value: "EM REATIVAÇÃO", label: "Em Reativação" },
      { value: "SEM INTERESSE", label: "Sem Interesse" }
    ]

    const presentCounts = new Map<string, number>()
    riskLeadsData.forEach(item => {
      const key = getRiskStageKey(item.ticket.status)
      if (key) {
        presentCounts.set(key, (presentCounts.get(key) || 0) + 1)
      }
    })

    const ordered = STAGE_DEFS
      .filter(def => (presentCounts.get(def.value) || 0) > 0)
      .map(def => ({
        value: def.value,
        label: def.label,
        count: presentCounts.get(def.value) || 0
      }))

    presentCounts.forEach((count, key) => {
      if (!STAGE_DEFS.some(def => def.value === key)) {
        ordered.push({ value: key, label: key, count })
      }
    })

    return ordered
  }, [riskLeadsData])

  const effectiveRiskStageFilters = useMemo(() => {
    if (riskStageFilters.length === 0) return []
    const valid = new Set(riskStageOptions.map(opt => opt.value))
    return riskStageFilters.filter(s => valid.has(s))
  }, [riskStageFilters, riskStageOptions])

  const searchFilteredRiskLeads = useMemo(() => {
    let list = riskLeadsData

    if (effectiveRiskStageFilters.length > 0) {
      const stageSet = new Set(effectiveRiskStageFilters)
      list = list.filter(item => stageSet.has(getRiskStageKey(item.ticket.status)))
    }

    if (!searchRiskQuery.trim()) return list

    const q = searchRiskQuery.toLowerCase().trim()
    const qDigits = q.replace(/\D/g, "")
    return list.filter(item => {
      const cName = (item.ticket.cliente_nome || "").toLowerCase()
      const cCpf = (item.ticket.cliente_cpf || "").toLowerCase()
      const cCpfDigits = cCpf.replace(/\D/g, "")
      const uName = (item.ticket.user_nome || "").toLowerCase()
      const conv = (item.ticket.convenio || "").toLowerCase()
      return (
        cName.includes(q) ||
        cCpf.includes(q) ||
        (qDigits.length >= 6 && cCpfDigits.includes(qDigits)) ||
        uName.includes(q) ||
        conv.includes(q)
      )
    })
  }, [riskLeadsData, effectiveRiskStageFilters, searchRiskQuery])

  const riskTierCounts = useMemo(() => {
    let high = 0
    let mid = 0
    let low = 0
    searchFilteredRiskLeads.forEach(item => {
      if (item.valorOperacao >= 30000) high++
      else if (item.valorOperacao >= 10000) mid++
      else low++
    })
    return { high, mid, low }
  }, [searchFilteredRiskLeads])

  const filteredRiskLeads = useMemo(() => {
    if (riskTierFilter === "high") {
      return searchFilteredRiskLeads.filter(item => item.valorOperacao >= 30000)
    }
    if (riskTierFilter === "mid") {
      return searchFilteredRiskLeads.filter(item => item.valorOperacao >= 10000 && item.valorOperacao < 30000)
    }
    if (riskTierFilter === "low") {
      return searchFilteredRiskLeads.filter(item => item.valorOperacao < 10000)
    }
    return searchFilteredRiskLeads
  }, [searchFilteredRiskLeads, riskTierFilter])

  // Formatação de Moeda
  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(val)
  }

  const fmtDurationShort = (minutes: number) => {
    if (!minutes || minutes <= 0) return "N/A"
    if (minutes < 60) return `${minutes} min`
    return `${(minutes / 60).toFixed(1)}h`
  }

  // 5. CENTRAL DE DIAGNÓSTICO ACIONÁVEL — RESUMO EXECUTIVO (computado sob demanda ao abrir)
  const executiveSummaryData = useMemo(() => {
    if (!isExecSummaryOpen) return null

    // Eixo 1: VIP (>30k) em risco (>48h)
    const vipRiskLeads = riskLeadsData.filter(item => item.valorOperacao >= 30000)
    let vipOperacao = 0
    let vipProducao = 0
    const vipByStageMap = new Map<string, { label: string; count: number; operacao: number; producao: number }>()

    const STAGE_LABELS: Record<string, string> = {
      "EM RETOMADA": "Em Retomada / Interação",
      "EM NEGOCIAÇÃO": "Em Negociação",
      "EM REATIVAÇÃO": "Em Reativação",
      "SEM INTERESSE": "Sem Interesse"
    }

    const stuckByUserMap = new Map<string, number>()
    const riskIdSet = new Set<string>()
    riskLeadsData.forEach(item => {
      riskIdSet.add(String(item.ticket.id))
      const uId = item.ticket.user_id || "unassigned"
      stuckByUserMap.set(uId, (stuckByUserMap.get(uId) || 0) + 1)
    })

    vipRiskLeads.forEach(item => {
      vipOperacao += item.valorOperacao
      vipProducao += item.valorProducao
      const stKey = getRiskStageKey(item.ticket.status)
      const current = vipByStageMap.get(stKey) || {
        label: STAGE_LABELS[stKey] || stKey || "Outras",
        count: 0,
        operacao: 0,
        producao: 0
      }
      current.count++
      current.operacao += item.valorOperacao
      current.producao += item.valorProducao
      vipByStageMap.set(stKey, current)
    })

    const topVipStage = Array.from(vipByStageMap.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.operacao - a.operacao || b.count - a.count)[0] || null

    // Eixo 5: Concentração de capital e potencial nas etapas quentes
    const sortedCapitalStages = [...stageAgingData.stages].sort((a, b) => b.totalOperacao - a.totalOperacao)
    const topCapitalStage = sortedCapitalStages[0] || null
    const topCapitalSharePct =
      topCapitalStage && stageAgingData.grandTotalCapital > 0
        ? Math.round((topCapitalStage.totalOperacao / stageAgingData.grandTotalCapital) * 100)
        : 0

    const negStage = stageAgingData.stages.find(s => s.key === "EM NEGOCIAÇÃO") || null
    const reativacaoStage = stageAgingData.stages.find(s => s.key === "EM REATIVAÇÃO") || null
    const retomadaStage = stageAgingData.stages.find(s => s.key === "EM RETOMADA") || null
    const warmRepresadoOperacao = (reativacaoStage?.totalOperacao || 0) + (retomadaStage?.totalOperacao || 0)
    const warmRepresadoProducao = (reativacaoStage?.totalProducao || 0) + (retomadaStage?.totalProducao || 0)
    const stuckBasePct =
      filteredTickets.length > 0
        ? Math.round((stageAgingData.grandTotalStuck48hCount / filteredTickets.length) * 100)
        : 0

    // Eixo 3: Eficiência da equipe, velocidade e gargalos de SLA
    const totalPropostas = speedToLeadData.ranking.reduce((acc, op) => acc + op.totalPropostasDigitadas, 0)
    const totalNegociacoes = speedToLeadData.ranking.reduce((acc, op) => acc + op.totalNegociacoes, 0)
    const rankingWithSamples = speedToLeadData.ranking.filter(op => op.sampleCount > 0)

    const fastestOp = rankingWithSamples[0] || null
    const volumeLeader =
      [...speedToLeadData.ranking]
        .filter(op => op.totalPropostasDigitadas > 0)
        .sort((a, b) => b.totalPropostasDigitadas - a.totalPropostasDigitadas || a.avgMinutesToAde - b.avgMinutesToAde)[0] || null

    const bottleneckOps = speedToLeadData.ranking
      .map(op => {
        const convRate = op.totalNegociacoes > 0 ? Math.min(100, Math.round((op.totalPropostasDigitadas / op.totalNegociacoes) * 100)) : 0
        return {
          ...op,
          convRate,
          stuck48hCount: stuckByUserMap.get(op.userId) || 0
        }
      })
      .filter(
        op =>
          (op.sampleCount >= 2 && op.avgMinutesToAde > 24 * 60) ||
          (op.totalNegociacoes >= 5 && op.convRate < 15)
      )
      .sort((a, b) => b.avgMinutesToAde - a.avgMinutesToAde || a.convRate - b.convRate)
      .slice(0, 4)

    // Eixo 2: Sugestões de roteamento por afinidade (melhores matches e desperdícios)
    const bestConvenioMatches: Array<{
      convenio: string
      userName: string
      rate: number
      converted: number
      total: number
    }> = []

    for (const conv of affinityMatrixData.topConvenios) {
      let best: { userName: string; rate: number; converted: number; total: number } | null = null
      for (const row of affinityMatrixData.rows) {
        const cell = row.byConvenio[conv]
        if (!cell || cell.total < 2 || cell.rate < 25) continue
        if (
          !best ||
          cell.rate > best.rate ||
          (cell.rate === best.rate && cell.total > best.total)
        ) {
          best = {
            userName: row.userName,
            rate: cell.rate,
            converted: cell.converted,
            total: cell.total
          }
        }
      }
      if (best) {
        bestConvenioMatches.push({ convenio: conv, ...best })
      }
    }
    bestConvenioMatches.sort((a, b) => b.rate - a.rate || b.total - a.total)

    let bestHighTierMatch: { userName: string; rate: number; converted: number; total: number } | null = null
    for (const row of affinityMatrixData.rows) {
      const cell = row.byTier["Alto (>30k)"]
      if (!cell || cell.total < 2 || cell.rate < 20) continue
      if (
        !bestHighTierMatch ||
        cell.rate > bestHighTierMatch.rate ||
        (cell.rate === bestHighTierMatch.rate && cell.total > bestHighTierMatch.total)
      ) {
        bestHighTierMatch = {
          userName: row.userName,
          rate: cell.rate,
          converted: cell.converted,
          total: cell.total
        }
      }
    }

    const wasteMatches: Array<{
      userName: string
      convenio: string
      rate: number
      converted: number
      total: number
    }> = []

    affinityMatrixData.rows.forEach(row => {
      affinityMatrixData.topConvenios.forEach(conv => {
        const cell = row.byConvenio[conv]
        if (!cell || cell.total < 3) return
        if (cell.rate === 0 || cell.strength === "fraco") {
          wasteMatches.push({
            userName: row.userName,
            convenio: conv,
            rate: cell.rate,
            converted: cell.converted,
            total: cell.total
          })
        }
      })
    })
    wasteMatches.sort((a, b) => a.rate - b.rate || b.total - a.total)

    // Eixo 4: CPFs ativos duplicados / fragmentados entre operadores
    const now = Date.now()
    const cpfGroups = new Map<string, Array<{
      ticket: KanbanTicketItem
      opVal: number
      hoursInactive: number
      inRisk: boolean
    }>>()

    filteredTickets.forEach(t => {
      const s = (t.status || "").toUpperCase()
      if (s.includes("FECHAD") || s.includes("PERDID")) return
      const cpfDigits = String(t.cliente_cpf || "").replace(/\D/g, "")
      if (cpfDigits.length !== 11) return

      const opVal = getValorOperacaoDeAbertura(t).num || 0
      const dateMs = new Date(t.updated_at || t.created_at || now).getTime()
      const hoursInactive = Math.floor(Math.max(0, (now - dateMs) / (1000 * 60 * 60)))

      const arr = cpfGroups.get(cpfDigits) || []
      arr.push({
        ticket: t,
        opVal,
        hoursInactive,
        inRisk: riskIdSet.has(String(t.id))
      })
      cpfGroups.set(cpfDigits, arr)
    })

    const duplicateConflicts = Array.from(cpfGroups.entries())
      .filter(([, items]) => items.length >= 2)
      .map(([cpfDigits, items]) => {
        const sortedItems = [...items].sort((a, b) => b.opVal - a.opVal || b.hoursInactive - a.hoursInactive)
        const uniqueOperators = Array.from(
          new Set(sortedItems.map(i => (i.ticket.user_nome || "Não Atribuído").trim()))
        )
        const maxOperacao = sortedItems[0]?.opVal || 0
        const maxHoursInactive = Math.max(...sortedItems.map(i => i.hoursInactive))
        const criticalCount = sortedItems.filter(i => i.inRisk).length

        return {
          cpfDigits,
          displayCpf: sortedItems[0]?.ticket.cliente_cpf || cpfDigits,
          clientName: sortedItems[0]?.ticket.cliente_nome || "Cliente sem Nome",
          ticketCount: sortedItems.length,
          uniqueOperators,
          isMultiOperator: uniqueOperators.length >= 2,
          maxOperacao,
          maxHoursInactive,
          criticalCount,
          topTicket: sortedItems[0].ticket
        }
      })
      .sort(
        (a, b) =>
          Number(b.isMultiOperator) - Number(a.isMultiOperator) ||
          b.uniqueOperators.length - a.uniqueOperators.length ||
          b.criticalCount - a.criticalCount ||
          b.maxOperacao - a.maxOperacao
      )

    return {
      vipCount: vipRiskLeads.length,
      vipOperacao,
      vipProducao,
      topVipStage,
      topCapitalStage,
      topCapitalSharePct,
      negStage,
      warmRepresadoOperacao,
      warmRepresadoProducao,
      stuckBasePct,
      totalPropostas,
      totalNegociacoes,
      fastestOp,
      volumeLeader,
      bottleneckOps,
      bestConvenioMatches: bestConvenioMatches.slice(0, 4),
      bestHighTierMatch,
      wasteMatches: wasteMatches.slice(0, 4),
      duplicateConflicts: duplicateConflicts.slice(0, 5),
      totalDuplicateClients: duplicateConflicts.length
    }
  }, [
    isExecSummaryOpen,
    filteredTickets,
    speedToLeadData,
    stageAgingData,
    affinityMatrixData,
    riskLeadsData,
    getValorOperacaoDeAbertura
  ])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="pipeline-intelligence-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[150] overflow-hidden bg-slate-950/60 flex items-center justify-center will-change-[opacity]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isExecSummaryOpen) handleClose()
          }}
        >
          <motion.div
            key="pipeline-intelligence-panel"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full lg:w-[calc(100vw-48px)] max-w-[1720px] bg-white h-full shadow-2xl flex flex-col border-x border-slate-200 will-change-transform"
            role="dialog"
            aria-modal="true"
          >

        {/* BARRA DE FILTROS GERENCIAIS */}
        <div className="px-6 lg:px-7 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3.5 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-slate-600 font-semibold mr-1">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Filtros:</span>
            </div>

            {/* Período */}
            <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
              {(["today", "7d", "15d", "30d", "month", "all"] as PeriodFilter[]).map(p => {
                const labels: Record<PeriodFilter, string> = {
                  today: "Hoje",
                  "7d": "7 dias",
                  "15d": "15 dias",
                  "30d": "30 dias",
                  month: "Mês Atual",
                  all: "Histórico Completo"
                }
                const isSelected = period === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                      isSelected 
                        ? "bg-indigo-600 text-white shadow-xs" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    {labels[p]}
                  </button>
                )
              })}
            </div>

            {/* Convênio (Múltipla Seleção) */}
            <div className="relative" ref={convenioDropdownRef}>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === "convenio" ? null : "convenio")}
                className={cn(
                  "border rounded-lg px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs max-w-[220px]",
                  selectedConvenios.length > 0
                    ? "bg-indigo-50 border-indigo-400 text-indigo-900 font-bold"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                )}
              >
                <span className="truncate">
                  {selectedConvenios.length === 0
                    ? `Todos os Convênios (${conveniosList.length})`
                    : selectedConvenios.length === 1
                    ? selectedConvenios[0]
                    : `${selectedConvenios.length} Convênios`}
                </span>
                {selectedConvenios.length > 0 ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedConvenios([])
                    }}
                    className="w-4 h-4 rounded-full bg-indigo-200/80 hover:bg-indigo-300 text-indigo-800 flex items-center justify-center text-[10px] shrink-0"
                    title="Limpar filtro de convênios"
                  >
                    ×
                  </span>
                ) : (
                  <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform", openDropdown === "convenio" && "rotate-180")} />
                )}
              </button>

              {openDropdown === "convenio" && (
                <div className="absolute left-0 mt-1.5 w-64 max-w-[85vw] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-slate-900 text-xs">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 px-1">
                    <span className="font-bold text-[10.5px] text-slate-700 uppercase tracking-wider">Convênios</span>
                    {selectedConvenios.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedConvenios([])}
                        className="text-[10.5px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        Limpar ({selectedConvenios.length})
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedConvenios([])}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs",
                        selectedConvenios.length === 0
                          ? "bg-indigo-50 text-indigo-900 font-bold"
                          : "text-slate-700 hover:bg-slate-50 font-medium"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                          selectedConvenios.length === 0 ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"
                        )}>
                          {selectedConvenios.length === 0 && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span>Todos os Convênios</span>
                      </span>
                      <span className="text-[10px] text-slate-400">({conveniosList.length})</span>
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    {conveniosList.map(c => {
                      const isSelected = selectedConvenios.includes(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setSelectedConvenios(prev =>
                              prev.includes(c) ? prev.filter(item => item !== c) : [...prev, c]
                            )
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs",
                            isSelected
                              ? "bg-indigo-50 text-indigo-900 font-bold"
                              : "text-slate-700 hover:bg-slate-50 font-medium"
                          )}
                        >
                          <span className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                            isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"
                          )}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span className="truncate">{c}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Operador / Corretor (Múltipla Seleção) */}
            <div className="relative" ref={operatorDropdownRef}>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === "operator" ? null : "operator")}
                className={cn(
                  "border rounded-lg px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs max-w-[220px]",
                  selectedOperators.length > 0
                    ? "bg-indigo-50 border-indigo-400 text-indigo-900 font-bold"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                )}
              >
                <span className="truncate">
                  {selectedOperators.length === 0
                    ? `Toda a Equipe (${teamOperatorsList.length})`
                    : selectedOperators.length === 1
                    ? (teamOperatorsList.find(o => o.id === selectedOperators[0])?.nome || "1 Selecionado")
                    : `${selectedOperators.length} Colaboradores`}
                </span>
                {selectedOperators.length > 0 ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedOperators([])
                    }}
                    className="w-4 h-4 rounded-full bg-indigo-200/80 hover:bg-indigo-300 text-indigo-800 flex items-center justify-center text-[10px] shrink-0"
                    title="Limpar filtro de equipe"
                  >
                    ×
                  </span>
                ) : (
                  <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform", openDropdown === "operator" && "rotate-180")} />
                )}
              </button>

              {openDropdown === "operator" && (
                <div className="absolute left-0 mt-1.5 w-64 max-w-[85vw] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-slate-900 text-xs">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 px-1">
                    <span className="font-bold text-[10.5px] text-slate-700 uppercase tracking-wider">Equipe (CLT e Estágio)</span>
                    {selectedOperators.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedOperators([])}
                        className="text-[10.5px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        Limpar ({selectedOperators.length})
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedOperators([])}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs",
                        selectedOperators.length === 0
                          ? "bg-indigo-50 text-indigo-900 font-bold"
                          : "text-slate-700 hover:bg-slate-50 font-medium"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                          selectedOperators.length === 0 ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"
                        )}>
                          {selectedOperators.length === 0 && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span>Toda a Equipe</span>
                      </span>
                      <span className="text-[10px] text-slate-400">({teamOperatorsList.length})</span>
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    {teamOperatorsList.map(o => {
                      const isSelected = selectedOperators.includes(o.id)
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setSelectedOperators(prev =>
                              prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id]
                            )
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs",
                            isSelected
                              ? "bg-indigo-50 text-indigo-900 font-bold"
                              : "text-slate-700 hover:bg-slate-50 font-medium"
                          )}
                        >
                          <span className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                            isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"
                          )}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span className="truncate">{o.nome}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs text-slate-500 font-medium">
              <span className="font-bold text-slate-900">{filteredTickets.length}</span> atendimentos analisados
            </div>
            <motion.button
              type="button"
              onClick={() => setIsExecSummaryOpen(true)}
              animate={{
                scale: [1, 1.05, 1],
                boxShadow: [
                  "0 1px 2px 0 rgba(15, 23, 42, 0.15)",
                  "0 0 0 4px rgba(99, 102, 241, 0.30)",
                  "0 1px 2px 0 rgba(15, 23, 42, 0.15)"
                ]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Resumo Executivo</span>
            </motion.button>
          </div>
        </div>

        {/* CARDS RESUMO EXECUTIVO (KPIs) */}
        <div className="px-6 lg:px-7 py-2.5 grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border-b border-slate-200 shrink-0">
          {/* Card 1: TEMPO MÉDIO */}
          <div className="bg-gradient-to-br from-sky-100 via-sky-50 to-blue-100/90 border-2 border-sky-400 rounded-xl px-3 py-2 flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-1.5 text-sky-900">
              <Zap className="w-3.5 h-3.5 text-sky-600 shrink-0" strokeWidth={2.6} />
              <span className="text-[10px] font-black uppercase tracking-wider">TEMPO MÉDIO</span>
            </div>
            <div className="mt-0.5">
              <div className="text-base lg:text-lg font-black text-sky-950 leading-tight">
                {speedToLeadData.generalAvgMinutes > 0 ? (
                  speedToLeadData.generalAvgMinutes < 60 ? (
                    `${speedToLeadData.generalAvgMinutes} min`
                  ) : (
                    `${(speedToLeadData.generalAvgMinutes / 60).toFixed(1)} horas`
                  )
                ) : (
                  "N/A"
                )}
              </div>
              <span className="text-[10px] text-sky-900 font-bold leading-tight block mt-0.5">Em negociação ➔ Gerada a ADE</span>
            </div>
          </div>

          {/* Card 2: Capital no Pipeline */}
          <div className="bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100/90 border-2 border-emerald-400 rounded-xl px-3 py-2 flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-1.5 text-emerald-900">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2.6} />
              <span className="text-[10px] font-black uppercase tracking-wider">Capital no Pipeline</span>
            </div>
            <div className="mt-0.5">
              <div className="text-base lg:text-lg font-black text-emerald-950 leading-tight">
                {fmtCurrency(stageAgingData.grandTotalCapital)}
              </div>
              <span className="text-[10px] text-emerald-900 font-bold leading-tight block mt-0.5">
                Prod. Estimada: {fmtCurrency(stageAgingData.grandTotalProducao)}
              </span>
            </div>
          </div>

          {/* Card 3: GARGALOS (> 48h) */}
          <div className="bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100/90 border-2 border-amber-400 rounded-xl px-3 py-2 flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-1.5 text-amber-900">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={2.6} />
              <span className="text-[10px] font-black tracking-wider">GARGALOS (&gt; 48h)</span>
            </div>
            <div className="mt-0.5">
              <div className="text-base lg:text-lg font-black text-amber-950 leading-tight">
                {stageAgingData.grandTotalStuck48hCount} leads
              </div>
              <span className="text-[10px] text-amber-900 font-bold leading-tight block mt-0.5">Sem avanço na cadência</span>
            </div>
          </div>

          {/* Card 4: Risco de Queima */}
          <div className="bg-gradient-to-br from-rose-100 via-rose-50 to-red-100/90 border-2 border-rose-400 rounded-xl px-3 py-2 flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-1.5 text-rose-900">
              <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" strokeWidth={2.6} />
              <span className="text-[10px] font-black uppercase tracking-wider">Risco de Queima</span>
            </div>
            <div className="mt-0.5">
              <div className="text-base lg:text-lg font-black text-rose-950 leading-tight">
                {riskLeadsData.length} leads
              </div>
              <span className="text-[10px] text-rose-900 font-bold leading-tight block mt-0.5">Parados há mais de 48h</span>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS */}
        <div className="px-6 lg:px-7 bg-white border-b border-slate-200 flex items-center gap-7 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("speed")}
            className={cn(
              "relative group/tooltip py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
              activeTab === "speed"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <Zap className="w-4 h-4" />
            <span>1. Tempo Médio (Em negociação ➔ Gerada a ADE)</span>
            <span
              role="tooltip"
              className="pointer-events-none opacity-0 group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-1.5 z-50 w-72 rounded-lg bg-slate-900 text-white text-[11px] font-medium text-left leading-relaxed px-3 py-2 shadow-xl border border-slate-700"
            >
              Mede quantos minutos o corretor leva entre a negociação com o lead e digitação da proposta no banco (gerar a ADE).
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("aging")}
            className={cn(
              "relative group/tooltip py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
              activeTab === "aging"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <Clock className="w-4 h-4" />
            <span>2. Capital Imobilizado por Etapa</span>
            <span
              role="tooltip"
              className="pointer-events-none opacity-0 group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-1.5 z-50 w-80 rounded-lg bg-slate-900 text-white text-[11px] font-medium text-left leading-relaxed px-3 py-2 shadow-xl border border-slate-700"
            >
              Mostra o volume financeiro (Valor Operação e Produção Estimada) e o tempo médio de permanência retidos em cada etapa do pipeline, com quebra por faixa de ticket (Alto, Médio e Baixo) e destaque para gargalos acima de 48h.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("affinity")}
            className={cn(
              "relative group/tooltip py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
              activeTab === "affinity"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <Award className="w-4 h-4" />
            <span>3. Matriz de Afinidade</span>
            <span
              role="tooltip"
              className="pointer-events-none opacity-0 group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-1.5 z-50 w-80 rounded-lg bg-slate-900 text-white text-[11px] font-medium text-left leading-relaxed px-3 py-2 shadow-xl border border-slate-700"
            >
              Identifica a aptidão de cada corretor com perfis de clientes específicos. Ao rotear leads de determinados convênios ou faixas de valores financeiros para os operadores com maior taxa de conversão demonstrada, maximiza-se a receita da empresa sem aumentar o custo de aquisição.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("risk")}
            className={cn(
              "relative group/tooltip py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
              activeTab === "risk"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <Flame className="w-4 h-4 text-rose-500" />
            <span>4. Radar de Risco de Queima</span>
            {riskLeadsData.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-bold">
                {riskLeadsData.length}
              </span>
            )}
            <span
              role="tooltip"
              className="pointer-events-none opacity-0 group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100 transition-opacity duration-150 absolute right-0 sm:left-0 sm:right-auto top-full mt-1.5 z-50 w-80 rounded-lg bg-slate-900 text-white text-[11px] font-medium text-left leading-relaxed px-3 py-2 shadow-xl border border-slate-700"
            >
              Lista em tempo real os leads parados há mais de 48 horas nas etapas ativas, ordenados por criticidade de ticket e tempo sem contato, permitindo priorizar o resgate de oportunidades antes da perda.
            </span>
          </button>
        </div>

        {/* ÁREA DE CONTEÚDO PRINCIPAL (COM SCROLL) */}
        <div className={cn(
          "flex-1 min-h-0 bg-slate-50/50",
          activeTab === "risk"
            ? "overflow-hidden flex flex-col"
            : cn("overflow-y-auto p-6 lg:p-7", (activeTab === "affinity" || activeTab === "speed") && "flex flex-col")
        )}>
          {/* ============================================================== */}
          {/* ABA 1: TEMPO MÉDIO (EM NEGOCIAÇÃO -> GERADA A ADE)              */}
          {/* ============================================================== */}
          {activeTab === "speed" && (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Tabela de Ranking por Corretor */}
              <div className="flex-1 min-h-[260px] flex flex-col bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/95 flex items-center justify-between shrink-0">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Ranking de Velocidade Comercial por Corretor / Estagiário
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {speedToLeadData.ranking.length} operadores avaliados
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full border-separate border-spacing-0 text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-4 py-2.5 bg-slate-100 border-b border-r border-slate-200">Posição &amp; Operador</th>
                        <th className="px-4 py-2.5 text-center bg-slate-100 border-b border-r border-slate-200">Em Negociação</th>
                        <th className="px-4 py-2.5 text-center bg-slate-100 border-b border-r border-slate-200">Proposta Digitada</th>
                        <th className="px-4 py-2.5 text-center bg-slate-100 border-b border-r border-slate-200">Taxa de Avanço</th>
                        <th className="px-4 py-2.5 text-center bg-slate-100 border-b border-r border-slate-200">Tempo Médio</th>
                        <th className="px-4 py-2.5 text-right bg-slate-100 border-b border-slate-200">Classificação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {speedToLeadData.ranking.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            Nenhum histórico de movimentação encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        speedToLeadData.ranking.map((op, idx) => {
                          const convRate = op.totalNegociacoes > 0
                            ? Math.min(100, Math.round((op.totalPropostasDigitadas / op.totalNegociacoes) * 100))
                            : 0
                          
                          // Badge de classificação
                          let badgeBg = "bg-slate-100 text-slate-700"
                          let badgeText = "Sem Amostra"

                          if (op.sampleCount > 0) {
                            if (op.avgMinutesToAde <= 30) {
                              badgeBg = "bg-emerald-100 text-emerald-800 border-emerald-200"
                              badgeText = "⚡ Ultra Rápido (<30m)"
                            } else if (op.avgMinutesToAde <= 120) {
                              badgeBg = "bg-sky-100 text-sky-800 border-sky-200"
                              badgeText = "🟢 Ágil (30m - 2h)"
                            } else if (op.avgMinutesToAde <= 480) {
                              badgeBg = "bg-amber-100 text-amber-800 border-amber-200"
                              badgeText = "🟡 Moderado (2h - 8h)"
                            } else {
                              badgeBg = "bg-rose-100 text-rose-800 border-rose-200"
                              badgeText = "🔴 Lento (>8h)"
                            }
                          }

                          return (
                            <tr key={op.userId} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3 border-b border-r border-slate-200">
                                <div className="flex items-center gap-2.5">
                                  <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                    idx === 0 ? "bg-amber-100 text-amber-800 font-black" :
                                    idx === 1 ? "bg-slate-200 text-slate-700 font-bold" :
                                    idx === 2 ? "bg-amber-700/20 text-amber-900 font-bold" :
                                    "bg-slate-100 text-slate-500"
                                  )}>
                                    {idx + 1}º
                                  </span>
                                  <div>
                                    <div className="font-bold text-slate-900">{op.userName}</div>
                                    <div className="text-[10px] text-slate-400">ID: {op.userId.slice(0, 8)}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-slate-700 border-b border-r border-slate-200">
                                {op.totalNegociacoes}
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-slate-700 border-b border-r border-slate-200">
                                {op.totalPropostasDigitadas}
                              </td>
                              <td className="px-4 py-3 text-center border-b border-r border-slate-200">
                                <span className={cn(
                                  "font-bold",
                                  convRate >= 50 ? "text-emerald-600" : convRate >= 25 ? "text-indigo-600" : "text-slate-500"
                                )}>
                                  {convRate}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center border-b border-r border-slate-200">
                                {op.sampleCount > 0 ? (
                                  <span className="font-black text-slate-900">
                                    {op.avgMinutesToAde < 60 
                                      ? `${op.avgMinutesToAde} min` 
                                      : `${(op.avgMinutesToAde / 60).toFixed(1)} h`}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Sem transição direta</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right border-b border-slate-200">
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", badgeBg)}>
                                  {badgeText}
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 2: CAPITAL IMOBILIZADO POR ETAPA                           */}
          {/* ============================================================== */}
          {activeTab === "aging" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
                {stageAgingData.stages.map(st => (
                  <div key={st.key} className="bg-white border border-slate-200 rounded-xl p-4 lg:p-5 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{st.label}</span>
                        <span className="text-[11px] bg-transparent text-slate-600 font-bold">
                          {st.count} leads
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="text-[11px] text-slate-500 font-medium">Tempo Médio de Permanência:</div>
                        <div className="text-lg font-black text-slate-900">
                          {st.avgHours < 24 ? `${st.avgHours} horas` : `${st.avgDays} dias`}
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                        <div className="text-[11px] text-slate-500 font-medium">Capital Imobilizado:</div>
                        <div className="text-base font-black text-emerald-700">
                          {fmtCurrency(st.totalOperacao)}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-2">Produção Estimada:</div>
                        <div className="text-base font-black text-sky-400">
                          {fmtCurrency(st.totalProducao)}
                        </div>
                      </div>
                    </div>

                    {/* Quebra por ticket */}
                    <div className="mt-3 pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-orange-700">
                        <span>Alto (&gt;30k):</span>
                        <span className="font-bold text-orange-700">{st.ticketsByTier.high.count} ({fmtCurrency(st.ticketsByTier.high.val)})</span>
                      </div>
                      <div className="flex items-center justify-between text-orange-500">
                        <span>Médio (10k-30k):</span>
                        <span className="font-bold text-orange-500">{st.ticketsByTier.mid.count} ({fmtCurrency(st.ticketsByTier.mid.val)})</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Baixo (&lt;10k):</span>
                        <span className="font-bold text-slate-800">{st.ticketsByTier.low.count} ({fmtCurrency(st.ticketsByTier.low.val)})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Destaque de Capital Parado > 48h */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">
                      Gargalo de Lead parado a mais de 48 Horas sem Avanço
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Existe um total de <strong>{stageAgingData.grandTotalStuck48hCount} leads</strong> parados há mais de 48 horas nas colunas ativas. Isso representa capital comercial dormente sem retorno de contato.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("risk")}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
                >
                  Auditar Leads no Radar de Risco
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 3: MATRIZ DE AFINIDADE (CORRETOR X CONVÊNIO)               */}
          {/* ============================================================== */}
          {activeTab === "affinity" && (
            <div className="flex-1 min-h-0 flex flex-col">
              {(() => {
                const activeColumns = affinityMode === "convenio"
                  ? affinityMatrixData.topConvenios
                  : affinityMatrixData.valueTiers

                const handleModeChange = (mode: "convenio" | "valor") => {
                  setAffinityMode(mode)
                  if (affinityBodyScrollRef.current) {
                    affinityBodyScrollRef.current.scrollLeft = 0
                    affinityBodyScrollRef.current.scrollTop = 0
                  }
                }

                return (
                  <div className="flex-1 min-h-[260px] flex flex-col bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50/95 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                          Matriz Cruzada
                        </h3>
                        <div className="inline-flex items-center rounded-lg bg-slate-200/70 p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleModeChange("convenio")}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                              affinityMode === "convenio"
                                ? "bg-white text-indigo-700 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            Por Convênio
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModeChange("valor")}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                              affinityMode === "valor"
                                ? "bg-white text-indigo-700 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            Por Valor Financeiro
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="flex items-center gap-1 text-emerald-700 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ponto Forte (Alta Conv.)
                        </span>
                        <span className="flex items-center gap-1 text-rose-700 font-bold">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span> Gargalo (Baixa Conv.)
                        </span>
                      </div>
                    </div>

                    <div
                      ref={affinityBodyScrollRef}
                      className="flex-1 min-h-0 overflow-auto"
                    >
                      <table className="w-full min-w-[700px] table-fixed border-separate border-spacing-0 text-left text-xs">
                        <colgroup>
                          <col className="w-[210px]" />
                          <col />
                          <col className="w-[260px] lg:w-[290px]" />
                        </colgroup>
                        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                          <tr>
                            <th className="px-4 py-2.5 whitespace-nowrap bg-slate-100 border-b border-r border-slate-200">
                              Corretor / Operador
                            </th>
                            <th className="px-4 py-2.5 whitespace-nowrap bg-slate-100 border-b border-r border-slate-200">
                              {affinityMode === "convenio"
                                ? "Performance por Convênio (Kanban ➔ ADE)"
                                : "Performance por Valor Financeiro (Kanban ➔ ADE)"}
                            </th>
                            <th className="px-4 py-2.5 text-left whitespace-nowrap bg-slate-100 border-b border-slate-200">
                              Insight Gerencial
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {affinityMatrixData.rows.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                                Dados insuficientes para cruzar afinidade no período.
                              </td>
                            </tr>
                          ) : (
                            affinityMatrixData.rows.map(row => {
                              const bestInsight = affinityMode === "convenio" ? row.bestConvenio : row.bestTier
                              const worstInsight = affinityMode === "convenio" ? row.worstConvenio : row.worstTier

                              const barItems = activeColumns
                                .map(col => ({
                                  col,
                                  cell: affinityMode === "convenio" ? row.byConvenio[col] : row.byTier[col]
                                }))
                                .filter((item): item is { col: string; cell: NonNullable<typeof item.cell> } =>
                                  Boolean(item.cell && item.cell.total > 0)
                                )

                              if (affinityMode === "convenio") {
                                barItems.sort((a, b) => {
                                  if (b.cell.rate !== a.cell.rate) return b.cell.rate - a.cell.rate
                                  if (b.cell.converted !== a.cell.converted) return b.cell.converted - a.cell.converted
                                  if (b.cell.total !== a.cell.total) return b.cell.total - a.cell.total
                                  return a.col.localeCompare(b.col, "pt-BR")
                                })
                              }

                              return (
                                <tr key={row.userId} className="hover:bg-slate-50/80 transition-colors align-top">
                                  <td className="px-4 py-3 font-bold text-slate-900 border-b border-r border-slate-200">
                                    <div>{row.userName}</div>
                                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                      {row.totalTickets} leads em negociação
                                    </div>
                                    <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                                      Conversão geral: {row.overallRate}% ({row.totalConverted}/{row.totalTickets})
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 border-b border-r border-slate-200">
                                    {barItems.length === 0 ? (
                                      <span className="text-slate-400 italic text-[11px]">
                                        Sem movimentações no Kanban para exibir.
                                      </span>
                                    ) : (
                                      <div className="space-y-2">
                                        {barItems.map(({ col, cell }) => {
                                          const isStrong = cell.strength === "forte"
                                          const isWeak = cell.strength === "fraco"

                                          return (
                                            <div key={col} className="flex items-center gap-2.5">
                                              <span
                                                title={col}
                                                className="w-36 sm:w-44 shrink-0 truncate text-[11px] font-semibold text-slate-700"
                                              >
                                                {col}
                                              </span>
                                              <div
                                                className={cn(
                                                  "flex-1 h-4 rounded-md border overflow-hidden relative flex items-center",
                                                  isStrong
                                                    ? "bg-emerald-50/70 border-emerald-200"
                                                    : isWeak
                                                    ? "bg-rose-50/70 border-rose-200"
                                                    : "bg-slate-100 border-slate-200"
                                                )}
                                              >
                                                <div
                                                  className={cn(
                                                    "h-full rounded-l-md transition-all duration-300",
                                                    isStrong
                                                      ? "bg-emerald-500"
                                                      : isWeak
                                                      ? "bg-rose-500"
                                                      : "bg-slate-400"
                                                  )}
                                                  style={{
                                                    width: `${cell.rate > 0 ? Math.max(cell.rate, 4) : 0}%`
                                                  }}
                                                />
                                              </div>
                                              <div className="w-20 shrink-0 text-right tabular-nums whitespace-nowrap">
                                                <span
                                                  className={cn(
                                                    "text-[11px] font-bold",
                                                    isStrong
                                                      ? "text-emerald-700"
                                                      : isWeak
                                                      ? "text-rose-700"
                                                      : "text-slate-700"
                                                  )}
                                                >
                                                  {cell.rate}%
                                                </span>
                                                <span className="text-[10px] text-slate-500 ml-1">
                                                  ({cell.converted}/{cell.total})
                                                </span>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-[11px] border-b border-slate-200">
                                    {bestInsight && (
                                      <div className="text-emerald-700 font-medium">
                                        ★ Especialista em {bestInsight}
                                      </div>
                                    )}
                                    {worstInsight && (
                                      <div className="text-rose-600 font-medium mt-1">
                                        ⚠ Baixo fechamento em {worstInsight}
                                      </div>
                                    )}
                                    {!bestInsight && !worstInsight && (
                                      <span className="text-slate-400 italic">Desempenho homogêneo</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 4: RADAR DE RISCO DE QUEIMA                                */}
          {/* ============================================================== */}
          {activeTab === "risk" && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="shrink-0 relative z-20 px-6 lg:px-7 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRiskTierFilter(prev => prev === "high" ? "all" : "high")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                        riskTierFilter === "high"
                          ? "bg-orange-700 text-white border-orange-700 shadow-xs"
                          : "bg-white text-orange-700 border-orange-200 hover:bg-orange-50"
                      )}
                    >
                      Alto &gt;30k ({riskTierCounts.high} {riskTierCounts.high === 1 ? "lead" : "leads"})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRiskTierFilter(prev => prev === "mid" ? "all" : "mid")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                        riskTierFilter === "mid"
                          ? "bg-orange-500 text-white border-orange-500 shadow-xs"
                          : "bg-white text-orange-500 border-orange-200 hover:bg-orange-50"
                      )}
                    >
                      Médio 10k-30k ({riskTierCounts.mid} {riskTierCounts.mid === 1 ? "lead" : "leads"})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRiskTierFilter(prev => prev === "low" ? "all" : "low")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                        riskTierFilter === "low"
                          ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      Baixo &lt;10k ({riskTierCounts.low} {riskTierCounts.low === 1 ? "lead" : "leads"})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-60">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchRiskQuery}
                      onChange={(e) => setSearchRiskQuery(e.target.value)}
                      placeholder="Filtrar por cliente, CPF ou corretor..."
                      className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-[11px] focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Etapas (Múltipla Seleção) */}
                  <div className="relative w-full sm:w-auto" ref={stageDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(prev => prev === "stage" ? null : "stage")}
                      className={cn(
                        "w-full sm:w-auto border rounded-lg px-2.5 py-1 text-[11px] font-medium flex items-center justify-between gap-1.5 cursor-pointer transition-colors max-w-full sm:max-w-[220px]",
                        effectiveRiskStageFilters.length > 0
                          ? "bg-rose-50 border-rose-300 text-rose-900 font-bold"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span className="truncate">
                        {effectiveRiskStageFilters.length === 0
                          ? `Todas as Etapas (${riskStageOptions.length})`
                          : effectiveRiskStageFilters.length === 1
                          ? (riskStageOptions.find(opt => opt.value === effectiveRiskStageFilters[0])?.label || "1 Etapa")
                          : `${effectiveRiskStageFilters.length} Etapas`}
                      </span>
                      {effectiveRiskStageFilters.length > 0 ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            setRiskStageFilters([])
                          }}
                          className="w-4 h-4 rounded-full bg-rose-200/80 hover:bg-rose-300 text-rose-800 flex items-center justify-center text-[10px] shrink-0"
                          title="Limpar filtro de etapas"
                        >
                          ×
                        </span>
                      ) : (
                        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform", openDropdown === "stage" && "rotate-180")} />
                      )}
                    </button>

                    {openDropdown === "stage" && (
                      <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-64 max-w-[85vw] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-slate-900 text-xs">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 px-1">
                          <span className="font-bold text-[10.5px] text-slate-700 uppercase tracking-wider">Etapas em Risco</span>
                          {effectiveRiskStageFilters.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setRiskStageFilters([])}
                              className="text-[10.5px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                            >
                              Limpar ({effectiveRiskStageFilters.length})
                            </button>
                          )}
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
                          <button
                            type="button"
                            onClick={() => setRiskStageFilters([])}
                            className={cn(
                              "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs",
                              effectiveRiskStageFilters.length === 0
                                ? "bg-rose-50 text-rose-900 font-bold"
                                : "text-slate-700 hover:bg-slate-50 font-medium"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <span className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                                effectiveRiskStageFilters.length === 0 ? "border-rose-600 bg-rose-600 text-white" : "border-slate-300 bg-white"
                              )}>
                                {effectiveRiskStageFilters.length === 0 && <Check className="w-3 h-3 stroke-[3]" />}
                              </span>
                              <span>Todas as Etapas</span>
                            </span>
                            <span className="text-[10px] text-slate-400">({riskStageOptions.length})</span>
                          </button>
                          <div className="my-1 border-t border-slate-100" />
                          {riskStageOptions.map(opt => {
                            const isSelected = effectiveRiskStageFilters.includes(opt.value)
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setRiskStageFilters(prev =>
                                    prev.includes(opt.value) ? prev.filter(item => item !== opt.value) : [...prev, opt.value]
                                  )
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs",
                                  isSelected
                                    ? "bg-rose-50 text-rose-900 font-bold"
                                    : "text-slate-700 hover:bg-slate-50 font-medium"
                                )}
                              >
                                <span className="flex items-center gap-2 truncate pr-2">
                                  <span className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                                    isSelected ? "border-rose-600 bg-rose-600 text-white" : "border-slate-300 bg-white"
                                  )}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </span>
                                  <span className="truncate">{opt.label}</span>
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0">({opt.count})</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 lg:px-7 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
                {filteredRiskLeads.length === 0 ? (
                  <div className="col-span-full bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    Parabéns! Nenhum lead está inativo acima do limite de tolerância comercial para os filtros selecionados.
                  </div>
                ) : (
                  filteredRiskLeads.map(item => {
                    const t = item.ticket
                    return (
                      <div 
                        key={t.id} 
                        className={cn(
                          "bg-white border rounded-xl p-4 lg:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between",
                          item.isHighRisk ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200"
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{t.cliente_nome || "Cliente sem Nome"}</div>
                              <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                {t.cliente_cpf ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyField(`cpf-${t.id}`, t.cliente_cpf)}
                                    title="Clique para copiar o CPF"
                                    className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
                                  >
                                    <span>CPF: {t.cliente_cpf}</span>
                                    {copiedFieldKey === `cpf-${t.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-slate-400" />
                                    )}
                                  </button>
                                ) : (
                                  <span>CPF: ---</span>
                                )}
                                <span>•</span>
                                {t.cliente_telefone ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyField(`tel-${t.id}`, t.cliente_telefone)}
                                    title="Clique para copiar o Telefone"
                                    className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
                                  >
                                    <span>Tel: {t.cliente_telefone}</span>
                                    {copiedFieldKey === `tel-${t.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-slate-400" />
                                    )}
                                  </button>
                                ) : (
                                  <span>Tel: ---</span>
                                )}
                              </div>
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
                              item.isHighRisk ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                            )}>
                              {item.isHighRisk ? "Risco Crítico" : "Atenção"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Valor da Operação:</span>
                              <span className="font-black text-emerald-700 text-sm block">
                                {fmtCurrency(item.valorOperacao)}
                              </span>
                              <span className="text-slate-400 block text-[10px] mt-1.5">Produção Estimada:</span>
                              <span className="font-black text-sky-400 text-sm block">
                                {fmtCurrency(item.valorProducao)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Convênio / Órgão:</span>
                              <span className="font-bold text-slate-700">
                                {t.convenio || "Não informado"}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Corretor Responsável:</span>
                              <span className="text-[13px] font-semibold text-slate-800 truncate block">
                                {t.user_nome || "Não Atribuído"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Tempo sem Contato:</span>
                              <span className="font-black text-rose-600 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                {(() => {
                                  const days = Math.floor(item.hoursInactive / 24)
                                  const remHours = item.hoursInactive % 24
                                  if (days <= 0) return `${item.hoursInactive} ${item.hoursInactive === 1 ? "hora" : "horas"}`
                                  const daysPart = `${days} ${days === 1 ? "dia" : "dias"}`
                                  const hoursPart = remHours > 0 ? ` e ${remHours} ${remHours === 1 ? "hora" : "horas"}` : ""
                                  return `${daysPart}${hoursPart}`
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-medium">
                            Etapa Atual: <strong className="text-slate-900">{t.status}</strong>
                          </span>

                          {onSelectTicket && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectTicket(t)
                              }}
                              className="px-3 py-1 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>Ver atendimento</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="px-6 lg:px-7 py-3.5 border-t border-slate-200 bg-white flex items-center justify-start text-xs shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors cursor-pointer shadow-xs text-xs"
          >
            Fechar
          </button>
        </div>
          </motion.div>

        {/* MODAL RESUMO EXECUTIVO — CENTRAL DE DIAGNÓSTICO ACIONÁVEL */}
        <AnimatePresence>
          {isExecSummaryOpen && executiveSummaryData && (
            <motion.div
              key="exec-summary-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-30 bg-slate-950/65 flex items-center justify-center p-4 sm:p-6 lg:p-8"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsExecSummaryOpen(false)
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 10 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-6xl xl:max-w-[1260px] max-h-full bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Resumo Executivo do Pipeline"
              >
                {/* Cabeçalho */}
                <div className="px-7 py-4 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                        Resumo Executivo
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Base filtrada: <strong className="text-white">{filteredTickets.length} atendimentos</strong> • Pipeline ativo (Valor Operação): <strong className="text-emerald-300">{fmtCurrency(stageAgingData.grandTotalCapital)}</strong> e Produção Estimada de: <strong className="text-[#05BDFF]">{fmtCurrency(stageAgingData.grandTotalProducao)}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsExecSummaryOpen(false)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Fechar Resumo Executivo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Pulso Rápido */}
                <div className="px-7 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                  <div className="bg-white rounded-xl border border-orange-200 p-3.5">
                    <div className="text-[10px] font-bold uppercase text-orange-700">VIPs (&gt;30k) em Risco</div>
                    <div className="text-lg font-black text-slate-900 mt-1">{executiveSummaryData.vipCount} leads</div>
                    <div className="text-xs font-semibold text-sky-600 mt-0.5">
                      Prod. Est.: {fmtCurrency(executiveSummaryData.vipProducao)}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-amber-200 p-3.5">
                    <div className="text-[10px] font-bold uppercase text-amber-700">Estagnados (&gt;48h)</div>
                    <div className="text-lg font-black text-slate-900 mt-1">
                      {stageAgingData.grandTotalStuck48hCount} ({executiveSummaryData.stuckBasePct}%)
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">da base analisada</div>
                  </div>
                  <div className="bg-white rounded-xl border border-sky-200 p-3.5">
                    <div className="text-[10px] font-bold uppercase text-sky-700">Tempo Médio ➔ ADE</div>
                    <div className="text-lg font-black text-slate-900 mt-1">
                      {fmtDurationShort(speedToLeadData.generalAvgMinutes)}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {executiveSummaryData.totalPropostas} propostas / {executiveSummaryData.totalNegociacoes} neg.
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-rose-200 p-3.5">
                    <div className="text-[10px] font-bold uppercase text-rose-700">CPFs Duplicados</div>
                    <div className="text-lg font-black text-slate-900 mt-1">
                      {executiveSummaryData.totalDuplicateClients} clientes
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">com múltiplos cards ativos</div>
                  </div>
                </div>

                {/* Corpo Diagnóstico (3 Blocos Acionáveis cobrindo os 5 eixos) */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-5 bg-slate-50/60">
                  {/* BLOCO 1: Oportunidade Ouro & Potencial Represado (Eixos 1 e 5) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                          <Flame className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wide text-slate-900">
                            1. Oportunidade Ouro &amp; Potencial dentro de Casa
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Onde está o dinheiro mais rápido de recuperar agora</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("risk")
                            setRiskTierFilter("high")
                            setRiskStageFilters([])
                            setSearchRiskQuery("")
                            setIsExecSummaryOpen(false)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <span>Resgatar VIPs no Radar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("aging")
                            setIsExecSummaryOpen(false)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          Ver Etapas
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-orange-50/70 border border-orange-200 rounded-lg p-4 space-y-1.5">
                        <div className="text-[10px] font-black uppercase text-orange-800">
                          Alerta Prioritário (&gt; 30k parados há +48h)
                        </div>
                        {executiveSummaryData.vipCount > 0 ? (
                          <p className="text-slate-700 leading-relaxed">
                            Existem <strong className="text-slate-900">{executiveSummaryData.vipCount} leads VIP</strong> esfriando, somando{" "}
                            <strong className="text-emerald-700">{fmtCurrency(executiveSummaryData.vipOperacao)}</strong> em operação (
                            <strong className="text-sky-600">{fmtCurrency(executiveSummaryData.vipProducao)}</strong> em produção estimada).
                            {executiveSummaryData.topVipStage && (
                              <>
                                {" "}Maior concentração na etapa <strong>{executiveSummaryData.topVipStage.label}</strong> ({executiveSummaryData.topVipStage.count} leads • {fmtCurrency(executiveSummaryData.topVipStage.operacao)}).
                              </>
                            )}
                          </p>
                        ) : (
                          <p className="text-slate-600">Nenhum lead VIP (&gt;30k) parado há mais de 48h nos filtros atuais.</p>
                        )}
                      </div>

                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-4 space-y-1.5">
                        <div className="text-[10px] font-black uppercase text-emerald-800">
                          Previsibilidade &amp; Capital Engatilhado
                        </div>
                        <p className="text-slate-700 leading-relaxed">
                          {executiveSummaryData.topCapitalStage ? (
                            <>
                              A etapa <strong>{executiveSummaryData.topCapitalStage.label}</strong> concentra{" "}
                              <strong>{executiveSummaryData.topCapitalSharePct}%</strong> do capital ({fmtCurrency(executiveSummaryData.topCapitalStage.totalOperacao)}).{" "}
                            </>
                          ) : null}
                          Somando Reativação e Retomada, há{" "}
                          <strong className="text-emerald-700">{fmtCurrency(executiveSummaryData.warmRepresadoOperacao)}</strong> já dentro de casa (
                          <strong className="text-sky-600">{fmtCurrency(executiveSummaryData.warmRepresadoProducao)}</strong> em prod. est.), contra{" "}
                          <strong>{executiveSummaryData.negStage?.count || 0} leads</strong> ({fmtCurrency(executiveSummaryData.negStage?.totalOperacao || 0)}) atualmente Em Negociação.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 2: Eficiência da Equipe & Gargalos de SLA (Eixo 3) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wide text-slate-900">
                            2. Eficiência da Equipe &amp; Gargalos de SLA
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Velocidade entre Em Negociação e digitação da proposta (ADE)</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("speed")
                          setIsExecSummaryOpen(false)
                        }}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <span>Ver Ranking de Velocidade</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-sky-50/70 border border-sky-200 rounded-lg p-4 space-y-2">
                        <div className="text-[10px] font-black uppercase text-sky-800">Destaques de Conversão &amp; Agilidade</div>
                        <ul className="space-y-1.5 text-slate-700 leading-relaxed">
                          <li>
                            • Tempo médio geral da equipe: <strong className="text-slate-900">{fmtDurationShort(speedToLeadData.generalAvgMinutes)}</strong>.
                          </li>
                          {executiveSummaryData.volumeLeader && (
                            <li>
                              • Líder em ADEs geradas: <strong>{executiveSummaryData.volumeLeader.userName}</strong> ({executiveSummaryData.volumeLeader.totalPropostasDigitadas} propostas •{" "}
                              {executiveSummaryData.volumeLeader.totalNegociacoes > 0
                                ? Math.min(100, Math.round((executiveSummaryData.volumeLeader.totalPropostasDigitadas / executiveSummaryData.volumeLeader.totalNegociacoes) * 100))
                                : 0}% de avanço).
                            </li>
                          )}
                          {executiveSummaryData.fastestOp && (
                            <li>
                              • Maior agilidade: <strong>{executiveSummaryData.fastestOp.userName}</strong> em{" "}
                              <strong className="text-emerald-700">{fmtDurationShort(executiveSummaryData.fastestOp.avgMinutesToAde)}</strong>.
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="bg-rose-50/60 border border-rose-200 rounded-lg p-4 space-y-2">
                        <div className="text-[10px] font-black uppercase text-rose-800">
                          Suporte / Redistribuição Recomendada
                        </div>
                        {executiveSummaryData.bottleneckOps.length > 0 ? (
                          <ul className="space-y-1.5 text-slate-700 leading-relaxed">
                            {executiveSummaryData.bottleneckOps.map(op => (
                              <li key={op.userId}>
                                • <strong>{op.userName}</strong>: SLA {fmtDurationShort(op.avgMinutesToAde)} • {op.convRate}% avanço
                                {op.stuck48hCount > 0 ? ` (${op.stuck48hCount} parados >48h)` : ""}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-slate-600">Nenhum operador com SLA crítico (&gt;24h) ou conversão abaixo de 15% neste recorte.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 3: Roteamento Inteligente & Higienização de CPFs (Eixos 2 e 4) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wide text-slate-900">
                            3. Sugestões de Roteamento &amp; Conflitos de Atendimento
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Onde aumentar conversão sem custo extra e eliminar duplicidades</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("affinity")
                          setIsExecSummaryOpen(false)
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <span>Abrir Matriz Cruzada</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Roteamento por Afinidade */}
                      <div className="bg-indigo-50/60 border border-indigo-200 rounded-lg p-4 space-y-2.5">
                        <div className="text-[10px] font-black uppercase text-indigo-900">
                          Ajuste de Roleta por Convênio &amp; Ticket
                        </div>
                        {executiveSummaryData.bestConvenioMatches.length > 0 ? (
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-bold text-emerald-700">Direcionar leads para:</div>
                            {executiveSummaryData.bestConvenioMatches.map(m => (
                              <div key={`${m.convenio}-${m.userName}`} className="text-slate-700 flex items-center justify-between gap-3">
                                <span className="truncate">
                                  <strong>{m.userName}</strong> ➔ {m.convenio}
                                </span>
                                <span className="shrink-0 font-bold text-emerald-700">
                                  {m.rate}% ({m.converted}/{m.total})
                                </span>
                              </div>
                            ))}
                            {executiveSummaryData.bestHighTierMatch && (
                              <div className="text-slate-700 flex items-center justify-between gap-3 pt-1.5 border-t border-indigo-200/70">
                                <span className="truncate">
                                  <strong>{executiveSummaryData.bestHighTierMatch.userName}</strong> ➔ Ticket Alto (&gt;30k)
                                </span>
                                <span className="shrink-0 font-bold text-indigo-700">
                                  {executiveSummaryData.bestHighTierMatch.rate}% ({executiveSummaryData.bestHighTierMatch.converted}/{executiveSummaryData.bestHighTierMatch.total})
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-600">Amostra insuficiente de negociações para recomendar matches por convênio.</p>
                        )}

                        {executiveSummaryData.wasteMatches.length > 0 && (
                          <div className="pt-2.5 border-t border-indigo-200/70 space-y-1.5">
                            <div className="text-[11px] font-bold text-rose-700">Evitar envio (conversão zerada/baixa):</div>
                            {executiveSummaryData.wasteMatches.map(w => (
                              <div key={`${w.userName}-${w.convenio}`} className="text-slate-600 flex items-center justify-between gap-3 text-[11px]">
                                <span className="truncate">
                                  {w.userName} em <strong>{w.convenio}</strong>
                                </span>
                                <span className="shrink-0 font-bold text-rose-600">
                                  {w.rate}% ({w.converted}/{w.total})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Conflitos / CPFs Duplicados */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
                        <div className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          Higienização: CPFs em Múltiplos Cards Ativos
                        </div>
                        {executiveSummaryData.duplicateConflicts.length > 0 ? (
                          <div className="space-y-2.5">
                            {executiveSummaryData.duplicateConflicts.map(dup => (
                              <div
                                key={dup.cpfDigits}
                                className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col gap-2"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 truncate">{dup.clientName}</div>
                                    <div className="text-[10.5px] text-slate-500 mt-0.5">
                                      CPF: {dup.displayCpf} • <strong>{dup.ticketCount} cards</strong> ({dup.uniqueOperators.join(", ")})
                                    </div>
                                  </div>
                                  <span className="text-xs font-black text-emerald-700 shrink-0">
                                    {fmtCurrency(dup.maxOperacao)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2 text-[10.5px]">
                                  <span className="text-rose-600 font-semibold">
                                    {dup.isMultiOperator ? "Conflito entre corretores" : "Cards duplicados"} • até {Math.floor(dup.maxHoursInactive / 24)}d parado
                                  </span>
                                  {dup.criticalCount > 0 && (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveTab("risk")
                                          setRiskTierFilter("all")
                                          setRiskStageFilters([])
                                          setSearchRiskQuery(dup.cpfDigits)
                                          setIsExecSummaryOpen(false)
                                        }}
                                        className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 cursor-pointer"
                                      >
                                        Filtrar no Radar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-700 font-medium py-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Nenhum CPF ativo duplicado encontrado nos filtros atuais.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Modal */}
                <div className="px-7 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
                  <span className="text-[11px] text-slate-500">
                    Diagnóstico calculado em tempo real sobre os filtros aplicados.
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsExecSummaryOpen(false)}
                    className="px-5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold cursor-pointer transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
