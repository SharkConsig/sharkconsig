"use client"

import React, { useState, useMemo, useEffect } from "react"
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
  // Controle de animação suave de abertura e fechamento
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      setIsClosing(false)
    } else if (shouldRender && !isClosing) {
      setIsClosing(true)
      const timer = setTimeout(() => {
        setShouldRender(false)
        setIsClosing(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, shouldRender, isClosing])

  const handleClose = () => {
    if (isClosing) return
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setShouldRender(false)
      setIsClosing(false)
    }, 300)
  }

  // Filtros
  const [period, setPeriod] = useState<PeriodFilter>("30d")
  const [selectedConvenio, setSelectedConvenio] = useState<string>("all")
  const [selectedOperator, setSelectedOperator] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<ActiveTab>("speed")
  const [searchRiskQuery, setSearchRiskQuery] = useState("")
  const [riskTierFilter, setRiskTierFilter] = useState<"all" | "high" | "mid" | "low">("all")
  const [riskStageFilter, setRiskStageFilter] = useState<string>("all")
  const [copiedFieldKey, setCopiedFieldKey] = useState<string | null>(null)

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

    return kanbanTickets.filter(t => {
      // Filtro de Operador
      if (
        selectedOperator !== "all" &&
        String(t.user_id || "").trim().toLowerCase() !== selectedOperator.trim().toLowerCase()
      ) {
        return false
      }

      // Filtro de Convênio
      if (selectedConvenio !== "all") {
        const c = (t.convenio || "").trim().toUpperCase()
        if (c !== selectedConvenio.toUpperCase()) return false
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
  }, [kanbanTickets, period, selectedConvenio, selectedOperator])

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

        if (hoursInStage >= 48) {
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

  // 3. MATRIZ DE AFINIDADE: Operador x Convênio
  const affinityMatrixData = useMemo(() => {
    // Top convênios com maior volume
    const topConveniosCountMap = new Map<string, number>()
    filteredTickets.forEach(t => {
      const c = (t.convenio || "Outros").trim().toUpperCase()
      topConveniosCountMap.set(c, (topConveniosCountMap.get(c) || 0) + 1)
    })

    const topConvenios = Array.from(topConveniosCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0])

    interface OperatorAffinity {
      userId: string
      userName: string
      totalTickets: number
      totalConverted: number
      overallRate: number
      byConvenio: Record<string, {
        total: number
        converted: number
        rate: number
        strength: "forte" | "neutro" | "fraco"
      }>
      bestConvenio?: string
      worstConvenio?: string
    }

    const opMap = new Map<string, {
      userId: string
      userName: string
      totalTickets: number
      totalConverted: number
      byConvenio: Record<string, { total: number; converted: number }>
    }>()

    filteredTickets.forEach(t => {
      const uId = t.user_id || "unassigned"
      const foundOp = operatorsList.find(o => o.id === uId)
      const uName = foundOp?.nome || t.user_nome || "Não Atribuído"
      const c = (t.convenio || "Outros").trim().toUpperCase()

      if (!opMap.has(uId)) {
        opMap.set(uId, {
          userId: uId,
          userName: uName,
          totalTickets: 0,
          totalConverted: 0,
          byConvenio: {}
        })
      }

      const op = opMap.get(uId)!
      op.totalTickets++

      if (!op.byConvenio[c]) {
        op.byConvenio[c] = { total: 0, converted: 0 }
      }
      op.byConvenio[c].total++

      const statusUpper = (t.status || "").toUpperCase()
      const isConverted = statusUpper.includes("NEGOCIA") || statusUpper.includes("PROPOSTA") || statusUpper.includes("CONCLU")
      if (isConverted) {
        op.totalConverted++
        op.byConvenio[c].converted++
      }
    })

    const matrixRows: OperatorAffinity[] = []

    opMap.forEach(op => {
      if (op.totalTickets < 2) return // ignorar ruído estatístico

      const overallRate = Math.round((op.totalConverted / op.totalTickets) * 100)
      const byConvenioEvaluated: OperatorAffinity["byConvenio"] = {}

      let bestRate = -1
      let bestName = ""
      let worstRate = 999
      let worstName = ""

      topConvenios.forEach(conv => {
        const data = op.byConvenio[conv] || { total: 0, converted: 0 }
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
            bestName = conv
          }
          if (rate < worstRate) {
            worstRate = rate
            worstName = conv
          }
        }

        byConvenioEvaluated[conv] = {
          total: data.total,
          converted: data.converted,
          rate,
          strength
        }
      })

      matrixRows.push({
        userId: op.userId,
        userName: op.userName,
        totalTickets: op.totalTickets,
        totalConverted: op.totalConverted,
        overallRate,
        byConvenio: byConvenioEvaluated,
        bestConvenio: bestName && bestRate >= 30 ? `${bestName} (${bestRate}%)` : undefined,
        worstConvenio: worstName && worstRate <= 20 && worstName !== bestName ? `${worstName} (${worstRate}%)` : undefined
      })
    })

    matrixRows.sort((a, b) => b.totalTickets - a.totalTickets)

    return {
      topConvenios,
      rows: matrixRows
    }
  }, [filteredTickets, operatorsList])

  // 4. RADAR DE RISCO DE QUEIMA DE LEADS
  // Todos os atendimentos das etapas ativas parados sem avanço há mais de 24 horas
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
          isHighRisk: opVal >= 25000 && exactHoursInactive > 24
        }
      })
      .filter(item => item.exactHoursInactive > 24)
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

  const effectiveRiskStageFilter =
    riskStageFilter !== "all" && !riskStageOptions.some(opt => opt.value === riskStageFilter)
      ? "all"
      : riskStageFilter

  const searchFilteredRiskLeads = useMemo(() => {
    let list = riskLeadsData

    if (effectiveRiskStageFilter !== "all") {
      list = list.filter(item => getRiskStageKey(item.ticket.status) === effectiveRiskStageFilter)
    }

    if (!searchRiskQuery.trim()) return list

    const q = searchRiskQuery.toLowerCase().trim()
    return list.filter(item => {
      const cName = (item.ticket.cliente_nome || "").toLowerCase()
      const cCpf = (item.ticket.cliente_cpf || "").toLowerCase()
      const uName = (item.ticket.user_nome || "").toLowerCase()
      const conv = (item.ticket.convenio || "").toLowerCase()
      return cName.includes(q) || cCpf.includes(q) || uName.includes(q) || conv.includes(q)
    })
  }, [riskLeadsData, effectiveRiskStageFilter, searchRiskQuery])

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

  // Se não estiver aberto nem em animação, não renderiza
  if (!shouldRender && !isOpen) return null

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end duration-300 transition-opacity",
        isClosing ? "opacity-0" : "opacity-100 animate-in fade-in duration-200"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div 
        className={cn(
          "w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 duration-300 transition-transform ease-out",
          isClosing ? "translate-x-full" : "translate-x-0 animate-in slide-in-from-right duration-300"
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* CABEÇALHO EXECUTIVO */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-500 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Inteligência do Pipeline
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 rounded-full font-bold uppercase tracking-wider">
                    Executive Analytics
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-300">
                Auditoria de velocidade comercial, capital represado e matriz de afinidade por convênio.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS GERENCIAIS */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
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

            {/* Convênio */}
            <select
              value={selectedConvenio}
              onChange={(e) => setSelectedConvenio(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 font-medium rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden shadow-2xs"
            >
              <option value="all">Todos os Convênios ({conveniosList.length})</option>
              {conveniosList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Operador / Corretor */}
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 font-medium rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden shadow-2xs max-w-[200px] truncate"
            >
              <option value="all">Toda a Equipe ({teamOperatorsList.length})</option>
              {teamOperatorsList.map(o => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Mostrando <span className="font-bold text-slate-900">{filteredTickets.length}</span> atendimentos analisados
          </div>
        </div>

        {/* CARDS RESUMO EXECUTIVO (KPIs) */}
        <div className="px-6 py-3.5 grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border-b border-slate-200 shrink-0">
          {/* Card 1: TEMPO MÉDIO */}
          <div className="bg-gradient-to-br from-sky-100 via-sky-50 to-blue-100/90 border-2 border-sky-400 rounded-xl p-3 flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-2 text-sky-900">
              <Zap className="w-4 h-4 text-sky-600 shrink-0" strokeWidth={2.6} />
              <span className="text-[11px] font-black uppercase tracking-wider">TEMPO MÉDIO</span>
            </div>
            <div className="mt-1">
              <div className="text-xl font-black text-sky-950">
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
              <span className="text-[11px] text-sky-900 font-bold">Em negociação ➔ Gerada a ADE</span>
            </div>
          </div>

          {/* Card 2: Capital no Pipeline */}
          <div className="bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100/90 border-2 border-emerald-400 rounded-xl p-3 flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-2 text-emerald-900">
              <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.6} />
              <span className="text-[11px] font-black uppercase tracking-wider">Capital no Pipeline</span>
            </div>
            <div className="mt-1">
              <div className="text-xl font-black text-emerald-950">
                {fmtCurrency(stageAgingData.grandTotalCapital)}
              </div>
              <span className="text-[11px] text-emerald-900 font-bold">
                Prod. Estimada: {fmtCurrency(stageAgingData.grandTotalProducao)}
              </span>
            </div>
          </div>

          {/* Card 3: Gargalos (> 48h) */}
          <div className="bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100/90 border-2 border-amber-400 rounded-xl p-3 flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={2.6} />
              <span className="text-[11px] font-black uppercase tracking-wider">Gargalos (&gt; 48h)</span>
            </div>
            <div className="mt-1">
              <div className="text-xl font-black text-amber-950">
                {stageAgingData.grandTotalStuck48hCount} leads
              </div>
              <span className="text-[11px] text-amber-900 font-bold">Sem avanço na cadência</span>
            </div>
          </div>

          {/* Card 4: Risco de Queima */}
          <div className="bg-gradient-to-br from-rose-100 via-rose-50 to-red-100/90 border-2 border-rose-400 rounded-xl p-3 flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-2 text-rose-900">
              <Flame className="w-4 h-4 text-rose-600 shrink-0" strokeWidth={2.6} />
              <span className="text-[11px] font-black uppercase tracking-wider">Risco de Queima</span>
            </div>
            <div className="mt-1">
              <div className="text-xl font-black text-rose-950">
                {riskLeadsData.length} leads
              </div>
              <span className="text-[11px] text-rose-900 font-bold">&gt; Parados há mais de 24h</span>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS */}
        <div className="px-6 bg-white border-b border-slate-200 flex items-center gap-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("speed")}
            className={cn(
              "py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
              activeTab === "speed"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <Zap className="w-4 h-4" />
            <span>1. Tempo Médio (Em negociação ➔ Gerada a ADE)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("aging")}
            className={cn(
              "py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
              activeTab === "aging"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <Clock className="w-4 h-4" />
            <span>2. Capital Imobilizado por Etapa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("affinity")}
            className={cn(
              "py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors",
              activeTab === "affinity"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <Award className="w-4 h-4" />
            <span>3. Matriz de Afinidade (Corretor x Convênio)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("risk")}
            className={cn(
              "py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors relative",
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
          </button>
        </div>

        {/* ÁREA DE CONTEÚDO PRINCIPAL (COM SCROLL) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* ============================================================== */}
          {/* ABA 1: TEMPO MÉDIO (EM NEGOCIAÇÃO -> GERADA A ADE)              */}
          {/* ============================================================== */}
          {activeTab === "speed" && (
            <div className="space-y-4">
              {/* Box de Instrução Exata */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex items-start gap-3">
                <Zap className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-sky-950">
                    Definição de Tempo Médio Comercial
                  </h4>
                  <p className="text-xs text-sky-800 mt-0.5 leading-relaxed">
                    Mede quantos minutos o corretor leva entre a negociação com o lead e digitação da proposta no banco (gerar a ADE).
                  </p>
                </div>
              </div>

              {/* Tabela de Ranking por Corretor */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Ranking de Velocidade Comercial por Corretor / Estagiário
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {speedToLeadData.ranking.length} operadores avaliados
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Posição & Operador</th>
                        <th className="px-4 py-2.5 text-center">Em Negociação</th>
                        <th className="px-4 py-2.5 text-center">Proposta Digitada</th>
                        <th className="px-4 py-2.5 text-center">Taxa de Avanço</th>
                        <th className="px-4 py-2.5 text-center">Tempo Médio</th>
                        <th className="px-4 py-2.5 text-right">Classificação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
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
                              <td className="px-4 py-3 flex items-center gap-2.5">
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
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-slate-700">
                                {op.totalNegociacoes}
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-slate-700">
                                {op.totalPropostasDigitadas}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={cn(
                                  "font-bold",
                                  convRate >= 50 ? "text-emerald-600" : convRate >= 25 ? "text-indigo-600" : "text-slate-500"
                                )}>
                                  {convRate}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
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
                              <td className="px-4 py-3 text-right">
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {stageAgingData.stages.map(st => (
                  <div key={st.key} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
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
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-start gap-3">
                <Award className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">
                    Otimização de Distribuição Inteligente por Afinidade de Convênio
                  </h4>
                  <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
                    Identifica a aptidão de cada corretor com perfis de clientes específicos. Ao rotear leads de determinados órgãos públicos ou INSS para os operadores com maior taxa de conversão demonstrada, maximiza-se a receita da empresa sem aumentar o custo de aquisição.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Matriz Cruzada: Corretor x Principais Convênios
                  </h3>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ponto Forte (Alta Conv.)
                    </span>
                    <span className="flex items-center gap-1 text-rose-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> Gargalo (Baixa Conv.)
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Corretor / Operador</th>
                        <th className="px-4 py-2.5 text-center">Conv. Geral</th>
                        {affinityMatrixData.topConvenios.map(conv => (
                          <th key={conv} className="px-3 py-2.5 text-center">
                            {conv}
                          </th>
                        ))}
                        <th className="px-4 py-2.5 text-left">Insight Gerencial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {affinityMatrixData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={affinityMatrixData.topConvenios.length + 3} className="px-4 py-8 text-center text-slate-400">
                            Dados insuficientes para cruzar afinidade no período.
                          </td>
                        </tr>
                      ) : (
                        affinityMatrixData.rows.map(row => (
                          <tr key={row.userId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {row.userName}
                              <div className="text-[10px] text-slate-400 font-normal">
                                {row.totalTickets} leads atendidos
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-black text-indigo-700">
                              {row.overallRate}%
                            </td>
                            {affinityMatrixData.topConvenios.map(conv => {
                              const cell = row.byConvenio[conv]
                              if (!cell || cell.total === 0) {
                                return (
                                  <td key={conv} className="px-3 py-3 text-center text-slate-300">
                                    -
                                  </td>
                                )
                              }

                              const isStrong = cell.strength === "forte"
                              const isWeak = cell.strength === "fraco"

                              return (
                                <td key={conv} className="px-3 py-3 text-center">
                                  <div className={cn(
                                    "inline-flex flex-col items-center justify-center px-2 py-1 rounded-md text-[11px] font-bold border",
                                    isStrong ? "bg-emerald-50 text-emerald-800 border-emerald-300" :
                                    isWeak ? "bg-rose-50 text-rose-800 border-rose-300" :
                                    "bg-slate-50 text-slate-700 border-slate-200"
                                  )}>
                                    <span>{cell.rate}%</span>
                                    <span className="text-[9px] font-normal text-slate-500">
                                      {cell.converted}/{cell.total}
                                    </span>
                                  </div>
                                </td>
                              )
                            })}
                            <td className="px-4 py-3 text-[11px]">
                              {row.bestConvenio && (
                                <div className="text-emerald-700 font-medium">
                                  ★ Especialista em {row.bestConvenio}
                                </div>
                              )}
                              {row.worstConvenio && (
                                <div className="text-rose-600 font-medium">
                                  ⚠ Baixo fechamento em {row.worstConvenio}
                                </div>
                              )}
                              {!row.bestConvenio && !row.worstConvenio && (
                                <span className="text-slate-400 italic">Desempenho homogêneo</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 4: RADAR DE RISCO DE QUEIMA                                */}
          {/* ============================================================== */}
          {activeTab === "risk" && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRiskTierFilter(prev => prev === "high" ? "all" : "high")}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer",
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
                        "px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer",
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
                        "px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                        riskTierFilter === "low"
                          ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      Baixo &lt;10k ({riskTierCounts.low} {riskTierCounts.low === 1 ? "lead" : "leads"})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-60">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchRiskQuery}
                      onChange={(e) => setSearchRiskQuery(e.target.value)}
                      placeholder="Filtrar por cliente, CPF ou corretor..."
                      className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>

                  <select
                    value={effectiveRiskStageFilter}
                    onChange={(e) => setRiskStageFilter(e.target.value)}
                    className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 font-medium rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  >
                    <option value="all">Todas as Etapas ({riskStageOptions.length})</option>
                    {riskStageOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredRiskLeads.length === 0 ? (
                  <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
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
                          "bg-white border rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between",
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
                                <Clock className="w-3.5 h-3.5" />
                                {item.hoursInactive} horas
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
                                handleClose()
                              }}
                              className="px-3 py-1 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>Atender Lead</span>
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
          )}
        </div>

        {/* RODAPÉ */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-start text-xs shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors cursor-pointer shadow-xs text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
