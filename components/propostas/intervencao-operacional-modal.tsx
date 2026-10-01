"use client"

import React, { useState, useEffect } from "react"
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
import { Loader2, GitFork, Trash2, CheckCircle2, ShieldAlert } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"
import { useAuth } from "@/context/auth-context"

interface User {
  id: string
  nome: string
  email?: string
  funcao?: string
  supervisor_nome?: string
  status?: string
}

interface ProposalData {
  id_lead: string
  nome_cliente?: string
  cliente_cpf?: string
  corretor?: string
  corretor_id?: string
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

interface IntervencaoOperacionalModalProps {
  isOpen: boolean
  onClose: () => void
  proposal: ProposalData | null
  onSuccess: () => void
}

export function IntervencaoOperacionalModal({
  isOpen,
  onClose,
  proposal,
  onSuccess,
}: IntervencaoOperacionalModalProps) {
  const { user, perfil } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [motivo, setMotivo] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      if (proposal?.intervencao_operacional && proposal.intervencao_operacional_id) {
        setSelectedUserId(proposal.intervencao_operacional_id)
        setMotivo(proposal.intervencao_motivo || "")
      } else {
        setSelectedUserId("")
        setMotivo("")
      }
    }
  }, [isOpen, proposal])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/usuarios")
      if (!response.ok) throw new Error("Falha ao buscar colaboradores")
      const data: User[] = await response.json()
      // Prioritize active users
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

  const handleSalvarIntervencao = async () => {
    if (!proposal?.id_lead) return
    if (!selectedUserId) {
      toast.error("Selecione o operador responsável pela intervenção")
      return
    }

    const selectedUser = users.find((u) => u.id === selectedUserId)
    if (!selectedUser) {
      toast.error("Colaborador selecionado não foi encontrado")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        intervencao_operacional: true,
        intervencao_operacional_id: selectedUser.id,
        intervencao_operacional_nome: selectedUser.nome,
        intervencao_motivo: motivo.trim() || "Intervenção operacional registrada (divisão 50/50)",
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

      // Registrar histórico
      try {
        await supabase.from("historico_propostas").insert({
          proposta_id_lead: proposal.id_lead,
          usuario_id: user?.id,
          usuario_nome: perfil?.nome || user?.email || "Operacional",
          status_anterior: proposal.status || "-",
          status_novo: proposal.status || "-",
          observacao: `Intervenção Operacional registrada para ${selectedUser.nome}. Divisão 50/50 da produção. Motivo: ${motivo.trim() || "Sem observações adicionais"}`,
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

      // Registrar histórico
      try {
        await supabase.from("historico_propostas").insert({
          proposta_id_lead: proposal.id_lead,
          usuario_id: user?.id,
          usuario_nome: perfil?.nome || user?.email || "Operacional",
          status_anterior: proposal.status || "-",
          status_novo: proposal.status || "-",
          observacao: `Intervenção Operacional removida por ${perfil?.nome || user?.email || "Operacional"}. Produção 100% retornada ao corretor.`,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-6 bg-white rounded-2xl shadow-2xl border border-slate-200">
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
                Divisão compartilhada de produção e meta (50% / 50%)
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card Resumo da Proposta */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                ID Lead: <span className="text-slate-800">{proposal.id_lead}</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#1C2643]">
                {proposal.status || "EM ANDAMENTO"}
              </span>
            </div>
            <div className="text-[13px] font-black text-[#1C2643] truncate">
              {proposal.nome_cliente || "Cliente não informado"}
            </div>
            <div className="text-[11px] font-bold text-slate-500">
              Corretor Original:{" "}
              <span className="text-slate-700 font-extrabold">
                {proposal.corretor || "Não informado"}
              </span>
            </div>
          </div>

          {/* Alerta de intervenção ativa se houver */}
          {isAlreadyActive && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-black text-purple-950">
                  Intervenção ativa com {proposal.intervencao_operacional_nome || "Operacional"}
                </p>
                {proposal.intervencao_motivo && (
                  <p className="text-purple-700 text-[11px]">
                    Motivo: {proposal.intervencao_motivo}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Seleção do Operador */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-black uppercase text-slate-600 tracking-wider">
              Operador Responsável
            </label>
            {isLoading ? (
              <div className="h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full h-10 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-800">
                  <SelectValue placeholder="Selecione o operador que atuou..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs font-bold">
                      {u.nome} {u.funcao ? `(${u.funcao})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-black uppercase text-slate-600 tracking-wider">
              Motivo / Observações da Intervenção
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Auxílio na esteira bancária, desbloqueio de benefício, reversão de pendência..."
              rows={3}
              className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
            />
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-amber-900 font-semibold leading-relaxed">
              Ao registrar a intervenção, o sistema distribui automaticamente <strong>50% da produção/meta</strong> ao Corretor e <strong>50%</strong> ao Operador selecionado nos dashboards e rankings.
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
            disabled={isSubmitting || isRemoving || !selectedUserId}
            className="text-xs font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 h-9 rounded-xl px-5"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <GitFork className="w-3.5 h-3.5 mr-1.5" />
            )}
            {isAlreadyActive ? "Atualizar Intervenção" : "Confirmar Intervenção (50/50)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
