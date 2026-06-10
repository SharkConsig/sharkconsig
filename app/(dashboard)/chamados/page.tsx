"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { useSidebar } from "@/context/sidebar-context"
import { 
  Search, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileEdit,
  Eye,
  Loader2,
  RefreshCw,
  Check,
  FileSpreadsheet
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TicketAtendimento } from "@/components/tickets/ticket-atendimento"
import { ClientDetailsModal } from "@/components/clients/client-details-modal"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { format } from "date-fns"
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

const statusCardsList = [
  { label: "ABERTO", count: 0, color: "border-t-amber-500", textColor: "text-amber-600" },
  { label: "AGUARDANDO OPERACIONAL", count: 0, color: "border-t-orange-500", textColor: "text-orange-600" },
  { label: "EM NEGOCIAÇÃO / PROPOSTA ENVIADA", count: 0, color: "border-t-cyan-500", textColor: "text-cyan-600" },
  { label: "APROVADOS", count: 0, color: "border-t-emerald-500", textColor: "text-emerald-600" },
  { label: "NÃO APROVADOS", count: 0, color: "border-t-rose-500", textColor: "text-rose-600" },
  { label: "TODOS", count: 0, color: "border-t-slate-800", textColor: "text-slate-900" },
]

export interface Ticket {
  id: string
  status: string
  status_id?: string
  status_chamados?: {
    id: string
    nome: string
    cor: string
    cor_texto?: string
  }
  origem: string
  cliente_nome: string
  cliente_cpf: string
  cliente_telefone: string
  cliente_telefone_2?: string
  cliente_telefone_3?: string
  margem: number
  margem_liquida_5?: number
  margem_beneficio_5?: number
  convenio: string
  equipe: string
  matricula?: string
  created_at: string
  updated_at: string
  descricao?: string
  content?: string
  user_id: string
  user_nome?: string
  user_avatar?: string
}

const APROVADOS_LABELS = [
  "GOV SP - NOVO APROVADO",
  "GOV SP - CARTÃO BENEFICIO APROVADO",
  "CLT - CARTÃO APROVADO",
  "CLT - CARTÃO BENEFICIO",
  "CARTÃO BENEFICIO APROVADO",
  "CLIENTE APROVADO CARTÃO",
  "AUMENTO SIAPE - AGUARDANDO DIGITAÇÃO",
  "MARGEM 40% - APROVADO",
  "COMPRA DE DIVIDA CARTÃO - APROVADO",
  "CLIENTE SEM INTERESSE",
  "PREF SAO PAULO - CARTÃO BENEFICIO APROVADO",
  "PREF SAO PAULO - NOVO APROVADO",
  "PREF SAO PAULO - CARTÃO CONSIGNADO APROVADO",
  "GOV PR - NOVO APROVADO",
  "GOV PR - BENEFICIO APROVADO"
]

const NAO_APROVADOS_LABELS = [
  "CLIENTE IMPOSSIBILITADO",
  "GOV SP - NÃO APROVADO",
  "ATIVOS - Zerado",
  "SIAPE - ACOMPANHAR VIRADA",
  "MARGEM 40%",
  "CLT - Zerado",
  "CLT - Negativo",
  "ATIVOS - Negativo",
  "COMPRA DE DIVIDA CARTÃO - NÃO APROVADO",
  "PREF SAO PAULO - NÃO APROVADO",
  "GOV PR - NOVO NÃO ARPROVADO"
]

function MultiSelect({ 
  label, 
  options, 
  selected, 
  onToggle 
}: { 
  label: string, 
  options: string[], 
  selected: string[], 
  onToggle: (val: string) => void 
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <Popover>
        <PopoverTrigger 
          className={cn(
            "w-full h-[38px] flex items-center justify-between bg-white border border-slate-200 text-[11px] font-normal text-slate-600 rounded-lg hover:bg-slate-50 px-3 cursor-pointer outline-none transition-all focus-within:border-primary/50"
          )}
        >
          <div className="flex items-center gap-2 truncate pr-4">
            {selected.length === 0 ? (
              <span className="text-slate-400">Todos</span>
            ) : (
              <span className="font-bold text-primary flex items-center gap-1.5">
                <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-primary/10 text-primary border-none font-black font-sans uppercase">
                  {selected.length}
                </Badge>
                <span className="truncate">Selecionado(s)</span>
              </span>
            )}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1 shadow-2xl border-slate-200" align="start">
          <div className="max-h-60 overflow-y-auto space-y-0.5 p-1 scrollbar-thin scrollbar-thumb-slate-200">
            {options.map(option => (
              <div 
                key={option} 
                onClick={() => onToggle(option)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all group",
                  selected.includes(option) ? "bg-primary/5 text-primary" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-all",
                  selected.includes(option) ? "bg-primary border-primary" : "bg-white border-slate-300 group-hover:border-primary/50"
                )}>
                  {selected.includes(option) && <Check className="w-2.5 h-2.5 text-white stroke-[4px]" />}
                </div>
                <span className="text-[11px] font-medium truncate">{option}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

const normalizeConvenioName = (convenio: string | null | undefined) => {
  if (!convenio) return convenio;
  const upper = convenio.toUpperCase();
  if (upper === 'GOVBR OPORTUNIDADES' || upper === 'GOVBR') return 'GOVERNO RORAIMA';
  return convenio;
};

export default function TicketsPage() {
  const router = useRouter()
  const { perfil, user, isOperational, isAdmin, isSupervisor, isDeveloper } = useAuth()
  const { isCollapsed } = useSidebar()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string | null>("ABERTO")
  const [selectedSecondaryStatus, setSelectedSecondaryStatus] = useState<string | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Novos estados para filtros avançados
  const [filterCorretores, setFilterCorretores] = useState<string[]>([])
  const [filterStatusList, setFilterStatusList] = useState<string[]>([])
  const [filterOrigens, setFilterOrigens] = useState<string[]>([])
  const [filterCliente, setFilterCliente] = useState("")
  const [filterConvenios, setFilterConvenios] = useState<string[]>([])
  const [filterEquipes, setFilterEquipes] = useState<string[]>([])
  const [filterMargemMin, setFilterMargemMin] = useState("")
  const [filterMargemMax, setFilterMargemMax] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [selectedClientCpf, setSelectedClientCpf] = useState("")

  const [selectedMatricula, setSelectedMatricula] = useState<string | undefined>()

  const handleViewClient = useCallback((cpf: string, matricula?: string) => {
    setSelectedClientCpf(cpf)
    setSelectedMatricula(matricula)
    setIsClientModalOpen(true)
  }, [])

  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem('expanded_ticket_id')
    }
    return null
  })

  // Persist window scroll
  useEffect(() => {
    const handleWindowScroll = () => {
      if (typeof window !== "undefined") {
        localStorage.setItem('chamados_window_scroll', window.scrollY.toString())
      }
    }
    window.addEventListener('scroll', handleWindowScroll)

    // Restore scroll after a small delay to ensure content is rendered
    const savedScroll = localStorage.getItem('chamados_window_scroll')
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll, 10))
      }, 100)
    }

    return () => window.removeEventListener('scroll', handleWindowScroll)
  }, [])

  // Persist expanded ticket ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (expandedTicketId) {
        localStorage.setItem('expanded_ticket_id', expandedTicketId)
      } else {
        localStorage.removeItem('expanded_ticket_id')
        localStorage.removeItem('chamados_window_scroll')
      }
    }
  }, [expandedTicketId])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchTickets = useCallback(async (isSilent = false) => {
    if (!perfil || !user) return

    if (!isSilent) setIsLoading(true)
    try {
      let query = supabase
        .from('chamados')
        .select(`
          *,
          status_chamados:status_id (*)
        `)

      // Aplicar filtros de data no servidor para melhor performance
      if (startDate && startDate.length === 10) {
        query = query.gte('created_at', `${startDate}T00:00:00Z`)
      }
      if (endDate && endDate.length === 10) {
        query = query.lte('created_at', `${endDate}T23:59:59Z`)
      }

      // Aplicar filtros de permissão baseados na Role
      if (perfil.role === 'Corretor' || perfil.role === 'Estágio' || perfil.role === 'Processo Seletivo' || perfil.role === 'PROCESSO SELETIVO') {
        query = query.eq('user_id', user.id)
      } else if (perfil.role === 'Supervisor') {
        try {
          // Usar cache ou timeout para evitar Failed to fetch
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch("/api/usuarios", { signal: controller.signal })
          clearTimeout(timeoutId);

          if (response.ok) {
            const allUsers = await response.json()
            const subordinates = allUsers
              .filter((u: { supervisor_id: string }) => u.supervisor_id === user.id)
              .map((u: { id: string }) => u.id)
            
            query = query.in('user_id', [...subordinates, user.id])
          } else {
            console.warn("API de usuários retornou status:", response.status)
            query = query.eq('user_id', user.id)
          }
        } catch (err) {
          console.error("Erro ao buscar subordinados:", err)
          query = query.eq('user_id', user.id)
        }
      }

      const { data, error } = await query.order('updated_at', { ascending: false })

      if (error) {
        console.error("Erro no Supabase:", error)
        throw error
      }
      setTickets((data as Ticket[]) || [])
    } catch (error: unknown) {
      console.error("Erro ao carregar chamados:", error)
      const message = error instanceof Error ? error.message : "Erro desconhecido"
      if (message.includes("fetch")) {
        toast.error("Erro de conexão. Verifique sua internet ou tente novamente.")
      } else {
        toast.error("Erro ao carregar a lista de chamados")
      }
    } finally {
      if (!isSilent) setIsLoading(false)
    }
  }, [user?.id, perfil?.id, perfil?.role, startDate, endDate, user, perfil])

  useEffect(() => {
    if (user?.id && perfil?.id) {
      // Primeira carga é normal, subsequentes podem ser silent
      fetchTickets(tickets.length > 0)
    }
  }, [fetchTickets, user?.id, perfil?.id, tickets.length])

  useEffect(() => {
    setExpandedTicketId(null)
  }, [selectedStatus, selectedSecondaryStatus])

  // Extração de valores únicos para os filtros
  const uniqueCorretores = useMemo(() => Array.from(new Set(tickets.map(t => t.user_nome).filter(Boolean))).sort() as string[], [tickets])
  const uniqueStatus = useMemo(() => Array.from(new Set(tickets.map(t => t.status_chamados?.nome || t.status).filter(Boolean))).sort() as string[], [tickets])
  const uniqueOrigens = useMemo(() => Array.from(new Set(tickets.map(t => t.origem).filter(Boolean))).sort() as string[], [tickets])
  const uniqueConvenios = useMemo(() => {
    const names = tickets.map(t => normalizeConvenioName(t.convenio)).filter(Boolean) as string[];
    return Array.from(new Set(names)).sort();
  }, [tickets])
  const uniqueEquipes = useMemo(() => Array.from(new Set(tickets.map(t => t.equipe).filter(Boolean))).sort() as string[], [tickets])

  // Base tickets filtered by search and advanced filters
  const baseFilteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Basic text search
      const searchLower = searchTerm.toLowerCase()
      const searchDigits = searchTerm.replace(/\D/g, "")
      const ticketStatusName = (ticket.status_chamados?.nome || ticket.status || "").toLowerCase()
      
      const ticketCpfDigits = (ticket.cliente_cpf || "").replace(/\D/g, "")
      const ticketTelDigits = (ticket.cliente_telefone || "").replace(/\D/g, "")

      const matchesSearch = 
        ticket.id.toString().includes(searchTerm) ||
        ticket.cliente_nome.toLowerCase().includes(searchLower) ||
        ticket.cliente_cpf.includes(searchTerm) ||
        (searchDigits !== "" && ticketCpfDigits.includes(searchDigits)) ||
        ticket.cliente_telefone.toLowerCase().includes(searchLower) ||
        (searchDigits !== "" && ticketTelDigits.includes(searchDigits)) ||
        ticket.origem.toLowerCase().includes(searchLower) ||
        (normalizeConvenioName(ticket.convenio) || "").toLowerCase().includes(searchLower) ||
        ticket.equipe.toLowerCase().includes(searchLower) ||
        ticketStatusName.includes(searchLower) ||
        ticket.margem?.toString().includes(searchTerm) ||
        ticket.margem_liquida_5?.toString().includes(searchTerm) ||
        ticket.margem_beneficio_5?.toString().includes(searchTerm)

      if (!matchesSearch) return false

      // Filtros Avançados
      if (filterCorretores.length > 0 && !filterCorretores.includes(ticket.user_nome || "")) return false
      if (filterStatusList.length > 0) {
        const ticketStatus = ticket.status_chamados?.nome || ticket.status || ""
        if (!filterStatusList.includes(ticketStatus)) return false
      }
      if (filterOrigens.length > 0 && !filterOrigens.includes(ticket.origem)) return false
      if (filterCliente && !ticket.cliente_nome.toLowerCase().includes(filterCliente.toLowerCase())) return false
      if (filterConvenios.length > 0 && !filterConvenios.includes(normalizeConvenioName(ticket.convenio) as string)) return false
      if (filterEquipes.length > 0 && !filterEquipes.includes(ticket.equipe)) return false

      // Filtro de Margem
      if (filterMargemMin || filterMargemMax) {
        const margem = ticket.margem || 0
        if (filterMargemMin && margem < parseFloat(filterMargemMin)) return false
        if (filterMargemMax && margem > parseFloat(filterMargemMax)) return false
      }
      
      return true
    })
  }, [tickets, searchTerm, filterCorretores, filterStatusList, filterOrigens, filterCliente, filterConvenios, filterEquipes, filterMargemMin, filterMargemMax])

  const counts = useMemo(() => {
    const res: Record<string, number> = {}
    baseFilteredTickets.forEach(t => {
      const s = (t.status_chamados?.nome || t.status || "").trim().toUpperCase()
      res[s] = (res[s] || 0) + 1
    })
    return res
  }, [baseFilteredTickets])

  const filteredTickets = useMemo(() => {
    return baseFilteredTickets.filter(ticket => {
      // Status category filter
      let matchesStatus = true
      const ticketStatusUpper = (ticket.status_chamados?.nome || ticket.status || "").trim().toUpperCase()
      
      if (selectedSecondaryStatus) {
        const u = selectedSecondaryStatus.toUpperCase()
        const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
        matchesStatus = ticketStatusUpper === u || ticketStatusUpper === ua
      } else if (selectedStatus && selectedStatus !== "TODOS") {
        if (selectedStatus === "APROVADOS") {
          matchesStatus = APROVADOS_LABELS.some(label => {
            const u = label.toUpperCase()
            const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
            return ticketStatusUpper === u || ticketStatusUpper === ua
          })
        } else if (selectedStatus === "NÃO APROVADOS") {
          matchesStatus = NAO_APROVADOS_LABELS.some(label => {
            const u = label.toUpperCase()
            const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
            return ticketStatusUpper === u || ticketStatusUpper === ua
          })
        } else if (selectedStatus === "ABERTO") {
          matchesStatus = ticketStatusUpper === "ABERTO" || ticketStatusUpper === "ABERTOS"
        } else if (selectedStatus === "AGUARDANDO OPERACIONAL") {
          matchesStatus = ticketStatusUpper === "AGUARDANDO OPERACIONAL"
        } else {
          matchesStatus = ticketStatusUpper === selectedStatus.toUpperCase()
        }
      }
      
      return matchesStatus
    })
  }, [baseFilteredTickets, selectedStatus, selectedSecondaryStatus])

  const statusCards = useMemo(() => statusCardsList.map(card => {
    let count = counts[card.label] || 0
    if (card.label === "ABERTO") {
      count = (counts["ABERTO"] || 0) + (counts["ABERTOS"] || 0)
    } else if (card.label === "AGUARDANDO OPERACIONAL") {
      count = counts["AGUARDANDO OPERACIONAL"] || 0
    } else if (card.label === "APROVADOS") {
      count = APROVADOS_LABELS.reduce((acc, label) => {
        const u = label.toUpperCase()
        const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
        return acc + (counts[u] || 0) + (u !== ua ? (counts[ua] || 0) : 0)
      }, 0)
    } else if (card.label === "NÃO APROVADOS") {
      count = NAO_APROVADOS_LABELS.reduce((acc, label) => {
        const u = label.toUpperCase()
        const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
        return acc + (counts[u] || 0) + (u !== ua ? (counts[ua] || 0) : 0)
      }, 0)
    } else if (card.label === "TODOS") {
      count = baseFilteredTickets.length
    }
    return { ...card, count }
  }), [counts, baseFilteredTickets.length])

  const handleParentClick = (status: string) => {
    setCurrentPage(1)
    if (selectedStatus === status) {
      setSelectedStatus("TODOS")
      setSelectedSecondaryStatus(null)
    } else {
      setSelectedStatus(status)
      if (status !== "APROVADOS" && status !== "NÃO APROVADOS") {
        setSelectedSecondaryStatus(null)
      }
    }
  }

  const handleSecondaryClick = (status: string) => {
    setCurrentPage(1)
    if (selectedSecondaryStatus === status) {
      setSelectedSecondaryStatus(null)
    } else {
      setSelectedSecondaryStatus(status)
      // selectedStatus is already APROVADOS or NÃO APROVADOS when clicking these
    }
  }

  const secondaryCards = useMemo(() => {
    const labels = selectedStatus === "APROVADOS" ? APROVADOS_LABELS : (selectedStatus === "NÃO APROVADOS" ? NAO_APROVADOS_LABELS : [])
    
    return labels.map(label => {
      const u = label.toUpperCase()
      const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
      const count = (counts[u] || 0) + (u !== ua ? (counts[ua] || 0) : 0)
      return { label, count, color: "text-slate-600" }
    })
  }, [counts, selectedStatus])

  // Reset page on search or date filter or advanced filters
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, startDate, endDate, filterCorretores, filterStatusList, filterOrigens, filterCliente, filterConvenios, filterEquipes, filterMargemMin, filterMargemMax])

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage)
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const toggleTicketExpansion = (ticketId: string) => {
    setExpandedTicketId(expandedTicketId === ticketId ? null : ticketId)
  }

  const exportToExcel = async () => {
    if (filteredTickets.length === 0) {
      toast.error("Não há dados para exportar.")
      return
    }

    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Chamados')

      // Define columns
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Status', key: 'status', width: 25 },
        { header: 'Corretor', key: 'corretor', width: 30 },
        { header: 'Origem', key: 'origem', width: 15 },
        { header: 'Cliente', key: 'cliente', width: 30 },
        { header: 'CPF', key: 'cpf', width: 20 },
        { header: 'Telefone', key: 'telefone', width: 20 },
        { header: 'Margem', key: 'margem', width: 15 },
        { header: 'Equipe', key: 'equipe', width: 20 },
        { header: 'Data', key: 'data', width: 20 },
      ]

      // Add rows
      filteredTickets.forEach(ticket => {
        worksheet.addRow({
          id: ticket.id,
          status: ticket.status_chamados?.nome || ticket.status,
          corretor: ticket.user_nome || '---',
          origem: ticket.origem,
          cliente: ticket.cliente_nome,
          cpf: ticket.cliente_cpf,
          telefone: ticket.cliente_telefone,
          margem: ticket.margem,
          equipe: ticket.equipe,
          data: format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm:ss"),
        })
      })

      // Stylize header
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8E8E8' }
      }
      
      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `Chamados_Export_${format(new Date(), "ddMMyyyy_HHmm")}.xlsx`)
      toast.success("Exportação Excel concluída!")
    } catch (error) {
      console.error("Erro ao exportar Excel:", error)
      toast.error("Erro ao exportar arquivo Excel.")
    }
  }

  const handleDigitarProposta = (ticket: Ticket) => {
    const params = new URLSearchParams({
      nome: ticket.cliente_nome,
      cpf: ticket.cliente_cpf,
      nascimento: "31/01/1984", 
      idLead: ticket.matricula || ticket.id.toString(),
      matricula: ticket.matricula || "",
      origem: ticket.origem?.toLowerCase() || "",
      tel1: ticket.cliente_telefone || "",
      tel2: ticket.cliente_telefone_2 || "",
      tel3: ticket.cliente_telefone_3 || ""
    });
    router.push(`/propostas/nova?${params.toString()}`);
  }

  const getStatusStyle = (ticket: Ticket) => {
    // Se tiver status dinâmico com cor customizada
    if (ticket.status_chamados && (ticket.status_chamados.cor?.startsWith('#'))) {
      return {
        style: { 
          backgroundColor: ticket.status_chamados.cor,
          color: ticket.status_chamados.cor_texto || '#ffffff'
        },
        className: "px-2.5 py-1 rounded-md text-[9px] font-normal uppercase inline-block shadow-sm border border-black/5"
      }
    }

    // Fallback para status dinâmico com cores legadas (nomes de cores)
    if (ticket.status_chamados) {
      const cor = ticket.status_chamados.cor
      let bgColor = "bg-slate-500"
      if (cor === 'blue') bgColor = "bg-blue-500"
      else if (cor === 'orange') bgColor = "bg-orange-500"
      else if (cor === 'purple') bgColor = "bg-purple-500"
      else if (cor === 'slate') bgColor = "bg-slate-500"
      else if (cor === 'green') bgColor = "bg-green-500"
      else if (cor === 'red') bgColor = "bg-red-500"
      else if (cor === 'amber') bgColor = "bg-amber-500"
      else if (cor === 'emerald') bgColor = "bg-emerald-500"
      else if (cor === 'rose') bgColor = "bg-rose-500"
      else if (cor === 'cyan') bgColor = "bg-cyan-500"
      
      return {
        className: cn("px-2.5 py-1 rounded-md text-[9px] font-normal text-white uppercase inline-block shadow-sm", bgColor)
      }
    }

    // Lógica para status fixos/legados
    const s = ticket.status.toUpperCase()
    let legacyBg = "bg-slate-400"
    if (s === 'ABERTO' || s === 'ABERTOS') legacyBg = "bg-amber-500"
    else if (s === 'AGUARDANDO OPERACIONAL') legacyBg = "bg-orange-500"
    else if (s === 'PROPOSTA CADASTRADA') legacyBg = "bg-blue-500"
    else if (s === 'EM NEGOCIAÇÃO / PROPOSTA ENVIADA') legacyBg = "bg-cyan-500"
    else if (s.includes('APROVADO') && !s.includes('NÃO')) legacyBg = "bg-emerald-500"
    else if (s.includes('NÃO APROVADO')) legacyBg = "bg-rose-500"
    
    return {
      className: cn("px-2.5 py-1 rounded-md text-[9px] font-normal text-white uppercase inline-block shadow-sm", legacyBg)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="CHAMADOS" />
      
      <main className={cn(
        "flex-1 p-4 lg:p-8 bg-slate-50/50 space-y-8 mx-auto w-full transition-all duration-300",
        isCollapsed ? "max-w-full lg:px-12" : "max-w-[1600px]"
      )}>
        {/* Filters Card */}
        <Card className="card-shadow border border-slate-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Buscar Chamado</label>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="ID, Nome do Cliente ou CPF..." 
                      className="h-[38px] bg-slate-50/50 border-slate-100 text-[12px] pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Período</label>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Input 
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-[38px] w-[130px] px-3 bg-slate-50/50 border-slate-100 text-[11px] font-normal text-slate-600 focus-visible:ring-0 appearance-none rounded-lg"
                        />
                      </div>

                      <span className="text-slate-300 text-[10px] font-bold scale-x-75">A</span>

                      <div className="relative">
                        <Input 
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="h-[38px] w-[130px] px-3 bg-slate-50/50 border-slate-100 text-[11px] font-normal text-slate-600 focus-visible:ring-0 appearance-none rounded-lg"
                        />
                      </div>

                      <Button 
                        variant="outline"
                        type="button"
                        onClick={() => {
                          const today = format(new Date(), "yyyy-MM-dd")
                          setStartDate(today)
                          setEndDate(today)
                        }}
                        className="h-[38px] px-3 bg-white border-slate-200 text-[10px] font-black text-primary hover:bg-primary hover:text-white transition-all rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        HOJE
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => {
                        console.log("Fetching tickets manually...")
                        fetchTickets()
                      }}
                      disabled={isLoading}
                      className="bg-primary hover:bg-primary/90 text-white px-8 h-[38px] text-[12px] font-bold rounded-lg shadow-lg shadow-primary/20 cursor-pointer flex items-center gap-2"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-4 h-4" />}
                      BUSCAR
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        console.log("Toggle filters:", !showFilters)
                        setShowFilters(!showFilters)
                      }}
                      className={cn(
                        "h-[38px] px-4 border-slate-200 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all",
                        showFilters ? "bg-slate-100 border-primary text-primary" : "text-slate-500"
                      )}
                    >
                      {showFilters ? <ChevronUp className="w-3.5 h-3.5 mr-2" /> : <ChevronDown className="w-3.5 h-3.5 mr-2" />}
                      FILTROS
                    </Button>
                  </div>
                </div>
              </div>

              {/* Advanced Filters Section */}
              <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden transition-all duration-300",
                showFilters ? "max-h-[1000px] opacity-100 pt-4 border-t border-slate-100" : "max-h-0 opacity-0"
              )}>
                <MultiSelect 
                  label="Corretor"
                  options={uniqueCorretores}
                  selected={filterCorretores}
                  onToggle={(val) => {
                    setFilterCorretores(prev => 
                      prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]
                    )
                  }}
                />

                <MultiSelect 
                  label="Status"
                  options={uniqueStatus}
                  selected={filterStatusList}
                  onToggle={(val) => {
                    setFilterStatusList(prev => 
                      prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]
                    )
                  }}
                />

                <MultiSelect 
                  label="Origem"
                  options={uniqueOrigens}
                  selected={filterOrigens}
                  onToggle={(val) => {
                    setFilterOrigens(prev => 
                      prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]
                    )
                  }}
                />

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                  <Input 
                    placeholder="Filtrar por nome..." 
                    className="h-[38px] bg-slate-50/50 border-slate-100 text-[11px]"
                    value={filterCliente}
                    onChange={(e) => setFilterCliente(e.target.value)}
                  />
                </div>

                <MultiSelect 
                  label="Convênio"
                  options={uniqueConvenios}
                  selected={filterConvenios}
                  onToggle={(val) => {
                    setFilterConvenios(prev => 
                      prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]
                    )
                  }}
                />

                <MultiSelect 
                  label="Equipe"
                  options={uniqueEquipes}
                  selected={filterEquipes}
                  onToggle={(val) => {
                    setFilterEquipes(prev => 
                      prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]
                    )
                  }}
                />

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Margem (Mín - Máx)</label>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="Min" 
                      type="number"
                      className="h-[38px] bg-slate-50/50 border-slate-100 text-[11px]"
                      value={filterMargemMin}
                      onChange={(e) => setFilterMargemMin(e.target.value)}
                    />
                    <Input 
                      placeholder="Max" 
                      type="number"
                      className="h-[38px] bg-slate-50/50 border-slate-100 text-[11px]"
                      value={filterMargemMax}
                      onChange={(e) => setFilterMargemMax(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-end pb-0.5">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setFilterCorretores([]); 
                      setFilterStatusList([]); 
                      setFilterOrigens([]);
                      setFilterCliente(""); 
                      setFilterConvenios([]); 
                      setFilterEquipes([]);
                      setFilterMargemMin(""); 
                      setFilterMargemMax("");
                    }}
                    className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Counts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statusCards.map((card) => (
            <button 
              key={card.label}
              onClick={() => handleParentClick(card.label)}
              className={cn(
                "p-4 bg-white border-t-4 rounded-xl card-shadow transition-all text-left group hover:-translate-y-1",
                card.color,
                selectedStatus === card.label && "ring-2 ring-primary ring-offset-2 scale-105"
              )}
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight mb-2 group-hover:text-slate-600">{card.label}</p>
              <p className={cn("text-2xl font-black", card.textColor)}>{card.count}</p>
            </button>
          ))}
        </div>

        {/* Secondary Status Cards (Only visible if APROVADOS or NÃO APROVADOS is selected) */}
        <div className={cn(
          "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 transition-all duration-300 overflow-hidden",
          (selectedStatus === "APROVADOS" || selectedStatus === "NÃO APROVADOS") ? "max-h-[800px] opacity-100 pt-2" : "max-h-0 opacity-0 pointer-events-none"
        )}>
          {secondaryCards.map((card) => (
            <button 
              key={card.label}
              onClick={() => handleSecondaryClick(card.label)}
              className={cn(
                "p-3 bg-white rounded-xl border border-slate-200 shadow-sm transition-all hover:border-primary/40 hover:shadow-md text-left group",
                selectedSecondaryStatus === card.label ? "bg-primary/5 border-primary ring-1 ring-primary/20" : "hover:bg-slate-50"
              )}
            >
              <p className={cn(
                "text-[8px] font-black uppercase tracking-[0.1em] mb-1.5 transition-colors",
                selectedSecondaryStatus === card.label ? "text-primary" : "text-slate-400 group-hover:text-slate-500"
              )}>
                {card.label}
              </p>
              <p className={cn(
                "text-xl font-black transition-transform group-hover:scale-105 origin-left",
                selectedSecondaryStatus === card.label ? "text-[#1C2643]" : card.color
              )}>
                {card.count}
              </p>
            </button>
          ))}
        </div>

        {/* Export Button Row - Only for Operacional and Admin */}
        {(isOperational || isAdmin) && (
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="h-10 px-6 bg-white border-primary/20 text-primary hover:bg-primary/5 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-sm cursor-pointer border-2 min-w-[200px]"
            >
              <FileSpreadsheet className="w-5 h-5" />
              EXPORTAR EXCEL
            </Button>
          </div>
        )}

        {/* Tickets Table Card */}
        <Card className="card-shadow border border-slate-200 overflow-hidden rounded-2xl bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[80px]">Número</th>
                    {(isOperational || isAdmin || isSupervisor || isDeveloper) && (
                      <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[120px]">Corretor</th>
                    )}
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[150px]">Status</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[110px]">Origem</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[200px]">Cliente / Convênio</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[130px]">CPF</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[120px]">Telefone</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right w-[110px]">Margem</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[150px]">Equipe</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aberto</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading && tickets.length === 0 ? (
                    <tr>
                      <td colSpan={isOperational || isAdmin || isSupervisor || isDeveloper ? 11 : 10} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carregando chamados...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedTickets.length > 0 ? (
                    paginatedTickets
                      .filter(t => !expandedTicketId || t.id.toString() === expandedTicketId)
                      .map((ticket, index) => (
                      <React.Fragment key={ticket.id}>
                        <tr 
                          className={cn(
                            "group cursor-pointer",
                            expandedTicketId === ticket.id.toString() ? "bg-slate-50 border-l-2 border-primary border-b-0" : (index % 2 === 0 ? "bg-slate-100" : "bg-white")
                          )}
                          onClick={() => toggleTicketExpansion(ticket.id.toString())}
                        >
                          <td className="px-4 py-4 text-[12px] font-bold text-slate-400">#{ticket.id}</td>
                          {(isOperational || isAdmin || isSupervisor || isDeveloper) && (
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-primary uppercase tracking-tight truncate max-w-[150px]" title={ticket.user_nome}>
                                  {ticket.user_nome || "---"}
                                </span>
                                <span className="text-[8px] text-slate-400 font-medium">Equipe: {ticket.equipe}</span>
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-4">
                            <span 
                              className={getStatusStyle(ticket).className}
                              style={getStatusStyle(ticket).style}
                            >
                              {ticket.status_chamados?.nome || ticket.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-[12px] font-bold text-slate-500">{ticket.origem}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-[11.5px] font-bold text-slate-700 uppercase tracking-tight">{ticket.cliente_nome}</span>
                              <span className="text-[9px] font-medium text-slate-400">{normalizeConvenioName(ticket.convenio)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-[12px] font-medium text-slate-500">{ticket.cliente_cpf}</td>
                          <td className="px-4 py-4 text-[12px] font-medium text-slate-500">{ticket.cliente_telefone}</td>
                          <td className="px-4 py-4 text-[11.5px] font-bold text-slate-700 text-right">
                            <div className="flex flex-col items-end">
                              {(typeof ticket.margem === 'number' && ticket.margem !== 0) && (
                                <span className="flex flex-col items-end">
                                  <span className={cn(
                                    "text-[11px] leading-tight",
                                    ticket.margem < 0 ? "text-red-600" : "text-slate-900"
                                  )}>
                                    R$ {ticket.margem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[8px] text-amber-600 uppercase font-black tracking-tighter">Margem 35%</span>
                                </span>
                              )}
                              {(typeof ticket.margem_liquida_5 === 'number' && ticket.margem_liquida_5 !== 0) && (
                                <span className="flex flex-col items-end mt-1">
                                  <span className={cn(
                                    "text-[11px] leading-tight",
                                    ticket.margem_liquida_5 < 0 ? "text-red-600" : "text-slate-900"
                                  )}>
                                    R$ {ticket.margem_liquida_5.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[8px] text-emerald-600 uppercase font-black tracking-tighter">Líquida 5%</span>
                                </span>
                              )}
                              {(typeof ticket.margem_beneficio_5 === 'number' && ticket.margem_beneficio_5 !== 0) && (
                                <span className="flex flex-col items-end mt-1">
                                  <span className={cn(
                                    "text-[11px] leading-tight",
                                    ticket.margem_beneficio_5 < 0 ? "text-red-600" : "text-slate-900"
                                  )}>
                                    R$ {ticket.margem_beneficio_5.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[8px] text-blue-600 uppercase font-black tracking-tighter">Benefício 5%</span>
                                </span>
                              )}
                              {(!ticket.margem && !ticket.margem_liquida_5 && !ticket.margem_beneficio_5) && (
                                <span className="text-slate-400">R$ 0,00</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-[10px] font-bold text-slate-400 leading-tight max-w-[120px] truncate" title={ticket.equipe}>
                            {ticket.equipe}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-600">{format(new Date(ticket.created_at), "dd-MM-yyyy")}</span>
                              <span className="text-[9px] text-slate-400">{format(new Date(ticket.created_at), "HH:mm:ss")}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-full transition-all cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleTicketExpansion(ticket.id.toString())
                                }}
                              >
                                {expandedTicketId === ticket.id.toString() ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/5 rounded-full transition-all cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewClient(ticket.cliente_cpf, ticket.matricula)
                                }}
                                title="Visualizar Cliente"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 text-amber-600 hover:bg-amber-50 rounded-full transition-all cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDigitarProposta(ticket)
                                }}
                                title="Digitar Proposta"
                              >
                                <FileEdit className="w-5 h-5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {expandedTicketId === ticket.id.toString() && (
                          <tr className={cn(index % 2 === 0 ? "bg-slate-100" : "bg-white")}>
                            <td colSpan={isOperational || isAdmin || isSupervisor || isDeveloper ? 11 : 10} className="p-0 border-b border-slate-200">
                              <div className="animate-in slide-in-from-top-2 duration-300">
                                <TicketAtendimento 
                                  ticket={{
                                    id: ticket.id.toString(),
                                    client: ticket.cliente_nome,
                                    cpf: ticket.cliente_cpf,
                                    origin: ticket.origem,
                                    status_id: ticket.status_id,
                                    status_nome: ticket.status_chamados?.nome || ticket.status,
                                    description: ticket.descricao,
                                    content: ticket.content,
                                    createdAt: ticket.created_at,
                                    user_nome: ticket.user_nome,
                                    user_id: ticket.user_id,
                                    user_avatar: ticket.user_avatar,
                                    matricula: ticket.matricula,
                                    phone: ticket.cliente_telefone,
                                    phone_2: ticket.cliente_telefone_2,
                                    phone_3: ticket.cliente_telefone_3,
                                    arquivo_rg_frente: ticket.arquivo_rg_frente,
                                    arquivo_rg_verso: ticket.arquivo_rg_verso,
                                    arquivo_contracheque: ticket.arquivo_contracheque,
                                    arquivo_extrato: ticket.arquivo_extrato,
                                    arquivo_outros: ticket.arquivo_outros
                                  }} 
                                  onMessageSent={() => {
                                    fetchTickets();
                                    setExpandedTicketId(null);
                                  }}
                                />
                                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
                                  <Button 
                                    variant="outline"
                                    onClick={() => setExpandedTicketId(null)}
                                    className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
                                  >
                                    Fechar e Voltar para a Lista
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isOperational || isAdmin || isSupervisor || isDeveloper ? 11 : 10} className="px-4 py-12 text-center text-slate-400 text-[12px] font-medium uppercase tracking-widest">
                        Nenhum chamado encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination / List Footer */}
            {totalPages > 1 && !expandedTicketId && (
              <div className="px-6 py-8 flex flex-col md:flex-row items-center justify-between border-t border-slate-100 bg-slate-50/20 gap-6">
                <div className="flex flex-col items-center md:items-start">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    RESULTADOS DA BUSCA
                  </p>
                  <p className="text-[11px] font-bold text-[#1C2643] uppercase">
                    Mostrando <span className="text-primary">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="text-primary">{Math.min(currentPage * itemsPerPage, filteredTickets.length)}</span> de <span className="text-primary">{filteredTickets.length}</span> chamados
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 rounded-xl border-slate-200 text-[#1C2643] hover:bg-white hover:border-primary hover:text-primary transition-all disabled:opacity-30 font-bold text-[10px] uppercase cursor-pointer"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Anterior
                  </Button>
                  
                  <div className="hidden sm:flex items-center gap-2">
                    {(() => {
                      const pages = [];
                      const maxVisible = 5;
                      let startPage = Math.max(1, currentPage - 2);
                      const endPage = Math.min(totalPages, startPage + maxVisible - 1);
                      
                      if (endPage - startPage < maxVisible - 1) {
                        startPage = Math.max(1, endPage - maxVisible + 1);
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={currentPage === i ? "default" : "outline"}
                            size="icon"
                            className={cn(
                              "h-10 w-10 rounded-xl transition-all text-[11px] font-black tracking-widest cursor-pointer",
                              currentPage === i 
                                ? "bg-primary text-white shadow-xl shadow-primary/30 border-primary" 
                                : "bg-white border-slate-200 text-slate-400 hover:text-primary hover:border-primary/40"
                            )}
                            onClick={() => handlePageChange(i)}
                          >
                            {i}
                          </Button>
                        );
                      }
                      
                      // Add ellipses for many pages
                      if (startPage > 1) {
                         pages.unshift(<span key="start-dots" className="text-slate-300 font-bold px-1">...</span>);
                         pages.unshift(
                           <Button
                              key={1}
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 rounded-xl bg-white border-slate-200 text-slate-400 hover:text-primary transition-all text-[11px] font-black cursor-pointer"
                              onClick={() => handlePageChange(1)}
                            >
                              1
                            </Button>
                         );
                      }
                      
                      if (endPage < totalPages) {
                        pages.push(<span key="end-dots" className="text-slate-300 font-bold px-1">...</span>);
                        pages.push(
                          <Button
                             key={totalPages}
                             variant="outline"
                             size="icon"
                             className="h-10 w-10 rounded-xl bg-white border-slate-200 text-slate-400 hover:text-primary transition-all text-[11px] font-black cursor-pointer"
                             onClick={() => handlePageChange(totalPages)}
                           >
                             {totalPages}
                           </Button>
                        );
                      }

                      return pages;
                    })()}
                  </div>

                  <div className="flex sm:hidden items-center bg-white border border-slate-200 rounded-xl px-4 h-10">
                    <span className="text-[11px] font-black text-primary">{currentPage}</span>
                    <span className="mx-2 text-slate-300">/</span>
                    <span className="text-[11px] font-bold text-slate-500">{totalPages}</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 rounded-xl border-slate-200 text-[#1C2643] hover:bg-white hover:border-primary hover:text-primary transition-all disabled:opacity-30 font-bold text-[10px] uppercase cursor-pointer"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Floating Refresh Button */}
        <Button 
          onClick={fetchTickets}
          disabled={isLoading}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-[#171717] hover:bg-[#171717]/90 text-white shadow-2xl z-50 flex items-center justify-center cursor-pointer"
        >
          <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
        </Button>

        <ClientDetailsModal 
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          cpf={selectedClientCpf}
          initialMatricula={selectedMatricula}
        />
      </main>
    </div>
  )
}
