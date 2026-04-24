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
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { motion, AnimatePresence } from "motion/react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface GenericConfig {
  id: string
  nome: string
  created_at: string
}

interface TicketStatus {
  id: string
  nome: string
  cor: string
  cor_texto: string
  created_at: string
}

export default function SettingsPage() {
  const { perfil, isAdmin } = useAuth()
  const [statuses, setStatuses] = useState<TicketStatus[]>([])
  const [convenios, setConvenios] = useState<GenericConfig[]>([])
  const [bancos, setBancos] = useState<GenericConfig[]>([])
  const [tiposOperacao, setTiposOperacao] = useState<GenericConfig[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGenericModalOpen, setIsGenericModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [isStatusExpanded, setIsStatusExpanded] = useState(false)
  const [isConvenioExpanded, setIsConvenioExpanded] = useState(false)
  const [isBancoExpanded, setIsBancoExpanded] = useState(false)
  const [isOperacaoExpanded, setIsOperacaoExpanded] = useState(false)
  
  // Generic Modal States
  const [genericType, setGenericType] = useState<'convenio' | 'banco' | 'operacao' | null>(null)
  const [genericId, setGenericId] = useState<string | null>(null)
  const [genericNome, setGenericNome] = useState("")

  // Delete Confirmation States
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteData, setDeleteData] = useState<{
    id: string,
    type: 'status' | 'convenio' | 'banco' | 'operacao',
    label: string
  } | null>(null)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
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
      const [{ data: statusData }, { data: convData }, { data: bancoData }, { data: operData }] = await Promise.all([
        supabase.from('status_chamados').select('*').order('created_at', { ascending: true }),
        supabase.from('convenios').select('*').order('nome', { ascending: true }),
        supabase.from('bancos').select('*').order('nome', { ascending: true }),
        supabase.from('tipos_operacao').select('*').order('nome', { ascending: true })
      ])

      setStatuses(statusData || [])
      setConvenios(convData || [])
      setBancos(bancoData || [])
      setTiposOperacao(operData || [])
    } catch (error: unknown) {
      console.error("Erro ao carregar configurações:", error)
      toast.error("Erro ao carregar lista de configurações")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatuses()
  }, [fetchStatuses])

  // Pagination Logic
  const totalPages = Math.ceil(statuses.length / itemsPerPage)
  const paginatedStatuses = statuses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

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

  const handleOpenGenericModal = (type: 'convenio' | 'banco' | 'operacao', item?: GenericConfig) => {
    setGenericType(type)
    if (item) {
      setGenericId(item.id)
      setGenericNome(item.nome)
    } else {
      setGenericId(null)
      setGenericNome("")
    }
    setIsGenericModalOpen(true)
  }

  const handleGenericSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!genericNome.trim()) {
      toast.error("O nome é obrigatório")
      return
    }

    if (!genericType) return

    const table = genericType === 'convenio' ? 'convenios' : genericType === 'banco' ? 'bancos' : 'tipos_operacao'
    const typeLabel = genericType === 'convenio' ? 'Convênio' : genericType === 'banco' ? 'Banco' : 'Tipo de Operação'

    setIsSubmitting(true)
    try {
      if (genericId) {
        const { error } = await supabase
          .from(table)
          .update({ nome: genericNome.toUpperCase() })
          .eq('id', genericId)
        if (error) throw error
        toast.success(`${typeLabel} atualizado com sucesso`)
      } else {
        const { error } = await supabase
          .from(table)
          .insert({ nome: genericNome.toUpperCase() })
        if (error) throw error
        toast.success(`${typeLabel} criado com sucesso`)
      }
      setIsGenericModalOpen(false)
      fetchStatuses()
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error(`Erro ao salvar ${genericType}:`, err)
      toast.error(err.message || `Erro ao salvar ${genericType}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenericDelete = (type: 'convenio' | 'banco' | 'operacao', id: string) => {
    const typeLabel = type === 'convenio' ? 'Convênio' : type === 'banco' ? 'Banco' : 'Tipo de Operação'
    setDeleteData({ id, type, label: typeLabel })
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteData) return

    const { id, type, label } = deleteData
    const table = type === 'status' ? 'status_chamados' : type === 'convenio' ? 'convenios' : type === 'banco' ? 'bancos' : 'tipos_operacao'

    setIsDeleting(true)
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      toast.success(`${label} excluído com sucesso`)
      fetchStatuses()
      setIsDeleteDialogOpen(false)
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error(`Erro ao excluir ${type}:`, err)
      toast.error(err.message || `Erro ao excluir ${label.toLowerCase()}`)
    } finally {
      setIsDeleting(false)
    }
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
    } catch (err: unknown) {
      const error = err as { message?: string; details?: string; code?: string; status?: number }
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

  const handleDelete = (id: string) => {
    setDeleteData({ id, type: 'status', label: 'Status' })
    setIsDeleteDialogOpen(true)
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
          <div 
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setIsStatusExpanded(!isStatusExpanded)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full transition-transform group-hover:scale-y-125" />
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  STATUS DE CHAMADOS
                  {isStatusExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />
                  )}
                </h2>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3">Gerenciamento de fluxos e estados dos atendimentos</p>
            </div>
            
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                handleOpenModal()
              }} 
              className="bg-[#171717] hover:bg-[#171717]/90 text-white gap-2 shadow-lg shadow-slate-200 h-9 w-[170px] rounded-lg relative z-10"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10.5px] font-bold uppercase tracking-widest">Novo Status</span>
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {isStatusExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden space-y-6"
              >
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
                        ) : paginatedStatuses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-40 text-center">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Tag className="w-8 h-8 text-slate-200" />
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhum status cadastrado</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedStatuses.map((status) => (
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

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-2 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, statuses.length)} de {statuses.length} registros
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
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Seção Convênios */}
        <section className="space-y-6">
          <div 
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setIsConvenioExpanded(!isConvenioExpanded)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full transition-transform group-hover:scale-y-125" />
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  CONVÊNIOS
                  {isConvenioExpanded ? <ChevronUp className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />}
                </h2>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3">Gerenciamento de convênios para propostas</p>
            </div>
            
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                handleOpenGenericModal('convenio')
              }} 
              className="bg-[#171717] hover:bg-[#171717]/90 text-white gap-2 shadow-lg h-9 w-[170px] rounded-lg relative z-10"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10.5px] font-bold uppercase tracking-widest">Novo Convênio</span>
            </Button>
          </div>

          <AnimatePresence>
            {isConvenioExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-6">
                <Card className="card-shadow border border-slate-200 overflow-hidden rounded-2xl bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100">
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 pl-8">Nome do Convênio</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4">Data Criação</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-right pr-8">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {convenios.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center text-slate-400 text-[11px] uppercase font-bold tracking-widest">Nenhum convênio cadastrado</TableCell></TableRow>
                      ) : (
                        convenios.map((item) => (
                          <TableRow key={item.id} className="group border-slate-100">
                            <TableCell className="py-4 pl-8 font-bold text-[12px] text-slate-700">{item.nome}</TableCell>
                            <TableCell className="py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                              {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="py-4 text-right pr-8">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleOpenGenericModal('convenio', item)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500" onClick={() => handleGenericDelete('convenio', item.id)}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Seção Bancos */}
        <section className="space-y-6">
          <div 
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setIsBancoExpanded(!isBancoExpanded)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full transition-transform group-hover:scale-y-125" />
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  BANCOS DE EMPRÉSTIMO
                  {isBancoExpanded ? <ChevronUp className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />}
                </h2>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3">Gerenciamento de bancos para propostas</p>
            </div>
            
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                handleOpenGenericModal('banco')
              }} 
              className="bg-[#171717] hover:bg-[#171717]/90 text-white gap-2 shadow-lg h-9 w-[170px] rounded-lg relative z-10"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10.5px] font-bold uppercase tracking-widest">Novo Banco</span>
            </Button>
          </div>

          <AnimatePresence>
            {isBancoExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-6">
                <Card className="card-shadow border border-slate-200 overflow-hidden rounded-2xl bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100">
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 pl-8">Nome do Banco</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4">Data Criação</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-right pr-8">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bancos.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center text-slate-400 text-[11px] uppercase font-bold tracking-widest">Nenhum banco cadastrado</TableCell></TableRow>
                      ) : (
                        bancos.map((item) => (
                          <TableRow key={item.id} className="group border-slate-100">
                            <TableCell className="py-4 pl-8 font-bold text-[12px] text-slate-700">{item.nome}</TableCell>
                            <TableCell className="py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                              {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="py-4 text-right pr-8">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleOpenGenericModal('banco', item)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500" onClick={() => handleGenericDelete('banco', item.id)}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Seção Tipos de Operação */}
        <section className="space-y-6">
          <div 
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setIsOperacaoExpanded(!isOperacaoExpanded)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full transition-transform group-hover:scale-y-125" />
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  TIPOS DE OPERAÇÃO
                  {isOperacaoExpanded ? <ChevronUp className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />}
                </h2>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3">Gerenciamento de tipos de operação para propostas</p>
            </div>
            
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                handleOpenGenericModal('operacao')
              }} 
              className="bg-[#171717] hover:bg-[#171717]/90 text-white gap-2 shadow-lg h-9 w-[170px] rounded-lg relative z-10"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10.5px] font-bold uppercase tracking-widest">Novo Tipo</span>
            </Button>
          </div>

          <AnimatePresence>
            {isOperacaoExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-6">
                <Card className="card-shadow border border-slate-200 overflow-hidden rounded-2xl bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100">
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 pl-8">Nome do Tipo</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4">Data Criação</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-right pr-8">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tiposOperacao.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center text-slate-400 text-[11px] uppercase font-bold tracking-widest">Nenhum tipo cadastrado</TableCell></TableRow>
                      ) : (
                        tiposOperacao.map((item) => (
                          <TableRow key={item.id} className="group border-slate-100">
                            <TableCell className="py-4 pl-8 font-bold text-[12px] text-slate-700">{item.nome}</TableCell>
                            <TableCell className="py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                              {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="py-4 text-right pr-8">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleOpenGenericModal('operacao', item)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500" onClick={() => handleGenericDelete('operacao', item.id)}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Modal CRUD Status */}
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
      {/* Modal Genérico (Convenio, Banco, Operação) */}
      <Dialog open={isGenericModalOpen} onOpenChange={setIsGenericModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase">
              {genericId ? 'Editar' : 'Novo'} {genericType === 'convenio' ? 'Convênio' : genericType === 'banco' ? 'Banco' : 'Tipo de Operação'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleGenericSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="genericNome" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome</Label>
              <Input 
                id="genericNome" 
                placeholder="DIGITE O NOME..." 
                value={genericNome}
                onChange={(e) => setGenericNome(e.target.value)}
                className="h-10 bg-slate-50 border-slate-100 rounded-lg font-bold text-[12px] text-slate-700 focus-visible:ring-primary/20 transition-all uppercase"
              />
            </div>
            
            <DialogFooter className="pt-4 gap-3">
              <Button type="button" variant="outline" onClick={() => setIsGenericModalOpen(false)} className="px-6 h-[34px] border-slate-200 bg-white text-slate-600 font-bold text-[9px] rounded-lg uppercase tracking-widest">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="px-6 h-[34px] bg-[#171717] hover:bg-[#171717]/90 text-white font-bold text-[9px] rounded-lg gap-2 min-w-[120px] uppercase tracking-widest shadow-lg shadow-slate-200">
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : genericId ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-[12px] text-slate-600 font-medium leading-relaxed">
              Tem certeza que deseja excluir este <span className="font-bold text-slate-900">{deleteData?.label.toLowerCase()}</span>? 
              Esta ação é permanente e não poderá ser desfeita.
            </p>
          </div>
          
          <DialogFooter className="pt-2 gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)} 
              disabled={isDeleting}
              className="flex-1 h-[38px] border-slate-200 bg-white text-slate-600 font-bold text-[10px] rounded-xl uppercase tracking-widest hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex-1 h-[38px] bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] rounded-xl gap-2 uppercase tracking-widest shadow-lg shadow-rose-100"
            >
              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
