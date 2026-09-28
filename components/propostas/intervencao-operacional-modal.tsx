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
import { Loader2, GitFork, UserCheck, Trash2, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"
import { useAuth } from "@/context/auth-context"

interface User {
  id: string
  nome: string
  email?: string
  funcao?: string
  cargo?: string
  role?: string
}

interface ProposalData {
  id_lead: string
  nome_cliente?: string
  cliente_cpf?: string
  corretor?: string
  intervencao_operacional?: boolean
  intervencao_operacional_id?: string
  intervencao_operacional_nome?: string
  [key: string]: any
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
  const { user: currentUser, perfil } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isAlreadyActive = Boolean(proposal?.intervencao_operacional)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      if (proposal?.intervencao_operacional_id) {
        setSelectedUserId(proposal.intervencao_operacional_id)
      } else {
        setSelectedUserId("")
      }
    }
  }, [isOpen, proposal])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/usuarios")
      if (!response.ok) throw new Error("Falha ao buscar usuários")
      const data = await response.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Erro ao buscar usuários:", error)
      toast.error("Erro ao carregar lista de operadores")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyIntervention = async () => {
    if (!proposal) return
    if (!selectedUserId) {
      toast.error("Selecione o operador responsável pela intervenção.")
      return
    }

    const selectedUser = users.find((u) => u.id === selectedUserId)
    if (!selectedUser) {
      toast.error("Operador não encontrado.")
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("propostas")
        .update({
          intervencao_operacional: true,
          intervencao_operacional_id: selectedUser.id,
          intervencao_operacional_nome: selectedUser.nome,
          updated_at: new Date().toISOString(),
        })
        .eq("id_lead", proposal.id_lead)

      if (error) throw error

      // Registro no histórico de propostas
      try {
        await supabase.from("historico_propostas").insert({
          proposta_id_lead: proposal.id_lead,
          tipo_alteracao: "INTERVENÇÃO OPERACIONAL",
          descricao: `Intervenção Operacional (50/50) atribuída para: ${selectedUser.nome} por ${perfil?.nome || "Administrador"}`,
          usuario_id: currentUser?.id,
          usuario_nome: perfil?.nome || "Sistema",
          created_at: new Date().toISOString(),
        })
      } catch (histErr) {
        console.warn("Aviso ao registrar histórico:", histErr)
      }

      toast.success(`Intervenção 50/50 atribuída para ${selectedUser.nome}!`)
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Erro ao aplicar intervenção:", error)
      toast.error(error.message || "Erro ao registrar intervenção operacional.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveIntervention = async () => {
    if (!proposal) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("propostas")
        .update({
          intervencao_operacional: false,
          intervencao_operacional_id: null,
          intervencao_operacional_nome: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id_lead", proposal.id_lead)

      if (error) throw error

      try {
        await supabase.from("historico_propostas").insert({
          proposta_id_lead: proposal.id_lead,
          tipo_alteracao: "REMOÇÃO DE INTERVENÇÃO",
          descricao: `Intervenção Operacional removida por ${perfil?.nome || "Administrador"}`,
          usuario_id: currentUser?.id,
          usuario_nome: perfil?.nome || "Sistema",
          created_at: new Date().toISOString(),
        })
      } catch (histErr) {
        console.warn("Aviso ao registrar histórico:", histErr)
      }

      toast.success("Intervenção operacional desativada com sucesso!")
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Erro ao remover intervenção:", error)
      toast.error(error.message || "Erro ao remover intervenção.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black text-slate-800 tracking-tight uppercase">
                Intervenção Operacional (50/50)
              </DialogTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Divisão de produção meta com o colaborador operacional
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 text-xs">
          {proposal && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <p className="text-slate-500 font-medium text-[11px]">Cliente:</p>
              <p className="text-slate-900 font-bold">{proposal.nome_cliente || "Não informado"}</p>
              {proposal.corretor && (
                <p className="text-slate-500 text-[10px]">
                  Corretor original: <span className="font-semibold text-slate-700">{proposal.corretor}</span>
                </p>
              )}
            </div>
          )}

          {isAlreadyActive && (
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-purple-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                Intervenção Atualmente Ativa
              </div>
              <p className="text-[11px] text-purple-700">
                Operador atribuído: <strong className="font-bold">{proposal?.intervencao_operacional_nome || "Operacional"}</strong>
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {isAlreadyActive ? "Alterar Operador da Intervenção:" : "Selecionar Operador para Intervenção:"}
            </label>
            {isLoading ? (
              <div className="flex items-center justify-center p-3 text-slate-400 gap-2 border border-slate-200 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Carregando operadores...</span>
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full h-10 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione o operador..." />
                </SelectTrigger>
                <SelectContent className="max-h-56 z-[250]">
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.nome} {u.funcao || u.role ? `(${u.funcao || u.role})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-start gap-2 p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg text-amber-800 text-[11px]">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <p>
              Ao confirmar, a produção e metas desta proposta serão divididas meio a meio (50/50) entre o corretor e o colaborador operacional selecionado.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between sm:justify-between">
          {isAlreadyActive ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemoveIntervention}
              disabled={isSubmitting}
              className="text-xs font-bold gap-1.5 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Desativar 50/50
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApplyIntervention}
              disabled={isSubmitting || isLoading || !selectedUserId}
              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  {isAlreadyActive ? "Atualizar" : "Confirmar Intervenção"}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
