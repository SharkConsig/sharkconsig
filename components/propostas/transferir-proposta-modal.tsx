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
import { Loader2, UserPlus, Lock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"
import { useAuth } from "@/context/auth-context"

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
  const { perfil: user, isOperational, isAdmin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lockedBy, setLockedBy] = useState<{ id: string; nome: string; role: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      setSelectedUserId("")
    }
  }, [isOpen])

  // Presence logic for locking
  useEffect(() => {
    if (!isOpen || !user || !proposal?.id_lead) return
    if (!isOperational && !isAdmin) return

    const lockerRoles = ['Operacional', 'Administrador', 'Administrativo', 'Admin', 'Desenvolvedor'];
    const isLockerRole = (role: string) => lockerRoles.includes(role);

    const channel = supabase.channel(`proposal_lock_${proposal.id_lead}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    let timeoutId: NodeJS.Timeout;

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        const presences = Object.values(newState).flat() as Array<{
          user_id: string;
          user_name: string;
          role: string;
          online_at: string;
        }>
        
        const otherUser = presences.find(p => 
          isLockerRole(p.role) && p.user_id !== user.id
        )
        
        if (otherUser) {
          clearTimeout(timeoutId);
          setLockedBy({
            id: otherUser.user_id,
            nome: otherUser.user_name,
            role: otherUser.role
          })
        } else {
          // Delay para evitar flickering
          timeoutId = setTimeout(() => {
            setLockedBy(null)
          }, 1500);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            user_name: user.nome || user.username || 'Usuário',
            role: user.role,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel)
    }
  }, [isOpen, user, proposal?.id_lead, isOperational, isAdmin])

  const isLockedByOther = !!lockedBy && lockedBy.id !== user?.id && (isOperational || isAdmin);

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
          {/* Lock Banner */}
          {isLockedByOther && (
            <div className="bg-[#DB8E00] border border-[#2A1A01] rounded-xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-[#2A1A01] p-2 rounded-full">
                <Lock className="w-5 h-5 text-[#FAFAFA]" />
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-black text-[#2A1A01] uppercase tracking-tight">Proposta em Edição</p>
                <p className="text-[11px] text-[#2A1A01] font-bold">
                  Esta proposta está sendo atuada por <span className="font-black underline">{lockedBy?.nome}</span> neste momento. Você não pode transferir agora.
                </p>
              </div>
            </div>
          )}

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
            disabled={!selectedUserId || isSubmitting || isLockedByOther}
            className="bg-primary hover:bg-primary/90 text-white font-bold disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            CONFIRMAR TRANSFERÊNCIA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
