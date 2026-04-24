"use client"

export const dynamic = 'force-dynamic'

import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  MoreVertical, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  RefreshCw
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { NovoUsuarioModal } from "@/components/usuarios/novo-usuario-modal"
import { toast } from "sonner"

import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"

interface Usuario {
  id: string
  nome: string
  email: string
  username: string
  funcao: string
  status: string
  avatar_url?: string
  created_at: string
  supervisor_id?: string
}

export default function UsuariosPage() {
  const router = useRouter()
  const { canAccessAdminAreas, isLoading: authLoading } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filtroFuncao, setFiltroFuncao] = useState("todas")
  const [filtroStatus, setFiltroStatus] = useState("todos")

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estado para Confirmação customizada (substitui window.confirm que é bloqueado no iframe)
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    loading: boolean;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
    loading: false
  })

  useEffect(() => {
    if (!authLoading && !canAccessAdminAreas) {
      router.replace("/")
    }
  }, [authLoading, canAccessAdminAreas, router])

  const fetchUsuarios = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/usuarios")
      if (!response.ok) throw new Error("Erro ao carregar usuários")
      const data = await response.json()
      setUsuarios(data)
    } catch (error) {
      console.error(error)
      toast.error("Erro ao carregar lista de usuários")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  const handleDeleteUser = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Excluir Usuário",
      description: "Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.",
      loading: false,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, loading: true }))
        try {
          const response = await fetch(`/api/usuarios?id=${id}`, {
            method: "DELETE"
          })
          if (!response.ok) throw new Error("Erro ao excluir usuário")
          toast.success("Usuário excluído com sucesso")
          fetchUsuarios()
          setConfirmConfig(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error(error)
          toast.error("Erro ao excluir usuário")
        } finally {
          setConfirmConfig(prev => ({ ...prev, loading: false }))
        }
      }
    })
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const isActivating = currentStatus.toUpperCase() !== "ATIVO"
    const newStatus = isActivating ? "ATIVO" : "INATIVO"
    
    setConfirmConfig({
      isOpen: true,
      title: isActivating ? "Ativar Usuário" : "Inativar Usuário",
      description: `Tem certeza que deseja ${isActivating ? "ativar" : "inativar"} este usuário?`,
      loading: false,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, loading: true }))
        try {
          const response = await fetch("/api/usuarios", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: newStatus })
          })
          if (!response.ok) throw new Error("Erro ao alterar status do usuário")
          toast.success(`Usuário ${isActivating ? "ativado" : "inativado"} com sucesso`)
          fetchUsuarios()
          setConfirmConfig(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error(error)
          toast.error("Erro ao alterar status do usuário")
        } finally {
          setConfirmConfig(prev => ({ ...prev, loading: false }))
        }
      }
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "ATIVO":
        return "bg-emerald-100 text-emerald-600 hover:bg-emerald-100"
      case "INATIVO":
        return "bg-rose-100 text-rose-600 hover:bg-rose-100"
      default:
        return "bg-slate-100 text-slate-600"
    }
  }

  const getFuncaoColor = () => {
    return "bg-slate-100 text-slate-500 hover:bg-slate-100 font-bold"
  }

  const filteredUsers = usuarios.filter(user => {
    const matchFuncao = filtroFuncao === "todas" || user.funcao.toLowerCase() === filtroFuncao.toLowerCase()
    const matchStatus = filtroStatus === "todos" || user.status.toLowerCase() === filtroStatus.toLowerCase()
    return matchFuncao && matchStatus
  })

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroFuncao, filtroStatus]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header title="GESTÃO DE USUÁRIOS" />

      {/* Modal de Confirmação Customizado */}
      <Dialog 
        open={confirmConfig.isOpen} 
        onOpenChange={(open) => !confirmConfig.loading && setConfirmConfig(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-2">
                <RefreshCw className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest">
                {confirmConfig.title}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                {confirmConfig.description}
              </p>
            </div>
          </div>
          <div className="bg-slate-50 p-4 flex items-center justify-center gap-3 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
              disabled={confirmConfig.loading}
              className="px-6 h-[34px] border-slate-200 bg-white text-slate-600 font-bold text-[9px] rounded-lg hover:bg-slate-100 transition-all uppercase tracking-widest"
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmConfig.onConfirm}
              disabled={confirmConfig.loading}
              className="px-6 h-[34px] bg-[#0a192f] hover:bg-[#0a192f]/90 text-white font-bold text-[9px] rounded-lg gap-2 transition-all uppercase tracking-widest shadow-lg shadow-slate-900/20"
            >
              {confirmConfig.loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Confirmar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">
        {/* Main Card */}
        <Card className="card-shadow border border-slate-200 overflow-hidden bg-white rounded-2xl">
          <CardContent className="p-0">
            {/* Filters Bar */}
            <div className="p-6 flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Filtrar Função</label>
                  <Select value={filtroFuncao} onValueChange={setFiltroFuncao}>
                    <SelectTrigger className="w-[180px] h-[38px] bg-slate-50/50 border-slate-100 rounded-lg font-bold text-[11px] text-slate-700">
                      <SelectValue placeholder="Todas as funções" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100">
                      <SelectItem value="todas">Todas as funções</SelectItem>
                      <SelectItem value="Administrador">Administrador</SelectItem>
                      <SelectItem value="Corretor">Corretor</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                      <SelectItem value="Operacional">Operacional</SelectItem>
                      <SelectItem value="Desenvolvedor">Desenvolvedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Status</label>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="w-[140px] h-[38px] bg-slate-50/50 border-slate-100 rounded-lg font-bold text-[11px] text-slate-700">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100">
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={fetchUsuarios}
                  disabled={isLoading}
                  className="mt-5 text-slate-400 hover:text-slate-600"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button 
                  onClick={() => {
                    setEditingUser(null)
                    setIsModalOpen(true)
                  }}
                  className="bg-[#171717] hover:bg-[#171717]/90 text-white rounded-lg px-6 h-[38px] font-bold text-[11px] gap-2 shadow-lg shadow-slate-200 uppercase tracking-widest"
                >
                  <UserPlus className="w-4 h-4" />
                  Novo Usuário
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[400px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                  <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Carregando usuários...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhum usuário encontrado</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">E-mail</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Função</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supervisor</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedUsers.map((usuario) => {
                      const supervisor = usuarios.find(u => u.id === usuario.supervisor_id)
                      return (
                        <tr 
                          key={usuario.id}
                          className="group hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-9 h-9 border-2 border-white shadow-sm">
                                {usuario.avatar_url ? (
                                  <AvatarImage src={usuario.avatar_url || undefined} />
                                ) : null}
                                <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-[10px]">
                                  {usuario.nome.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <p className="text-[10.5px] font-bold text-slate-700 uppercase tracking-tight">{usuario.nome}</p>
                                <p className="text-[9px] font-medium text-slate-400">@{usuario.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <p className="text-[12px] font-medium text-slate-500">{usuario.email}</p>
                          </td>
                          <td className="px-8 py-4">
                            <Badge className={`rounded-full px-3 py-0.5 text-[9px] tracking-widest ${getFuncaoColor()}`}>
                              {usuario.funcao}
                            </Badge>
                          </td>
                          <td className="px-8 py-4">
                            {supervisor ? (
                              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{supervisor.nome}</p>
                            ) : (
                              <p className="text-[10px] font-medium text-slate-300 italic">-</p>
                            )}
                          </td>
                          <td className="px-8 py-4">
                            <Badge className={`rounded-full px-3 py-0.5 text-[9px] tracking-widest font-normal ${getStatusColor(usuario.status)}`}>
                              {usuario.status}
                            </Badge>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-full transition-all flex items-center justify-center outline-none mx-auto">
                                <MoreVertical className="w-4 h-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setEditingUser(usuario)
                                    setIsModalOpen(true)
                                  }}
                                  className="font-bold text-[11px] py-2.5 cursor-pointer uppercase tracking-wider"
                                >
                                  Editar Usuário
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={() => handleToggleStatus(usuario.id, usuario.status)}
                                  className={`font-bold text-[11px] py-2.5 cursor-pointer uppercase tracking-wider ${usuario.status.toUpperCase() === 'ATIVO' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                >
                                  {usuario.status.toUpperCase() === 'ATIVO' ? 'Inativar Usuário' : 'Ativar Usuário'}
                                </DropdownMenuItem>

                                <DropdownMenuItem 
                                  onClick={() => handleDeleteUser(usuario.id)}
                                  className="font-bold text-[11px] py-2.5 cursor-pointer text-rose-500 hover:text-rose-500 hover:bg-rose-50 uppercase tracking-wider"
                                >
                                  Excluir Usuário
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination / List Footer */}
            {totalPages > 1 && (
              <div className="px-8 py-10 flex flex-col sm:flex-row items-center justify-between border-t border-slate-50 bg-slate-50/30 gap-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredUsers.length)} de {filteredUsers.length} usuários
                </p>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20 transition-all disabled:opacity-30"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-lg transition-all text-[10px] font-black tracking-widest",
                          currentPage === page 
                            ? "bg-primary text-white shadow-lg shadow-primary/20 border-primary" 
                            : "border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20"
                        )}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20 transition-all disabled:opacity-30"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <NovoUsuarioModal 
        isOpen={isModalOpen} 
        usuario={editingUser}
        onClose={() => {
          setIsModalOpen(false)
          setEditingUser(null)
          fetchUsuarios()
        }} 
      />
    </div>
  )
}
