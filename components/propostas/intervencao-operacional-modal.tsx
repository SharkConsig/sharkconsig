"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, GitFork, Trash2, CheckCircle2, ShieldAlert, Plus, Percent, Users } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"
import { useAuth } from "@/context/auth-context"
import {
  encodeInterventionMotivo,
  isSupervisorLikeUser,
  parseExplicitInterventionSplit,
  resolveProposalInterventionSplit,
  stripInterventionTechnicalTags,
} from "@/lib/intervencao-split"

interface User {
  id: string
  nome: string
  email?: string
  funcao?: string
  role?: string
  supervisor_nome?: string
  status?: string
}

interface ProposalData {
  id_lead: string
  nome_cliente?: string
  cliente_cpf?: string
  corretor?: string
  corretor_id?: string
  estagiario_colaborador_id?: string
  estagiario_colaborador_nome?: string
  status?: string
  valor_operacao?: number
  valor_producao?: number
  intervencao_operacional?: boolean
  intervencao_operacional_id?: string
  intervencao_operacional_nome?: string
  intervencao_motivo?: string
  intervencao_data?: string
  intervencao_autor_id?: string
  intervencao_autor_nome?: string
}

interface ParticipantRow {
  userId: string
  pct: string
}

interface IntervencaoOperacionalModalProps {
  isOpen: boolean
  onClose: () => void
  proposal: ProposalData | null
  onSuccess: () => void
}

const formatBRL = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0)

export function IntervencaoOperacionalModal({
  isOpen,
  onClose,
  proposal,
  onSuccess,
}: IntervencaoOperacionalModalProps) {
  const { user, perfil } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [motivo, setMotivo] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    fetchUsers()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !proposal) return

    const usersById = new Map<string, User>()
    users.forEach((u) => usersById.set(u.id, u))
    const getUserById = (id: string) => usersById.get(id)

    setMotivo(stripInterventionTechnicalTags(proposal.intervencao_motivo || ""))

    if (proposal.intervencao_operacional) {
      const explicit = parseExplicitInterventionSplit(proposal.intervencao_motivo)
      if (explicit && explicit.length > 0) {
        setParticipants(
          explicit.map((p) => ({ userId: p.userId, pct: String(p.pct) }))
        )
        return
      }

      const resolved = resolveProposalInterventionSplit(proposal, getUserById)
      if (resolved.participants.length > 0) {
        setParticipants(
          resolved.participants.map((p) => ({
            userId: p.userId,
            pct: String(p.pct),
          }))
        )
        return
      }
    }

    // Nova intervenção: NÃO inclui Supervisor automaticamente; pré-seleciona estagiário (ou corretor não-supervisor) + 1 vaga para completar 50/50
    const brokerId = (proposal.corretor_id || "").trim()
    const estId = (proposal.estagiario_colaborador_id || "").trim()
    const brokerUser = brokerId ? getUserById(brokerId) : undefined

    if (estId && (!brokerId || isSupervisorLikeUser(brokerUser))) {
      setParticipants([
        { userId: estId, pct: "50" },
        { userId: "", pct: "50" },
      ])
    } else if (brokerId && !isSupervisorLikeUser(brokerUser)) {
      setParticipants([
        { userId: brokerId, pct: "50" },
        { userId: "", pct: "50" },
      ])
    } else {
      setParticipants([
        { userId: "", pct: "50" },
        { userId: "", pct: "50" },
      ])
    }
  }, [isOpen, proposal, users])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/usuarios")
      if (!response.ok) throw new Error("Falha ao buscar colaboradores")
      const data: User[] = await response.json()
      const activeUsers = (data || []).filter(
        (u) => (u.status || "ATIVO").toUpperCase() !== "INATIVO"
      )
      setUsers(activeUsers)
    } catch (error) {
      console.error("Erro ao buscar colaboradores para intervenção:", error)
      toast.error("Erro ao carregar lista de colaboradores")
    } finally {
      setIsLoading(false)
    }
  }

  const totalPct = useMemo(() => {
    return participants.reduce((sum, p) => {
      const val = parseFloat(String(p.pct).replace(",", "."))
      return sum + (isNaN(val) ? 0 : val)
    }, 0)
  }, [participants])

  const hasDuplicateUsers = useMemo(() => {
    const ids = participants.map((p) => p.userId).filter(Boolean)
    return new Set(ids).size !== ids.length
  }, [participants])

  const isSplitValid = useMemo(() => {
    if (participants.length === 0) return false
    const allFilled = participants.every((p) => {
      const val = parseFloat(String(p.pct).replace(",", "."))
      return p.userId.trim() !== "" && !isNaN(val) && val > 0
    })
    return allFilled && !hasDuplicateUsers && Math.abs(totalPct - 100) <= 0.05
  }, [participants, hasDuplicateUsers, totalPct])

  const productionValue = Number(proposal?.valor_producao) || 0

  const handleAddParticipant = () => {
    setParticipants((prev) => [...prev, { userId: "", pct: "0" }])
  }

  const handleRemoveParticipant = (index: number) => {
    if (participants.length <= 1) return
    setParticipants((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSplitEqually = () => {
    const count = participants.length
    if (count <= 0) return
    const base = Math.floor((100 / count) * 100) / 100
    const remainder = Math.round((100 - base * count) * 100) / 100
    setParticipants((prev) =>
      prev.map((p, idx) => ({
        ...p,
        pct: String(idx === 0 ? Math.round((base + remainder) * 100) / 100 : base),
      }))
    )
  }

  const handleSalvarIntervencao = async () => {
    if (!proposal?.id_lead) return
    if (!isSplitValid) {
      toast.error("Selecione participantes distintos e garanta que a soma dos percentuais seja 100%.")
      return
    }

    const normalizedParticipants = participants.map((p) => ({
      userId: p.userId.trim(),
      pct: Math.round(parseFloat(String(p.pct).replace(",", ".")) * 100) / 100,
    }))

    const brokerId = (proposal.corretor_id || "").trim()
    const primaryOp =
      normalizedParticipants.find((p) => p.userId !== brokerId) ||
      normalizedParticipants[0]
    const primaryUser = users.find((u) => u.id === primaryOp.userId)
    if (!primaryUser) {
      toast.error("Colaborador selecionado não foi encontrado")
      return
    }

    const summaryNames = normalizedParticipants
      .map((p) => {
        const u = users.find((usr) => usr.id === p.userId)
        return `${u?.nome || "Colaborador"} (${p.pct}%)`
      })
      .join(" + ")

    const encodedMotivo = encodeInterventionMotivo(motivo, normalizedParticipants)

    setIsSubmitting(true)
    try {
      const payload = {
        intervencao_operacional: true,
        intervencao_operacional_id: primaryUser.id,
        intervencao_operacional_nome: summaryNames,
        intervencao_motivo: encodedMotivo,
        intervencao_data: new Date().toISOString(),
        intervencao_autor_id: user?.id || null,
        intervencao_autor_nome: perfil?.nome || user?.email || "Operacional",
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("propostas")
        .update(payload)
        .eq("id_lead", proposal.id_lead)

      if (error) throw error

      try {
        await supabase.from("historico_propostas").insert({
          proposta_id_lead: proposal.id_lead,
          usuario_id: user?.id,
          usuario_nome: perfil?.nome || user?.email || "Operacional",
          status_anterior: proposal.status || "-",
          status_novo: proposal.status || "-",
          observacao: `Intervenção Operacional registrada: ${summaryNames}. Motivo: ${stripInterventionTechnicalTags(motivo) || "Sem observações adicionais"}`,
        })
      } catch (histErr) {
        console.warn("Não foi possível gravar no histórico de propostas:", histErr)
      }

      toast.success("Intervenção Operacional registrada com sucesso!")
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error("Erro ao salvar intervenção operacional:", err)
      toast.error(`Erro ao salvar intervenção: ${err?.message || "Tente novamente"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoverIntervencao = async () => {
    if (!proposal?.id_lead) return

    if (!confirm("Deseja realmente remover a Intervenção Operacional desta proposta?")) {
      return
    }

    setIsRemoving(true)
    try {
      const payload = {
        intervencao_operacional: false,
        intervencao_operacional_id: null,
        intervencao_operacional_nome: null,
        intervencao_motivo: null,
        intervencao_data: null,
        intervencao_autor_id: null,
        intervencao_autor_nome: null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("propostas")
        .update(payload)
        .eq("id_lead", proposal.id_lead)

      if (error) throw error

      try {
        await supabase.from("historico_propostas").insert({
          proposta_id_lead: proposal.id_lead,
          usuario_id: user?.id,
          usuario_nome: perfil?.nome || user?.email || "Operacional",
          status_anterior: proposal.status || "-",
          status_novo: proposal.status || "-",
          observacao: `Intervenção Operacional removida por ${perfil?.nome || user?.email || "Operacional"}. Produção 100% retornada à regra padrão.`,
        })
      } catch (histErr) {
        console.warn("Não foi possível gravar no histórico de propostas:", histErr)
      }

      toast.success("Intervenção Operacional removida com sucesso!")
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error("Erro ao remover intervenção operacional:", err)
      toast.error(`Erro ao remover intervenção: ${err?.message || "Tente novamente"}`)
    } finally {
      setIsRemoving(false)
    }
  }

  if (!isOpen || !proposal) return null

  const isAlreadyActive = Boolean(proposal.intervencao_operacional)
  const cleanExistingReason = stripInterventionTechnicalTags(proposal.intervencao_motivo)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-6 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-[#1C2643] uppercase tracking-tight">
                Intervenção Operacional
              </DialogTitle>
              <p className="text-[11px] font-bold text-slate-400">
                Defina os participantes da divisão e o percentual de cada um (sem incluir supervisor automaticamente)
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card Resumo da Proposta */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                ID Lead: <span className="text-slate-800">{proposal.id_lead}</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#1C2643]">
                {proposal.status || "EM ANDAMENTO"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-[13px] font-black text-[#1C2643] truncate">
                {proposal.nome_cliente || "Cliente não informado"}
              </div>
              {productionValue > 0 && (
                <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                  Prod: {formatBRL(productionValue)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-slate-500">
              <span>
                Titular/Corretor:{" "}
                <span className="text-slate-700 font-extrabold">
                  {proposal.corretor || "Não informado"}
                </span>
              </span>
              {proposal.estagiario_colaborador_nome && (
                <span>
                  Estagiário:{" "}
                  <span className="text-slate-700 font-extrabold">
                    {proposal.estagiario_colaborador_nome}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Alerta de intervenção ativa se houver */}
          {isAlreadyActive && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-black text-purple-950">
                  Intervenção ativa: {proposal.intervencao_operacional_nome || "Operacional"}
                </p>
                {cleanExistingReason && (
                  <p className="text-purple-700 text-[11px]">
                    Motivo: {cleanExistingReason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Lista de Participantes e Percentuais */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10.5px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                Participantes & Percentuais
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSplitEqually}
                  className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Dividir Igual
                </button>
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Adicionar
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="h-12 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map((row, index) => {
                  const pctNum = parseFloat(String(row.pct).replace(",", ".")) || 0
                  const shareAmount = productionValue > 0 ? (productionValue * pctNum) / 100 : 0
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-slate-50/70 border border-slate-200 rounded-xl p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <Select
                          value={row.userId}
                          onValueChange={(val) => {
                            setParticipants((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, userId: val } : item
                              )
                            )
                          }}
                        >
                          <SelectTrigger className="w-full h-9 rounded-lg border border-slate-200 bg-white font-bold text-xs text-slate-800">
                            <SelectValue placeholder={`Participante ${index + 1}...`} />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id} className="text-xs font-bold">
                                {u.nome} {u.funcao ? `(${u.funcao})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-24 shrink-0 relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={row.pct}
                          onChange={(e) => {
                            const val = e.target.value
                            setParticipants((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, pct: val } : item
                              )
                            )
                          }}
                          className="w-full h-9 pl-2.5 pr-6 rounded-lg border border-slate-200 bg-white font-black text-xs text-[#1C2643] text-right outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                        <Percent className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {productionValue > 0 && (
                        <span className="text-[10.5px] font-extrabold text-slate-600 w-22 text-right shrink-0 hidden sm:inline">
                          {formatBRL(shareAmount)}
                        </span>
                      )}

                      {participants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(index)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                          title="Remover participante"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] font-bold px-1">
              <span className="text-slate-500">
                {hasDuplicateUsers ? (
                  <span className="text-rose-600">Há participante duplicado na lista.</span>
                ) : (
                  "Somente os participantes listados acima receberão produção."
                )}
              </span>
              <span
                className={
                  Math.abs(totalPct - 100) <= 0.05
                    ? "text-emerald-600 font-black"
                    : "text-rose-600 font-black"
                }
              >
                Total: {Math.round(totalPct * 100) / 100}%
              </span>
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-black uppercase text-slate-600 tracking-wider">
              Motivo / Observações da Intervenção
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Auxílio na esteira bancária, divisão de atendimento entre colaboradores..."
              rows={2}
              className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
            />
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-amber-900 font-semibold leading-relaxed">
              A produção e as metas serão distribuídas nos rankings e no dashboard exatamente conforme os participantes e percentuais definidos acima (sem incluir o supervisor/titular, salvo se ele estiver na lista).
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
          {isAlreadyActive && (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || isRemoving}
              onClick={handleRemoverIntervencao}
              className="sm:mr-auto text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-9 rounded-xl"
            >
              {isRemoving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              )}
              Remover Intervenção
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting || isRemoving}
            className="text-xs font-bold text-slate-500 h-9 rounded-xl"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSalvarIntervencao}
            disabled={isSubmitting || isRemoving || !isSplitValid}
            className="text-xs font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 h-9 rounded-xl px-5"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <GitFork className="w-3.5 h-3.5 mr-1.5" />
            )}
            {isAlreadyActive ? "Atualizar Intervenção" : "Confirmar Intervenção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
