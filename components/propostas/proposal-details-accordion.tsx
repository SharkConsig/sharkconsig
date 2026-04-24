"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye, History, FileText, Plus, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { FichaPropostaModal } from "./ficha-proposta-modal"

interface ProposalDetailsAccordionProps {
  proposal: {
    id_lead: string;
    cliente_cpf: string;
    nome_cliente: string;
    tipo_operacao: string;
    banco: string;
    convenio: string;
    status: string;
    valor_parcela: number;
    created_at: string;
    origem?: string;
    matricula?: string;
    responsible?: string;
  }
}

const DataField = ({ label, value, className, labelColor = "text-white", valueColor = "text-slate-300", hoverColor = "group-hover/copy:text-white" }: { label: string, value: string | undefined, className?: string, labelColor?: string, valueColor?: string, hoverColor?: string }) => {
  const [isCopied, setIsCopied] = useState(false)
  
  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const isLight = labelColor.includes("slate-900")

  return (
    <div 
      className={cn("flex items-center gap-2 cursor-pointer group/copy relative w-fit", className)}
      onClick={handleCopy}
      title="Clique para copiar"
    >
      <span className={cn("text-[10px] font-bold uppercase shrink-0", labelColor)}>{label}:</span>
      <span className={cn("text-[10px] font-medium transition-colors", valueColor, hoverColor)}>{value || "-"}</span>
      {isCopied && (
        <span className={cn(
          "absolute left-full ml-2 text-[8px] font-black px-1 rounded animate-in fade-in zoom-in duration-200 whitespace-nowrap z-20",
          isLight ? "text-green-600 bg-green-50 border border-green-100 shadow-sm" : "text-green-400 bg-slate-900/50"
        )}>
          COPIADO
        </span>
      )}
    </div>
  )
}

const ClickToCopy = ({ children, text, className }: { children: React.ReactNode, text: string | undefined, className?: string }) => {
  const [isCopied, setIsCopied] = useState(false)
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!text) return
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div 
      className={cn("cursor-pointer hover:text-primary transition-colors relative group/copy", className)}
      onClick={handleCopy}
      title="Clique para copiar"
    >
      {children}
      {isCopied && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 animate-in fade-in zoom-in duration-200 z-30">
          COPIADO
        </span>
      )}
    </div>
  )
}

export function ProposalDetailsAccordion({ proposal: prop }: ProposalDetailsAccordionProps) {
  const [activeTab, setActiveTab] = useState<"visualizar" | "historico">("visualizar")
  const [isFichaModalOpen, setIsFichaModalOpen] = useState(false)

  // Use real data keys
  const proposal = {
    ...prop,
    registrationDate: prop.created_at ? new Date(prop.created_at).toLocaleDateString('pt-BR') : "-",
    responsible: prop.responsible || "NÃO ATRIBUÍDO",
    ade: "-",
    bank: prop.banco,
    opType: prop.tipo_operacao,
    origin: prop.origem || "-",
    insurance: "-",
    agreement: prop.convenio,
    usedMargin: prop.valor_parcela?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00",
    production: {
      type: prop.tipo_operacao,
      percent: "-",
      base: prop.valor_parcela?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      gross: "-",
      net: "-"
    },
    observations: "Sem observações no momento."
  }

  return (
    <div className="bg-slate-50/50 p-6 space-y-6 border-t border-slate-100">
      {/* Tabs */}
      <div className="flex justify-center gap-2">
        <Button 
          onClick={() => setActiveTab("visualizar")}
          className={cn(
            "h-8 px-4 text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === "visualizar" 
              ? "bg-[#00C853] hover:bg-[#00C853]/90 text-white shadow-md" 
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <Eye className="w-3.5 h-3.5 mr-2" />
          Visualizar
        </Button>
        <Button 
          onClick={() => setActiveTab("historico")}
          className={cn(
            "h-8 px-4 text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === "historico" 
              ? "bg-[#00C853] hover:bg-[#00C853]/90 text-white shadow-md" 
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <History className="w-3.5 h-3.5 mr-2" />
          Histórico
        </Button>
        <Button 
          variant="outline"
          onClick={() => setIsFichaModalOpen(true)}
          className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
        >
          <FileText className="w-3.5 h-3.5 mr-2" />
          Ficha Proposta
        </Button>
      </div>

      <FichaPropostaModal 
        isOpen={isFichaModalOpen} 
        onClose={() => setIsFichaModalOpen(false)} 
        proposal={proposal} 
      />

      {activeTab === "visualizar" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Arquivos */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] text-center">Arquivos</h3>
            <div className="bg-white border border-purple-200 rounded-lg p-3 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <FileText className="w-6 h-6 text-slate-400" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-slate-900 rounded-full flex items-center justify-center">
                    <Plus className="w-2 h-2 text-white" />
                  </div>
                </div>
              </div>
              <div className="flex gap-6">
                <span className="text-[11px] font-bold text-slate-700 cursor-pointer hover:text-primary transition-colors">Contracheque.pdf</span>
                <span className="text-[11px] font-bold text-slate-700 cursor-pointer hover:text-primary transition-colors">RG/CNH.jpg</span>
              </div>
            </div>
          </div>

          {/* Dados da Proposta */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] text-center">Dados da Proposta</h3>
            <div className="bg-[#2D3E61] rounded-lg overflow-hidden shadow-lg">
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-left">
                <div className="space-y-3">
                  <DataField label="ID" value={`FF-${proposal.id}`} />
                  <DataField label="Responsável" value={proposal.responsible} />
                  <DataField label="Banco de Empréstimo" value={proposal.bank} />
                  <DataField label="Tipo de Operação" value={proposal.opType} />
                </div>
                <div className="space-y-3">
                  <DataField label="Data do Cadastro" value={proposal.registrationDate} />
                  <DataField label="ADE" value={proposal.ade} />
                  <DataField label="Origem do Cliente" value={proposal.origin} />
                  <DataField label="Incluir Seguro" value={proposal.insurance} />
                </div>
              </div>
              <div className="bg-white p-6 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 border-t border-slate-100 text-left">
                <DataField label="Nome" value={proposal.client} labelColor="text-slate-900" valueColor="text-slate-600" hoverColor="group-hover/copy:text-primary" />
                <DataField label="CPF" value={proposal.cpf} labelColor="text-slate-900" valueColor="text-slate-600" hoverColor="group-hover/copy:text-primary" />
                <DataField label="Convênio" value={proposal.agreement} labelColor="text-slate-900" valueColor="text-slate-600" hoverColor="group-hover/copy:text-primary" />
              </div>
            </div>
          </div>

          {/* Bottom Sections */}
          <div className="bg-white rounded-lg p-6 space-y-8 border border-slate-100 shadow-sm text-left">
            <div className="space-y-4">
              <DataField label="Margem Utilizada" value={`R$ ${proposal.usedMargin}`} labelColor="text-slate-900" valueColor="text-slate-600" hoverColor="group-hover/copy:text-primary" />
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-slate-900 uppercase">Coeficiente e Prazo</span>
                <select className="h-7 w-32 bg-white border border-slate-100 rounded px-2 text-[10px] font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option>Selecione</option>
                </select>
              </div>
            </div>

            {/* Operacional Box */}
            <div className="bg-[#FFF9C4]/40 border border-[#FFF59D] rounded-lg p-4 space-y-4">
              <p className="text-[9px] font-bold text-slate-700 leading-relaxed">
                <span className="font-black">Operacional:</span> Preencha os campos abaixo em caso de divergência nos valores informados pelo corretor do valores do banco.
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1 flex-1 min-w-[120px]">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Parcela</label>
                  <input className="h-8 w-full bg-white border border-slate-100 rounded px-2 text-[11px] font-medium" defaultValue="R$ 0,00" />
                </div>
                <div className="space-y-1 flex-1 min-w-[120px]">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Valor Operação</label>
                  <input className="h-8 w-full bg-white border border-slate-100 rounded px-2 text-[11px] font-medium" defaultValue="R$ 0,00" />
                </div>
                <div className="space-y-1 flex-1 min-w-[120px]">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Valor Cliente</label>
                  <input className="h-8 w-full bg-white border border-slate-100 rounded px-2 text-[11px] font-medium" defaultValue="R$ 0,00" />
                </div>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-[#1A2B49] hover:bg-white/50">
                  <Save className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Produção Contrato Table */}
            <div className="overflow-hidden border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#E2E8F0]">
                    <th className="px-4 py-2 text-[9px] font-bold text-slate-700 uppercase tracking-widest">Produção Contrato</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-slate-700 uppercase tracking-widest text-center border-l border-slate-300">% Produção</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-slate-700 uppercase tracking-widest text-center border-l border-slate-300">Valor Base</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-slate-700 uppercase tracking-widest text-center border-l border-slate-300">Bruta</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-slate-700 uppercase tracking-widest text-center border-l border-slate-300">Líquida</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-[#F1F5F9]/50">
                    <td className="px-4 py-2 text-[10px] font-medium text-slate-600">
                      <ClickToCopy text={proposal.production.type}>{proposal.production.type}</ClickToCopy>
                    </td>
                    <td className="px-4 py-2 text-[10px] font-bold text-slate-600 text-center border-l border-slate-200">
                      <ClickToCopy text={proposal.production.percent}>{proposal.production.percent}</ClickToCopy>
                    </td>
                    <td className="px-4 py-2 text-[10px] font-bold text-slate-600 text-center border-l border-slate-200">
                      <ClickToCopy text={`R$ ${proposal.production.base}`}>R$ {proposal.production.base}</ClickToCopy>
                    </td>
                    <td className="px-4 py-2 text-[10px] font-bold text-slate-600 text-center border-l border-slate-200">
                      <ClickToCopy text={`R$ ${proposal.production.gross}`}>R$ {proposal.production.gross}</ClickToCopy>
                    </td>
                    <td className="px-4 py-2 text-[10px] font-bold text-slate-600 text-center border-l border-slate-200">
                      <ClickToCopy text={`R$ ${proposal.production.net}`}>R$ {proposal.production.net}</ClickToCopy>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Observações</label>
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <textarea 
                  className="w-full p-3 text-[11px] font-medium text-slate-700 min-h-[100px] focus:outline-none"
                  defaultValue={proposal.observations}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "historico" && (
        <div className="space-y-6 animate-in fade-in duration-500 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
          <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] text-center">Rastreamento do Contrato</h3>
          <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-200">
            {[
              {
                id: 6,
                date: "08/01/2026",
                time: "16:17:34",
                status: "Com Inconsistência / Pendência para Digitação",
                description: "Com Inconsistência / Pendência para Digitação - Aguardando Banco: AGUARDANDO SISTEMA BANCO NORMALIZAR",
                author: "4752 - ALESSANDRA P. MATOS (Operacional)",
                type: "warning"
              },
              {
                id: 5,
                date: "08/01/2026",
                time: "13:22:42",
                status: "Aguardando Digitação",
                author: "2758 - TALIA ALVES (Corretora)",
                type: "info"
              },
              {
                id: 4,
                date: "17/12/2025",
                time: "18:29:04",
                status: "Com Inconsistência / Pendência para Digitação",
                description: "Aguardar ativação das tabelas",
                author: "4621 - TALITA SANTOS (Operacional)",
                type: "warning"
              },
              {
                id: 3,
                date: "17/12/2025",
                time: "18:22:15",
                status: "Aguardando Digitação",
                author: "4621 - TALITA SANTOS (Operacional)",
                type: "info",
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
                type: "info"
              },
              {
                id: 1,
                date: "17/12/2025",
                time: "18:09:02",
                status: "Contrato Criado se ADE",
                description: "Criado por um Operacional em 17/12/2025",
                observations: "Chave PIX: 12953087893\nSenha Portal: 16R27v2$",
                author: "2758 - TALIA ALVES (Corretora)",
                type: "default"
              }
            ].map((event) => (
              <div key={event.id} className="relative text-left">
                <div className={cn(
                  "absolute -left-8 top-0 w-6 h-6 rounded-full border-2 border-white shadow-sm z-10 flex items-center justify-center text-[10px] font-bold text-white",
                  event.type === 'warning' ? "bg-[#E69100]" : event.type === 'info' ? "bg-[#00BCD4]" : "bg-[#D1D5DB]"
                )}>
                  {event.id}
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-tight">{event.status}</h4>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] font-bold text-slate-900">{event.date}</p>
                      <p className="text-[9px] font-medium text-slate-500">{event.time}</p>
                    </div>
                  </div>
                  
                  {event.description && (
                    <p className="text-[10px] font-medium text-slate-700 leading-relaxed italic">{event.description}</p>
                  )}

                  {event.changes && (
                    <div className="space-y-2 pt-1 border-t border-slate-50">
                      <p className="text-[9px] font-bold text-slate-900 uppercase">Alterações no Contrato</p>
                      <div className="grid grid-cols-1 gap-2">
                        {event.changes.map((change, i) => (
                          <div key={i} className="bg-slate-50 p-1.5 rounded text-[9px]">
                            <p className="font-bold text-slate-900">{change.label}</p>
                            <div className="flex gap-2 text-slate-600">
                              <span>De: {change.old}</span>
                              <span>Para: {change.new}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {event.observations && (
                    <div className="space-y-1 pt-1 border-t border-slate-50">
                      <p className="text-[9px] font-bold text-slate-900 uppercase">Observações</p>
                      <p className="text-[9px] font-medium text-slate-700 whitespace-pre-line bg-slate-50 p-1.5 rounded">{event.observations}</p>
                    </div>
                  )}

                  <p className="text-[9px] font-bold text-slate-400 uppercase pt-1">
                    Por: {event.author}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
