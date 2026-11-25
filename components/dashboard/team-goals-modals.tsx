"use client"

import React, { useState, useMemo, useDeferredValue, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Target,
  Users,
  X,
  Flame,
  Search,
  Copy,
  Check,
  Clock,
} from "lucide-react"
import { cn, formatName } from "@/lib/utils"
import { formatCurrency } from "@/components/dashboard/dashboard-shared"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export interface TeamGoalProgressItem {
  id: string
  nome: string
  funcao: string
  roleCategory: "corretor" | "estagiario"
  goal: number
  produced: number
  pct: number
  achieved: boolean
  remaining: number
  avatar_url?: string
}

export interface PipelineOppItem {
  id: string
  cliente_nome: string
  cliente_cpf: string
  cliente_cpf_digits: string
  cliente_telefone: string
  convenio: string
  operador_nome: string
  operadorFormatted: string
  etapa: string
  valorOperacao: number
  valorProducao: number
  hoursInactive: number
  timeLabel: string
  isHighRisk: boolean
  searchText: string
}

export interface PipelineOppsMap {
  [userId: string]: {
    count: number
    totalProd: number
    items: PipelineOppItem[]
  }
}

interface TeamGoalsModalsProps {
  isOpen: boolean
  onClose: () => void
  teamGoalProgress: TeamGoalProgressItem[]
  pipelineOppsByUser: PipelineOppsMap
  isLoadingPipelineOpps: boolean
  pipelineLoadedKey: string
  teamPipelineKey: string
}

const FMT_ROUNDED_BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})

const CARDS_PAGE_SIZE = 36

const PipelineOppCard = React.memo(function PipelineOppCard({
  item,
  memberFallbackName,
  copiedField,
  onCopy,
}: {
  item: PipelineOppItem
  memberFallbackName: string
  copiedField: string | null
  onCopy: (key: string, val: string) => void
}) {
  const cpfKey = `cpf-${item.id}`
  const telKey = `tel-${item.id}`

  return (
    <div
      className={cn(
        "bg-white border-[3px] rounded-xl p-4 lg:p-5 shadow-2xs transition-colors flex flex-col justify-between",
        item.isHighRisk ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-600"
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-sm uppercase truncate">
              {item.cliente_nome || "Cliente sem Nome"}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {item.cliente_cpf ? (
                <button
                  type="button"
                  onClick={() => onCopy(cpfKey, item.cliente_cpf)}
                  title="Clique para copiar o CPF"
                  className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <span>CPF: {item.cliente_cpf}</span>
                  {copiedField === cpfKey ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              ) : (
                <span>CPF: ---</span>
              )}
              <span>•</span>
              {item.cliente_telefone ? (
                <button
                  type="button"
                  onClick={() => onCopy(telKey, item.cliente_telefone)}
                  title="Clique para copiar o Telefone"
                  className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <span>Tel: {item.cliente_telefone}</span>
                  {copiedField === telKey ? (
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
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Valor da Operação:</span>
            <span className="font-black text-emerald-700 text-sm block">
              {FMT_ROUNDED_BRL.format(item.valorOperacao)}
            </span>
            <span className="text-slate-400 block text-[10px] mt-1.5">Produção Estimada:</span>
            <span className="font-black text-sky-400 text-sm block">
              {FMT_ROUNDED_BRL.format(item.valorProducao)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Convênio / Órgão:</span>
            <span className="font-bold text-slate-700 uppercase">
              {item.convenio || "Não informado"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Corretor Responsável:</span>
            <span className="text-[13px] font-semibold text-slate-800 truncate block">
              {item.operadorFormatted || memberFallbackName}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Tempo sem Contato:</span>
            <span
              className={cn(
                "font-black flex items-center gap-1",
                item.hoursInactive > 48 ? "text-rose-600" : "text-slate-700"
              )}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {item.timeLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500 font-medium">
          Etapa Atual: <strong className="text-slate-900">{item.etapa}</strong>
        </span>
      </div>
    </div>
  )
})

export const TeamGoalsModals = React.memo(function TeamGoalsModals({
  isOpen,
  onClose,
  teamGoalProgress,
  pipelineOppsByUser,
  isLoadingPipelineOpps,
  pipelineLoadedKey,
  teamPipelineKey,
}: TeamGoalsModalsProps) {
  const [selectedPipelineMember, setSelectedPipelineMember] = useState<{
    member: TeamGoalProgressItem
    items: PipelineOppItem[]
  } | null>(null)
  const [pipelineTierFilter, setPipelineTierFilter] = useState<"all" | "high" | "mid" | "low">("all")
  const [pipelineSearchQuery, setPipelineSearchQuery] = useState("")
  const deferredSearch = useDeferredValue(pipelineSearchQuery)
  const [copiedPipelineField, setCopiedPipelineField] = useState<string | null>(null)
  const [visibleLimit, setVisibleLimit] = useState(CARDS_PAGE_SIZE)

  const handleCloseMain = useCallback(() => {
    setSelectedPipelineMember(null)
    onClose()
  }, [onClose])

  const handleOpenPipelineMember = useCallback(
    (member: TeamGoalProgressItem, items: PipelineOppItem[]) => {
      setPipelineTierFilter("all")
      setPipelineSearchQuery("")
      setVisibleLimit(CARDS_PAGE_SIZE)
      setSelectedPipelineMember({ member, items })
    },
    []
  )

  const handleCopyText = useCallback((key: string, val: string) => {
    if (!val) return
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(val).catch(() => {})
    }
    setCopiedPipelineField(key)
    setTimeout(() => {
      setCopiedPipelineField((prev) => (prev === key ? null : prev))
    }, 1500)
  }, [])

  const { allCorretores, allEstagiarios, achievedCount } = useMemo(() => {
    const corretores: TeamGoalProgressItem[] = []
    const estagiarios: TeamGoalProgressItem[] = []
    let achieved = 0
    for (const m of teamGoalProgress) {
      if (m.achieved) achieved++
      if (m.roleCategory === "estagiario") estagiarios.push(m)
      else corretores.push(m)
    }
    return { allCorretores: corretores, allEstagiarios: estagiarios, achievedCount: achieved }
  }, [teamGoalProgress])

  const pipelineComputed = useMemo(() => {
    if (!selectedPipelineMember) return null
    const allItems = selectedPipelineMember.items
    const q = deferredSearch.toLowerCase().trim()
    const qDigits = q.replace(/\D/g, "")

    const searchedItems = !q
      ? allItems
      : allItems.filter((item) => {
          if (item.searchText.includes(q)) return true
          return qDigits.length >= 4 && item.cliente_cpf_digits.includes(qDigits)
        })

    let highCount = 0
    let midCount = 0
    let lowCount = 0
    for (let i = 0; i < searchedItems.length; i++) {
      const op = searchedItems[i].valorOperacao
      if (op >= 30000) highCount++
      else if (op >= 10000) midCount++
      else lowCount++
    }

    const visibleItems =
      pipelineTierFilter === "high"
        ? searchedItems.filter((item) => item.valorOperacao >= 30000)
        : pipelineTierFilter === "mid"
        ? searchedItems.filter((item) => item.valorOperacao >= 10000 && item.valorOperacao < 30000)
        : pipelineTierFilter === "low"
        ? searchedItems.filter((item) => item.valorOperacao < 10000)
        : searchedItems

    let totalProdFiltered = 0
    for (let i = 0; i < visibleItems.length; i++) {
      totalProdFiltered += visibleItems[i].valorProducao
    }

    return {
      member: selectedPipelineMember.member,
      memberFormattedName: formatName(selectedPipelineMember.member.nome),
      highCount,
      midCount,
      lowCount,
      visibleItems,
      totalProdFiltered,
    }
  }, [selectedPipelineMember, deferredSearch, pipelineTierFilter])

  const handleCardsScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!pipelineComputed) return
      if (visibleLimit >= pipelineComputed.visibleItems.length) return
      const target = e.currentTarget
      if (target.scrollHeight - target.scrollTop - target.clientHeight < 260) {
        setVisibleLimit((prev) =>
          Math.min(pipelineComputed.visibleItems.length, prev + CARDS_PAGE_SIZE)
        )
      }
    },
    [pipelineComputed, visibleLimit]
  )

  const renderMemberRow = (member: TeamGoalProgressItem) => {
    const achievedPct = member.achieved ? Math.round(member.pct) : Math.min(99, Math.round(member.pct))
    const remainingPct = member.achieved ? 0 : Math.max(1, 100 - achievedPct)
    const opp = pipelineOppsByUser[member.id] || { count: 0, totalProd: 0, items: [] }
    const formattedName = formatName(member.nome)
    const nameParts = formattedName.trim().split(/\s+/).filter(Boolean)
    const firstName = nameParts[0] || formattedName
    const initials =
      nameParts.length >= 2
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : formattedName.slice(0, 2).toUpperCase()

    const progressColorClass =
      member.achieved || member.pct >= 100
        ? "bg-emerald-500"
        : member.pct > 66.67
        ? "bg-blue-500"
        : member.pct > 33.33
        ? "bg-orange-500"
        : "bg-red-500"

    return (
      <div
        key={member.id}
        className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-colors flex flex-col gap-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="w-9 h-9 border-2 border-white shadow-sm shrink-0">
              {member.avatar_url ? (
                <AvatarImage
                  src={member.avatar_url}
                  alt={formattedName}
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <AvatarFallback className="bg-[#1C2643]/10 text-[#1C2643] font-black text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h4 className="text-[11.5px] font-black text-[#1C2643] uppercase tracking-tight truncate">
                {formattedName}
              </h4>
              <span className="inline-block text-[8.5px] font-bold text-slate-500 uppercase tracking-wider">
                {member.roleCategory === "estagiario" ? "Estagiário" : "Corretor"}
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <span
              className={cn(
                "text-[12.5px] font-black shrink-0",
                member.achieved ? "text-emerald-600" : "text-[#1C2643]"
              )}
            >
              {achievedPct}% alcançado
            </span>
          </div>
        </div>

        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300", progressColorClass)}
            style={{ width: `${Math.min(100, Math.max(0, member.pct))}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] font-bold">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 min-w-0">
            <span className="text-slate-700">Meta: {formatCurrency(member.goal)}</span>
            <span className="text-slate-300">•</span>
            {member.achieved ? (
              <span className="text-emerald-600 font-black uppercase">Meta alcançada!</span>
            ) : (
              <span className="text-slate-600 font-bold">
                Falta <strong className="font-bold">{formatCurrency(member.remaining)}</strong>{" "}
                <span className="font-bold">({remainingPct}%)</span>
              </span>
            )}
          </div>

          <div className="shrink-0">
            {isLoadingPipelineOpps && pipelineLoadedKey !== teamPipelineKey ? (
              <span className="text-[10.5px] font-bold text-slate-400">
                Carregando oportunidades...
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenPipelineMember(member, opp.items)}
                className="inline-flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 hover:underline underline-offset-2 text-[10.5px] font-bold cursor-pointer transition-colors"
                title="Clique para visualizar os atendimentos ativos no Kanban"
              >
                <span>
                  No Kanban do {firstName} tem:{" "}
                  <strong className="font-black">{opp.count}</strong>{" "}
                  {opp.count === 1 ? "lead" : "leads"}
                </span>
                <span className="text-indigo-300">•</span>
                <span className="font-black">{formatCurrency(opp.totalProd)}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={handleCloseMain}
              className="absolute inset-0 bg-[#0F172A]/55"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-2xl bg-white rounded-[24px] border border-slate-100 shadow-2xl p-5 sm:p-6 overflow-hidden flex flex-col max-h-[85vh] z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-[#1C2643] rounded-xl flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black text-[#1C2643] uppercase tracking-wider">
                      Metas da Equipe no Mês
                    </h3>
                    <p className="text-[12px] font-bold text-slate-700">
                      {allCorretores.length} corretores • {allEstagiarios.length} estagiários •{" "}
                      {achievedCount} já alcançaram a meta
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseMain}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#1C2643] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-5">
                {teamGoalProgress.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Nenhum corretor ou estagiário ativo encontrado na equipe
                    </p>
                  </div>
                ) : (
                  <>
                    {allCorretores.length > 0 && (
                      <div className="space-y-2.5">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Corretores da Equipe ({allCorretores.length})
                        </p>
                        <div className="space-y-2.5">
                          {allCorretores.map((member) => renderMemberRow(member))}
                        </div>
                      </div>
                    )}

                    {allEstagiarios.length > 0 && (
                      <div className="space-y-2.5">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Estagiários da Equipe ({allEstagiarios.length})
                        </p>
                        <div className="space-y-2.5">
                          {allEstagiarios.map((member) => renderMemberRow(member))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={handleCloseMain}
                  className="px-5 py-2.5 bg-[#1C2643] hover:bg-[#28355a] text-[10px] font-bold text-white rounded-lg shadow-md hover:shadow-lg shadow-[#1C2643]/10 uppercase tracking-wider transition-all duration-200 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pipelineComputed && (
          <div className="fixed inset-0 z-[320] flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSelectedPipelineMember(null)}
              className="absolute inset-0 bg-[#0F172A]/60"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.16 }}
              className="relative w-full max-w-6xl bg-white rounded-[24px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] z-10"
            >
              <div className="shrink-0 px-5 sm:px-7 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                    <Flame className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-[#1C2643] uppercase tracking-wide truncate">
                      Atendimentos Ativos no Kanban — {pipelineComputed.memberFormattedName}
                    </h3>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">
                      {pipelineComputed.visibleItems.length}{" "}
                      {pipelineComputed.visibleItems.length === 1 ? "lead" : "leads"} • Produção Total:{" "}
                      <span className="text-sky-600 font-black">
                        {formatCurrency(pipelineComputed.totalProdFiltered)}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPipelineMember(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#1C2643] hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="shrink-0 px-5 sm:px-7 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleLimit(CARDS_PAGE_SIZE)
                      setPipelineTierFilter((prev) => (prev === "high" ? "all" : "high"))
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer",
                      pipelineTierFilter === "high"
                        ? "bg-orange-700 text-white border-orange-700 shadow-xs"
                        : "bg-white text-orange-700 border-orange-200 hover:bg-orange-50"
                    )}
                  >
                    Alto &gt;30k ({pipelineComputed.highCount}{" "}
                    {pipelineComputed.highCount === 1 ? "lead" : "leads"})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleLimit(CARDS_PAGE_SIZE)
                      setPipelineTierFilter((prev) => (prev === "mid" ? "all" : "mid"))
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer",
                      pipelineTierFilter === "mid"
                        ? "bg-orange-500 text-white border-orange-500 shadow-xs"
                        : "bg-white text-orange-500 border-orange-200 hover:bg-orange-50"
                    )}
                  >
                    Médio 10k-30k ({pipelineComputed.midCount}{" "}
                    {pipelineComputed.midCount === 1 ? "lead" : "leads"})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleLimit(CARDS_PAGE_SIZE)
                      setPipelineTierFilter((prev) => (prev === "low" ? "all" : "low"))
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer",
                      pipelineTierFilter === "low"
                        ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    Baixo &lt;10k ({pipelineComputed.lowCount}{" "}
                    {pipelineComputed.lowCount === 1 ? "lead" : "leads"})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pipelineSearchQuery}
                    onChange={(e) => {
                      setVisibleLimit(CARDS_PAGE_SIZE)
                      setPipelineSearchQuery(e.target.value)
                    }}
                    placeholder="Filtrar por cliente, CPF ou convênio..."
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-[11px] focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div
                onScroll={handleCardsScroll}
                className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-5 bg-slate-50/40"
              >
                {pipelineComputed.visibleItems.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 text-xs">
                    Nenhum atendimento ativo encontrado para os filtros selecionados.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
                      {pipelineComputed.visibleItems.slice(0, visibleLimit).map((item) => (
                        <PipelineOppCard
                          key={item.id}
                          item={item}
                          memberFallbackName={pipelineComputed.memberFormattedName}
                          copiedField={copiedPipelineField}
                          onCopy={handleCopyText}
                        />
                      ))}
                    </div>
                    {visibleLimit < pipelineComputed.visibleItems.length && (
                      <div className="mt-5 flex justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleLimit((prev) =>
                              Math.min(pipelineComputed.visibleItems.length, prev + CARDS_PAGE_SIZE)
                            )
                          }
                          className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                        >
                          Mostrar mais (
                          {pipelineComputed.visibleItems.length - visibleLimit} restantes)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
})
