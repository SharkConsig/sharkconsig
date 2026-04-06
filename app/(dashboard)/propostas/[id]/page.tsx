"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { 
  Eye, 
  History, 
  Printer, 
  FileText, 
  Plus, 
  Save,
  Bold,
  Italic,
  Underline,
  Quote,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Type
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function ProposalDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [activeTab, setActiveTab] = useState<"visualizar" | "historico">("visualizar")

  // Mock data based on the image
  const proposal = {
    id: id || "34558",
    cpf: "277.428.418-00",
    client: "VIVIANE FRANCISCA R SANTOS",
    operation: "Margem Livre (Novo)",
    bankAgreement: "PEHTECH - FEDERAL",
    commercial: "ROBSON DE ALMEIDA FERNANDEZ RAMOS",
    status: "Com inconsistência / Pendência para Digitação",
    brokerResponse: "Aguardando normalizar sistema no banco",
    installment: "350,00",
    lastCheck: "06-02-2026 13:14:34",
    registrationDate: "07/02/2026",
    responsible: "TALIA ALVES",
    ade: "5471",
    bank: "XN BANK",
    opType: "CARTÃO C/ SAQUE",
    origin: "PROMOTORES EXTERNOS",
    insurance: "-",
    agreement: "GOVERNO SP",
    usedMargin: "205,63",
    production: {
      type: "Cartão c/ saque",
      percent: "20%",
      base: "6.097,03",
      gross: "6.097,03",
      net: "6.097,03"
    },
    observations: "Chave PIX: 12953087893\nSenha Portal: 16R27v2$"
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50/30">
      <Header title={`Proposta nº ${proposal.id}`} />
      
      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
        {/* Top Info Table */}
        <Card className="card-shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1A2B49] border-b border-slate-200">
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">ID</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">CPF</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Nome do Cliente</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Operação</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Banco/Convênio</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Sala/Comercial</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Situação Contrato</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Resposta Corretor</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Valor da Parcela</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Última Verificação</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{proposal.id}</td>
                  <td className="px-4 py-3 text-[10px] font-medium text-slate-600">{proposal.cpf}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-700 uppercase">{proposal.client}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{proposal.operation}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{proposal.bankAgreement}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-400 leading-tight">{proposal.commercial}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500 leading-tight">{proposal.status}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500 leading-tight">{proposal.brokerResponse}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-900">R$ {proposal.installment}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-400">{proposal.lastCheck}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex justify-center gap-2">
          <Button 
            onClick={() => setActiveTab("visualizar")}
            className={cn(
              "h-9 px-6 text-[11px] font-bold uppercase tracking-widest transition-all",
              activeTab === "visualizar" 
                ? "bg-[#00C853] hover:bg-[#00C853]/90 text-white shadow-md" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <Eye className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
          <Button 
            onClick={() => setActiveTab("historico")}
            className={cn(
              "h-9 px-6 text-[11px] font-bold uppercase tracking-widest transition-all",
              activeTab === "historico" 
                ? "bg-[#00C853] hover:bg-[#00C853]/90 text-white shadow-md" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <History className="w-4 h-4 mr-2" />
            Histórico
          </Button>
          <Button 
            variant="outline"
            className="h-9 px-6 text-[11px] font-bold uppercase tracking-widest bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>

        {activeTab === "visualizar" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Arquivos */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em] text-center">Arquivos</h3>
              <div className="bg-white border border-purple-400 rounded-lg p-4 flex items-center gap-6">
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <FileText className="w-8 h-8 text-slate-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-slate-900 rounded-full flex items-center justify-center">
                      <Plus className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-8">
                  <span className="text-[12px] font-bold text-slate-700 cursor-pointer hover:text-primary transition-colors">Contracheque.pdf</span>
                  <span className="text-[12px] font-bold text-slate-700 cursor-pointer hover:text-primary transition-colors">RG/CNH.jpg</span>
                </div>
              </div>
            </div>

            {/* Dados da Proposta */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em] text-center">Dados da Proposta</h3>
              <div className="bg-[#2D3E61] rounded-lg overflow-hidden shadow-lg">
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <span className="text-[11px] font-bold text-white uppercase">ID:</span>
                      <span className="text-[11px] font-medium text-slate-300">FF-{proposal.id}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[11px] font-bold text-white uppercase">Responsável:</span>
                      <span className="text-[11px] font-medium text-slate-300">{proposal.responsible}</span>
                    </div>
                    <div className="pt-4 space-y-4">
                      <div className="flex gap-2">
                        <span className="text-[11px] font-bold text-white uppercase">Banco de Empréstimo:</span>
                        <span className="text-[11px] font-medium text-slate-300">{proposal.bank}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[11px] font-bold text-white uppercase">Tipo de Operação:</span>
                        <span className="text-[11px] font-medium text-slate-300">{proposal.opType}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[11px] font-bold text-white uppercase">Origem do Cliente:</span>
                        <span className="text-[11px] font-medium text-slate-300">{proposal.origin}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[11px] font-bold text-white uppercase">Incluir Seguro:</span>
                        <span className="text-[11px] font-medium text-slate-300">{proposal.insurance}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <span className="text-[11px] font-bold text-white uppercase">Data do Cadastro:</span>
                      <span className="text-[11px] font-medium text-slate-300">{proposal.registrationDate}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[11px] font-bold text-white uppercase">ADE:</span>
                      <span className="text-[11px] font-medium text-slate-300">{proposal.ade}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-8 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 border-t border-slate-100">
                  <div className="flex gap-2">
                    <span className="text-[11px] font-bold text-slate-900 uppercase">Nome:</span>
                    <span className="text-[11px] font-medium text-slate-600">{proposal.client}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[11px] font-bold text-slate-900 uppercase">CPF:</span>
                    <span className="text-[11px] font-medium text-slate-600">{proposal.cpf}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[11px] font-bold text-slate-900 uppercase">Convênio:</span>
                    <span className="text-[11px] font-medium text-slate-600">{proposal.agreement}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sections */}
            <div className="bg-white rounded-lg p-8 space-y-10 border border-slate-100 shadow-sm">
              <div className="space-y-6">
                <div className="flex gap-2">
                  <span className="text-[11px] font-bold text-slate-900 uppercase">Margem Utilizada:</span>
                  <span className="text-[11px] font-medium text-slate-600">R$ {proposal.usedMargin}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold text-slate-900 uppercase">Coeficiente e Prazo</span>
                  <select className="h-8 w-40 bg-white border border-slate-100 rounded px-2 text-[11px] font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary">
                    <option>Selecione</option>
                  </select>
                </div>
              </div>

              {/* Operacional Box */}
              <div className="bg-[#FFF9C4]/40 border border-[#FFF59D] rounded-lg p-6 space-y-6">
                <p className="text-[10px] font-bold text-slate-700 leading-relaxed">
                  <span className="font-black">Operacional:</span> Preencha os campos abaixo em caso de divergência nos valores informados pelo corretor do valores do banco. Salvar valor operacional atualizará somente os campos abaixo.
                </p>
                <div className="flex flex-wrap items-end gap-6">
                  <div className="space-y-1.5 flex-1 min-w-[150px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Parcela</label>
                    <Input className="h-9 bg-white border-slate-100 text-[12px] font-medium" defaultValue="R$ 0,00" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-[150px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Valor Operação</label>
                    <Input className="h-9 bg-white border-slate-100 text-[12px] font-medium" defaultValue="R$ 0,00" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-[150px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Valor Cliente</label>
                    <Input className="h-9 bg-white border-slate-100 text-[12px] font-medium" defaultValue="R$ 0,00" />
                  </div>
                  <Button variant="ghost" size="icon" className="w-9 h-9 text-[#1A2B49] hover:bg-white/50">
                    <Save className="w-6 h-6" />
                  </Button>
                </div>
              </div>

              {/* Produção Contrato Table */}
              <div className="overflow-hidden border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#E2E8F0]">
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Produção Contrato</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-700 uppercase tracking-widest text-center border-l border-slate-300">% Produção</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-700 uppercase tracking-widest text-center border-l border-slate-300">Valor Base</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-700 uppercase tracking-widest text-center border-l border-slate-300">Bruta</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-700 uppercase tracking-widest text-center border-l border-slate-300">Líquida</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-[#F1F5F9]/50">
                      <td className="px-4 py-2.5 text-[11px] font-medium text-slate-600">{proposal.production.type}</td>
                      <td className="px-4 py-2.5 text-[11px] font-bold text-slate-600 text-center border-l border-slate-200">{proposal.production.percent}</td>
                      <td className="px-4 py-2.5 text-[11px] font-bold text-slate-600 text-center border-l border-slate-200">R$ {proposal.production.base}</td>
                      <td className="px-4 py-2.5 text-[11px] font-bold text-slate-600 text-center border-l border-slate-200">R$ {proposal.production.gross}</td>
                      <td className="px-4 py-2.5 text-[11px] font-bold text-slate-600 text-center border-l border-slate-200">R$ {proposal.production.net}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Observações */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Observações</label>
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <div className="bg-slate-50/50 border-b border-slate-200 p-1.5 flex flex-wrap items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><Bold className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><Italic className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><Underline className="w-3.5 h-3.5" /></Button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><Quote className="w-3.5 h-3.5" /></Button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><AlignLeft className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><AlignCenter className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><AlignRight className="w-3.5 h-3.5" /></Button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><List className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><ListOrdered className="w-3.5 h-3.5" /></Button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><Type className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><LinkIcon className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><ImageIcon className="w-3.5 h-3.5" /></Button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600"><Type className="w-3.5 h-3.5" /></Button>
                  </div>
                  <textarea 
                    className="w-full p-4 text-[12px] font-medium text-slate-700 min-h-[150px] focus:outline-none"
                    defaultValue={proposal.observations}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "historico" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em] text-center">Rastreamento do Contrato</h3>
            
            <Card className="card-shadow border border-slate-200 bg-white min-h-[800px] relative py-20 overflow-hidden">
              {/* Central Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#1A2B49] -translate-x-1/2" />
              
              <div className="relative space-y-24">
                {[
                  {
                    id: 6,
                    date: "08/01/2026",
                    time: "16:17:34",
                    status: "Com Inconsistência / Pendência para Digitação",
                    description: "Com Inconsistência / Pendência para Digitação - Aguardando Banco: AGUARDANDO SISTEMA BANCO NORMALIZAR",
                    author: "4752 - ALESSANDRA P. MATOS (Operacional)",
                    type: "warning",
                    side: "right"
                  },
                  {
                    id: 5,
                    date: "08/01/2026",
                    time: "13:22:42",
                    status: "Aguardando Digitação",
                    author: "2758 - TALIA ALVES (Corretora)",
                    type: "info",
                    side: "left"
                  },
                  {
                    id: 4,
                    date: "17/12/2025",
                    time: "18:29:04",
                    status: "Com Inconsistência / Pendência para Digitação",
                    description: "Aguardar ativação das tabelas",
                    author: "4621 - TALITA SANTOS (Operacional)",
                    type: "warning",
                    side: "right"
                  },
                  {
                    id: 3,
                    date: "17/12/2025",
                    time: "18:22:15",
                    status: "Aguardando Digitação",
                    author: "4621 - TALITA SANTOS (Operacional)",
                    type: "info",
                    side: "left",
                    changes: [
                      { label: "Valor Operação", old: "R$ 6.049,72", new: "R$ 6,05" },
                      { label: "Valor Cliente", old: "R$ 6.049,72", new: "R$ 6,05" },
                      { label: "Valor Liberado (Operacional)", old: "R$ 6.097,03", new: "R$ 6,05" }
                    ]
                  },
                  {
                    id: 2,
                    date: "17/12/2025",
                    time: "18:10:23",
                    status: "Aguardando Digitação",
                    description: "Solicitado Digitação",
                    author: "2758 - TALIA ALVES (Corretora)",
                    type: "info",
                    side: "right"
                  },
                  {
                    id: 1,
                    date: "17/12/2025",
                    time: "18:09:02",
                    status: "Contrato Criado se ADE",
                    description: "Criado por um Operacional em 17/12/2025",
                    observations: "Chave PIX: 12953087893\nSenha Portal: 16R27v2$",
                    author: "2758 - TALIA ALVES (Corretora)",
                    type: "default",
                    side: "left"
                  }
                ].map((event) => (
                  <div key={event.id} className="relative flex items-center justify-center w-full">
                    {/* Date/Time */}
                    <div className={cn(
                      "absolute top-1/2 -translate-y-1/2 w-[calc(50%-60px)] flex flex-col",
                      event.side === 'right' ? "right-[calc(50%+60px)] items-end text-right" : "left-[calc(50%+60px)] items-start text-left"
                    )}>
                      <span className="text-[11px] font-bold text-slate-900">{event.date}</span>
                      <span className="text-[10px] font-medium text-slate-500">{event.time}</span>
                    </div>

                    {/* Circle */}
                    <div className={cn(
                      "z-10 w-10 h-10 rounded-full flex items-center justify-center text-slate-900 font-bold text-[14px] shadow-sm",
                      event.type === 'warning' ? "bg-[#E69100]" : event.type === 'info' ? "bg-[#00BCD4]" : "bg-[#D1D5DB]"
                    )}>
                      {event.id}
                    </div>

                    {/* Bubble */}
                    <div className={cn(
                      "absolute top-1/2 -translate-y-1/2 w-[calc(50%-100px)] p-6 rounded-sm shadow-sm",
                      event.type === 'warning' ? "bg-[#E69100]" : event.type === 'info' ? "bg-[#00BCD4]" : "bg-[#D1D5DB]",
                      event.side === 'right' ? "left-[calc(50%+60px)]" : "right-[calc(50%+60px)]"
                    )}>
                      {/* Arrow */}
                      <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-4 h-4 rotate-45",
                        event.type === 'warning' ? "bg-[#E69100]" : event.type === 'info' ? "bg-[#00BCD4]" : "bg-[#D1D5DB]",
                        event.side === 'right' ? "-left-2" : "-right-2"
                      )} />
                      
                      <div className="relative space-y-3">
                        <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tight">{event.status}</h4>
                        
                        {event.description && (
                          <p className="text-[11px] font-medium text-slate-800 leading-relaxed">{event.description}</p>
                        )}

                        {event.changes && (
                          <div className="space-y-3 pt-1">
                            <p className="text-[10px] font-bold text-slate-900 uppercase">Alterações no Contrato</p>
                            {event.changes.map((change, i) => (
                              <div key={i} className="space-y-0.5">
                                <p className="text-[11px] font-bold text-slate-900">{change.label}</p>
                                <p className="text-[10px] font-medium text-slate-800">Antigo: {change.old}</p>
                                <p className="text-[10px] font-medium text-slate-800">Novo: {change.new}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {event.observations && (
                          <div className="space-y-1 pt-1">
                            <p className="text-[10px] font-bold text-slate-900 uppercase">Observações</p>
                            <p className="text-[10px] font-medium text-slate-800 whitespace-pre-line">{event.observations}</p>
                          </div>
                        )}

                        <p className="text-[10px] font-bold text-slate-700/80 pt-2">
                          Alterado por: {event.author}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
