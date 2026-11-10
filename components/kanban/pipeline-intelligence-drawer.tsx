"use client"

import React, { useState, useMemo } from "react"
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
  Zap
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
  // Filtros
  const [period, setPeriod] = useState<PeriodFilter>("30d")
  const [selectedConvenio, setSelectedConvenio] = useState<string>("all")
  const [selectedOperator, setSelectedOperator] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<ActiveTab>("speed")
  const [searchRiskQuery, setSearchRiskQuery] = useState("")

  // Lista única de convênios presentes nos dados
  const conveniosList = useMemo(() => {
    const set = new Set<string>()
    tickets.forEach(t => {
      const c = (t.convenio || "").trim()
      if (c) set.add(c)
    })
    return Array.from(set).sort()
  }, [tickets])

  // Lista unificada de operadores (usersList + cltCollaborators)
  const operatorsList = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; equipe?: string }>()
    usersList.forEach(u => {
      if (u.id) map.set(u.id, { id: u.id, nome: u.nome || "Sem Nome", equipe: u.equipe })
    })
    cltCollaborators.forEach(c => {
      if (c.id && !map.has(c.id)) {
        map.set(c.id, { id: c.id, nome: c.nome || "Sem Nome", equipe: c.equipe })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [usersList, cltCollaborators])

  // Filtragem inicial dos tickets por período, convênio e operador
  const filteredTickets = useMemo(() => {
    const now = new Date().getTime()

    return tickets.filter(t => {
      // Filtro de Operador
      if (selectedOperator !== "all" && t.user_id !== selectedOperator) {
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
  }, [tickets, period, selectedConvenio, selectedOperator])

  // 1. CÁLCULO DE SPEED-TO-LEAD: Abordagem -> Negociação
  // Definição acordada: "Quantos minutos o corretor leva entre fazer o primeiro contato (etapa 'EM ABORDAGEM') e mover para a etapa 'Em negociação'."
  const speedToLeadData = useMemo(() => {
    interface OperatorSpeed {
      userId: string
      userName: string
      totalAbordagens: number
      totalNegociacoes: number
      avgMinutesToNegotiation: number
      minMinutes: number
      maxMinutes: number
      sampleCount: number
    }

    const opMap = new Map<string, {
      userId: string
      userName: string
      totalAbordagens: number
      totalNegociacoes: number
      durationsMinutes: number[]
    }>()

    // Helper para achar nome
    const getName = (userId: string, fallbackName?: string) => {
      const found = operatorsList.find(o => o.id === userId)
      return found?.nome || fallbackName || "Não Atribuído"
    }

    filteredTickets.forEach(t => {
      const uId = t.user_id || "unassigned"
      const uName = getName(uId, t.user_nome)

      if (!opMap.has(uId)) {
        opMap.set(uId, {
          userId: uId,
          userName: uName,
          totalAbordagens: 0,
          totalNegociacoes: 0,
          durationsMinutes: []
        })
      }

      const op = opMap.get(uId)!
      const statusUpper = (t.status || "").toUpperCase()

      // Verificar se passou por abordagem ou está nela
      const movs = Array.isArray(t.historico_movimentacoes) ? t.historico_movimentacoes : []
      const hasAbordagem = statusUpper.includes("ABORDAGEM") || movs.some(m => (m.etapa_anterior || "").toUpperCase().includes("ABORDAGEM") || (m.etapa_nova || "").toUpperCase().includes("ABORDAGEM"))
      const hasNegociacao = statusUpper.includes("NEGOCIA") || statusUpper.includes("PROPOSTA") || statusUpper.includes("CONCLU") || movs.some(m => (m.etapa_nova || "").toUpperCase().includes("NEGOCIA"))

      if (hasAbordagem) {
        op.totalAbordagens++
      }

      if (hasNegociacao) {
        op.totalNegociacoes++
      }

      // Procurar tempo exato no histórico: entrada em 'EM ABORDAGEM' até entrada em 'EM NEGOCIAÇÃO'
      let abordagemTime: number | null = null
      let negociacaoTime: number | null = null

      if (movs.length > 0) {
        // Ordenar cronologicamente
        const sorted = [...movs].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        for (const m of sorted) {
          const toStage = (m.etapa_nova || "").toUpperCase()
          const fromStage = (m.etapa_anterior || "").toUpperCase()
          const mTime = new Date(m.data).getTime()

          if (!abordagemTime && (toStage.includes("ABORDAGEM") || fromStage.includes("ABORDAGEM"))) {
            abordagemTime = mTime
          }
          if (abordagemTime && !negociacaoTime && toStage.includes("NEGOCIA")) {
            negociacaoTime = mTime
            break
          }
        }
      }

      // Se não encontrou no histórico detalhado, mas o ticket foi criado em abordagem e hoje está em negociação:
      if (!abordagemTime && hasAbordagem) {
        abordagemTime = new Date(t.created_at).getTime()
      }
      if (abordagemTime && !negociacaoTime && hasNegociacao) {
        negociacaoTime = new Date(t.updated_at).getTime()
      }

      if (abordagemTime && negociacaoTime && negociacaoTime >= abordagemTime) {
        const diffMin = Math.round((negociacaoTime - abordagemTime) / (1000 * 60))
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
      if (op.totalAbordagens === 0 && op.totalNegociacoes === 0 && op.durationsMinutes.length === 0) return

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
        totalAbordagens: op.totalAbordagens,
        totalNegociacoes: op.totalNegociacoes,
        avgMinutesToNegotiation: avg,
        minMinutes: min,
        maxMinutes: max,
        sampleCount: count
      })
    })

    // Ordenar do menor tempo médio (mais rápido) para o mais demorado
    result.sort((a, b) => {
      if (a.sampleCount === 0 && b.sampleCount === 0) return b.totalAbordagens - a.totalAbordagens
      if (a.sampleCount === 0) return 1
      if (b.sampleCount === 0) return -1
      return a.avgMinutesToNegotiation - b.avgMinutesToNegotiation
    })

    const generalAvgMinutes = totalGeneralSamples > 0 ? Math.round(totalGeneralMinutes / totalGeneralSamples) : 0

    return {
      ranking: result,
      generalAvgMinutes,
      totalSamples: totalGeneralSamples
    }
  }, [filteredTickets, operatorsList])

  // 2. CÁLCULO DE STAGE AGING (PERMANÊNCIA POR ETAPA) & CAPITAL IMOBILIZADO
  const stageAgingData = useMemo(() => {
    const STAGES = [
      { key: "EM ABORDAGEM", label: "Em Abordagem", color: "sky" },
      { key: "EM RETOMADA", label: "Em Retomada / Interação", color: "amber" },
      { key: "EM NEGOCIAÇÃO", label: "Em Negociação", color: "indigo" },
      { key: "EM REATIVAÇÃO", label: "Em Reativação", color: "purple" }
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
        if (stageDef.key === "EM ABORDAGEM") {
          return s.includes("ABORDAGEM")
        }
        if (stageDef.key === "EM REATIVAÇÃO") {
          return s.includes("REATIVA")
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
  // Leads com valor de operação elevado (>= R$ 25.000) e parados sem avanço há mais de 24 horas
  const riskLeadsData = useMemo(() => {
    const now = Date.now()

    const atRisk = filteredTickets
      .map(t => {
        const opData = getValorOperacaoDeAbertura(t)
        const opVal = opData.num || 0
        const prodVal = opData.numProducao || 0
        const dateMs = new Date(t.updated_at || t.created_at || now).getTime()
        const hoursInactive = Math.max(0, Math.round((now - dateMs) / (1000 * 60 * 60)))

        return {
          ticket: t,
          valorOperacao: opVal,
          valorProducao: prodVal,
          hoursInactive,
          isHighRisk: opVal >= 25000 && hoursInactive >= 24,
          isModerateRisk: (opVal >= 15000 && hoursInactive >= 36) || hoursInactive >= 72
        }
      })
      .filter(item => item.isHighRisk || item.isModerateRisk)
      .sort((a, b) => b.valorOperacao - a.valorOperacao || b.hoursInactive - a.hoursInactive)

    if (!searchRiskQuery.trim()) return atRisk

    const q = searchRiskQuery.toLowerCase().trim()
    return atRisk.filter(item => {
      const cName = (item.ticket.cliente_nome || "").toLowerCase()
      const cCpf = (item.ticket.cliente_cpf || "").toLowerCase()
      const uName = (item.ticket.user_nome || "").toLowerCase()
      const conv = (item.ticket.convenio || "").toLowerCase()
      return cName.includes(q) || cCpf.includes(q) || uName.includes(q) || conv.includes(q)
    })
  }, [filteredTickets, getValorOperacaoDeAbertura, searchRiskQuery])

  // Formatação de Moeda
  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(val)
  }

  // Se não estiver aberto, não renderiza
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300"
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
              onClick={onClose}
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
                      "px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
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
              <option value="all">Toda a Equipe ({operatorsList.length})</option>
              {operatorsList.map(o => (
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
          {/* Card 1: Speed-to-Lead Médio */}
          <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-sky-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">Speed-to-Lead Médio</span>
              <Zap className="w-4 h-4 text-sky-600" />
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
              <span className="text-[10px] text-sky-700 font-medium">Abordagem ➔ Negociação</span>
            </div>
          </div>

          {/* Card 2: Capital Represado Total */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">Capital no Pipeline</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1">
              <div className="text-xl font-black text-emerald-950">
                {fmtCurrency(stageAgingData.grandTotalCapital)}
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">
                Prod. Estimada: {fmtCurrency(stageAgingData.grandTotalProducao)}
              </span>
            </div>
          </div>

          {/* Card 3: Represados > 48 horas */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">Gargalos (&gt; 48h)</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-1">
              <div className="text-xl font-black text-amber-950">
                {stageAgingData.grandTotalStuck48hCount} leads
              </div>
              <span className="text-[10px] text-amber-700 font-medium">Sem avanço no estágio</span>
            </div>
          </div>

          {/* Card 4: Radar de Risco Alto */}
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">Risco de Queima</span>
              <Flame className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-1">
              <div className="text-xl font-black text-rose-950">
                {riskLeadsData.length} leads
              </div>
              <span className="text-[10px] text-rose-700 font-medium">&gt; R$ 25k parados &gt; 24h</span>
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
            <span>1. Speed-to-Lead (Abordagem ➔ Negociação)</span>
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
            <span>2. Permanência por Etapa & Capital Imobilizado</span>
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
          {/* ABA 1: SPEED-TO-LEAD (ABORDAGEM -> NEGOCIAÇÃO)                 */}
          {/* ============================================================== */}
          {activeTab === "speed" && (
            <div className="space-y-4">
              {/* Box de Instrução Exata */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex items-start gap-3">
                <Zap className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-sky-950">
                    Definição de Speed-to-Lead Comercial SharkConsig
                  </h4>
                  <p className="text-xs text-sky-800 mt-0.5 leading-relaxed">
                    Mede quantos minutos o corretor leva entre fazer o primeiro contato (etapa <strong>&apos;EM ABORDAGEM&apos;</strong>) e mover para a etapa <strong>&apos;Em negociação&apos;</strong>. Operações de crédito consignado convertem até 3,8x mais quando o lead avança nas primeiras horas de contato ativo.
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
                        <th className="px-4 py-2.5 text-center">Leads Abordados</th>
                        <th className="px-4 py-2.5 text-center">Convertidos em Negociação</th>
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
                          const convRate = op.totalAbordagens > 0 ? Math.round((op.totalNegociacoes / op.totalAbordagens) * 100) : 0
                          
                          // Badge de classificação
                          let badgeBg = "bg-slate-100 text-slate-700"
                          let badgeText = "Sem Amostra"

                          if (op.sampleCount > 0) {
                            if (op.avgMinutesToNegotiation <= 30) {
                              badgeBg = "bg-emerald-100 text-emerald-800 border-emerald-200"
                              badgeText = "⚡ Ultra Rápido (<30m)"
                            } else if (op.avgMinutesToNegotiation <= 120) {
                              badgeBg = "bg-sky-100 text-sky-800 border-sky-200"
                              badgeText = "🟢 Ágil (30m - 2h)"
                            } else if (op.avgMinutesToNegotiation <= 480) {
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
                                {op.totalAbordagens}
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-slate-700">
                                {op.totalNegociacoes}
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
                                    {op.avgMinutesToNegotiation < 60 
                                      ? `${op.avgMinutesToNegotiation} min` 
                                      : `${(op.avgMinutesToNegotiation / 60).toFixed(1)} h`}
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
          {/* ABA 2: PERMANÊNCIA POR ETAPA & CAPITAL IMOBILIZADO             */}
          {/* ============================================================== */}
          {activeTab === "aging" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {stageAgingData.stages.map(st => (
                  <div key={st.key} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{st.label}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold">
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
                        <div className="text-[10px] text-slate-400">
                          Produção est.: {fmtCurrency(st.totalProducao)}
                        </div>
                      </div>
                    </div>

                    {/* Quebra por ticket */}
                    <div className="mt-3 pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Alto (&gt;30k):</span>
                        <span className="font-bold text-slate-800">{st.ticketsByTier.high.count} ({fmtCurrency(st.ticketsByTier.high.val)})</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Médio (10k-30k):</span>
                        <span className="font-bold text-slate-800">{st.ticketsByTier.mid.count} ({fmtCurrency(st.ticketsByTier.mid.val)})</span>
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
                      Gargalo de Lead Dwell Time (&gt; 48 Horas sem Avanço)
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchRiskQuery}
                    onChange={(e) => setSearchRiskQuery(e.target.value)}
                    placeholder="Filtrar por cliente, CPF ou corretor..."
                    className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>

                <div className="text-xs text-rose-800 font-bold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span>{riskLeadsData.length} leads prioritários exigindo intervenção imediata</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {riskLeadsData.length === 0 ? (
                  <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    Parabéns! Nenhum lead de alto ticket está inativo acima do limite de tolerância comercial.
                  </div>
                ) : (
                  riskLeadsData.map(item => {
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
                              <div className="text-xs text-slate-500 mt-0.5">
                                CPF: {t.cliente_cpf || "---"} • Tel: {t.cliente_telefone || "---"}
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
                              <span className="font-black text-emerald-700 text-sm">
                                {fmtCurrency(item.valorOperacao)}
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
                              <span className="font-medium text-slate-800 truncate block">
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
                            Etapa Atual: <strong>{t.status}</strong>
                          </span>

                          {onSelectTicket && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectTicket(t)
                                onClose()
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

        {/* RODAPÉ INFORMATIVO */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <span>Módulo de Gestão Avançada disponível exclusivamente para Administrador, Supervisor e Operacional.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
