"use client"

import React, { useState } from "react"
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
  MoreHorizontal,
  Eye,
  ChevronDown,
  ChevronUp,
  FileEdit
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { TicketAtendimento } from "@/components/tickets/ticket-atendimento"

const statusCards = [
  { label: "ABERTOS", count: 33, color: "border-t-amber-500", textColor: "text-amber-600" },
  { label: "AGUARDANDO OPERACIONAL", count: 17, color: "border-t-orange-500", textColor: "text-orange-600" },
  { label: "PROPOSTA CADASTRADA", count: 17, color: "border-t-blue-500", textColor: "text-blue-600" },
  { label: "EM NEGOCIAÇÃO / PROPOSTA ENVIADA", count: 189, color: "border-t-cyan-500", textColor: "text-cyan-600" },
  { label: "APROVADOS", count: 0, color: "border-t-emerald-500", textColor: "text-emerald-600" },
  { label: "NÃO APROVADOS", count: 323, color: "border-t-rose-500", textColor: "text-rose-600" },
]

const secondaryCards = [
  { label: "GOV SP - NOVO APROVADO", count: 33, color: "text-slate-600" },
  { label: "GOV SP - CARTÃO BENEFÍCIO APROVADO", count: 17, color: "text-slate-600" },
  { label: "CLT - CARTÃO APROVADO", count: 17, color: "text-slate-600" },
  { label: "CLT - CARTÃO BENEFÍCIO", count: 33, color: "text-slate-600" },
  { label: "CARTÃO BENEFÍCIO APROVADO", count: 17, color: "text-slate-600" },
  { label: "MARGEM 40% - APROVADO", count: 17, color: "text-slate-600" },
  { label: "PREF SAO PAULO - CARTÃO BENEFÍCIO APROVADO", count: 189, color: "text-slate-600" },
]

const tickets = [
  { id: "34558", status: "ABERTOS", statusColor: "bg-amber-500", origin: "DISCADOR", client: "VIVIANE FRANCISCA R SANTOS", cpf: "277.428.418-00", phone: "11989500230", margin: "314,66", agreement: "GOV SP", team: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", openedAt: "06-02-2026", updatedAt: "06-02-2026 13:14:34" },
  { id: "34557", status: "ABERTOS", statusColor: "bg-amber-500", origin: "DISCADOR", client: "DOUGLAINA RIBEIRO SANTIAGO", cpf: "277.428.418-00", phone: "11989500230", margin: "314,66", agreement: "GOV SP", team: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", openedAt: "06-02-2026", updatedAt: "06-02-2026 13:14:34" },
  { id: "34556", status: "AGUARDANDO OPERACIONAL", statusColor: "bg-orange-500", origin: "DISCADOR", client: "ANA PAULA FORNER", cpf: "277.428.418-00", phone: "11989500230", margin: "314,66", agreement: "GOV SP", team: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", openedAt: "06-02-2026", updatedAt: "06-02-2026 13:14:34" },
  { id: "34555", status: "AGUARDANDO OPERACIONAL", statusColor: "bg-orange-500", origin: "DISCADOR", client: "LUIZ ALBERTO MARINHO FARIAS", cpf: "277.428.418-00", phone: "11989500230", margin: "314,66", agreement: "GOV SP", team: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", openedAt: "06-02-2026", updatedAt: "06-02-2026 13:14:34" },
  { id: "34554", status: "PROPOSTA CADASTRADA", statusColor: "bg-blue-500", origin: "DISCADOR", client: "CASTER CESAR DA SILVA", cpf: "277.428.418-00", phone: "11989500230", margin: "314,66", agreement: "GOV SP", team: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", openedAt: "06-02-2026", updatedAt: "06-02-2026 13:14:34" },
  { id: "34553", status: "EM NEGOCIAÇÃO / PROPOSTA ENVIADA", statusColor: "bg-cyan-500", origin: "DISCADOR", client: "CHERLITON DE CASTRO GUEDES", cpf: "277.428.418-00", phone: "11989500230", margin: "314,66", agreement: "GOV SP", team: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", openedAt: "06-02-2026", updatedAt: "06-02-2026 13:14:34" },
  { id: "34552", status: "NÃO APROVADOS", statusColor: "bg-rose-500", origin: "DISCADOR", client: "FERNANDO LUIZ PALHANO XAVIER", cpf: "277.428.418-00", phone: "11989500230", margin: "314,66", agreement: "GOV SP", team: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", openedAt: "06-02-2026", updatedAt: "06-02-2026 13:14:34" },
]

export default function TicketsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedSecondaryStatus, setSelectedSecondaryStatus] = useState<string | null>(null)
  const [startDate, setStartDate] = useState("09/02/2026")
  const [endDate, setEndDate] = useState("09/02/2026")
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null)

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.cpf.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Logic for linked parent-child status
    let matchesStatus = true
    if (selectedSecondaryStatus) {
      // If a child is selected, match exactly that child (which implies the parent "APROVADOS")
      matchesStatus = ticket.status === selectedSecondaryStatus
    } else if (selectedStatus) {
      if (selectedStatus === "APROVADOS") {
        // If parent "APROVADOS" is selected, match any ticket that would fall under it or its children
        // For this mock, we'll assume any ticket with "APROVADO" in status matches
        matchesStatus = ticket.status.includes("APROVADO") || ticket.status === "APROVADOS"
      } else {
        matchesStatus = ticket.status === selectedStatus
      }
    }

    return matchesSearch && matchesStatus
  })

  const handleParentClick = (status: string) => {
    if (selectedStatus === status) {
      setSelectedStatus(null)
      setSelectedSecondaryStatus(null)
    } else {
      setSelectedStatus(status)
      // If clicking a parent that isn't APROVADOS, clear secondary selection
      if (status !== "APROVADOS") {
        setSelectedSecondaryStatus(null)
      }
    }
    setCurrentPage(1)
  }

  const handleSecondaryClick = (status: string) => {
    if (selectedSecondaryStatus === status) {
      setSelectedSecondaryStatus(null)
    } else {
      setSelectedSecondaryStatus(status)
      setSelectedStatus("APROVADOS") // Ensure parent is also "selected" visually
    }
    setCurrentPage(1)
  }

  const toggleTicketExpansion = (ticketId: string) => {
    setExpandedTicketId(expandedTicketId === ticketId ? null : ticketId)
  }

  const handleDigitarProposta = (ticket: typeof tickets[0]) => {
    const params = new URLSearchParams({
      nome: ticket.client,
      cpf: ticket.cpf,
      nascimento: "31/01/1984", // Mock birth date
      idLead: ticket.id,
      origem: ticket.origin.toLowerCase()
    });
    router.push(`/propostas/nova?${params.toString()}`);
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="CHAMADOS ABERTOS" />
      
      <main className="flex-1 p-4 lg:p-8 bg-slate-50/50 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* Filters Card */}
        <Card className="card-shadow border border-slate-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Buscar Chamado</label>
                <Input 
                  placeholder="ID, Nome do Cliente ou CPF..." 
                  className="h-[38px] bg-slate-50/50 border-slate-100 text-[11px]"
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
                <Button className="bg-primary hover:bg-primary/90 text-white px-8 h-[38px] text-[11px] font-bold rounded-lg shadow-lg shadow-primary/20">
                  BUSCAR
                </Button>
                <Button 
                  variant="outline" 
                  className="h-[38px] border-slate-200 text-[11px] font-bold px-6 bg-white hover:bg-slate-50"
                  onClick={() => {
                    setSearchTerm("")
                    setSelectedStatus(null)
                    setSelectedSecondaryStatus(null)
                    setStartDate("09/02/2026")
                    setEndDate("09/02/2026")
                    setCurrentPage(1)
                  }}
                >
                  <Filter className="w-3.5 h-3.5 mr-2" />
                  LIMPAR FILTROS
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Section with Grouping */}
        <div className="space-y-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10">
            {statusCards.map((card, index) => (
              <div 
                key={card.label} 
                className="relative group cursor-pointer"
                onClick={() => handleParentClick(card.label)}
              >
                {index === 4 && (
                  <div className={cn(
                    "absolute -inset-x-2 -top-2 -bottom-8 rounded-t-2xl z-0 hidden lg:block transition-colors",
                    selectedStatus === "APROVADOS" ? "bg-slate-300" : "bg-slate-200"
                  )} />
                )}
                <Card className={cn(
                  "card-shadow border border-slate-200 border-t-4 bg-white h-full relative z-10 transition-all hover:scale-[1.02]", 
                  card.color,
                  selectedStatus === card.label && "ring-2 ring-primary ring-offset-2"
                )}>
                  <CardContent className="p-5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-4 h-8 leading-tight tracking-widest">{card.label}</p>
                    <div className="flex items-end gap-2">
                      <span className={cn("text-2xl font-black tracking-tighter leading-none", card.textColor)}>{card.count}</span>
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-0.5">Chamados</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Secondary Cards Container - Connected to "APROVADOS" with spacing */}
          <div className={cn(
            "rounded-2xl p-4 mt-6 relative z-0 border border-slate-300/50 shadow-inner transition-colors",
            selectedStatus === "APROVADOS" ? "bg-slate-300" : "bg-slate-200"
          )}>
            <div className="flex overflow-x-auto gap-4 pb-2 custom-scrollbar lg:grid lg:grid-cols-7 lg:overflow-x-visible">
              {secondaryCards.map((card) => (
                <Card 
                  key={card.label} 
                  className={cn(
                    "card-shadow border border-slate-200 bg-white min-w-[160px] lg:min-w-0 cursor-pointer transition-all hover:scale-[1.02]",
                    selectedSecondaryStatus === card.label && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => handleSecondaryClick(card.label)}
                >
                  <CardContent className="p-4">
                    <p className="text-[8.5px] font-bold text-slate-400 uppercase mb-3 h-7 leading-tight tracking-wider">{card.label}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">{card.count}</span>
                      <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Contratos</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <Card className="card-shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origem</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPF</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Margem</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Convênio</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipe</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aberto</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => (
                    <React.Fragment key={ticket.id}>
                      <tr 
                        className={cn(
                          "hover:bg-slate-50/80 transition-colors group cursor-pointer",
                          expandedTicketId === ticket.id && "bg-slate-50"
                        )}
                        onClick={() => toggleTicketExpansion(ticket.id)}
                      >
                        <td className="px-4 py-4 text-[11px] font-bold text-slate-400 group-hover:text-primary">#{ticket.id}</td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-[9px] font-black text-white uppercase inline-block shadow-sm",
                            ticket.statusColor
                          )}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[11px] font-bold text-slate-500">{ticket.origin}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-[11.5px] font-bold text-slate-700 uppercase tracking-tight">{ticket.client}</span>
                            <span className="text-[9px] font-medium text-slate-400">{ticket.agreement}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-[11px] font-medium text-slate-500">{ticket.cpf}</td>
                        <td className="px-4 py-4 text-[11px] font-medium text-slate-500">{ticket.phone}</td>
                        <td className="px-4 py-4 text-[11.5px] font-bold text-slate-700 text-right">R$ {ticket.margin}</td>
                        <td className="px-4 py-4 text-[11px] font-bold text-slate-500">{ticket.agreement}</td>
                        <td className="px-4 py-4 text-[10px] font-bold text-slate-400 leading-tight max-w-[120px] truncate" title={ticket.team}>
                          {ticket.team}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-600">{ticket.openedAt}</span>
                            <span className="text-[9px] text-slate-400">{ticket.updatedAt.split(' ')[1]}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleTicketExpansion(ticket.id)
                              }}
                            >
                              {expandedTicketId === ticket.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10 text-amber-600 hover:bg-amber-50 rounded-full transition-all"
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
                      {expandedTicketId === ticket.id && (
                        <tr>
                          <td colSpan={11} className="p-0 border-b border-slate-200">
                            <div className="animate-in slide-in-from-top-2 duration-300">
                              <TicketAtendimento ticket={ticket} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-slate-400 text-[12px] font-medium">
                      Nenhum chamado encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        {/* Pagination */}
        <div className="px-8 py-12 flex items-center justify-between border-t border-slate-50">
          <button 
            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors disabled:opacity-50"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            Primeira
          </button>
          <div className="flex items-center gap-4">
            <button 
              className="p-1 text-slate-400 hover:text-primary disabled:opacity-50"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
              {currentPage}-20 de 12987
            </span>
            <button 
              className="p-1 text-slate-400 hover:text-primary"
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">Última</button>
        </div>
        </Card>
      </main>
    </div>
  )
}
