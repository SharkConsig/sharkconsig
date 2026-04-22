"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { 
  Search, 
  Filter, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileEdit,
  Loader2,
  RefreshCw
} from "lucide-react"
import { cn, withRetry } from "@/lib/utils"
import { TicketAtendimento } from "@/components/tickets/ticket-atendimento"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { format } from "date-fns"

const statusCardsList = [
  { label: "ABERTO", count: 0, color: "border-t-amber-500", textColor: "text-amber-600" },
  { label: "AGUARDANDO OPERACIONAL", count: 0, color: "border-t-orange-500", textColor: "text-orange-600" },
  { label: "PROPOSTA CADASTRADA", count: 0, color: "border-t-blue-500", textColor: "text-blue-600" },
  { label: "EM NEGOCIAÇÃO / PROPOSTA ENVIADA", count: 0, color: "border-t-cyan-500", textColor: "text-cyan-600" },
  { label: "APROVADOS", count: 0, color: "border-t-emerald-500", textColor: "text-emerald-600" },
  { label: "NÃO APROVADOS", count: 0, color: "border-t-rose-500", textColor: "text-rose-600" },
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
  margem: number
  convenio: string
  equipe: string
  created_at: string
  updated_at: string
  descricao?: string
  user_id: string
  user_nome?: string
  user_avatar?: string
}

const secondaryCards = [
  { label: "GOV SP - NOVO APROVADO", count: 0, color: "text-slate-600" },
  { label: "GOV SP - CARTÃO BENEFÍCIO APROVADO", count: 0, color: "text-slate-600" },
  { label: "CLT - CARTÃO APROVADO", count: 0, color: "text-slate-600" },
  { label: "CLT - CARTÃO BENEFÍCIO", count: 0, color: "text-slate-600" },
  { label: "CARTÃO BENEFÍCIO APROVADO", count: 0, color: "text-slate-600" },
  { label: "MARGEM 40% - APROVADO", count: 0, color: "text-slate-600" },
  { label: "PREF SAO PAULO - CARTÃO BENEFÍCIO APROVADO", count: 0, color: "text-slate-600" },
]

export default function TicketsPage() {
  const router = useRouter()
  const { perfil, user, isOperational, isAdmin } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedSecondaryStatus, setSelectedSecondaryStatus] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(format(new Date(), "dd/MM/yyyy"))
  const [endDate, setEndDate] = useState(format(new Date(), "dd/MM/yyyy"))
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchTickets = useCallback(async () => {
    if (!user || !perfil) return

    setIsLoading(true)
    try {
      let query = supabase
        .from('chamados')
        .select(`
          *,
          status_chamados:status_id (*)
        `)

      // Aplicar filtros de permissão baseados na Role
      if (perfil.role === 'Corretor') {
        // Corretor vê apenas os seus
        query = query.eq('user_id', user.id)
      } else if (perfil.role === 'Supervisor') {
        // Supervisor vê os seus + os corretores sob sua supervisão
        try {
          const response = await fetch("/api/usuarios")
          if (response.ok) {
            const allUsers = await response.json()
            const subordinates = allUsers
              .filter((u: any) => u.supervisor_id === user.id)
              .map((u: any) => u.id)
            
            query = query.in('user_id', [...subordinates, user.id])
          }
        } catch (err) {
          console.error("Erro ao buscar subordinados:", err)
          // Se falhar ao buscar subordinados, mostra apenas os seus para segurança
          query = query.eq('user_id', user.id)
        }
      }
      // Operacional e Administrador veem tudo (não aplica filtro de user_id)

      const { data, error } = await withRetry(() => 
        query.order('created_at', { ascending: false })
      )

      if (error) throw error
      setTickets(data as Ticket[] || [])
    } catch (error: any) {
      console.error("Erro completo ao buscar chamados (detalhado):", JSON.stringify(error, null, 2))
      console.error("Objeto de erro bruto:", error)
      if (error.message) console.error("Mensagem do erro:", error.message)
      if (error.details) console.error("Detalhes do erro:", error.details)
      if (error.hint) console.error("Dica do erro:", error.hint)
      toast.error("Erro ao carregar a lista de chamados")
    } finally {
      setIsLoading(false)
    }
  }, [user, perfil])

  useEffect(() => {
    if (user && perfil) {
      fetchTickets()
    }
  }, [fetchTickets, user, perfil])

  const counts = useMemo(() => {
    const res: Record<string, number> = {}
    tickets.forEach(t => {
      const s = t.status_chamados?.nome.toUpperCase() || t.status.toUpperCase()
      res[s] = (res[s] || 0) + 1
    })
    return res
  }, [tickets])

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Basic text search
      const searchLower = searchTerm.toLowerCase()
      const ticketStatusName = (ticket.status_chamados?.nome || ticket.status).toLowerCase()
      
      const matchesSearch = 
        ticket.id.toString().includes(searchTerm) ||
        ticket.cliente_nome.toLowerCase().includes(searchLower) ||
        ticket.cliente_cpf.includes(searchTerm) ||
        ticket.cliente_telefone.toLowerCase().includes(searchLower) ||
        ticket.origem.toLowerCase().includes(searchLower) ||
        ticket.convenio.toLowerCase().includes(searchLower) ||
        ticket.equipe.toLowerCase().includes(searchLower) ||
        ticketStatusName.includes(searchLower) ||
        ticket.margem?.toString().includes(searchTerm) ||
        ticket.margem?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).includes(searchTerm)

      // Status category filter
      let matchesStatus = true
      const ticketStatusUpper = ticketStatusName.toUpperCase()
      
      if (selectedSecondaryStatus) {
        matchesStatus = ticketStatusUpper === selectedSecondaryStatus.toUpperCase()
      } else if (selectedStatus) {
        if (selectedStatus === "APROVADOS") {
          matchesStatus = ticketStatusUpper.includes("APROVADO")
        } else if (selectedStatus === "ABERTO") {
          matchesStatus = ticketStatusUpper === "ABERTO" || ticketStatusUpper === "ABERTOS"
        } else {
          matchesStatus = ticketStatusUpper === selectedStatus.toUpperCase()
        }
      }

      // Date range filter
      let matchesDate = true
      if (startDate && endDate) {
        try {
          const [startDay, startMonth, startYear] = startDate.split("/").map(Number)
          const [endDay, endMonth, endYear] = endDate.split("/").map(Number)
          
          const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0)
          const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59)
          const ticketDate = new Date(ticket.created_at)
          
          matchesDate = ticketDate >= start && ticketDate <= end
        } catch (e) {
          console.error("Erro ao validar datas:", e)
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate
    })
  }, [tickets, searchTerm, selectedStatus, selectedSecondaryStatus, startDate, endDate])

  const statusCards = useMemo(() => statusCardsList.map(card => {
    let count = counts[card.label] || 0
    if (card.label === "ABERTO") {
      count = (counts["ABERTO"] || 0) + (counts["ABERTOS"] || 0)
    } else if (card.label === "APROVADOS") {
      count = Object.entries(counts).reduce((acc, [k, v]) => k.includes("APROVADO") ? acc + v : acc, 0)
    }
    return { ...card, count }
  }), [counts])

  const handleParentClick = (status: string) => {
    setCurrentPage(1)
    if (selectedStatus === status) {
      setSelectedStatus(null)
      setSelectedSecondaryStatus(null)
    } else {
      setSelectedStatus(status)
      if (status !== "APROVADOS") {
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
      setSelectedStatus("APROVADOS")
    }
  }

  // Reset page on search or date filter
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, startDate, endDate])

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

  const handleDigitarProposta = (ticket: Ticket) => {
    const params = new URLSearchParams({
      nome: ticket.cliente_nome,
      cpf: ticket.cliente_cpf,
      nascimento: "31/01/1984", 
      idLead: ticket.id,
      origem: ticket.origem?.toLowerCase() || ""
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
      
      <main className="flex-1 p-4 lg:p-8 bg-slate-50/50 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* Filters Card */}
        <Card className="card-shadow border border-slate-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Buscar Chamado</label>
                <Input 
                  placeholder="ID, Nome do Cliente ou CPF..." 
                  className="h-[38px] bg-slate-50/50 border-slate-100 text-[12px]"
                  icon={<Search className="w-4 h-4 text-slate-400" />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Período</label>
                  <div className="flex items-center gap-2 bg-slate-50/50 border border-slate-100 rounded-lg px-3 h-[38px] focus-within:border-primary/30 transition-colors">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="text-[11px] font-bold w-18 bg-transparent focus:outline-none text-slate-600" 
                    />
                    <span className="text-slate-300 text-[10px] font-bold">A</span>
                    <input 
                      type="text" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-[11px] font-bold w-18 bg-transparent focus:outline-none text-slate-600" 
                    />
                  </div>
                </div>
                <Button 
                  onClick={fetchTickets}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-white px-8 h-[38px] text-[12px] font-bold rounded-lg shadow-lg shadow-primary/20 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "BUSCAR"}
                </Button>
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

        {/* Secondary Status Cards (Only visible if APROVADOS is selected) */}
        <div className={cn(
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 transition-all duration-300 overflow-hidden",
          selectedStatus === "APROVADOS" ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        )}>
          {secondaryCards.map((card) => (
            <button 
              key={card.label}
              onClick={() => handleSecondaryClick(card.label)}
              className={cn(
                "p-3 bg-white rounded-lg border border-slate-100 shadow-sm transition-all hover:border-primary/30 hover:shadow-md text-left",
                selectedSecondaryStatus === card.label && "bg-primary/5 border-primary/30 ring-1 ring-primary/30"
              )}
            >
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{card.label}</p>
              <p className={cn("text-lg font-black", card.color)}>{card.count}</p>
            </button>
          ))}
        </div>

        {/* Tickets Table Card */}
        <Card className="card-shadow border border-slate-200 overflow-hidden rounded-2xl bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[80px]">Número</th>
                    {(isOperational || isAdmin) && (
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
                  {isLoading ? (
                    <tr>
                      <td colSpan={isOperational || isAdmin ? 11 : 10} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carregando chamados...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedTickets.length > 0 ? (
                    paginatedTickets.map((ticket) => (
                      <React.Fragment key={ticket.id}>
                        <tr 
                          className={cn(
                            "hover:bg-slate-50/80 transition-colors group cursor-pointer",
                            expandedTicketId === ticket.id.toString() && "bg-slate-50"
                          )}
                          onClick={() => toggleTicketExpansion(ticket.id.toString())}
                        >
                          <td className="px-4 py-4 text-[12px] font-bold text-slate-400 group-hover:text-primary">#{ticket.id}</td>
                          {(isOperational || isAdmin) && (
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
                              <span className="text-[9px] font-medium text-slate-400">{ticket.convenio}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-[12px] font-medium text-slate-500">{ticket.cliente_cpf}</td>
                          <td className="px-4 py-4 text-[12px] font-medium text-slate-500">{ticket.cliente_telefone}</td>
                          <td className="px-4 py-4 text-[11.5px] font-bold text-slate-700 text-right">R$ {ticket.margem?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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
                          <tr>
                            <td colSpan={isOperational || isAdmin ? 11 : 10} className="p-0 border-b border-slate-200">
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
                                    createdAt: ticket.created_at,
                                    user_nome: ticket.user_nome,
                                    user_avatar: ticket.user_avatar,
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
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isOperational || isAdmin ? 11 : 10} className="px-4 py-12 text-center text-slate-400 text-[12px] font-medium uppercase tracking-widest">
                        Nenhum chamado encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination / List Footer */}
            {totalPages > 1 && (
              <div className="px-8 py-10 flex flex-col sm:flex-row items-center justify-between border-t border-slate-50 bg-slate-50/30 gap-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredTickets.length)} de {filteredTickets.length} chamados
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

        {/* Floating Refresh Button */}
        <Button 
          onClick={fetchTickets}
          disabled={isLoading}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-[#171717] hover:bg-[#171717]/90 text-white shadow-2xl z-50 flex items-center justify-center cursor-pointer"
        >
          <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
        </Button>
      </main>
    </div>
  )
}
