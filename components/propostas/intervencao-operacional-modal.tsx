"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, GitFork, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"
import { useAuth } from "@/context/auth-context"

interface User {
  id: string
  nome: string
  funcao?: string
  role?: string
  status?: string
}

interface ProposalInterventionData {
  id_lead: string
  nome_cliente: string
  cliente_cpf: string
  corretor?: string
  nome_corretor?: string
  corretor_id?: string
  valor_operacao?: number | string
  valor_producao?: number | string
  status: string
  intervencao_operacional?: boolean
  intervencao_operacional_id?: string
  intervencao_operacional_nome?: string
  intervencao_motivo?: string
  intervencao_data?: string
  intervencao_autor_nome?: string
}

interface IntervencaoOperacionalModalProps {
  isOpen: boolean
  onClose: () => void
  proposal: ProposalInterventionData | null
  onSuccess: () => void
}

export function IntervencaoOperacionalModal({
  isOpen,
  onClose,
  proposal,
  onSuccess,
}: IntervencaoOperacionalModalProps) {
  const { perfil, isAdmin, isOperational, isSupervisor, isDeveloper } = useAuth()
  const [operationalUsers, setOperationalUsers] = useState<User[]>([])
  const [selectedOperacionalId, setSelectedOperacionalId] = useState<string>("")
  const [motivo, setMotivo] = useState<string>("")
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canManageIntervention = isAdmin || isOperational || isSupervisor || isDeveloper

  const isInterventionActive = Boolean(proposal?.intervencao_operacional)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      if (proposal?.intervencao_operacional_id) {
        setSelectedOperacionalId(proposal.intervencao_operacional_id)
      } else if (isOperational && perfil?.id) {
        setSelectedOperacionalId(perfil.id)
      } else {
        setSelectedOperacionalId("")
      }
      setMotivo(proposal?.intervencao_motivo || "")
    }
  }, [isOpen, proposal, isOperational, perfil?.id])

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const response = await fetch("/api/usuarios")
      if (!response.ok) throw new Error("Falha ao buscar usuários")
      const data = await response.json()
      if (Array.isArray(data)) {
        // Filtrar prioritariamente quem é operacional, admin, desenvolvedor ou supervisor
        let ops = data.filter((u: User) => {
          const func = (u.funcao || "").trim().toLowerCase()
          const role = (u.role || "").trim().toLowerCase()
          const status = (u.status || "").trim().toUpperCase()
          if (status === "INATIVO") return false
          return (
            func.includes("operacion") ||
            role.includes("operacion") ||
            func.includes("admin") ||
            role.includes("admin") ||
            func.includes("desenvolv") ||
            role.includes("desenvolv") ||
            func.includes("supervis") ||
            role.includes("supervis")
          )
        })

        if (ops.length === 0) {
          ops = [...data]
        }

        // Assegurar que o operacional da proposta ou o usuário logado constem na lista com nome amigável
        const targetIds = [proposal?.intervencao_operacional_id, perfil?.id].filter(Boolean) as string[]
        for (const tid of targetIds) {
          if (!ops.some((u) => u.id === tid)) {
            const foundInAll = data.find((u: User) => u.id === tid)
            if (foundInAll) {
              ops.push(foundInAll)
            } else if (tid === proposal?.intervencao_operacional_id && proposal?.intervencao_operacional_nome) {
              ops.push({
                id: tid,
                nome: proposal.intervencao_operacional_nome,
                funcao: "Operacional",
              } as User)
            } else if (tid === perfil?.id && perfil?.nome) {
              ops.push({
                id: tid,
                nome: perfil.nome,
                funcao: perfil.funcao || perfil.role || "Operacional",
              } as User)
            }
          }
        }

        setOperationalUsers(ops)
      }
    } catch (error) {
      console.error("Erro ao carregar lista de operacionais:", error)
      toast.error("Erro ao carregar lista de operacionais")
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleApply = async () => {
    if (!proposal) return
    if (!selectedOperacionalId) {
      toast.error("Selecione o usuário do Operacional responsável.")
      return
    }
    if (!motivo.trim()) {
      toast.error("Informe a justificativa/motivo do retrabalho ou intervenção.")
      return
    }

    const opUser = operationalUsers.find(u => u.id === selectedOperacionalId)
    const opNome = opUser?.nome || "Operacional"
    const nowIso = new Date().toISOString()
    const digitadorNome = proposal.nome_corretor || proposal.corretor || "Digitador Original"

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("propostas")
        .update({
          intervencao_operacional: true,
          intervencao_operacional_id: selectedOperacionalId,
          intervencao_operacional_nome: opNome,
          intervencao_motivo: motivo.trim(),
          intervencao_data: nowIso,
          intervencao_autor_id: perfil?.id || null,
          intervencao_autor_nome: perfil?.nome || "Gestão/Operacional",
          updated_at: nowIso,
        })
        .eq("id_lead", proposal.id_lead)

      if (error) throw error

      // Histórico de auditoria
      try {
        await supabase.from("historico_propostas").insert({
          proposta_id_lead: proposal.id_lead,
          usuario_id: perfil?.id || "",
          status_anterior: proposal.status,
          status_novo: proposal.status,
          descricao: `Intervenção Operacional registrada: 50% para "${digitadorNome}" e 50% para "${opNome}". Motivo: ${motivo.trim()}`,
          observacoes: `Intervenção registrada por ${perfil?.nome || "Usuário"} em ${new Date().toLocaleString("pt-BR")}. Motivo: ${motivo.trim()}`,
          tipo: "intervencao_operacional",
          created_at: nowIso,
        })
      } catch (histErr) {
        console.warn("Erro ao gravar histórico de intervenção:", histErr)
      }

      toast.success("Intervenção do Operacional registrada com sucesso!")
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error("Erro ao registrar intervenção:", err)
      if (err?.code === "42703" || err?.message?.includes("intervencao_operacional") || err?.message?.includes("column")) {
        toast.error("Colunas não encontradas no banco. Execute o script 'supabase_intervencao_operacional.sql' no Supabase SQL Editor para habilitar o recurso.", { duration: 7000 })
      } else {
        toast.error(err?.message || "Falha ao salvar intervenção no banco.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevert = async () => {
    if (!proposal) return
    const nowIso = new Date().toISOString()
    const digitadorNome = proposal.nome_corretor || proposal.corretor || "Digitador Original"

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("propostas")
        .update({
          intervencao_operacional: false,
          intervencao_operacional_id: null,
          intervencao_operacional_nome: null,
          intervencao_motivo: null,
          intervencao_data: null,
          intervencao_autor_id: null,
          intervencao_autor_nome: null,
          updated_at: nowIso,
        })
        .eq("id_lead", proposal.id_lead)

      if (error) throw error

      // Histórico de reversão
      try {
        await supabase.from("historico_propostas").insert({
          proposta_id_lead: proposal.id_lead,
          usuario_id: perfil?.id || "",
          status_anterior: proposal.status,
          status_novo: proposal.status,
          descricao: `Intervenção do Operacional revertida. 100% da produção meta retornada para "${digitadorNome}".`,
          observacoes: `Revertido por ${perfil?.nome || "Gestão"} em ${new Date().toLocaleString("pt-BR")}`,
          tipo: "reversao_intervencao",
          created_at: nowIso,
        })
      } catch (histErr) {
        console.warn("Erro ao gravar histórico de reversão:", histErr)
      }

      toast.success("Intervenção revertida! 100% da meta retornada ao digitador.")
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error("Erro ao reverter intervenção:", err)
      toast.error(err.message || "Falha ao reverter intervenção.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Valores numéricos aproximados para exibição
  const parseVal = (val: any) => {
    if (!val) return 0
    const str = String(val).replace(/[^\d,.-]/g, "")
    if (str.includes(".") && str.includes(",")) return parseFloat(str.replace(/\./g, "").replace(",", "."))
    if (str.includes(",")) return parseFloat(str.replace(",", "."))
    return parseFloat(str) || 0
  }

  const valorMetaCalculado = parseVal(proposal?.valor_producao)
  const metadeMeta = valorMetaCalculado / 2

  const selectedOpUser = operationalUsers.find((u) => u.id === selectedOperacionalId)
  const selectedDisplayName =
    (selectedOpUser?.nome ? `${selectedOpUser.nome}${selectedOpUser.funcao ? ` (${selectedOpUser.funcao})` : ""}` : null) ||
    (proposal?.intervencao_operacional_id === selectedOperacionalId && proposal?.intervencao_operacional_nome ? proposal.intervencao_operacional_nome : null) ||
    (selectedOperacionalId === perfil?.id && perfil?.nome ? `${perfil.nome}${perfil.funcao || perfil.role ? ` (${perfil.funcao || perfil.role})` : ""}` : null)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 bg-slate-900 text-white">
          <DialogTitle className="text-base font-black tracking-wider uppercase flex items-center gap-2.5">
            <GitFork className="w-5 h-5 text-amber-400" />
            Intervenção do Operacional
          </DialogTitle>
          <p className="text-[13px] text-slate-300 font-medium leading-relaxed mt-1">
            Redistribuição de 50% da Produção Meta quando o Operacional precisa assumir a condução ou realizar retrabalho.
          </p>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Card com dados do contrato */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                CONTRATO #{proposal?.id_lead}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-700">
                {proposal?.status}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-800 leading-tight">{proposal?.nome_cliente}</p>
            <p className="text-[11px] text-slate-500 font-medium">
              CPF: <span className="font-semibold text-slate-700">{proposal?.cliente_cpf}</span> • Digitador:{" "}
              <span className="font-semibold text-slate-700">{proposal?.nome_corretor || proposal?.corretor || "-"}</span>
            </p>

            {valorMetaCalculado > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-[8px] font-bold uppercase text-slate-400 block tracking-wider">Meta Total</span>
                  <span className="text-[11px] font-black text-slate-700">
                    R$ {valorMetaCalculado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-emerald-50/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[8px] font-bold uppercase text-emerald-600 block tracking-wider">50% Digitador</span>
                  <span className="text-[11px] font-black text-emerald-700">
                    R$ {metadeMeta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-amber-50/80 p-2 rounded-lg border border-amber-100">
                  <span className="text-[8px] font-bold uppercase text-amber-600 block tracking-wider">50% Operacional</span>
                  <span className="text-[11px] font-black text-amber-700">
                    R$ {metadeMeta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Aviso se já tiver intervenção ativa */}
          {isInterventionActive && (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900 leading-snug">
                <p className="font-bold">Intervenção registrada atualmente:</p>
                <p className="mt-0.5 text-amber-800">
                  Operacional: <span className="font-semibold">{proposal?.intervencao_operacional_nome || "Sim"}</span>
                  {proposal?.intervencao_autor_nome && ` • Registrado por: ${proposal.intervencao_autor_nome}`}
                </p>
                {proposal?.intervencao_motivo && (
                  <p className="mt-1 text-amber-950 italic">&ldquo;{proposal.intervencao_motivo}&rdquo;</p>
                )}
              </div>
            </div>
          )}

          {!canManageIntervention ? (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-[11px] text-red-700 font-medium">
              Apenas Operacional, Administradores e Supervisores possuem permissão para registrar ou alterar a intervenção.
            </div>
          ) : (
            <>
              {/* Seleção do Operacional Responsável */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  Operacional Responsável pela Intervenção <span className="text-red-500">*</span>
                </label>
                <Select value={selectedOperacionalId} onValueChange={setSelectedOperacionalId}>
                  <SelectTrigger className="h-10 text-[12px] bg-white border-slate-200 rounded-lg">
                    <SelectValue placeholder="Selecione o colaborador do Operacional">
                      {selectedDisplayName || undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {operationalUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-[12px]">
                        {u.nome} {u.funcao ? `(${u.funcao})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Justificativa / Motivo */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  Justificativa / Motivo da Intervenção <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva o retrabalho realizado ou motivo de o Operacional ter assumido a condução para fechamento..."
                  className="min-h-[80px] text-[12px] bg-white border-slate-200 rounded-lg resize-none"
                />
                <p className="text-[11px] text-slate-400">
                  Importante: Dúvidas e orientações comuns da rotina não justificam redistribuição. Registre apenas retrabalhos efetivos.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer com botões de ação */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {isInterventionActive && canManageIntervention ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleRevert}
              disabled={isSubmitting}
              className="h-10 text-[11px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
              Reverter (100% Corretor)
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-10 text-[13px] font-bold text-slate-500 hover:text-slate-800 rounded-xl"
            >
              Cancelar
            </Button>
          )}

          <div className="flex items-center gap-2">
            {canManageIntervention && (
              <Button
                type="button"
                onClick={handleApply}
                disabled={isSubmitting || !selectedOperacionalId || !motivo.trim()}
                className="h-10 px-5 text-[11px] font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <GitFork className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    {isInterventionActive ? "Atualizar Intervenção" : "Confirmar Redistribuição (50/50)"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
