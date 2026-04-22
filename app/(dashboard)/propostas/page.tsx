"use client"

import React, { useState } from "react"
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
  ChevronUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProposalDetailsAccordion } from "@/components/propostas/proposal-details-accordion"

const statusCards = [
  { label: "AGUARDANDO DIGITAÇÃO", count: 33, color: "border-t-amber-500", textColor: "text-amber-600" },
  { label: "ANDAMENTO AGUARDANDO PAGAMENTO CLIENTE", count: 17, color: "border-t-orange-500", textColor: "text-orange-600" },
  { label: "INCONSISTÊNCIAS NO BANCO", count: 17, color: "border-t-blue-500", textColor: "text-blue-600" },
  { label: "PAGO AO CLIENTE", count: 189, color: "border-t-cyan-500", textColor: "text-cyan-600" },
  { label: "PÓS-VENDA", count: 0, color: "border-t-emerald-500", textColor: "text-emerald-600" },
  { label: "CANCELADOS", count: 323, color: "border-t-rose-500", textColor: "text-rose-600" },
]

const secondaryCards = [
  { label: "AGUARDANDO SOLICITAÇÃO DE DIGITAÇÃO", count: 33, color: "text-slate-600" },
  { label: "AGUARDANDO DIGITAÇÃO OPERACIONAL", count: 17, color: "text-slate-600" },
  { label: "COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO", count: 17, color: "text-slate-600" },
]

const proposals = [
  { 
    id: "34558", 
    cpf: "277.428.418-00", 
    client: "VIVIANE FRANCISCA R SANTOS", 
    operation: "Margem Livre (Novo)", 
    bankAgreement: "PEHTECH - FEDERAL", 
    commercial: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", 
    status: "Com inconsistência / Pendência para Digitação", 
    brokerResponse: "Aguardando normalizar sistema no banco", 
    installment: "350,00", 
    lastCheck: "06-02-2026 13:14:34" 
  },
  { 
    id: "34557", 
    cpf: "277.428.418-00", 
    client: "DOUGLAINA RIBEIRO SANTIAGO", 
    operation: "Margem Livre (Novo)", 
    bankAgreement: "PEHTECH - FEDERAL", 
    commercial: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", 
    status: "Com inconsistência / Pendência para Digitação", 
    brokerResponse: "Aguardando normalizar sistema no banco", 
    installment: "350,00", 
    lastCheck: "06-02-2026 13:14:34" 
  },
  { 
    id: "34556", 
    cpf: "277.428.418-00", 
    client: "ANA PAULA FORNER", 
    operation: "Margem Livre (Novo)", 
    bankAgreement: "PEHTECH - FEDERAL", 
    commercial: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", 
    status: "Com inconsistência / Pendência para Digitação", 
    brokerResponse: "Aguardando normalizar sistema no banco", 
    installment: "350,00", 
    lastCheck: "06-02-2026 13:14:34" 
  },
  { 
    id: "34555", 
    cpf: "277.428.418-00", 
    client: "LUIZ ALBERTO MARINHO FARIAS", 
    operation: "Margem Livre (Novo)", 
    bankAgreement: "PEHTECH - FEDERAL", 
    commercial: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", 
    status: "Com inconsistência / Pendência para Digitação", 
    brokerResponse: "Aguardando normalizar sistema no banco", 
    installment: "350,00", 
    lastCheck: "06-02-2026 13:14:34" 
  },
  { 
    id: "34554", 
    cpf: "277.428.418-00", 
    client: "CASTER CESAR DA SILVA", 
    operation: "Margem Livre (Novo)", 
    bankAgreement: "PEHTECH - FEDERAL", 
    commercial: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", 
    status: "Com inconsistência / Pendência para Digitação", 
    brokerResponse: "Aguardando normalizar sistema no banco", 
    installment: "350,00", 
    lastCheck: "06-02-2026 13:14:34" 
  },
  { 
    id: "34553", 
    cpf: "277.428.418-00", 
    client: "CHERLITON DE CASTRO GUEDES", 
    operation: "Margem Livre (Novo)", 
    bankAgreement: "PEHTECH - FEDERAL", 
    commercial: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", 
    status: "Com inconsistência / Pendência para Digitação", 
    brokerResponse: "Aguardando normalizar sistema no banco", 
    installment: "350,00", 
    lastCheck: "06-02-2026 13:14:34" 
  },
  { 
    id: "34552", 
    cpf: "277.428.418-00", 
    client: "FERNANDO LUIZ PALHANO XAVIER", 
    operation: "Margem Livre (Novo)", 
    bankAgreement: "PEHTECH - FEDERAL", 
    commercial: "ROBSON DE ALMEIDA FERNANDEZ RAMOS", 
    status: "Com inconsistência / Pendência para Digitação", 
    brokerResponse: "Aguardando normalizar sistema no banco", 
    installment: "350,00", 
    lastCheck: "06-02-2026 13:14:34" 
  },
]

export default function ProposalsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedSecondaryStatus, setSelectedSecondaryStatus] = useState<string | null>(null)
  const [startDate, setStartDate] = useState("09/02/2026")
  const [endDate, setEndDate] = useState("09/02/2026")
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(null)

  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch = 
      proposal.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.cpf.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const handleParentClick = (status: string) => {
    if (selectedStatus === status) {
      setSelectedStatus(null)
    } else {
      setSelectedStatus(status)
    }
    setCurrentPage(1)
  }

  const handleSecondaryClick = (status: string) => {
    if (selectedSecondaryStatus === status) {
      setSelectedSecondaryStatus(null)
    } else {
      setSelectedSecondaryStatus(status)
    }
    setCurrentPage(1)
  }

  const toggleProposalExpansion = (proposalId: string) => {
    setExpandedProposalId(expandedProposalId === proposalId ? null : proposalId)
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="LISTA DE PROPOSTAS" />
      
      <main className="flex-1 p-4 lg:p-8 bg-slate-50/50 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* Filters Card */}
        <Card className="card-shadow border border-slate-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Buscar Proposta</label>
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
                <Button className="bg-[#1A2B49] hover:bg-[#1A2B49]/90 text-white px-8 h-[38px] text-[12px] font-bold rounded-lg shadow-lg shadow-slate-200">
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
                  FILTRAR
                </Button>
                <Button 
                  variant="outline" 
                  className="h-[38px] border-slate-200 text-[11px] font-bold px-6 bg-white hover:bg-slate-50"
                >
                  HOJE
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
                {index === 0 && (
                  <div className={cn(
                    "absolute -left-4 -right-4 -top-4 -bottom-10 rounded-t-3xl z-0 hidden lg:block transition-colors",
                    selectedStatus === "AGUARDANDO DIGITAÇÃO" ? "bg-slate-300" : "bg-slate-200"
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
                      <div className={cn("px-2 py-0.5 rounded text-[10px] font-normal text-white", card.textColor.replace('text-', 'bg-'))}>
                        {card.count}
                      </div>
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-0.5">Contrato(s)</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Secondary Cards Container */}
          <div className={cn(
            "rounded-3xl p-6 mt-6 relative z-0 border border-slate-300/50 shadow-inner transition-colors -mx-4",
            selectedStatus === "AGUARDANDO DIGITAÇÃO" ? "bg-slate-300" : "bg-slate-200"
          )}>
            <div className="flex overflow-x-auto gap-4 pb-2 custom-scrollbar lg:grid lg:grid-cols-3 lg:overflow-x-visible max-w-4xl">
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
                      <div className="bg-slate-700 px-2 py-0.5 rounded text-[10px] font-normal text-white">
                        {card.count}
                      </div>
                      <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Contrato(s)</span>
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
                <tr className="bg-[#1A2B49] border-b border-slate-200">
                  <th className="px-4 py-4 text-[10px] font-bold text-white uppercase tracking-widest">ID</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-white uppercase tracking-widest">CPF</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Nome do Cliente</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Operação</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Banco/Convênio</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Sala/Comercial</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Situação Contrato</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Resposta Corretor</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-white uppercase tracking-widest text-right">Valor da Parcela</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Última Verificação</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-white uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProposals.length > 0 ? (
                  filteredProposals.map((proposal) => (
                    <React.Fragment key={proposal.id}>
                      <tr 
                        onClick={() => toggleProposalExpansion(proposal.id)}
                        className={cn(
                          "hover:bg-slate-50/80 transition-colors group cursor-pointer",
                          expandedProposalId === proposal.id && "bg-slate-50"
                        )}
                      >
                        <td className="px-4 py-4 text-[12px] font-bold text-slate-400 group-hover:text-primary">{proposal.id}</td>
                        <td className="px-4 py-4 text-[12px] font-medium text-slate-500">{proposal.cpf}</td>
                        <td className="px-4 py-4 text-[11.5px] font-bold text-slate-700 uppercase tracking-tight">{proposal.client}</td>
                        <td className="px-4 py-4 text-[12px] font-bold text-slate-500">{proposal.operation}</td>
                        <td className="px-4 py-4 text-[11px] font-bold text-slate-500">{proposal.bankAgreement}</td>
                        <td className="px-4 py-4 text-[10px] font-bold text-slate-400 leading-tight max-w-[150px] truncate" title={proposal.commercial}>
                          {proposal.commercial}
                        </td>
                        <td className="px-4 py-4 text-[11px] font-medium text-slate-500">{proposal.status}</td>
                        <td className="px-4 py-4 text-[11px] font-medium text-slate-500">{proposal.brokerResponse}</td>
                        <td className="px-4 py-4 text-[11.5px] font-bold text-slate-700 text-right">R$ {proposal.installment}</td>
                        <td className="px-4 py-4 text-[11px] font-bold text-slate-600">{proposal.lastCheck}</td>
                        <td className="px-4 py-4 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleProposalExpansion(proposal.id)
                            }}
                          >
                            {expandedProposalId === proposal.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </td>
                      </tr>
                      {expandedProposalId === proposal.id && (
                        <tr>
                          <td colSpan={11} className="p-0 border-b border-slate-200">
                            <div className="animate-in slide-in-from-top-2 duration-300">
                              <ProposalDetailsAccordion proposal={proposal} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-[12px] font-medium">
                      Nenhuma proposta encontrada com os filtros selecionados.
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
