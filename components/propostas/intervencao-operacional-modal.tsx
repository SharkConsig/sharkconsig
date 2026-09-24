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
import { Loader2, GitFork, ShieldAlert, CheckCircle2, UserCheck, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"

interface User {
  id: string
  nome: string
  email?: string
  role?: string
  funcao?: string
  supervisor_nome?: string
}

interface IntervencaoOperacionalModalProps {
  isOpen: boolean
  onClose: () => void
  proposal: {
    id_lead: string
    nome_cliente?: string
    cliente_cpf?: string
    corretor?: string
    status?: string
    intervencao_operacional?: boolean
    intervencao_operacional_id?: string
    intervencao_operacional_nome?: string
    [key: string]: any
  } | null
  onSuccess?: () => void
}

export function IntervencaoOperacionalModal({
  isOpen,
  onClose,
  proposal,
  onSuccess,
}: IntervencaoOperacionalModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [isInterventionActive, setIsInterventionActive] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && proposal) {
      fetchUsers()
      setIsInterventionActive(Boolean(proposal.intervencao_operacional))
      setSelectedUserId(proposal.intervencao_operacional_id || "")
    }
  }, [isOpen, proposal])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/usuarios")
      if (!response.ok) throw new Error("Falha ao buscar usuários")
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error("Erro ao buscar usuários:", error)
      toast.error("Erro ao carregar lista de usuários")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!proposal) return

    if (isInterventionActive && !selectedUserId) {
      toast.error("Selecione um colaborador do Operacional para a intervenção.")
      return
    }

    setIsSubmitting(true)
    try {
      let updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }

      let historicoDesc = ""

      if (isInterventionActive) {
        const selectedUser = users.find((u) => u.id === selectedUserId)
        const opNome = selectedUser?.nome || proposal.intervencao_operacional_nome || "Operacional"
        updatePayload = {
          ...updatePayload,
          intervencao_operacional: true,
          intervencao_operacional_id: selectedUserId,
          intervencao_operacional_nome: opNome,
        }
        historicoDesc = `Intervenção Operacional (50/50) ativada com ${opNome}`
      } else {
        updatePayload = {
          ...updatePayload,
          intervencao_operacional: false,
          intervencao_operacional_id: null,
          intervencao_operacional_nome: null,
        }
        historicoDesc = "Intervenção Operacional removida"
      }

      const { error } = await supabase
        .from("propostas")
        .update(updatePayload)
        .eq("id_lead", proposal.id_lead)

      if (error) throw error

      // Registro no histórico de propostas
      try {
        await supabase.from("historico_propostas").insert({
          proposta_id_lead: proposal.id_lead,
          status_anterior: proposal.status || "",
          status_novo: proposal.status || "",
          descricao: historicoDesc,
          tipo: "intervencao_operacional",
          created_at: new Date().toISOString(),
        })
      } catch (histErr) {
        console.warn("Aviso ao registrar histórico:", histErr)
      }

      toast.success(
        isInterventionActive
          ? "Intervenção Operacional (50/50) ativada com sucesso!"
          : "Intervenção Operacional desativada com sucesso!"
      )

      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error) {
      console.error("Erro ao salvar intervenção:", error)
      toast.error("Erro ao atualizar intervenção operacional")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!proposal) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xl">
        {/* Cabeçalho */}
        <DialogHeader className="p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <GitFork className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white tracking-wide uppercase">
                Intervenção Operacional (50/50)
              </DialogTitle>
              <p className="text-[11px] text-purple-100 font-medium">
                Divisão de 50% da meta de produção entre Corretor e Operacional
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Card Resumo da Proposta */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-semibold text-[11px] uppercase tracking-wider">Proposta / Lead:</span>
              <span className="font-mono font-bold text-slate-800">#{proposal.id_lead}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-semibold text-[11px] uppercase tracking-wider">Cliente:</span>
              <span className="font-bold text-slate-900 truncate max-w-[280px]">
                {proposal.nome_cliente || "---"}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-semibold text-[11px] uppercase tracking-wider">Corretor Titular:</span>
              <span className="font-bold text-slate-800">{proposal.corretor || "---"}</span>
            </div>
          </div>

          {/* Toggle de Ativação da Intervenção */}
          <div className="p-3.5 border rounded-xl bg-slate-50/50 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                Status da Intervenção
              </span>
              <span className="text-[11px] text-slate-500 block">
                {isInterventionActive
                  ? "Ativa: A meta de produção será dividida 50% / 50%."
                  : "Desativada: A pontuação fica 100% com o corretor titular."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsInterventionActive(!isInterventionActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isInterventionActive ? "bg-purple-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isInterventionActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Seleção do Colaborador Operacional */}
          {isInterventionActive && (
            <div className="space-y-1.5 animate-in fade-in-50 duration-200">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                Operacional Responsável pela Intervenção
              </label>
              {isLoading ? (
                <div className="flex items-center justify-center p-3 text-xs text-slate-500 gap-2 border rounded-lg bg-slate-50">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  Carregando operadores...
                </div>
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-full h-10 text-xs bg-white border-slate-200 text-slate-800">
                    <SelectValue placeholder="Selecione o operador responsável..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 bg-white">
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-semibold text-slate-800">{u.nome}</span>
                          <span className="text-[10px] text-slate-400">
                            ({u.role || u.funcao || "Colaborador"})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-[10px] text-slate-500 italic mt-1">
                O operador selecionado receberá metade da produção desta proposta nos relatórios e ranking.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 px-4 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border-slate-200"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting || (isInterventionActive && !selectedUserId)}
            className="h-9 px-4 text-xs font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Salvar Intervenção
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
