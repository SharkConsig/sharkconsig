"use client"

export const dynamic = 'force-dynamic'

import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Download, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  RefreshCw
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
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
}

export default function UsuariosPage() {
  const router = useRouter()
  const { canAccessAdminAreas, isLoading: authLoading } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filtroFuncao, setFiltroFuncao] = useState("todas")
  const [filtroStatus, setFiltroStatus] = useState("todos")

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
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return

    try {
      const response = await fetch(`/api/usuarios?id=${id}`, {
        method: "DELETE"
      })
      if (!response.ok) throw new Error("Erro ao excluir usuário")
      toast.success("Usuário excluído com sucesso")
      fetchUsuarios()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao excluir usuário")
    }
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

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header title="GESTÃO DE USUÁRIOS" />
      
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
                <Button variant="outline" className="h-[38px] w-[140px] border-slate-200 text-slate-600 font-bold text-[9.5px] rounded-lg gap-2 bg-white hover:bg-slate-50 uppercase tracking-widest p-0">
                  <Download className="w-3.5 h-3.5" />
                  Exportar CSV
                </Button>
                <Button 
                  onClick={() => setIsModalOpen(true)}
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
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((usuario) => (
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
                          <Badge className={`rounded-full px-3 py-0.5 text-[9px] tracking-widest font-extrabold ${getStatusColor(usuario.status)}`}>
                            {usuario.status}
                          </Badge>
                        </td>
                        <td className="px-8 py-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-full transition-all flex items-center justify-center outline-none mx-auto">
                              <MoreVertical className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl">
                              <DropdownMenuItem className="font-bold text-[11px] py-2.5 cursor-pointer uppercase tracking-wider">Editar Usuário</DropdownMenuItem>
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
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="px-8 py-10 flex items-center justify-between border-t border-slate-50 bg-slate-50/30">
              <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors disabled:opacity-50">
                Primeira
              </button>
              
              <div className="flex items-center gap-4">
                <button className="p-1 text-slate-400 hover:text-primary disabled:opacity-50">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                  {filteredUsers.length} usuários
                </span>
                <button className="p-1 text-slate-400 hover:text-primary">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">
                Última
              </button>
            </div>
          </CardContent>
        </Card>

      </div>

      <NovoUsuarioModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false)
          fetchUsuarios()
        }} 
      />
    </div>
  )
}
