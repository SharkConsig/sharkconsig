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
import { Loader2, GitFork, UserCheck, Trash2, AlertCircle, Search, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

interface User {
  id: string
  nome: string
  email?: string
  funcao?: string
  cargo?: string
  role?: string
  status?: string
  regime_contratacao?: string
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
  const { user: currentUser, perfil, isAdmin, isDeveloper, isOperational, isMonitoramento } = useAuth()
  const canManageIntervention = Boolean(!isMonitoramento && (isAdmin || isDeveloper || isOperational))
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [userSearchTerm, setUserSearchTerm] = useState<string>("")
  const [selectedUserId2, setSelectedUserId2] = useState<string>("none")
  const [userSearchTerm2, setUserSearchTerm2] = useState<string>("")
  const [pctCorretor, setPctCorretor] = useState<string>("50")
  const [pctOperador1, setPctOperador1] = useState<string>("50")
  const [pctOperador2, setPctOperador2] = useState<string>("0")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isAlreadyActive = Boolean(proposal?.intervencao_operacional)
  const hasSecondOp = Boolean(selectedUserId2 && selectedUserId2 !== "none")

  // Calcula valores numéricos das porcentagens
  const pCorretorNum = parseFloat(pctCorretor) || 0
  const pOp1Num = parseFloat(pctOperador1) || 0
  const pOp2Num = hasSecondOp ? (parseFloat(pctOperador2) || 0) : 0
  const totalPercentage = Math.round((pCorretorNum + pOp1Num + pOp2Num) * 100) / 100
  const isPercentageValid = Math.abs(totalPercentage - 100) <= 0.01

  // Filtra todos os colaboradores/usuários ativos, excluindo os do regime PJ
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        // 1. Somente usuários ativos
        const statusUpper = (u.status || "ATIVO").trim().toUpperCase()
        const isAtivo = statusUpper === "ATIVO" && statusUpper !== "INATIVO"
        if (!isAtivo) return false

        // 2. Todos os colaboradores/usuários ativos, menos os do regime PJ
        const regime = (u.regime_contratacao || "").trim().toLowerCase()
        const func = (u.funcao || u.cargo || "").trim().toLowerCase()
        const role = (u.role || "").trim().toLowerCase()

        const isPJ =
          regime === "pj" ||
          regime.includes("pj") ||
          func === "pj" ||
          func.includes("(pj)") ||
          func.includes(" - pj") ||
          func.includes(" pj") ||
          role === "pj" ||
          role.includes("(pj)") ||
          u.id === "77af8a7b-7cc2-43dd-b24d-b8a1e92c4639"

        if (isPJ) return false

        return true
      })
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"))
  }, [users])

  // Filtra por termo de busca digitado pelo usuário para o 1º operador
  const displayedUsers = useMemo(() => {
    if (!userSearchTerm.trim()) return filteredUsers
    const term = userSearchTerm.trim().toLowerCase()
    return filteredUsers.filter((u) => {
      const name = (u.nome || "").toLowerCase()
      const role = (u.funcao || u.role || u.cargo || "").toLowerCase()
      return name.includes(term) || role.includes(term)
    })
  }, [filteredUsers, userSearchTerm])

  // Filtra por termo de busca digitado para o 2º operador (exclui o 1º operador selecionado)
  const displayedUsers2 = useMemo(() => {
    const list = filteredUsers.filter((u) => u.id !== selectedUserId)
    if (!userSearchTerm2.trim()) return list
    const term = userSearchTerm2.trim().toLowerCase()
    return list.filter((u) => {
      const name = (u.nome || "").toLowerCase()
      const role = (u.funcao || u.role || u.cargo || "").toLowerCase()
      return name.includes(term) || role.includes(term)
    })
  }, [filteredUsers, selectedUserId, userSearchTerm2])

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      setUserSearchTerm("")
      setUserSearchTerm2("")
      if (proposal?.intervencao_operacional_id) {
        setSelectedUserId(proposal.intervencao_operacional_id)
      } else {
        setSelectedUserId("")
      }

      let initialUser2 = "none"
      if (proposal?.estagiario_colaborador_id && proposal.estagiario_colaborador_id !== proposal.intervencao_operacional_id) {
        initialUser2 = proposal.estagiario_colaborador_id
      } else if (proposal?.intervencao_motivo && proposal.intervencao_motivo.includes("2º")) {
        const match = proposal.intervencao_motivo.match(/2º [^()]+\(([^)]+)\)/)
        if (match && match[1]) {
          initialUser2 = match[1]
        }
      }
      setSelectedUserId2(initialUser2)

      // Carrega porcentagens previamente salvas ou valores padrão
      const pctMatch = proposal?.intervencao_motivo?.match(/PCT:\[([0-9.]+),([0-9.]+)(?:,([0-9.]+))?\]/)
      if (pctMatch) {
        setPctCorretor(pctMatch[1] || "50")
        setPctOperador1(pctMatch[2] || "50")
        setPctOperador2(pctMatch[3] || "0")
      } else {
        if (initialUser2 !== "none") {
          setPctCorretor("34")
          setPctOperador1("33")
          setPctOperador2("33")
        } else {
          setPctCorretor("50")
          setPctOperador1("50")
          setPctOperador2("0")
        }
      }
    }
  }, [isOpen, proposal])

  const handleSelectUser2Change = (val: string) => {
    setSelectedUserId2(val)
    if (val && val !== "none") {
      const p2 = parseFloat(pctOperador2) || 0
      if (p2 === 0 || (pctCorretor === "50" && pctOperador1 === "50")) {
        setPctCorretor("34")
        setPctOperador1("33")
        setPctOperador2("33")
      }
    } else {
      if (pctCorretor === "34" && pctOperador1 === "33") {
        setPctCorretor("50")
        setPctOperador1("50")
      }
      setPctOperador2("0")
    }
  }

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
    if (!canManageIntervention) {
      toast.error("Apenas Administrador, Operacional e Desenvolvedor podem aplicar intervenção.")
      return
    }
    if (!selectedUserId) {
      toast.error("Selecione o operador responsável pela intervenção.")
      return
    }

    if (!isPercentageValid) {
      toast.error(`A soma das porcentagens deve ser exatamente 100% (atual: ${totalPercentage}%).`)
      return
    }

    const selectedUser = users.find((u) => u.id === selectedUserId)
    if (!selectedUser) {
      toast.error("Operador não encontrado.")
      return
    }

    const selectedUser2 = selectedUserId2 && selectedUserId2 !== "none"
      ? users.find((u) => u.id === selectedUserId2)
      : null

    const finalNome = selectedUser2
      ? `${selectedUser.nome} & ${selectedUser2.nome}`
      : selectedUser.nome

    setIsSubmitting(true)
    try {
      const updatePayload: Record<string, any> = {
        intervencao_operacional: true,
        intervencao_operacional_id: selectedUser.id,
        intervencao_operacional_nome: finalNome,
        intervencao_motivo: selectedUser2
          ? `PCT:[${pCorretorNum},${pOp1Num},${pOp2Num}] | Intervenção com 2 operadores: 1º ${selectedUser.nome} (${selectedUser.id}) | 2º ${selectedUser2.nome} (${selectedUser2.id})`
          : `PCT:[${pCorretorNum},${pOp1Num},0] | Intervenção Operacional atribuída para: ${selectedUser.nome} (${selectedUser.id})`,
        intervencao_data: new Date().toISOString(),
        intervencao_autor_id: currentUser?.id || null,
        intervencao_autor_nome: perfil?.nome || "Sistema",
        updated_at: new Date().toISOString(),
      }

      if (selectedUser2) {
        updatePayload.estagiario_colaborador_id = selectedUser2.id
        updatePayload.estagiario_colaborador_nome = selectedUser2.nome
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
          tipo_alteracao: "INTERVENÇÃO OPERACIONAL",
          descricao: selectedUser2
            ? `Intervenção Operacional (${pCorretorNum}% Corretor / ${pOp1Num}% 1º Op / ${pOp2Num}% 2º Op) atribuída para: ${selectedUser.nome} e ${selectedUser2.nome} por ${perfil?.nome || "Administrador"}`
            : `Intervenção Operacional (${pCorretorNum}% Corretor / ${pOp1Num}% Operador) atribuída para: ${selectedUser.nome} por ${perfil?.nome || "Administrador"}`,
          usuario_id: currentUser?.id,
          usuario_nome: perfil?.nome || "Sistema",
          created_at: new Date().toISOString(),
        })
      } catch (histErr) {
        console.warn("Aviso ao registrar histórico:", histErr)
      }

      toast.success(
        selectedUser2
          ? `Intervenção atribuída (${pCorretorNum}% / ${pOp1Num}% / ${pOp2Num}%) para ${selectedUser.nome} e ${selectedUser2.nome}!`
          : `Intervenção atribuída (${pCorretorNum}% / ${pOp1Num}%) para ${selectedUser.nome}!`
      )
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
    if (!canManageIntervention) {
      toast.error("Apenas Administrador, Operacional e Desenvolvedor podem remover intervenção.")
      return
    }

    setIsSubmitting(true)
    try {
      const updatePayload: Record<string, any> = {
        intervencao_operacional: false,
        intervencao_operacional_id: null,
        intervencao_operacional_nome: null,
        intervencao_motivo: null,
        intervencao_data: null,
        intervencao_autor_id: null,
        intervencao_autor_nome: null,
        updated_at: new Date().toISOString(),
      }

      if (proposal.estagiario_colaborador_id && (proposal.estagiario_colaborador_id === selectedUserId2 || proposal.intervencao_motivo?.includes("2º"))) {
        updatePayload.estagiario_colaborador_id = null
        updatePayload.estagiario_colaborador_nome = null
      }

      const { error } = await supabase
        .from("propostas")
        .update(updatePayload)
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
      <DialogContent className="max-w-[720px] sm:max-w-[720px] w-full bg-white border border-slate-200 rounded-2xl shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black text-slate-800 tracking-tight uppercase">
                Intervenção Operacional
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
                <p className="text-slate-500 text-[12px]">
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
                  <SelectValue placeholder="Selecione o operador...">
                    {(val: any) => {
                      if (!val) return null
                      const u = users.find((item) => item.id === val)
                      return u ? `${u.nome}${u.funcao || u.role ? ` (${u.funcao || u.role})` : ""}` : val
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60 z-[250] overflow-y-auto">
                  <div
                    className="p-2 border-b border-slate-100 sticky top-0 bg-white z-20"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar operador por nome ou cargo..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="w-full pl-8 pr-7 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
                        autoFocus
                      />
                      {userSearchTerm && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setUserSearchTerm("")
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {displayedUsers.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs font-medium">
                      Nenhum operador encontrado
                    </div>
                  ) : (
                    displayedUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.nome} {u.funcao || u.role ? `(${u.funcao || u.role})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Segundo Operador (Opcional) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Segundo Operador (Opcional):
              </label>
              {selectedUserId2 && selectedUserId2 !== "none" && (
                <button
                  type="button"
                  onClick={() => handleSelectUser2Change("none")}
                  className="text-[10px] text-rose-500 hover:text-rose-700 font-medium hover:underline cursor-pointer"
                >
                  Remover 2º operador
                </button>
              )}
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center p-3 text-slate-400 gap-2 border border-slate-200 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Carregando operadores...</span>
              </div>
            ) : (
              <Select value={selectedUserId2} onValueChange={handleSelectUser2Change}>
                <SelectTrigger className="w-full h-10 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione o segundo operador caso haja">
                    {(val: any) => {
                      if (!val || val === "none") return null
                      const u = users.find((item) => item.id === val)
                      return u ? `${u.nome}${u.funcao || u.role ? ` (${u.funcao || u.role})` : ""}` : null
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60 z-[250] overflow-y-auto">
                  <div
                    className="p-2 border-b border-slate-100 sticky top-0 bg-white z-20"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar 2º operador por nome ou cargo..."
                        value={userSearchTerm2}
                        onChange={(e) => setUserSearchTerm2(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="w-full pl-8 pr-7 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
                      />
                      {userSearchTerm2 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setUserSearchTerm2("")
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <SelectItem value="none" className="text-xs text-slate-500 italic font-medium">
                    Selecione o segundo operador caso haja
                  </SelectItem>

                  {displayedUsers2.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs font-medium">
                      Nenhum outro operador disponível
                    </div>
                  ) : (
                    displayedUsers2.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.nome} {u.funcao || u.role ? `(${u.funcao || u.role})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Divisão de Porcentagem de Metas e Produção */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Divisão da Produção e Metas (%):
              </label>
            </div>

            <div className={cn("grid gap-2", hasSecondOp ? "grid-cols-3" : "grid-cols-2")}>
              {/* 1º Campo: Corretor Titular */}
              <div className="space-y-1">
                <label
                  className="text-[10px] font-semibold text-slate-600 truncate block"
                  title={proposal?.corretor || "Corretor Titular"}
                >
                  1º {proposal?.corretor ? proposal.corretor.split(" ")[0] : "Corretor"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={pctCorretor}
                    onChange={(e) => setPctCorretor(e.target.value)}
                    className="w-full pl-2.5 pr-6 py-1.5 text-xs font-bold text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              {/* 2º Campo: Segundo Operador (1º da Intervenção) */}
              <div className="space-y-1">
                <label
                  className="text-[10px] font-semibold text-slate-600 truncate block"
                  title={users.find((u) => u.id === selectedUserId)?.nome || "2º Operador"}
                >
                  2º {users.find((u) => u.id === selectedUserId)?.nome?.split(" ")[0] || "2º Operador"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={pctOperador1}
                    onChange={(e) => setPctOperador1(e.target.value)}
                    className="w-full pl-2.5 pr-6 py-1.5 text-xs font-bold text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              {/* 3º Campo: Terceiro Operador (2º da Intervenção) - Condicionado à seleção */}
              {hasSecondOp && (
                <div className="space-y-1">
                  <label
                    className="text-[10px] font-semibold text-slate-600 truncate block"
                    title={users.find((u) => u.id === selectedUserId2)?.nome || "3º Operador"}
                  >
                    3º {users.find((u) => u.id === selectedUserId2)?.nome?.split(" ")[0] || "3º Operador"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={pctOperador2}
                      onChange={(e) => setPctOperador2(e.target.value)}
                      className="w-full pl-2.5 pr-6 py-1.5 text-xs font-bold text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg text-amber-800 text-[11px]">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <p>
              Ao confirmar, a produção e metas desta proposta serão divididas exatamente conforme as porcentagens definidas acima. Com a intervenção desativada, a pontuação volta a ser 100% exclusiva do corretor titular.
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
              Desativar Intervenção
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
              disabled={isSubmitting || isLoading || !selectedUserId || !isPercentageValid}
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
