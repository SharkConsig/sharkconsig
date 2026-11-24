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
import { useAuth } from "@/context/auth-context"

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
type ActiveTab = "funnel" | "affinity" | "risk"
type KanbanStageKey = "EM RETOMADA" | "EM NEGOCIAÇÃO" | "EM REATIVAÇÃO" | "SEM INTERESSE" | "FECHADO" | "PERDIDO"

export function PipelineIntelligenceDrawer({
  isOpen,
  onClose,
  tickets,
  usersList,
  cltCollaborators = [],
  getValorOperacaoDeAbertura,
  onSelectTicket
}: PipelineIntelligenceDrawerProps) {
  const { user, perfil } = useAuth()
  const loggedUserName = useMemo(() => {
    const raw = (perfil?.nome || user?.user_metadata?.nome || user?.email?.split("@")[0] || "Gestor").trim()
    return raw || "Gestor"
  }, [perfil?.nome, user?.user_metadata?.nome, user?.email])

  const handleClose = () => {
    onClose()
  }

  // Filtros
  const [period, setPeriod] = useState<PeriodFilter>("all")
  const [selectedConvenios, setSelectedConvenios] = useState<string[]>([])
  const [selectedOperators, setSelectedOperators] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>("funnel")
  const [teamRoleFilter, setTeamRoleFilter] = useState<"all" | "corretor" | "estagiario">("all")
  const [affinityMode, setAffinityMode] = useState<"convenio" | "valor">("convenio")
  const [isExecSummaryOpen, setIsExecSummaryOpen] = useState(false)
  const [stuckModalStageKey, setStuckModalStageKey] = useState<KanbanStageKey | null>(null)
  const [stuckModalSearch, setStuckModalSearch] = useState("")
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

  // Pré-processamento único em O(N) dos atendimentos filtrados (etapa Kanban, metadados, origem, interação/retomada e margem)
  const parsedTickets = useMemo(() => {
    const parseMeta = (desc?: string): Record<string, any> => {
      if (!desc) return {}
      try {
        const match = String(desc).match(/<!-- TICKET_METADATA: ([\s\S]*?) -->/)
        if (match && match[1]) return JSON.parse(match[1])
      } catch {}
      return {}
    }

    const resolveStageKey = (status?: string): KanbanStageKey => {
      const s = String(status || "").trim().toUpperCase()
      if (s === "FECHADO" || s.includes("FECHAD")) return "FECHADO"
      if (s === "PERDIDO" || s.includes("PERDID") || s.includes("CANCELAD") || s.includes("NÃO APROVAD") || s.includes("IMPOSSIBILITADO")) return "PERDIDO"
      if (s.includes("NEGOCIA")) return "EM NEGOCIAÇÃO"
      if (s.includes("REATIVA")) return "EM REATIVAÇÃO"
      if (s.includes("SEM INTERESSE")) return "SEM INTERESSE"
      return "EM RETOMADA"
    }

    const resolveOrigin = (t: any, meta: Record<string, any>): string => {
      const raw =
        (meta?.origem && meta.origem !== "KANBAN" && meta.origem !== "SISTEMA" ? meta.origem : "") ||
        (meta?.cliente_origem || "") ||
        (t.origem && t.origem !== "KANBAN" && t.origem !== "SISTEMA" ? t.origem : "") ||
        (t.origem && t.origem !== "KANBAN" ? t.origem : "") ||
        meta?.origem ||
        ""
      const cleaned = String(raw || "").trim().replace(/\s+/g, " ")
      if (!cleaned || cleaned === "-" || cleaned.toLowerCase() === "não informada" || cleaned.toLowerCase() === "nao informada") {
        return "Não informada"
      }
      return cleaned
    }

    return filteredTickets.map(t => {
      const meta = parseMeta(t.descricao)
      const stageKey = resolveStageKey(t.status)
      const movs = Array.isArray(t.historico_movimentacoes) ? t.historico_movimentacoes : []

      const opData = getValorOperacaoDeAbertura(t)
      const opVal = opData.num || 0
      const prodVal = opData.numProducao || 0

      const hasMargin =
        opVal > 0 ||
        Number(t.margem || 0) > 0 ||
        Number(t.margem_liquida_5 || 0) > 0 ||
        Number(t.margem_beneficio_5 || 0) > 0 ||
        Number(meta?.margem || 0) > 0 ||
        Number(meta?.valor_liberado || 0) > 0

      const propAde = t.proposta_info?.ade ? String(t.proposta_info.ade).trim() : ""
      const hasValidAde = Boolean(propAde && propAde !== "-" && propAde !== "null" && propAde !== "undefined")
      const isFechado = stageKey === "FECHADO"
      const isPerdido = stageKey === "PERDIDO"
      const movToFechado = movs.some((m: any) => (m.etapa_nova || "").toUpperCase().includes("FECHAD"))
      const isConverted = isFechado || (hasValidAde && !isPerdido) || (movToFechado && !isPerdido)

      const hasNegociacao =
        stageKey === "EM NEGOCIAÇÃO" ||
        isFechado ||
        movs.some(
          (m: any) =>
            (m.etapa_anterior || "").toUpperCase().includes("NEGOCIA") ||
            (m.etapa_nova || "").toUpperCase().includes("NEGOCIA")
        )

      // Distinguir quem já interagiu (flag/histórico/descrição) e quem alcançou interação no funil
      const obsHistText = Array.isArray(meta?.observacoes_historico)
        ? meta.observacoes_historico.map((o: any) => String(o?.texto || "")).join(" ").toLowerCase()
        : ""
      const rawVisibleDesc = String(t.descricao || "")
        .replace(/<!-- TICKET_METADATA: [\s\S]*? -->/g, "")
        .toLowerCase()
      const interactedFlag =
        Boolean(meta?.cliente_respondeu || meta?.regua_pausada) ||
        obsHistText.includes("cliente interagiu") ||
        obsHistText.includes("cliente respondeu") ||
        rawVisibleDesc.includes("cliente interagiu") ||
        rawVisibleDesc.includes("cliente respondeu")

      const hasInteracao = interactedFlag || hasNegociacao || isFechado

      let isEmInteracao = false
      let isSemContatoRetomada = false
      if (stageKey === "EM RETOMADA") {
        isEmInteracao = interactedFlag
        isSemContatoRetomada = !interactedFlag
      }

      const originLabel = resolveOrigin(t, meta)
      const originKey = originLabel.toUpperCase()

      return {
        ticket: t,
        meta,
        stageKey,
        movs,
        opVal,
        prodVal,
        hasMargin,
        isConverted,
        isFechado,
        isPerdido,
        hasInteracao,
        hasNegociacao,
        isEmInteracao,
        isSemContatoRetomada,
        originLabel,
        originKey
      }
    })
  }, [filteredTickets, getValorOperacaoDeAbertura])

  // 1. CÁLCULO DE EFICIÊNCIA DA EQUIPE & TEMPO MÉDIO (Em negociação -> Gerada a ADE + Jornada Completa)
  const speedToLeadData = useMemo(() => {
    interface OperatorSpeed {
      userId: string
      userName: string
      roleType: "corretor" | "estagiario" | "outro"
      roleLabel: string
      totalFunil: number
      emInteracao: number
      emRetomadaSemContato: number
      emNegociacaoAtual: number
      emReativacao: number
      semInteresse: number
      totalFechado: number
      totalPerdido: number
      totalNegociacoes: number
      totalPropostasDigitadas: number
      producaoFechada: number
      operacaoFechada: number
      operacaoTotal: number
      sharePct: number
      noContactPct: number
      lossPct: number
      leadsPerFechado: number | null
      withMarginCount: number
      avgMinutesToAde: number
      minMinutes: number
      maxMinutes: number
      sampleCount: number
      funnelConvRate: number
      negConvRate: number
      mentorVerdict: string
      mentorTone: "emerald" | "sky" | "amber" | "rose" | "slate"
    }

    const opInfoMap = new Map<string, { nome: string; roleType: "corretor" | "estagiario" | "outro"; roleLabel: string }>()
    operatorsList.forEach(o => {
      const regime = String(o.regime_contratacao || "").trim().toUpperCase()
      const roleStr = String(o.funcao || o.role || "").trim().toUpperCase()
      const isEstagio = regime.includes("ESTAG") || regime.includes("ESTÁG") || roleStr.includes("ESTAG") || roleStr.includes("ESTÁG")
      const isCorretor = regime === "CLT" || roleStr.includes("CORRETOR")
      const roleType: "corretor" | "estagiario" | "outro" = isEstagio ? "estagiario" : isCorretor ? "corretor" : "outro"
      const roleLabel = isEstagio ? "Estagiário" : isCorretor ? "Corretor" : "Operador"
      opInfoMap.set(o.id, { nome: o.nome || "Sem Nome", roleType, roleLabel })
    })

    const opMap = new Map<string, {
      userId: string
      userName: string
      roleType: "corretor" | "estagiario" | "outro"
      roleLabel: string
      totalFunil: number
      emInteracao: number
      emRetomadaSemContato: number
      emNegociacaoAtual: number
      emReativacao: number
      semInteresse: number
      totalFechado: number
      totalPerdido: number
      totalNegociacoes: number
      totalPropostasDigitadas: number
      producaoFechada: number
      operacaoFechada: number
      operacaoTotal: number
      withMarginCount: number
      durationsMinutes: number[]
    }>()

    const parseTimestampMs = (dateStr?: string | null, requireTime = false): number | null => {
      if (!dateStr) return null
      const s = String(dateStr).trim()
      if (!s || s === "-") return null
      const hasTime = s.includes("T") || /\d{2}:\d{2}/.test(s)
      if (requireTime && !hasTime) return null
      const ms = new Date(s).getTime()
      return isNaN(ms) ? null : ms
    }

    parsedTickets.forEach(item => {
      const t = item.ticket
      const uId = t.user_id || "unassigned"
      const info = opInfoMap.get(uId)
      const uName = info?.nome || t.user_nome || "Não Atribuído"
      const roleType = info?.roleType || "outro"
      const roleLabel = info?.roleLabel || "Operador"

      if (!opMap.has(uId)) {
        opMap.set(uId, {
          userId: uId,
          userName: uName,
          roleType,
          roleLabel,
          totalFunil: 0,
          emInteracao: 0,
          emRetomadaSemContato: 0,
          emNegociacaoAtual: 0,
          emReativacao: 0,
          semInteresse: 0,
          totalFechado: 0,
          totalPerdido: 0,
          totalNegociacoes: 0,
          totalPropostasDigitadas: 0,
          producaoFechada: 0,
          operacaoFechada: 0,
          operacaoTotal: 0,
          withMarginCount: 0,
          durationsMinutes: []
        })
      }

      const op = opMap.get(uId)!
      op.totalFunil++
      op.operacaoTotal += item.opVal
      if (item.hasMargin) op.withMarginCount++

      if (item.stageKey === "EM RETOMADA") {
        if (item.isEmInteracao) op.emInteracao++
        else op.emRetomadaSemContato++
      } else if (item.stageKey === "EM NEGOCIAÇÃO") {
        op.emNegociacaoAtual++
      } else if (item.stageKey === "EM REATIVAÇÃO") {
        op.emReativacao++
      } else if (item.stageKey === "SEM INTERESSE") {
        op.semInteresse++
      } else if (item.stageKey === "FECHADO") {
        op.totalFechado++
        op.operacaoFechada += item.opVal
        op.producaoFechada += item.prodVal
      } else if (item.stageKey === "PERDIDO") {
        op.totalPerdido++
      }

      if (item.hasNegociacao) op.totalNegociacoes++
      if (item.isConverted) op.totalPropostasDigitadas++

      // Tempo exato: entrada em 'Em negociação' até geração da ADE / entrada em 'Fechado'
      const movs = item.movs
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

      if (!negociacaoTime && item.stageKey === "EM NEGOCIAÇÃO") {
        negociacaoTime = parseTimestampMs(t.created_at)
      }

      let adeTime: number | null = null
      if (item.isConverted && negociacaoTime) {
        const propInfo = t.proposta_info
        const digitacaoExact = parseTimestampMs(propInfo?.data_digitacao, true)
        if (digitacaoExact && digitacaoExact >= negociacaoTime) {
          adeTime = digitacaoExact
        }

        if (!adeTime) {
          const propCreated = parseTimestampMs(propInfo?.created_at, true)
          if (propCreated && propCreated >= negociacaoTime) {
            adeTime = propCreated
          }
        }

        if (!adeTime && movToFechadoTime && movToFechadoTime >= negociacaoTime) {
          adeTime = movToFechadoTime
        }

        if (!adeTime && item.isFechado) {
          const updatedMs = parseTimestampMs(t.updated_at, true)
          if (updatedMs && updatedMs >= negociacaoTime) {
            adeTime = updatedMs
          }
        }
      }

      if (negociacaoTime && adeTime && adeTime >= negociacaoTime) {
        const diffMin = Math.round((adeTime - negociacaoTime) / (1000 * 60))
        if (diffMin >= 0 && diffMin <= 43200) {
          op.durationsMinutes.push(diffMin)
        }
      }
    })

    const activeOpsCount = Array.from(opMap.values()).filter(o => o.userId !== "unassigned" && o.totalFunil > 0).length
    const totalAssignedLeads = Array.from(opMap.values()).reduce((sum, o) => sum + (o.userId !== "unassigned" ? o.totalFunil : 0), 0)
    const avgLeadsPerOp = activeOpsCount > 0 ? Math.round(totalAssignedLeads / activeOpsCount) : 0

    const result: OperatorSpeed[] = []
    let totalGeneralMinutes = 0
    let totalGeneralSamples = 0

    opMap.forEach(op => {
      if (op.totalFunil === 0) return

      const count = op.durationsMinutes.length
      const avg = count > 0 ? Math.round(op.durationsMinutes.reduce((a, b) => a + b, 0) / count) : 0
      const min = count > 0 ? Math.min(...op.durationsMinutes) : 0
      const max = count > 0 ? Math.max(...op.durationsMinutes) : 0

      if (count > 0) {
        totalGeneralMinutes += op.durationsMinutes.reduce((a, b) => a + b, 0)
        totalGeneralSamples += count
      }

      const funnelConvRate = op.totalFunil > 0 ? Math.round((op.totalPropostasDigitadas / op.totalFunil) * 100) : 0
      const negConvRate = op.totalNegociacoes > 0 ? Math.min(100, Math.round((op.totalPropostasDigitadas / op.totalNegociacoes) * 100)) : 0

      let mentorVerdict = "Em acompanhamento"
      let mentorTone: "emerald" | "sky" | "amber" | "rose" | "slate" = "slate"

      if (op.userId === "unassigned") {
        mentorVerdict = "Distribuir leads sem responsável"
        mentorTone = "rose"
      } else if (op.totalFunil < Math.max(3, Math.floor(avgLeadsPerOp * 0.45))) {
        mentorVerdict = "Pouca entrada no funil (aumentar captação)"
        mentorTone = "amber"
      } else if (funnelConvRate >= 15 && negConvRate >= 30 && (count === 0 || avg <= 240)) {
        mentorVerdict = "Alta eficiência (volume, ritmo e conversão)"
        mentorTone = "emerald"
      } else if (op.totalNegociacoes >= 5 && negConvRate < 15) {
        mentorVerdict = "Gargalo em negociação (treinar fechamento)"
        mentorTone = "rose"
      } else if (count >= 2 && avg > 480) {
        mentorVerdict = "SLA lento na digitação da ADE (>8h)"
        mentorTone = "amber"
      } else if (op.totalFunil >= 5 && op.emRetomadaSemContato / op.totalFunil >= 0.65) {
        mentorVerdict = "Muitos leads parados sem contato inicial"
        mentorTone = "amber"
      } else if (op.totalPropostasDigitadas > 0) {
        mentorVerdict = "Desempenho equilibrado no funil"
        mentorTone = "sky"
      }

      const sharePct = parsedTickets.length > 0 ? Math.round((op.totalFunil / parsedTickets.length) * 100) : 0
      const noContactPct = op.totalFunil > 0 ? Math.round((op.emRetomadaSemContato / op.totalFunil) * 100) : 0
      const lossPct = op.totalFunil > 0 ? Math.round((op.totalPerdido / op.totalFunil) * 100) : 0
      const leadsPerFechado = op.totalFechado > 0 ? Math.max(1, Math.round(op.totalFunil / op.totalFechado)) : null

      result.push({
        userId: op.userId,
        userName: op.userName,
        roleType: op.roleType,
        roleLabel: op.roleLabel,
        totalFunil: op.totalFunil,
        emInteracao: op.emInteracao,
        emRetomadaSemContato: op.emRetomadaSemContato,
        emNegociacaoAtual: op.emNegociacaoAtual,
        emReativacao: op.emReativacao,
        semInteresse: op.semInteresse,
        totalFechado: op.totalFechado,
        totalPerdido: op.totalPerdido,
        totalNegociacoes: op.totalNegociacoes,
        totalPropostasDigitadas: op.totalPropostasDigitadas,
        producaoFechada: op.producaoFechada,
        operacaoFechada: op.operacaoFechada,
        operacaoTotal: op.operacaoTotal,
        sharePct,
        noContactPct,
        lossPct,
        leadsPerFechado,
        withMarginCount: op.withMarginCount,
        avgMinutesToAde: avg,
        minMinutes: min,
        maxMinutes: max,
        sampleCount: count,
        funnelConvRate,
        negConvRate,
        mentorVerdict,
        mentorTone
      })
    })

    // Ordenar por maior fechamento/conversão no funil e agilidade
    result.sort((a, b) => {
      if (b.totalPropostasDigitadas !== a.totalPropostasDigitadas) {
        return b.totalPropostasDigitadas - a.totalPropostasDigitadas
      }
      if (a.sampleCount > 0 && b.sampleCount > 0 && a.avgMinutesToAde !== b.avgMinutesToAde) {
        return a.avgMinutesToAde - b.avgMinutesToAde
      }
      return b.totalFunil - a.totalFunil
    })

    const generalAvgMinutes = totalGeneralSamples > 0 ? Math.round(totalGeneralMinutes / totalGeneralSamples) : 0

    return {
      ranking: result,
      generalAvgMinutes,
      totalSamples: totalGeneralSamples,
      avgLeadsPerOp
    }
  }, [parsedTickets, operatorsList])

  // 2. JORNADA COMPLETA DO FUNIL (6 ETAPAS DO KANBAN) + CAPITAL IMOBILIZADO
  const stageAgingData = useMemo(() => {
    const STAGES: Array<{ key: KanbanStageKey; label: string; subtitle: string; color: string }> = [
      { key: "EM RETOMADA", label: "Em interação ou retomada", subtitle: "Entrada do funil", color: "amber" },
      { key: "EM NEGOCIAÇÃO", label: "Em negociação", subtitle: "Proposta em tratativa", color: "indigo" },
      { key: "EM REATIVAÇÃO", label: "Em reativação", subtitle: "Resgate de esfriados", color: "purple" },
      { key: "SEM INTERESSE", label: "Sem interesse", subtitle: "Nutrição / DDD", color: "slate" },
      { key: "FECHADO", label: "Fechado", subtitle: "Andamento / Aguardando Pagamento", color: "emerald" },
      { key: "PERDIDO", label: "Perdido", subtitle: "Encerrados / cancelados", color: "rose" }
    ]

    const operatorNameMap = new Map<string, string>()
    operatorsList.forEach(o => {
      if (o.id) operatorNameMap.set(String(o.id), o.nome)
    })

    const now = Date.now()
    let grandTotalCapital = 0 // Pipeline ativo (exclui Fechado e Perdido)
    let grandTotalProducao = 0
    let grandTotalStuck48hCount = 0
    const activePipelineCpfs = new Set<string>()

    const stageResults = STAGES.map(stageDef => {
      const stageItems = parsedTickets.filter(item => item.stageKey === stageDef.key)
      const isClosedOrLost = stageDef.key === "FECHADO" || stageDef.key === "PERDIDO"

      let totalOperacao = 0
      let totalProducao = 0
      let totalHours = 0
      let withMarginCount = 0

      let highTicketCount = 0
      let highTicketVal = 0
      let midTicketCount = 0
      let midTicketVal = 0
      let lowTicketCount = 0
      let lowTicketVal = 0

      let stuckCount48h = 0
      let stuckCapital48h = 0
      const stuckLeads48h: Array<{
        ticket: any
        operatorName: string
        stageName: string
        opVal: number
        prodVal: number
        hoursInactive: number
      }> = []

      let emInteracaoCount = 0
      let emRetomadaNoContactCount = 0
      const lossReasonMap = new Map<string, number>()

      stageItems.forEach(item => {
        const t = item.ticket
        totalOperacao += item.opVal
        totalProducao += item.prodVal
        if (item.hasMargin) withMarginCount++

        if (stageDef.key === "EM RETOMADA") {
          if (item.isEmInteracao) emInteracaoCount++
          else emRetomadaNoContactCount++
        }

        if (stageDef.key === "PERDIDO") {
          const reason = String(t.motivo_perda || "Sem motivo registrado").trim()
          lossReasonMap.set(reason, (lossReasonMap.get(reason) || 0) + 1)
        }

        const tDate = new Date(t.updated_at || t.created_at || now).getTime()
        const hoursInStage = Math.max(0, (now - tDate) / (1000 * 60 * 60))
        totalHours += hoursInStage

        if (!isClosedOrLost) {
          const cpfDigits = String(t.cliente_cpf || "").replace(/\D/g, "")
          if (cpfDigits.length === 11) {
            activePipelineCpfs.add(cpfDigits)
          } else {
            activePipelineCpfs.add(`ticket:${t.id}`)
          }
        }

        if (!isClosedOrLost && hoursInStage > 48) {
          stuckCount48h++
          stuckCapital48h += item.opVal
          const opId = t.user_id ? String(t.user_id) : ""
          const operatorName = (opId && operatorNameMap.get(opId)) || t.user_nome || "Não Atribuído"
          stuckLeads48h.push({
            ticket: t,
            operatorName,
            stageName: t.status || stageDef.label,
            opVal: item.opVal,
            prodVal: item.prodVal,
            hoursInactive: Math.floor(hoursInStage)
          })
        }

        if (item.opVal >= 30000) {
          highTicketCount++
          highTicketVal += item.opVal
        } else if (item.opVal >= 10000) {
          midTicketCount++
          midTicketVal += item.opVal
        } else {
          lowTicketCount++
          lowTicketVal += item.opVal
        }
      })

      if (!isClosedOrLost) {
        grandTotalCapital += totalOperacao
        grandTotalProducao += totalProducao
        grandTotalStuck48hCount += stuckCount48h
      }

      stuckLeads48h.sort((a, b) => b.prodVal - a.prodVal || b.opVal - a.opVal || b.hoursInactive - a.hoursInactive)

      const count = stageItems.length
      const avgHours = count > 0 ? Math.round(totalHours / count) : 0
      const topLossReason = Array.from(lossReasonMap.entries()).sort((a, b) => b[1] - a[1])[0] || null

      return {
        ...stageDef,
        count,
        sharePct: parsedTickets.length > 0 ? Math.round((count / parsedTickets.length) * 100) : 0,
        totalOperacao,
        totalProducao,
        withMarginCount,
        marginPct: count > 0 ? Math.round((withMarginCount / count) * 100) : 0,
        avgHours,
        avgDays: (avgHours / 24).toFixed(1),
        stuckCount48h,
        stuckCapital48h,
        stuckLeads48h,
        emInteracaoCount,
        emRetomadaNoContactCount,
        topLossReason: topLossReason ? { label: topLossReason[0], count: topLossReason[1] } : null,
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
      grandTotalStuck48hCount,
      uniquePipelineCpfsCount: activePipelineCpfs.size
    }
  }, [parsedTickets, operatorsList])

  // 2B. ANÁLISE DO FUNIL DE PONTA A PONTA & ROI POR ORIGEM DO CLIENTE
  const funnelAndOriginsData = useMemo(() => {
    const totalFunnel = parsedTickets.length
    let totalEmRetomadaStage = 0
    let totalEmInteracao = 0
    let totalEmRetomadaSemContato = 0
    let totalEmNegociacaoAtual = 0
    let totalAlcanceNegociacao = 0
    let totalReativacao = 0
    let totalSemInteresse = 0
    let totalFechado = 0
    let totalPerdido = 0
    let totalComMargem = 0
    let totalAdeFechadas = 0
    let totalOperacaoFechada = 0
    let totalProducaoFechada = 0

    interface OriginAccumulator {
      key: string
      label: string
      total: number
      hasInteracao: number
      emInteracao: number
      emRetomadaSemContato: number
      emNegociacaoAtual: number
      alcancouNegociacao: number
      emReativacao: number
      semInteresse: number
      fechado: number
      perdido: number
      comMargem: number
      operacaoTotal: number
      producaoFechada: number
      producaoAtiva: number
    }

    const originsMap = new Map<string, OriginAccumulator>()

    parsedTickets.forEach(item => {
      if (item.hasMargin) totalComMargem++
      if (item.hasNegociacao) totalAlcanceNegociacao++
      if (item.isConverted) totalAdeFechadas++

      if (item.stageKey === "EM RETOMADA") {
        totalEmRetomadaStage++
        if (item.isEmInteracao) totalEmInteracao++
        else totalEmRetomadaSemContato++
      } else if (item.stageKey === "EM NEGOCIAÇÃO") {
        totalEmNegociacaoAtual++
      } else if (item.stageKey === "EM REATIVAÇÃO") {
        totalReativacao++
      } else if (item.stageKey === "SEM INTERESSE") {
        totalSemInteresse++
      } else if (item.stageKey === "FECHADO") {
        totalFechado++
        totalOperacaoFechada += item.opVal
        totalProducaoFechada += item.prodVal
      } else if (item.stageKey === "PERDIDO") {
        totalPerdido++
      }

      if (!originsMap.has(item.originKey)) {
        originsMap.set(item.originKey, {
          key: item.originKey,
          label: item.originLabel,
          total: 0,
          hasInteracao: 0,
          emInteracao: 0,
          emRetomadaSemContato: 0,
          emNegociacaoAtual: 0,
          alcancouNegociacao: 0,
          emReativacao: 0,
          semInteresse: 0,
          fechado: 0,
          perdido: 0,
          comMargem: 0,
          operacaoTotal: 0,
          producaoFechada: 0,
          producaoAtiva: 0
        })
      }

      const orig = originsMap.get(item.originKey)!
      orig.total++
      orig.operacaoTotal += item.opVal
      if (item.hasMargin) orig.comMargem++
      if (item.hasInteracao) orig.hasInteracao++
      if (item.hasNegociacao) orig.alcancouNegociacao++

      if (item.stageKey === "EM RETOMADA") {
        if (item.isEmInteracao) orig.emInteracao++
        else orig.emRetomadaSemContato++
        orig.producaoAtiva += item.prodVal
      } else if (item.stageKey === "EM NEGOCIAÇÃO") {
        orig.emNegociacaoAtual++
        orig.producaoAtiva += item.prodVal
      } else if (item.stageKey === "EM REATIVAÇÃO") {
        orig.emReativacao++
        orig.producaoAtiva += item.prodVal
      } else if (item.stageKey === "SEM INTERESSE") {
        orig.semInteresse++
      } else if (item.stageKey === "FECHADO") {
        orig.fechado++
        orig.producaoFechada += item.prodVal
      } else if (item.stageKey === "PERDIDO") {
        orig.perdido++
      }
    })

    const origins = Array.from(originsMap.values())
      .map(o => {
        const sharePct = totalFunnel > 0 ? Math.round((o.total / totalFunnel) * 100) : 0
        const marginPct = o.total > 0 ? Math.round((o.comMargem / o.total) * 100) : 0
        const negReachPct = o.total > 0 ? Math.round((o.alcancouNegociacao / o.total) * 100) : 0
        const convPct = o.total > 0 ? Math.round((o.fechado / o.total) * 100) : 0
        const noContactPct = o.total > 0 ? Math.round((o.emRetomadaSemContato / o.total) * 100) : 0
        const lossPct = o.total > 0 ? Math.round((o.perdido / o.total) * 100) : 0

        const leadsPerInteracao = o.hasInteracao > 0 ? Math.max(1, Math.round(o.total / o.hasInteracao)) : null
        const leadsPerNegociacao = o.alcancouNegociacao > 0 ? Math.max(1, Math.round(o.total / o.alcancouNegociacao)) : null
        const leadsPerFechado = o.fechado > 0 ? Math.max(1, Math.round(o.total / o.fechado)) : null

        let roiVerdict = "Em maturação"
        let roiTone: "emerald" | "sky" | "amber" | "rose" | "slate" = "slate"

        if (o.total >= 3 && (convPct >= 10 || o.producaoFechada >= 10000)) {
          roiVerdict = "Ótima"
          roiTone = "emerald"
        } else if (o.total >= 5 && marginPct < 35 && o.fechado === 0) {
          roiVerdict = "Ruim"
          roiTone = "rose"
        } else if (o.total >= 5 && noContactPct >= 65 && o.alcancouNegociacao <= 1) {
          roiVerdict = "Ruim"
          roiTone = "rose"
        } else if (o.total >= 5 && lossPct >= 50 && o.fechado === 0) {
          roiVerdict = "Ruim"
          roiTone = "rose"
        } else if (o.total >= 3 && (o.fechado > 0 || (o.alcancouNegociacao >= 2 && marginPct >= 50))) {
          roiVerdict = "Boa"
          roiTone = "sky"
        }

        return {
          ...o,
          sharePct,
          marginPct,
          negReachPct,
          convPct,
          noContactPct,
          lossPct,
          leadsPerInteracao,
          leadsPerNegociacao,
          leadsPerFechado,
          roiVerdict,
          roiTone
        }
      })
      .sort((a, b) => b.total - a.total || b.fechado - a.fechado)

    const topOriginsInInteracao = origins
      .filter(o => o.emInteracao > 0)
      .sort((a, b) => b.emInteracao - a.emInteracao)
      .slice(0, 5)

    const topOriginsInRetomada = origins
      .filter(o => o.emRetomadaSemContato > 0)
      .sort((a, b) => b.emRetomadaSemContato - a.emRetomadaSemContato)
      .slice(0, 5)

    const topOriginsInNegociacao = origins
      .filter(o => o.emNegociacaoAtual > 0)
      .sort((a, b) => b.emNegociacaoAtual - a.emNegociacaoAtual)
      .slice(0, 5)

    const topOriginsInSemInteresse = origins
      .filter(o => o.semInteresse > 0)
      .sort((a, b) => b.semInteresse - a.semInteresse)
      .slice(0, 5)

    const topOriginsInFechado = origins
      .filter(o => o.fechado > 0)
      .sort((a, b) => b.fechado - a.fechado || b.producaoFechada - a.producaoFechada)
      .slice(0, 5)

    const topOriginsInPerdido = origins
      .filter(o => o.perdido > 0)
      .sort((a, b) => b.perdido - a.perdido)
      .slice(0, 5)

    const interacaoPct = totalEmRetomadaStage > 0 ? Math.round((totalEmInteracao / totalEmRetomadaStage) * 100) : 0
    const negToAdePct = totalAlcanceNegociacao > 0 ? Math.min(100, Math.round((totalAdeFechadas / totalAlcanceNegociacao) * 100)) : 0
    const funnelConvPct = totalFunnel > 0 ? Math.round((totalFechado / totalFunnel) * 100) : 0
    const withMarginPct = totalFunnel > 0 ? Math.round((totalComMargem / totalFunnel) * 100) : 0
    const reachedNegPct = totalFunnel > 0 ? Math.round((totalAlcanceNegociacao / totalFunnel) * 100) : 0

    return {
      totalFunnel,
      totalEmRetomadaStage,
      totalEmInteracao,
      totalEmRetomadaSemContato,
      totalEmNegociacaoAtual,
      totalAlcanceNegociacao,
      totalReativacao,
      totalSemInteresse,
      totalFechado,
      totalPerdido,
      totalComMargem,
      totalAdeFechadas,
      totalOperacaoFechada,
      totalProducaoFechada,
      interacaoPct,
      negToAdePct,
      funnelConvPct,
      withMarginPct,
      reachedNegPct,
      origins,
      topOriginsInInteracao,
      topOriginsInRetomada,
      topOriginsInNegociacao,
      topOriginsInSemInteresse,
      topOriginsInFechado,
      topOriginsInPerdido
    }
  }, [parsedTickets])

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

  const fmtDaysAndHours = (totalHours: number) => {
    const safeHours = Math.max(0, Math.floor(totalHours || 0))
    const days = Math.floor(safeHours / 24)
    const remHours = safeHours % 24
    if (days <= 0) return `${safeHours} ${safeHours === 1 ? "hora" : "horas"}`
    const daysPart = `${days} ${days === 1 ? "dia" : "dias"}`
    const hoursPart = remHours > 0 ? ` e ${remHours} ${remHours === 1 ? "hora" : "horas"}` : ""
    return `${daysPart}${hoursPart}`
  }

  const stuckModalStage = useMemo(() => {
    if (!stuckModalStageKey) return null
    return stageAgingData.stages.find(s => s.key === stuckModalStageKey) || null
  }, [stuckModalStageKey, stageAgingData.stages])

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
    const rankingWithSamples = [...speedToLeadData.ranking]
      .filter(op => op.sampleCount > 0)
      .sort((a, b) => a.avgMinutesToAde - b.avgMinutesToAde || b.totalPropostasDigitadas - a.totalPropostasDigitadas)

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

    const bestOriginMatches = funnelAndOriginsData.origins
      .filter(o => o.total >= 2 && (o.fechado > 0 || o.marginPct >= 60))
      .sort((a, b) => b.convPct - a.convPct || b.producaoFechada - a.producaoFechada || b.marginPct - a.marginPct)
      .slice(0, 4)

    const alertOrigins = funnelAndOriginsData.origins
      .filter(o => o.total >= 3 && (o.roiTone === "rose" || o.roiTone === "amber"))
      .sort((a, b) => b.noContactPct - a.noContactPct || b.total - a.total)
      .slice(0, 4)

    const lowEntryOps = speedToLeadData.ranking
      .filter(op => op.userId !== "unassigned" && op.totalFunil < Math.max(3, Math.floor(speedToLeadData.avgLeadsPerOp * 0.45)))
      .slice(0, 4)

    const topFunnelContributors = [...speedToLeadData.ranking]
      .filter(op => op.userId !== "unassigned")
      .sort((a, b) => b.totalFunil - a.totalFunil || b.totalFechado - a.totalFechado)
      .slice(0, 4)

    return {
      vipCount: vipRiskLeads.length,
      vipOperacao,
      vipProducao,
      vipSamples: vipRiskLeads.slice(0, 3),
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
      totalDuplicateClients: duplicateConflicts.length,
      bestOriginMatches,
      alertOrigins,
      lowEntryOps,
      topFunnelContributors
    }
  }, [
    isExecSummaryOpen,
    filteredTickets,
    speedToLeadData,
    stageAgingData,
    affinityMatrixData,
    riskLeadsData,
    funnelAndOriginsData,
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
          className="fixed inset-0 z-[150] overflow-hidden bg-slate-950/60 flex items-center justify-center py-4 lg:py-6 will-change-[opacity]"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isExecSummaryOpen && !stuckModalStageKey) handleClose()
          }}
        >
          <motion.div
            key="pipeline-intelligence-panel"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full lg:w-[calc(100vw-48px)] max-w-[1720px] bg-white h-full shadow-2xl flex flex-col border border-slate-200 lg:rounded-2xl overflow-hidden will-change-transform"
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
        <div className="px-6 lg:px-7 py-2.5 bg-white border-b border-slate-200 shrink-0 space-y-2">
          <div className="flex items-center gap-1.5 text-left">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2.6} />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
              Capital do Pipeline:
            </span>
            <strong className="text-sm font-black text-emerald-700 tabular-nums">
              {fmtCurrency(stageAgingData.grandTotalCapital)}
            </strong>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Card 1: ENTRADA NO FUNIL */}
            <div className="bg-gradient-to-br from-indigo-100 via-indigo-50 to-sky-100/90 border-2 border-indigo-400 rounded-xl px-3 py-2 flex flex-col justify-between shadow-xs">
              <div className="flex items-center gap-1.5 text-indigo-900">
                <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" strokeWidth={2.6} />
                <span className="text-[10px] font-black uppercase tracking-wider">Entrada no Funil</span>
              </div>
              <div className="mt-0.5">
                <div className="text-base lg:text-lg font-black text-indigo-950 leading-tight">
                  {funnelAndOriginsData.totalFunnel} leads
                </div>
              </div>
            </div>

            {/* Card 2: PARA FECHAR 1 VENDA PRECISA */}
            <div className="bg-gradient-to-br from-sky-100 via-sky-50 to-blue-100/90 border-2 border-sky-400 rounded-xl px-3 py-2 flex flex-col justify-between shadow-xs">
              <div className="flex items-center gap-1.5 text-sky-900">
                <Zap className="w-3.5 h-3.5 text-sky-600 shrink-0" strokeWidth={2.6} />
                <span className="text-[10px] font-black uppercase tracking-wider">Para fechar 1 venda precisa de:</span>
              </div>
              <div className="mt-0.5">
                <div className="text-base lg:text-lg font-black text-sky-950 leading-tight">
                  {funnelAndOriginsData.totalFechado > 0
                    ? (() => {
                        const leadsNeeded = Math.max(1, Math.round(funnelAndOriginsData.totalFunnel / funnelAndOriginsData.totalFechado))
                        return `${leadsNeeded} ${leadsNeeded === 1 ? "lead" : "leads"}`
                      })()
                    : "—"}
                </div>
              </div>
            </div>

            {/* Card 3: LEADS ÚNICOS NO PIPELINE (CPFs ÚNICOS) */}
            <div className="bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100/90 border-2 border-emerald-400 rounded-xl px-3 py-2 flex flex-col justify-between shadow-xs">
              <div className="flex items-center gap-1.5 text-emerald-900">
                <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2.6} />
                <span className="text-[10px] font-black uppercase tracking-wider">Leads Únicos no Pipeline</span>
              </div>
              <div className="mt-0.5">
                <div className="text-base lg:text-lg font-black text-emerald-950 leading-tight">
                  {stageAgingData.uniquePipelineCpfsCount}{" "}
                  {stageAgingData.uniquePipelineCpfsCount === 1 ? "CPF único" : "CPFs únicos"}
                </div>
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
              </div>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS */}
        <div className="px-6 lg:px-7 bg-white border-b border-slate-200 flex items-center gap-5 lg:gap-7 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("funnel")}
            className={cn(
              "relative group/tooltip py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap shrink-0",
              activeTab === "funnel"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <Layers className="w-4 h-4" />
            <span>1. Análise Geral</span>
            <span
              role="tooltip"
              className="pointer-events-none opacity-0 group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-1.5 z-50 w-80 rounded-lg bg-slate-900 text-white text-[11px] font-medium text-left leading-relaxed px-3 py-2 shadow-xl border border-slate-700 whitespace-normal"
            >
              Mostra a jornada completa em todas as 6 etapas do Kanban, separando leads em interação dos sem contato (Retomada), além do ROI por Origem do Cliente (margem, avanço e fechamentos) para avaliar bases compradas.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("affinity")}
            className={cn(
              "relative group/tooltip py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap shrink-0",
              activeTab === "affinity"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <Award className="w-4 h-4" />
            <span>2. Matriz de Afinidade</span>
            <span
              role="tooltip"
              className="pointer-events-none opacity-0 group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-1.5 z-50 w-80 rounded-lg bg-slate-900 text-white text-[11px] font-medium text-left leading-relaxed px-3 py-2 shadow-xl border border-slate-700 whitespace-normal"
            >
              Identifica a aptidão de cada corretor com perfis de clientes específicos. Ao rotear leads de determinados convênios ou faixas de valores financeiros para os operadores com maior taxa de conversão demonstrada, maximiza-se a receita da empresa sem aumentar o custo de aquisição.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("risk")}
            className={cn(
              "relative group/tooltip py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap shrink-0",
              activeTab === "risk"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            <Flame className="w-4 h-4 text-rose-500" />
            <span>3. Radar de Risco de Queima</span>
            {riskLeadsData.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-bold">
                {riskLeadsData.length}
              </span>
            )}
            <span
              role="tooltip"
              className="pointer-events-none opacity-0 group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100 transition-opacity duration-150 absolute right-0 sm:left-0 sm:right-auto top-full mt-1.5 z-50 w-80 rounded-lg bg-slate-900 text-white text-[11px] font-medium text-left leading-relaxed px-3 py-2 shadow-xl border border-slate-700 whitespace-normal"
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
            : cn("overflow-y-auto p-5 lg:p-6", activeTab === "affinity" && "flex flex-col")
        )}>
          {/* ============================================================== */}
          {/* ABA 1: ANÁLISE GERAL DO FUNIL (6 ETAPAS) & ORIGENS (ROI)       */}
          {/* ============================================================== */}
          {activeTab === "funnel" && (
            <div className="space-y-4">
              {/* Visão das 6 etapas do Kanban */}
              <div className="bg-white rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      Jornada do Atendimento nas 6 Etapas do Kanban
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Da entrada no funil ({funnelAndOriginsData.totalFunnel} leads) até o fechamento:{" "}
                      <strong className="text-slate-700">
                        {funnelAndOriginsData.reachedNegPct}% alcançaram negociação e {funnelAndOriginsData.funnelConvPct}% estão em Andamento / Aguardando Pagamento
                      </strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
                  {stageAgingData.stages.map(st => {
                    const colorBorderMap: Record<string, string> = {
                      amber: "border-amber-200 bg-amber-50/30",
                      indigo: "border-indigo-200 bg-indigo-50/30",
                      purple: "border-purple-200 bg-purple-50/30",
                      slate: "border-slate-200 bg-slate-50/40",
                      emerald: "border-emerald-300 bg-emerald-50/40",
                      rose: "border-rose-200 bg-rose-50/30"
                    }
                    const badgeMap: Record<string, string> = {
                      amber: "bg-amber-100 text-amber-900",
                      indigo: "bg-indigo-100 text-indigo-900",
                      purple: "bg-purple-100 text-purple-900",
                      slate: "bg-slate-200 text-slate-800",
                      emerald: "bg-emerald-100 text-emerald-900",
                      rose: "bg-rose-100 text-rose-900"
                    }
                    return (
                      <div
                        key={st.key}
                        className={cn(
                          "border-2 rounded-xl p-3 flex flex-col justify-between shadow-2xs",
                          colorBorderMap[st.color] || "border-slate-200 bg-white"
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <span className="text-[12.5px] font-bold text-slate-900 leading-tight block">{st.label}</span>
                            </div>
                            <span className={cn("px-1.5 py-0.5 rounded-md text-[11px] font-black shrink-0", badgeMap[st.color])}>
                              {st.count} ({st.sharePct}%)
                            </span>
                          </div>

                          {st.key === "EM RETOMADA" && (
                            <div className="mt-2 p-2 rounded-lg bg-white border border-amber-200/80 space-y-1 text-[11.5px]">
                              <div className="flex items-center justify-between">
                                <span className="text-sky-700 font-semibold">Em interação:</span>
                                <span className="font-black text-sky-800">{st.emInteracaoCount}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-amber-700 font-semibold">Retomada (s/ contato):</span>
                                <span className="font-black text-amber-800">{st.emRetomadaNoContactCount}</span>
                              </div>
                            </div>
                          )}

                          <div className="mt-2 pt-2 border-t border-slate-200/70 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Operação:</span>
                              <span className="font-black text-emerald-700">{fmtCurrency(st.totalOperacao)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Produção:</span>
                              <span className="font-black text-sky-600">{fmtCurrency(st.totalProducao)}</span>
                            </div>
                            {st.key !== "FECHADO" && st.key !== "PERDIDO" && (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Com margem:</span>
                                  <span className="font-bold text-slate-800">{st.marginPct}%</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-slate-500 shrink-0">Permanência:</span>
                                  <span className="font-bold text-slate-700 text-right">
                                    {fmtDaysAndHours(st.avgHours)}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[11px] space-y-1 text-slate-600">
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between text-orange-700 font-bold">
                              <span>Alto &gt;30k:</span>
                              <span className="tabular-nums">{st.ticketsByTier.high.count}</span>
                            </div>
                            <div className="flex items-center justify-between text-orange-500 font-bold">
                              <span>Médio 10k - 30k:</span>
                              <span className="tabular-nums">{st.ticketsByTier.mid.count}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700 font-bold">
                              <span>Baixo &lt;10k:</span>
                              <span className="tabular-nums">{st.ticketsByTier.low.count}</span>
                            </div>
                          </div>
                          {st.key === "PERDIDO" && st.topLossReason ? (
                            <div className="text-[11px] text-rose-700 font-semibold truncate pt-0.5" title={st.topLossReason.label}>
                              Motivo: {st.topLossReason.label} ({st.topLossReason.count})
                            </div>
                          ) : st.key !== "FECHADO" && st.key !== "PERDIDO" && st.stuckCount48h > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setStuckModalSearch("")
                                setStuckModalStageKey(st.key)
                              }}
                              className="w-full text-left text-[11px] text-amber-700 hover:text-amber-900 font-bold pt-0.5 hover:underline cursor-pointer transition-colors"
                              title="Clique para ver a lista de atendimentos parados há mais de 48 horas"
                            >
                              ⚠ {st.stuckCount48h} {st.stuckCount48h === 1 ? "parado" : "parados"} há mais de 48 horas
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Origens por Momento do Funil (6 cards com barras horizontais) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* 1. Origens em Interação */}
                <div className="bg-white border border-sky-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="text-[11.5px] font-black uppercase text-sky-800 flex items-center justify-between">
                    <span>Origens em Interação</span>
                    <span className="text-sky-600">{funnelAndOriginsData.totalEmInteracao} leads</span>
                  </div>
                  {funnelAndOriginsData.topOriginsInInteracao.length === 0 ? (
                    <p className="text-xs text-slate-400 italic mt-2">Nenhum lead marcado em interação no topo no momento.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {(() => {
                        const maxVal = Math.max(1, ...funnelAndOriginsData.topOriginsInInteracao.map(i => i.emInteracao))
                        return funnelAndOriginsData.topOriginsInInteracao.map(o => {
                          const barWidth = Math.max(4, Math.round((o.emInteracao / maxVal) * 100))
                          return (
                            <div key={`int-${o.key}`} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-800 truncate pr-2" title={o.label}>{o.label}</span>
                                <span className="font-bold text-sky-700 shrink-0 tabular-nums">{o.emInteracao} leads</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>

                {/* 2. Origens sem Contato (Retomada) */}
                <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="text-[11.5px] font-black uppercase text-amber-800 flex items-center justify-between">
                    <span>Origens sem Contato (Retomada)</span>
                    <span className="text-amber-600">{funnelAndOriginsData.totalEmRetomadaSemContato} leads</span>
                  </div>
                  {funnelAndOriginsData.topOriginsInRetomada.length === 0 ? (
                    <p className="text-xs text-slate-400 italic mt-2">Nenhum lead pendente de primeiro contato em retomada.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {(() => {
                        const maxVal = Math.max(1, ...funnelAndOriginsData.topOriginsInRetomada.map(i => i.emRetomadaSemContato))
                        return funnelAndOriginsData.topOriginsInRetomada.map(o => {
                          const barWidth = Math.max(4, Math.round((o.emRetomadaSemContato / maxVal) * 100))
                          return (
                            <div key={`ret-${o.key}`} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-800 truncate pr-2" title={o.label}>{o.label}</span>
                                <span className="font-bold text-amber-700 shrink-0 tabular-nums">{o.emRetomadaSemContato} ({o.noContactPct}%)</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>

                {/* 3. Origens em Negociação */}
                <div className="bg-white border border-indigo-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="text-[11.5px] font-black uppercase text-indigo-800 flex items-center justify-between">
                    <span>Origens em Negociação</span>
                    <span className="text-indigo-600">{funnelAndOriginsData.totalEmNegociacaoAtual} leads</span>
                  </div>
                  {funnelAndOriginsData.topOriginsInNegociacao.length === 0 ? (
                    <p className="text-xs text-slate-400 italic mt-2">Nenhum lead atualmente em negociação neste recorte.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {(() => {
                        const maxVal = Math.max(1, ...funnelAndOriginsData.topOriginsInNegociacao.map(i => i.emNegociacaoAtual))
                        return funnelAndOriginsData.topOriginsInNegociacao.map(o => {
                          const barWidth = Math.max(4, Math.round((o.emNegociacaoAtual / maxVal) * 100))
                          return (
                            <div key={`neg-${o.key}`} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-800 truncate pr-2" title={o.label}>{o.label}</span>
                                <span className="font-bold text-indigo-700 shrink-0 tabular-nums">{o.emNegociacaoAtual} ativos • {o.fechado} ADEs</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>

                {/* 4. Origens em Sem Interesse */}
                <div className="bg-white border border-slate-300 rounded-xl p-3.5 shadow-2xs">
                  <div className="text-[11.5px] font-black uppercase text-slate-800 flex items-center justify-between">
                    <span>Origens em Sem Interesse</span>
                    <span className="text-slate-600">{funnelAndOriginsData.totalSemInteresse} leads</span>
                  </div>
                  {funnelAndOriginsData.topOriginsInSemInteresse.length === 0 ? (
                    <p className="text-xs text-slate-400 italic mt-2">Nenhum lead marcado como sem interesse neste recorte.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {(() => {
                        const maxVal = Math.max(1, ...funnelAndOriginsData.topOriginsInSemInteresse.map(i => i.semInteresse))
                        const stageTotal = Math.max(1, funnelAndOriginsData.totalSemInteresse)
                        return funnelAndOriginsData.topOriginsInSemInteresse.map(o => {
                          const barWidth = Math.max(4, Math.round((o.semInteresse / maxVal) * 100))
                          const shareStagePct = Math.round((o.semInteresse / stageTotal) * 100)
                          return (
                            <div key={`sint-${o.key}`} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-800 truncate pr-2" title={o.label}>{o.label}</span>
                                <span className="font-bold text-slate-700 shrink-0 tabular-nums">{o.semInteresse} ({shareStagePct}%)</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-slate-500 transition-all" style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>

                {/* 5. Origens em Fechado */}
                <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="text-[11.5px] font-black uppercase text-emerald-800 flex items-center justify-between">
                    <span>Origens em Fechado</span>
                    <span className="text-emerald-600">{funnelAndOriginsData.totalFechado} leads</span>
                  </div>
                  {funnelAndOriginsData.topOriginsInFechado.length === 0 ? (
                    <p className="text-xs text-slate-400 italic mt-2">Nenhum atendimento fechado neste recorte.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {(() => {
                        const maxVal = Math.max(1, ...funnelAndOriginsData.topOriginsInFechado.map(i => i.fechado))
                        const stageTotal = Math.max(1, funnelAndOriginsData.totalFechado)
                        return funnelAndOriginsData.topOriginsInFechado.map(o => {
                          const barWidth = Math.max(4, Math.round((o.fechado / maxVal) * 100))
                          const shareStagePct = Math.round((o.fechado / stageTotal) * 100)
                          return (
                            <div key={`fec-${o.key}`} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-800 truncate pr-2" title={o.label}>{o.label}</span>
                                <span className="font-bold text-emerald-700 shrink-0 tabular-nums">{o.fechado} ({shareStagePct}%)</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>

                {/* 6. Origens em Perdido */}
                <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="text-[11.5px] font-black uppercase text-rose-800 flex items-center justify-between">
                    <span>Origens em Perdido</span>
                    <span className="text-rose-600">{funnelAndOriginsData.totalPerdido} leads</span>
                  </div>
                  {funnelAndOriginsData.topOriginsInPerdido.length === 0 ? (
                    <p className="text-xs text-slate-400 italic mt-2">Nenhum atendimento perdido neste recorte.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {(() => {
                        const maxVal = Math.max(1, ...funnelAndOriginsData.topOriginsInPerdido.map(i => i.perdido))
                        const stageTotal = Math.max(1, funnelAndOriginsData.totalPerdido)
                        return funnelAndOriginsData.topOriginsInPerdido.map(o => {
                          const barWidth = Math.max(4, Math.round((o.perdido / maxVal) * 100))
                          const shareStagePct = Math.round((o.perdido / stageTotal) * 100)
                          return (
                            <div key={`per-${o.key}`} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-800 truncate pr-2" title={o.label}>{o.label}</span>
                                <span className="font-bold text-rose-700 shrink-0 tabular-nums">{o.perdido} ({shareStagePct}%)</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Tabela Gerencial Completa por Origem do Cliente (ROI das Listas) */}
              <div className="bg-white border-2 border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/95 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    Auditoria de Origens do Cliente — Qualidade de Contato, Margem e Retorno sobre Investimento
                  </h3>
                  <span className="text-xs text-slate-500">
                    {funnelAndOriginsData.origins.length} origens identificadas
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-[13px]">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase text-[11px] font-bold">
                      <tr>
                        <th className="px-3 py-2 bg-slate-100 border-b border-r border-slate-200">Origem do Cliente</th>
                        <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Entraram</th>
                        <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Em Interação</th>
                        <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Retomada (s/ contato)</th>
                        <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Em Negociação</th>
                        <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Em Reativação</th>
                        <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Sem Interesse</th>
                        <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Fechado</th>
                        <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Perdidos</th>
                        <th className="px-3 py-2 bg-slate-100 border-b border-slate-200">Parecer do Shark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnelAndOriginsData.origins.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                            Nenhum lead encontrado para os filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        funnelAndOriginsData.origins.map(o => {
                          const toneClass: Record<string, string> = {
                            emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
                            sky: "bg-sky-50 text-sky-800 border-sky-200",
                            amber: "bg-amber-50 text-amber-800 border-amber-200",
                            rose: "bg-rose-50 text-rose-800 border-rose-200",
                            slate: "bg-slate-100 text-slate-700 border-slate-200"
                          }
                          return (
                            <tr key={o.key} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-3 py-2 font-bold text-slate-900 border-b border-r border-slate-200 max-w-[200px]">
                                <div className="truncate" title={o.label}>{o.label}</div>
                                <div className="text-[11px] text-slate-800 font-normal">
                                  {o.sharePct}% do funil • {fmtCurrency(o.operacaoTotal)}
                                </div>
                              </td>
                              <td className="px-2.5 py-2 text-center font-bold text-slate-900 border-b border-r border-slate-200 tabular-nums">
                                {o.total}
                              </td>
                              <td className="px-2.5 py-2 text-center font-semibold text-sky-700 border-b border-r border-slate-200 tabular-nums">
                                {o.emInteracao}
                              </td>
                              <td className="px-2.5 py-2 text-center border-b border-r border-slate-200 tabular-nums">
                                <span className={cn("font-semibold", o.noContactPct >= 60 ? "text-amber-700" : "text-slate-700")}>
                                  {o.emRetomadaSemContato}
                                </span>
                              </td>
                              <td className="px-2.5 py-2 text-center border-b border-r border-slate-200 tabular-nums">
                                <span className="font-bold text-indigo-700">{o.emNegociacaoAtual}</span>
                              </td>
                              <td className="px-2.5 py-2 text-center text-slate-600 border-b border-r border-slate-200 tabular-nums">
                                {o.emReativacao}
                              </td>
                              <td className="px-2.5 py-2 text-center text-slate-600 border-b border-r border-slate-200 tabular-nums">
                                {o.semInteresse}
                              </td>
                              <td className="px-2.5 py-2 text-center border-b border-r border-slate-200 tabular-nums">
                                <span className={cn("font-black", o.fechado > 0 ? "text-emerald-700" : "text-slate-400")}>
                                  {o.fechado}
                                </span>
                                {o.producaoFechada > 0 && (
                                  <span className="block text-[11px] font-semibold text-sky-600">{fmtCurrency(o.producaoFechada)}</span>
                                )}
                              </td>
                              <td className="px-2.5 py-2 text-center border-b border-r border-slate-200 tabular-nums">
                                <span className={cn("font-semibold", o.lossPct >= 50 ? "text-rose-600" : "text-slate-600")}>
                                  {o.perdido}
                                </span>
                              </td>
                              <td className="px-3 py-2 border-b border-slate-200 min-w-[260px] max-w-[320px]">
                                {o.leadsPerFechado !== null ? (
                                  <span className="text-[11.5px] leading-snug text-slate-700 font-medium block">
                                    A <strong className="text-slate-900">{o.label}</strong> se mostrou necessário colocar aproximadamente{" "}
                                    <strong className="text-emerald-700 tabular-nums">{o.leadsPerFechado}</strong>{" "}
                                    {o.leadsPerFechado === 1 ? "lead" : "leads"} para dentro do funil para fechar 1 venda.
                                  </span>
                                ) : (
                                  <span className="text-[11.5px] leading-snug text-slate-500 block">
                                    A <strong className="text-slate-700">{o.label}</strong> ainda não fechou vendas ({o.total}{" "}
                                    {o.total === 1 ? "lead entrou" : "leads entraram"} no funil).
                                  </span>
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

              {/* Tabela Auditoria por Corretor / Estagiário */}
              {(() => {
                const filteredTeamRanking = speedToLeadData.ranking
                  .filter(op => {
                    if (teamRoleFilter === "all") return true
                    return op.roleType === teamRoleFilter
                  })
                  .sort((a, b) => b.totalFunil - a.totalFunil || b.totalFechado - a.totalFechado)

                return (
                  <div className="bg-white border-2 border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/95 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-indigo-600" />
                          Auditoria por Corretor / Estagiário
                        </h3>
                        <div className="inline-flex items-center rounded-lg bg-slate-200/70 p-0.5 border border-slate-200">
                          {([
                            { id: "all", label: "Todos" },
                            { id: "corretor", label: "Corretores" },
                            { id: "estagiario", label: "Estagiários" }
                          ] as const).map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setTeamRoleFilter(opt.id)}
                              className={cn(
                                "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                                teamRoleFilter === opt.id
                                  ? "bg-white text-indigo-700 shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">
                        {filteredTeamRanking.length} colaboradores identificados
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-[13px]">
                        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase text-[11px] font-bold">
                          <tr>
                            <th className="px-3 py-2 bg-slate-100 border-b border-r border-slate-200">Corretor / Estagiário</th>
                            <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Entraram</th>
                            <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Em Interação</th>
                            <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Retomada (s/ contato)</th>
                            <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Em Negociação</th>
                            <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Em Reativação</th>
                            <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Sem Interesse</th>
                            <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Fechado</th>
                            <th className="px-2.5 py-2 text-center bg-slate-100 border-b border-r border-slate-200">Perdidos</th>
                            <th className="px-3 py-2 bg-slate-100 border-b border-slate-200">Parecer do Shark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTeamRanking.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                                Nenhum atendimento encontrado para os filtros aplicados.
                              </td>
                            </tr>
                          ) : (
                            filteredTeamRanking.map(op => (
                              <tr key={op.userId} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3 py-2 font-bold text-slate-900 border-b border-r border-slate-200 max-w-[200px]">
                                  <div className="truncate" title={op.userName}>{op.userName}</div>
                                  <div className="text-[11px] text-slate-800 font-normal">
                                    {op.roleLabel} • {op.sharePct}% do funil • {fmtCurrency(op.operacaoTotal)}
                                  </div>
                                </td>
                                <td className="px-2.5 py-2 text-center font-bold text-slate-900 border-b border-r border-slate-200 tabular-nums">
                                  {op.totalFunil}
                                </td>
                                <td className="px-2.5 py-2 text-center font-semibold text-sky-700 border-b border-r border-slate-200 tabular-nums">
                                  {op.emInteracao}
                                </td>
                                <td className="px-2.5 py-2 text-center border-b border-r border-slate-200 tabular-nums">
                                  <span className={cn("font-semibold", op.noContactPct >= 60 ? "text-amber-700" : "text-slate-700")}>
                                    {op.emRetomadaSemContato}
                                  </span>
                                </td>
                                <td className="px-2.5 py-2 text-center border-b border-r border-slate-200 tabular-nums">
                                  <span className="font-bold text-indigo-700">{op.emNegociacaoAtual}</span>
                                </td>
                                <td className="px-2.5 py-2 text-center text-slate-600 border-b border-r border-slate-200 tabular-nums">
                                  {op.emReativacao}
                                </td>
                                <td className="px-2.5 py-2 text-center text-slate-600 border-b border-r border-slate-200 tabular-nums">
                                  {op.semInteresse}
                                </td>
                                <td className="px-2.5 py-2 text-center border-b border-r border-slate-200 tabular-nums">
                                  <span className={cn("font-black", op.totalFechado > 0 ? "text-emerald-700" : "text-slate-400")}>
                                    {op.totalFechado}
                                  </span>
                                  {op.producaoFechada > 0 && (
                                    <span className="block text-[11px] font-semibold text-sky-600">{fmtCurrency(op.producaoFechada)}</span>
                                  )}
                                </td>
                                <td className="px-2.5 py-2 text-center border-b border-r border-slate-200 tabular-nums">
                                  <span className={cn("font-semibold", op.lossPct >= 50 ? "text-rose-600" : "text-slate-600")}>
                                    {op.totalPerdido}
                                  </span>
                                </td>
                                <td className="px-3 py-2 border-b border-slate-200 min-w-[260px] max-w-[320px]">
                                  {op.leadsPerFechado !== null ? (
                                    <span className="text-[11.5px] leading-snug text-slate-700 font-medium block">
                                      Para <strong className="text-slate-900">{op.userName}</strong> se mostrou necessário colocar aproximadamente{" "}
                                      <strong className="text-emerald-700 tabular-nums">{op.leadsPerFechado}</strong>{" "}
                                      {op.leadsPerFechado === 1 ? "lead" : "leads"} para dentro do funil para fechar 1 venda.
                                    </span>
                                  ) : (
                                    <span className="text-[11.5px] leading-snug text-slate-500 block">
                                      <strong className="text-slate-700">{op.userName}</strong> ainda não fechou vendas ({op.totalFunil}{" "}
                                      {op.totalFunil === 1 ? "lead entrou" : "leads entraram"} no funil).
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* Alerta de Leads Parados > 48h com atalho direto pro Radar */}
              {stageAgingData.grandTotalStuck48hCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <p className="text-[13px] text-amber-900">
                      Existem <strong>{stageAgingData.grandTotalStuck48hCount} leads ativos</strong> parados há mais de 48h nas etapas sem avanço na cadência.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("risk")}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[13px] font-bold transition-all shrink-0 cursor-pointer shadow-xs"
                  >
                    Auditar no Radar de Risco
                  </button>
                </div>
              )}
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

        {/* MODAL RESUMO EXECUTIVO — MENTOR CONVERSACIONAL DO GESTOR */}
        <AnimatePresence>
          {isExecSummaryOpen && executiveSummaryData && (() => {
            const periodLabelMap: Record<PeriodFilter, string> = {
              today: "hoje",
              "7d": "nos últimos 7 dias",
              "15d": "nos últimos 15 dias",
              "30d": "nos últimos 30 dias",
              month: "no mês atual",
              all: "em todo o histórico completo"
            }
            const periodText = periodLabelMap[period]
            const scopeDetails: string[] = []
            if (selectedConvenios.length > 0) {
              scopeDetails.push(selectedConvenios.length === 1 ? `convênio ${selectedConvenios[0]}` : `${selectedConvenios.length} convênios selecionados`)
            }
            if (selectedOperators.length > 0) {
              scopeDetails.push(selectedOperators.length === 1 ? "1 colaborador filtrado" : `${selectedOperators.length} colaboradores filtrados`)
            }
            const scopeSuffix = scopeDetails.length > 0 ? ` (${scopeDetails.join(" • ")})` : ""

            const totalFunnelSafe = Math.max(1, funnelAndOriginsData.totalFunnel)
            const funnelVisualSlices = [
              { key: "interacao", label: "Em interação", count: funnelAndOriginsData.totalEmInteracao, color: "bg-sky-500", dot: "bg-sky-500", text: "text-sky-700" },
              { key: "retomada", label: "Retomada (s/ contato)", count: funnelAndOriginsData.totalEmRetomadaSemContato, color: "bg-amber-400", dot: "bg-amber-400", text: "text-amber-700" },
              { key: "negociacao", label: "Em negociação", count: funnelAndOriginsData.totalEmNegociacaoAtual, color: "bg-indigo-500", dot: "bg-indigo-500", text: "text-indigo-700" },
              { key: "reativacao", label: "Em reativação", count: funnelAndOriginsData.totalReativacao, color: "bg-purple-500", dot: "bg-purple-500", text: "text-purple-700" },
              { key: "seminteresse", label: "Sem interesse", count: funnelAndOriginsData.totalSemInteresse, color: "bg-slate-400", dot: "bg-slate-400", text: "text-slate-600" },
              { key: "fechado", label: "Fechado (ADEs)", count: funnelAndOriginsData.totalFechado, color: "bg-emerald-500", dot: "bg-emerald-500", text: "text-emerald-700" },
              { key: "perdido", label: "Perdido", count: funnelAndOriginsData.totalPerdido, color: "bg-rose-500", dot: "bg-rose-500", text: "text-rose-700" }
            ]

            const topOriginsChart = funnelAndOriginsData.origins.slice(0, 5)
            const maxOriginCount = Math.max(1, ...topOriginsChart.map(o => o.total))
            const topTeamChart = speedToLeadData.ranking.filter(op => op.userId !== "unassigned").slice(0, 5)
            const maxTeamFunil = Math.max(1, ...topTeamChart.map(op => op.totalFunil))

            return (
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
                  className="w-full max-w-5xl xl:max-w-[1140px] max-h-full bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Resumo Executivo"
                >
                  {/* Cabeçalho */}
                  <div className="px-6 lg:px-8 py-4 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-amber-300" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                          Resumo Executivo
                        </h3>
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

                  {/* Corpo Conversacional com Gráficos, Amostras e Orientações */}
                  <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-6 space-y-6 bg-slate-50/70 text-slate-800">
                    {/* CARTA DE ABERTURA DO MENTOR */}
                    <div className="bg-white border border-indigo-200 rounded-2xl p-5 lg:p-6 shadow-2xs space-y-3.5">
                      <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        {loggedUserName},
                      </div>
                      <p className="text-[13px] sm:text-sm text-slate-700 leading-relaxed">
                        Analisando tudo o que entrou e circulou pelo pipeline <strong className="text-slate-900">{periodText}{scopeSuffix}</strong>, sua equipe movimentou{" "}
                        <strong className="text-indigo-700">{funnelAndOriginsData.totalFunnel} atendimentos</strong>, sendo que{" "}
                        <strong className="text-slate-900">{funnelAndOriginsData.withMarginPct}% dos leads</strong> chegaram com margem financeira viável para operação.
                        Dessa base, <strong className="text-slate-900">{funnelAndOriginsData.totalAlcanceNegociacao} clientes ({funnelAndOriginsData.reachedNegPct}%)</strong> avançaram até a etapa de negociação e{" "}
                        <strong className="text-emerald-700">{funnelAndOriginsData.totalFechado} viraram ADEs fechadas</strong> — uma conversão de{" "}
                        <strong className="text-emerald-700">{funnelAndOriginsData.funnelConvPct}% sobre todo o funil</strong> (e{" "}
                        <strong>{funnelAndOriginsData.negToAdePct}%</strong> sobre quem entrou em negociação), somando{" "}
                        <strong className="text-emerald-700">{fmtCurrency(funnelAndOriginsData.totalProducaoFechada)}</strong> em produção fechada
                        {funnelAndOriginsData.totalOperacaoFechada > 0 ? ` (${fmtCurrency(funnelAndOriginsData.totalOperacaoFechada)} em operação)` : ""}.
                      </p>
                      <p className="text-[13px] sm:text-sm text-slate-700 leading-relaxed">
                        Neste momento, ainda existem <strong className="text-emerald-700">{fmtCurrency(stageAgingData.grandTotalCapital)}</strong> em operação ativos dentro de casa, com potencial de{" "}
                        <strong className="text-sky-600">{fmtCurrency(stageAgingData.grandTotalProducao)} em produção estimada</strong>. Quando a equipe fecha uma proposta, o tempo médio entre iniciar a negociação e gerar a ADE está em{" "}
                        <strong className="text-slate-900">{fmtDurationShort(speedToLeadData.generalAvgMinutes)}</strong>.
                      </p>

                      {/* RAIO-X GRÁFICO DO FUNIL (6 ETAPAS + QUEBRA DE CONTATO) */}
                      <div className="pt-3 border-t border-slate-100 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <BarChart3 className="w-4 h-4 text-indigo-600" />
                            Raio-X Visual da Jornada ({funnelAndOriginsData.totalFunnel} leads distribuídos nas etapas)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Passe o foco pelas cores para comparar onde o volume está concentrado
                          </span>
                        </div>
                        <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
                          {funnelVisualSlices.map(slice => {
                            if (slice.count <= 0) return null
                            const pct = (slice.count / totalFunnelSafe) * 100
                            return (
                              <div
                                key={slice.key}
                                title={`${slice.label}: ${slice.count} leads (${Math.round(pct)}%)`}
                                className={cn("h-full transition-all", slice.color)}
                                style={{ width: `${Math.max(pct, 1.5)}%` }}
                              />
                            )
                          })}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                          {funnelVisualSlices.map(slice => (
                            <span key={`leg-${slice.key}`} className="inline-flex items-center gap-1.5 text-slate-700">
                              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", slice.dot)} />
                              <span>{slice.label}:</span>
                              <strong className={slice.text}>
                                {slice.count} ({Math.round((slice.count / totalFunnelSafe) * 100)}%)
                              </strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO 1 & 2: PONTOS POSITIVOS vs PONTOS NEGATIVOS / ATENÇÃO */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* PONTOS POSITIVOS */}
                      <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-2xs space-y-3.5">
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-emerald-100">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                            <h4 className="text-xs font-black uppercase tracking-wide text-emerald-900">
                              Pontos Positivos — O que está funcionando
                            </h4>
                          </div>
                        </div>

                        <div className="space-y-3 text-[12.5px] text-slate-700 leading-relaxed">
                          <p>
                            • <strong>Contato no topo e força de negociação:</strong>{" "}
                            {funnelAndOriginsData.totalEmInteracao > 0 ? (
                              <>
                                temos <strong className="text-sky-700">{funnelAndOriginsData.totalEmInteracao} leads interagindo ativamente</strong> na entrada do funil ({funnelAndOriginsData.interacaoPct}% dos que estão na etapa inicial)
                                {funnelAndOriginsData.topOriginsInInteracao[0] ? `, puxados principalmente pela origem ${funnelAndOriginsData.topOriginsInInteracao[0].label}` : ""}.
                              </>
                            ) : (
                              <>
                                {funnelAndOriginsData.totalAlcanceNegociacao} leads avançaram para negociação direta ({funnelAndOriginsData.reachedNegPct}% da base).
                              </>
                            )}
                          </p>

                          {(executiveSummaryData.volumeLeader || executiveSummaryData.fastestOp || executiveSummaryData.topFunnelContributors[0]) && (
                            <p>
                              • <strong>Destaques do time:</strong>{" "}
                              {executiveSummaryData.volumeLeader && (
                                <>
                                  <strong>{executiveSummaryData.volumeLeader.userName}</strong> lidera os fechamentos com{" "}
                                  <strong className="text-emerald-700">{executiveSummaryData.volumeLeader.totalPropostasDigitadas} ADEs</strong> ({executiveSummaryData.volumeLeader.negConvRate}% de conversão em negociação).{" "}
                                </>
                              )}
                              {executiveSummaryData.fastestOp && (
                                <>
                                  Na velocidade, <strong>{executiveSummaryData.fastestOp.userName}</strong> é a referência levando apenas{" "}
                                  <strong className="text-emerald-700">{fmtDurationShort(executiveSummaryData.fastestOp.avgMinutesToAde)}</strong> até gerar a ADE.{" "}
                                </>
                              )}
                              {executiveSummaryData.topFunnelContributors[0] && (
                                <>
                                  Já <strong>{executiveSummaryData.topFunnelContributors[0].userName}</strong> foi quem mais abasteceu o funil ({executiveSummaryData.topFunnelContributors[0].totalFunil} leads).
                                </>
                              )}
                            </p>
                          )}

                          {executiveSummaryData.bestOriginMatches.length > 0 ? (
                            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 space-y-1.5">
                              <div className="text-[10.5px] font-black uppercase text-emerald-800">
                                Origens que estão pagando o investimento:
                              </div>
                              {executiveSummaryData.bestOriginMatches.slice(0, 3).map(o => (
                                <div key={`pos-orig-${o.key}`} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="truncate">
                                    <strong>{o.label}</strong> ({o.total} leads • {o.marginPct}% c/ margem)
                                  </span>
                                  <span className="font-bold text-emerald-700 shrink-0">
                                    {o.fechado} ADEs ({o.convPct}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p>• <strong>Origens em maturação:</strong> continue acompanhando as novas listas para consolidar quais entregam mais ADEs por real investido.</p>
                          )}

                          {executiveSummaryData.bestConvenioMatches.length > 0 && (
                            <p>
                              • <strong>Afinidade comprovada na roleta:</strong>{" "}
                              {executiveSummaryData.bestConvenioMatches.slice(0, 2).map((m, idx) => (
                                <span key={`aff-pos-${m.convenio}-${m.userName}`}>
                                  {idx > 0 ? " e " : ""}
                                  <strong>{m.userName}</strong> em <strong>{m.convenio}</strong> ({m.rate}% em {m.total} negociações)
                                </span>
                              ))}
                              {executiveSummaryData.bestHighTierMatch && (
                                <>
                                  {" "}— e <strong>{executiveSummaryData.bestHighTierMatch.userName}</strong> performa melhor em tickets acima de 30k ({executiveSummaryData.bestHighTierMatch.rate}%).
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* PONTOS NEGATIVOS & ATENÇÃO */}
                      <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-2xs space-y-3.5">
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-rose-100">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                            <h4 className="text-xs font-black uppercase tracking-wide text-rose-900">
                              Pontos Negativos &amp; O que precisa de atenção
                            </h4>
                          </div>
                        </div>

                        <div className="space-y-3 text-[12.5px] text-slate-700 leading-relaxed">
                          <p>
                            • <strong>Gargalo de contato &amp; perdas:</strong>{" "}
                            ainda temos <strong className="text-amber-700">{funnelAndOriginsData.totalEmRetomadaSemContato} leads sem resposta em Retomada</strong>
                            {funnelAndOriginsData.topOriginsInRetomada[0] ? ` (maior volume vindo de ${funnelAndOriginsData.topOriginsInRetomada[0].label})` : ""}, além de{" "}
                            <strong className="text-purple-700">{funnelAndOriginsData.totalReativacao} em reativação</strong> e{" "}
                            <strong className="text-rose-700">{funnelAndOriginsData.totalPerdido} atendimentos perdidos</strong>.
                          </p>

                          {executiveSummaryData.alertOrigins.length > 0 && (
                            <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 space-y-1.5">
                              <div className="text-[10.5px] font-black uppercase text-rose-800">
                                Cuidado ao investir nestas origens (baixo contato/margem):
                              </div>
                              {executiveSummaryData.alertOrigins.slice(0, 3).map(o => (
                                <div key={`neg-orig-${o.key}`} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="truncate">
                                    <strong>{o.label}</strong> ({o.total} leads • {o.marginPct}% margem)
                                  </span>
                                  <span className="font-semibold text-rose-700 shrink-0 text-[11px]">
                                    {o.roiVerdict}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <p>
                            • <strong>Risco de queima (&gt;48h sem avanço):</strong>{" "}
                            há <strong className="text-rose-700">{stageAgingData.grandTotalStuck48hCount} leads ativos ({executiveSummaryData.stuckBasePct}% da base)</strong> parados há mais de 2 dias. Entre eles,{" "}
                            <strong className="text-orange-700">{executiveSummaryData.vipCount} são clientes VIP (&gt;30k)</strong> que somam{" "}
                            <strong className="text-sky-700">{fmtCurrency(executiveSummaryData.vipProducao)} em produção estimada</strong>
                            {executiveSummaryData.topVipStage ? `, concentrados principalmente em ${executiveSummaryData.topVipStage.label}` : ""}.
                          </p>

                          {(executiveSummaryData.lowEntryOps.length > 0 || executiveSummaryData.bottleneckOps.length > 0) && (
                            <p>
                              • <strong>Desequilíbrio na equipe:</strong>{" "}
                              {executiveSummaryData.lowEntryOps.length > 0 && (
                                <>
                                  {executiveSummaryData.lowEntryOps.slice(0, 2).map((op, i) => (
                                    <span key={`low-txt-${op.userId}`}>
                                      {i > 0 ? ", " : ""}
                                      <strong>{op.userName}</strong> ({op.totalFunil} leads)
                                    </span>
                                  ))}{" "}
                                  estão colocando menos leads no funil do que a média da operação ({speedToLeadData.avgLeadsPerOp} leads/pessoa).{" "}
                                </>
                              )}
                              {executiveSummaryData.bottleneckOps.length > 0 && (
                                <>
                                  Em velocidade/conversão, vale acompanhar de perto{" "}
                                  {executiveSummaryData.bottleneckOps.slice(0, 2).map((op, i) => (
                                    <span key={`bn-txt-${op.userId}`}>
                                      {i > 0 ? " e " : ""}
                                      <strong>{op.userName}</strong> ({op.convRate}% avanço, SLA {fmtDurationShort(op.avgMinutesToAde)})
                                    </span>
                                  ))}.
                                </>
                              )}
                            </p>
                          )}

                          {executiveSummaryData.wasteMatches.length > 0 && (
                            <p>
                              • <strong>Desperdício de roleta:</strong> evite direcionar{" "}
                              {executiveSummaryData.wasteMatches.slice(0, 2).map((w, i) => (
                                <span key={`w-txt-${w.userName}-${w.convenio}`}>
                                  {i > 0 ? " ou " : ""}
                                  <strong>{w.convenio}</strong> para <strong>{w.userName}</strong> ({w.rate}% em {w.total} leads)
                                </span>
                              ))}.
                            </p>
                          )}

                          {executiveSummaryData.totalDuplicateClients > 0 && (
                            <p>
                              • <strong>Higienização de carteira:</strong> existem{" "}
                              <strong className="text-rose-700">{executiveSummaryData.totalDuplicateClients} CPFs duplicados</strong> em cards ativos ao mesmo tempo — risco de dois colaboradores abordarem o mesmo cliente.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO 3: GRÁFICOS COMPARATIVOS (ORIGENS & EQUIPE) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Gráfico de Origens */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wide text-slate-900">
                              Principais Origens de Leads
                            </h4>
                            <p className="text-[11px] text-slate-500">Volume no funil, % com margem viável e ADEs convertidas</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("funnel")
                              setIsExecSummaryOpen(false)
                            }}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
                          >
                            <span>Ver todas</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        {topOriginsChart.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-4">Sem dados de origem neste filtro.</p>
                        ) : (
                          <div className="space-y-2.5 pt-1">
                            {topOriginsChart.map(o => {
                              const barWidth = Math.max(6, Math.round((o.total / maxOriginCount) * 100))
                              const adeWidth = o.total > 0 ? Math.round((o.fechado / maxOriginCount) * 100) : 0
                              return (
                                <div key={`chart-orig-${o.key}`} className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-slate-800 truncate pr-2" title={o.label}>{o.label}</span>
                                    <span className="text-slate-600 shrink-0 tabular-nums">
                                      <strong>{o.total}</strong> leads • <span className="text-sky-700 font-semibold">{o.marginPct}% margem</span> •{" "}
                                      <strong className="text-emerald-700">{o.fechado} ADEs ({o.convPct}%)</strong>
                                    </span>
                                  </div>
                                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden relative border border-slate-200/80">
                                    <div className="h-full bg-indigo-200 rounded-full" style={{ width: `${barWidth}%` }} />
                                    {adeWidth > 0 && (
                                      <div className="h-full bg-emerald-500 rounded-full absolute left-0 top-0" style={{ width: `${Math.max(adeWidth, 3)}%` }} />
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Gráfico de Equipe */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wide text-slate-900">
                              Produção da Equipe
                            </h4>
                            <p className="text-[11px] text-slate-500">Leads colocados no funil vs propostas fechadas (ADE)</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("funnel")
                              setIsExecSummaryOpen(false)
                            }}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
                          >
                            <span>Auditar equipe</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        {topTeamChart.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-4">Sem operadores atribuídos neste filtro.</p>
                        ) : (
                          <div className="space-y-2.5 pt-1">
                            {topTeamChart.map(op => {
                              const funilWidth = Math.max(6, Math.round((op.totalFunil / maxTeamFunil) * 100))
                              const adeWidth = op.totalPropostasDigitadas > 0 ? Math.round((op.totalPropostasDigitadas / maxTeamFunil) * 100) : 0
                              return (
                                <div key={`chart-op-${op.userId}`} className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-slate-800 truncate pr-2">
                                      {op.userName} <span className="text-[10px] font-normal text-slate-500">({op.roleLabel})</span>
                                    </span>
                                    <span className="text-slate-600 shrink-0 tabular-nums">
                                      <strong>{op.totalFunil}</strong> funil •{" "}
                                      <strong className="text-emerald-700">{op.totalPropostasDigitadas} ADEs ({op.funnelConvRate}%)</strong>
                                    </span>
                                  </div>
                                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden relative border border-slate-200/80">
                                    <div className="h-full bg-sky-200 rounded-full" style={{ width: `${funilWidth}%` }} />
                                    {adeWidth > 0 && (
                                      <div className="h-full bg-emerald-500 rounded-full absolute left-0 top-0" style={{ width: `${Math.max(adeWidth, 3)}%` }} />
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SEÇÃO 4: AMOSTRAS REAIS DE VIPS EM RISCO E DUPLICIDADES + PLANO DO MENTOR */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Amostras de Clientes VIP (>30k) parados >48h */}
                      <div className="bg-white border border-orange-200 rounded-2xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wide text-orange-900 flex items-center gap-1.5">
                              <Flame className="w-4 h-4 text-orange-600" />
                              Leads de 30K para cima parados a mais de 48 horas
                            </h4>
                            <p className="text-[11px] text-slate-500">Clientes reais com maior produção parada para resgate imediato</p>
                          </div>
                          {executiveSummaryData.vipCount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab("risk")
                                setRiskTierFilter("high")
                                setRiskStageFilters([])
                                setSearchRiskQuery("")
                                setIsExecSummaryOpen(false)
                              }}
                              className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold cursor-pointer shrink-0"
                            >
                              Ver todos ({executiveSummaryData.vipCount})
                            </button>
                          )}
                        </div>

                        {executiveSummaryData.vipSamples.length === 0 ? (
                          <div className="py-4 text-xs text-emerald-700 font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Nenhum lead VIP (&gt;30k) parado há mais de 48h neste recorte.</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {executiveSummaryData.vipSamples.map(item => (
                              <div key={`vip-sample-${item.ticket.id}`} className="p-3 rounded-xl bg-orange-50/50 border border-orange-200/80 flex items-center justify-between gap-3 text-xs">
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate">{item.ticket.cliente_nome || "Cliente sem Nome"}</div>
                                  <div className="text-[11px] text-slate-600 truncate">
                                    {item.ticket.convenio || "Convênio N/I"} • {item.ticket.user_nome || "Sem responsável"} • <strong className="text-rose-600">{Math.floor(item.hoursInactive / 24)}d parado</strong>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 flex items-center gap-2.5">
                                  <div>
                                    <div className="font-black text-emerald-700">{fmtCurrency(item.valorOperacao)}</div>
                                    <div className="text-[10px] font-bold text-sky-600">Prod: {fmtCurrency(item.valorProducao)}</div>
                                  </div>
                                  {onSelectTicket && (
                                    <button
                                      type="button"
                                      onClick={() => onSelectTicket(item.ticket)}
                                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white cursor-pointer transition-colors"
                                      title="Abrir atendimento"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Recomendações Práticas do Mentor + Amostra de Duplicidades */}
                      <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-2xs space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wide text-indigo-950 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-indigo-600" />
                          Sugestões para você agir hoje
                        </h4>
                        <ol className="space-y-2 text-[12px] text-slate-700 leading-relaxed list-decimal list-inside">
                          <li>
                            <strong>Destrave o dinheiro mais rápido:</strong>{" "}
                            {executiveSummaryData.vipCount > 0 ? (
                              <>cobre a equipe o resgate dos <strong>{executiveSummaryData.vipCount} VIPs</strong> no Radar de Risco antes que esfriem de vez ({fmtCurrency(executiveSummaryData.vipProducao)} em jogo).</>
                            ) : (
                              <>mantenha o acompanhamento diário sobre os leads em negociação ({executiveSummaryData.negStage?.count || 0} ativos) para não ultrapassarem 48h sem retorno.</>
                            )}
                          </li>
                          <li>
                            <strong>Ajuste o foco das compras de leads:</strong>{" "}
                            {executiveSummaryData.alertOrigins[0] ? (
                              <>revise a base <strong>{executiveSummaryData.alertOrigins[0].label}</strong> ({executiveSummaryData.alertOrigins[0].roiVerdict}) e priorize canais como <strong>{executiveSummaryData.bestOriginMatches[0]?.label || "os de maior margem"}</strong>.</>
                            ) : (
                              <>acompanhe na aba Funil &amp; Origens quais listas convertem melhor acima de 60% de margem viável.</>
                            )}
                          </li>
                          <li>
                            <strong>Alinhe roleta e volume individual:</strong>{" "}
                            {executiveSummaryData.bestConvenioMatches[0] ? (
                              <>use a Matriz de Afinidade para priorizar <strong>{executiveSummaryData.bestConvenioMatches[0].convenio}</strong> com <strong>{executiveSummaryData.bestConvenioMatches[0].userName}</strong> ({executiveSummaryData.bestConvenioMatches[0].rate}% de acerto)</>
                            ) : (
                              <>acompanhe a taxa de conversão individual na aba Eficiência da Equipe</>
                            )}
                            {executiveSummaryData.lowEntryOps[0] ? ` e cobre mais entrada no funil de ${executiveSummaryData.lowEntryOps[0].userName}.` : "."}
                          </li>
                        </ol>

                        {executiveSummaryData.duplicateConflicts.length > 0 && (
                          <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-black uppercase text-rose-700 flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Amostra de CPFs Duplicados ({executiveSummaryData.totalDuplicateClients})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const firstDup = executiveSummaryData.duplicateConflicts[0]
                                  setActiveTab("risk")
                                  setRiskTierFilter("all")
                                  setRiskStageFilters([])
                                  setSearchRiskQuery(firstDup ? firstDup.cpfDigits : "")
                                  setIsExecSummaryOpen(false)
                                }}
                                className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
                              >
                                Filtrar no Radar
                              </button>
                            </div>
                            {executiveSummaryData.duplicateConflicts.slice(0, 2).map(dup => (
                              <div key={`dup-mini-${dup.cpfDigits}`} className="text-[11px] text-slate-600 flex items-center justify-between gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                                <span className="relative group/dup min-w-0 flex items-center">
                                  <span className="truncate cursor-help">
                                    <strong>{dup.clientName}</strong> ({dup.ticketCount} cards: {dup.uniqueOperators.join(", ")})
                                  </span>
                                  <span
                                    role="tooltip"
                                    className="pointer-events-none opacity-0 group-hover/dup:opacity-100 transition-opacity duration-150 absolute left-0 bottom-full mb-1.5 z-50 w-72 sm:w-80 rounded-lg bg-slate-900 text-white text-[11px] font-medium text-left leading-relaxed px-3 py-2 shadow-xl border border-slate-700 whitespace-normal"
                                  >
                                    <span className="block font-bold text-amber-300 mb-1">
                                      Atuando neste CPF ({dup.ticketCount} cards):
                                    </span>
                                    <span className="block text-slate-100">
                                      {dup.uniqueOperators.join(" • ")}
                                    </span>
                                  </span>
                                </span>
                                <span className="font-bold text-emerald-700 shrink-0">{fmtCurrency(dup.maxOperacao)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rodapé do Modal */}
                  <div className="px-6 lg:px-8 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                    <span className="text-[11px] text-slate-500">
                      Conversa gerada em tempo real com base nos filtros aplicados no painel.
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
            )
          })()}
        </AnimatePresence>

        {/* MODAL ATENDIMENTOS PARADOS HÁ MAIS DE 48 HORAS */}
        <AnimatePresence>
          {stuckModalStage && (
            <motion.div
              key="stuck-leads-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-30 bg-slate-950/65 flex items-center justify-center p-4 sm:p-6 lg:p-8"
              onClick={(e) => {
                if (e.target === e.currentTarget) setStuckModalStageKey(null)
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 10 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-4xl max-h-full bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label={`Atendimentos parados há mais de 48 horas em ${stuckModalStage.label}`}
              >
                {/* Cabeçalho */}
                <div className="px-6 py-4 bg-linear-to-r from-slate-900 via-amber-950 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-amber-300" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                        {stuckModalStage.label} — {stuckModalStage.stuckCount48h}{" "}
                        {stuckModalStage.stuckCount48h === 1 ? "atendimento parado" : "atendimentos parados"} há mais de 48 horas
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Ordenados do maior para o menor valor da produção
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStuckModalStageKey(null)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    title="Fechar lista"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Busca no topo da lista */}
                {(() => {
                  const q = stuckModalSearch.trim().toLowerCase()
                  const qDigits = q.replace(/\D/g, "")
                  const filteredStuckLeads = !q
                    ? stuckModalStage.stuckLeads48h
                    : stuckModalStage.stuckLeads48h.filter(item => {
                        const cName = String(item.ticket.cliente_nome || "").toLowerCase()
                        const opName = String(item.operatorName || "").toLowerCase()
                        const cpfRaw = String(item.ticket.cliente_cpf || "").toLowerCase()
                        const cpfDigits = cpfRaw.replace(/\D/g, "")
                        const telRaw = String(item.ticket.cliente_telefone || "").toLowerCase()
                        const telDigits = telRaw.replace(/\D/g, "")
                        return (
                          cName.includes(q) ||
                          opName.includes(q) ||
                          cpfRaw.includes(q) ||
                          telRaw.includes(q) ||
                          (qDigits.length >= 3 && (cpfDigits.includes(qDigits) || telDigits.includes(qDigits)))
                        )
                      })

                  return (
                    <>
                      <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={stuckModalSearch}
                            onChange={(e) => setStuckModalSearch(e.target.value)}
                            placeholder="Buscar por CPF, telefone, nome do cliente ou responsável..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden transition-colors"
                          />
                          {stuckModalSearch && (
                            <button
                              type="button"
                              onClick={() => setStuckModalSearch("")}
                              title="Limpar busca"
                              aria-label="Limpar busca"
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 shrink-0 tabular-nums">
                          {filteredStuckLeads.length} de {stuckModalStage.stuckLeads48h.length}
                        </span>
                      </div>

                      {/* Lista de Atendimentos */}
                      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5 bg-slate-50/70">
                        {filteredStuckLeads.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-500">
                            {stuckModalStage.stuckLeads48h.length === 0
                              ? "Nenhum atendimento parado há mais de 48 horas nesta etapa."
                              : "Nenhum atendimento encontrado para a busca informada."}
                          </div>
                        ) : (
                          filteredStuckLeads.map(item => (
                            <div
                              key={`stuck-${stuckModalStage.key}-${item.ticket.id}`}
                              className="bg-white border border-slate-200 hover:border-amber-300 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-sm text-slate-900 truncate">
                                    {item.ticket.cliente_nome || "Cliente sem Nome"}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold shrink-0">
                                    {fmtDaysAndHours(item.hoursInactive)} parado
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                  <span>
                                    Responsável: <strong className="text-slate-900">{item.operatorName}</strong>
                                  </span>
                                  {item.ticket.convenio && (
                                    <span>
                                      Convênio: <strong className="text-slate-800">{item.ticket.convenio}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                Operação
                              </span>
                              <span className="font-black text-sm text-emerald-700 tabular-nums">
                                {fmtCurrency(item.opVal)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                Produção
                              </span>
                              <span className="font-black text-sm text-sky-600 tabular-nums">
                                {fmtCurrency(item.prodVal)}
                              </span>
                            </div>
                          </div>

                          {onSelectTicket && (
                            <button
                              type="button"
                              onClick={() => onSelectTicket(item.ticket)}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                            >
                              <span>Ver atendimento</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )
                })()}

                {/* Rodapé */}
                <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setStuckModalStageKey(null)}
                    className="px-5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors"
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
