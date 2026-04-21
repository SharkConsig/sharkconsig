"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Settings2,
  Tag
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface TicketStatus {
  id: string
  nome: string
  cor: string
  created_at: string
}

const colorOptions = [
  { label: "Azul", value: "blue", class: "bg-blue-500" },
  { label: "Verde", value: "green", class: "bg-green-500" },
  { label: "Laranja", value: "orange", class: "bg-orange-500" },
  { label: "Vermelho", value: "red", class: "bg-red-500" },
  { label: "Roxo", value: "purple", class: "bg-purple-500" },
  { label: "Cinza", value: "slate", class: "bg-slate-500" },
  { label: "Amarelo", value: "amber", class: "bg-amber-500" },
  { label: "Ciano", value: "cyan", class: "bg-cyan-500" },
  { label: "Esmeralda", value: "emerald", class: "bg-emerald-500" },
  { label: "Rosa", value: "rose", class: "bg-rose-500" },
]

export default function SettingsPage() {
  const { perfil, isAdmin } = useAuth()
  const [statuses, setStatuses] = useState<TicketStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form State
  const [currentStatusId, setCurrentStatusId] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [cor, setCor] = useState("slate")

  const fetchStatuses = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('status_chamados')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setStatuses(data || [])
    } catch (error: any) {
      console.error("Erro ao carregar status:", error)
      const errorMessage = error.message || "Erro ao carregar lista de status"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatuses()
  }, [fetchStatuses])

  const resetForm = () => {
    setCurrentStatusId(null)
    setNome("")
    setCor("slate")
  }

  const handleOpenModal = (status?: TicketStatus) => {
    if (status) {
      setCurrentStatusId(status.id)
      setNome(status.nome)
      setCor(status.cor)
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error("O nome do status é obrigatório")
      return
    }

    setIsSubmitting(true)
    try {
      if (currentStatusId) {
        // Update
        const { error } = await supabase
          .from('status_chamados')
          .update({ 
            nome: nome.toUpperCase(), 
            cor 
          })
          .eq('id', currentStatusId)
        
        if (error) throw error
        toast.success("Status atualizado com sucesso")
      } else {
        // Create
        const { error } = await supabase
          .from('status_chamados')
          .insert({ 
            nome: nome.toUpperCase(), 
            cor 
          })
        
        if (error) throw error
        toast.success("Status criado com sucesso")
      }
      
      setIsModalOpen(false)
      fetchStatuses()
    } catch (error: any) {
      console.error("Erro ao salvar status:", error)
      const errorMessage = error.message || "Erro ao salvar status. Tente novamente."
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        toast.error("Já existe um status com este nome")
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este status?")) return

    try {
      const { error } = await supabase
        .from('status_chamados')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success("Status excluído com sucesso")
      fetchStatuses()
    } catch (error: any) {
      console.error("Erro ao excluir status:", error)
      const errorMessage = error.message || "Erro ao excluir status. Certifique-se de que não esteja em uso."
      toast.error(errorMessage)
    }
  }

  // Verificação de permissão (Admin ou Dev)
  const canAccess = isAdmin || (perfil?.role === 'Administrador' || perfil?.role === 'Desenvolvedor')

  if (!canAccess && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full border-none shadow-2xl">
          <CardContent className="pt-6 text-center space-y-4">
            <Settings2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
            <p className="text-slate-500 text-sm">Você não tem permissão para acessar esta área de configurações.</p>
            <Button onClick={() => window.history.back()} variant="outline" className="w-full">Voltar</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc]">
      <Header title="CONFIGURAÇÕES DO SISTEMA" />
      
      <main className="flex-1 p-4 lg:p-8 space-y-8">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest">STATUS DE CHAMADOS</h2>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3">Gerenciamento de fluxos e estados dos atendimentos</p>
            </div>
            
            <Button 
              onClick={() => handleOpenModal()} 
              className="bg-[#171717] hover:bg-[#171717]/90 text-white gap-2 shadow-lg shadow-slate-200 h-10 px-6 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Novo Status</span>
            </Button>
          </div>

          <Card className="card-shadow border border-slate-200 overflow-hidden rounded-2xl bg-white">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 pl-8">Nome do Status</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4">Cor de Identificação</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4">Data Criação</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-right pr-8">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Carregando dados...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : statuses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Tag className="w-8 h-8 text-slate-200" />
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhum status cadastrado</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    statuses.map((status) => (
                      <TableRow key={status.id} className="hover:bg-slate-50/50 transition-colors border-slate-100 group">
                        <TableCell className="py-4 pl-8">
                          <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-tight group-hover:text-primary transition-colors">{status.nome}</span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-3 h-3 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200",
                              status.cor === 'blue' && "bg-blue-500",
                              status.cor === 'green' && "bg-green-500",
                              status.cor === 'orange' && "bg-orange-500",
                              status.cor === 'red' && "bg-red-500",
                              status.cor === 'slate' && "bg-slate-500",
                              status.cor === 'purple' && "bg-purple-500",
                              status.cor === 'amber' && "bg-amber-500",
                              status.cor === 'cyan' && "bg-cyan-500",
                              status.cor === 'emerald' && "bg-emerald-500",
                              status.cor === 'rose' && "bg-rose-500",
                            )} />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {colorOptions.find(c => c.value === status.cor)?.label || status.cor}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                          {format(new Date(status.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="py-4 text-right pr-8">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                              onClick={() => handleOpenModal(status)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                              onClick={() => handleDelete(status.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Modal CRUD */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-[425px] border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase">
              {currentStatusId ? 'Editar Status' : 'Novo Status'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome do Status</Label>
              <Input 
                id="nome" 
                placeholder="EX. EM ATENDIMENTO" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-10 bg-slate-50 border-slate-100 rounded-lg font-bold text-[11px] text-slate-700 focus-visible:ring-primary/20 transition-all uppercase placeholder:text-[8.8px] placeholder:text-slate-400/60"
              />
            </div>
            
            <div className="space-y-4">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Cor de Identificação</Label>
              <div className="grid grid-cols-5 gap-3">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCor(option.value)}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 p-2 rounded-xl transition-all",
                      cor === option.value ? "bg-slate-100 ring-2 ring-primary/20 ring-offset-2" : "hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-110",
                      option.class
                    )} />
                    <span className="text-[8px] font-black text-slate-400 uppercase">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                className="px-6 h-[34px] border-slate-200 bg-white text-slate-600 font-bold text-[9px] rounded-lg hover:bg-slate-100 transition-all uppercase tracking-widest"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="px-6 h-[34px] bg-[#171717] hover:bg-[#171717]/90 text-white font-bold text-[9px] rounded-lg gap-2 transition-all uppercase tracking-widest shadow-lg shadow-slate-200 min-w-[120px]"
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : currentStatusId ? 'Atualizar' : 'Criar Status'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
