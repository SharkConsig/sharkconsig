"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
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
import { HexColorPicker } from "react-colorful"
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
  cor_texto: string
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
  const [cor, setCor] = useState("#171717")
  const [corTexto, setCorTexto] = useState("#ffffff")
  const [showPickerFundo, setShowPickerFundo] = useState(false)
  const [showPickerTexto, setShowPickerTexto] = useState(false)

  const pickerTextoRef = useRef<HTMLDivElement>(null)
  const pickerFundoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerTextoRef.current && !pickerTextoRef.current.contains(event.target as Node)) {
        setShowPickerTexto(false)
      }
      if (pickerFundoRef.current && !pickerFundoRef.current.contains(event.target as Node)) {
        setShowPickerFundo(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
      console.error("Erro ao carregar status (detalhado):", JSON.stringify(error, null, 2))
      let errorMessage = error.message || error.details || "Erro ao carregar lista de status"
      
      if (error.code === '42P01') {
        errorMessage = "A tabela 'status_chamados' não existe. Por favor, execute o script SQL de criação (status_chamados.sql) no console do Supabase."
      }
      
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
    setCor("#171717")
    setCorTexto("#ffffff")
    setShowPickerFundo(false)
    setShowPickerTexto(false)
  }

  const handleOpenModal = (status?: TicketStatus) => {
    if (status) {
      setCurrentStatusId(status.id)
      setNome(status.nome)
      setCor(status.cor || "#171717")
      setCorTexto(status.cor_texto || "#ffffff")
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
            cor,
            cor_texto: corTexto
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
            cor,
            cor_texto: corTexto
          })
        
        if (error) throw error
        toast.success("Status criado com sucesso")
      }
      
      setIsModalOpen(false)
      fetchStatuses()
    } catch (error: any) {
      console.error("Erro ao salvar status (detalhado):", JSON.stringify(error, null, 2))
      console.error("Objeto de erro bruto:", error)
      
      let errorMessage = error.message || error.details || "Erro ao salvar status. Tente novamente."
      if (typeof error === 'object' && error !== null) {
        const code = error.code || (error.status === 403 ? '42501' : null)
        if (code === '23505') {
          errorMessage = "Já existe um status com este nome"
        } else if (code === '42703') {
          errorMessage = "A coluna 'cor_texto' não existe no banco de dados. Por favor, execute o script SQL de atualização (migrate_chamados_status.sql)."
        } else if (code === '42501') {
          errorMessage = "Você não tem permissão para realizar esta operação (RLS). Verifique se seu cargo é Administrador ou Desenvolvedor."
        }
      }
      toast.error(errorMessage)
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

  const translateColor = (color: string) => {
    if (!color || color.startsWith('#')) return color.toUpperCase();
    const map: Record<string, string> = {
      'blue': 'AZUL',
      'green': 'VERDE',
      'orange': 'LARANJA',
      'red': 'VERMELHO',
      'purple': 'ROXO',
      'slate': 'CINZA',
      'amber': 'AMARELO',
      'cyan': 'CIANO',
      'emerald': 'ESMERALDA',
      'rose': 'ROSA',
    };
    return map[color.toLowerCase()] || color.toUpperCase();
  };

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
                          <span 
                            className="px-3 py-1 rounded-md text-[10px] font-normal uppercase tracking-tight shadow-sm border border-slate-100"
                            style={{ backgroundColor: status.cor, color: status.cor_texto || '#ffffff' }}
                          >
                            {status.nome}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200" 
                              style={{ backgroundColor: status.cor }}
                            />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                              {translateColor(status.cor)}
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
                className="h-10 bg-slate-50 border-slate-100 rounded-lg font-bold text-[12px] text-slate-700 focus-visible:ring-primary/20 transition-all uppercase placeholder:text-slate-400/60"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2 relative" ref={pickerTextoRef}>
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">Cor da Fonte</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPickerTexto(!showPickerTexto)
                      setShowPickerFundo(false)
                    }}
                    className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm flex-shrink-0 transition-transform active:scale-95"
                    style={{ backgroundColor: corTexto }}
                  />
                  <div className="flex-1 flex gap-2">
                    <Input 
                      value={corTexto.toUpperCase()}
                      onChange={(e) => setCorTexto(e.target.value)}
                      className="h-10 bg-slate-50 border-slate-100 rounded-lg font-mono font-bold text-[12px] text-slate-700 uppercase"
                      maxLength={7}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCorTexto("#FFFFFF")}
                      className="h-10 px-3 text-[10px] font-bold uppercase border-slate-200 text-slate-500"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                {showPickerTexto && (
                  <div className="absolute z-50 mt-2 p-3 bg-white rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                    <HexColorPicker color={corTexto} onChange={setCorTexto} />
                    <div className="grid grid-cols-6 gap-2 mt-3">
                      {['#FFFFFF', '#000000', '#F8FAFC', '#64748B', '#EF4444', '#22C55E'].map((c) => (
                        <button 
                          key={c}
                          type="button"
                          className="w-6 h-6 rounded-md border border-slate-100"
                          style={{ backgroundColor: c }}
                          onClick={() => setCorTexto(c)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 relative" ref={pickerFundoRef}>
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">Cor de Fundo</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPickerFundo(!showPickerFundo)
                      setShowPickerTexto(false)
                    }}
                    className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm flex-shrink-0 transition-transform active:scale-95"
                    style={{ backgroundColor: cor }}
                  />
                   <div className="flex-1 flex gap-2">
                    <Input 
                      value={cor.toUpperCase()}
                      onChange={(e) => setCor(e.target.value)}
                      className="h-10 bg-slate-50 border-slate-100 rounded-lg font-mono font-bold text-[12px] text-slate-700 uppercase"
                      maxLength={7}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCor("#171717")}
                      className="h-10 px-3 text-[10px] font-bold uppercase border-slate-200 text-slate-500"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                {showPickerFundo && (
                  <div className="absolute z-50 mt-2 p-3 bg-white rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 right-0">
                    <HexColorPicker color={cor} onChange={setCor} />
                    <div className="grid grid-cols-6 gap-2 mt-3">
                      {['#171717', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map((c) => (
                        <button 
                          key={c}
                          type="button"
                          className="w-6 h-6 rounded-md border border-slate-100"
                          style={{ backgroundColor: c }}
                          onClick={() => setCor(c)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center gap-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pré-visualização</span>
              <span 
                className="px-4 py-1.5 rounded-lg text-[11px] font-normal uppercase tracking-widest shadow-md transition-all scale-110"
                style={{ backgroundColor: cor, color: corTexto }}
              >
                {nome || "EXEMPLO STATUS"}
              </span>
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
