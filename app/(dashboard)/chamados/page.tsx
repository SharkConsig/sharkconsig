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
  FileSpreadsheet,
  Send,
  Zap,
  UserCheck
} from "lucide-react"
import { cn, withRetry } from "@/lib/utils"
import { TicketAtendimento } from "@/components/tickets/ticket-atendimento"
import { ClientDetailsModal } from "@/components/clients/client-details-modal"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { evaluateTicketSLA, SLATicketState, getSLAGlobalSettings, isCollaboratorTargeted, SLAConfig } from "@/lib/sla-engine"
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
  { label: "APROVADOS", count: 0, color: "border-t-emerald-500", textColor: "text-emerald-600" },
  { label: "PROPOSTA ENVIADA / EM NEGOCIAÇÃO", count: 0, color: "border-t-cyan-500", textColor: "text-cyan-600" },
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
  "PREF SAO PAULO - CARTÃO BENEFICIO APROVADO",
  "PREF SAO PAULO - NOVO APROVADO",
  "PREF SAO PAULO - CARTÃO CONSIGNADO APROVADO",
  "GOV PR - NOVO APROVADO",
  "GOV PR - BENEFICIO APROVADO",
  "PREF SANTO ANDRE - NOVO APROVADO",
  "PREF SANTO ANDRE - CARTAO APROVADO",
  "GOV PI - CARTÃO BENEFICIO APROVADO",
  "GOV PI - CARTÃO CONSIGNADO APROVADO",
  "GOV RR - CARTÃO CONSIGNADO APROVADO",
  "GOV SP - CARTÃO CONSIGNADO APROVADO",
  "GOV RJ - SAQUE APROVADO",
  "GOV MG - NOVO APROVADO",
  "PREF CONTAGEM - CARTAO APROVADO",
  "PREF CONTAGEM - NOVO APROVADO",
  "GOV PI - NOVO APROVADO",
  "GOV MA - CARTÃO BENEFICIO APROVADO",
  "GOV MA - CARTÃO CONSIGNADO APROVADO",
  "GOV MA - NOVO APROVADO",
  "CLIENTE APROVADO - PORTABILIDADE",
  "PREF PORTO VELHO - CARTÃO APROVADO",
  "PREF NATAL - CARTÃO APROVADO"
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

const NEGOCIACAO_LABELS = [
  "PROPOSTA ENVIADA",
  "CLIENTE SEM INTERAÇÃO",
  "EM NEGOCIAÇÃO",
  "CLIENTE SEM INTERESSE"
]

const parseDescriptionMetadata = (desc: string) => {
  try {
    const match = desc?.match(/<!-- TICKET_METADATA: ([\s\S]*?) -->/);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
  } catch (e) {
    console.error("Error parsing metadata in list:", e);
  }
  return null;
};

function formatTempoParadoAmigavel(startDateISO?: string): string {
  if (!startDateISO) return 'alguns minutos'
  const start = new Date(startDateISO).getTime()
  if (isNaN(start)) return 'alguns minutos'
  const diffMs = Math.max(0, Date.now() - start)
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'menos de 1 minuto'
  if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`

  const diffHours = Math.floor(diffMinutes / 60)
  const remMinutes = diffMinutes % 60

  if (diffHours < 24) {
    const horaText = `${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
    if (remMinutes === 0) return horaText
    return `${horaText} e ${remMinutes} ${remMinutes === 1 ? 'minuto' : 'minutos'}`
  }

  const diffDays = Math.floor(diffHours / 24)
  const remHours = diffHours % 24

  const diaText = `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
  if (remHours === 0) return diaText
  return `${diaText} e ${remHours} ${remHours === 1 ? 'hora' : 'horas'}`
}

const parseValorToNumber = (valStr: string) => {
  if (!valStr) return 0;
  const clean = valStr.replace("R$", "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const parseCleanFloat = (val: string | number | null | undefined): number | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  const str = String(val).trim();
  if (!str) return null;
  
  // Remove "R$", spaces, and other non-numeric symbols except dots, commas, minus, and digits
  let cleaned = str.replace(/[^0-9.,-]/g, "").trim();
  if (!cleaned) return null;
  
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    const dotIndex = cleaned.indexOf(".");
    if (dotIndex !== -1) {
      const parts = cleaned.split(".");
      if (parts.length > 2) {
        cleaned = cleaned.replace(/\./g, "");
      } else {
        const decimalPart = parts[1];
        if (decimalPart.length === 3) {
          cleaned = cleaned.replace(/\./g, "");
        }
      }
    }
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

const extractTicketOperationValues = (t: any) => {
  let opValMargem = 0
  let opValCartao = 0

  try {
    const desc = t.descricao || t.description || t.content || ''
    const meta = parseDescriptionMetadata(desc)
    
    let selectedType = meta?.selected_operation_type
    if (!selectedType && desc) {
      const descUpper = desc.toUpperCase()
      if (descUpper.includes('MARGEM 35%') || descUpper.includes('MARGEM')) {
        selectedType = 'margem'
      } else if (descUpper.includes('LÍQUIDA 5%') || descUpper.includes('LIQUIDA 5%')) {
        selectedType = 'liquida5'
      } else if (descUpper.includes('BENEFÍCIO 5%') || descUpper.includes('BENEFICIO 5%') || descUpper.includes('CARTÃO') || descUpper.includes('CARTAO')) {
        selectedType = 'beneficio5'
      }
    }

    if (meta) {
      if (selectedType === 'margem') {
        opValMargem = parseCleanFloat(meta.valor_operacao_margem) || 0
        opValCartao = 0
      } else if (selectedType === 'liquida5' || selectedType === 'beneficio5') {
        opValMargem = 0
        if (selectedType === 'liquida5') {
          opValCartao = parseCleanFloat(meta.valor_operacao_liquida5) || 0
        } else {
          opValCartao = parseCleanFloat(meta.valor_operacao_beneficio5) || 0
        }
      } else {
        if (meta.valor_operacao_margem) {
          opValMargem = parseCleanFloat(meta.valor_operacao_margem) || 0
        }
        if (meta.valor_operacao_liquida5) {
          opValCartao = parseCleanFloat(meta.valor_operacao_liquida5) || 0
        } else if (meta.valor_operacao_beneficio5) {
          opValCartao = parseCleanFloat(meta.valor_operacao_beneficio5) || 0
        }
      }
    }
  } catch (e) {
    // ignorar
  }

  if (!opValMargem && !opValCartao) {
    if (t.valor_operacao) {
      opValMargem = parseCleanFloat(t.valor_operacao) || 0
    }
    if (t.valor_cartao) {
      opValCartao = parseCleanFloat(t.valor_cartao) || 0
    }
  }

  return { opValMargem, opValCartao }
};

const getValorOperacaoDeAbertura = (ticket: any) => {
  const desc = ticket.descricao || ticket.description || ticket.content || "";
  const meta = parseDescriptionMetadata(desc);
  const conv = ticket.convenio?.toUpperCase() || "";
  const isSantoAndre = conv.includes("SANTO ANDRÉ") || conv.includes("SANTO ANDRE");
  
  // 1. If we have a selected type in metadata
  const selectedType = meta?.selected_operation_type;
  if (selectedType) {
    if (selectedType === 'margem') {
      return { valor: meta.valor_operacao_margem || "R$ 0,00", label: isSantoAndre ? "M. Líq Empréstimo" : "Margem 35%", color: "text-amber-600" };
    }
    if (selectedType === 'liquida5') {
      return { valor: meta.valor_operacao_liquida5 || "R$ 0,00", label: isSantoAndre ? "M. Líquida Cartão" : "Líquida 5%", color: "text-emerald-600" };
    }
    if (selectedType === 'beneficio5') {
      return { valor: meta.valor_operacao_beneficio5 || "R$ 0,00", label: isSantoAndre ? "Margem Benefício" : "Benefício 5%", color: "text-blue-600" };
    }
  }

  // 2. Fallback to check if valor_operacao is directly in the DB column
  if (ticket.valor_operacao !== null && ticket.valor_operacao !== undefined && ticket.valor_operacao !== 0) {
    const valStr = "R$ " + Number(ticket.valor_operacao).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return { valor: valStr, label: "Valor Operação", color: "text-slate-900" };
  }

  // 3. Fallback to original description text selection
  let textSelectedType: 'margem' | 'liquida5' | 'beneficio5' | null = null;
  if (desc.includes("MARGEM 35%") || desc.includes("MARGEM LÍQUIDA EMPRÉSTIMO")) {
    textSelectedType = 'margem';
  } else if (desc.includes("LÍQUIDA 5%") || desc.includes("MARGEM LÍQUIDA CARTÃO")) {
    textSelectedType = 'liquida5';
  } else if (desc.includes("BENEFÍCIO 5%") || desc.includes("CARTÃO BENEFÍCIO") || desc.includes("CARTÃO CONSIGINADO") || desc.includes("CARTAO CONSIGINADO") || desc.includes("CARTÃO")) {
    textSelectedType = 'beneficio5';
  }

  if (textSelectedType) {
    if (textSelectedType === 'margem') {
      if (meta && meta.valor_operacao_margem) return { valor: meta.valor_operacao_margem, label: isSantoAndre ? "M. Líq Empréstimo" : "Margem 35%", color: "text-amber-600" };
      const mVal = ticket.margem || 0;
      const opVal = mVal / 0.028;
      return { 
        valor: "R$ " + opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
        label: isSantoAndre ? "M. Líq Empréstimo" : "Margem 35%", 
        color: "text-amber-600" 
      };
    }
    if (textSelectedType === 'liquida5') {
      if (meta && meta.valor_operacao_liquida5) return { valor: meta.valor_operacao_liquida5, label: isSantoAndre ? "M. Líquida Cartão" : "Líquida 5%", color: "text-emerald-600" };
      const mVal = ticket.margem_liquida_5 || 0;
      const opVal = mVal / 0.053;
      return { 
        valor: "R$ " + opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
        label: isSantoAndre ? "M. Líquida Cartão" : "Líquida 5%", 
        color: "text-emerald-600" 
      };
    }
    if (textSelectedType === 'beneficio5') {
      if (meta && meta.valor_operacao_beneficio5) return { valor: meta.valor_operacao_beneficio5, label: isSantoAndre ? "Margem Benefício" : "Benefício 5%", color: "text-blue-600" };
      const mVal = ticket.margem_beneficio_5 || 0;
      const opVal = mVal / 0.053;
      return { 
        valor: "R$ " + opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
        label: isSantoAndre ? "Margem Benefício" : "Benefício 5%", 
        color: "text-blue-600" 
      };
    }
  }

  // 4. Check meta fields without selection
  if (meta) {
    if (meta.margem && meta.margem !== "" && meta.margem !== "R$ 0,00") {
      return { valor: meta.valor_operacao_margem || "R$ 0,00", label: isSantoAndre ? "M. Líq Empréstimo" : "Margem 35%", color: "text-amber-600" };
    }
    if (meta.liquida5 && meta.liquida5 !== "" && meta.liquida5 !== "R$ 0,00") {
      return { valor: meta.valor_operacao_liquida5 || "R$ 0,00", label: isSantoAndre ? "M. Líquida Cartão" : "Líquida 5%", color: "text-emerald-600" };
    }
    if (meta.beneficio5 && meta.beneficio5 !== "" && meta.beneficio5 !== "R$ 0,00") {
      return { valor: meta.valor_operacao_beneficio5 || "R$ 0,00", label: isSantoAndre ? "Margem Benefício" : "Benefício 5%", color: "text-blue-600" };
    }
  }

  // 5. Final database fallbacks
  if (typeof ticket.margem === 'number' && ticket.margem !== 0) {
    const opVal = ticket.margem / 0.028;
    return { 
      valor: "R$ " + opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
      label: isSantoAndre ? "M. Líq Empréstimo" : "Margem 35%", 
      color: "text-amber-600" 
    };
  }
  if (typeof ticket.margem_liquida_5 === 'number' && ticket.margem_liquida_5 !== 0) {
    const opVal = ticket.margem_liquida_5 / 0.053;
    return { 
      valor: "R$ " + opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
      label: isSantoAndre ? "M. Líquida Cartão" : "Líquida 5%", 
      color: "text-emerald-600" 
    };
  }
  if (typeof ticket.margem_beneficio_5 === 'number' && ticket.margem_beneficio_5 !== 0) {
    const opVal = ticket.margem_beneficio_5 / 0.053;
    return { 
      valor: "R$ " + opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
      label: isSantoAndre ? "Margem Benefício" : "Benefício 5%", 
      color: "text-blue-600" 
    };
  }

  return { valor: "R$ 0,00", label: "Valor Operação", color: "text-slate-400" };
};

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
  const { perfil, user, isOperational, isAdmin, isSupervisor, isDeveloper, isEstagio } = useAuth()
  const isUserEstagio = isEstagio || perfil?.role?.toLowerCase() === 'estágio' || perfil?.role?.toLowerCase() === 'estagio'
  const { isCollapsed } = useSidebar()
  const canChangeStatusBulk = !!(
    (perfil?.role && [
      "operacional",
      "administrador",
      "admin",
      "desenvolvedor"
    ].includes(perfil.role.toLowerCase())) ||
    (user?.email && [
      "souendrionovo@gmail.com",
      "acertofacilpromotoradecredito@gmail.com"
    ].includes(user.email))
  )
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string | null>("ABERTO")
  const [selectedSecondaryStatus, setSelectedSecondaryStatus] = useState<string | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Novos estados para filtros avançados
  const [slaActive, setSlaActive] = useState(false)
  const [slaConfigs, setSlaConfigs] = useState<SLAConfig[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, { nome: string; funcao: string; isEstagiario: boolean }>>({})
  const [filterCorretores, setFilterCorretores] = useState<string[]>([])
  const [filterStatusList, setFilterStatusList] = useState<string[]>([])
  const [filterOrigens, setFilterOrigens] = useState<string[]>([])
  const [filterCliente, setFilterCliente] = useState("")
  const [filterConvenios, setFilterConvenios] = useState<string[]>([])
  const [filterEquipes, setFilterEquipes] = useState<string[]>([])
  const [filterMargemMin, setFilterMargemMin] = useState("")
  const [filterMargemMax, setFilterMargemMax] = useState("")
  const [filterEncaminhados, setFilterEncaminhados] = useState("Todos")
  const [filterEstagiarioForwarded, setFilterEstagiarioForwarded] = useState<string[]>([])
  const [filterCorretorForwarded, setFilterCorretorForwarded] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [selectedClientCpf, setSelectedClientCpf] = useState("")

  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([])
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkStatusList, setBulkStatusList] = useState<{ id: string; nome: string; cor: string }[]>([])
  const [selectedBulkStatusId, setSelectedBulkStatusId] = useState<string>("")
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false)

  const [selectedMatricula, setSelectedMatricula] = useState<string | undefined>()

  // Estados e Handlers para Cobrança Expressa e Transbordo de Lead (SLA)
  const [allUsersList, setAllUsersList] = useState<Array<{ id: string; nome: string; funcao?: string; role?: string; status?: string }>>([])

  const [selectedCobrancaTicket, setSelectedCobrancaTicket] = useState<Ticket | null>(null)
  const [cobrancaMensagem, setCobrancaMensagem] = useState("")
  const [isSendingCobranca, setIsSendingCobranca] = useState(false)
  const [isCobrancaModalOpen, setIsCobrancaModalOpen] = useState(false)

  const [selectedTransbordoTicket, setSelectedTransbordoTicket] = useState<Ticket | null>(null)
  const [selectedNewUserId, setSelectedNewUserId] = useState("")
  const [transbordoMotivo, setTransbordoMotivo] = useState("")
  const [isSubmittingTransbordo, setIsSubmittingTransbordo] = useState(false)
  const [isTransbordoModalOpen, setIsTransbordoModalOpen] = useState(false)

  const handleOpenCobrancaExpressa = useCallback((ticket: Ticket) => {
    const opVal = getValorOperacaoDeAbertura(ticket).valor
    const currentStatus = ticket.status_chamados?.nome || ticket.status || ''
    setSelectedCobrancaTicket(ticket)
    setCobrancaMensagem(`🚨 Favor dar andamento imediato a este chamado do cliente ${ticket.cliente_nome || ''} (${opVal || 'S/ Valor'}). O tempo limite desse chamado no status ${currentStatus} expirou e este lead exige priorização máxima!`)
    setIsCobrancaModalOpen(true)
  }, [])

  const handleConfirmCobrancaExpressa = async () => {
    if (!selectedCobrancaTicket || !cobrancaMensagem.trim() || !user || !perfil) return
    setIsSendingCobranca(true)
    try {
      const { error } = await supabase
        .from('mensagens_chamado')
        .insert({
          chamado_id: parseInt(selectedCobrancaTicket.id, 10),
          user_id: user.id,
          user_nome: perfil.nome,
          user_role: perfil.role,
          user_avatar: perfil.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(perfil.nome)}&background=random`,
          content: cobrancaMensagem,
          action: 'cobranca_expressa'
        })

      if (error) throw error
      toast.success("⚡ Cobrança Expressa enviada ao responsável do chamado!")
      setIsCobrancaModalOpen(false)
      setSelectedCobrancaTicket(null)
      setCobrancaMensagem("")
    } catch (err) {
      console.error("Erro ao enviar cobrança expressa:", err)
      toast.error("Erro ao enviar cobrança expressa.")
    } finally {
      setIsSendingCobranca(false)
    }
  }

  const handleOpenTransbordoLead = useCallback((ticket: Ticket) => {
    setSelectedTransbordoTicket(ticket)
    setSelectedNewUserId("")
    setTransbordoMotivo("SLA Excedido - Reatribuição imediata do Lead pelo Supervisor/Administrador para acelerar o atendimento.")
    setIsTransbordoModalOpen(true)
  }, [])

  const handleConfirmTransbordoLead = async () => {
    if (!selectedTransbordoTicket || !selectedNewUserId || !user || !perfil) return
    setIsSubmittingTransbordo(true)
    try {
      const targetUser = allUsersList.find(u => u.id === selectedNewUserId)
      const targetName = targetUser?.nome || usersMap[selectedNewUserId]?.nome || "Novo Colaborador"

      // 1. Atualizar o responsável pelo chamado na tabela chamados
      const { error: updateErr } = await supabase
        .from('chamados')
        .update({
          user_id: selectedNewUserId,
          user_nome: targetName
        })
        .eq('id', selectedTransbordoTicket.id)

      if (updateErr) throw updateErr

      // 2. Registrar no histórico de mensagens do chamado
      await supabase
        .from('mensagens_chamado')
        .insert({
          chamado_id: parseInt(selectedTransbordoTicket.id, 10),
          user_id: user.id,
          user_nome: perfil.nome,
          user_role: perfil.role,
          user_avatar: perfil.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(perfil.nome)}&background=random`,
          content: `🔄 REATRIBUIÇÃO / TRANSBORDO DE LEAD (SLA ESTOURADO):\nLead transferido de "${selectedTransbordoTicket.user_nome || 'Anterior'}" para "${targetName}".\nMotivo: ${transbordoMotivo}`,
          action: 'transbordo_lead'
        })

      toast.success(`🔄 Lead reatribuído para ${targetName} com sucesso!`)
      setIsTransbordoModalOpen(false)
      setSelectedTransbordoTicket(null)
      setSelectedNewUserId("")
      setTransbordoMotivo("")
      fetchTickets()
    } catch (err) {
      console.error("Erro no transbordo do lead:", err)
      toast.error("Erro ao reatribuir o lead.")
    } finally {
      setIsSubmittingTransbordo(false)
    }
  }

  const handleViewClient = useCallback((cpf: string, matricula?: string) => {
    setSelectedClientCpf(cpf)
    setSelectedMatricula(matricula)
    setIsClientModalOpen(true)
  }, [])

  const handleSendToCorretor = async (ticket: Ticket) => {
    try {
      if (!perfil?.padrinho_id) {
        toast.error("Você não tem um corretor padrinho vinculado.")
        return
      }
      
      const currentMeta = parseDescriptionMetadata(ticket.descricao || "") || {}
      const updatedMeta = {
        ...currentMeta,
        enviado_para_corretor: true,
        corretor_id: perfil.padrinho_id,
        corretor_nome: perfil.padrinho_nome,
        estagiario_id: perfil.id,
        estagiario_nome: perfil.nome
      }
      
      const cleanedDesc = (ticket.descricao || "").replace(/<!-- TICKET_METADATA: ([\s\S]*?) -->/g, "").trim();
      const newDescription = cleanedDesc + `\n\n<!-- TICKET_METADATA: ${JSON.stringify(updatedMeta)} -->`;
      
      const { error } = await supabase
        .from('chamados')
        .update({ descricao: newDescription })
        .eq('id', ticket.id)
        
      if (error) {
        console.error("Erro ao enviar para corretor:", error)
        toast.error("Erro ao enviar chamado para o corretor")
      } else {
        toast.success(`Chamado enviado para o corretor ${perfil.padrinho_nome}!`)
        fetchTickets(true)
      }
    } catch (err) {
      console.error("Erro ao enviar para o corretor:", err)
      toast.error("Ocorreu um erro ao enviar para o corretor")
    }
  }

  const isTicketAprovadoOrProposta = (ticket: Ticket) => {
    const statusUpper = (ticket.status_chamados?.nome || ticket.status || "").trim().toUpperCase()
    const isProposta = statusUpper === "PROPOSTA ENVIADA"
    const isAprovado = APROVADOS_LABELS.some(label => {
      const u = label.toUpperCase()
      const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
      return statusUpper === u || statusUpper === ua
    })
    return isProposta || isAprovado
  }

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
  const [activeApoioTicketIds, setActiveApoioTicketIds] = useState<Set<number>>(new Set())
  const [ticketApoioStates, setTicketApoioStates] = useState<Record<number, 'pediu' | 'respondido' | 'finalizado' | 'none'>>({})
  const itemsPerPage = 10
  const isFirstLoadRef = React.useRef(true)

  const fetchTickets = useCallback(async (isSilent = false) => {
    if (!perfil || !user) return

    const silent = (typeof isSilent === "boolean" ? isSilent : false) || !isFirstLoadRef.current
    if (!silent) setIsLoading(true)
    isFirstLoadRef.current = false
    try {
      let query = supabase
        .from('chamados')
        .select(`
          *,
          status_chamados:status_id (*)
        `)

      // Aplicar filtros de data no servidor para melhor performance (conversão segura de fuso horário local para UTC)
      if (startDate && startDate.length === 10) {
        const localStart = new Date(`${startDate}T00:00:00`)
        if (!isNaN(localStart.getTime())) {
          query = query.gte('created_at', localStart.toISOString())
        } else {
          query = query.gte('created_at', `${startDate}T00:00:00Z`)
        }
      }
      if (endDate && endDate.length === 10) {
        const localEnd = new Date(`${endDate}T23:59:59.999`)
        if (!isNaN(localEnd.getTime())) {
          query = query.lte('created_at', localEnd.toISOString())
        } else {
          query = query.lte('created_at', `${endDate}T23:59:59Z`)
        }
      }

      // Aplicar filtros de permissão baseados na Role
      if (perfil.role === 'Estágio' || perfil.role === 'Estagio' || perfil.role === 'Processo Seletivo' || perfil.role === 'PROCESSO SELETIVO') {
        query = query.eq('user_id', user.id)
      } else if (perfil.role === 'Corretor') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          const response = await fetch("/api/usuarios", { signal: controller.signal })
          clearTimeout(timeoutId);

          if (response.ok) {
            const allUsers = await response.json()
            const myEstagiarios = allUsers
              .filter((u: { padrinho_id: string }) => u.padrinho_id === user.id)
              .map((u: { id: string }) => u.id)
            
            query = query.in('user_id', [user.id, ...myEstagiarios])
          } else {
            console.warn("API de usuários retornou status:", response.status)
            query = query.eq('user_id', user.id)
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.warn("Requisição de usuários para Corretor excedeu timeout")
          } else {
            console.error("Erro ao buscar estagiários do padrinho:", err)
          }
          query = query.eq('user_id', user.id)
        }
      } else if (perfil.role === 'Supervisor') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          const response = await fetch("/api/usuarios", { signal: controller.signal })
          clearTimeout(timeoutId);

          if (response.ok) {
            const allUsers = await response.json()
            const subordinates = allUsers
              .filter((u: { supervisor_id: string; padrinho_id?: string }) => u.supervisor_id === user.id || u.padrinho_id === user.id)
              .map((u: { id: string }) => u.id)
            
            query = query.in('user_id', [...subordinates, user.id])
          } else {
            console.warn("API de usuários retornou status:", response.status)
            query = query.eq('user_id', user.id)
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.warn("Requisição de usuários para Supervisor excedeu timeout")
          } else {
            console.error("Erro ao buscar subordinados:", err)
          }
          query = query.eq('user_id', user.id)
        }
      }

      // Superar o limite padrão de 1000 linhas do Supabase/PostgREST
      let all: Ticket[] = []
      let from = 0
      const step = 1000
      let finished = false
      
      const orderedQuery = query.order('updated_at', { ascending: false })
      
      while (!finished) {
        const { data, error } = await withRetry(() => orderedQuery.range(from, from + step - 1))
        
        if (error) {
          console.error("Erro no Supabase ao buscar intervalo:", error)
          throw error
        }
        
        if (!data || data.length === 0) {
          finished = true
        } else {
          all = [...all, ...(data as Ticket[])]
          if (data.length < step) {
            finished = true
          } else {
            from += step
          }
        }
      }

      // Buscar apoios ativos e respostas dos supervisores
      try {
        const ticketIds = all.map(t => parseInt(t.id)).filter(id => !isNaN(id))
        if (ticketIds.length > 0) {
          const { data: apoioMsgs, error: apoioError } = await supabase
            .from('mensagens_chamado')
            .select('chamado_id, action, user_role, created_at')
            .in('chamado_id', ticketIds)
            .order('created_at', { ascending: true })

          if (!apoioError && apoioMsgs) {
            const activeSet = new Set<number>()
            const statesMap: Record<number, 'pediu' | 'respondido' | 'finalizado' | 'none'> = {}
            
            // Initialize
            for (const id of ticketIds) {
              statesMap[id] = 'none'
            }

            for (const msg of apoioMsgs) {
              const tId = msg.chamado_id
              const role = (msg.user_role || '').toLowerCase()
              const isBroker = ['corretor', 'estágio', 'estagio', 'processo seletivo', 'propostas'].includes(role) || !role

              if (msg.action === 'pediu_apoio') {
                activeSet.add(tId)
                statesMap[tId] = 'pediu'
              } else if (msg.action === 'resolveu_apoio') {
                activeSet.delete(tId)
                statesMap[tId] = 'finalizado'
              } else if (statesMap[tId] === 'pediu' && !isBroker) {
                statesMap[tId] = 'respondido'
              }
            }
            setActiveApoioTicketIds(activeSet)
            setTicketApoioStates(statesMap)
          }
        } else {
          setActiveApoioTicketIds(new Set())
          setTicketApoioStates({})
        }
      } catch (err) {
        console.error("Erro ao carregar status de apoio dos chamados:", err)
      }

      // Avaliar status de SLA para cada chamado em tempo real
      try {
        const [{ data: slaGlobal }, { data: slaConfigs }] = await Promise.all([
          supabase.from('sla_global_config').select('*').maybeSingle(),
          supabase.from('sla_config').select('*')
        ])
        const globalSettings = getSLAGlobalSettings(slaConfigs || [], slaGlobal)
        setSlaActive(globalSettings.ativo)
        setSlaConfigs(slaConfigs || [])

        if (globalSettings.ativo && slaConfigs && slaConfigs.length > 0) {
          all = all.map(ticket => {
            const isTargeted = isCollaboratorTargeted(ticket.user_id, globalSettings)
            if (!isTargeted) return { ...ticket, escalonamento_status: 'nenhum' }

            const { opValMargem, opValCartao } = extractTicketOperationValues(ticket)

            const ticketState: SLATicketState = {
              id: ticket.id,
              status: ticket.status_chamados?.nome || ticket.status,
              created_at: ticket.created_at,
              user_id: ticket.user_id,
              corretor_id: ticket.user_id,
              timestamp_ultima_mudanca_status: ticket.timestamp_ultima_mudanca_status || ticket.updated_at || ticket.created_at,
              pergunta_pendente: ticket.pergunta_pendente,
              timestamp_gatilho_disparado: ticket.timestamp_gatilho_disparado,
              soneca_usada: ticket.soneca_usada,
              timestamp_soneca: ticket.timestamp_soneca,
              escalonamento_status: ticket.escalonamento_status,
              timestamp_escalonamento: ticket.timestamp_escalonamento,
              operacao_valor_margem: opValMargem,
              operacao_valor_cartao: opValCartao
            }

            const res = evaluateTicketSLA(ticketState, slaConfigs, null, slaGlobal)
            let computedEscalonamento: 'nenhum' | 'supervisao' | 'administrador' | 'supervisao_administrador' | 'supervisao_gestao' = 'nenhum'
            if (res.gatilhoDisparado && !res.sonecaAtiva) {
              computedEscalonamento = res.escaladoGestao ? 'supervisao_gestao' : res.escaladoSupervisao ? 'supervisao' : 'nenhum'
            }

            if (ticket.escalonamento_status !== computedEscalonamento) {
              // Atualizar no banco em background
              supabase.from('chamados').update({ escalonamento_status: computedEscalonamento }).eq('id', ticket.id).then()
              return { ...ticket, escalonamento_status: computedEscalonamento }
            }
            return ticket
          })
        } else {
          // Quando SLA está desativado, desativa alertas no objeto retornado
          all = all.map(ticket => ({ ...ticket, escalonamento_status: 'nenhum' }))
        }
      } catch (slaErr) {
        console.error("Erro ao avaliar SLA nos chamados:", slaErr)
        setSlaActive(false)
        all = all.map(ticket => ({ ...ticket, escalonamento_status: 'nenhum' }))
      }

      setTickets(all)
    } catch (error: unknown) {
      console.error("Erro ao carregar chamados:", error)
      const message = error instanceof Error ? error.message : "Erro desconhecido"
      if (message.includes("fetch")) {
        toast.error("Erro de conexão. Verifique sua internet ou tente novamente.")
      } else {
        toast.error("Erro ao carregar a lista de chamados")
      }
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, perfil?.id, perfil?.role, startDate, endDate, user, perfil])

  useEffect(() => {
    if (user?.id && perfil?.id) {
      fetchTickets()
      const interval = setInterval(() => {
        fetchTickets(true)
      }, 15000) // Sincronização em tempo real a cada 15 segundos
      return () => clearInterval(interval)
    }
  }, [fetchTickets, user?.id, perfil?.id])

  useEffect(() => {
    setExpandedTicketId(null)
  }, [selectedStatus, selectedSecondaryStatus])

  useEffect(() => {
    const fetchStatusList = async () => {
      try {
        const { data, error } = await supabase
          .from("status_chamados")
          .select("id, nome, cor")
          .order("nome", { ascending: true })
        if (!error && data) {
          setBulkStatusList(data)
        }
      } catch (err) {
        console.error("Erro ao buscar lista de status para ação em massa:", err)
      }
    }
    fetchStatusList()
  }, [])

  useEffect(() => {
    const loadUsersMap = async () => {
      try {
        const res = await fetch("/api/usuarios")
        if (res.ok) {
          const users = await res.json()
          const map: Record<string, { nome: string; funcao: string; isEstagiario: boolean }> = {}
          if (Array.isArray(users)) {
            setAllUsersList(users)
            users.forEach((u: any) => {
              const func = (u.funcao || u.role || '').toLowerCase()
              const isEstagiario = func.includes('estágio') || func.includes('estagio') || func.includes('estagiario') || func.includes('processo seletivo')
              if (u.id) {
                map[u.id] = { nome: u.nome, funcao: u.funcao || '', isEstagiario }
              }
            })
          }
          setUsersMap(map)
        }
      } catch (e) {
        console.error("Erro ao carregar mapa de usuários para SLA:", e)
      }
    }
    loadUsersMap()
  }, [])

  // Extração de valores únicos para os filtros
  const uniqueCorretores = useMemo(() => Array.from(new Set(tickets.map(t => t.user_nome).filter(Boolean))).sort() as string[], [tickets])
  const uniqueStatus = useMemo(() => Array.from(new Set(tickets.map(t => t.status_chamados?.nome || t.status).filter(Boolean))).sort() as string[], [tickets])
  const uniqueOrigens = useMemo(() => Array.from(new Set(tickets.map(t => t.origem).filter(Boolean))).sort() as string[], [tickets])
  const uniqueConvenios = useMemo(() => {
    const names = tickets.map(t => normalizeConvenioName(t.convenio)).filter(Boolean) as string[];
    return Array.from(new Set(names)).sort();
  }, [tickets])
  const uniqueEquipes = useMemo(() => Array.from(new Set(tickets.map(t => t.equipe).filter(Boolean))).sort() as string[], [tickets])

  const uniqueEstagiariosForwarded = useMemo(() => {
    const names = tickets.map(t => {
      const meta = parseDescriptionMetadata(t.descricao || "")
      return meta?.estagiario_nome
    }).filter(Boolean) as string[]
    return Array.from(new Set(names)).sort()
  }, [tickets])

  const uniqueCorretoresForwarded = useMemo(() => {
    const names = tickets.map(t => {
      const meta = parseDescriptionMetadata(t.descricao || "")
      return meta?.corretor_nome
    }).filter(Boolean) as string[]
    return Array.from(new Set(names)).sort()
  }, [tickets])

  // Base tickets filtered by search and advanced filters
  const isGestaoOrSupervisor = useMemo(() => {
    const roleLower = (perfil?.role || '').toLowerCase()
    const isPJ = (perfil?.regime_contratacao || "").trim().toLowerCase() === 'pj' || (perfil?.funcao || "").trim().toLowerCase() === 'pj' || roleLower === 'pj'
    if (isPJ) return false

    return (isSupervisor || isAdmin || isOperational || isDeveloper || ['supervisor', 'administrador', 'administrativo', 'operacional', 'desenvolvedor'].includes(roleLower)) && !isUserEstagio && roleLower !== 'corretor'
  }, [perfil?.role, perfil?.regime_contratacao, perfil?.funcao, isSupervisor, isAdmin, isOperational, isDeveloper, isUserEstagio])

  const isUserAdmin = useMemo(() => {
    const roleLower = (perfil?.role || '').toLowerCase()
    const funcaoLower = ((perfil as any)?.funcao || '').toLowerCase()
    return isAdmin || isDeveloper || roleLower === 'administrador' || roleLower === 'admin' || roleLower === 'desenvolvedor' || funcaoLower.includes('admin')
  }, [isAdmin, isDeveloper, perfil?.role, (perfil as any)?.funcao])

  const isUserSupervisor = useMemo(() => {
    const roleLower = (perfil?.role || '').toLowerCase()
    const funcaoLower = ((perfil as any)?.funcao || '').toLowerCase()
    return isSupervisor || roleLower === 'supervisor' || funcaoLower.includes('supervis')
  }, [isSupervisor, perfil?.role, (perfil as any)?.funcao])

  const isTicketInUserSLAEscalation = useCallback((ticket: Ticket) => {
    if (!slaActive || !ticket.escalonamento_status || ticket.escalonamento_status === 'nenhum') return false

    const roleLower = (perfil?.role || '').toLowerCase()
    const isPJ = (perfil?.regime_contratacao || "").trim().toLowerCase() === 'pj' || (perfil?.funcao || "").trim().toLowerCase() === 'pj' || roleLower === 'pj'
    if (isPJ) return false

    if (!isUserAdmin && !isUserSupervisor) {
      return false
    }

    return ['supervisao', 'supervisao_administrador', 'supervisao_gestao', 'administrador'].includes(ticket.escalonamento_status)
  }, [slaActive, perfil?.role, perfil?.regime_contratacao, perfil?.funcao, isUserAdmin, isUserSupervisor])

  const isTicketSLAHistory = useCallback((ticket: Ticket) => {
    if (!slaActive) return false

    const roleLower = (perfil?.role || '').toLowerCase()
    const isPJ = (perfil?.regime_contratacao || "").trim().toLowerCase() === 'pj' || (perfil?.funcao || "").trim().toLowerCase() === 'pj' || roleLower === 'pj'
    if (isPJ) return false

    if (!isUserAdmin && !isUserSupervisor) {
      return false
    }

    const t = ticket as any
    const wasTriggeredInPast = Boolean(
      t.timestamp_gatilho_disparado ||
      t.timestamp_escalonamento ||
      t.respondeu_sla === true ||
      t.cobranca_expressa === true ||
      t.soneca_usada === true
    )

    return wasTriggeredInPast
  }, [slaActive, perfil?.role, perfil?.regime_contratacao, perfil?.funcao, isUserAdmin, isUserSupervisor])

  const isTicketInSLAFolder = useCallback((ticket: Ticket) => {
    return isTicketInUserSLAEscalation(ticket) || isTicketSLAHistory(ticket)
  }, [isTicketInUserSLAEscalation, isTicketSLAHistory])

  const baseFilteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Se for Corretor e o chamado for de um estagiário, só mostra se tiver sido enviado para ele
      if (perfil?.role === 'Corretor' && ticket.user_id !== user?.id) {
        const meta = parseDescriptionMetadata(ticket.descricao || "")
        if (!meta || !meta.enviado_para_corretor || meta.corretor_id !== user?.id) {
          return false
        }
      }

      // Basic text search
      const searchLower = searchTerm.toLowerCase()
      const searchDigits = searchTerm.replace(/\D/g, "")
      const ticketStatusName = (ticket.status_chamados?.nome || ticket.status || "").toLowerCase()
      
      const ticketCpfDigits = (ticket.cliente_cpf || "").replace(/\D/g, "")

      const tAny = ticket as any
      const descMeta = parseDescriptionMetadata(ticket.descricao || "") || {}

      const allTicketPhones = [
        ticket.cliente_telefone,
        tAny.cliente_telefone_2,
        tAny.cliente_telefone_3,
        tAny.cliente_telefone_4,
        tAny.tel_1,
        tAny.tel_2,
        tAny.tel_3,
        tAny.tel_4,
        tAny.tel_residencial_1,
        tAny.tel_residencial_2,
        tAny.tel_comercial,
        tAny.tel_celular,
        tAny.telefone_contato,
        descMeta.cliente_telefone,
        descMeta.cliente_telefone_2,
        descMeta.cliente_telefone_3,
        descMeta.cliente_telefone_4,
        descMeta.tel_1,
        descMeta.tel_2,
        descMeta.tel_3,
        descMeta.tel_4,
        descMeta.tel_residencial_1,
        descMeta.tel_residencial_2,
        descMeta.tel_comercial,
        descMeta.tel_celular,
        descMeta.telefone_contato,
      ].filter((p): p is string => typeof p === "string" && p.trim() !== "")

      const matchesPhone = allTicketPhones.some(phone => {
        if (phone.toLowerCase().includes(searchLower)) return true
        const phoneDigits = phone.replace(/\D/g, "")
        return searchDigits !== "" && phoneDigits.includes(searchDigits)
      })

      const matchesSearch = 
        ticket.id.toString().includes(searchTerm) ||
        ticket.cliente_nome.toLowerCase().includes(searchLower) ||
        ticket.cliente_cpf.includes(searchTerm) ||
        (searchDigits !== "" && ticketCpfDigits.includes(searchDigits)) ||
        matchesPhone ||
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

      // Filtro de Encaminhamento
      const isEncaminhado = !!descMeta?.enviado_para_corretor

      if (filterEncaminhados === "Sim" && !isEncaminhado) return false
      if (filterEncaminhados === "Não" && isEncaminhado) return false

      if (filterEstagiarioForwarded.length > 0) {
        if (!descMeta?.estagiario_nome || !filterEstagiarioForwarded.includes(descMeta.estagiario_nome)) return false
      }

      if (filterCorretorForwarded.length > 0) {
        if (!descMeta?.corretor_nome || !filterCorretorForwarded.includes(descMeta.corretor_nome)) return false
      }

      // Filtro de Valor Operação
      if (filterMargemMin || filterMargemMax) {
        const opData = getValorOperacaoDeAbertura(ticket)
        const opVal = parseValorToNumber(opData.valor)
        const minVal = parseCleanFloat(filterMargemMin)
        const maxVal = parseCleanFloat(filterMargemMax)
        if (minVal !== null && opVal < minVal) return false
        if (maxVal !== null && opVal > maxVal) return false
      }

      // Filtro de Período (Data)
      if (startDate || endDate) {
        const ticketDateStr = (() => {
          const raw = ticket.created_at || ticket.updated_at
          if (!raw) return null
          const str = String(raw).trim()
          if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
            const [day, month, year] = str.split('/')
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }
          if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            return str.slice(0, 10)
          }
          try {
            const d = new Date(str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str)
            if (!isNaN(d.getTime())) {
              const year = d.getFullYear()
              const month = String(d.getMonth() + 1).padStart(2, '0')
              const day = String(d.getDate()).padStart(2, '0')
              return `${year}-${month}-${day}`
            }
          } catch {}
          return null
        })()

        if (ticketDateStr) {
          if (startDate && ticketDateStr < startDate) return false
          if (endDate && ticketDateStr > endDate) return false
        } else {
          return false
        }
      }
      
      return true
    })
  }, [tickets, searchTerm, startDate, endDate, filterCorretores, filterStatusList, filterOrigens, filterCliente, filterConvenios, filterEquipes, filterMargemMin, filterMargemMax, filterEncaminhados, filterEstagiarioForwarded, filterCorretorForwarded])

  const partnershipStats = useMemo(() => {
    const forwardedTickets = baseFilteredTickets.filter(t => {
      const meta = parseDescriptionMetadata(t.descricao || "");
      return !!meta?.enviado_para_corretor;
    });

    const totalCount = forwardedTickets.length;
    const totalValue = forwardedTickets.reduce((acc, t) => {
      return acc + parseValorToNumber(getValorOperacaoDeAbertura(t).valor);
    }, 0);

    const groups: Record<string, {
      corretorName: string;
      estagiarios: Record<string, { count: number; value: number }>;
      totalCount: number;
      totalValue: number;
    }> = {};

    forwardedTickets.forEach(t => {
      const meta = parseDescriptionMetadata(t.descricao || "");
      const corretorName = meta?.corretor_nome || "Não Identificado";
      const estagiarioName = meta?.estagiario_nome || "Não Identificado";
      const value = parseValorToNumber(getValorOperacaoDeAbertura(t).valor);

      if (!groups[corretorName]) {
        groups[corretorName] = {
          corretorName,
          estagiarios: {},
          totalCount: 0,
          totalValue: 0,
        };
      }

      groups[corretorName].totalCount += 1;
      groups[corretorName].totalValue += value;

      if (!groups[corretorName].estagiarios[estagiarioName]) {
        groups[corretorName].estagiarios[estagiarioName] = { count: 0, value: 0 };
      }
      groups[corretorName].estagiarios[estagiarioName].count += 1;
      groups[corretorName].estagiarios[estagiarioName].value += value;
    });

    return {
      totalCount,
      totalValue,
      groups: Object.values(groups).sort((a, b) => b.totalValue - a.totalValue),
    };
  }, [baseFilteredTickets]);

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
        if (u === "CLIENTE SEM INTERAÇÃO") {
          matchesStatus = ticketStatusUpper === "CLIENTE SEM INTERAÇÃO" || ticketStatusUpper.includes("SEM INTERAÇÃO")
        } else {
          matchesStatus = ticketStatusUpper === u || ticketStatusUpper === ua
        }
      } else if (selectedStatus && selectedStatus !== "TODOS") {
        if (selectedStatus === "SLA ESTOURADO") {
          matchesStatus = isTicketInSLAFolder(ticket)
        } else if (selectedStatus === "APROVADOS") {
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
        } else if (selectedStatus === "PROPOSTA ENVIADA / EM NEGOCIAÇÃO") {
          matchesStatus = NEGOCIACAO_LABELS.some(label => {
            const u = label.toUpperCase()
            const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
            if (u === "CLIENTE SEM INTERAÇÃO") {
              return ticketStatusUpper === "CLIENTE SEM INTERAÇÃO" || ticketStatusUpper.includes("SEM INTERAÇÃO")
            }
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
  }, [baseFilteredTickets, selectedStatus, selectedSecondaryStatus, isTicketInSLAFolder])

  // Summing values per status label
  const statusValues = useMemo(() => {
    const res: Record<string, number> = {}
    baseFilteredTickets.forEach(t => {
      const s = (t.status_chamados?.nome || t.status || "").trim().toUpperCase()
      const opData = getValorOperacaoDeAbertura(t)
      const opVal = parseValorToNumber(opData.valor)
      res[s] = (res[s] || 0) + opVal
    })
    return res;
  }, [baseFilteredTickets])

  const statusCards = useMemo(() => {
    const list = statusCardsList.map(c => ({ ...c }))

    if (isGestaoOrSupervisor) {
      const slaTickets = baseFilteredTickets.filter(isTicketInSLAFolder)
      const slaCount = slaTickets.length
      const slaTotalValor = slaTickets.reduce((acc, t) => {
        const opData = getValorOperacaoDeAbertura(t)
        return acc + parseValorToNumber(opData.valor)
      }, 0)

      const todosIdx = list.findIndex(c => c.label === "TODOS")
      const slaCard = {
        label: "SLA ESTOURADO",
        count: slaCount,
        totalValor: slaTotalValor,
        color: "border-t-[#610000] bg-[#610000]/5",
        textColor: "text-[#610000]"
      }

      if (todosIdx !== -1) {
        list.splice(todosIdx, 0, slaCard)
      } else {
        list.push(slaCard)
      }
    }

    return list.map(card => {
      if (card.label === "SLA ESTOURADO") {
        return card
      }
      let count = counts[card.label] || 0
      let totalValor = statusValues[card.label] || 0
      
      if (card.label === "ABERTO") {
        count = (counts["ABERTO"] || 0) + (counts["ABERTOS"] || 0)
        totalValor = (statusValues["ABERTO"] || 0) + (statusValues["ABERTOS"] || 0)
      } else if (card.label === "AGUARDANDO OPERACIONAL") {
        count = counts["AGUARDANDO OPERACIONAL"] || 0
        totalValor = statusValues["AGUARDANDO OPERACIONAL"] || 0
      } else if (card.label === "APROVADOS") {
        count = APROVADOS_LABELS.reduce((acc, label) => {
          const u = label.toUpperCase()
          const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
          return acc + (counts[u] || 0) + (u !== ua ? (counts[ua] || 0) : 0)
        }, 0)
        totalValor = APROVADOS_LABELS.reduce((acc, label) => {
          const u = label.toUpperCase()
          const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
          return acc + (statusValues[u] || 0) + (u !== ua ? (statusValues[ua] || 0) : 0)
        }, 0)
      } else if (card.label === "NÃO APROVADOS") {
        count = NAO_APROVADOS_LABELS.reduce((acc, label) => {
          const u = label.toUpperCase()
          const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
          return acc + (counts[u] || 0) + (u !== ua ? (counts[ua] || 0) : 0)
        }, 0)
        totalValor = NAO_APROVADOS_LABELS.reduce((acc, label) => {
          const u = label.toUpperCase()
          const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
          return acc + (statusValues[u] || 0) + (u !== ua ? (statusValues[ua] || 0) : 0)
        }, 0)
      } else if (card.label === "PROPOSTA ENVIADA / EM NEGOCIAÇÃO") {
        count = NEGOCIACAO_LABELS.reduce((acc, label) => {
          const u = label.toUpperCase()
          const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
          return acc + (counts[u] || 0) + (u !== ua ? (counts[ua] || 0) : 0)
        }, 0)
        totalValor = NEGOCIACAO_LABELS.reduce((acc, label) => {
          const u = label.toUpperCase()
          const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
          return acc + (statusValues[u] || 0) + (u !== ua ? (statusValues[ua] || 0) : 0)
        }, 0)
      } else if (card.label === "TODOS") {
        count = baseFilteredTickets.length
        totalValor = baseFilteredTickets.reduce((acc, t) => {
          const opData = getValorOperacaoDeAbertura(t)
          return acc + parseValorToNumber(opData.valor)
        }, 0)
      }

      return { ...card, count, totalValor }
    })
  }, [counts, statusValues, baseFilteredTickets, isGestaoOrSupervisor, isTicketInSLAFolder])

  const handleParentClick = (status: string) => {
    setCurrentPage(1)
    if (selectedStatus === status) {
      setSelectedStatus("TODOS")
      setSelectedSecondaryStatus(null)
    } else {
      setSelectedStatus(status)
      if (status !== "APROVADOS" && status !== "NÃO APROVADOS" && status !== "PROPOSTA ENVIADA / EM NEGOCIAÇÃO") {
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
    const labels = selectedStatus === "APROVADOS" 
      ? APROVADOS_LABELS 
      : selectedStatus === "NÃO APROVADOS" 
        ? NAO_APROVADOS_LABELS 
        : selectedStatus === "PROPOSTA ENVIADA / EM NEGOCIAÇÃO"
          ? NEGOCIACAO_LABELS
          : []
    
    return labels.map(label => {
      const u = label.toUpperCase()
      const ua = u.replace('BENEFICIO', 'BENEFÍCIO')
      let count = (counts[u] || 0) + (u !== ua ? (counts[ua] || 0) : 0)
      if (u === "CLIENTE SEM INTERAÇÃO") {
        count += (counts["SEM INTERAÇÃO (PROPOSTA ENVIADA)"] || 0) + (counts["SEM INTERAÇÃO"] || 0)
      }
      return { label, count, color: "text-slate-600" }
    })
  }, [counts, selectedStatus])

  // Reset page on search or date filter or advanced filters
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, startDate, endDate, filterCorretores, filterStatusList, filterOrigens, filterCliente, filterConvenios, filterEquipes, filterMargemMin, filterMargemMax, filterEncaminhados, filterEstagiarioForwarded, filterCorretorForwarded])

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage)
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const expandedTicket = useMemo(() => {
    if (!expandedTicketId) return null
    return filteredTickets.find(t => t.id.toString() === expandedTicketId) || tickets.find(t => t.id.toString() === expandedTicketId) || null
  }, [expandedTicketId, filteredTickets, tickets])

  const displayTickets = expandedTicket ? [expandedTicket] : paginatedTickets

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const toggleTicketExpansion = (ticketId: string) => {
    setExpandedTicketId(expandedTicketId === ticketId ? null : ticketId)
  }

  const handleBulkStatusChange = async () => {
    if (!selectedBulkStatusId || selectedTicketIds.length === 0 || !perfil || !user) return
    setIsUpdatingBulk(true)
    const selectedStatusObj = bulkStatusList.find(s => s.id === selectedBulkStatusId)
    if (!selectedStatusObj) {
      toast.error("Status inválido selecionado.")
      setIsUpdatingBulk(false)
      return
    }

    try {
      // 1. Atualizar chamados no Supabase
      const { error } = await supabase
        .from("chamados")
        .update({
          status_id: selectedBulkStatusId,
          status: selectedStatusObj.nome,
          updated_at: new Date().toISOString()
        })
        .in("id", selectedTicketIds)

      if (error) throw error

      // 2. Registrar mudanca de status em mensagens_chamado para auditoria
      const messagesToInsert = selectedTicketIds.map(id => {
        const ticket = tickets.find(t => t.id.toString() === id)
        const fromStatus = ticket ? (ticket.status_chamados?.nome || ticket.status || "Desconhecido") : "Desconhecido"
        
        let chamadoIdValue: string | number = id
        const parsedId = Number(id)
        if (!isNaN(parsedId)) {
          chamadoIdValue = parsedId
        }

        return {
          chamado_id: chamadoIdValue,
          user_id: user.id,
          user_nome: perfil.nome,
          user_role: perfil.role,
          user_avatar: perfil.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(perfil.nome)}&background=random`,
          content: `Status alterado em massa para ${selectedStatusObj.nome}`,
          action: 'alterou o status',
          status_change: {
            from: fromStatus,
            to: selectedStatusObj.nome,
            fromColor: "slate",
            toColor: selectedStatusObj.cor
          },
          attachments: []
        }
      })

      if (messagesToInsert.length > 0) {
        const { error: msgErr } = await supabase
          .from("mensagens_chamado")
          .insert(messagesToInsert)
        if (msgErr) {
          console.error("Erro ao inserir historico do status em massa:", msgErr)
        }
      }

      toast.success(`Alterado o status de ${selectedTicketIds.length} chamados para ${selectedStatusObj.nome}!`)
      setSelectedTicketIds([])
      setIsBulkModalOpen(false)
      setSelectedBulkStatusId("")
      await fetchTickets(true)
    } catch (err) {
      console.error("Erro ao atualizar status em massa:", err)
      toast.error("Ocorreu um erro ao atualizar os chamados.")
    } finally {
      setIsUpdatingBulk(false)
    }
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
        { header: 'Valor Operação', key: 'valor_operacao', width: 20 },
        { header: 'Equipe', key: 'equipe', width: 20 },
        { header: 'Data', key: 'data', width: 20 },
      ]

      // Add rows
      filteredTickets.forEach(ticket => {
        const opData = getValorOperacaoDeAbertura(ticket)
        worksheet.addRow({
          id: ticket.id,
          status: ticket.status_chamados?.nome || ticket.status,
          corretor: ticket.user_nome || '---',
          origem: ticket.origem,
          cliente: ticket.cliente_nome,
          cpf: ticket.cliente_cpf,
          telefone: ticket.cliente_telefone,
          valor_operacao: opData.valor,
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

  const handleDigitarProposta = async (ticket: Ticket) => {
    if (isUserEstagio) {
      toast.error("Você não tem permissão para digitar propostas.")
      return
    }
    const loadingToast = toast.loading("Carregando dados do cliente...")
    let nascimento = "31/01/1984"
    const cleanCPF = ticket.cliente_cpf ? ticket.cliente_cpf.replace(/\D/g, "").padStart(11, "0") : ""
    try {
      if (cleanCPF) {
        const tables = [
          'clientes',
          'governo_sp_clientes',
          'prefeitura_sp_clientes',
          'governo_pi_clientes',
          'governo_ma_clientes',
          'governo_rr_clientes',
          'governo_rj_clientes',
          'prefeitura_santo_andre_clientes',
          'prefeitura_contagem_clientes',
          'governo_mg_clientes'
        ]
        
        const results = await Promise.all(
          tables.map(async (tableName) => {
            try {
              const { data } = await supabase
                .from(tableName)
                .select('data_nascimento')
                .eq('cpf', cleanCPF)
                .maybeSingle()
              return data?.data_nascimento || null
            } catch {
              return null
            }
          })
        )
        
        const foundBirthDate = results.find(Boolean)
        if (foundBirthDate) {
          if (foundBirthDate.includes('-')) {
            const parts = foundBirthDate.split('-')
            if (parts.length === 3) {
              nascimento = `${parts[2]}/${parts[1]}/${parts[0]}`
            }
          } else {
            nascimento = foundBirthDate
          }
        }
      }
    } catch (err) {
      console.error("Erro ao buscar data de nascimento do cliente:", err)
    } finally {
      toast.dismiss(loadingToast)
    }
    const params = new URLSearchParams({
      nome: ticket.cliente_nome,
      cpf: ticket.cliente_cpf,
      nascimento, 
      idLead: ticket.matricula || ticket.id.toString(),
      idChamado: ticket.id.toString(),
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
    else if (s === 'EM NEGOCIAÇÃO / PROPOSTA ENVIADA' || s === 'PROPOSTA ENVIADA / EM NEGOCIAÇÃO') legacyBg = "bg-cyan-500"
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
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Operação (Mín - Máx)</label>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="Min" 
                      type="text"
                      className="h-[38px] bg-slate-50/50 border-slate-100 text-[11px]"
                      value={filterMargemMin}
                      onChange={(e) => setFilterMargemMin(e.target.value)}
                    />
                    <Input 
                      placeholder="Max" 
                      type="text"
                      className="h-[38px] bg-slate-50/50 border-slate-100 text-[11px]"
                      value={filterMargemMax}
                      onChange={(e) => setFilterMargemMax(e.target.value)}
                    />
                  </div>
                </div>

                <div className="hidden lg:block" />

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Encaminhado?</label>
                  <select
                    value={filterEncaminhados}
                    onChange={(e) => setFilterEncaminhados(e.target.value)}
                    className="w-full h-[38px] rounded-lg border border-slate-100 bg-slate-50/50 px-3 text-[11px] font-medium text-slate-700 outline-none focus:border-indigo-400 transition-colors"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>

                {(isAdmin || isSupervisor || isOperational || isDeveloper) && (
                  <>
                    <MultiSelect 
                      label="Encaminhado por (Estagiário)"
                      options={uniqueEstagiariosForwarded}
                      selected={filterEstagiarioForwarded}
                      onToggle={(val) => {
                        setFilterEstagiarioForwarded(prev => 
                          prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]
                        )
                      }}
                    />

                    <MultiSelect 
                      label="Encaminhado para (Corretor)"
                      options={uniqueCorretoresForwarded}
                      selected={filterCorretorForwarded}
                      onToggle={(val) => {
                        setFilterCorretorForwarded(prev => 
                          prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]
                        )
                      }}
                    />
                  </>
                )}

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
                      setFilterEncaminhados("Todos");
                      setFilterEstagiarioForwarded([]);
                      setFilterCorretorForwarded([]);
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
        <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", isGestaoOrSupervisor ? "xl:grid-cols-7" : "xl:grid-cols-6")}>
          {statusCards.map((card) => (
            <button 
              key={card.label}
              onClick={() => handleParentClick(card.label)}
              className={cn(
                "p-4 bg-white border-t-4 rounded-xl card-shadow transition-all text-left group hover:-translate-y-1 flex flex-col justify-between min-h-[145px]",
                card.color,
                selectedStatus === card.label && "ring-2 ring-primary ring-offset-2 scale-105"
              )}
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight mb-2 group-hover:text-slate-600">{card.label}</p>
                <p className={cn("text-2xl font-black", card.textColor)}>{card.count}</p>
                <p className="text-[10px] font-black text-slate-400 tracking-tighter mt-0.5">
                  {baseFilteredTickets.length ? Math.round((card.count / baseFilteredTickets.length) * 100) : 0}% do Total
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-dashed border-slate-100 w-full">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-0.5">VALOR TOTAL DAS OPERAÇÕES</p>
                <p className={cn("text-sm font-black", card.textColor)}>{card.totalValor ? Number(card.totalValor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00"}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Secondary Status Cards (Only visible if APROVADOS or NÃO APROVADOS or PROPOSTA ENVIADA / EM NEGOCIAÇÃO is selected) */}
        <div className={cn(
          "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 transition-all duration-300 overflow-hidden",
          (selectedStatus === "APROVADOS" || selectedStatus === "NÃO APROVADOS" || selectedStatus === "PROPOSTA ENVIADA / EM NEGOCIAÇÃO") ? "max-h-[800px] opacity-100 pt-2" : "max-h-0 opacity-0 pointer-events-none"
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

        {/* Export Button Row - For Operacional, Admin, Developer and Supervisor */}
        {(isOperational || isAdmin || isDeveloper || isSupervisor) && (
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
            {/* Barra de Ações em Massa */}
            {canChangeStatusBulk && (
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedTicketIds.length === 0}
                    onClick={() => setIsBulkModalOpen(true)}
                    className={cn(
                      "h-10 px-6 bg-white border-primary/20 text-primary hover:bg-primary/5 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-sm cursor-pointer border-2 min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    ALTERAR STATUS
                    {selectedTicketIds.length > 0 && (
                      <Badge variant="secondary" className="h-[20px] min-w-[20px] px-1.5 text-[10px] bg-primary/10 text-primary border-none font-bold rounded-full flex items-center justify-center">
                        {selectedTicketIds.length}
                      </Badge>
                    )}
                  </Button>
                  {selectedTicketIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTicketIds([])}
                      className="text-xs text-rose-500 hover:text-rose-600 font-bold hover:bg-rose-50 cursor-pointer h-10 px-4 rounded-xl transition-all"
                    >
                      Limpar Seleção
                    </Button>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                  {selectedTicketIds.length} selecionado(s) de {filteredTickets.length} chamados
                </span>
              </div>
            )}

            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    {canChangeStatusBulk && (
                      <th className="px-4 py-4 w-[40px] text-center">
                        <input
                          type="checkbox"
                          checked={paginatedTickets.length > 0 && paginatedTickets.every(t => selectedTicketIds.includes(t.id.toString()))}
                          onChange={(e) => {
                            const idsOnPage = paginatedTickets.map(t => t.id.toString())
                            if (e.target.checked) {
                              setSelectedTicketIds(prev => Array.from(new Set([...prev, ...idsOnPage])))
                            } else {
                              setSelectedTicketIds(prev => prev.filter(id => !idsOnPage.includes(id)))
                            }
                          }}
                          className="w-[18px] h-[18px] rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer transition-all"
                        />
                      </th>
                    )}
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[80px]">Número</th>
                    {(isOperational || isAdmin || isSupervisor || isDeveloper) && (
                      <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[120px]">Corretor</th>
                    )}
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[150px]">Status</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[110px]">Origem</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[200px]">Cliente / Convênio</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[130px]">CPF</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[120px]">Telefone</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right min-w-[140px]">Valor Operação</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[150px]">Equipe</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aberto</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading && tickets.length === 0 ? (
                    <tr>
                      <td colSpan={(isOperational || isAdmin || isSupervisor || isDeveloper ? 11 : 10) + (canChangeStatusBulk ? 1 : 0)} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carregando chamados...</span>
                        </div>
                      </td>
                    </tr>
                  ) : displayTickets.length > 0 ? (
                    displayTickets.map((ticket, index) => (
                      <React.Fragment key={ticket.id}>
                        <tr 
                          className={cn(
                            "group cursor-pointer",
                            expandedTicketId === ticket.id.toString() ? "bg-slate-50 border-l-2 border-primary border-b-0" : (index % 2 === 0 ? "bg-slate-100" : "bg-white")
                          )}
                          onClick={() => toggleTicketExpansion(ticket.id.toString())}
                        >
                          {canChangeStatusBulk && (
                            <td className="px-4 py-4 w-[40px] text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedTicketIds.includes(ticket.id.toString())}
                                onChange={() => {
                                  setSelectedTicketIds(prev => {
                                    if (prev.includes(ticket.id.toString())) {
                                      return prev.filter(id => id !== ticket.id.toString())
                                    } else {
                                      return [...prev, ticket.id.toString()]
                                    }
                                  })
                                }}
                                className="w-[18px] h-[18px] rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer transition-all"
                              />
                            </td>
                          )}
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
                            <div className="flex flex-col gap-1 items-start">
                              <span 
                                className={getStatusStyle(ticket).className}
                                style={getStatusStyle(ticket).style}
                              >
                                {ticket.status_chamados?.nome || ticket.status}
                              </span>
                              {slaActive && (isUserAdmin || isUserSupervisor) && isTicketInSLAFolder(ticket) && (() => {
                                const isActive = isTicketInUserSLAEscalation(ticket)

                                if (isActive) {
                                  const labelText = isUserAdmin ? '🚨 ATENÇÃO ADMINISTRADOR!' : '🚨 ATENÇÃO SUPERVISOR!'
                                  const currentStatus = ticket.status_chamados?.nome || ticket.status || ''

                                  const meta = parseDescriptionMetadata(ticket.descricao || "")
                                  const userInMap = ticket.user_id ? usersMap[ticket.user_id] : null

                                  let isEstagiario = false
                                  if (userInMap) {
                                    isEstagiario = userInMap.isEstagiario
                                  } else if (ticket.user_id === user?.id && perfil) {
                                    const r = (perfil.role || (perfil as any).funcao || '').toLowerCase()
                                    isEstagiario = r.includes('estágio') || r.includes('estagio') || r.includes('estagiario') || r.includes('processo seletivo')
                                  } else if (meta?.estagiario_id && meta.estagiario_id === ticket.user_id) {
                                    isEstagiario = true
                                  } else if (meta?.estagiario_nome && meta.estagiario_nome === ticket.user_nome) {
                                    isEstagiario = true
                                  }

                                  const collaboratorName = ticket.user_nome || userInMap?.nome || "---"
                                  const cargoText = isEstagiario ? "Estagiário" : "Corretor"
                                  const tempoParadoStr = formatTempoParadoAmigavel(ticket.timestamp_ultima_mudanca_status || ticket.created_at)
                                  const tooltipText = `Chamado parado há ${tempoParadoStr} no status ${currentStatus} aguardando a ação do ${cargoText} ${collaboratorName}.`

                                  return (
                                    <span 
                                      title={tooltipText}
                                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 uppercase tracking-tight shadow-sm flex items-center gap-1 cursor-help"
                                    >
                                      {labelText}
                                    </span>
                                  )
                                } else {
                                  const isCobrado = Boolean((ticket as any).cobranca_expressa)
                                  const labelText = isCobrado ? '⚡ SLA COBRADO' : '✅ SLA RESPONDIDO'
                                  const tooltipText = isCobrado
                                    ? "Este chamado foi cobrado via Cobrança Expressa e já possui andamento/resposta no histórico."
                                    : "Este chamado teve alerta de SLA e a resposta/ação foi realizada pelo colaborador."

                                  return (
                                    <span 
                                      title={tooltipText}
                                      className={cn(
                                        "text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-tight shadow-sm flex items-center gap-1 cursor-help border",
                                        isCobrado 
                                          ? "bg-blue-50 text-blue-700 border-blue-200" 
                                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      )}
                                    >
                                      {labelText}
                                    </span>
                                  )
                                }
                              })()}
                              {(() => {
                                const meta = parseDescriptionMetadata(ticket.descricao || "")
                                if (meta?.enviado_para_corretor === true && ticket.user_id !== user?.id) {
                                  return (
                                    <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200 font-bold px-1.5 py-0.5 rounded mt-1">
                                      Estagiário: {meta.estagiario_nome || "Não informado"}
                                    </Badge>
                                  )
                                }
                                return null
                              })()}
                              {ticketApoioStates[ticket.id] && ticketApoioStates[ticket.id] !== 'none' && (
                                <>
                                  {ticketApoioStates[ticket.id] === 'pediu' && (
                                    <span 
                                      className="text-[9px] font-medium whitespace-nowrap"
                                      style={{ color: '#EC003F' }}
                                    >
                                      {((perfil?.role?.toLowerCase() === 'corretor') || isUserEstagio) ? "Solicitei apoio 🆘" : "Apoio solicitado 🆘"}
                                    </span>
                                  )}
                                  {ticketApoioStates[ticket.id] === 'respondido' && (
                                    <span 
                                      className="text-[9px] font-medium text-emerald-600 whitespace-nowrap"
                                    >
                                      Supervisor respondeu ✅
                                    </span>
                                  )}
                                  {ticketApoioStates[ticket.id] === 'finalizado' && (
                                    <span 
                                      className="text-[9px] font-medium text-emerald-600 whitespace-nowrap"
                                    >
                                      Apoio finalizado ✅
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
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
                              {(() => {
                                const opData = getValorOperacaoDeAbertura(ticket);
                                return (
                                  <span className="flex flex-col items-end">
                                    <span className="text-[11.5px] leading-tight font-black text-slate-900">
                                      {opData.valor}
                                    </span>
                                    <span className={cn("text-[8px] uppercase font-black tracking-tighter mt-0.5", opData.color)}>
                                      {opData.label}
                                    </span>
                                  </span>
                                );
                              })()}
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
                              {isUserEstagio && isTicketAprovadoOrProposta(ticket) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={cn(
                                    "h-8 w-8 rounded-full transition-all cursor-pointer",
                                    (() => {
                                      const meta = parseDescriptionMetadata(ticket.descricao || "")
                                      return meta?.enviado_para_corretor 
                                        ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50" 
                                        : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                    })()
                                  )}
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    const meta = parseDescriptionMetadata(ticket.descricao || "")
                                    if (meta?.enviado_para_corretor) {
                                      toast.success(`Este chamado já foi enviado para o corretor ${meta.corretor_nome || 'padrinho'}`)
                                      return
                                    }
                                    await handleSendToCorretor(ticket)
                                  }}
                                  title={(() => {
                                    const meta = parseDescriptionMetadata(ticket.descricao || "")
                                    return meta?.enviado_para_corretor 
                                      ? `Enviado para o Corretor (${meta.corretor_nome})` 
                                      : "Enviar para o Corretor Padrinho"
                                  })()}
                                >
                                  {(() => {
                                    const meta = parseDescriptionMetadata(ticket.descricao || "")
                                    return meta?.enviado_para_corretor ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />
                                  })()}
                                </Button>
                              )}
                              {!isUserEstagio && (
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
                              )}
                              {slaActive && (isUserAdmin || isUserSupervisor) && ticket.escalonamento_status && ticket.escalonamento_status !== 'nenhum' && isTicketInUserSLAEscalation(ticket) && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100/80 rounded-full transition-all cursor-pointer bg-amber-50 border border-amber-200/60 shadow-xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenCobrancaExpressa(ticket)
                                    }}
                                    title="Cobrança Expressa (Nudge de Alta Prioridade)"
                                  >
                                    <Zap className="w-4 h-4 text-amber-600 fill-amber-500 animate-pulse" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/80 rounded-full transition-all cursor-pointer bg-indigo-50 border border-indigo-200/60 shadow-xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenTransbordoLead(ticket)
                                    }}
                                    title="Reatribuição / Transbordo Imediato do Lead"
                                  >
                                    <UserCheck className="w-4 h-4 text-indigo-600" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedTicketId === ticket.id.toString() && (
                          <tr className={cn(index % 2 === 0 ? "bg-slate-100" : "bg-white")}>
                            <td colSpan={(isOperational || isAdmin || isSupervisor || isDeveloper ? 11 : 10) + (canChangeStatusBulk ? 1 : 0)} className="p-0 border-b border-slate-200">
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
                                    arquivo_outros: ticket.arquivo_outros,
                                    margem: ticket.margem,
                                    margem_liquida_5: ticket.margem_liquida_5,
                                    margem_beneficio_5: ticket.margem_beneficio_5,
                                    convenio: ticket.convenio
                                  }} 
                                  onMessageSent={() => {
                                    fetchTickets(true);
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
                      <td colSpan={(isOperational || isAdmin || isSupervisor || isDeveloper ? 11 : 10) + (canChangeStatusBulk ? 1 : 0)} className="px-4 py-12 text-center text-slate-400 text-[12px] font-medium uppercase tracking-widest">
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

        {/* Bulk Update Status Modal */}
        {isBulkModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Alterar Status em Massa
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {selectedTicketIds.length} chamados selecionados
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsBulkModalOpen(false)
                    setSelectedBulkStatusId("")
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600 font-bold"
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Selecione o Novo Status
                  </label>
                  <select
                    value={selectedBulkStatusId}
                    onChange={(e) => setSelectedBulkStatusId(e.target.value)}
                    className="w-full h-11 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 cursor-pointer"
                  >
                    <option value="" disabled>Selecione um status...</option>
                    {bulkStatusList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsBulkModalOpen(false)
                    setSelectedBulkStatusId("")
                  }}
                  className="h-10 px-5 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-all cursor-pointer border-2"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={!selectedBulkStatusId || isUpdatingBulk}
                  onClick={handleBulkStatusChange}
                  className="h-10 px-6 text-[10px] font-bold uppercase tracking-widest bg-primary hover:bg-primary-dark text-white rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  {isUpdatingBulk ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gravando...
                    </>
                  ) : (
                    <>
                      Confirmar Alteração
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Cobrança Expressa (Nudge SLA) */}
        {isCobrancaModalOpen && selectedCobrancaTicket && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-200/60">
                    <Zap className="w-5 h-5 fill-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Cobrança Expressa
                    </h3>
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mt-0.5">
                      Chamado #{selectedCobrancaTicket.id} • {selectedCobrancaTicket.cliente_nome}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsCobrancaModalOpen(false)
                    setSelectedCobrancaTicket(null)
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                    <span>Responsável Atual: <strong className="text-slate-900">{selectedCobrancaTicket.user_nome || 'Não atribuído'}</strong></span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    Mensagem de Alerta ao Colaborador
                  </label>
                  <textarea
                    rows={4}
                    value={cobrancaMensagem}
                    onChange={(e) => setCobrancaMensagem(e.target.value)}
                    className="w-full p-3 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800 leading-relaxed resize-none"
                    placeholder="Digite a instrução para o colaborador..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCobrancaModalOpen(false)
                    setSelectedCobrancaTicket(null)
                  }}
                  className="h-10 px-5 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-all cursor-pointer border-2"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={!cobrancaMensagem.trim() || isSendingCobranca}
                  onClick={handleConfirmCobrancaExpressa}
                  className="h-10 px-6 text-[10px] font-bold uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  {isSendingCobranca ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 fill-white" />
                  )}
                  Enviar Cobrança
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Reatribuição / Transbordo do Lead */}
        {isTransbordoModalOpen && selectedTransbordoTicket && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="px-6 py-4 border-b border-indigo-100 flex items-center justify-between bg-indigo-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
                    <UserCheck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Reatribuição
                    </h3>
                    <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mt-0.5">
                      Chamado #{selectedTransbordoTicket.id} • {selectedTransbordoTicket.cliente_nome}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsTransbordoModalOpen(false)
                    setSelectedTransbordoTicket(null)
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Responsável Atual:</span>
                  <span className="font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                    {selectedTransbordoTicket.user_nome || 'Não informado'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    Novo Responsável pelo Lead *
                  </label>
                  <select
                    value={selectedNewUserId}
                    onChange={(e) => setSelectedNewUserId(e.target.value)}
                    className="w-full h-11 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 cursor-pointer"
                  >
                    <option value="" disabled>Selecione o novo colaborador...</option>
                    {allUsersList
                      .filter(u => u.id !== selectedTransbordoTicket.user_id)
                      .filter(u => {
                        const statusUpper = (u.status || 'ATIVO').toUpperCase()
                        const isActive = statusUpper === 'ATIVO' || statusUpper === 'ACTIVE'
                        if (!isActive) return false

                        const f = ((u.funcao || '') + ' ' + (u.role || '')).toLowerCase()
                        const isCorretor = f.includes('corretor') || f.includes('corretagem')
                        const isEstagiario = f.includes('estágio') || f.includes('estagio') || f.includes('estagiario') || f.includes('processo seletivo')
                        const isSupervisor = f.includes('supervis')
                        const isDefault = !u.funcao && !u.role
                        return isCorretor || isEstagiario || isSupervisor || isDefault
                      })
                      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nome} {u.funcao ? `(${u.funcao})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    Motivo da Reatribuição
                  </label>
                  <input
                    type="text"
                    value={transbordoMotivo}
                    onChange={(e) => setTransbordoMotivo(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                    placeholder="Informe o motivo..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsTransbordoModalOpen(false)
                    setSelectedTransbordoTicket(null)
                  }}
                  className="h-10 px-5 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-all cursor-pointer border-2"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={!selectedNewUserId || isSubmittingTransbordo}
                  onClick={handleConfirmTransbordoLead}
                  className="h-10 px-6 text-[10px] font-bold uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  {isSubmittingTransbordo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  Confirmar Reatribuição
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
