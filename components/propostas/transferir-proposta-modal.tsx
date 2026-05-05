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
import { Loader2, UserPlus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"

interface User {
  id: string
  nome: string
  email?: string
  funcao?: string
  supervisor_nome?: string
}

interface TransferirPropostaModalProps {
  isOpen: boolean
  onClose: () => void
  proposal: {
    id_lead: string
    nome_cliente: string
    cliente_cpf: string
    corretor?: string
    status: string
  } | null
  onTransferComplete: () => void
}

export function TransferirPropostaModal({
  isOpen,
  onClose,
  proposal,
  onTransferComplete,
}: TransferirPropostaModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      setSelectedUserId("")
    }
  }, [isOpen])

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

  const handleTransfer = async () => {
    if (!selectedUserId || !proposal) return

    const selectedUser = users.find((u) => u.id === selectedUserId)
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("propostas")
        .update({
          corretor_id: selectedUser.id,
          corretor: selectedUser.nome,
          equipe: selectedUser.supervisor_nome || "-"
        })
        .eq("id_lead", proposal.id_lead)

      if (error) throw error

      // Registrar no histórico
      await supabase.from("historico_propostas").insert({
        proposta_id_lead: proposal.id_lead,
        status_anterior: proposal.status,
        status_novo: proposal.status,
        descricao: `Proposta transferida de "${proposal.corretor || 'Sem Corretor'}" para "${selectedUser.nome}"`,
        tipo: "transferencia_proprietario",
        created_at: new Date().toISOString()
      })

      toast.success("Proposta transferida com sucesso!")
      onTransferComplete()
      onClose()
    } catch (error) {
      console.error("Erro ao transferir proposta:", error)
      toast.error("Erro ao transferir proposta")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            TRANSFERIR PROPOSTA
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Proposta</p>
            <p className="text-sm font-bold text-slate-700">{proposal?.nome_cliente}</p>
            <p className="text-[11px] text-slate-500">ID: {proposal?.id_lead} | CPF: {proposal?.cliente_cpf}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Selecionar Novo Corretor
            </label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione um corretor"} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{user.nome}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{user.funcao || 'Corretor'} {user.supervisor_nome ? `| ${user.supervisor_nome}` : ''}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            CANCELAR
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={!selectedUserId || isSubmitting}
            className="bg-primary hover:bg-primary/90 text-white font-bold"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            CONFIRMAR TRANSFERÊNCIA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
