"use client"

import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  CheckCircle2, 
  History, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"
import { NovoUsuarioModal } from "@/components/usuarios/novo-usuario-modal"

const MOCK_USERS = [
  { id: "1", nome: "Nathali Beneduzi", email: "nathali.beneduzi@sharkconsig.com.br", funcao: "SUPERVISOR", status: "ATIVO", iniciais: "NB" },
  { id: "2", nome: "Felícia Moraes", email: "F=felicia.moraes@sharkconsig.com.br", funcao: "CORRETOR", status: "ATIVO", iniciais: "FM" },
  { id: "3", nome: "Talia Alves", email: "talia.alves@consig.net", funcao: "CORRETOR", status: "INATIVO", iniciais: "TA" },
  { id: "4", nome: "Jorge Fabrício", email: "jorge.fabrício@sharkconsig.com.br", funcao: "CORRETOR", status: "ATIVO", iniciais: "JF" },
  { id: "5", nome: "Gabriel Nicolas", email: "gabriel.nicolas@sharkconsig.com.br", funcao: "CORRETOR", status: "ATIVO", iniciais: "GN" },
]

export default function UsuariosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
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
                  <Select defaultValue="todas">
                    <SelectTrigger className="w-[180px] h-[38px] bg-slate-50/50 border-slate-100 rounded-lg font-bold text-[11px] text-slate-700">
                      <SelectValue placeholder="Todas as funções" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100">
                      <SelectItem value="todas">Todas as funções</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="corretor">Corretor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Status</label>
                  <Select defaultValue="todos">
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
            <div className="overflow-x-auto">
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
                  {MOCK_USERS.map((usuario, index) => (
                    <motion.tr 
                      key={usuario.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-9 h-9 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-[10px]">
                              {usuario.iniciais}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-[10.5px] font-bold text-slate-700 uppercase tracking-tight">{usuario.nome}</p>
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
                            <DropdownMenuItem className="font-bold text-[11px] py-2.5 cursor-pointer text-rose-500 hover:text-rose-500 hover:bg-rose-50 uppercase tracking-wider">Inativar Usuário</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
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
                  1-5 de 42
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

        {/* Stats Grid */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full md:w-auto"
          >
            <Card className="card-shadow border border-slate-200 border-t-4 border-t-emerald-500 bg-white rounded-xl overflow-hidden w-full md:w-[260px] h-[90px]">
              <CardContent className="p-4 flex items-center gap-3 h-full">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 truncate">Usuários Ativos</p>
                  <div className="flex items-end gap-1.5">
                    <p className="text-2xl font-black text-slate-900 leading-none">38</p>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-0.5">Usuário(s)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full md:w-auto"
          >
            <Card className="card-shadow border border-slate-200 border-t-4 border-t-blue-500 bg-white rounded-xl overflow-hidden w-full md:w-[260px] h-[90px]">
              <CardContent className="p-4 flex items-center gap-3 h-full">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <History className="w-5 h-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 truncate">Últimos 30 dias</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-black text-slate-900 leading-none">+12</p>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">novos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full md:w-auto"
          >
            <Card className="card-shadow border border-slate-200 bg-[#1a2332] rounded-xl overflow-hidden text-white w-full md:w-[260px] h-[90px]">
              <CardContent className="p-4 flex items-center gap-3 h-full">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-0.5 truncate">Segurança</p>
                  <p className="text-[13px] font-bold text-white leading-tight uppercase tracking-tight">Logs de auditoria em dia</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <NovoUsuarioModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  )
}
