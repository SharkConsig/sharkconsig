"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { 
  Search, 
  RefreshCw, 
  Phone, 
  PhoneOff,
  MessageSquareOff,
  Calendar as CalendarIcon, 
  ArrowRight, 
  Clock, 
  AlertCircle, 
  Zap,
  Kanban,
  ShieldAlert, 
  User, 
  DollarSign, 
  Users,
  ChevronRight,
  ChevronDown, 
  Filter, 
  UserCheck, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  MessageCircle, 
  FileText, 
  RotateCcw,
  SlidersHorizontal,
  X,
  Plus,
  Trash2,
  Loader2,
  History,
  Download,
  LayoutGrid,
  List,
  ArrowUpDown,
  Globe
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn, formatShortName } from "@/lib/utils"
import { ClientDetailsModal, type LeadContactInfo } from "@/components/clients/client-details-modal"
import { 
  fetchProximasAcoes, 
  getLocalProximasAcoes,
  ProximaAcaoConfig, 
  calcularVencimentoComSla 
} from "@/lib/kanban-proximas-acoes"

// Definição das Etapas do Kanban Comercial
export type KanbanStage = 
  | "EM ABORDAGEM"
  | "EM RETOMADA"
  | "ENTRADA DO SITE"
  | "EM NEGOCIAÇÃO"
  | "EM REATIVAÇÃO"
  | "SEM INTERESSE"
  | "FECHADO"
  | "PERDIDO"

interface KanbanColumnConfig {
  id: KanbanStage
  title: string
  subtitle: string
  code: string
  color: string
  headerBg: string
  borderTop: string
  badgeClass: string
  bgColumn: string
  borderColumn: string
  cardBorder: string
  descriptionOperador: string
  descriptionGestor: string
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: "EM RETOMADA",
    title: "Em interação ou retomada",
    subtitle: "Réguas de Contato",
    code: "RT1 - RT6",
    color: "amber",
    headerBg: "bg-amber-100 border-amber-300 text-slate-900",
    borderTop: "border-t-amber-500",
    badgeClass: "bg-amber-200 text-amber-900 border-amber-400",
    bgColumn: "bg-amber-100",
    borderColumn: "border-amber-300",
    cardBorder: "border border-slate-200 hover:border-slate-300",
    descriptionOperador: "Executar tentativas planejadas (RT1 a RT6) para quem não respondeu.",
    descriptionGestor: "Disciplina de execução e cumprimento da sequência planejada."
  },
  {
    id: "EM NEGOCIAÇÃO",
    title: "Em negociação",
    subtitle: "Foco em Fechamento",
    code: "NEG",
    color: "indigo",
    headerBg: "bg-indigo-100 border-indigo-300 text-slate-900",
    borderTop: "border-t-indigo-600",
    badgeClass: "bg-indigo-200 text-indigo-900 border-indigo-400",
    bgColumn: "bg-indigo-100",
    borderColumn: "border-indigo-300",
    cardBorder: "border border-slate-200 hover:border-slate-300",
    descriptionOperador: "Trabalhar propostas ativas, simulações, dúvidas e documentos.",
    descriptionGestor: "Pipeline quente, volume potencial e apoio em negócios complexos."
  },
  {
    id: "EM REATIVAÇÃO",
    title: "Em reativação",
    subtitle: "Atenção ao Cliente Esfriado",
    code: "RE1 - RE3",
    color: "purple",
    headerBg: "bg-purple-100 border-purple-300 text-slate-900",
    borderTop: "border-t-purple-600",
    badgeClass: "bg-purple-200 text-purple-900 border-purple-400",
    bgColumn: "bg-purple-100",
    borderColumn: "border-purple-300",
    cardBorder: "border border-slate-200 hover:border-slate-300",
    descriptionOperador: "Clientes há 48h úteis sem resposta: resgate imediato da oportunidade.",
    descriptionGestor: "Monitoramento de gargalos e oportunidades quentes em risco de perda."
  },
  {
    id: "SEM INTERESSE",
    title: "Sem interesse",
    subtitle: "Nutrição e Longo Prazo",
    code: "DDD / SI",
    color: "slate",
    headerBg: "bg-slate-200 border-slate-300 text-slate-900",
    borderTop: "border-t-slate-600",
    badgeClass: "bg-slate-200 text-slate-800 border-slate-400",
    bgColumn: "bg-slate-100",
    borderColumn: "border-slate-300",
    cardBorder: "border border-slate-200 hover:border-slate-300",
    descriptionOperador: "Registrar motivo da recusa e programar abordagem futura permitida.",
    descriptionGestor: "Preservação da base para futuro retrabalho no momento certo."
  },
  {
    id: "FECHADO",
    title: "Fechado",
    subtitle: "Proposta Digitada no Banco",
    code: "GOL",
    color: "emerald",
    headerBg: "bg-emerald-100 border-emerald-300 text-slate-900",
    borderTop: "border-t-emerald-600",
    badgeClass: "bg-emerald-200 text-emerald-900 border-emerald-400",
    bgColumn: "bg-emerald-100",
    borderColumn: "border-emerald-300",
    cardBorder: "border border-slate-200 hover:border-slate-300",
    descriptionOperador: "Documentação anexada e proposta digitada no sistema.",
    descriptionGestor: "Resultado final e faturamento consolidado vs metas da equipe."
  },
  {
    id: "PERDIDO",
    title: "Perdido",
    subtitle: "Finalização por Inviabilidade",
    code: "FIM",
    color: "rose",
    headerBg: "bg-rose-100 border-rose-300 text-slate-900",
    borderTop: "border-t-rose-600",
    badgeClass: "bg-rose-200 text-rose-900 border-rose-400",
    bgColumn: "bg-rose-100",
    borderColumn: "border-rose-300",
    cardBorder: "border border-slate-200 hover:border-slate-300",
    descriptionOperador: "Encerramento por tentativas esgotadas ou inviabilidade do crédito.",
    descriptionGestor: "Taxa de perda, motivos de descarte e qualidade da listagem."
  }
]

interface TicketMetadata {
  kanban_stage?: KanbanStage
  iniciado_no_kanban?: boolean
  origem_kanban?: boolean
  proxima_acao?: string
  vencimento_acao?: string
  alerta_atrasado?: boolean
  acao_especial?: boolean
  acao_especial_motivo?: string
  acao_especial_status?: "pendente" | "aprovado" | "concluido"
  acao_especial_destinatario?: string
  acao_especial_solicitante?: string
  acao_especial_etapa_origem?: string
  acao_especial_atendida?: boolean
  acao_especial_atendido_por?: string
  acao_especial_atendido_em?: string
  conflito_titularidade?: boolean
  conflito_responsavel_nome?: string
  prioridade?: "NORMAL" | "ALTA" | "URGENTE"
  agendamento_data?: string
  agendamento_obs?: string
  historico_kanban?: Array<{
    data: string
    etapa_anterior: string
    etapa_nova: string
    autor: string
    motivo?: string
  }>
  tabulacao_whatsapp?: "NAO_EXISTE_WHATSAPP" | "WHATSAPP_DIVERGENTE" | null
  tabulado_por?: string
  telefones_selecionados?: string[]
  telefone_empresa?: string
  convenio?: string
  selected_operation_type?: string
  enviado_para_corretor?: boolean
  corretor_id?: string
  corretor_nome?: string
  estagiario_id?: string
  estagiario_nome?: string
  observacao_data?: string
  observacoes_historico?: Array<{
    texto: string
    data: string
    autor?: string
  }>
  // Motor de Cadência e Automações (A0, RT1-RT6, RE1-RE3)
  cadencia_tipo?: TipoCadencia
  regua_etapa?: EtapaRegua
  regua_indice?: number
  regua_dias_ciclo?: string
  regua_ultima_execucao?: string
  regua_proximo_vencimento?: string
  regua_pausada?: boolean
  cliente_respondeu?: boolean
}

interface TicketItem {
  id: string
  status: string
  origem: string
  cliente_nome: string
  cliente_cpf: string
  cliente_telefone: string
  cliente_telefone_2?: string
  cliente_telefone_3?: string
  telefones?: string[]
  telefones_selecionados?: string[]
  telefone_empresa?: string
  margem?: number
  margem_liquida_5?: number
  margem_beneficio_5?: number
  valor_operacao?: number
  convenio?: string
  equipe?: string
  descricao?: string
  user_id: string
  user_nome?: string
  user_avatar?: string
  created_at: string
  updated_at: string
  status_id?: string
  source_table?: "kanban_fichas" | "chamados"
  historico_movimentacoes?: Array<{
    data: string
    etapa_anterior?: string
    etapa_nova?: string
    autor?: string
    motivo?: string
  }>
  proposta_info?: {
    ade?: string
    data_digitacao?: string
    status?: string
  }
}

interface UserSummary {
  id: string
  nome: string
  funcao?: string
  role?: string
  equipe?: string
  avatar_url?: string
  status?: string
  regime_contratacao?: string
}

// Auxiliar para ler e gravar metadados dentro de ticket.descricao
function parseMetadata(desc: string = ""): TicketMetadata {
  try {
    const match = desc.match(/<!-- TICKET_METADATA: ([\s\S]*?) -->/)
    if (match && match[1]) {
      return JSON.parse(match[1])
    }
  } catch (e) {
    console.error("Erro ao parsear metadata:", e)
  }
  return {}
}

function stringifyWithMetadata(desc: string = "", meta: TicketMetadata): string {
  const cleaned = desc.replace(/<!-- TICKET_METADATA: ([\s\S]*?) -->/g, "").trim()
  return `${cleaned}\n\n<!-- TICKET_METADATA: ${JSON.stringify(meta)} -->`
}

const formatValorBrl = (val: any): string => {
  if (val === null || val === undefined || val === "") return "R$ 0,00"
  if (typeof val === "string" && val.trim().startsWith("R$")) return val.trim()
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.,-]/g, "").replace(",", "."))
  if (isNaN(num)) return "R$ 0,00"
  return "R$ " + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const parseValorToNumber = (valStr: string) => {
  if (!valStr) return 0
  const clean = valStr.replace("R$", "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

// Regra idêntica à lista de chamados da área 'CHAMADOS' para cálculo e exibição do Valor da Operação
const getValorOperacaoDeAbertura = (ticket: any) => {
  if (!ticket) return { valor: "R$ 0,00", label: "Valor Operação", color: "text-slate-400" }
  const desc = ticket.descricao || ticket.description || ticket.content || ""
  const meta = parseMetadata(desc)
  const conv = (ticket.convenio || meta.convenio || "")?.toUpperCase()
  const isSantoAndre = conv.includes("SANTO ANDRÉ") || conv.includes("SANTO ANDRE")

  // Extrai valor explícito da descrição caso presente (ex: "com valor de operação R$ 10.547,17.")
  const descValMatch = desc.match(/com\s+valor\s+de\s+operaç[aã]o\s+([^\.,\s]+[\d\.,]+)/i) || desc.match(/valor\s+(?:da|de)\s+operaç[aã]o[:\s]+(R\$\s*[\d\.,]+)/i)
  const explicitDescValor = descValMatch ? (descValMatch[1].startsWith("R$") ? descValMatch[1].trim() : "R$ " + descValMatch[1].trim()) : null

  // 1. Tipo selecionado nos metadados
  const selectedType = meta?.selected_operation_type
  if (selectedType) {
    if (selectedType === 'margem') {
      const rawVal = (meta.valor_operacao_margem && meta.valor_operacao_margem !== "R$ 0,00") 
        ? meta.valor_operacao_margem 
        : (meta.valor_operacao || ticket.valor_operacao || explicitDescValor || "R$ 0,00")
      const val = formatValorBrl(rawVal)
      return { valor: val, label: isSantoAndre ? "M. Líq Empréstimo" : "Margem 35%", color: "text-amber-600" }
    }
    if (selectedType === 'liquida5') {
      const rawVal = (meta.valor_operacao_liquida5 && meta.valor_operacao_liquida5 !== "R$ 0,00") 
        ? meta.valor_operacao_liquida5 
        : (meta.valor_operacao || ticket.valor_operacao || explicitDescValor || "R$ 0,00")
      const val = formatValorBrl(rawVal)
      return { valor: val, label: isSantoAndre ? "M. Líquida Cartão" : "Líquida 5%", color: "text-emerald-600" }
    }
    if (selectedType === 'beneficio5') {
      const rawVal = (meta.valor_operacao_beneficio5 && meta.valor_operacao_beneficio5 !== "R$ 0,00") 
        ? meta.valor_operacao_beneficio5 
        : (meta.valor_operacao || ticket.valor_operacao || explicitDescValor || "R$ 0,00")
      const val = formatValorBrl(rawVal)
      return { valor: val, label: isSantoAndre ? "Margem Benefício" : "Benefício 5%", color: "text-blue-600" }
    }
  }

  // 2. Coluna valor_operacao no banco ou metadados
  if (meta?.valor_operacao && Number(meta.valor_operacao) > 0) {
    const valStr = formatValorBrl(meta.valor_operacao)
    return { valor: valStr, label: "Valor Operação", color: "text-slate-900" }
  }

  if (ticket.valor_operacao !== null && ticket.valor_operacao !== undefined && Number(ticket.valor_operacao) > 0) {
    const valStr = "R$ " + Number(ticket.valor_operacao).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const descNorm = desc ? desc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : ""
    if (descNorm.includes("BENEFICIO")) {
      return { valor: valStr, label: isSantoAndre ? "Margem Benefício" : "Benefício 5%", color: "text-blue-600" }
    } else if (descNorm.includes("LIQUIDA") || descNorm.includes("CARTAO")) {
      return { valor: valStr, label: isSantoAndre ? "M. Líquida Cartão" : "Líquida 5%", color: "text-emerald-600" }
    } else if (descNorm.includes("MARGEM") || descNorm.includes("EMPRESTIMO") || descNorm.includes("CONSIGNACOES")) {
      return { valor: valStr, label: isSantoAndre ? "M. Líq Empréstimo" : "Margem 35%", color: "text-amber-600" }
    }
    return { valor: valStr, label: "Valor Operação", color: "text-slate-900" }
  }

  // 3. Inferência pelo texto da descrição (insensível a maiúsculas/minúsculas e acentuação)
  const descNorm = desc ? desc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : ""
  let textSelectedType: 'margem' | 'liquida5' | 'beneficio5' | null = null

  // PRIORIDADE 1: BENEFÍCIO (qualquer menção a benefício é benefício 5%, incluindo "LÍQUIDA CARTÃO BENEFÍCIO")
  if (
    descNorm.includes("BENEFICIO") || 
    descNorm.includes("CARTAO BENEFICIO") || 
    descNorm.includes("MARGEM BENEFICIO") ||
    descNorm.includes("PARA A MARGEM BENEFICIO") ||
    descNorm.includes("PARA O BENEFICIO")
  ) {
    textSelectedType = 'beneficio5'
  } 
  // PRIORIDADE 2: LÍQUIDA 5% (Cartão Crédito / Margem Líquida Cartão)
  else if (
    descNorm.includes("LIQUIDA 5%") || 
    descNorm.includes("MARGEM LIQUIDA CARTAO") || 
    descNorm.includes("LIQUIDA CARTAO CREDITO") ||
    descNorm.includes("LIQUIDA CARTAO") ||
    descNorm.includes("MARGEM CARTAO") ||
    descNorm.includes("CARTAO CREDITO") ||
    descNorm.includes("PARA A LIQUIDA") ||
    descNorm.includes("PARA A MARGEM LIQUIDA")
  ) {
    textSelectedType = 'liquida5'
  } 
  // PRIORIDADE 3: MARGEM 35% / EMPRÉSTIMO
  else if (
    descNorm.includes("MARGEM 35%") || 
    descNorm.includes("MARGEM LIQUIDA EMPRESTIMO") || 
    descNorm.includes("LIQUIDA CONSIGNACOES") ||
    descNorm.includes("LIQ EMPRESTIMO") ||
    descNorm.includes("DISPONIVEL EMPRESTIMO") ||
    descNorm.includes("MARGEM EMPRESTIMO") ||
    descNorm.includes("PARA A MARGEM 35%") ||
    descNorm.includes("PARA A MARGEM EMPRESTIMO")
  ) {
    textSelectedType = 'margem'
  }

  // Se não foi identificado pelo texto, verifica valores nos metadados protegendo contra margem 35% negativa
  if (!textSelectedType && meta) {
    const valMargemNum = parseValorToNumber(meta.margem)
    const valLiqNum = parseValorToNumber(meta.liquida5)
    const valBenNum = parseValorToNumber(meta.beneficio5)

    if (valMargemNum <= 0 && valBenNum > 0) {
      textSelectedType = 'beneficio5'
    } else if (valMargemNum <= 0 && valLiqNum > 0) {
      textSelectedType = 'liquida5'
    } else if (valBenNum > 0) {
      textSelectedType = 'beneficio5'
    } else if (valLiqNum > 0) {
      textSelectedType = 'liquida5'
    } else if (valMargemNum > 0) {
      textSelectedType = 'margem'
    }
  }

  if (textSelectedType) {
    if (textSelectedType === 'beneficio5') {
      if (meta && meta.valor_operacao_beneficio5 && meta.valor_operacao_beneficio5 !== "R$ 0,00") {
        return { valor: formatValorBrl(meta.valor_operacao_beneficio5), label: isSantoAndre ? "Margem Benefício" : "Benefício 5%", color: "text-blue-600" }
      }
      if (explicitDescValor) {
        return { valor: explicitDescValor, label: isSantoAndre ? "Margem Benefício" : "Benefício 5%", color: "text-blue-600" }
      }
      const mVal = ticket.margem_beneficio_5 || (meta ? parseValorToNumber(meta.beneficio5) : 0) || 0
      if (mVal > 0) {
        const opVal = mVal / 0.053
        return { 
          valor: "R$ " + opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
          label: isSantoAndre ? "Margem Benefício" : "Benefício 5%", 
          color: "text-blue-600" 
        }
      }
    }
    if (textSelectedType === 'liquida5') {
      if (meta && meta.valor_operacao_liquida5 && meta.valor_operacao_liquida5 !== "R$ 0,00") {
        return { valor: formatValorBrl(meta.valor_operacao_liquida5), label: isSantoAndre ? "M. Líquida Cartão" : "Líquida 5%", color: "text-emerald-600" }
      }
      if (explicitDescValor) {
        return { valor: explicitDescValor, label: isSantoAndre ? "M. Líquida Cartão" : "Líquida 5%", color: "text-emerald-600" }
      }
      const mVal = ticket.margem_liquida_5 || (meta ? parseValorToNumber(meta.liquida5) : 0) || 0
      if (mVal > 0) {
        const opVal = mVal / 0.053
        return { 
          valor: "R$ " + opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
          label: isSantoAndre ? "M. Líquida Cartão" : "Líquida 5%", 
          color: "text-emerald-600" 
        }
      }
    }
    if (textSelectedType === 'margem') {
      if (meta && meta.valor_operacao_margem && meta.valor_operacao_margem !== "R$ 0,00") {
        return { valor: formatValorBrl(meta.valor_operacao_margem), label: isSantoAndre ? "M. Líq Empréstimo" : "Margem 35%", color: "text-amber-600" }
      }
      if (explicitDescValor) {
        return { valor: explicitDescValor, label: isSantoAndre ? "M. Líq Empréstimo" : "Margem 35%", color: "text-amber-600" }
      }
      const mVal = ticket.margem || (meta ? parseValorToNumber(meta.margem) : 0) || 0
      if (mVal > 0) {
        const opVal = mVal / 0.028
        return { 
          valor: "R$ " + opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
          label: isSantoAndre ? "M. Líq Empréstimo" : "Margem 35%", 
          color: "text-amber-600" 
        }
      }
    }
  }

  // 4. Campos dos metadados sem seleção explícita
  if (meta) {
    if (meta.beneficio5 && meta.beneficio5 !== "" && meta.beneficio5 !== "R$ 0,00") {
      return { valor: formatValorBrl(meta.valor_operacao_beneficio5) || (explicitDescValor || "R$ 0,00"), label: isSantoAndre ? "Margem Benefício" : "Benefício 5%", color: "text-blue-600" }
    }
    if (meta.liquida5 && meta.liquida5 !== "" && meta.liquida5 !== "R$ 0,00") {
      return { valor: formatValorBrl(meta.valor_operacao_liquida5) || (explicitDescValor || "R$ 0,00"), label: isSantoAndre ? "M. Líquida Cartão" : "Líquida 5%", color: "text-emerald-600" }
    }
    if (meta.margem && meta.margem !== "" && meta.margem !== "R$ 0,00") {
      return { valor: formatValorBrl(meta.valor_operacao_margem) || (explicitDescValor || "R$ 0,00"), label: isSantoAndre ? "M. Líq Empréstimo" : "Margem 35%", color: "text-amber-600" }
    }
  }

  // 5. Fallback com valor extraído da descrição, se houver
  if (explicitDescValor) {
    return { valor: explicitDescValor, label: "Valor Operação", color: "text-slate-900" }
  }

  // 6. Fallback das margens da base de dados
  if (typeof ticket.margem_beneficio_5 === 'number' && ticket.margem_beneficio_5 > 0) {
    const opVal = ticket.margem_beneficio_5 / 0.053
    return { 
      valor: "R$ " + opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
      label: isSantoAndre ? "Margem Benefício" : "Benefício 5%", 
      color: "text-blue-600" 
    }
  }
  if (typeof ticket.margem_liquida_5 === 'number' && ticket.margem_liquida_5 > 0) {
    const opVal = ticket.margem_liquida_5 / 0.053
    return { 
      valor: "R$ " + opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
      label: isSantoAndre ? "M. Líquida Cartão" : "Líquida 5%", 
      color: "text-emerald-600" 
    }
  }
  if (typeof ticket.margem === 'number' && ticket.margem > 0) {
    const opVal = ticket.margem / 0.028
    return { 
      valor: "R$ " + opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
      label: isSantoAndre ? "M. Líq Empréstimo" : "Margem 35%", 
      color: "text-amber-600" 
    }
  }

  return { valor: "R$ 0,00", label: "Valor Operação", color: "text-slate-400" }
}

// ==========================================
// MOTOR DE CADÊNCIA COMERCIAL (A0, RT1-RT6, RE1-RE3)
// ==========================================
export type TipoCadencia = "PADRAO" | "AMPLIADA"
export type EtapaRegua = "A0" | "RT1" | "RT2" | "RT3" | "RT4" | "RT5" | "RT6" | "RE1" | "RE2" | "RE3" | "ESPERA_FINAL" | "ENCERRADO"

// Adiciona dias úteis excluindo sábado e domingo
function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++
    }
  }
  return result
}

function formatEtapaLabel(etapa: string | null | undefined): string {
  if (!etapa) return ""
  return etapa
    .replace(/^RT([1-6])/i, "Retomada $1")
    .replace(/^RE([1-3])/i, "Reativação $1")
}

function formatSeloCadencia(cadState: { etapaRegua: string; isPausado?: boolean; isEsperaFinal?: boolean; tipo?: string }): string {
  if (cadState.isPausado) return "PAUSADO"
  if (cadState.isEsperaFinal) return "ESPERA 1,5d"
  const etapa = cadState.etapaRegua || ""
  if (/^RT[1-6]/i.test(etapa)) {
    return etapa.replace(/^RT([1-6])/i, "Retomada $1")
  }
  if (/^RE[1-3]/i.test(etapa)) {
    return etapa.replace(/^RE([1-3])/i, "Reativação $1")
  }
  return formatEtapaLabel(etapa) || etapa
}

function formatMarcoLabel(marco: string | null | undefined): string {
  if (!marco) return ""
  return marco.replace(/\bD([1-9][0-9]?)\b/g, "Dia $1")
}

function formatObservacaoTexto(texto: string): string {
  if (!texto) return ""
  return texto
    .replace(/⚡\s*SOLICITAÇÃO DE AÇÃO ESPECIAL\s*\[([^\]]+)\]:/gi, "⚡ SOLICITAÇÃO DE AÇÃO ESPECIAL para $1:")
    .replace(/📲\s*\[MOTOR DE CADÊNCIA\]:\s*RT([1-6])/gi, "📲 Retomada $1")
    .replace(/📲\s*\[MOTOR DE CADÊNCIA\]:\s*RE([1-3])/gi, "📲 Recuperação $1")
    .replace(/\[MOTOR DE CADÊNCIA\]:\s*/gi, "")
    .replace(/Enviar Régua de Retomada\s*([1-6])\s*\(RT\1\)\s*via WhatsApp/gi, "Executar Retomada $1 via WhatsApp")
    .replace(/Enviar Régua de Retomada\s*([1-6])\s*via WhatsApp/gi, "Executar Retomada $1 via WhatsApp")
    .replace(/Enviar Régua de Retomada\s*([1-6])/gi, "Executar Retomada $1")
    .replace(/Enviar Segunda Recuperação\s*\(RE2\)\s*via WhatsApp/gi, "Executar Recuperação 2 via WhatsApp")
    .replace(/Enviar Terceira Recuperação\s*\(RE3\)\s*via WhatsApp/gi, "Executar Recuperação 3 via WhatsApp")
}

// Determina se a cadência é PADRÃO (3 RTs) ou AMPLIADA (6 RTs)
function getCadenceType(ticket: TicketItem, meta?: TicketMetadata): TipoCadencia {
  if (meta?.cadencia_tipo) return meta.cadencia_tipo
  const opData = getValorOperacaoDeAbertura(ticket)
  const opValorNum = parseValorToNumber(opData.valor)
  const valorTotal = opValorNum > 0 ? opValorNum : Number(ticket.valor_operacao || ticket.margem || 0)
  const conv = (ticket.convenio || meta?.convenio || opData.tipo || "").toLowerCase()

  const isCartao = conv.includes("cartao") || conv.includes("cartão") || conv.includes("rmc") || conv.includes("rcc")
  if (isCartao && valorTotal > 20000) return "AMPLIADA"

  const isFacultativa = conv.includes("facultativ")
  if (isFacultativa && valorTotal > 50000) return "AMPLIADA"

  if (valorTotal > 50000) return "AMPLIADA"
  return "PADRAO"
}

// Obtém o estado atual da régua do lead
function getLeadCadenceState(ticket: TicketItem, meta: TicketMetadata): {
  tipo: TipoCadencia
  etapaRegua: EtapaRegua
  proximaEtapa: EtapaRegua | null
  diasCiclo: string
  proximoVencimento: Date | null
  isUltima: boolean
  isEsperaFinal: boolean
  isPausado: boolean
} {
  const tipo = getCadenceType(ticket, meta)
  const isPausado = Boolean(meta.regua_pausada || meta.cliente_respondeu)

  let etapa = meta.regua_etapa
  if (!etapa) {
    if (ticket.status === "EM REATIVAÇÃO") {
      etapa = "RE1"
    } else {
      etapa = "RT1"
    }
  }

  let proximaEtapa: EtapaRegua | null = null
  let diasCiclo = "D1"
  let isUltima = false
  const isEsperaFinal = etapa === "ESPERA_FINAL"

  if (ticket.status === "EM REATIVAÇÃO" || etapa.startsWith("RE")) {
    if (etapa === "RE1") {
      proximaEtapa = "RE2"
      diasCiclo = "D1"
    } else if (etapa === "RE2") {
      proximaEtapa = "RE3"
      diasCiclo = "D3"
    } else if (etapa === "RE3") {
      proximaEtapa = "ESPERA_FINAL"
      diasCiclo = "D5 (Avaliação D8)"
      isUltima = true
    } else {
      proximaEtapa = null
      diasCiclo = "D8"
    }
  } else {
    // Retomada
    if (tipo === "PADRAO") {
      if (etapa === "RT1") {
        proximaEtapa = "RT2"
        diasCiclo = "D1"
      } else if (etapa === "RT2") {
        proximaEtapa = "RT3"
        diasCiclo = "D2"
      } else if (etapa === "RT3") {
        proximaEtapa = "ESPERA_FINAL"
        diasCiclo = "D3"
        isUltima = true
      } else {
        proximaEtapa = null
        diasCiclo = "Pós RT3 (1,5 dia útil)"
      }
    } else {
      // AMPLIADA (6 RTs)
      if (etapa === "RT1") {
        proximaEtapa = "RT2"
        diasCiclo = "D1"
      } else if (etapa === "RT2") {
        proximaEtapa = "RT3"
        diasCiclo = "D2 (manhã)"
      } else if (etapa === "RT3") {
        proximaEtapa = "RT4"
        diasCiclo = "D2 (tarde ≥3h)"
      } else if (etapa === "RT4") {
        proximaEtapa = "RT5"
        diasCiclo = "D3"
      } else if (etapa === "RT5") {
        proximaEtapa = "RT6"
        diasCiclo = "D6"
      } else if (etapa === "RT6") {
        proximaEtapa = "ESPERA_FINAL"
        diasCiclo = "D10"
        isUltima = true
      } else {
        proximaEtapa = null
        diasCiclo = "Pós RT6 (1,5 dia útil)"
      }
    }
  }

  let proximoVencimento: Date | null = null
  const dateStr = meta.regua_proximo_vencimento || meta.vencimento_acao || meta.agendamento_data
  if (dateStr) {
    const p = new Date(dateStr)
    if (!isNaN(p.getTime())) proximoVencimento = p
  }

  return {
    tipo,
    etapaRegua: etapa,
    proximaEtapa,
    diasCiclo,
    proximoVencimento,
    isUltima,
    isEsperaFinal,
    isPausado
  }
}

// Calcula o próximo vencimento e ação conforme agenda da especificação
function calculateNextCadenceDue(
  currentStage: EtapaRegua,
  tipo: TipoCadencia,
  baseDate: Date = new Date()
): { nextStage: EtapaRegua; dueDate: Date; actionText: string } {
  const now = new Date(baseDate)

  if (currentStage === "RT1") {
    const d2 = addBusinessDays(now, 1)
    d2.setHours(10, 0, 0, 0)
    return {
      nextStage: "RT2",
      dueDate: d2,
      actionText: "Executar Retomada 2 via WhatsApp"
    }
  } else if (currentStage === "RT2") {
    if (tipo === "AMPLIADA") {
      const d2tarde = new Date(now)
      d2tarde.setHours(d2tarde.getHours() + 3)
      if (d2tarde.getHours() >= 18) {
        const nextDay = addBusinessDays(now, 1)
        nextDay.setHours(10, 0, 0, 0)
        return {
          nextStage: "RT3",
          dueDate: nextDay,
          actionText: "Executar Retomada 3 via WhatsApp"
        }
      }
      return {
        nextStage: "RT3",
        dueDate: d2tarde,
        actionText: "Executar Retomada 3 via WhatsApp (tarde D2)"
      }
    } else {
      const d3 = addBusinessDays(now, 1)
      d3.setHours(11, 0, 0, 0)
      return {
        nextStage: "RT3",
        dueDate: d3,
        actionText: "Executar Retomada 3 via WhatsApp"
      }
    }
  } else if (currentStage === "RT3") {
    if (tipo === "AMPLIADA") {
      const d3 = addBusinessDays(now, 1)
      d3.setHours(11, 0, 0, 0)
      return {
        nextStage: "RT4",
        dueDate: d3,
        actionText: "Executar Retomada 4 via WhatsApp"
      }
    } else {
      const waitDate = addBusinessDays(now, 2)
      waitDate.setHours(14, 0, 0, 0)
      return {
        nextStage: "ESPERA_FINAL",
        dueDate: waitDate,
        actionText: "Aguardar retorno pós-RT3 (1,5 dia útil antes de encerrar)"
      }
    }
  } else if (currentStage === "RT4") {
    const d6 = addBusinessDays(now, 3)
    d6.setHours(14, 0, 0, 0)
    return {
      nextStage: "RT5",
      dueDate: d6,
      actionText: "Executar Retomada 5 via WhatsApp"
    }
  } else if (currentStage === "RT5") {
    const d10 = addBusinessDays(now, 4)
    d10.setHours(14, 0, 0, 0)
    return {
      nextStage: "RT6",
      dueDate: d10,
      actionText: "Executar Retomada 6 via WhatsApp"
    }
  } else if (currentStage === "RT6") {
    const waitDate = addBusinessDays(now, 2)
    waitDate.setHours(14, 0, 0, 0)
    return {
      nextStage: "ESPERA_FINAL",
      dueDate: waitDate,
      actionText: "Aguardar retorno pós-RT6 (1,5 dia útil antes de encerrar)"
    }
  } else if (currentStage === "RE1") {
    const d3 = addBusinessDays(now, 2)
    d3.setHours(11, 0, 0, 0)
    return {
      nextStage: "RE2",
      dueDate: d3,
      actionText: "Executar Reativação 2 via WhatsApp"
    }
  } else if (currentStage === "RE2") {
    const d5 = addBusinessDays(now, 2)
    d5.setHours(14, 0, 0, 0)
    return {
      nextStage: "RE3",
      dueDate: d5,
      actionText: "Executar Reativação 3 via WhatsApp"
    }
  } else if (currentStage === "RE3") {
    const d8 = addBusinessDays(now, 3)
    d8.setHours(17, 0, 0, 0)
    return {
      nextStage: "ESPERA_FINAL",
      dueDate: d8,
      actionText: "Avaliação final de Reativação D8 (Supervisão / Encerramento)"
    }
  } else {
    const defaultNext = addBusinessDays(now, 1)
    defaultNext.setHours(14, 0, 0, 0)
    return {
      nextStage: "RT1",
      dueDate: defaultNext,
      actionText: "Executar próxima ação de contato"
    }
  }
}

// Mapeia o chamado para a etapa do Kanban
function isUserObservation(text?: string | null): boolean {
  if (!text || typeof text !== "string") return false
  const trimmed = text.trim()
  if (!trimmed) return false
  const lower = trimmed.toLowerCase()
  if (lower === "sem interação" || lower === "sem interacao") return false
  if (lower === "sem interesse") return false
  if (lower.startsWith("atendimento iniciado via modal")) return false
  if (lower.startsWith("lead arquivado na gaveta")) return false
  if (lower.startsWith("registro de fluxo")) return false
  return true
}

// Verifica se a proposta bancária pertence especificamente ao mesmo usuário/operador do cartão do atendimento
function matchesProposalUser(p: any, t: TicketItem): boolean {
  if (!p || !t) return false

  // Se o id_lead coincidir diretamente com o ID da ficha/chamado
  if (p.id_lead && String(p.id_lead).trim() === String(t.id).trim()) {
    return true
  }

  const meta = parseMetadata(t.descricao)

  // IDs associados ao cartão do atendimento
  const cardUserIds = [
    t.user_id,
    (t as any).operador_id,
    meta.operador_id,
    meta.corretor_id,
    meta.user_id
  ].map(id => String(id || "").trim().toLowerCase()).filter(Boolean)

  // Nomes associados ao cartão do atendimento
  const cardUserNames = [
    t.user_nome,
    (t as any).operador_nome,
    (t as any).responsavel_nome,
    meta.operador_nome,
    meta.corretor_nome,
    meta.user_nome
  ].map(name => String(name || "").trim().toLowerCase()).filter(Boolean)

  // IDs associados à proposta
  const propUserIds = [
    p.corretor_id,
    p.estagiario_colaborador_id,
    p.user_id
  ].map(id => String(id || "").trim().toLowerCase()).filter(Boolean)

  // Nomes associados à proposta
  const propUserNames = [
    p.nome_corretor,
    p.corretor,
    p.estagiario_colaborador_nome
  ].map(name => String(name || "").trim().toLowerCase()).filter(Boolean)

  // 1. Verificação por ID do operador
  const matchId = propUserIds.some(pId => cardUserIds.includes(pId))
  if (matchId) return true

  // 2. Verificação por Nome do operador
  const matchName = propUserNames.some(pName => 
    cardUserNames.some(cName => cName === pName || cName.includes(pName) || pName.includes(cName))
  )
  if (matchName) return true

  return false
}

function inferKanbanStage(
  ticket: TicketItem, 
  meta: TicketMetadata,
  propInfo?: { ade?: string; data_digitacao?: string; status?: string }
): KanbanStage {
  const prop = propInfo || ticket.proposta_info
  const pStatus = (prop?.status || "").toUpperCase().trim()
  const hasDigitacao = Boolean(
    (prop?.ade && prop.ade.trim()) && 
    (prop?.data_digitacao && prop.data_digitacao.trim())
  )

  // 1. Proposta digitada no banco deste operador que foi cancelada no banco vai automaticamente para PERDIDO
  if (hasDigitacao && (pStatus === "CANCELADO" || pStatus === "CANCELADOS" || pStatus.includes("CANCELAD"))) {
    return "PERDIDO"
  }

  // 2. Proposta digitada no banco deste operador (com ADE e DATA DE DIGITAÇÃO) entra na coluna FECHADO
  if (hasDigitacao) {
    return "FECHADO"
  }

  // 3. Cadência esgotada (RTs e REs) entra na coluna PERDIDO
  const isCadenciaEsgotada = Boolean(
    meta.regua_etapa === "ENCERRADO" ||
    meta.proxima_acao?.toLowerCase().includes("esgotad") ||
    (ticket as any).motivo_perda?.toLowerCase().includes("esgotad") ||
    (ticket.descricao || "").toLowerCase().includes("cadência de retomada esgotada") ||
    (ticket.descricao || "").toLowerCase().includes("cadencia de retomada esgotada")
  )
  if (isCadenciaEsgotada) {
    return "PERDIDO"
  }

  if (meta.kanban_stage) {
    if (meta.kanban_stage === "EM ABORDAGEM") return "EM RETOMADA"
    return meta.kanban_stage
  }
  const s = (ticket.status || "").toUpperCase()
  const orig = ((ticket as any).origem || "").toUpperCase()
  const tipo = (ticket.tipo_solicitacao || "").toUpperCase()
  if (s === "ENTRADA DO SITE" || orig.includes("SITE") || tipo.includes("SITE") || (ticket.descricao && ticket.descricao.includes("Origem: Site Institucional"))) {
    return "ENTRADA DO SITE"
  }
  if (s === "FECHADO" || s.includes("PROPOSTA CADASTRADA")) return "FECHADO"
  if (s.includes("NÃO APROVADO") || s.includes("CANCELADO") || s.includes("NÃO É O CLIENTE") || s.includes("IMPOSSIBILITADO")) return "PERDIDO"
  if (s.includes("SEM INTERESSE")) return "SEM INTERESSE"
  if (s.includes("AÇÃO SUPERVISOR") || s.includes("SUPORTE") || s.includes("REATIVA")) return "EM REATIVAÇÃO"
  if (s.includes("PROPOSTA") || s.includes("NEGOCIA") || s.includes("APROVAD") || s.includes("PENDENTE DOCUMENTAÇÃO") || s.includes("AGUARDANDO OPERACIONAL")) return "EM NEGOCIAÇÃO"
  if (s.includes("RETOMADA") || s.includes("SEM INTERAÇÃO") || s.includes("REENVIO") || s.includes("FUTURO") || s.includes("ABORDAGEM")) return "EM RETOMADA"
  return "EM RETOMADA"
}

// Determina a etiqueta superior de status para os cartões nas etapas FECHADO e PERDIDO (com primeira letra maiúscula e restantes minúsculas)
function getCardTopBadge(
  ticket: TicketItem, 
  stage: string, 
  propInfo?: { ade?: string; data_digitacao?: string; status?: string }
): {
  label: string
  sub?: string
  bgClass: string
  borderClass: string
  textClass: string
  icon: React.ReactNode
} | null {
  const meta = parseMetadata(ticket.descricao)
  const prop = propInfo || ticket.proposta_info
  const pStatus = (prop?.status || "").toUpperCase().trim()

  const isPropostaCancelada = Boolean(
    pStatus === "CANCELADO" || 
    pStatus === "CANCELADOS" || 
    pStatus.includes("CANCELAD") ||
    ticket.status === "CANCELADO" ||
    (ticket as any).motivo_perda?.toLowerCase().includes("cancelad")
  )

  const isCadenciaEsgotada = Boolean(
    meta.regua_etapa === "ENCERRADO" ||
    meta.proxima_acao?.toLowerCase().includes("esgotad") ||
    (ticket as any).motivo_perda?.toLowerCase().includes("esgotad") ||
    (ticket.descricao || "").toLowerCase().includes("cadência de retomada esgotada") ||
    (ticket.descricao || "").toLowerCase().includes("cadencia de retomada esgotada")
  )

  if (stage === "FECHADO") {
    const isPago = Boolean(
      pStatus.includes("PAGO") || 
      pStatus.includes("PÓS-VENDA") || 
      pStatus.includes("POS-VENDA") ||
      meta.proposta_status?.toUpperCase().includes("PAGO")
    )

    if (isPago) {
      return {
        label: "Pago ao cliente",
        sub: prop?.ade ? `ADE: ${prop.ade}` : undefined,
        bgClass: "bg-emerald-100/90",
        borderClass: "border-emerald-300",
        textClass: "text-emerald-900",
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
      }
    }

    return {
      label: "Proposta em andamento",
      sub: prop?.ade ? `ADE: ${prop.ade}` : undefined,
      bgClass: "bg-amber-100/90",
      borderClass: "border-amber-300",
      textClass: "text-amber-950",
      icon: <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
    }
  }

  if (stage === "PERDIDO") {
    if (isPropostaCancelada) {
      return {
        label: "Proposta cancelada",
        sub: prop?.ade ? `ADE: ${prop.ade}` : undefined,
        bgClass: "bg-rose-100/90",
        borderClass: "border-rose-300",
        textClass: "text-rose-950",
        icon: <XCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
      }
    }

    if (isCadenciaEsgotada) {
      return {
        label: "Cadência esgotada",
        sub: undefined,
        bgClass: "bg-rose-100/90",
        borderClass: "border-rose-300",
        textClass: "text-rose-950",
        icon: <AlertCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
      }
    }
  }

  return null
}

// Formatação do CPF mascarado: ***.123.456-**
function maskCpf(cpf: string = ""): string {
  const clean = cpf.replace(/\D/g, "")
  if (clean.length === 11) {
    return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`
  }
  return cpf || "Não informado"
}

// Validação de formato matemático de CPF (evita confundir celular de 11 dígitos com CPF)
function isValidCPF(cpf: string = ""): boolean {
  const clean = cpf.replace(/\D/g, "")
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false
  let sum = 0
  let rest = 0
  for (let i = 1; i <= 9; i++) sum += parseInt(clean.substring(i - 1, i)) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  if (rest !== parseInt(clean.substring(9, 10))) return false
  sum = 0
  for (let i = 1; i <= 10; i++) sum += parseInt(clean.substring(i - 1, i)) * (12 - i)
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  return rest === parseInt(clean.substring(10, 11))
}

// Formatação do Telefone: (11) 9****-1234
function maskPhone(phone: string = ""): string {
  const clean = phone.replace(/\D/g, "")
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) 9****-${clean.slice(7)}`
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ****-${clean.slice(6)}`
  }
  return phone || "Não informado"
}

// Formatação do Telefone completo desmascarado
function formatPhone(phone: string = ""): string {
  const clean = phone.replace(/\D/g, "")
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
  }
  return phone || "Não informado"
}

// Normalização e formatação do convênio de origem do lead
function formatConvenioOrigem(raw: string = ""): string {
  if (!raw) return "Não informado"
  const upper = raw.toUpperCase().trim()
  if (upper.includes("SIAPE")) return "SIAPE"
  if (upper.includes("GOVERNO_SP") || upper.includes("GOVERNO SP") || (upper.includes("GOVERNO") && (upper.includes("SÃO PAULO") || upper.includes("SAO PAULO")))) return "Governo São Paulo"
  if (upper.includes("PREFEITURA_SP") || upper.includes("PREFEITURA SP") || (upper.includes("PREFEITURA") && (upper.includes("SÃO PAULO") || upper.includes("SAO PAULO")))) return "Prefeitura de São Paulo"
  if (upper.includes("GOVERNO_MG") || upper.includes("MINAS GERAIS")) return "Governo Minas Gerais"
  if (upper.includes("GOVERNO_RJ") || upper.includes("RIO DE JANEIRO")) return "Governo Rio de Janeiro"
  if (upper.includes("GOVERNO_BA") || upper.includes("BAHIA")) return "Governo Bahia"
  if (upper.includes("GOVERNO_AM") || upper.includes("AMAZONAS")) return "Governo Amazonas"
  if (upper.includes("GOVERNO_CE") || upper.includes("CEARÁ") || upper.includes("CEARA")) return "Governo Ceará"
  if (upper.includes("GOVERNO_RO") || upper.includes("RONDÔNIA") || upper.includes("RONDONIA")) return "Governo Rondônia"
  if (upper.includes("GOVERNO_PI") || upper.includes("PIAUÍ") || upper.includes("PIAUI")) return "Governo Piauí"
  if (upper.includes("GOVERNO_MA") || upper.includes("MARANHÃO") || upper.includes("MARANHAO")) return "Governo Maranhão"
  if (upper.includes("GOVERNO_RR") || upper.includes("RORAIMA")) return "Governo Roraima"
  if (upper.includes("GOVERNO_MS") || upper.includes("MATO GROSSO DO SUL")) return "Governo Mato Grosso do Sul"
  if (upper.includes("PREFEITURA_SANTO_ANDRE") || upper.includes("SANTO ANDRÉ") || upper.includes("SANTO ANDRE")) return "Prefeitura Santo André"
  if (upper.includes("PREFEITURA_CONTAGEM") || upper.includes("CONTAGEM")) return "Prefeitura Contagem"
  if (upper.includes("PREFEITURA_NATAL") || upper.includes("NATAL")) return "Prefeitura de Natal"
  if (upper.includes("PREFEITURA_PORTO_VELHO") || upper.includes("PORTO VELHO")) return "Prefeitura de Porto Velho"
  if (upper.includes("PREFEITURA_PONTA_GROSSA") || upper.includes("PONTA GROSSA")) return "Prefeitura Ponta Grossa"
  if (upper.includes("INSS")) return "INSS"
  return raw
}

const formatCurrency = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return "R$ 0,00"
  return Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// Detecção de ambiente: Desenvolvimento (Google AI Studio / localhost) x Produção
function checkIsDevEnvironment(): boolean {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "development"
  }

  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get("ambiente") === "producao" || params.get("env") === "prod") return false
    if (params.get("ambiente") === "dev" || params.get("env") === "dev") return true
  } catch {}

  const host = window.location.hostname || ""
  const isAiStudio = host.includes("ais-dev-") || host.includes("ais-pre-") || host.includes("aistudio")
  const isLocalhost = host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")

  if (isAiStudio || isLocalhost) {
    return true
  }

  if (process.env.NODE_ENV === "development") {
    return true
  }

  return false
}

export default function KanbanPage() {
  const { user, perfil, isAdmin, isDeveloper } = useAuth()

  // Verificação de ambiente (Desenvolvimento no AI Studio vs Produção)
  const [isDevEnv, setIsDevEnv] = useState<boolean>(true)
  const [hasCheckedEnv, setHasCheckedEnv] = useState<boolean>(false)

  useEffect(() => {
    setIsDevEnv(checkIsDevEnvironment())
    setHasCheckedEnv(true)
  }, [])

  // Determinar se o usuário atual é gestor ou operador de execução
  const userRole = (perfil?.role || "").trim()
  const isGestor = Boolean(
    isAdmin || 
    userRole === "Administrador" || 
    userRole === "Supervisor" || 
    userRole === "Operacional" || 
    userRole === "Monitoramento" ||
    userRole === "Desenvolvedor" ||
    userRole === "Recursos Humanos" ||
    userRole === "RH"
  )

  // Identificação de papéis e regimes para acesso ao Kanban
  const isDevUser = Boolean(
    isDeveloper || 
    userRole === "Desenvolvedor" || 
    perfil?.role === "Desenvolvedor"
  )

  const isAdminUser = Boolean(
    isAdmin || 
    userRole === "Administrador" || 
    perfil?.role === "Administrador"
  )

  const regimeUpper = (
    perfil?.regime_contratacao || 
    (perfil as any)?.regime_trabalho || 
    (perfil as any)?.regime || 
    user?.user_metadata?.regime_contratacao || 
    ""
  ).toUpperCase().trim()

  const currentUserNameNorm = (perfil?.nome || user?.user_metadata?.nome || user?.email || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  const isThiagoMelloUser = currentUserNameNorm.includes("thiago mello") || currentUserNameNorm.includes("thiago couto") || (currentUserNameNorm.includes("thiago") && currentUserNameNorm.includes("mello"))

  const isOperacionalUser = Boolean(
    userRole === "Operacional" || perfil?.role === "Operacional"
  )

  // Apenas Administrador, Desenvolvedor, Operacional e o próprio Thiago Mello Couto podem visualizar atendimentos dele
  const canViewThiagoTickets = Boolean(
    isThiagoMelloUser ||
    isAdmin ||
    isAdminUser ||
    isDeveloper ||
    isDevUser ||
    isOperacionalUser
  )

  // Corretor PJ não tem acesso ao Kanban (Desenvolvedor continua normal; Thiago Mello Couto liberado exclusivamente)
  const isCorretorPJ = Boolean(
    !isDevUser &&
    !isAdminUser &&
    (userRole === "Corretor" || perfil?.role === "Corretor") &&
    regimeUpper === "PJ"
  )

  // Módulo liberado para todos os usuários autorizados; para Corretores PJ, SOMENTE para Thiago Mello Couto
  const canAccessKanban = !isCorretorPJ || isThiagoMelloUser

  // Identificar se o cartão pertence ao Corretor PJ Thiago Mello Couto
  const isThiagoTicket = useCallback((ticket: TicketItem, meta?: TicketMetadata) => {
    const m = meta || parseMetadata(ticket.descricao)
    const names = [
      ticket.user_nome,
      (ticket as any).operador_nome,
      (ticket as any).corretor_nome,
      m.user_nome,
      (m as any).operador_nome,
      (m as any).corretor_nome
    ]
    return names.some(n => {
      if (!n) return false
      const s = String(n).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      return s.includes("thiago mello") || s.includes("thiago couto") || (s.includes("thiago") && s.includes("mello"))
    })
  }, [])

  // Visão Ativa do Módulo Kanban: "MINHA_FILA" (padrão inicial) ou "KANBAN"
  const [activeView, setActiveView] = useState<"MINHA_FILA" | "KANBAN">("MINHA_FILA")

  // Modo de Exibição das Etapas: "QUADRO" (colunas de cartões) ou "LISTA" (linhas sequenciais)
  const [displayMode, setDisplayMode] = useState<"QUADRO" | "LISTA">("QUADRO")
  const [listSortBy, setListSortBy] = useState<"vencimento" | "valor" | "nome">("vencimento")
  const [listFilterStage, setListFilterStage] = useState<string>("ALL")
  const [listSearch, setListSearch] = useState<string>("")
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] !== undefined ? !prev[sectionId] : false
    }))
  }

  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [propostasPorCpf, setPropostasPorCpf] = useState<Record<string, { ade?: string; data_digitacao?: string; status?: string }>>({})
  const [usersList, setUsersList] = useState<UserSummary[]>([])
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>([])
  const [collaboratorDropdownOpen, setCollaboratorDropdownOpen] = useState(false)
  const collaboratorDropdownRef = useRef<HTMLDivElement>(null)
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false)
  const stageDropdownRef = useRef<HTMLDivElement>(null)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  // Próximas Ações e Regras de Vencimento dinâmicas
  const [proximasAcoesConfig, setProximasAcoesConfig] = useState<ProximaAcaoConfig[]>(() => getLocalProximasAcoes())

  useEffect(() => {
    fetchProximasAcoes().then(data => {
      if (data && data.length > 0) {
        setProximasAcoesConfig(data)
      }
    })
  }, [])

  const cltCollaborators = useMemo(() => {
    const map = new Map<string, UserSummary>()

    tickets.forEach(t => {
      const meta = parseMetadata(t.descricao)
      const rawId = String(t.user_id || meta.user_id || (meta as any).operador_id || "").trim()
      const rawNome = String(t.user_nome || meta.user_nome || (meta as any).operador_nome || "").trim()

      if (!rawId && !rawNome) return

      // Tenta localizar cadastro completo do usuário em usersList
      const matched = usersList.find(u => 
        (rawId && u.id.toLowerCase() === rawId.toLowerCase()) ||
        (rawNome && u.nome.trim().toLowerCase() === rawNome.toLowerCase())
      )

      if (matched) {
        // Remove dessa lista os Corretores PJ (permitindo apenas Thiago Mello Couto para quem possui autorização de visualização)
        const roleStr = String(matched.role || matched.funcao || "").trim().toUpperCase()
        const regimeStr = String(matched.regime_contratacao || "").trim().toUpperCase()
        const isCorretorPJ = roleStr.includes("CORRETOR") && regimeStr === "PJ"
        const isMatchedThiago = String(matched.nome || "").toLowerCase().includes("thiago mello") || String(matched.nome || "").toLowerCase().includes("thiago couto")
        if (isCorretorPJ && (!isMatchedThiago || !canViewThiagoTickets)) return

        map.set(matched.id, matched)
      } else {
        // Se tem chamado no pipeline mas não está em usersList, valida se não é Corretor PJ por metadados
        const metaRole = String((meta as any).operador_role || (meta as any).user_role || "").trim().toUpperCase()
        const metaRegime = String((meta as any).regime_contratacao || "").trim().toUpperCase()
        const metaEquipe = String(t.equipe || (meta as any).equipe || "").trim().toUpperCase()
        const isCorretorPJ = (metaRole.includes("CORRETOR") || metaEquipe.includes("PJ")) && (metaRegime === "PJ" || metaEquipe.includes("PJ"))
        const isRawThiago = rawNome.toLowerCase().includes("thiago mello") || rawNome.toLowerCase().includes("thiago couto")
        if (isCorretorPJ && (!isRawThiago || !canViewThiagoTickets)) return

        const key = rawId || rawNome.toLowerCase()
        if (!map.has(key)) {
          map.set(key, {
            id: rawId || key,
            nome: rawNome || "Colaborador",
            role: "Colaborador",
            status: "ATIVO"
          })
        }
      }
    })

    return Array.from(map.values())
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  }, [usersList, tickets])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (collaboratorDropdownRef.current && !collaboratorDropdownRef.current.contains(e.target as Node)) {
        setCollaboratorDropdownOpen(false)
      }
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(e.target as Node)) {
        setStageDropdownOpen(false)
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false)
      }
    }
    if (collaboratorDropdownOpen || stageDropdownOpen || sortDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [collaboratorDropdownOpen, stageDropdownOpen, sortDropdownOpen])

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Busca de Cliente (Acessar Clientes - CPF ou Telefone)
  const router = useRouter()
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [isSearchingClient, setIsSearchingClient] = useState(false)
  const [clientSearchError, setClientSearchError] = useState<string | null>(null)
  const [isClientDetailsModalOpen, setIsClientDetailsModalOpen] = useState(false)
  const [isKanbanSearchModal, setIsKanbanSearchModal] = useState(false)
  const [isDrawerLeadModal, setIsDrawerLeadModal] = useState(false)
  const [selectedClientCpf, setSelectedClientCpf] = useState<string>("")
  const [isViewingLeadInAttendance, setIsViewingLeadInAttendance] = useState(false)
  const [leadModalAttendanceContext, setLeadModalAttendanceContext] = useState<{ hasChamado: boolean; hasProposta: boolean } | null>(null)

  const handleClientSearch = async () => {
    const raw = clientSearchQuery.trim()
    if (!raw) {
      setClientSearchError("Por favor, insira um CPF ou telefone.")
      toast.error("Por favor, insira um CPF ou telefone.")
      return
    }
    const digits = raw.replace(/\D/g, "")
    if (!digits && raw.length < 3) {
      setClientSearchError("Por favor, insira um CPF ou telefone válido.")
      toast.error("Por favor, insira um CPF ou telefone válido.")
      return
    }
    setClientSearchError(null)
    setIsSearchingClient(true)

    try {
      let foundCpf: string | null = null
      const last8 = digits.length >= 8 ? digits.slice(-8) : digits
      const last9 = digits.length >= 9 ? digits.slice(-9) : digits
      const prefix4 = last8.length === 8 ? last8.slice(0, 4) : ""
      const suffix4 = last8.length === 8 ? last8.slice(4) : ""

      const cleanDigits = (val?: string | null) => (val || "").replace(/\D/g, "")

      const matchesPhone = (targetPhone?: string | null) => {
        if (!targetPhone) return false
        const clean = cleanDigits(targetPhone)
        if (!clean) return false
        if (clean === digits) return true
        if (digits.length >= 8 && clean.slice(-8) === last8) return true
        if (digits.length >= 9 && clean.slice(-9) === last9) return true
        if (clean.length >= 8 && digits.slice(-8) === clean.slice(-8)) return true
        return false
      }

      // 1. Buscar primeiramente nos cards já carregados em memória no Kanban
      const ticketMatch = tickets.find(t => {
        const cleanTicketCpf = cleanDigits(t.cliente_cpf)
        if (digits && cleanTicketCpf === digits) return true
        const meta = parseMetadata(t.descricao)
        const allPhones = [
          t.cliente_telefone,
          t.cliente_telefone_2,
          t.cliente_telefone_3,
          meta.cliente_telefone,
          meta.cliente_telefone_2,
          meta.cliente_telefone_3,
          ...(Array.isArray(t.telefones) ? t.telefones : []),
          ...(Array.isArray(meta.telefones) ? meta.telefones.map((x: any) => typeof x === "string" ? x : x?.numero) : [])
        ]
        return allPhones.some(matchesPhone)
      })

      if (ticketMatch?.cliente_cpf) {
        foundCpf = ticketMatch.cliente_cpf
      }

      // 2. Se foram digitados exatamente 11 dígitos que correspondem a um CPF válido
      if (!foundCpf && digits.length === 11 && isValidCPF(digits)) {
        foundCpf = digits
      }

      // 3. Se for telefone (>= 8 dígitos): buscar em kanban_fichas, chamados e em todas as bases de convênios do CRM
      if (!foundCpf && digits.length >= 8) {
        // 3.1 Busca em kanban_fichas
        try {
          const { data: fByTel } = await supabase
            .from("kanban_fichas")
            .select("cliente_cpf, cliente_telefone, metadata")
            .or(`cliente_telefone.ilike.%${last8}%,cliente_telefone.ilike.%${prefix4}%${suffix4}%,cliente_cpf.ilike.%${digits}%`)
            .not("cliente_cpf", "is", null)
            .limit(10)

          if (fByTel && fByTel.length > 0) {
            const match = fByTel.find(f => {
              if (matchesPhone(f.cliente_telefone)) return true
              const meta = f.metadata && typeof f.metadata === "object" ? f.metadata : {}
              const metaPhones = [
                meta.cliente_telefone,
                meta.cliente_telefone_2,
                meta.cliente_telefone_3,
                ...(Array.isArray(meta.telefones) ? meta.telefones.map((x: any) => typeof x === "string" ? x : x?.numero) : [])
              ]
              return metaPhones.some(matchesPhone)
            })
            if (match?.cliente_cpf) {
              foundCpf = match.cliente_cpf
            } else if (fByTel[0]?.cliente_cpf) {
              foundCpf = fByTel[0].cliente_cpf
            }
          }
        } catch (err) {
          console.warn("Erro ao buscar telefone em kanban_fichas:", err)
        }

        // 3.2 Busca em chamados
        if (!foundCpf) {
          try {
            const { data: chByTel } = await supabase
              .from("chamados")
              .select("cliente_cpf, cliente_telefone, cliente_telefone_2, cliente_telefone_3")
              .or(`cliente_telefone.ilike.%${last8}%,cliente_telefone.ilike.%${prefix4}%${suffix4}%,cliente_telefone_2.ilike.%${last8}%,cliente_telefone_2.ilike.%${prefix4}%${suffix4}%,cliente_telefone_3.ilike.%${last8}%,cliente_telefone_3.ilike.%${prefix4}%${suffix4}%,cliente_cpf.ilike.%${digits}%`)
              .not("cliente_cpf", "is", null)
              .limit(5)

            if (chByTel && chByTel.length > 0) {
              const match = chByTel.find(ch => 
                matchesPhone(ch.cliente_telefone) || 
                matchesPhone(ch.cliente_telefone_2) || 
                matchesPhone(ch.cliente_telefone_3)
              )
              if (match?.cliente_cpf) {
                foundCpf = match.cliente_cpf
              } else if (chByTel[0]?.cliente_cpf) {
                foundCpf = chByTel[0].cliente_cpf
              }
            }
          } catch (err) {
            console.warn("Erro ao buscar telefone em chamados:", err)
          }
        }

        // 3.3 Busca em todas as tabelas de clientes e bases de consulta dos convênios
        if (!foundCpf) {
          const phoneVariations = new Set<string>([digits, last8, last9])
          if (digits.length === 10) {
            phoneVariations.add(digits.slice(0, 2) + "9" + digits.slice(2))
          } else if (digits.length === 11) {
            phoneVariations.add(digits.slice(0, 2) + digits.slice(3))
          }
          if (digits.length >= 10) {
            phoneVariations.add(`0${digits}`)
          }

          const phoneTerms: string[] = []
          phoneVariations.forEach(pv => {
            phoneTerms.push(`telefone_1.eq.${pv}`, `telefone_2.eq.${pv}`, `telefone_3.eq.${pv}`)
          })
          if (prefix4 && suffix4) {
            phoneTerms.push(
              `telefone_1.ilike.%${prefix4}%${suffix4}%`,
              `telefone_2.ilike.%${prefix4}%${suffix4}%`,
              `telefone_3.ilike.%${prefix4}%${suffix4}%`
            )
          }

          const tablesWithoutTel3 = new Set([
            'base_consulta_amazon_prev',
            'base_consulta_governo_ma',
            'amazon_prev_clientes',
            'governo_ma_clientes',
            'governo_sp_clientes',
            'prefeitura_sp_clientes',
            'governo_pi_clientes'
          ])

          const conveniosTables = [
            'base_consulta_siape',
            'base_consulta_governo_sp',
            'base_consulta_prefeitura_sp',
            'base_consulta_governo_pi',
            'base_consulta_governo_ma',
            'base_consulta_governo_rr',
            'base_consulta_governo_rj',
            'base_consulta_prefeitura_santo_andre',
            'base_consulta_prefeitura_contagem',
            'base_consulta_governo_mg',
            'base_consulta_governo_ms',
            'base_consulta_prefeitura_natal',
            'base_consulta_prefeitura_porto_velho',
            'base_consulta_governo_ba',
            'base_consulta_governo_am',
            'base_consulta_governo_ce',
            'base_consulta_governo_ro',
            'base_consulta_prefeitura_ponta_grossa',
            'base_consulta_amazon_prev',
            'clientes',
            'governo_sp_clientes',
            'prefeitura_sp_clientes',
            'governo_mg_clientes',
            'governo_rj_clientes',
            'prefeitura_santo_andre_clientes',
            'inss_clientes'
          ]

          try {
            const searchPromises = conveniosTables.map(async (tableName) => {
              try {
                const terms = tablesWithoutTel3.has(tableName)
                  ? phoneTerms.filter(t => !t.startsWith('telefone_3.'))
                  : phoneTerms

                const { data } = await supabase
                  .from(tableName)
                  .select("cpf")
                  .or(terms.join(","))
                  .limit(1)
                  .maybeSingle()

                if (data?.cpf) return data.cpf as string
              } catch {
                return null
              }
              return null
            })

            const foundResults = await Promise.all(searchPromises)
            const matchCpf = foundResults.find(c => Boolean(c))
            if (matchCpf) {
              foundCpf = matchCpf
            }
          } catch (err) {
            console.warn("Erro ao buscar nas tabelas de convênios:", err)
          }
        }
      }

      if (!foundCpf) {
        toast.error("Nenhum cliente localizado para o telefone ou CPF informado.")
        setClientSearchError("Cliente não localizado.")
        return
      }

      const cleanCpf = foundCpf.replace(/\D/g, "")

      // Buscar fichas existentes no pipeline para o CPF
      const { data: allFichas } = await supabase
        .from("kanban_fichas")
        .select("id, cliente_nome, cliente_cpf, cliente_telefone, etapa, operador_id, operador_nome, motivo_perda, metadata")
        .eq("cliente_cpf", cleanCpf)

      // Filtrar fichas que estão ativas no pipeline (não gavetas e não perdidas)
      const fichasAtivas = (allFichas || []).filter(f => {
        const meta = (f.metadata && typeof f.metadata === "object") ? f.metadata : {}
        const isDrawer = (f.etapa === "PERDIDO" || !f.etapa) && (
          Boolean(meta.tabulacao_whatsapp) || 
          f.motivo_perda === "Não Existe Whatsapp" || 
          f.motivo_perda === "Whatsapp Divergente"
        )
        return !isDrawer && f.etapa !== "PERDIDO"
      })

      // 1. REGRA COMERCIAL: O mesmo corretor NÃO pode iniciar um segundo atendimento de um lead que ele mesmo já está atendendo
      const currentUserId = user?.id
      const currentUserName = perfil?.nome || ""
      const minhaFichaAtiva = fichasAtivas.find(f => {
        if (currentUserId && f.operador_id && f.operador_id === currentUserId) return true
        if (currentUserName && f.operador_nome && f.operador_nome.trim().toLowerCase() === currentUserName.trim().toLowerCase()) return true
        return false
      })

      // Outros operadores que já estão atendendo o mesmo lead
      const outrasFichas = fichasAtivas.filter(f => f.id !== minhaFichaAtiva?.id)
      const outrosNomes = Array.from(new Set(outrasFichas.map(f => `${f.operador_nome || "Outro Usuário"} (${f.etapa || "EM RETOMADA"})`)))

      // Se o próprio corretor já atende este lead: bloqueia duplicidade e exibe notificação explicativa
      if (minhaFichaAtiva) {
        const meta = (minhaFichaAtiva.metadata && typeof minhaFichaAtiva.metadata === "object") ? minhaFichaAtiva.metadata : {}
        const rawPhones = [
          minhaFichaAtiva.cliente_telefone,
          meta.cliente_telefone,
          meta.cliente_telefone_2,
          meta.cliente_telefone_3,
          ...(Array.isArray(meta.telefones) ? meta.telefones.map((t: any) => typeof t === "string" ? t : t?.numero) : [])
        ].filter(Boolean) as string[]

        setLeadEmAtendimentoInfo({
          cliente_nome: minhaFichaAtiva.cliente_nome || "Cliente sem Nome",
          cliente_cpf: cleanCpf,
          cliente_telefone: minhaFichaAtiva.cliente_telefone || "",
          telefones: Array.from(new Set(rawPhones.map(p => p.trim()).filter(Boolean))),
          telefones_selecionados: Array.isArray(meta.telefones_selecionados) ? meta.telefones_selecionados : undefined,
          etapa: minhaFichaAtiva.etapa || "EM RETOMADA",
          operador_nome: minhaFichaAtiva.operador_nome || currentUserName || "Você",
          isMeuAtendimento: true,
          outros_operadores: outrasFichas.map(o => ({ operador_nome: o.operador_nome || "Outro", etapa: o.etapa || "EM RETOMADA" }))
        })
        setClientSearchQuery("")
        return
      }

      // 2. REGRA COMERCIAL: Usuários diferentes PODEM iniciar atendimento de forma independente (sem notificação obstrutiva)

      // Abre o modal completo de detalhes do cliente para iniciar o atendimento de forma independente
      setSelectedClientCpf(foundCpf)
      setIsKanbanSearchModal(true)
      setIsClientDetailsModalOpen(true)
      setClientSearchQuery("")
    } catch (err) {
      console.error("Erro ao pesquisar cliente no Kanban:", err)
      toast.error("Erro ao localizar cliente.")
    } finally {
      setIsSearchingClient(false)
    }
  }

  // Modal de Notificação: Lead já em atendimento no pipeline
  const [leadEmAtendimentoInfo, setLeadEmAtendimentoInfo] = useState<{
    cliente_nome: string
    cliente_cpf: string
    cliente_telefone?: string
    telefones?: string[]
    telefones_selecionados?: string[]
    etapa: string
    operador_nome: string
    isMeuAtendimento?: boolean
    outros_operadores?: Array<{ operador_nome: string; etapa: string }>
  } | null>(null)

  // Mapa de operadores em atendimento por CPF para exibição na etiqueta dos cartões do pipeline
  const [concorrenciaPorCpf, setConcorrenciaPorCpf] = useState<Record<string, string[]>>({})

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>("ALL")
  const [selectedAlertFilter, setSelectedAlertFilter] = useState<string>("ALL") // ALL, ATRASADO, ACAO_ESPECIAL, CONFLITO
  const [isResponsavelDropdownOpen, setIsResponsavelDropdownOpen] = useState(false)
  const [responsavelSearchQuery, setResponsavelSearchQuery] = useState("")
  const responsavelDropdownRef = useRef<HTMLDivElement>(null)

  // Lista de usuários ativos ordenada alfabeticamente
  const activeUsersList = useMemo(() => {
    return usersList
      .filter(u => !u.status || u.status === "ATIVO")
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
  }, [usersList])

  // Destinatários da Ação Especial nas posições e cargos específicos solicitados
  const destinatariosAcaoEspecial = useMemo(() => {
    const configuracaoDestinatarios = [
      { key: "nathali", defaultNome: "Nathali Beneduzi", label: "Nathali Beneduzi - Supervisora Comercial" },
      { key: "talita", defaultNome: "Talita Haupt", label: "Talita Haupt - Supervisora Operacional" },
      { key: "larissa", defaultNome: "Larissa Ramos", label: "Larissa Ramos - Administradora" },
      { key: "robson", defaultNome: "Robson Ramos", label: "Robson Ramos - Direção" },
      { key: "leticia", defaultNome: "Leticia Pereira", label: "Leticia Pereira - Monitoramento" },
    ]

    return configuracaoDestinatarios.map(item => {
      const found = activeUsersList.find(u => {
        const n = (u.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        return n.includes(item.key)
      })

      return {
        id: found?.id || item.key,
        nome: found?.nome || item.defaultNome,
        label: item.label
      }
    })
  }, [activeUsersList])

  // Fechar dropdown de responsável ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        responsavelDropdownRef.current &&
        !responsavelDropdownRef.current.contains(event.target as Node)
      ) {
        setIsResponsavelDropdownOpen(false)
        setResponsavelSearchQuery("")
      }
    }
    if (isResponsavelDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isResponsavelDropdownOpen])

  // Filtragem na busca de responsáveis
  const filteredResponsaveis = useMemo(() => {
    const q = responsavelSearchQuery.trim().toLowerCase()
    if (!q) return activeUsersList
    return activeUsersList.filter(u =>
      u.nome.toLowerCase().includes(q) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.funcao && u.funcao.toLowerCase().includes(q))
    )
  }, [activeUsersList, responsavelSearchQuery])

  // Objeto do usuário selecionado
  const selectedUserObj = useMemo(() => {
    if (selectedResponsavel === "ALL") return null
    return usersList.find(u => u.id === selectedResponsavel)
  }, [usersList, selectedResponsavel])

  // Estado de desmascarar CPF e Telefone temporariamente no card
  const [revealedCpfs, setRevealedCpfs] = useState<Record<string, boolean>>({})
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({})

  // Estado de Drag and Drop para mover cards entre etapas
  const [draggedTicket, setDraggedTicket] = useState<TicketItem | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)

  // Modais
  const [atendimentoModalTicket, setAtendimentoModalTicket] = useState<TicketItem | null>(null)
  const [supervisaoModalTicket, setSupervisaoModalTicket] = useState<TicketItem | null>(null)
  const [agendarModalTicket, setAgendarModalTicket] = useState<TicketItem | null>(null)
  const [moverModalTicket, setMoverModalTicket] = useState<TicketItem | null>(null)
  const [historicoModalTicket, setHistoricoModalTicket] = useState<TicketItem | null>(null)
  const [callFeedbackTicket, setCallFeedbackTicket] = useState<TicketItem | null>(null)
  const [selectedDrawer, setSelectedDrawer] = useState<"NAO_EXISTE" | "DIVERGENTE" | null>(null)
  const [dragOverDrawer, setDragOverDrawer] = useState<"NAO_EXISTE" | "DIVERGENTE" | null>(null)

  // Campos de formulário em modais
  const [atendimentoMensagem, setAtendimentoMensagem] = useState("")
  const [isSubmittingAtendimento, setIsSubmittingAtendimento] = useState(false)
  const [historicoMensagens, setHistoricoMensagens] = useState<any[]>([])
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false)
  const [resolvedConvenio, setResolvedConvenio] = useState("")
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<"Sem interação" | "Sem interesse" | "">("")
  const [isSavingOpcao, setIsSavingOpcao] = useState(false)

  // Estados da Modal de Solicitação de Ação Especial
  const [isAcaoEspecialModalOpen, setIsAcaoEspecialModalOpen] = useState(false)
  const [acaoEspecialDestinatario, setAcaoEspecialDestinatario] = useState<string>("")
  const [acaoEspecialTexto, setAcaoEspecialTexto] = useState("")

  // Sincroniza o destinatário selecionado com o primeiro usuário da lista ordenada
  useEffect(() => {
    if (destinatariosAcaoEspecial.length > 0) {
      if (!acaoEspecialDestinatario || !destinatariosAcaoEspecial.some(u => u.nome === acaoEspecialDestinatario)) {
        setAcaoEspecialDestinatario(destinatariosAcaoEspecial[0].nome)
      }
    }
  }, [destinatariosAcaoEspecial, acaoEspecialDestinatario])
  const [isSubmittingAcaoEspecial, setIsSubmittingAcaoEspecial] = useState(false)
  const [isAvancandoCadencia, setIsAvancandoCadencia] = useState(false)

  // Estado computado da Cadência no Modal de Atendimento
  const modalCadencia = useMemo(() => {
    if (!atendimentoModalTicket) return null
    const meta = parseMetadata(atendimentoModalTicket.descricao)
    return getLeadCadenceState(atendimentoModalTicket, meta)
  }, [atendimentoModalTicket])

  // Histórico de Atendimentos e Propostas do Cliente (Modal Atendimento)
  const [clientTicketsHistory, setClientTicketsHistory] = useState<Record<string, unknown>[]>([])
  const [isLoadingClientTicketsHistory, setIsLoadingClientTicketsHistory] = useState(false)
  const [clientProposalsHistory, setClientProposalsHistory] = useState<Record<string, any>[]>([])
  const [isLoadingClientProposalsHistory, setIsLoadingClientProposalsHistory] = useState(false)
  const [clientTypedProposalsHistory, setClientTypedProposalsHistory] = useState<Record<string, any>[]>([])
  const [isLoadingClientTypedProposalsHistory, setIsLoadingClientTypedProposalsHistory] = useState(false)

  // Carregar histórico de atendimentos e propostas para o cliente do modal de atendimento
  useEffect(() => {
    if (!atendimentoModalTicket) {
      setClientTicketsHistory([])
      setClientProposalsHistory([])
      setClientTypedProposalsHistory([])
      return
    }

    const rawCpf = atendimentoModalTicket.cliente_cpf || ""
    const cleanCpf = rawCpf.replace(/\D/g, "")
    if (!cleanCpf) {
      setClientTicketsHistory([])
      setClientProposalsHistory([])
      setClientTypedProposalsHistory([])
      return
    }

    const ticketMeta = parseMetadata(atendimentoModalTicket.descricao)
    const targetUserId = (atendimentoModalTicket.user_id || (ticketMeta as any)?.user_id || "").trim()
    const targetUserName = (
      atendimentoModalTicket.user_nome || 
      (atendimentoModalTicket as any).responsavel_nome || 
      (atendimentoModalTicket as any).corretor_nome || 
      (ticketMeta as any)?.user_nome || 
      (ticketMeta as any)?.operador_nome || 
      perfil?.nome || 
      ""
    ).trim()

    const isOperatorMatch = (itemUserId?: string | null, itemUserName?: string | null, itemUserEmail?: string | null) => {
      if (targetUserId && itemUserId && String(itemUserId) === String(targetUserId)) {
        return true
      }
      const cleanTarget = targetUserName.toLowerCase().trim()
      const cleanItem = (itemUserName || "").toLowerCase().trim()
      if (cleanTarget && cleanItem) {
        if (cleanTarget === cleanItem) return true
        const targetParts = cleanTarget.split(/\s+/).filter(Boolean)
        const itemParts = cleanItem.split(/\s+/).filter(Boolean)
        if (targetParts.length > 0 && itemParts.length > 0 && targetParts[0] === itemParts[0]) {
          if (targetParts.length === 1 || itemParts.length === 1) return true
          if (targetParts.some(tp => itemParts.includes(tp))) return true
        }
      }
      return false
    }

    let isMounted = true

    // 1. Buscar Chamados (Histórico de Atendimento) - Correspondente ao Responsável pelo Atendimento
    const loadTickets = async () => {
      setIsLoadingClientTicketsHistory(true)
      try {
        const { data, error: fetchErr } = await supabase
          .from('chamados')
          .select(`
            *,
            status_chamados:status_id (nome)
          `)
          .eq('cliente_cpf', cleanCpf)
          .order('created_at', { ascending: false })

        if (!fetchErr && isMounted) {
          // Filtrar estritamente pelo operador responsável pelo atendimento selecionado
          const filteredTickets = (data || []).filter((ch: any) => {
            return isOperatorMatch(ch.user_id, ch.user_nome, ch.user_email)
          })
          setClientTicketsHistory(filteredTickets)
        }
      } catch (err) {
        console.error("Erro ao buscar histórico de chamados:", err)
      } finally {
        if (isMounted) setIsLoadingClientTicketsHistory(false)
      }
    }

    // 2. Buscar Propostas Comerciais - Correspondente ao Responsável pelo Atendimento
    const loadProposals = async () => {
      setIsLoadingClientProposalsHistory(true)
      try {
        const [p1, p2, p3, p4] = await Promise.all([
          supabase.from('historico_proposta_comercial').select('*').eq('cliente_cpf', cleanCpf),
          supabase.from('historico_proposta_comercial_novo_formato').select('*').eq('cliente_cpf', cleanCpf),
          supabase.from('historico_proposta_comercial_quitacao_contrato').select('*').eq('cliente_cpf', cleanCpf),
          supabase.from('historico_proposta_comercial_calculadora').select('*').eq('cliente_cpf', cleanCpf)
        ])

        let combined: Record<string, any>[] = []
        if (p1.data) combined = combined.concat(p1.data.map((item: any) => ({ ...item, isNovoFormato: false, isQuitacao: false, isCalculadora: false })))
        if (p2.data) combined = combined.concat(p2.data.map((item: any) => ({ ...item, isNovoFormato: true, isQuitacao: false, isCalculadora: false })))
        if (p3.data) combined = combined.concat(p3.data.map((item: any) => ({ ...item, isNovoFormato: false, isQuitacao: true, isCalculadora: false })))
        if (p4.data) combined = combined.concat(p4.data.map((item: any) => ({ ...item, isNovoFormato: false, isQuitacao: false, isCalculadora: true })))

        // Filtrar estritamente pelo operador responsável pelo atendimento selecionado
        const filteredProposals = combined.filter((prop: any) => {
          return isOperatorMatch(prop.user_id, prop.user_nome, prop.user_email)
        })

        filteredProposals.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          return dateB - dateA
        })

        if (isMounted) {
          setClientProposalsHistory(filteredProposals)
        }
      } catch (err) {
        console.error("Erro ao buscar histórico de propostas:", err)
      } finally {
        if (isMounted) setIsLoadingClientProposalsHistory(false)
      }
    }

    // 3. Buscar Propostas Digitadas (Tabela 'propostas') vinculadas ao CPF do Cliente
    const loadTypedProposals = async () => {
      setIsLoadingClientTypedProposalsHistory(true)
      try {
        const cpfs = Array.from(new Set([cleanCpf, rawCpf].filter(Boolean)))
        const { data, error: fetchErr } = await supabase
          .from('propostas')
          .select('*')
          .in('cliente_cpf', cpfs)
          .order('created_at', { ascending: false })

        if (!fetchErr && isMounted && data) {
          data.sort((a: any, b: any) => {
            const dateA = a.created_at || a.data_digitacao ? new Date(a.created_at || a.data_digitacao).getTime() : 0
            const dateB = b.created_at || b.data_digitacao ? new Date(b.created_at || b.data_digitacao).getTime() : 0
            return dateB - dateA
          })
          setClientTypedProposalsHistory(data)
        }
      } catch (err) {
        console.error("Erro ao buscar histórico de propostas digitadas:", err)
      } finally {
        if (isMounted) setIsLoadingClientTypedProposalsHistory(false)
      }
    }

    loadTickets()
    loadProposals()
    loadTypedProposals()

    return () => {
      isMounted = false
    }
  }, [atendimentoModalTicket?.id, atendimentoModalTicket?.cliente_cpf, atendimentoModalTicket?.user_id, atendimentoModalTicket?.user_nome])

  const handleDownloadProposalHistory = (proposal: Record<string, any>) => {
    if (!proposal.arquivo_url) return
    const link = document.createElement("a")
    link.href = proposal.arquivo_url
    const extension = proposal.tipo_arquivo?.toLowerCase() === "pdf" ? "pdf" : "jpg"
    const safeName = (proposal.cliente_nome || "Cliente").trim().replace(/\s+/g, "_")
    link.download = `proposta_reducao_${safeName}.${extension}`
    link.click()
  }

  // Sincronizar opção selecionada a partir da observação da ficha
  useEffect(() => {
    if (!atendimentoModalTicket) {
      setOpcaoSelecionada("")
      return
    }
    const cleanObs = (atendimentoModalTicket.descricao || "")
      .replace(/<!-- TICKET_METADATA: ([\s\S]*?) -->/g, "")
      .trim()
    const meta = parseMetadata(atendimentoModalTicket.descricao)
    const stage = inferKanbanStage(atendimentoModalTicket, meta)

    if (cleanObs === "Sem interação") {
      setOpcaoSelecionada("Sem interação")
    } else if (cleanObs === "Sem interesse" && stage === "SEM INTERESSE") {
      setOpcaoSelecionada("Sem interesse")
    } else {
      setOpcaoSelecionada("")
    }
  }, [atendimentoModalTicket])

  // Resolver e sincronizar convênio de origem do cliente no modal de atendimento
  useEffect(() => {
    if (!atendimentoModalTicket) {
      setResolvedConvenio("")
      return
    }

    const meta = parseMetadata(atendimentoModalTicket.descricao)
    const initialConvenio = atendimentoModalTicket.convenio || meta.convenio || ""
    if (initialConvenio && initialConvenio !== "Não informado") {
      setResolvedConvenio(formatConvenioOrigem(initialConvenio))
      return
    }

    let isMounted = true
    const resolveConvenioFromDb = async () => {
      const rawCpf = atendimentoModalTicket.cliente_cpf || ""
      const digits = rawCpf.replace(/\D/g, "")
      if (!digits) return
      const padded = digits.padStart(11, "0")

      const tables = [
        { name: "siape_cadastros", label: "SIAPE" },
        { name: "siape_clientes", label: "SIAPE" },
        { name: "governo_sp_clientes", label: "Governo São Paulo" },
        { name: "prefeitura_sp_clientes", label: "Prefeitura de São Paulo" },
        { name: "governo_mg_clientes", label: "Governo Minas Gerais" },
        { name: "governo_rj_clientes", label: "Governo Rio de Janeiro" },
        { name: "governo_ba_clientes", label: "Governo Bahia" },
        { name: "governo_am_clientes", label: "Governo Amazonas" },
        { name: "governo_ce_clientes", label: "Governo Ceará" },
        { name: "governo_ro_clientes", label: "Governo Rondônia" },
        { name: "governo_pi_clientes", label: "Governo Piauí" },
        { name: "governo_ma_clientes", label: "Governo Maranhão" },
        { name: "governo_rr_clientes", label: "Governo Roraima" },
        { name: "governo_ms_clientes", label: "Governo Mato Grosso do Sul" },
        { name: "prefeitura_santo_andre_clientes", label: "Prefeitura Santo André" },
        { name: "prefeitura_contagem_clientes", label: "Prefeitura Contagem" },
        { name: "prefeitura_natal_clientes", label: "Prefeitura de Natal" },
        { name: "prefeitura_porto_velho_clientes", label: "Prefeitura de Porto Velho" },
        { name: "prefeitura_ponta_grossa_clientes", label: "Prefeitura Ponta Grossa" },
        { name: "amazon_prev_clientes", label: "Amazon Prev" },
        { name: "inss_clientes", label: "INSS" }
      ]

      for (const t of tables) {
        try {
          const { data } = await supabase.from(t.name).select("id").or(`cpf.eq.${padded},cpf.eq.${digits}`).limit(1)
          if (data && data.length > 0 && isMounted) {
            setResolvedConvenio(t.label)
            if (atendimentoModalTicket.source_table === "kanban_fichas") {
              const currentMeta = parseMetadata(atendimentoModalTicket.descricao)
              delete (currentMeta as any).historico_kanban
              delete (currentMeta as any).historico_movimentacoes
              currentMeta.convenio = t.label
              atendimentoModalTicket.convenio = t.label
              supabase.from("kanban_fichas").update({
                convenio: t.label,
                metadata: currentMeta
              }).eq("id", atendimentoModalTicket.id).then(() => {})
            }
            return
          }
        } catch {}
      }
    }

    resolveConvenioFromDb()
    return () => {
      isMounted = false
    }
  }, [atendimentoModalTicket])

  // Supervisão
  const [supervisaoNovoResponsavel, setSupervisaoNovoResponsavel] = useState("")
  const [supervisaoMotivoTransbordo, setSupervisaoMotivoTransbordo] = useState("")
  const [supervisaoNovaPrioridade, setSupervisaoNovaPrioridade] = useState<"NORMAL" | "ALTA" | "URGENTE">("NORMAL")
  const [isSubmittingSupervisao, setIsSubmittingSupervisao] = useState(false)

  // Agendamento
  const [agendamentoData, setAgendamentoData] = useState("")
  const [agendamentoHora, setAgendamentoHora] = useState("")
  const [agendamentoObs, setAgendamentoObs] = useState("")

  // Mover Etapa
  const [novaEtapaSelecionada, setNovaEtapaSelecionada] = useState<KanbanStage>("EM RETOMADA")
  const [motivoMudancaEtapa, setMotivoMudancaEtapa] = useState("")

  // Carregar Usuários
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/usuarios")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setUsersList(data.map((u: any) => ({
              id: u.id,
              nome: u.nome || u.nome_completo || "Sem Nome",
              funcao: u.funcao || u.role,
              role: u.role,
              equipe: u.equipe,
              avatar_url: u.avatar_url,
              status: u.status ? String(u.status).trim().toUpperCase() : "ATIVO",
              regime_contratacao: u.regime_contratacao ? String(u.regime_contratacao).trim().toUpperCase() : ""
            })))
          }
        }
      } catch (err) {
        console.error("Erro ao carregar lista de usuários:", err)
      }
    }
    loadUsers()
  }, [])

  // Carregar Fichas do Supabase (Apenas registros da tabela kanban_fichas)
  const fetchChamados = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true)
      setIsRefreshing(true)
    }
    try {
      // Helper para fatiar listas em chunks seguros evitando URLs extensas no Supabase
      const chunkArray = <T,>(arr: T[], size: number): T[][] => {
        const res: T[][] = []
        for (let i = 0; i < arr.length; i += size) {
          res.push(arr.slice(i, i + size))
        }
        return res
      }

      // Regras de visibilidade pré-resolvidas:
      // - Estágio visualiza SOMENTE os seus próprios atendimentos;
      // - Corretor visualiza os seus próprios atendimentos e os atendimentos de seus estagiários apadrinhados;
      // - Gestores visualizam os atendimentos de todos.
      let myEstagiariosIdsList: string[] = []
      if (!isGestor && user && userRole === "Corretor") {
        try {
          const res = await fetch("/api/usuarios")
          if (res.ok) {
            const allUsers = await res.json()
            myEstagiariosIdsList = allUsers
              .filter((u: { padrinho_id: string }) => u.padrinho_id === user.id)
              .map((u: { id: string }) => u.id)
          }
        } catch {
          // ignore
        }
      }

      // Consulta paginada em blocos de 1000 para contornar o limite nativo de max-rows do Supabase/PostgREST e carregar 100% dos registros
      const PAGE_SIZE = 1000
      let allFichas: any[] = []
      let from = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from("kanban_fichas")
          .select("*")
          .order("updated_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1)

        if (!isGestor && user) {
          if (isThiagoMelloUser) {
            query = query.or(`operador_id.eq.${user.id},operador_nome.ilike.%${perfil?.nome || user.email}%`)
          } else if (userRole === "Estágio" || userRole === "Estagio") {
            query = query.or(`operador_id.eq.${user.id},operador_nome.ilike.%${perfil?.nome || user.email}%`)
          } else if (userRole === "Corretor") {
            if (myEstagiariosIdsList.length > 0) {
              query = query.or(`operador_id.in.(${[user.id, ...myEstagiariosIdsList].join(",")}),operador_nome.ilike.%${perfil?.nome || user.email}%`)
            } else {
              query = query.or(`operador_id.eq.${user.id},operador_nome.ilike.%${perfil?.nome || user.email}%`)
            }
          } else {
            query = query.or(`operador_id.eq.${user.id},operador_nome.ilike.%${perfil?.nome || user.email}%`)
          }
        }

        const { data, error } = await query
        if (error) {
          console.error("Erro ao consultar kanban_fichas:", error)
          if (!silent && allFichas.length === 0) setTickets([])
          break
        }

        if (data && data.length > 0) {
          allFichas.push(...data)
          if (data.length < PAGE_SIZE) {
            hasMore = false
          } else {
            from += PAGE_SIZE
          }
        } else {
          hasMore = false
        }
      }

      // Normalizar registros vindos da tabela kanban_fichas para o formato TicketItem
      const formatted: TicketItem[] = allFichas.map((f: any) => {
        const meta: TicketMetadata = (f.metadata && typeof f.metadata === "object") ? f.metadata : {}
        const isDrawer = (f.etapa === "PERDIDO" || !f.etapa) && (
          Boolean(meta.tabulacao_whatsapp) || 
          f.motivo_perda === "Não Existe Whatsapp" || 
          f.motivo_perda === "Whatsapp Divergente"
        )
        const drawerStatus = (meta.tabulacao_whatsapp === "WHATSAPP_DIVERGENTE" || f.motivo_perda === "Whatsapp Divergente")
          ? "WHATSAPP DIVERGENTE"
          : "NÃO EXISTE WHATSAPP"

        const fEtapa = f.etapa === "EM ABORDAGEM" ? "EM RETOMADA" : f.etapa
        meta.kanban_stage = isDrawer ? drawerStatus : (fEtapa || (meta.kanban_stage === "EM ABORDAGEM" ? "EM RETOMADA" : meta.kanban_stage) || "EM RETOMADA")
        meta.proxima_acao = meta.proxima_acao || "Iniciar régua de retomada"
        meta.vencimento_acao = meta.vencimento_acao || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        meta.prioridade = meta.prioridade || "NORMAL"

        const rawPhones = [
          f.cliente_telefone,
          f.cliente_telefone_2,
          f.cliente_telefone_3,
          meta.cliente_telefone,
          meta.cliente_telefone_2,
          meta.cliente_telefone_3,
          ...(Array.isArray(meta.telefones) ? meta.telefones.map((t: any) => typeof t === "string" ? t : t?.numero) : [])
        ].filter(Boolean) as string[]
        const uniquePhones = Array.from(new Set(rawPhones.map(p => p.trim()).filter(Boolean)))

        const rawMov = f.historico_movimentacoes
        const historicoMov: Array<{
          data: string
          etapa_anterior?: string
          etapa_nova?: string
          autor?: string
          motivo?: string
        }> = Array.isArray(rawMov)
          ? rawMov
          : (typeof rawMov === "string" ? (() => { try { const p = JSON.parse(rawMov); return Array.isArray(p) ? p : [] } catch { return [] } })() : (Array.isArray(meta.historico_kanban) ? meta.historico_kanban : []))

        if (!meta.historico_kanban && historicoMov.length > 0) {
          meta.historico_kanban = historicoMov
        }

        return {
          id: String(f.id),
          status: isDrawer ? drawerStatus : (fEtapa || "EM RETOMADA"),
          origem: f.origem || (meta as any).origem || "Não informada",
          cliente_nome: f.cliente_nome || "Cliente sem Nome",
          cliente_cpf: f.cliente_cpf || "",
          cliente_telefone: uniquePhones[0] || f.cliente_telefone || "",
          cliente_telefone_2: uniquePhones[1] || f.cliente_telefone_2 || undefined,
          cliente_telefone_3: uniquePhones[2] || f.cliente_telefone_3 || undefined,
          telefones: uniquePhones,
          telefones_selecionados: Array.isArray(f.telefones_contatados)
            ? f.telefones_contatados
            : (Array.isArray(f.telefones_selecionados) 
                ? f.telefones_selecionados 
                : (Array.isArray(meta.telefones_selecionados) ? meta.telefones_selecionados : undefined)),
          telefone_empresa: f.telefone_empresa || meta.telefone_empresa || undefined,
          margem: (f.margem_disponivel !== null && f.margem_disponivel !== undefined) ? Number(f.margem_disponivel) : (meta.margem ? parseValorToNumber(meta.margem) : undefined),
          valor_operacao: (f.valor_solicitado !== null && f.valor_solicitado !== undefined) ? Number(f.valor_solicitado) : (meta.valor_operacao ? parseValorToNumber(meta.valor_operacao) : undefined),
          convenio: f.convenio || meta.convenio || undefined,
          equipe: f.equipe || undefined,
          descricao: stringifyWithMetadata(f.observacoes || "", meta),
          user_id: f.operador_id || meta.user_id || "",
          user_nome: f.operador_nome || meta.user_nome || undefined,
          user_avatar: meta.user_avatar || undefined,
          created_at: f.created_at || new Date().toISOString(),
          updated_at: f.updated_at || new Date().toISOString(),
          source_table: "kanban_fichas",
          historico_movimentacoes: historicoMov
        }
      })
      // Filtro de segurança: Estagiário vê seus próprios atendimentos; Corretor vê os seus e os de estagiários apadrinhados
      let ticketsFinal = formatted
      if (!isGestor && user) {
        if (isThiagoMelloUser) {
          ticketsFinal = formatted.filter(t => {
            const meta = parseMetadata(t.descricao)
            return isThiagoTicket(t, meta)
          })
        } else {
          const uId = String(user.id).trim().toLowerCase()
          const uNome = (perfil?.nome || user.email || "").trim().toLowerCase()
          const isEstagiarioUser = userRole === "Estágio" || userRole === "Estagio"
          const allowedIds = isEstagiarioUser ? [uId] : [uId, ...myEstagiariosIdsList.map(id => String(id).trim().toLowerCase())]

          ticketsFinal = formatted.filter(t => {
            const meta = parseMetadata(t.descricao)
            if (!canViewThiagoTickets && isThiagoTicket(t, meta)) return false

            const tUserId = String(t.user_id || "").trim().toLowerCase()
            const tUserNome = String(t.user_nome || "").trim().toLowerCase()
            const metaCorretorId = String((meta as any).corretor_id || "").trim().toLowerCase()
            const metaOperadorId = String((meta as any).operador_id || "").trim().toLowerCase()
            const metaPadrinhoId = String((meta as any).padrinho_id || "").trim().toLowerCase()
            const metaUserNome = String((meta as any).user_nome || (meta as any).operador_nome || (meta as any).corretor_nome || "").trim().toLowerCase()

            const isOwn = (
              (tUserId && tUserId === uId) ||
              (metaCorretorId && metaCorretorId === uId) ||
              (metaOperadorId && metaOperadorId === uId) ||
              (uNome && tUserNome && (tUserNome === uNome || tUserNome.includes(uNome) || uNome.includes(tUserNome))) ||
              (uNome && metaUserNome && (metaUserNome === uNome || metaUserNome.includes(uNome) || uNome.includes(metaUserNome)))
            )
            if (isOwn) return true

            // Corretores também visualizam atendimentos de seus estagiários apadrinhados
            if (!isEstagiarioUser) {
              const isEstagiarioApadrinhado = (
                (tUserId && allowedIds.includes(tUserId)) ||
                (metaOperadorId && allowedIds.includes(metaOperadorId)) ||
                (metaPadrinhoId && metaPadrinhoId === uId) ||
                (metaCorretorId && metaCorretorId === uId) ||
                (meta.enviado_para_corretor === true && (meta.corretor_id === user.id || meta.corretor_nome === perfil?.nome))
              )
              if (isEstagiarioApadrinhado) return true
            }

            return false
          })
        }
      }

      // Regra de privacidade de Thiago Mello Couto:
      // Apenas Administrador, Desenvolvedor e Operacional podem visualizar os atendimentos do Thiago Mello Couto.
      // Supervisão, Monitoramento, Recursos Humanos e qualquer outro Corretor/Estagiário NÃO podem visualizá-lo.
      if (!canViewThiagoTickets) {
        ticketsFinal = ticketsFinal.filter(t => !isThiagoTicket(t))
      }

      setTickets(ticketsFinal)

      // Recuperação retroativa para fichas que estejam com Valor Operação zerado E pertençam ao PRÓPRIO operador do chamado
      const cpfsComValorZerado = Array.from(new Set(
        formatted
          .filter(t => {
            const op = getValorOperacaoDeAbertura(t)
            return !op.valor || op.valor === "R$ 0,00"
          })
          .map(t => (t.cliente_cpf || "").replace(/\D/g, ""))
          .filter(Boolean)
      ))

      if (cpfsComValorZerado.length > 0) {
        const cpfZeroChunks = chunkArray(cpfsComValorZerado, 100)
        Promise.all(
          cpfZeroChunks.map(chunk =>
            supabase
              .from("chamados")
              .select("id, cliente_cpf, user_id, margem, margem_liquida_5, margem_beneficio_5, valor_operacao, created_at")
              .in("cliente_cpf", chunk)
              .order("created_at", { ascending: false })
          )
        ).then(responses => {
          const chamadosExistentes: any[] = []
          responses.forEach(r => {
            if (r.data) chamadosExistentes.push(...r.data)
          })

          if (chamadosExistentes.length > 0) {
            // Mapeia chamados estritamente pelo par [CPF + USER_ID] para NUNCA herdar dados de outro operador
            const mapaChamadosDoOperador = new Map<string, any>()
            chamadosExistentes.forEach(ch => {
              const cCpf = (ch.cliente_cpf || "").replace(/\D/g, "")
              const uId = ch.user_id ? String(ch.user_id) : ""
              const key = `${cCpf}_${uId}`
              if (cCpf && uId && !mapaChamadosDoOperador.has(key)) {
                mapaChamadosDoOperador.set(key, ch)
              }
            })

            setTickets(prev => {
              let alterou = false
              const atualizados = prev.map(t => {
                const cCpf = (t.cliente_cpf || "").replace(/\D/g, "")
                const tUserId = t.user_id ? String(t.user_id) : ""
                const key = `${cCpf}_${tUserId}`
                // Isolamento rigoroso: somente preenche se o chamado pertencer ao MESMO usuário/operador
                const ch = mapaChamadosDoOperador.get(key)
                if (ch) {
                  const op = getValorOperacaoDeAbertura(t)
                  if (!op.valor || op.valor === "R$ 0,00") {
                    alterou = true
                    return {
                      ...t,
                      margem: (t.margem && t.margem > 0) ? t.margem : (ch.margem || undefined),
                      margem_liquida_5: (t.margem_liquida_5 && t.margem_liquida_5 > 0) ? t.margem_liquida_5 : (ch.margem_liquida_5 || undefined),
                      margem_beneficio_5: (t.margem_beneficio_5 && t.margem_beneficio_5 > 0) ? t.margem_beneficio_5 : (ch.margem_beneficio_5 || undefined),
                      valor_operacao: (t.valor_operacao && t.valor_operacao > 0) 
                        ? t.valor_operacao 
                        : (ch.valor_operacao ? Number(ch.valor_operacao) : undefined)
                    }
                  }
                }
                return t
              })
              return alterou ? atualizados : prev
            })
          }
        }).catch(err => console.warn("Aviso ao buscar chamados para cartões do Kanban:", err))
      }

      // Identificar operadores em atendimento simultâneo para os CPFs presentes no pipeline
      const cpfs = Array.from(new Set(formatted.map(t => (t.cliente_cpf || "").replace(/\D/g, "")).filter(Boolean)))
      if (cpfs.length > 0) {
        try {
          const cpfChunks = chunkArray(cpfs, 100)
          const concorrenciaResponses = await Promise.all(
            cpfChunks.map(chunk =>
              supabase
                .from("kanban_fichas")
                .select("cliente_cpf, operador_nome, etapa")
                .in("cliente_cpf", chunk)
                .neq("etapa", "PERDIDO")
            )
          )

          const map: Record<string, string[]> = {}
          concorrenciaResponses.forEach(r => {
            if (r.data) {
              r.data.forEach(f => {
                const cCpf = (f.cliente_cpf || "").replace(/\D/g, "")
                if (!cCpf) return
                if (!map[cCpf]) map[cCpf] = []
                const nome = (f.operador_nome || "").trim()
                if (nome && !map[cCpf].includes(nome)) {
                  map[cCpf].push(nome)
                }
              })
            }
          })
          setConcorrenciaPorCpf(map)
        } catch (err) {
          console.error("Erro ao verificar operadores em concorrência:", err)
        }

        // Buscar propostas digitadas no banco vinculadas aos CPFs (validação por ADE e DATA DE DIGITAÇÃO isolada por operador)
        try {
          const cpfChunks = chunkArray(cpfs, 100)
          const propostasResponses = await Promise.all(
            cpfChunks.map(chunk =>
              supabase
                .from("propostas")
                .select("id, id_lead, cliente_cpf, ade, data_digitacao, status, corretor_id, corretor, nome_corretor, estagiario_colaborador_id, estagiario_colaborador_nome")
                .in("cliente_cpf", chunk)
                .order("updated_at", { ascending: false })
            )
          )

          const propostasExistentes: any[] = []
          propostasResponses.forEach(r => {
            if (r.data) propostasExistentes.push(...r.data)
          })

          if (propostasExistentes.length > 0) {
            const mapPropsByTicketId: Record<string, { ade?: string; data_digitacao?: string; status?: string }> = {}

            // Atualiza os tickets com o status e informações da proposta bancária estritamente pertencente a este operador
            setTickets(prev => prev.map(t => {
              const cCpf = (t.cliente_cpf || "").replace(/\D/g, "")
              const matchingProp = propostasExistentes.find((p: any) => {
                const pCpf = (p.cliente_cpf || "").replace(/\D/g, "")
                const sameCpf = cCpf && pCpf && cCpf === pCpf
                const sameLead = p.id_lead && String(p.id_lead).trim() === String(t.id).trim()
                if (!sameCpf && !sameLead) return false

                return matchesProposalUser(p, t)
              })

              if (matchingProp) {
                const info = {
                  ade: matchingProp.ade ? String(matchingProp.ade).trim() : undefined,
                  data_digitacao: matchingProp.data_digitacao ? String(matchingProp.data_digitacao).trim() : undefined,
                  status: matchingProp.status ? String(matchingProp.status).trim() : undefined
                }
                mapPropsByTicketId[t.id] = info
                const meta = parseMetadata(t.descricao)
                const inferred = inferKanbanStage(t, meta, info)
                return {
                  ...t,
                  status: inferred,
                  proposta_info: info
                }
              } else {
                const meta = parseMetadata(t.descricao)
                const inferred = inferKanbanStage(t, meta, undefined)
                return {
                  ...t,
                  status: inferred,
                  proposta_info: undefined
                }
              }
            }))
            setPropostasPorCpf(mapPropsByTicketId)
          }
        } catch (propErr) {
          console.warn("Aviso ao carregar propostas para o Kanban:", propErr)
        }
      }
    } catch (err) {
      console.error("Erro ao carregar fichas para o Kanban:", err)
      if (!silent) {
        toast.error("Não foi possível carregar as fichas do Kanban.")
        setTickets([])
      }
    } finally {
      if (!silent) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [isGestor, user, userRole])

  useEffect(() => {
    if (!hasCheckedEnv) return
    if (!canAccessKanban) {
      setIsLoading(false)
      return
    }
    fetchChamados()
  }, [fetchChamados, hasCheckedEnv, canAccessKanban])

  // Sincronização automática em tempo real e em segundo plano (imperceptível para o usuário)
  useEffect(() => {
    if (!hasCheckedEnv || !canAccessKanban) return

    let debounceTimer: NodeJS.Timeout | null = null
    const scheduleSilentRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fetchChamados(true)
      }, 300)
    }

    // 1. Canal Supabase Realtime para kanban_fichas, chamados e propostas (INSERT, UPDATE e DELETE)
    const channelName = `kanban_sync_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kanban_fichas" },
        (payload: any) => {
          // Se for exclusão de cartão pelo banco, remove instantaneamente do estado local
          if (payload?.eventType === "DELETE" && payload?.old?.id) {
            const deletedId = String(payload.old.id)
            setTickets(prev => prev.filter(t => t.id !== deletedId))
          }
          scheduleSilentRefresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chamados" },
        () => {
          scheduleSilentRefresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "propostas" },
        () => {
          scheduleSilentRefresh()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kanban_proximas_acoes" },
        () => {
          fetchProximasAcoes().then(data => setProximasAcoesConfig(data))
        }
      )
      .subscribe()

    // 2. Sincronização ao retornar ou focar na aba (ex: após abrir chamado em outra tela)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        scheduleSilentRefresh()
        fetchProximasAcoes().then(data => {
          if (data && data.length > 0) {
            setProximasAcoesConfig(data)
          }
        })
      }
    }
    window.addEventListener("focus", handleVisibilityOrFocus)
    document.addEventListener("visibilitychange", handleVisibilityOrFocus)

    // 3. Heartbeat periódico silencioso a cada 15 segundos enquanto a aba estiver visível
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchChamados(true)
      }
    }, 15000)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      clearInterval(heartbeatInterval)
      window.removeEventListener("focus", handleVisibilityOrFocus)
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
      supabase.removeChannel(channel)
    }
  }, [hasCheckedEnv, canAccessKanban, fetchChamados])

  // Filtragem dos chamados
  const naoExisteWhatsappTickets = useMemo(() => {
    return tickets.filter(t => {
      if (t.status === "EM ABORDAGEM" || t.status === "EM NEGOCIAÇÃO" || t.status === "EM RETOMADA" || t.status === "EM REATIVAÇÃO" || t.status === "SEM INTERESSE" || t.status === "FECHADO") {
        return false
      }
      const meta = parseMetadata(t.descricao)
      return t.status === "NÃO EXISTE WHATSAPP" || t.status === "NAO_EXISTE_WHATSAPP" || meta.tabulacao_whatsapp === "NAO_EXISTE_WHATSAPP"
    })
  }, [tickets])

  const whatsappDivergenteTickets = useMemo(() => {
    return tickets.filter(t => {
      if (t.status === "EM ABORDAGEM" || t.status === "EM NEGOCIAÇÃO" || t.status === "EM RETOMADA" || t.status === "EM REATIVAÇÃO" || t.status === "SEM INTERESSE" || t.status === "FECHADO") {
        return false
      }
      const meta = parseMetadata(t.descricao)
      return t.status === "WHATSAPP DIVERGENTE" || meta.tabulacao_whatsapp === "WHATSAPP_DIVERGENTE"
    })
  }, [tickets])

  const currentDrawerTickets = useMemo(() => {
    if (selectedDrawer === "NAO_EXISTE") return naoExisteWhatsappTickets
    if (selectedDrawer === "DIVERGENTE") return whatsappDivergenteTickets
    return []
  }, [selectedDrawer, naoExisteWhatsappTickets, whatsappDivergenteTickets])

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const meta = parseMetadata(t.descricao)

      // Se estiver arquivado em uma das gavetas (pela etapa ou metadados), não exibe nas colunas normais do Kanban
      if (
        t.status === "NÃO EXISTE WHATSAPP" ||
        t.status === "NAO_EXISTE_WHATSAPP" ||
        t.status === "WHATSAPP DIVERGENTE" ||
        (Boolean(meta.tabulacao_whatsapp) && t.status !== "EM RETOMADA")
      ) {
        return false
      }

      // Bloqueio de privacidade de Thiago Mello Couto:
      // Somente Administrador, Desenvolvedor e Operacional podem ver atendimentos do Thiago Mello Couto
      if (!canViewThiagoTickets && isThiagoTicket(t, meta)) {
        return false
      }

      // Regras de visibilidade: Thiago vê estritamente os seus; Estágio vê exclusivamente os seus; Corretor vê os seus e os de estagiários apadrinhados
      if (!isGestor && user) {
        if (isThiagoMelloUser) {
          if (!isThiagoTicket(t, meta)) return false
        } else {
          const uId = String(user.id).trim().toLowerCase()
          const uNome = (perfil?.nome || user.email || "").trim().toLowerCase()
          const isEstagiarioUser = userRole === "Estágio" || userRole === "Estagio"
          const tUserId = String(t.user_id || "").trim().toLowerCase()
          const tUserNome = String(t.user_nome || "").trim().toLowerCase()
          const metaCorretorId = String((meta as any).corretor_id || "").trim().toLowerCase()
          const metaOperadorId = String((meta as any).operador_id || "").trim().toLowerCase()
          const metaPadrinhoId = String((meta as any).padrinho_id || "").trim().toLowerCase()
          const metaUserNome = String((meta as any).user_nome || (meta as any).operador_nome || (meta as any).corretor_nome || "").trim().toLowerCase()

          const isOwn = (
            (tUserId && tUserId === uId) ||
            (metaCorretorId && metaCorretorId === uId) ||
            (metaOperadorId && metaOperadorId === uId) ||
            (uNome && tUserNome && (tUserNome === uNome || tUserNome.includes(uNome) || uNome.includes(tUserNome))) ||
            (uNome && metaUserNome && (metaUserNome === uNome || metaUserNome.includes(uNome) || uNome.includes(metaUserNome)))
          )

          if (isOwn) {
            // Atendimento próprio permitido
          } else if (!isEstagiarioUser && (
            (metaPadrinhoId && metaPadrinhoId === uId) ||
            (metaCorretorId && metaCorretorId === uId) ||
            (meta.enviado_para_corretor === true && (meta.corretor_id === user.id || meta.corretor_nome === perfil?.nome))
          )) {
            // Atendimento de estagiário apadrinhado permitido para o corretor
          } else {
            return false
          }
        }
      }

      // Filtro de Responsável (para gestores)
      if (selectedResponsavel !== "ALL") {
        if (t.user_id !== selectedResponsavel && meta.corretor_id !== selectedResponsavel) {
          return false
        }
      }

      // Filtro por Alertas
      if (selectedAlertFilter === "ATRASADO" && !meta.alerta_atrasado) return false
      if (selectedAlertFilter === "ACAO_ESPECIAL" && !meta.acao_especial) return false
      if (selectedAlertFilter === "CONFLITO" && !meta.conflito_titularidade) return false

      // Busca por Nome, CPF ou Telefone
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase().trim()
        const cleanDigits = s.replace(/\D/g, "")
        const nome = (t.cliente_nome || "").toLowerCase()
        const cpfDigits = (t.cliente_cpf || "").replace(/\D/g, "")
        const tel1 = (t.cliente_telefone || "").replace(/\D/g, "")
        const tel2 = (t.cliente_telefone_2 || "").replace(/\D/g, "")

        const matchNome = nome.includes(s)
        const matchCpf = cleanDigits.length > 0 && cpfDigits.includes(cleanDigits)
        const matchTel = cleanDigits.length > 0 && (tel1.includes(cleanDigits) || tel2.includes(cleanDigits))

        if (!matchNome && !matchCpf && !matchTel) return false
      }

      return true
    })
  }, [tickets, selectedResponsavel, selectedAlertFilter, searchTerm])

  // Agrupamento dos chamados pelas 7 colunas
  const groupedColumns = useMemo(() => {
    const map: Record<KanbanStage, TicketItem[]> = {
      "EM ABORDAGEM": [],
      "EM RETOMADA": [],
      "ENTRADA DO SITE": [],
      "EM NEGOCIAÇÃO": [],
      "EM REATIVAÇÃO": [],
      "SEM INTERESSE": [],
      "FECHADO": [],
      "PERDIDO": []
    }

    filteredTickets.forEach(t => {
      const meta = parseMetadata(t.descricao)
      const prop = propostasPorCpf[t.id] || t.proposta_info
      let stage = inferKanbanStage(t, meta, prop)
      if (stage === "EM ABORDAGEM" || (stage as string) === "ENTRADA DO SITE") stage = "EM RETOMADA"
      if (map[stage]) {
        map[stage].push(t)
      } else {
        map["EM RETOMADA"].push(t)
      }
    })

    return map
  }, [filteredTickets, propostasPorCpf])

  // Totais Gerais para o Dashboard superior
  const metrics = useMemo(() => {
    let totalValor = 0
    let totalAtrasados = 0
    let totalAcaoEspecial = 0
    let totalConflitos = 0
    let totalFechados = groupedColumns["FECHADO"].length

    filteredTickets.forEach(t => {
      const meta = parseMetadata(t.descricao)
      const opData = getValorOperacaoDeAbertura(t)
      const opNum = parseValorToNumber(opData.valor)
      const val = opNum > 0 ? opNum : Number(t.valor_operacao || t.margem || 0)
      totalValor += val
      if (meta.alerta_atrasado) totalAtrasados++
      if (meta.acao_especial) totalAcaoEspecial++
      if (meta.conflito_titularidade) totalConflitos++
    })

    return {
      totalLeads: filteredTickets.length,
      totalValor,
      totalAtrasados,
      totalAcaoEspecial,
      totalConflitos,
      totalFechados
    }
  }, [filteredTickets, groupedColumns])

  // Copiar para clipboard
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado com sucesso!`)
  }

  // Toggle revelação geral dos dados mascarados do card (CPF e Telefones juntos)
  const toggleRevealCard = (ticketId: string) => {
    const isCurrentlyRevealed = Boolean(revealedCpfs[ticketId] || revealedPhones[ticketId])
    const nextVal = !isCurrentlyRevealed
    setRevealedCpfs(prev => ({ ...prev, [ticketId]: nextVal }))
    setRevealedPhones(prev => ({ ...prev, [ticketId]: nextVal }))
  }

  // Toggle revelação do CPF
  const toggleRevealCpf = (ticketId: string) => {
    setRevealedCpfs(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }))
  }

  // Toggle revelação do Telefone
  const toggleRevealPhone = (ticketId: string) => {
    setRevealedPhones(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }))
  }

  // Ação Rápida: WhatsApp
  const handleOpenWhatsApp = async (ticket: TicketItem) => {
    const rawPhone = ticket.cliente_telefone || ticket.cliente_telefone_2 || ""
    const cleanDigits = rawPhone.replace(/\D/g, "")
    if (!cleanDigits) {
      toast.error("Cliente não possui número de telefone informado.")
      return
    }

    const meta = parseMetadata(ticket.descricao)
    const stage = inferKanbanStage(ticket, meta)
    const nomeCliente = ticket.cliente_nome?.split(" ")[0] || "Cliente"
    const nomeUsuario = perfil?.nome || "Representante SharkConsig"

    let defaultMsg = `Olá, ${nomeCliente}! Tudo bem? Aqui é o ${nomeUsuario} da Acerto Fácil.`
    if (stage === "EM ABORDAGEM") {
      defaultMsg = `Olá, ${nomeCliente}! Tudo bem? Aqui é o ${nomeUsuario} da Acerto Fácil. Tenho ótimas novidades sobre sua margem de crédito disponível. Podemos conversar um instante? 🦈`
    } else if (stage === "EM RETOMADA") {
      defaultMsg = `Olá, ${nomeCliente}! Passando para dar continuidade à simulação especial de crédito consignado que calculamos para você. Consegue dar uma olhada na proposta agora? 🦈`
    } else if (stage === "EM NEGOCIAÇÃO") {
      defaultMsg = `Olá, ${nomeCliente}! Estou com a sua simulação ajustada e os melhores prazos aprovados. Faltam apenas alguns detalhes para formalizarmos. Posso te enviar o resumo? 🦈`
    } else if (stage === "EM REATIVAÇÃO") {
      defaultMsg = `Olá, ${nomeCliente}! Tudo bem? Tentei contato anteriormente e reservei sua condição exclusiva antes que a tabela atualize. Tem 2 minutinhos para falarmos? 🦈`
    } else if (stage === "SEM INTERESSE") {
      defaultMsg = `Olá, ${nomeCliente}! Agradeço sua atenção. Salvei seu contato e, caso precise de qualquer apoio financeiro futuro, conte com a nossa equipe da Acerto Fácil!`
    }

    const url = `https://wa.me/55${cleanDigits}?text=${encodeURIComponent(defaultMsg)}`
    window.open(url, "_blank")

    // Registrar no histórico
    if (user) {
      try {
        await supabase.from("mensagens_chamado").insert({
          chamado_id: parseInt(ticket.id, 10),
          user_id: user.id,
          user_nome: perfil?.nome || "Colaborador",
          user_role: perfil?.role || "Corretor",
          user_avatar: perfil?.avatar_url || null,
          content: `📱 Contato via WhatsApp iniciado pelo operador com mensagem padrão da etapa [${stage}].`,
          action: "whatsapp_click"
        })
      } catch (err) {
        console.error("Erro ao registrar log de WhatsApp:", err)
      }
    }
  }

  // Ação Rápida: Ligar (Discadora / Registro de Ligação)
  const handleOpenCallFeedback = (ticket: TicketItem) => {
    setCallFeedbackTicket(ticket)
  }

  const handleRegisterCallResult = async (resultado: string) => {
    if (!callFeedbackTicket || !user) return
    try {
      const meta = parseMetadata(callFeedbackTicket.descricao)
      const stage = inferKanbanStage(callFeedbackTicket, meta)
      const agora = new Date()

      // Registrar mensagem no histórico auditável
      await supabase.from("mensagens_chamado").insert({
        chamado_id: parseInt(callFeedbackTicket.id, 10),
        user_id: user.id,
        user_nome: perfil?.nome || "Colaborador",
        user_role: perfil?.role || "Corretor",
        user_avatar: perfil?.avatar_url || null,
        content: `📞 Tentativa de Ligação registrada: [${resultado}]. Realizada em ${format(agora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`,
        action: "ligacao_resultado"
      })

      toast.success(`Ligação registrada: ${resultado}!`)
      setCallFeedbackTicket(null)
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao registrar chamada:", err)
      toast.error("Erro ao registrar tentativa de ligação.")
    }
  }

  // Ação Rápida: Agendar Retorno
  const handleOpenAgendar = (ticket: TicketItem) => {
    setAgendarModalTicket(ticket)
    setAgendamentoData(format(new Date(), "yyyy-MM-dd"))
    setAgendamentoHora("14:30")
    setAgendamentoObs("")
  }

  const handleConfirmAgendamento = async () => {
    if (!agendarModalTicket || !user) return
    try {
      const meta = parseMetadata(agendarModalTicket.descricao)
      const nowIso = new Date().toISOString()
      const dataHoraIso = `${agendamentoData}T${agendamentoHora || "14:30"}:00`
      let dataFormatada = ""
      try {
        dataFormatada = `${format(new Date(dataHoraIso), "dd/MM 'às' HH:mm")}`
      } catch {
        dataFormatada = `${agendamentoData} às ${agendamentoHora || "14:30"}`
      }

      // Montar texto da observação de agendamento junto com as demais observações
      const textoObsAgendamento = agendamentoObs.trim()
      const registroAgendamentoTexto = textoObsAgendamento
        ? `📅 Retorno agendado para ${dataFormatada} - ${textoObsAgendamento}`
        : `📅 Retorno agendado para ${dataFormatada}`

      // Recuperar histórico de observações existente para não sobrescrever e evitar duplicação
      const historicoExistente: Array<{ texto: string; data: string; autor?: string }> = []
      const seenTexts = new Set<string>()

      if (Array.isArray(meta.observacoes_historico)) {
        meta.observacoes_historico.forEach((item: any) => {
          if (item && isUserObservation(item.texto)) {
            const partes = String(item.texto).trim().split(/\n\s*\n/)
            partes.forEach(p => {
              const trimmed = p.trim()
              const key = trimmed.toLowerCase().replace(/\s+/g, " ")
              if (trimmed && isUserObservation(trimmed) && !seenTexts.has(key)) {
                seenTexts.add(key)
                historicoExistente.push({
                  texto: trimmed,
                  data: item.data || nowIso,
                  autor: item.autor
                })
              }
            })
          }
        })
      }

      const cleanObsAnterior = (agendarModalTicket.descricao || "")
        .replace(/<!-- TICKET_METADATA: ([\s\S]*?) -->/g, "")
        .trim()
      if (isUserObservation(cleanObsAnterior)) {
        const blocos = cleanObsAnterior.split(/\n\s*\n/)
        blocos.forEach(b => {
          const trimmed = b.trim()
          const key = trimmed.toLowerCase().replace(/\s+/g, " ")
          if (trimmed && isUserObservation(trimmed) && !seenTexts.has(key)) {
            seenTexts.add(key)
            historicoExistente.push({
              texto: trimmed,
              data: meta.observacao_data || agendarModalTicket.updated_at || nowIso
            })
          }
        })
      }

      // Adicionar novo registro de agendamento ao histórico sem duplicidade
      const keyNovoAgendamento = registroAgendamentoTexto.toLowerCase().replace(/\s+/g, " ")
      let updatedHistoricoObs = [...historicoExistente]
      if (!seenTexts.has(keyNovoAgendamento)) {
        updatedHistoricoObs.push({
          texto: registroAgendamentoTexto,
          data: nowIso,
          autor: perfil?.nome || "Colaborador"
        })
      }

      const observacoesAcumuladas = updatedHistoricoObs
        .slice()
        .reverse()
        .map(item => item.texto.trim())
        .filter(Boolean)
        .join("\n\n")

      const updatedMeta: TicketMetadata = {
        ...meta,
        proxima_acao: `[Agendado] Retornar contato com cliente`,
        vencimento_acao: dataHoraIso,
        agendamento_data: dataHoraIso,
        agendamento_obs: agendamentoObs,
        observacoes_historico: updatedHistoricoObs,
        observacao_data: nowIso,
        alerta_atrasado: false
      }

      const newDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)
      if (agendarModalTicket.source_table === "kanban_fichas" || !/^\d+$/.test(agendarModalTicket.id)) {
        const metaParaSalvar = { ...updatedMeta }
        delete (metaParaSalvar as any).historico_kanban
        delete (metaParaSalvar as any).historico_movimentacoes
        const { error } = await supabase
          .from("kanban_fichas")
          .update({
            observacoes: observacoesAcumuladas,
            metadata: metaParaSalvar,
            updated_at: nowIso
          })
          .eq("id", agendarModalTicket.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("chamados")
          .update({ 
            descricao: newDesc,
            updated_at: nowIso
          })
          .eq("id", agendarModalTicket.id)

        if (error) throw error

        const numId = parseInt(agendarModalTicket.id, 10)
        if (!isNaN(numId)) {
          await supabase.from("mensagens_chamado").insert({
            chamado_id: numId,
            user_id: user.id,
            user_nome: perfil?.nome || "Colaborador",
            user_role: perfil?.role || "Corretor",
            user_avatar: perfil?.avatar_url || null,
            content: `📅 Retorno agendado para ${dataFormatada}. Observação: ${agendamentoObs || "Sem observações adicionais."}`,
            action: "retorno_agendado"
          })
        }
      }

      agendarModalTicket.descricao = newDesc
      if (atendimentoModalTicket && atendimentoModalTicket.id === agendarModalTicket.id) {
        setAtendimentoModalTicket(prev => prev ? {
          ...prev,
          descricao: newDesc
        } : null)
      }

      toast.success(`Retorno agendado para ${dataFormatada}!`)
      setAgendamentoObs("")
      setAgendarModalTicket(null)
      fetchChamados(true)
    } catch (err: any) {
      console.error("Erro ao agendar retorno:", err?.message || err)
      toast.error("Não foi possível salvar o agendamento.")
    }
  }

  // Execução unificada da mudança de etapa
  const executarMoverEtapa = async (
    ticket: TicketItem,
    destinoEtapa: KanbanStage,
    motivo?: string
  ) => {
    if (!ticket || !user) return
    try {
      const meta = parseMetadata(ticket.descricao)
      const etapaAtual = inferKanbanStage(ticket, meta)

      if (destinoEtapa === etapaAtual) {
        toast.info("O chamado já se encontra nesta etapa.")
        return
      }

      // Próxima ação e vencimento padrão da nova etapa (obtidos dinamicamente das configurações)
      const acaoConfig = proximasAcoesConfig.find(a => a.ativo && (a.etapa_kanban === destinoEtapa || (destinoEtapa === "ENTRADA DO SITE" && a.etapa_kanban === "EM ABORDAGEM")))
      let proximaAcaoPadrao = acaoConfig?.titulo || ""
      if (!proximaAcaoPadrao) {
        if (destinoEtapa === "ENTRADA DO SITE") proximaAcaoPadrao = "Fazer primeiro contato com lead do site"
        else if (destinoEtapa === "EM RETOMADA" || destinoEtapa === "EM ABORDAGEM") proximaAcaoPadrao = "Enviar Régua de Retomada 1"
        else if (destinoEtapa === "EM NEGOCIAÇÃO") proximaAcaoPadrao = "Enviar simulação e recolher documentos"
        else if (destinoEtapa === "EM REATIVAÇÃO") proximaAcaoPadrao = "Resgatar oportunidade esfriada"
        else if (destinoEtapa === "SEM INTERESSE") proximaAcaoPadrao = "Cadência de Longo Prazo / Nutrição"
        else if (destinoEtapa === "FECHADO") proximaAcaoPadrao = "Proposta Digitada e Formalizada"
        else if (destinoEtapa === "PERDIDO") proximaAcaoPadrao = "Atendimento Encerrado"
      }

      const vencimentoCalculado = acaoConfig 
        ? calcularVencimentoComSla(acaoConfig.sla_minutos, acaoConfig.apenas_dias_uteis).toISOString()
        : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

      const isSaindoDeSemInteresse = destinoEtapa !== "SEM INTERESSE"
      const cleanObs = (ticket.descricao || "")
        .replace(/<!-- TICKET_METADATA: ([\s\S]*?) -->/g, "")
        .trim()
      const deveLimparSemInteresse = isSaindoDeSemInteresse && cleanObs === "Sem interesse"
      const novaObservacao = deveLimparSemInteresse ? "" : cleanObs

      const historicoAtual = Array.isArray(ticket.historico_movimentacoes)
        ? ticket.historico_movimentacoes
        : (Array.isArray(meta.historico_kanban) ? meta.historico_kanban : [])

      const novaMovimentacao = {
        data: new Date().toISOString(),
        etapa_anterior: etapaAtual,
        etapa_nova: destinoEtapa,
        autor: perfil?.nome || "Usuário",
        motivo: motivo || undefined
      }

      const novoHistorico = [...historicoAtual, novaMovimentacao]

      const updatedMeta: TicketMetadata = {
        ...meta,
        kanban_stage: destinoEtapa,
        proxima_acao: proximaAcaoPadrao,
        vencimento_acao: vencimentoCalculado,
        alerta_atrasado: false,
        historico_kanban: novoHistorico
      }

      const newDesc = stringifyWithMetadata(novaObservacao, updatedMeta)
      
      if (ticket.source_table === "kanban_fichas") {
        // Gravar na coluna historico_movimentacoes e NÃO na coluna metadata
        const metaParaSalvar = { ...updatedMeta }
        delete (metaParaSalvar as any).historico_kanban
        delete (metaParaSalvar as any).historico_movimentacoes

        const updatePayload: any = {
          etapa: destinoEtapa,
          historico_movimentacoes: novoHistorico,
          metadata: metaParaSalvar,
          updated_at: new Date().toISOString()
        }
        if (deveLimparSemInteresse) {
          updatePayload.observacoes = ""
        }

        const { error } = await supabase
          .from("kanban_fichas")
          .update(updatePayload)
          .eq("id", ticket.id)

        if (error) throw error
        ticket.historico_movimentacoes = novoHistorico
      } else {
        const { error } = await supabase
          .from("chamados")
          .update({
            descricao: newDesc,
            updated_at: new Date().toISOString()
          })
          .eq("id", ticket.id)

        if (error) throw error

        await supabase.from("mensagens_chamado").insert({
          chamado_id: parseInt(ticket.id, 10),
          user_id: user.id,
          user_nome: perfil?.nome || "Colaborador",
          user_role: perfil?.role || "Corretor",
          user_avatar: perfil?.avatar_url || null,
          content: `➡️ Etapa alterada no Kanban: [${etapaAtual}] ➔ [${destinoEtapa}]. ${motivo ? `Motivo: ${motivo}` : ""}`,
          action: "etapa_kanban_change"
        })
      }

      if (atendimentoModalTicket && atendimentoModalTicket.id === ticket.id) {
        if (deveLimparSemInteresse) {
          setOpcaoSelecionada("")
        }
        setAtendimentoModalTicket(prev => prev ? {
          ...prev,
          status: destinoEtapa,
          descricao: newDesc,
          historico_movimentacoes: novoHistorico
        } : null)
      }

      toast.success(`Ficha movida para "${destinoEtapa}"!`)
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao mover etapa:", err)
      toast.error("Erro ao mover a ficha de etapa.")
    }
  }

  // Ação Manual via Botão: Abre o Modal "Mover Etapa Comercial"
  const handleOpenMoverEtapa = (ticket: TicketItem, etapaDestino?: KanbanStage) => {
    const meta = parseMetadata(ticket.descricao)
    const current = inferKanbanStage(ticket, meta)
    setMoverModalTicket(ticket)
    setNovaEtapaSelecionada(etapaDestino || current)
    setMotivoMudancaEtapa("")
  }

  // Confirmação via Modal
  const handleConfirmMoverEtapa = async () => {
    if (!moverModalTicket) return
    const ticket = moverModalTicket
    const destino = novaEtapaSelecionada
    const motivo = motivoMudancaEtapa
    setMoverModalTicket(null)
    await executarMoverEtapa(ticket, destino, motivo)
  }

  // Excluir card/ficha do Kanban
  const [isDeletingTicket, setIsDeletingTicket] = useState(false)
  const handleDeleteTicket = async (ticket: TicketItem) => {
    if (!window.confirm(`Deseja realmente remover o atendimento de "${ticket.cliente_nome}" do Kanban?`)) {
      return
    }

    setIsDeletingTicket(true)
    try {
      if (ticket.source_table === "kanban_fichas") {
        const { error } = await supabase
          .from("kanban_fichas")
          .delete()
          .eq("id", ticket.id)

        if (error) throw error
      } else {
        // Tentar remover de chamados se for teste ou remover flag
        const { error } = await supabase
          .from("chamados")
          .delete()
          .eq("id", ticket.id)

        if (error) {
          // Se houver FK em mensagens_chamado, desvincular do kanban
          const meta = parseMetadata(ticket.descricao)
          delete meta.iniciado_no_kanban
          delete meta.origem_kanban
          await supabase
            .from("chamados")
            .update({
              origem: "SISTEMA",
              descricao: stringifyWithMetadata(ticket.descricao, meta),
              updated_at: new Date().toISOString()
            })
            .eq("id", ticket.id)
        }
      }

      setTickets(prev => prev.filter(t => t.id !== ticket.id))
      toast.success("Ficha removida com sucesso!")
    } catch (err) {
      console.error("Erro ao remover ficha:", err)
      // Remoção otimista do estado caso seja teste local ou sem persistência
      setTickets(prev => prev.filter(t => t.id !== ticket.id))
      toast.success("Ficha removida do Kanban!")
    } finally {
      setIsDeletingTicket(false)
    }
  }

  // Abrir Modal ao Clicar no Card:
  // Abre a Modal de Atendimento Comercial para todos os perfis (com acesso à gestão para gestores)
  const handleCardClick = (ticket: TicketItem) => {
    setAtendimentoModalTicket(ticket)
    setAtendimentoMensagem("")
    loadHistoricoChamado(ticket.id)
    if (isGestor) {
      const meta = parseMetadata(ticket.descricao)
      setSupervisaoNovoResponsavel(ticket.user_id || "")
      setSupervisaoMotivoTransbordo("")
      setSupervisaoNovaPrioridade(meta.prioridade || "NORMAL")
    }
  }

  const loadHistoricoChamado = async (chamadoId: string) => {
    setIsLoadingHistorico(true)
    try {
      const { data, error } = await supabase
        .from("mensagens_chamado")
        .select("*")
        .eq("chamado_id", parseInt(chamadoId, 10))
        .order("created_at", { ascending: false })
      if (!error && data) {
        setHistoricoMensagens(data)
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err)
    } finally {
      setIsLoadingHistorico(false)
    }
  }

  // Enviar anotação na Modal de Atendimento (exclusivamente na tabela kanban_fichas)
  const handleSaveAtendimentoInteracao = async (acaoTipo = "registro_contato") => {
    if (!atendimentoModalTicket || !user || !atendimentoMensagem.trim()) {
      toast.warning("Digite uma mensagem ou observação do contato.")
      return
    }
    setIsSubmittingAtendimento(true)
    const nowIso = new Date().toISOString()
    try {
      // Atualizar exclusivamente na tabela kanban_fichas na coluna observacoes
      const currentMeta = parseMetadata(atendimentoModalTicket.descricao)

      // Recuperar histórico de observações existente para não sobrescrever (follow-up)
      const historicoExistente: Array<{ texto: string; data: string; autor?: string }> = []
      const seenTexts = new Set<string>()

      if (Array.isArray(currentMeta.observacoes_historico)) {
        currentMeta.observacoes_historico.forEach((item: any) => {
          if (item && isUserObservation(item.texto)) {
            const partes = String(item.texto).trim().split(/\n\s*\n/)
            partes.forEach(p => {
              const trimmed = p.trim()
              const key = trimmed.toLowerCase().replace(/\s+/g, " ")
              if (trimmed && isUserObservation(trimmed) && !seenTexts.has(key)) {
                seenTexts.add(key)
                historicoExistente.push({
                  texto: trimmed,
                  data: item.data || nowIso,
                  autor: item.autor
                })
              }
            })
          }
        })
      }

      // Se havia alguma observação anterior que ainda não estava no array
      const cleanObsAnterior = (atendimentoModalTicket.descricao || "")
        .replace(/<!-- TICKET_METADATA: ([\s\S]*?) -->/g, "")
        .trim()
      if (isUserObservation(cleanObsAnterior)) {
        const blocos = cleanObsAnterior.split(/\n\s*\n/)
        blocos.forEach(b => {
          const trimmed = b.trim()
          const key = trimmed.toLowerCase().replace(/\s+/g, " ")
          if (trimmed && isUserObservation(trimmed) && !seenTexts.has(key)) {
            seenTexts.add(key)
            historicoExistente.push({
              texto: trimmed,
              data: currentMeta.observacao_data || atendimentoModalTicket.updated_at || nowIso
            })
          }
        })
      }

      // Adicionar nova observação ao histórico acumulado
      const novaObsItem = {
        texto: atendimentoMensagem.trim(),
        data: nowIso,
        autor: perfil?.nome || "Colaborador"
      }
      const updatedHistoricoObs = [...historicoExistente, novaObsItem]

      // Na coluna observacoes de kanban_fichas, manter o histórico unificado sem duplicações
      const observacoesAcumuladas = updatedHistoricoObs
        .slice()
        .reverse()
        .map(item => item.texto.trim())
        .filter(Boolean)
        .join("\n\n")

      const updatedMeta: TicketMetadata = {
        ...currentMeta,
        observacoes_historico: updatedHistoricoObs,
        observacao_data: nowIso
      }

      const metaParaSalvar = { ...updatedMeta }
      delete (metaParaSalvar as any).historico_kanban
      delete (metaParaSalvar as any).historico_movimentacoes

      await supabase
        .from("kanban_fichas")
        .update({
          observacoes: observacoesAcumuladas,
          metadata: metaParaSalvar,
          updated_at: nowIso
        })
        .eq("id", atendimentoModalTicket.id)

      const novaDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)
      atendimentoModalTicket.descricao = novaDesc
      setAtendimentoModalTicket(prev => prev ? {
        ...prev,
        descricao: novaDesc
      } : null)

      toast.success("Observação registrada na ficha com sucesso!")
      setAtendimentoMensagem("")
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao salvar observação:", err)
      toast.error("Erro ao salvar observação.")
    } finally {
      setIsSubmittingAtendimento(false)
    }
  }

  // Solicitação de Ação Especial na Modal de Atendimento
  const handleSolicitarAcaoEspecial = async () => {
    if (!atendimentoModalTicket || !user) return
    const textoAcao = acaoEspecialTexto.trim()
    if (!textoAcao) {
      toast.warning("Descreva a ação necessária para a solicitação.")
      return
    }

    setIsSubmittingAcaoEspecial(true)
    const nowIso = new Date().toISOString()
    const destinatarioFinal = acaoEspecialDestinatario || (destinatariosAcaoEspecial.length > 0 ? destinatariosAcaoEspecial[0].nome : "Equipe Responsável")
    const registroTexto = `⚡ SOLICITAÇÃO DE AÇÃO ESPECIAL para ${destinatarioFinal}: ${textoAcao}`

    try {
      const currentMeta = parseMetadata(atendimentoModalTicket.descricao)

      // 1. Manter histórico de observações acumuladas na ficha sem duplicações
      const historicoExistente: Array<{ texto: string; data: string; autor?: string }> = []
      const seenTexts = new Set<string>()

      if (Array.isArray(currentMeta.observacoes_historico)) {
        currentMeta.observacoes_historico.forEach((item: any) => {
          if (item && isUserObservation(item.texto)) {
            const partes = String(item.texto).trim().split(/\n\s*\n/)
            partes.forEach(p => {
              const trimmed = p.trim()
              const key = trimmed.toLowerCase().replace(/\s+/g, " ")
              if (trimmed && isUserObservation(trimmed) && !seenTexts.has(key)) {
                seenTexts.add(key)
                historicoExistente.push({
                  texto: trimmed,
                  data: item.data || nowIso,
                  autor: item.autor
                })
              }
            })
          }
        })
      }

      const cleanObsAnterior = (atendimentoModalTicket.descricao || "")
        .replace(/<!-- TICKET_METADATA: ([\s\S]*?) -->/g, "")
        .trim()
      if (isUserObservation(cleanObsAnterior)) {
        const blocos = cleanObsAnterior.split(/\n\s*\n/)
        blocos.forEach(b => {
          const trimmed = b.trim()
          const key = trimmed.toLowerCase().replace(/\s+/g, " ")
          if (trimmed && isUserObservation(trimmed) && !seenTexts.has(key)) {
            seenTexts.add(key)
            historicoExistente.push({
              texto: trimmed,
              data: currentMeta.observacao_data || atendimentoModalTicket.updated_at || nowIso
            })
          }
        })
      }

      const novaObsItem = {
        texto: registroTexto,
        data: nowIso,
        autor: perfil?.nome || user?.email || "Colaborador"
      }
      const updatedHistoricoObs = [...historicoExistente, novaObsItem]

      const observacoesAcumuladas = updatedHistoricoObs
        .slice()
        .reverse()
        .map(item => item.texto.trim())
        .filter(Boolean)
        .join("\n\n")

      const updatedMeta: TicketMetadata = {
        ...currentMeta,
        acao_especial: true,
        acao_especial_status: "pendente",
        acao_especial_motivo: textoAcao,
        acao_especial_destinatario: destinatarioFinal,
        acao_especial_solicitante: perfil?.nome || user?.user_metadata?.nome || user?.email || "Colaborador",
        acao_especial_etapa_origem: atendimentoModalTicket.status || currentMeta.kanban_stage || "EM RETOMADA",
        acao_especial_atendida: false,
        observacoes_historico: updatedHistoricoObs,
        observacao_data: nowIso
      }

      if (atendimentoModalTicket.source_table === "kanban_fichas" || !/^\d+$/.test(atendimentoModalTicket.id)) {
        const metaParaSalvar = { ...updatedMeta }
        delete (metaParaSalvar as any).historico_kanban
        delete (metaParaSalvar as any).historico_movimentacoes

        const { error } = await supabase
          .from("kanban_fichas")
          .update({
            observacoes: observacoesAcumuladas,
            metadata: metaParaSalvar,
            updated_at: nowIso
          })
          .eq("id", atendimentoModalTicket.id)

        if (error) throw error
      } else {
        const newDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)
        const { error } = await supabase
          .from("chamados")
          .update({
            descricao: newDesc,
            updated_at: nowIso
          })
          .eq("id", atendimentoModalTicket.id)

        if (error) throw error

        const numId = parseInt(atendimentoModalTicket.id, 10)
        if (!isNaN(numId)) {
          await supabase.from("mensagens_chamado").insert({
            chamado_id: numId,
            user_id: user.id,
            user_nome: perfil?.nome || "Colaborador",
            user_role: perfil?.role || "Corretor",
            user_avatar: perfil?.avatar_url || null,
            content: `⚡ Ação Especial solicitada para [${destinatarioFinal}]: ${textoAcao}`,
            action: "acao_especial_solicitada"
          })
        }
      }

      const novaDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)
      atendimentoModalTicket.descricao = novaDesc

      setAtendimentoModalTicket(prev => prev ? {
        ...prev,
        descricao: novaDesc
      } : null)

      setTickets(prev => prev.map(t => {
        if (t.id === atendimentoModalTicket.id) {
          return {
            ...t,
            descricao: novaDesc
          }
        }
        return t
      }))

      toast.success(`Ação Especial solicitada com sucesso para ${destinatarioFinal}!`)
      setIsAcaoEspecialModalOpen(false)
      setAcaoEspecialTexto("")
      fetchChamados(true)
    } catch (err: any) {
      console.error("Erro ao solicitar ação especial:", err?.message || err)
      toast.error("Erro ao solicitar ação especial.")
    } finally {
      setIsSubmittingAcaoEspecial(false)
    }
  }

  // Conclusão / Atendimento da Ação Especial (Muda status, retorna o cartão à etapa de origem e atualiza para verde 'Ação solicitada por {nome}')
  const handleAtenderAcaoEspecial = async () => {
    if (!atendimentoModalTicket || !user) return
    setIsSubmittingAcaoEspecial(true)
    const nowIso = new Date().toISOString()
    try {
      const currentMeta = parseMetadata(atendimentoModalTicket.descricao)
      const solicitante = currentMeta.acao_especial_solicitante || (() => {
        const obsLista = Array.isArray(currentMeta.observacoes_historico) ? currentMeta.observacoes_historico : []
        for (const item of obsLista.slice().reverse()) {
          const txt = String(item?.texto || "")
          if (txt.includes("SOLICITAÇÃO DE AÇÃO ESPECIAL")) {
            return item?.autor || null
          }
        }
        return atendimentoModalTicket.responsavel_nome || atendimentoModalTicket.user_nome || "Colaborador"
      })()

      const etapaRetorno = (currentMeta.acao_especial_etapa_origem as KanbanStage) || (atendimentoModalTicket.status as KanbanStage) || currentMeta.kanban_stage || "EM RETOMADA"
      const quemAtendeu = perfil?.nome || user?.user_metadata?.nome || user?.email || "Supervisão"
      const registroAtendimentoTexto = `✅ AÇÃO ESPECIAL ATENDIDA por ${quemAtendeu}: Solicitação de ${solicitante} atendida e cartão retornado para a etapa "${etapaRetorno}".`

      const historicoExistente: Array<{ texto: string; data: string; autor?: string }> = []
      if (Array.isArray(currentMeta.observacoes_historico)) {
        historicoExistente.push(...currentMeta.observacoes_historico)
      }
      const novaObs = {
        texto: registroAtendimentoTexto,
        data: nowIso,
        autor: quemAtendeu
      }
      const updatedHistorico = [...historicoExistente, novaObs]
      const observacoesAcumuladas = updatedHistorico.slice().reverse().map(i => i.texto.trim()).filter(Boolean).join("\n\n")

      const updatedMeta: TicketMetadata = {
        ...currentMeta,
        acao_especial: false,
        acao_especial_status: "concluido",
        acao_especial_atendida: true,
        acao_especial_atendido_por: quemAtendeu,
        acao_especial_atendido_em: nowIso,
        acao_especial_solicitante: solicitante,
        kanban_stage: etapaRetorno,
        observacoes_historico: updatedHistorico,
        observacao_data: nowIso
      }

      if (atendimentoModalTicket.source_table === "kanban_fichas" || !/^\d+$/.test(atendimentoModalTicket.id)) {
        const metaParaSalvar = { ...updatedMeta }
        delete (metaParaSalvar as any).historico_kanban
        delete (metaParaSalvar as any).historico_movimentacoes

        const { error } = await supabase
          .from("kanban_fichas")
          .update({
            etapa: etapaRetorno,
            observacoes: observacoesAcumuladas,
            metadata: metaParaSalvar,
            updated_at: nowIso
          })
          .eq("id", atendimentoModalTicket.id)
        if (error) throw error
      } else {
        const newDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)
        const { error } = await supabase
          .from("chamados")
          .update({
            status: etapaRetorno,
            descricao: newDesc,
            updated_at: nowIso
          })
          .eq("id", atendimentoModalTicket.id)
        if (error) throw error

        const numId = parseInt(atendimentoModalTicket.id, 10)
        if (!isNaN(numId)) {
          await supabase.from("mensagens_chamado").insert({
            chamado_id: numId,
            user_id: user.id,
            user_nome: quemAtendeu,
            user_role: perfil?.role || "Supervisor",
            user_avatar: perfil?.avatar_url || null,
            content: `✅ Ação Especial atendida por ${quemAtendeu}. Cartão de atendimento retornado para a etapa "${etapaRetorno}".`,
            action: "acao_especial_concluida"
          })
        }
      }

      const newDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)
      atendimentoModalTicket.descricao = newDesc
      atendimentoModalTicket.status = etapaRetorno

      setAtendimentoModalTicket(prev => prev ? {
        ...prev,
        status: etapaRetorno,
        descricao: newDesc
      } : null)

      setTickets(prev => prev.map(t => {
        if (t.id === atendimentoModalTicket.id) {
          return {
            ...t,
            status: etapaRetorno,
            descricao: newDesc
          }
        }
        return t
      }))

      toast.success("Ação Especial atendida com sucesso! Cartão retornado para a coluna original.")
      fetchChamados(true)
    } catch (err: any) {
      console.error("Erro ao atender ação especial:", err?.message || err)
      toast.error("Erro ao marcar ação especial como atendida.")
    } finally {
      setIsSubmittingAcaoEspecial(false)
    }
  }

  // ==========================================
  // HANDLERS DO MOTOR DE CADÊNCIA (A0, RT1-RT6, RE1-RE3)
  // ==========================================
  const handleAvancarCadencia = async () => {
    if (!atendimentoModalTicket || !user) return
    setIsAvancandoCadencia(true)
    const now = new Date()
    const nowIso = now.toISOString()
    const currentMeta = parseMetadata(atendimentoModalTicket.descricao)
    const cadencia = getLeadCadenceState(atendimentoModalTicket, currentMeta)
    
    const nextAction = calculateNextCadenceDue(cadencia.etapaRegua, cadencia.tipo, now)
    const nextDueFormatted = format(nextAction.dueDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    const obsTexto = `📲 ${formatEtapaLabel(cadencia.etapaRegua)} confirmada via WhatsApp. Próxima ação: ${nextAction.actionText} agendada para ${nextDueFormatted}.`

    try {
      const historicoExistente: Array<{ texto: string; data: string; autor?: string }> = []
      if (Array.isArray(currentMeta.observacoes_historico)) {
        historicoExistente.push(...currentMeta.observacoes_historico)
      }
      const novaObsItem = {
        texto: obsTexto,
        data: nowIso,
        autor: perfil?.nome || user?.email || "Colaborador"
      }
      const updatedHistorico = [...historicoExistente, novaObsItem]
      const observacoesAcumuladas = updatedHistorico.slice().reverse().map(i => i.texto.trim()).filter(Boolean).join("\n\n")

      const updatedMeta: TicketMetadata = {
        ...currentMeta,
        cadencia_tipo: cadencia.tipo,
        regua_etapa: nextAction.nextStage,
        regua_proximo_vencimento: nextAction.dueDate.toISOString(),
        vencimento_acao: nextAction.dueDate.toISOString(),
        proxima_acao: nextAction.actionText,
        regua_ultima_execucao: nowIso,
        regua_pausada: false,
        cliente_respondeu: false,
        observacoes_historico: updatedHistorico,
        observacao_data: nowIso
      }

      if (atendimentoModalTicket.source_table === "kanban_fichas" || !/^\d+$/.test(atendimentoModalTicket.id)) {
        const metaParaSalvar = { ...updatedMeta }
        delete (metaParaSalvar as any).historico_kanban
        delete (metaParaSalvar as any).historico_movimentacoes

        const { error } = await supabase
          .from("kanban_fichas")
          .update({
            observacoes: observacoesAcumuladas,
            metadata: metaParaSalvar,
            updated_at: nowIso
          })
          .eq("id", atendimentoModalTicket.id)
        if (error) throw error
      } else {
        const newDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)
        const { error } = await supabase
          .from("chamados")
          .update({
            descricao: newDesc,
            updated_at: nowIso
          })
          .eq("id", atendimentoModalTicket.id)
        if (error) throw error
      }

      const novaDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)
      setAtendimentoModalTicket(prev => prev ? { ...prev, descricao: novaDesc } : null)
      setTickets(prev => prev.map(t => t.id === atendimentoModalTicket.id ? { ...t, descricao: novaDesc } : t))

      toast.success(`${formatEtapaLabel(cadencia.etapaRegua)} executada! Agendada: ${formatEtapaLabel(nextAction.nextStage)} (${nextDueFormatted})`)
    } catch (err: any) {
      console.error("Erro ao avançar cadência:", err)
      toast.error("Erro ao avançar régua de cadência.")
    } finally {
      setIsAvancandoCadencia(false)
    }
  }

  const handleClienteRespondeu = async () => {
    if (!atendimentoModalTicket || !user) return
    setIsAvancandoCadencia(true)
    const nowIso = new Date().toISOString()
    const currentMeta = parseMetadata(atendimentoModalTicket.descricao)
    const obsTexto = "💬 [MOTOR DE CADÊNCIA]: Cliente respondeu ao contato. Cadência suspensa para classificação e negociação."

    try {
      const historicoExistente: Array<{ texto: string; data: string; autor?: string }> = []
      if (Array.isArray(currentMeta.observacoes_historico)) {
        historicoExistente.push(...currentMeta.observacoes_historico)
      }
      const updatedHistorico = [...historicoExistente, { texto: obsTexto, data: nowIso, autor: perfil?.nome || "Colaborador" }]
      const observacoesAcumuladas = updatedHistorico.slice().reverse().map(i => i.texto.trim()).filter(Boolean).join("\n\n")

      const updatedMeta: TicketMetadata = {
        ...currentMeta,
        cliente_respondeu: true,
        regua_pausada: true,
        kanban_stage: "EM NEGOCIAÇÃO",
        proxima_acao: "Negociar proposta e esclarecer dúvidas com o cliente",
        observacoes_historico: updatedHistorico,
        observacao_data: nowIso
      }

      if (atendimentoModalTicket.source_table === "kanban_fichas" || !/^\d+$/.test(atendimentoModalTicket.id)) {
        const metaParaSalvar = { ...updatedMeta }
        delete (metaParaSalvar as any).historico_kanban
        delete (metaParaSalvar as any).historico_movimentacoes

        await supabase
          .from("kanban_fichas")
          .update({
            etapa: "EM NEGOCIAÇÃO",
            observacoes: observacoesAcumuladas,
            metadata: metaParaSalvar,
            updated_at: nowIso
          })
          .eq("id", atendimentoModalTicket.id)
      } else {
        const newDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)
        await supabase
          .from("chamados")
          .update({
            status: "EM NEGOCIAÇÃO",
            descricao: newDesc,
            updated_at: nowIso
          })
          .eq("id", atendimentoModalTicket.id)
      }

      const novaDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)
      setAtendimentoModalTicket(prev => prev ? { ...prev, status: "EM NEGOCIAÇÃO", descricao: novaDesc } : null)
      setTickets(prev => prev.map(t => t.id === atendimentoModalTicket.id ? { ...t, status: "EM NEGOCIAÇÃO", descricao: novaDesc } : t))
      toast.success("Cliente respondeu! Cadência suspensa e lead movido para Em Negociação.")
    } catch (err) {
      console.error("Erro ao registrar resposta do cliente:", err)
      toast.error("Erro ao registrar resposta.")
    } finally {
      setIsAvancandoCadencia(false)
    }
  }

  const handleEncerrarPorEsgotamento = async () => {
    if (!atendimentoModalTicket || !user) return
    setIsAvancandoCadencia(true)
    const nowIso = new Date().toISOString()
    const currentMeta = parseMetadata(atendimentoModalTicket.descricao)
    const obsTexto = "🏁 [MOTOR DE CADÊNCIA]: Cadência de retomada esgotada sem resposta após 1,5 dia útil. Movido para Perdido."

    try {
      const historicoExistente: Array<{ texto: string; data: string; autor?: string }> = []
      if (Array.isArray(currentMeta.observacoes_historico)) {
        historicoExistente.push(...currentMeta.observacoes_historico)
      }
      const updatedHistorico = [...historicoExistente, { texto: obsTexto, data: nowIso, autor: perfil?.nome || "Colaborador" }]
      const observacoesAcumuladas = updatedHistorico.slice().reverse().map(i => i.texto.trim()).filter(Boolean).join("\n\n")

      const updatedMeta: TicketMetadata = {
        ...currentMeta,
        regua_etapa: "ENCERRADO",
        kanban_stage: "PERDIDO",
        proxima_acao: "Cadência de retomada esgotada",
        observacoes_historico: updatedHistorico,
        observacao_data: nowIso
      }

      if (atendimentoModalTicket.source_table === "kanban_fichas" || !/^\d+$/.test(atendimentoModalTicket.id)) {
        const metaParaSalvar = { ...updatedMeta }
        delete (metaParaSalvar as any).historico_kanban
        delete (metaParaSalvar as any).historico_movimentacoes

        await supabase
          .from("kanban_fichas")
          .update({
            etapa: "PERDIDO",
            motivo_perda: "Cadência de retomada esgotada",
            observacoes: observacoesAcumuladas,
            metadata: metaParaSalvar,
            updated_at: nowIso
          })
          .eq("id", atendimentoModalTicket.id)
      } else {
        const newDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)
        await supabase
          .from("chamados")
          .update({
            status: "PERDIDO",
            descricao: newDesc,
            updated_at: nowIso
          })
          .eq("id", atendimentoModalTicket.id)
      }

      const novaDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)
      setAtendimentoModalTicket(null)
      setTickets(prev => prev.map(t => t.id === atendimentoModalTicket.id ? { ...t, status: "PERDIDO", descricao: novaDesc } : t))
      toast.success("Lead arquivado como Perdido por esgotamento de cadência.")
    } catch (err) {
      console.error("Erro ao encerrar por esgotamento:", err)
      toast.error("Erro ao encerrar por esgotamento.")
    } finally {
      setIsAvancandoCadencia(false)
    }
  }

  // Alternar opções rápidas (Sem interação / Sem interesse) com gravação direta em kanban_fichas
  const handleToggleOpcaoAtendimento = async (opcao: "Sem interação" | "Sem interesse") => {
    if (!atendimentoModalTicket) return
    const novaOpcao = opcaoSelecionada === opcao ? "" : opcao
    const isSemInteresse = novaOpcao === "Sem interesse"
    setOpcaoSelecionada(novaOpcao)
    setIsSavingOpcao(true)

    try {
      const currentMeta = parseMetadata(atendimentoModalTicket.descricao)
      const etapaAtual = inferKanbanStage(atendimentoModalTicket, currentMeta)

      // Regras de movimentação automática por opção rápida:
      // 1. 'Sem interesse' -> move para a coluna 'SEM INTERESSE'
      // 2. 'Sem interação' em 'Em negociação' ('EM NEGOCIAÇÃO') -> move para 'EM REATIVAÇÃO'
      // 3. 'Sem interação' em 'Em interação ou retomada' ('EM RETOMADA') -> mantém na etapa atual
      const isEmNegociacao = (
        etapaAtual === "EM NEGOCIAÇÃO" || 
        atendimentoModalTicket.status === "EM NEGOCIAÇÃO" ||
        currentMeta.kanban_stage === "EM NEGOCIAÇÃO"
      )
      const isMoverParaReativacao = novaOpcao === "Sem interação" && isEmNegociacao

      const novaEtapa: KanbanStage | null = isSemInteresse 
        ? "SEM INTERESSE" 
        : (isMoverParaReativacao ? "EM REATIVAÇÃO" : null)

      const historicoAtual = Array.isArray(atendimentoModalTicket.historico_movimentacoes)
        ? atendimentoModalTicket.historico_movimentacoes
        : (Array.isArray(currentMeta.historico_kanban) ? currentMeta.historico_kanban : [])

      const novoHistoricoMov = novaEtapa ? [
        ...historicoAtual,
        {
          data: new Date().toISOString(),
          etapa_anterior: etapaAtual,
          etapa_nova: novaEtapa,
          autor: perfil?.nome || "Usuário",
          motivo: isSemInteresse 
            ? "Opção rápida 'Sem interesse' selecionada" 
            : "Opção rápida 'Sem interação' selecionada em Negociação"
        }
      ] : historicoAtual

      const acaoConfig = novaEtapa ? proximasAcoesConfig.find(a => a.ativo && a.etapa_kanban === novaEtapa) : null
      const proximaAcaoPadrao = novaEtapa === "SEM INTERESSE"
        ? (acaoConfig?.titulo || "Cadência de Longo Prazo / Nutrição")
        : (novaEtapa === "EM REATIVAÇÃO" ? (acaoConfig?.titulo || "Resgatar oportunidade esfriada") : (currentMeta.proxima_acao || ""))

      const vencimentoCalculado = acaoConfig
        ? calcularVencimentoComSla(acaoConfig.sla_minutos, acaoConfig.apenas_dias_uteis).toISOString()
        : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

      const updatedMeta: TicketMetadata = {
        ...currentMeta,
        ...(novaEtapa ? {
          kanban_stage: novaEtapa,
          proxima_acao: proximaAcaoPadrao,
          vencimento_acao: vencimentoCalculado,
          alerta_atrasado: false,
          historico_kanban: novoHistoricoMov
        } : {})
      }

      const updateData: any = {
        observacoes: novaOpcao,
        updated_at: new Date().toISOString()
      }

      if (novaEtapa) {
        updateData.etapa = novaEtapa
        updateData.historico_movimentacoes = novoHistoricoMov
        const metaParaSalvar = { ...updatedMeta }
        delete (metaParaSalvar as any).historico_kanban
        delete (metaParaSalvar as any).historico_movimentacoes
        updateData.metadata = metaParaSalvar
      }

      // 1. Grava na tabela kanban_fichas na coluna observacoes e etapa se mudou de etapa
      const { error } = await supabase
        .from("kanban_fichas")
        .update(updateData)
        .eq("id", atendimentoModalTicket.id)

      if (error) {
        console.error("Erro ao atualizar kanban_fichas:", error)
        toast.error("Erro ao registrar escolha em kanban_fichas.")
        return
      }

      // 2. Atualizar em memória e sincronizar estado do modal e do Kanban
      const novaDescricao = stringifyWithMetadata(novaOpcao, updatedMeta)
      atendimentoModalTicket.descricao = novaDescricao
      if (novaEtapa) {
        atendimentoModalTicket.status = novaEtapa
        atendimentoModalTicket.historico_movimentacoes = novoHistoricoMov
      }

      setAtendimentoModalTicket(prev => prev ? {
        ...prev,
        status: novaEtapa ? novaEtapa : prev.status,
        descricao: novaDescricao,
        historico_movimentacoes: novaEtapa ? novoHistoricoMov : prev.historico_movimentacoes
      } : null)

      setTickets(prev => prev.map(t => {
        if (t.id === atendimentoModalTicket.id) {
          return {
            ...t,
            status: novaEtapa ? novaEtapa : t.status,
            descricao: novaDescricao,
            historico_movimentacoes: novaEtapa ? novoHistoricoMov : t.historico_movimentacoes
          }
        }
        return t
      }))

      // 3. Registrar no histórico se opção marcada
      if (novaOpcao) {
        const numId = parseInt(atendimentoModalTicket.id, 10)
        if (!isNaN(numId)) {
          await supabase.from("mensagens_chamado").insert({
            chamado_id: numId,
            user_id: user?.id,
            user_nome: perfil?.nome || "Colaborador",
            user_role: perfil?.role || "Corretor",
            user_avatar: perfil?.avatar_url || null,
            content: isSemInteresse
              ? `📌 Registrado: Sem interesse (Cartão movido automaticamente para a coluna SEM INTERESSE)`
              : (isMoverParaReativacao
                  ? `📌 Registrado: Sem interação (Cartão movido automaticamente para a coluna EM REATIVAÇÃO)`
                  : `📌 Registrado: ${novaOpcao}`),
            action: (isSemInteresse || isMoverParaReativacao) ? "etapa_kanban_change" : "registro_opcao"
          })
          loadHistoricoChamado(atendimentoModalTicket.id)
        }
        if (isSemInteresse) {
          toast.success('Cartão movido automaticamente para a coluna "SEM INTERESSE"!')
        } else if (isMoverParaReativacao) {
          toast.success('Cartão movido automaticamente para a coluna "EM REATIVAÇÃO"!')
        } else {
          toast.success(`"${novaOpcao}" registrado em kanban_fichas!`)
        }
      } else {
        toast.info("Opção desmarcada em kanban_fichas.")
      }

      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao salvar opção:", err)
      toast.error("Erro ao salvar escolha.")
    } finally {
      setIsSavingOpcao(false)
    }
  }

  // Ação para abrir o modal 'Informações do Lead' ao clicar em 'INICIAR ABORDAGEM' ou 'INFORMAÇÕES DO CLIENTE'
  const handleIniciarAbordagem = async () => {
    if (!atendimentoModalTicket) return
    const rawCpf = atendimentoModalTicket.cliente_cpf || ""
    let cleanCpf = rawCpf.replace(/\D/g, "")

    if (!cleanCpf || cleanCpf.length !== 11) {
      // Tentar localizar pelo telefone se o CPF não estiver completo
      const tel = (atendimentoModalTicket.cliente_telefone || "").replace(/\D/g, "")
      const last8 = tel.length >= 8 ? tel.slice(-8) : tel
      if (last8) {
        try {
          const { data: cByTel } = await supabase
            .from("clientes")
            .select("cpf")
            .or(`telefone_1.ilike.%${last8}%,telefone_2.ilike.%${last8}%,telefone_3.ilike.%${last8}%`)
            .limit(1)
            .maybeSingle()
          if (cByTel?.cpf) {
            cleanCpf = cByTel.cpf.replace(/\D/g, "")
          }
        } catch (e) {
          console.error("Erro ao localizar CPF por telefone:", e)
        }
      }
    }

    if (!cleanCpf) {
      toast.error("CPF do cliente não localizado para abrir Informações do Lead.")
      return
    }

    // Salvar contexto isolado deste atendimento específico (chamados e propostas deste operador)
    const meta = parseMetadata(atendimentoModalTicket.descricao)
    const hasChamado = clientTicketsHistory.length > 0
    const hasProposta = clientProposalsHistory.length > 0 || Boolean((meta as any)?.proposta_id || (meta as any)?.proposta_numero)
    setLeadModalAttendanceContext({ hasChamado, hasProposta })

    setAtendimentoModalTicket(null)
    setSelectedClientCpf(cleanCpf)
    setIsViewingLeadInAttendance(true)
    setIsClientDetailsModalOpen(true)
  }

  // Executar Transbordo de Responsável na Modal de Supervisão
  const handleConfirmSupervisaoTransbordo = async () => {
    if (!supervisaoModalTicket || !user || !supervisaoNovoResponsavel) return
    setIsSubmittingSupervisao(true)
    try {
      const targetUser = usersList.find(u => u.id === supervisaoNovoResponsavel)
      const targetName = targetUser?.nome || "Novo Colaborador"
      const nowIso = new Date().toISOString()
      const textoJustificativa = supervisaoMotivoTransbordo.trim()

      const meta = parseMetadata(supervisaoModalTicket.descricao)

      // Registrar justificativa da transferência no histórico de observações da ficha sem duplicação
      const historicoExistente: Array<{ texto: string; data: string; autor?: string }> = []
      const seenTexts = new Set<string>()

      if (Array.isArray(meta.observacoes_historico)) {
        meta.observacoes_historico.forEach((item: any) => {
          if (item && isUserObservation(item.texto)) {
            const partes = String(item.texto).trim().split(/\n\s*\n/)
            partes.forEach(p => {
              const trimmed = p.trim()
              const key = trimmed.toLowerCase().replace(/\s+/g, " ")
              if (trimmed && isUserObservation(trimmed) && !seenTexts.has(key)) {
                seenTexts.add(key)
                historicoExistente.push({
                  texto: trimmed,
                  data: item.data || nowIso,
                  autor: item.autor
                })
              }
            })
          }
        })
      }

      const cleanObsAnterior = (supervisaoModalTicket.descricao || "")
        .replace(/<!-- TICKET_METADATA: ([\s\S]*?) -->/g, "")
        .trim()
      if (isUserObservation(cleanObsAnterior)) {
        const blocos = cleanObsAnterior.split(/\n\s*\n/)
        blocos.forEach(b => {
          const trimmed = b.trim()
          const key = trimmed.toLowerCase().replace(/\s+/g, " ")
          if (trimmed && isUserObservation(trimmed) && !seenTexts.has(key)) {
            seenTexts.add(key)
            historicoExistente.push({
              texto: trimmed,
              data: meta.observacao_data || supervisaoModalTicket.updated_at || nowIso
            })
          }
        })
      }

      let updatedHistoricoObs = historicoExistente

      if (textoJustificativa) {
        const keyJust = textoJustificativa.toLowerCase().replace(/\s+/g, " ")
        if (!seenTexts.has(keyJust)) {
          const novaObsItem = {
            texto: textoJustificativa,
            data: nowIso,
            autor: perfil?.nome || "Supervisor"
          }
          updatedHistoricoObs = [...historicoExistente, novaObsItem]
        }
      }

      const observacoesAcumuladas = updatedHistoricoObs
        .slice()
        .reverse()
        .map(item => item.texto.trim())
        .filter(Boolean)
        .join("\n\n")

      const updatedMeta: TicketMetadata = {
        ...meta,
        user_id: supervisaoNovoResponsavel,
        user_nome: targetName,
        operador_id: supervisaoNovoResponsavel,
        operador_nome: targetName,
        prioridade: supervisaoNovaPrioridade,
        conflito_titularidade: false,
        ...(textoJustificativa ? {
          observacoes_historico: updatedHistoricoObs,
          observacao_data: nowIso
        } : {})
      }
      const newDesc = stringifyWithMetadata(observacoesAcumuladas, updatedMeta)

      if (supervisaoModalTicket.source_table === "kanban_fichas" || !/^\d+$/.test(supervisaoModalTicket.id)) {
        const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))
        const dbPrioridade: "BAIXA" | "MÉDIA" | "ALTA" | "URGENTE" =
          supervisaoNovaPrioridade === "ALTA" ? "ALTA" :
          supervisaoNovaPrioridade === "URGENTE" ? "URGENTE" : "MÉDIA"

        const metaParaSalvar = { ...updatedMeta }
        delete (metaParaSalvar as any).historico_kanban
        delete (metaParaSalvar as any).historico_movimentacoes

        const updatePayload: any = {
          operador_id: isUuid(supervisaoNovoResponsavel) ? supervisaoNovoResponsavel : null,
          operador_nome: targetName,
          prioridade: dbPrioridade,
          metadata: metaParaSalvar,
          updated_at: nowIso
        }
        if (textoJustificativa) {
          updatePayload.observacoes = observacoesAcumuladas
        }

        const { error } = await supabase
          .from("kanban_fichas")
          .update(updatePayload)
          .eq("id", supervisaoModalTicket.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("chamados")
          .update({
            user_id: supervisaoNovoResponsavel,
            user_nome: targetName,
            descricao: newDesc,
            updated_at: nowIso
          })
          .eq("id", supervisaoModalTicket.id)

        if (error) throw error

        const numId = parseInt(supervisaoModalTicket.id, 10)
        if (!isNaN(numId)) {
          await supabase.from("mensagens_chamado").insert({
            chamado_id: numId,
            user_id: user.id,
            user_nome: perfil?.nome || "Supervisor",
            user_role: perfil?.role || "Supervisor",
            user_avatar: perfil?.avatar_url || null,
            content: `🔄 TRANSBORDO DE LEAD: Reatribuído para ${targetName} pela Supervisão. Motivo: ${supervisaoMotivoTransbordo || "Redistribuição estratégica de carteira"}.`,
            action: "transbordo_supervisao"
          })
        }
      }

      if (atendimentoModalTicket && atendimentoModalTicket.id === supervisaoModalTicket.id) {
        setAtendimentoModalTicket(prev => prev ? {
          ...prev,
          user_id: supervisaoNovoResponsavel,
          user_nome: targetName,
          descricao: newDesc
        } : null)
      }
      setSupervisaoMotivoTransbordo("")

      toast.success(`Lead reatribuído com sucesso para ${targetName}!`)
      setSupervisaoModalTicket(null)
      fetchChamados(true)
    } catch (err: any) {
      console.error("Erro ao salvar supervisão:", err?.message || err)
      toast.error("Erro ao reatribuir o chamado.")
    } finally {
      setIsSubmittingSupervisao(false)
    }
  }

  // Resolver Conflito de Titularidade na Modal de Supervisão
  const handleResolverConflito = async (liberar: boolean) => {
    if (!supervisaoModalTicket || !user) return
    try {
      const meta = parseMetadata(supervisaoModalTicket.descricao)
      const updatedMeta: TicketMetadata = {
        ...meta,
        conflito_titularidade: !liberar
      }
      const newDesc = stringifyWithMetadata(supervisaoModalTicket.descricao, updatedMeta)

      if (supervisaoModalTicket.source_table === "kanban_fichas" || !/^\d+$/.test(supervisaoModalTicket.id)) {
        const metaParaSalvar = { ...updatedMeta }
        delete (metaParaSalvar as any).historico_kanban
        delete (metaParaSalvar as any).historico_movimentacoes
        await supabase
          .from("kanban_fichas")
          .update({ metadata: metaParaSalvar, updated_at: new Date().toISOString() })
          .eq("id", supervisaoModalTicket.id)
      } else {
        await supabase
          .from("chamados")
          .update({ descricao: newDesc, updated_at: new Date().toISOString() })
          .eq("id", supervisaoModalTicket.id)

        const numId = parseInt(supervisaoModalTicket.id, 10)
        if (!isNaN(numId)) {
          await supabase.from("mensagens_chamado").insert({
            chamado_id: numId,
            user_id: user.id,
            user_nome: perfil?.nome || "Supervisor",
            user_role: perfil?.role || "Supervisor",
            user_avatar: perfil?.avatar_url || null,
            content: liberar 
              ? `🛡️ Conflito de titularidade auditado e LIBERADO pela supervisão.` 
              : `🛡️ Conflito de titularidade mantido como BLOQUEADO para concorrência de atendimento.`,
            action: "conflito_titularidade_decisao"
          })
        }
      }

      toast.success(liberar ? "Conflito liberado!" : "Conflito mantido!")
      setSupervisaoModalTicket(null)
      fetchChamados(true)
    } catch (err: any) {
      console.error("Erro ao resolver conflito:", err?.message || err)
      toast.error("Erro ao atualizar conflito.")
    }
  }

  // Concluir Ação Especial na Modal de Supervisão
  const handleConcluirAcaoEspecial = async () => {
    if (!supervisaoModalTicket || !user) return
    try {
      const meta = parseMetadata(supervisaoModalTicket.descricao)
      const updatedMeta: TicketMetadata = {
        ...meta,
        acao_especial: false,
        acao_especial_status: "concluido"
      }
      const newDesc = stringifyWithMetadata(supervisaoModalTicket.descricao, updatedMeta)

      if (supervisaoModalTicket.source_table === "kanban_fichas" || !/^\d+$/.test(supervisaoModalTicket.id)) {
        await supabase
          .from("kanban_fichas")
          .update({ metadata: updatedMeta, updated_at: new Date().toISOString() })
          .eq("id", supervisaoModalTicket.id)
      } else {
        await supabase
          .from("chamados")
          .update({ descricao: newDesc, updated_at: new Date().toISOString() })
          .eq("id", supervisaoModalTicket.id)

        const numId = parseInt(supervisaoModalTicket.id, 10)
        if (!isNaN(numId)) {
          await supabase.from("mensagens_chamado").insert({
            chamado_id: numId,
            user_id: user.id,
            user_nome: perfil?.nome || "Supervisor",
            user_role: perfil?.role || "Supervisor",
            user_avatar: perfil?.avatar_url || null,
            content: `✅ Ação Especial analisada e concluída pela Supervisão. Oportunidade liberada para avanço comercial.`,
            action: "acao_especial_concluida"
          })
        }
      }

      toast.success("Ação Especial concluída!")
      setSupervisaoModalTicket(null)
      fetchChamados(true)
    } catch (err: any) {
      console.error("Erro ao concluir ação especial:", err?.message || err)
      toast.error("Erro ao concluir ação especial.")
    }
  }

  // Ações das Gavetas de Triagem
  const handleDropInDrawer = async (ticket: TicketItem, drawerType: "NAO_EXISTE" | "DIVERGENTE") => {
    const label = drawerType === "NAO_EXISTE" ? "Não Existe Whatsapp" : "Whatsapp Divergente"
    try {
      const meta = parseMetadata(ticket.descricao)
      const updatedMeta: TicketMetadata = {
        ...meta,
        tabulacao_whatsapp: drawerType === "NAO_EXISTE" ? "NAO_EXISTE_WHATSAPP" : "WHATSAPP_DIVERGENTE",
        tabulado_por: perfil?.nome || user?.email || "Corretor"
      }
      const cleanObs = (ticket.descricao || "").replace(/<!-- TICKET_METADATA: ([\s\S]*?) -->/g, "").trim()
      const novaObservacao = cleanObs === "Sem interesse" ? "" : cleanObs
      const newDesc = stringifyWithMetadata(novaObservacao, updatedMeta)

      if (ticket.source_table === "kanban_fichas") {
        const historicoAtual = Array.isArray(ticket.historico_movimentacoes)
          ? ticket.historico_movimentacoes
          : (Array.isArray(updatedMeta.historico_kanban) ? updatedMeta.historico_kanban : [])
        const novoHistorico = [
          ...historicoAtual,
          {
            data: new Date().toISOString(),
            etapa_anterior: inferKanbanStage(ticket, updatedMeta),
            etapa_nova: "PERDIDO",
            autor: perfil?.nome || "Usuário",
            motivo: `Lead arquivado na gaveta "${label}"`
          }
        ]
        const metaParaSalvar = { ...updatedMeta }
        delete (metaParaSalvar as any).historico_kanban
        delete (metaParaSalvar as any).historico_movimentacoes

        await supabase.from("kanban_fichas").update({
          etapa: "PERDIDO",
          motivo_perda: label,
          operador_nome: perfil?.nome || ticket.user_nome || "Corretor",
          observacoes: novaObservacao,
          historico_movimentacoes: novoHistorico,
          metadata: metaParaSalvar,
          updated_at: new Date().toISOString()
        }).eq("id", ticket.id)
        ticket.historico_movimentacoes = novoHistorico
      } else {
        await supabase.from("chamados").update({
          descricao: newDesc,
          updated_at: new Date().toISOString()
        })
        .eq("id", ticket.id)

        await supabase.from("mensagens_chamado").insert({
          chamado_id: parseInt(ticket.id, 10),
          user_id: user?.id,
          user_nome: perfil?.nome || "Colaborador",
          user_role: perfil?.role || "Corretor",
          user_avatar: perfil?.avatar_url || null,
          content: `📁 Lead arquivado na gaveta "${label}".`,
          action: "arquivamento_gaveta"
        })
      }

      toast.success(`Lead movido para gaveta: ${label}!`)
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao mover lead para gaveta:", err)
      toast.error("Erro ao mover lead para gaveta.")
    }
  }

  const handleRestoreFromDrawer = async (ticket: TicketItem) => {
    try {
      const meta = parseMetadata(ticket.descricao)
      delete meta.tabulacao_whatsapp
      const newDesc = stringifyWithMetadata(ticket.descricao, meta)

      if (ticket.source_table === "kanban_fichas") {
        const historicoAtual = Array.isArray(ticket.historico_movimentacoes)
          ? ticket.historico_movimentacoes
          : (Array.isArray(meta.historico_kanban) ? meta.historico_kanban : [])
        const novoHistorico = [
          ...historicoAtual,
          {
            data: new Date().toISOString(),
            etapa_anterior: "PERDIDO",
            etapa_nova: "EM RETOMADA",
            autor: perfil?.nome || "Usuário",
            motivo: "Lead restaurado da gaveta para o fluxo do Kanban"
          }
        ]
        const metaParaSalvar = { ...meta }
        delete (metaParaSalvar as any).historico_kanban
        delete (metaParaSalvar as any).historico_movimentacoes

        await supabase.from("kanban_fichas").update({
          etapa: "EM RETOMADA",
          motivo_perda: null,
          historico_movimentacoes: novoHistorico,
          metadata: metaParaSalvar,
          updated_at: new Date().toISOString()
        }).eq("id", ticket.id)
        ticket.historico_movimentacoes = novoHistorico
      } else {
        await supabase.from("chamados").update({
          descricao: newDesc,
          updated_at: new Date().toISOString()
        }).eq("id", ticket.id)

        await supabase.from("mensagens_chamado").insert({
          chamado_id: parseInt(ticket.id, 10),
          user_id: user?.id,
          user_nome: perfil?.nome || "Colaborador",
          user_role: perfil?.role || "Corretor",
          user_avatar: perfil?.avatar_url || null,
          content: `🔄 Lead restaurado da gaveta para o fluxo do Kanban.`,
          action: "restauracao_gaveta"
        })
      }

      toast.success("Lead restaurado para o fluxo do Kanban!")
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao restaurar lead:", err)
      toast.error("Erro ao restaurar lead.")
    }
  }

  // Ação disparada pelas caixas seletoras no modal INFORMAÇÕES DO LEAD
  const handleTabulacaoFromModal = async (
    tabulacao: "CLIENTE CHAMADO" | "NÃO EXISTE WHATSAPP" | "WHATSAPP DIVERGENTE",
    clientInfo: LeadContactInfo
  ) => {
    try {
      const cleanCpf = clientInfo.cpf.replace(/\D/g, "").padStart(11, "0")
      const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))
      const validOperadorId = isUuid(user?.id) ? user?.id : null

      // 1. Caso 'CLIENTE CHAMADO': fechar o modal e criar/mover ficha para 'EM RETOMADA'
      if (tabulacao === "CLIENTE CHAMADO") {
        setIsClientDetailsModalOpen(false)
        setIsKanbanSearchModal(false)
        setIsDrawerLeadModal(false)
        setSelectedClientCpf("")

        try {
          supabase.from("clientes_chamados").insert({
            usuario_id: validOperadorId || user?.id,
            usuario_nome: perfil?.nome || "Corretor",
            usuario_funcao: perfil?.role || perfil?.funcao || "Corretor",
            cliente_cpf: cleanCpf,
            cliente_nome: clientInfo.nome,
            telefones_contatados: clientInfo.telefones_selecionados || clientInfo.telefones || [],
            tabulacao: "CLIENTE CHAMADO",
            origem: clientInfo.origem || "KANBAN",
            data_chamado: new Date().toISOString().split("T")[0]
          }).then(() => {})
        } catch {}

        // Buscar se o OPERADOR ATUAL já possui uma ficha para este cliente
        let existing: any = null
        if (validOperadorId) {
          const { data: porId } = await supabase
            .from("kanban_fichas")
            .select("id, metadata, etapa, operador_id, operador_nome")
            .eq("cliente_cpf", cleanCpf)
            .eq("operador_id", validOperadorId)
            .maybeSingle()
          existing = porId
        }
        if (!existing && perfil?.nome) {
          const { data: porNome } = await supabase
            .from("kanban_fichas")
            .select("id, metadata, etapa, operador_id, operador_nome")
            .eq("cliente_cpf", cleanCpf)
            .ilike("operador_nome", perfil.nome)
            .maybeSingle()
          existing = porNome
        }

        // Detectar outros operadores atendendo para gravar flag de concorrência comercial
        const { data: outrasFichasExistentes } = await supabase
          .from("kanban_fichas")
          .select("operador_nome, etapa")
          .eq("cliente_cpf", cleanCpf)

        const outrosOperadoresNomes = Array.from(new Set(
          (outrasFichasExistentes || [])
            .filter(f => f.operador_nome && f.operador_nome.trim().toLowerCase() !== (perfil?.nome || "").trim().toLowerCase())
            .map(o => o.operador_nome)
            .filter(Boolean)
        ))

        if (existing) {
          const updatedMeta = {
            ...(existing.metadata || {}),
            kanban_stage: "EM RETOMADA",
            proxima_acao: "Enviar Régua de Retomada 1",
            telefones: clientInfo.telefones,
            convenio: clientInfo.convenio || (existing.metadata as any)?.convenio,
            origem: clientInfo.origem || (existing as any).origem || (existing.metadata as any)?.origem,
            telefone_empresa: clientInfo.telefone_empresa || (existing as any).telefone_empresa || (existing.metadata as any)?.telefone_empresa
          }
          delete (updatedMeta as any).tabulacao_whatsapp
          delete (updatedMeta as any).telefones_selecionados
          delete (updatedMeta as any).historico_kanban

          const updatePayload: Record<string, any> = {
            etapa: "EM RETOMADA",
            motivo_perda: null,
            tabulacao: "CLIENTE CHAMADO",
            origem: clientInfo.origem || (existing as any).origem || null,
            telefones_contatados: clientInfo.telefones_selecionados || [],
            telefone_empresa: clientInfo.telefone_empresa || (existing as any).telefone_empresa || null,
            historico_movimentacoes: [
              ...((existing as any).historico_movimentacoes || []),
              {
                data: new Date().toISOString(),
                etapa_nova: "EM RETOMADA",
                autor: perfil?.nome || "Corretor",
                motivo: "Atendimento iniciado no Kanban"
              }
            ],
            metadata: updatedMeta,
            operador_id: validOperadorId,
            operador_nome: perfil?.nome || "Corretor",
            convenio: clientInfo.convenio || (existing as any).convenio,
            updated_at: new Date().toISOString()
          }

          let { error: updateErr } = await supabase
            .from("kanban_fichas")
            .update(updatePayload)
            .eq("id", existing.id)

          if (updateErr && (updateErr.message?.includes("does not exist") || updateErr.code === "PGRST204")) {
            const fallback = await supabase
              .from("kanban_fichas")
              .update({
                etapa: "EM RETOMADA",
                motivo_perda: null,
                metadata: updatedMeta,
                operador_id: validOperadorId,
                operador_nome: perfil?.nome || "Corretor",
                convenio: clientInfo.convenio || (existing as any).convenio,
                updated_at: new Date().toISOString()
              })
              .eq("id", existing.id)
            updateErr = fallback.error
          }

          if (updateErr) {
            console.error("Erro ao atualizar kanban_fichas:", updateErr)
            toast.error("Erro ao atualizar cartão no Kanban.")
            return
          }
        } else {
          const meta: TicketMetadata = {
            kanban_stage: "EM RETOMADA",
            proxima_acao: "Enviar Régua de Retomada 1",
            vencimento_acao: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            prioridade: "NORMAL",
            user_id: user?.id,
            user_nome: perfil?.nome || "Corretor",
            telefones: clientInfo.telefones,
            convenio: clientInfo.convenio,
            origem: clientInfo.origem,
            telefone_empresa: clientInfo.telefone_empresa,
            conflito_titularidade: outrosOperadoresNomes.length > 0,
            concorrencia_outros_operadores: outrosOperadoresNomes
          }
          delete (meta as any).tabulacao_whatsapp
          delete (meta as any).telefones_selecionados
          delete (meta as any).historico_kanban

          const insertPayload: Record<string, any> = {
            cliente_nome: clientInfo.nome || "Cliente sem Nome",
            cliente_cpf: cleanCpf,
            cliente_telefone: (clientInfo.telefones_selecionados && clientInfo.telefones_selecionados[0]) || clientInfo.telefones[0] || "",
            operador_id: validOperadorId,
            operador_nome: perfil?.nome || "Corretor",
            etapa: "EM RETOMADA",
            motivo_perda: null,
            tabulacao: "CLIENTE CHAMADO",
            origem: clientInfo.origem || null,
            telefones_contatados: clientInfo.telefones_selecionados || [],
            telefone_empresa: clientInfo.telefone_empresa || null,
            historico_movimentacoes: [{
              data: new Date().toISOString(),
              etapa_nova: "EM RETOMADA",
              autor: perfil?.nome || "Corretor",
              motivo: "Atendimento iniciado no Kanban"
            }],
            metadata: meta,
            convenio: clientInfo.convenio || undefined,
            observacoes: "Atendimento iniciado via modal (CLIENTE CHAMADO)"
          }

          let { error: insertErr } = await supabase.from("kanban_fichas").insert(insertPayload)

          if (insertErr && (insertErr.message?.includes("does not exist") || insertErr.code === "PGRST204")) {
            const fallback = await supabase.from("kanban_fichas").insert({
              cliente_nome: clientInfo.nome || "Cliente sem Nome",
              cliente_cpf: cleanCpf,
              cliente_telefone: (clientInfo.telefones_selecionados && clientInfo.telefones_selecionados[0]) || clientInfo.telefones[0] || "",
              operador_id: validOperadorId,
              operador_nome: perfil?.nome || "Corretor",
              etapa: "EM RETOMADA",
              motivo_perda: null,
              metadata: meta,
              convenio: clientInfo.convenio || undefined,
              observacoes: "Atendimento iniciado via modal (CLIENTE CHAMADO)"
            })
            insertErr = fallback.error
          }

          if (insertErr) {
            console.error("Erro ao inserir em kanban_fichas:", insertErr)
            toast.error("Erro ao registrar cartão no Kanban.")
            return
          }
        }

        // Se houver algum registro em chamados deste operador com essa tabulação de gaveta, limpar também
        try {
          let chamadosQuery = supabase
            .from("chamados")
            .select("id, descricao, user_id")
            .eq("cliente_cpf", cleanCpf)
          if (validOperadorId) {
            chamadosQuery = chamadosQuery.eq("user_id", validOperadorId)
          }
          const { data: chamadosList } = await chamadosQuery
          if (chamadosList && chamadosList.length > 0) {
            for (const ch of chamadosList) {
              const chMeta = parseMetadata(ch.descricao)
              if (chMeta.tabulacao_whatsapp) {
                delete chMeta.tabulacao_whatsapp
                chMeta.kanban_stage = "EM RETOMADA"
                const newDesc = stringifyWithMetadata(ch.descricao, chMeta)
                await supabase.from("chamados").update({
                  descricao: newDesc,
                  updated_at: new Date().toISOString()
                }).eq("id", ch.id)
              }
            }
          }
        } catch (chErr) {
          console.warn("Aviso ao limpar chamados:", chErr)
        }

        toast.success(`Cartão de atendimento criado em "EM RETOMADA"!`)
        await fetchChamados(true)
        return
      }

      // 2. Caso 'NÃO EXISTE WHATSAPP' ou 'WHATSAPP DIVERGENTE': fechar modal e registrar na tabela 'kanban_fichas'
      setIsClientDetailsModalOpen(false)
      setIsKanbanSearchModal(false)
      setIsDrawerLeadModal(false)
      setSelectedClientCpf("")

      const drawerType = tabulacao === "NÃO EXISTE WHATSAPP" ? "NAO_EXISTE_WHATSAPP" : "WHATSAPP_DIVERGENTE"
      const drawerLabel = tabulacao === "NÃO EXISTE WHATSAPP" ? "Não Existe Whatsapp" : "Whatsapp Divergente"

      // Buscar se o OPERADOR ATUAL já possui uma ficha para este cliente
      let existing: any = null
      if (validOperadorId) {
        const { data: porId } = await supabase
          .from("kanban_fichas")
          .select("id, metadata")
          .eq("cliente_cpf", cleanCpf)
          .eq("operador_id", validOperadorId)
          .maybeSingle()
        existing = porId
      }
      if (!existing && perfil?.nome) {
        const { data: porNome } = await supabase
          .from("kanban_fichas")
          .select("id, metadata")
          .eq("cliente_cpf", cleanCpf)
          .ilike("operador_nome", perfil.nome)
          .maybeSingle()
        existing = porNome
      }

      if (existing) {
        const updatedMeta = {
          ...(existing.metadata || {}),
          tabulacao_whatsapp: drawerType,
          telefones: clientInfo.telefones,
          tabulado_por: perfil?.nome || user?.email || "Corretor",
          user_id: validOperadorId || user?.id,
          user_nome: perfil?.nome || "Corretor"
        }
        delete (updatedMeta as any).telefones_selecionados
        delete (updatedMeta as any).origem
        delete (updatedMeta as any).telefone_empresa

        const updateDrawerPayload: Record<string, any> = {
          etapa: "PERDIDO",
          motivo_perda: drawerLabel,
          tabulacao: tabulacao,
          origem: clientInfo.origem || (existing as any).origem || null,
          telefones_contatados: clientInfo.telefones_selecionados || [],
          telefone_empresa: clientInfo.telefone_empresa || (existing as any).telefone_empresa || null,
          operador_id: validOperadorId,
          operador_nome: perfil?.nome || "Corretor",
          metadata: updatedMeta,
          updated_at: new Date().toISOString()
        }

        let { error: updateErr } = await supabase
          .from("kanban_fichas")
          .update(updateDrawerPayload)
          .eq("id", existing.id)

        if (updateErr && (updateErr.message?.includes("does not exist") || updateErr.code === "PGRST204")) {
          const fallback = await supabase
            .from("kanban_fichas")
            .update({
              etapa: "PERDIDO",
              motivo_perda: drawerLabel,
              operador_id: validOperadorId,
              operador_nome: perfil?.nome || "Corretor",
              metadata: updatedMeta,
              updated_at: new Date().toISOString()
            })
            .eq("id", existing.id)
          updateErr = fallback.error
        }

        if (updateErr) {
          console.error("Erro ao atualizar gaveta em kanban_fichas:", updateErr)
          toast.error("Erro ao atualizar gaveta.")
          return
        }
      } else {
        const meta: TicketMetadata = {
          kanban_stage: drawerLabel === "Não Existe Whatsapp" ? "NÃO EXISTE WHATSAPP" : "WHATSAPP DIVERGENTE",
          tabulacao_whatsapp: drawerType,
          telefones: clientInfo.telefones,
          tabulado_por: perfil?.nome || user?.email || "Corretor",
          user_id: user?.id,
          user_nome: perfil?.nome || "Corretor"
        }
        delete (meta as any).telefones_selecionados
        delete (meta as any).origem
        delete (meta as any).telefone_empresa

        const insertDrawerPayload: Record<string, any> = {
          cliente_nome: clientInfo.nome || "Cliente sem Nome",
          cliente_cpf: cleanCpf,
          cliente_telefone: clientInfo.telefones[0] || "",
          operador_id: validOperadorId,
          operador_nome: perfil?.nome || "Corretor",
          etapa: "PERDIDO",
          motivo_perda: drawerLabel,
          tabulacao: tabulacao,
          origem: clientInfo.origem || null,
          telefones_contatados: clientInfo.telefones_selecionados || [],
          telefone_empresa: clientInfo.telefone_empresa || null,
          metadata: meta,
          observacoes: `Lead arquivado na gaveta "${drawerLabel}"`
        }

        let { error: insertErr } = await supabase.from("kanban_fichas").insert(insertDrawerPayload)

        if (insertErr && (insertErr.message?.includes("does not exist") || insertErr.code === "PGRST204")) {
          const fallback = await supabase.from("kanban_fichas").insert({
            cliente_nome: clientInfo.nome || "Cliente sem Nome",
            cliente_cpf: cleanCpf,
            cliente_telefone: clientInfo.telefones[0] || "",
            operador_id: validOperadorId,
            operador_nome: perfil?.nome || "Corretor",
            etapa: "PERDIDO",
            motivo_perda: drawerLabel,
            metadata: meta,
            observacoes: `Lead arquivado na gaveta "${drawerLabel}"`
          })
          insertErr = fallback.error
        }

        if (insertErr) {
          console.error("Erro ao inserir gaveta em kanban_fichas:", insertErr)
          toast.error("Erro ao registrar na gaveta.")
          return
        }
      }

      toast.success(`Lead registrado na gaveta "${drawerLabel}"!`)
      await fetchChamados(true)
    } catch (err) {
      console.error("Erro ao registrar tabulação:", err)
      toast.error("Erro ao registrar tabulação.")
    }
  }

  // Categorização da Minha Fila em AGORA, VENCIDAS, FUTURAS e AÇÃO ESPECIAL
  const filaCategorias = useMemo(() => {
    const now = new Date()
    const vencidas: Array<{ ticket: TicketItem; atrasoTexto: string }> = []
    const agora: TicketItem[] = []
    const futuras: TicketItem[] = []
    const acaoEspecial: TicketItem[] = []

    const leadsAtivos = filteredTickets.filter(t => {
      const meta = parseMetadata(t.descricao)
      const prop = propostasPorCpf[t.id] || t.proposta_info
      const stage = inferKanbanStage(t, meta, prop)
      return stage !== "FECHADO" && stage !== "PERDIDO" && t.status !== "FECHADO" && t.status !== "PERDIDO"
    })

    leadsAtivos.forEach(ticket => {
      const meta = parseMetadata(ticket.descricao)
      const isAcaoEspecial = Boolean(meta.acao_especial) || meta.acao_especial_status === "pendente"

      const dateStr = meta.regua_proximo_vencimento || meta.vencimento_acao || meta.agendamento_data

      let vencimentoDate: Date | null = null
      if (dateStr) {
        const parsed = new Date(dateStr)
        if (!isNaN(parsed.getTime())) {
          vencimentoDate = parsed
        }
      }

      const isAtrasado = Boolean(meta.alerta_atrasado) || (vencimentoDate !== null && vencimentoDate.getTime() < now.getTime())
      const isFuturo = !isAtrasado && vencimentoDate !== null && vencimentoDate.getTime() > now.getTime() + 10 * 60 * 1000

      if (isAcaoEspecial) {
        acaoEspecial.push(ticket)
      } else if (isAtrasado) {
        let atrasoTexto = "Prazo expirado"
        if (vencimentoDate) {
          atrasoTexto = `${formatDistanceToNow(vencimentoDate, { locale: ptBR })} de atraso`
        } else if (ticket.updated_at) {
          atrasoTexto = `${formatDistanceToNow(new Date(ticket.updated_at), { locale: ptBR })} sem ação`
        }
        vencidas.push({ ticket, atrasoTexto })
      } else if (isFuturo) {
        futuras.push(ticket)
      } else {
        agora.push(ticket)
      }
    })

    const calcValor = (list: TicketItem[]) => list.reduce((acc, t) => {
      const opData = getValorOperacaoDeAbertura(t)
      const opNum = parseValorToNumber(opData.valor)
      return acc + (opNum > 0 ? opNum : Number(t.valor_operacao || t.margem || 0))
    }, 0)

    const valorAgora = calcValor(agora)
    const valorVencidas = calcValor(vencidas.map(i => i.ticket))
    const valorFuturas = calcValor(futuras)
    const valorAcaoEspecial = calcValor(acaoEspecial)

    return { agora, vencidas, futuras, acaoEspecial, valorAgora, valorVencidas, valorFuturas, valorAcaoEspecial }
  }, [filteredTickets, propostasPorCpf])

  // Função reutilizável para renderizar exatamente o mesmo Cartão de Tarefa em ambas as visões
  const renderTicketCard = (
    ticket: TicketItem, 
    atrasoCustomTexto?: string, 
    isDraggable: boolean = true, 
    customBorderClass?: string,
    isMinhaFilaAcaoEspecial: boolean = false
  ) => {
    const meta = parseMetadata(ticket.descricao)
    const opData = getValorOperacaoDeAbertura(ticket)
    const opValorNum = parseValorToNumber(opData.valor)
    const valorTotal = opValorNum > 0 ? opValorNum : Number(ticket.valor_operacao || ticket.margem || 0)
    const isCardRevealed = Boolean(revealedCpfs[ticket.id] || revealedPhones[ticket.id])

    // Identificar se há alerta de alto valor (> 20k ou > 50k)
    const isAltoValor = valorTotal >= 20000

    // Próxima Ação e Vencimento
    const etapaCard = inferKanbanStage(ticket, meta)
    const acaoFallbackConfig = proximasAcoesConfig.find(a => a.ativo && (
      a.etapa_kanban === etapaCard || 
      a.etapa_kanban === ticket.status ||
      (etapaCard === "ENTRADA DO SITE" && a.etapa_kanban === "EM ABORDAGEM")
    ))
    const isCustomAgendado = Boolean(meta.proxima_acao && /^\[(?:Agendad|Ação Especial|Retorno|Alerta)/i.test(meta.proxima_acao))
    const rawProximaAcao = isCustomAgendado
      ? meta.proxima_acao!
      : (acaoFallbackConfig?.titulo || meta.proxima_acao || (
          etapaCard === "EM ABORDAGEM" ? "Realizar Primeiro Contato Imediato" :
          etapaCard === "EM RETOMADA" ? "Enviar Régua de Retomada 1 via WhatsApp" :
          etapaCard === "EM NEGOCIAÇÃO" ? "Enviar simulação ajustada e esclarecer dúvidas" :
          etapaCard === "EM REATIVAÇÃO" ? "Resgatar contato esfriado após 48h úteis" :
          etapaCard === "SEM INTERESSE" ? "Programar cadência longa / nutrição" :
          etapaCard === "FECHADO" ? "Proposta Digitada no Sistema" :
          "Finalização registrada por inviabilidade"
        ))
    const proximaAcaoTexto = rawProximaAcao.replace(/^\[[^\]]+\]\s*/, "")

    const vencimentoLabel = meta.vencimento_acao 
      ? format(new Date(meta.vencimento_acao), "dd/MM 'às' HH:mm")
      : "Hoje às 14:30"

    const acaoDestinatario = meta.acao_especial_destinatario || (() => {
      const obsLista = Array.isArray(meta.observacoes_historico) ? meta.observacoes_historico : []
      for (const item of obsLista.slice().reverse()) {
        const txt = String(item?.texto || "")
        const m = txt.match(/SOLICITAÇÃO DE AÇÃO ESPECIAL\s+(?:para\s+([^:]+)|\[([^\]]+)\]):/i)
        if (m) return (m[1] || m[2])?.trim()
      }
      const desc = ticket.descricao || ""
      const mDesc = desc.match(/SOLICITAÇÃO DE AÇÃO ESPECIAL\s+(?:para\s+([^:]+)|\[([^\]]+)\]):/i)
      if (mDesc) return (mDesc[1] || mDesc[2])?.trim()
      if (Boolean(meta.acao_especial) || meta.acao_especial_status === "pendente" || isMinhaFilaAcaoEspecial) {
        return "Equipe Responsável"
      }
      return null
    })()

    const acaoSolicitante = meta.acao_especial_solicitante || (() => {
      const obsLista = Array.isArray(meta.observacoes_historico) ? meta.observacoes_historico : []
      for (const item of obsLista.slice().reverse()) {
        const txt = String(item?.texto || "")
        if (txt.includes("SOLICITAÇÃO DE AÇÃO ESPECIAL") && item?.autor) {
          return item.autor
        }
      }
      return ticket.responsavel_nome || ticket.corretor_nome || ticket.user_nome || "Colaborador"
    })()

    const isAcaoAtendida = Boolean(
      meta.acao_especial_atendida ||
      (!meta.acao_especial && meta.acao_especial_status === "concluido" && (meta.acao_especial_solicitante || acaoDestinatario))
    )

    const temAcaoEspecial = Boolean(
      isAcaoAtendida ||
      (acaoDestinatario && (
        meta.acao_especial || 
        meta.acao_especial_status === "pendente" || 
        isMinhaFilaAcaoEspecial ||
        (Array.isArray(meta.observacoes_historico) && meta.observacoes_historico.some((o: any) => String(o?.texto || "").includes("SOLICITAÇÃO DE AÇÃO ESPECIAL"))) ||
        (ticket.descricao || "").includes("SOLICITAÇÃO DE AÇÃO ESPECIAL")
      ))
    )

    return (
      <div
        key={ticket.id}
        draggable={isDraggable}
        onDragStart={isDraggable ? (e) => {
          e.dataTransfer.setData("text/plain", ticket.id)
          e.dataTransfer.effectAllowed = "move"
          setDraggedTicket(ticket)
        } : undefined}
        onDragEnd={isDraggable ? () => {
          setDraggedTicket(null)
          setDragOverColumnId(null)
        } : undefined}
        onClick={() => handleCardClick(ticket)}
        className={cn(
          "bg-white rounded-lg p-3 shadow-xs hover:shadow-xl hover:shadow-slate-900/15 hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-200 ease-out transform space-y-2.5 relative group hover:z-50 has-[.group\\/concorrencia:hover]:z-[100]",
          (!isMinhaFilaAcaoEspecial && !isAcaoAtendida && (Boolean(meta.acao_especial) || meta.acao_especial_status === "pendente"))
            ? "border-2 border-amber-500 hover:border-amber-600 ring-2 ring-amber-400/30 shadow-xs"
            : (customBorderClass ? customBorderClass : "border border-slate-200 hover:border-slate-300"),
          isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
          draggedTicket?.id === ticket.id && "opacity-40 scale-95 border-dashed border-indigo-400"
        )}
      >
        {/* ETIQUETA NO TOPO DO CARTÃO (FECHADO / PERDIDO) */}
        {(() => {
          const prop = propostasPorCpf[ticket.id] || ticket.proposta_info
          const currentStage = inferKanbanStage(ticket, meta, prop)
          const topBadge = getCardTopBadge(ticket, currentStage, prop)

          if (!topBadge) return null

          return (
            <div className={cn(
              "w-full px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center justify-between shadow-2xs border -mt-0.5 mb-1",
              topBadge.bgClass,
              topBadge.borderClass,
              topBadge.textClass
            )}>
              <span className="flex items-center gap-1.5 truncate text-[11px]">
                {topBadge.icon}
                <span className="truncate">{topBadge.label}</span>
              </span>
              {topBadge.sub && (
                <span className="text-[11px] font-bold opacity-90 shrink-0 ml-1">
                  {topBadge.sub}
                </span>
              )}
            </div>
          )
        })()}

        {/* Indicação destacada de tempo de atraso (quando na aba Vencidas) */}
        {atrasoCustomTexto && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Atraso:</span>
            </span>
            <span className="font-extrabold text-rose-700">{atrasoCustomTexto}</span>
          </div>
        )}

        {/* Linha indicando para quem foi solicitada a ação especial ou por quem foi solicitada quando atendida */}
        {temAcaoEspecial && (
          <div className="bg-amber-50 border border-amber-300/90 px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            {isAcaoAtendida ? (
              <>
                <Zap className="w-3.5 h-3.5 text-[#0491d3] shrink-0" />
                <span className="truncate text-[#0491d3]">
                  Ação atendida por <span className="font-extrabold text-[#0491d3]">{meta.acao_especial_atendido_por || acaoSolicitante}</span>
                </span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate text-amber-900">
                  Ação solicitada para <span className="font-extrabold text-amber-950">{acaoDestinatario}</span>
                </span>
              </>
            )}
          </div>
        )}

        {/* 1. Cabeçalho Visual: Tags de Alerta e Cronômetro/Prazo */}
        <div className="flex items-start justify-between gap-1.5 text-[11px]">
          <div className="flex flex-wrap gap-1">
            {meta.alerta_atrasado && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse text-[12px]">
                🔴 ATRASADO
              </span>
            )}
            {/* ETIQUETA VISUAL NO CARTÃO DO PIPELINE: ATENDIDO POR 1 OU MAIS USUÁRIOS */}
            {(() => {
              const cleanCpf = (ticket.cliente_cpf || "").replace(/\D/g, "")
              const currentUserName = (perfil?.nome || user?.user_metadata?.nome || user?.email || "").trim()
              const currentUserNameLower = currentUserName.toLowerCase()
              const donoDesteCard = (ticket.responsavel_nome || ticket.corretor_nome || ticket.user_nome || "").trim()

              // Papéis com visualização de todos os usuários atendendo o lead:
              // Administrador, Monitoramento, Desenvolvedor, Operacional, Supervisor, Recursos Humanos
              const roleNorm = (perfil?.role || perfil?.funcao || userRole || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              const isVisualizadorTodos = Boolean(
                isAdmin ||
                isDeveloper ||
                isGestor ||
                roleNorm.includes("admin") ||
                roleNorm.includes("monitor") ||
                roleNorm.includes("desenv") ||
                roleNorm.includes("operacion") ||
                roleNorm.includes("supervisor") ||
                roleNorm.includes("recursos humanos") ||
                roleNorm === "rh"
              )

              // Corretores e Estagiários não têm acesso à etiqueta/funcionalidade de atendimento por outro usuário
              if (!isVisualizadorTodos) return null

              // 1. Operadores obtidos do mapa global concorrenciaPorCpf
              const listaDoMapa = (concorrenciaPorCpf[cleanCpf] || []).map(n => n.trim()).filter(Boolean)

              // 2. Operadores obtidos em memória na lista tickets com mesmo CPF
              const outrosAtendendo = tickets.filter(t => {
                if (t.id === ticket.id) return false
                const tCpf = (t.cliente_cpf || "").replace(/\D/g, "")
                if (!cleanCpf || tCpf !== cleanCpf) return false
                const tMeta = parseMetadata(t.descricao)
                const isDrawer = (
                  t.status === "NÃO EXISTE WHATSAPP" ||
                  t.status === "NAO_EXISTE_WHATSAPP" ||
                  t.status === "WHATSAPP DIVERGENTE" ||
                  Boolean(tMeta.tabulacao_whatsapp)
                )
                return !isDrawer && t.status !== "PERDIDO"
              })
              const outrosNomesMemoria = outrosAtendendo.map(t => (t.responsavel_nome || t.corretor_nome || t.user_nome || "").trim()).filter(Boolean)

              // 3. Metadados salvos
              const metaOutros = (Array.isArray(meta.concorrencia_outros_operadores) ? meta.concorrencia_outros_operadores : []).map((n: string) => typeof n === "string" ? n.trim() : "").filter(Boolean)

              // Unificar todos os operadores envolvidos no atendimento deste lead
              const todosAtendendo = Array.from(new Set([
                donoDesteCard,
                ...outrosNomesMemoria,
                ...listaDoMapa,
                ...metaOutros
              ])).filter(Boolean)

              // Verificar se há concorrência simultânea ativa neste lead
              const temConcorrencia = todosAtendendo.length > 1 || listaDoMapa.length > 1 || outrosAtendendo.length > 0 || Boolean(meta.conflito_titularidade)

              if (!temConcorrencia) return null

              const nomesExibir = todosAtendendo
              if (nomesExibir.length === 0) return null

              const totalCount = nomesExibir.length
              const labelTexto = `Atendido por ${totalCount} ${totalCount === 1 ? "usuário" : "usuários"}`
              const tituloBalao = `Usuários em atendimento (${totalCount}):`

              return (
                <div 
                  className="relative group/concorrencia inline-block z-40 hover:z-[110]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span 
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-[10px] tracking-tight whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-white shadow-xs border border-amber-600 ring-2 ring-amber-300/60 cursor-pointer select-none transition-all duration-150"
                  >
                    <Users className="w-3 h-3 text-white shrink-0" />
                    <span>{labelTexto}</span>
                  </span>

                  {/* Tooltip/Balão suspenso à frente de todos os elementos (z-[9999] e abertura abaixo da etiqueta) */}
                  <div className="hidden group-hover/concorrencia:flex flex-col absolute left-0 top-full mt-1.5 z-[9999] bg-slate-900/95 backdrop-blur-xs text-white text-xs rounded-lg p-2.5 shadow-2xl border border-slate-700/80 w-max max-w-xs pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95 ring-1 ring-black/20">
                    <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-slate-700/70 text-[11px] font-bold text-amber-300">
                      <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{tituloBalao}</span>
                    </div>
                    <ul className="space-y-1 text-[11px]">
                      {nomesExibir.map((nome, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-slate-100 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span className="truncate">{nome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })()}
            {!isDraggable && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {ticket.status}
              </span>
            )}

            {/* SINALIZAÇÃO DESTACADA DO MOTOR DE CADÊNCIA NO FRONTEND */}
            {(ticket.status === "EM RETOMADA" || ticket.status === "EM REATIVAÇÃO") && (() => {
              const cadState = getLeadCadenceState(ticket, meta)
              return (
                <span 
                  title={`Motor de Cadência ${cadState.tipo}: ${cadState.diasCiclo} • Próx: ${cadState.proximoVencimento ? format(cadState.proximoVencimento, "dd/MM 'às' HH:mm") : "Pendente"}`}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[10px] tracking-tight whitespace-nowrap shadow-xs border-2 ring-2 transition-all",
                    cadState.isPausado
                      ? "bg-blue-100 text-blue-950 border-blue-500 ring-blue-300/50"
                      : cadState.isEsperaFinal
                      ? "bg-amber-100 text-amber-950 border-amber-500 ring-amber-300/60 animate-pulse"
                      : ticket.status === "EM REATIVAÇÃO"
                      ? "bg-purple-100 text-purple-950 border-purple-500 ring-purple-300/50"
                      : "bg-emerald-100 text-emerald-950 border-emerald-500 ring-emerald-300/50"
                  )}
                >
                  <Zap className="w-3 h-3 text-emerald-700 fill-emerald-500 shrink-0" />
                  <span>
                    {formatSeloCadencia(cadState)}
                  </span>
                </span>
              )
            })()}
          </div>

          {/* Cronômetro / Tempo na Etapa */}
          <span className="text-slate-700 font-medium whitespace-nowrap flex items-center gap-1 text-[12px]">
            <Clock className="w-3 h-3 text-slate-600" />
            {ticket.updated_at 
              ? formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: false, locale: ptBR })
              : "recente"}
          </span>
        </div>

        {/* 2. Dados Principais do Cliente */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[13px] font-bold text-slate-900 tracking-tight line-clamp-1 group-hover:text-sky-600 transition-colors">
              {ticket.cliente_nome || "Nome não informado"}
            </h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleRevealCard(ticket.id)
              }}
              className="text-slate-700 hover:text-slate-900 p-0.5 cursor-pointer shrink-0 transition-colors"
              title={isCardRevealed ? "Ocultar dados" : "Revelar dados"}
            >
              {isCardRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-1 text-[12px] text-slate-500">
            <span className="text-[11px] text-slate-400 font-semibold">CPF:</span>
            <span
              onClick={(e) => {
                e.stopPropagation()
                if (ticket.cliente_cpf) {
                  handleCopy(ticket.cliente_cpf, "CPF")
                }
              }}
              className={cn(
                "font-mono font-medium text-slate-700 whitespace-nowrap transition-colors",
                ticket.cliente_cpf && "cursor-pointer hover:text-blue-600"
              )}
              title={ticket.cliente_cpf ? "Clique para copiar CPF" : undefined}
            >
              {isCardRevealed ? (ticket.cliente_cpf || "---") : maskCpf(ticket.cliente_cpf)}
            </span>
          </div>

          {/* TELEFONES DO LEAD */}
          {(() => {
            const allPhones = Array.from(new Set([
              ticket.cliente_telefone,
              ticket.cliente_telefone_2,
              ticket.cliente_telefone_3,
              ...(ticket.telefones || [])
            ].filter(Boolean) as string[]))

            const metaDesc = parseMetadata(ticket.descricao)
            const selected = (ticket.telefones_selecionados && ticket.telefones_selecionados.length > 0)
              ? ticket.telefones_selecionados
              : (Array.isArray(metaDesc.telefones_selecionados) && metaDesc.telefones_selecionados.length > 0)
                ? metaDesc.telefones_selecionados
                : []

            if (selected.length === 0) {
              return null
            }

            const filtered = allPhones.filter(phone => {
              const cleanPhone = phone.replace(/\D/g, "")
              return selected.some(sp => {
                const cleanSp = sp.replace(/\D/g, "")
                return cleanSp === cleanPhone || (cleanPhone.length >= 8 && cleanSp.slice(-8) === cleanPhone.slice(-8))
              })
            })
            const cardPhones = filtered.length > 0 ? filtered : selected

            if (cardPhones.length === 0) {
              return null
            }

            return (
              <div className="flex flex-col gap-0.5 text-[12px] text-slate-500">
                {cardPhones.map((phone, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {cardPhones.length > 1 ? `Tel ${pIdx + 1}:` : "Tel:"}
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        if (phone) {
                          handleCopy(phone, "Telefone")
                        }
                      }}
                      className={cn(
                        "font-mono font-medium text-slate-700 whitespace-nowrap transition-colors",
                        phone && "cursor-pointer hover:text-blue-600"
                      )}
                      title={phone ? "Clique para copiar Telefone" : undefined}
                    >
                      {isCardRevealed ? (formatPhone(phone) || "---") : maskPhone(phone)}
                    </span>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* CONVÊNIO (antigo Tipo, posicionado abaixo do telefone do cliente) */}
          {(() => {
            const rawConvenio = formatConvenioOrigem(ticket.convenio || (meta as any).convenio) !== "Não informado"
              ? formatConvenioOrigem(ticket.convenio || (meta as any).convenio)
              : (ticket.convenio || (meta as any).convenio || meta.selected_operation_type || "Consignado")

            return (
              <div className="flex items-center gap-1 text-[12px] text-slate-500">
                <span className="text-[11px] text-slate-400 font-semibold">Convênio:</span>
                <span className="font-medium text-slate-700 truncate max-w-[200px]" title={rawConvenio}>
                  {rawConvenio}
                </span>
              </div>
            )
          })()}
        </div>

        {/* 3. Informações Comerciais e de Titularidade */}
        {(() => {
          const rawOrigem = (
            ((meta as any).origem && (meta as any).origem !== "KANBAN" && (meta as any).origem !== "SISTEMA" ? (meta as any).origem : "") ||
            ((meta as any).cliente_origem ? (meta as any).cliente_origem : "") ||
            (ticket.origem && ticket.origem !== "KANBAN" && ticket.origem !== "SISTEMA" ? ticket.origem : "") ||
            (ticket.origem && ticket.origem !== "KANBAN" ? ticket.origem : "") ||
            (meta as any).origem ||
            "Não informada"
          )
          const rawEmpresaPhone = ticket.telefone_empresa || meta.telefone_empresa || ""
          const empresaPhoneFormatted = rawEmpresaPhone ? (formatPhone(rawEmpresaPhone) || rawEmpresaPhone) : "Não informado"

          return (
            <div className="bg-slate-50/90 rounded-md p-2 border border-slate-100 text-[12px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Origem do Cliente:</span>
                <span className="font-semibold text-slate-700 truncate max-w-[130px]" title={rawOrigem}>
                  {rawOrigem}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Produto/Modalidade:</span>
                <span 
                  className="font-bold text-slate-900 leading-tight uppercase truncate max-w-[150px]"
                  title={opData.label && opData.label !== "Valor Operação" ? opData.label.toUpperCase() : (meta.produto_modalidade || meta.modalidade || "---")}
                >
                  {opData.label && opData.label !== "Valor Operação" ? opData.label.toUpperCase() : (meta.produto_modalidade || meta.modalidade || "---")}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Valor Operação:</span>
                <span className="font-bold text-slate-900 leading-tight">
                  {opData.valor}
                </span>
              </div>
              {isGestor && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Responsável:</span>
                  <span className="font-semibold text-sky-700 truncate max-w-[130px]">
                    {ticket.user_nome || meta.corretor_nome || "Não atribuído"}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Número Utilizado:</span>
                <span className="font-semibold text-slate-700 truncate max-w-[130px]" title={empresaPhoneFormatted}>
                  {empresaPhoneFormatted}
                </span>
              </div>
            </div>
          )
        })()}

        {/* 4. Bloco da Próxima Ação */}
        <div className="bg-amber-100/90 border border-amber-300 rounded-md p-2 text-[12px] space-y-0.5 shadow-2xs">
          <div className="font-extrabold text-amber-950 flex items-center gap-1">
            <span>📌 PRÓXIMA AÇÃO:</span>
          </div>
          <p className="text-[12px] text-amber-900 font-semibold line-clamp-2">
            {proximaAcaoTexto}
          </p>
          <div className="text-[12px] text-amber-800 flex items-center gap-1 pt-0.5 font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Vencimento: {vencimentoLabel}</span>
          </div>
        </div>

        {/* 5. Barra de Ações Rápidas */}
        <div 
          className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenWhatsApp(ticket)}
            className="h-7 p-0 flex items-center justify-center text-emerald-600 bg-white hover:bg-emerald-500 hover:border-emerald-500 hover:text-white [&:hover>svg]:text-white flex-1 border border-emerald-200/90 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs"
            title="WhatsApp"
            aria-label="WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 transition-colors" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenAgendar(ticket)}
            className="h-7 p-0 flex items-center justify-center text-sky-600 bg-white hover:bg-sky-500 hover:border-sky-500 hover:text-white [&:hover>svg]:text-white flex-1 border border-sky-200/90 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs"
            title="Agendar Retorno"
            aria-label="Agendar"
          >
            <CalendarIcon className="w-3.5 h-3.5 transition-colors" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenMoverEtapa(ticket)}
            className="h-7 p-0 flex items-center justify-center text-indigo-600 bg-white hover:bg-indigo-600 hover:border-indigo-600 hover:text-white [&:hover>svg]:text-white flex-1 border border-indigo-200/90 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs"
            title="Mover para outra Etapa"
            aria-label="Mover"
          >
            <ArrowRight className="w-3.5 h-3.5 transition-colors" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoricoModalTicket(ticket)}
            className="h-7 p-0 flex items-center justify-center text-purple-600 bg-white hover:bg-purple-600 hover:border-purple-600 hover:text-white [&:hover>svg]:text-white flex-1 border border-purple-200/90 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs"
            title="Histórico do Atendimento"
            aria-label="Histórico do Atendimento"
          >
            <History className="w-3.5 h-3.5 transition-colors" />
          </Button>
        </div>
      </div>
    )
  }

  // Ordenação de tickets na Lista
  const sortTickets = useCallback((list: TicketItem[]) => {
    return [...list].sort((a, b) => {
      if (listSortBy === "valor") {
        const aData = getValorOperacaoDeAbertura(a)
        const aVal = parseValorToNumber(aData.valor) || Number(a.valor_operacao || a.margem || 0)
        const bData = getValorOperacaoDeAbertura(b)
        const bVal = parseValorToNumber(bData.valor) || Number(b.valor_operacao || b.margem || 0)
        return bVal - aVal
      }
      if (listSortBy === "nome") {
        const aNome = (a.cliente_nome || "").toLowerCase()
        const bNome = (b.cliente_nome || "").toLowerCase()
        return aNome.localeCompare(bNome)
      }
      const aMeta = parseMetadata(a.descricao)
      const bMeta = parseMetadata(b.descricao)
      const aTime = aMeta.vencimento_acao ? new Date(aMeta.vencimento_acao).getTime() : Infinity
      const bTime = bMeta.vencimento_acao ? new Date(bMeta.vencimento_acao).getTime() : Infinity
      return aTime - bTime
    })
  }, [listSortBy])

  // Filtro de tickets na Lista por termo de busca e colaborador CLT
  const filterTicketsBySearch = useCallback((list: TicketItem[]) => {
    let result = list

    // Filtro por Colaborador CLT (pode selecionar um ou vários)
    if (selectedCollaboratorIds.length > 0) {
      result = result.filter(t => {
        const meta = parseMetadata(t.descricao)
        const tId = String(t.user_id || meta.user_id || (meta as any).operador_id || "").trim().toLowerCase()
        const tNome = String(t.user_nome || meta.user_nome || (meta as any).operador_nome || "").trim().toLowerCase()

        return selectedCollaboratorIds.some(selectedId => {
          const selNorm = selectedId.trim().toLowerCase()
          if (tId && tId === selNorm) return true
          if (tNome && tNome === selNorm) return true
          const selectedUser = usersList.find(u => u.id === selectedId) || cltCollaborators.find(c => c.id === selectedId)
          if (selectedUser && tNome && selectedUser.nome.trim().toLowerCase() === tNome) return true
          if (selectedUser && tId && selectedUser.id.trim().toLowerCase() === tId) return true
          return false
        })
      })
    }

    const q = listSearch.trim().toLowerCase()
    if (!q) return result
    const qDigits = q.replace(/\D/g, "")
    return result.filter(t => {
      const nome = (t.cliente_nome || "").toLowerCase()
      const cpf = (t.cliente_cpf || "").replace(/\D/g, "")
      const meta = parseMetadata(t.descricao)
      const allPhones = [
        t.cliente_telefone,
        t.cliente_telefone_2,
        t.cliente_telefone_3,
        meta.cliente_telefone,
        meta.cliente_telefone_2,
        meta.cliente_telefone_3,
        ...(Array.isArray(t.telefones) ? t.telefones : []),
        ...(Array.isArray(meta.telefones) ? meta.telefones.map((x: any) => typeof x === "string" ? x : x?.numero) : [])
      ].map(p => typeof p === "string" ? p.replace(/\D/g, "") : "").filter(Boolean)

      const matchesPhone = qDigits.length >= 4 && allPhones.some(p => 
        p.includes(qDigits) || 
        qDigits.includes(p) || 
        (qDigits.length >= 8 && p.slice(-8) === qDigits.slice(-8))
      )

      return (
        nome.includes(q) ||
        (qDigits && (cpf.includes(qDigits) || matchesPhone))
      )
    })
  }, [listSearch, selectedCollaboratorIds, usersList, cltCollaborators])

  // Seções sequenciais de etapas para o Modo Lista
  const listSections = useMemo(() => {
    if (activeView === "MINHA_FILA") {
      return [
        {
          id: "agora",
          title: "Agora",
          subtitle: "Ações exigíveis no momento",
          badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
          headerBg: "bg-emerald-50/90 border-emerald-300",
          borderLeft: "border-l-4 border-l-emerald-600",
          icon: CheckCircle2,
          iconColor: "text-emerald-600",
          tickets: filaCategorias.agora,
          totalValor: filaCategorias.valorAgora
        },
        {
          id: "vencidas",
          title: "Vencidas",
          subtitle: "Ações com prazo expirado",
          badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
          headerBg: "bg-rose-50/90 border-rose-300",
          borderLeft: "border-l-4 border-l-rose-600",
          icon: AlertCircle,
          iconColor: "text-rose-600",
          tickets: filaCategorias.vencidas.map(i => i.ticket),
          totalValor: filaCategorias.valorVencidas
        },
        {
          id: "futuras",
          title: "Futuras",
          subtitle: "Ações programadas para mais tarde",
          badgeClass: "bg-sky-100 text-sky-800 border-sky-300",
          headerBg: "bg-sky-50/90 border-sky-300",
          borderLeft: "border-l-4 border-l-sky-600",
          icon: Clock,
          iconColor: "text-sky-600",
          tickets: filaCategorias.futuras,
          totalValor: filaCategorias.valorFuturas
        },
        {
          id: "acao_especial",
          title: "Ação Especial",
          subtitle: "Solicitações pendentes de ação especial",
          badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
          headerBg: "bg-amber-50/90 border-amber-300",
          borderLeft: "border-l-4 border-l-amber-500",
          icon: Zap,
          iconColor: "text-amber-600",
          tickets: filaCategorias.acaoEspecial,
          totalValor: filaCategorias.valorAcaoEspecial
        }
      ]
    } else {
      return KANBAN_COLUMNS.map(col => {
        const colTickets = groupedColumns[col.id] || []
        const totalColValor = colTickets.reduce((acc, t) => {
          const opData = getValorOperacaoDeAbertura(t)
          const opNum = parseValorToNumber(opData.valor)
          return acc + (opNum > 0 ? opNum : Number(t.valor_operacao || t.margem || 0))
        }, 0)
        return {
          id: col.id,
          title: col.title ? col.title.charAt(0).toUpperCase() + col.title.slice(1).toLowerCase() : col.title,
          subtitle: col.subtitle,
          badgeClass: col.badgeClass,
          headerBg: col.headerBg,
          borderLeft: `border-l-4 ${col.borderTop.replace('border-t-', 'border-l-')}`,
          icon: Kanban,
          iconColor: "text-slate-700",
          tickets: colTickets,
          totalValor: totalColValor
        }
      })
    }
  }, [activeView, filaCategorias, groupedColumns])

  // Agrupamento com filtros e busca aplicados
  const { totalListLeads, totalListValor, filteredListSections } = useMemo(() => {
    let leadsCount = 0
    let valorSum = 0

    const sections = listSections.map(sec => {
      let secTickets = filterTicketsBySearch(sec.tickets)
      secTickets = sortTickets(secTickets)

      const secVal = secTickets.reduce((acc, t) => {
        const opData = getValorOperacaoDeAbertura(t)
        const opNum = parseValorToNumber(opData.valor)
        return acc + (opNum > 0 ? opNum : Number(t.valor_operacao || t.margem || 0))
      }, 0)

      // Nos totais não deve ser contabilizado os cartões de atendimento que estiverem nas colunas 'Fechado' e 'Perdido'
      const isExcludedFromTotals = sec.id === "FECHADO" || sec.id === "PERDIDO"
      if (!isExcludedFromTotals) {
        leadsCount += secTickets.length
        valorSum += secVal
      }

      return {
        ...sec,
        displayTickets: secTickets,
        displayValor: secVal
      }
    })

    const finalSections = listFilterStage === "ALL" 
      ? sections 
      : sections.filter(s => s.id === listFilterStage)

    let displayLeadsCount = leadsCount
    let displayValorSum = valorSum

    if (listFilterStage !== "ALL") {
      const selectedSec = finalSections[0]
      if (selectedSec && selectedSec.id !== "FECHADO" && selectedSec.id !== "PERDIDO") {
        displayLeadsCount = selectedSec.displayTickets.length
        displayValorSum = selectedSec.displayValor
      } else {
        displayLeadsCount = 0
        displayValorSum = 0
      }
    }

    return {
      totalListLeads: displayLeadsCount,
      totalListValor: displayValorSum,
      filteredListSections: finalSections
    }
  }, [listSections, filterTicketsBySearch, sortTickets, listFilterStage])

  // Renderizador do Item em Modo Lista (Linha sequencial de etapa)
  const renderTicketListItem = (ticket: TicketItem) => {
    const meta = parseMetadata(ticket.descricao)
    const opData = getValorOperacaoDeAbertura(ticket)
    const opValorNum = parseValorToNumber(opData.valor)
    const valorTotal = opValorNum > 0 ? opValorNum : Number(ticket.valor_operacao || ticket.margem || 0)
    const isCpfRevealed = Boolean(revealedCpfs[ticket.id])
    const isPhoneRevealed = Boolean(revealedPhones[ticket.id])

    const rawPhone = (ticket.cliente_telefone || meta.cliente_telefone || "").replace(/\D/g, "")
    const isAltoValor = valorTotal >= 20000
    const isAcaoEspecial = Boolean(meta.acao_especial) || meta.acao_especial_status === "pendente"

    const etapaRow = inferKanbanStage(ticket, meta)
    const acaoRowConfig = proximasAcoesConfig.find(a => a.ativo && (
      a.etapa_kanban === etapaRow || 
      a.etapa_kanban === ticket.status ||
      (etapaRow === "ENTRADA DO SITE" && a.etapa_kanban === "EM ABORDAGEM")
    ))
    const isRowCustomAgendado = Boolean(meta.proxima_acao && /^\[(?:Agendad|Ação Especial|Retorno|Alerta)/i.test(meta.proxima_acao))
    const rawProximaAcao = isRowCustomAgendado
      ? meta.proxima_acao!
      : (acaoRowConfig?.titulo || meta.proxima_acao || (
          etapaRow === "EM ABORDAGEM" ? "Realizar Primeiro Contato Imediato" :
          etapaRow === "EM RETOMADA" ? "Enviar Régua de Retomada 1 via WhatsApp" :
          etapaRow === "EM NEGOCIAÇÃO" ? "Enviar simulação ajustada e esclarecer dúvidas" :
          etapaRow === "EM REATIVAÇÃO" ? "Resgatar contato esfriado após 48h úteis" :
          etapaRow === "SEM INTERESSE" ? "Programar cadência longa / nutrição" :
          etapaRow === "FECHADO" ? "Proposta Digitada no Sistema" :
          "Finalização registrada por inviabilidade"
        ))
    const proximaAcaoTexto = rawProximaAcao.replace(/^\[[^\]]+\]\s*/, "")

    const vencimentoLabel = meta.vencimento_acao 
      ? format(new Date(meta.vencimento_acao), "dd/MM 'às' HH:mm")
      : null

    const isEmRetomada = ticket.status === "EM RETOMADA"

    return (
      <div
        key={ticket.id}
        className={cn(
          "bg-white hover:bg-slate-50/90 border rounded-xl p-3 sm:p-3.5 transition-all shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-3 group select-none",
          isAcaoEspecial && activeView === "KANBAN"
            ? "border-amber-400 bg-amber-50/30"
            : "border-slate-200/90 hover:border-slate-300"
        )}
      >
        {/* Coluna 1: Informações do Cliente & Identificação */}
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight group-hover:text-sky-950 transition-colors">
              {formatShortName(ticket.cliente_nome) || ticket.cliente_nome || "Cliente sem Nome"}
            </span>

            {/* Selo do Motor de Cadência (RTs) ao lado direito do nome do cliente (padronizado com os selos de grupo) */}
            {(ticket.status === "EM RETOMADA" || ticket.status === "EM REATIVAÇÃO" || Boolean(meta.regua_etapa)) && (() => {
              const cadState = getLeadCadenceState(ticket, meta)
              return (
                <span 
                  title={`Motor de Cadência ${cadState.tipo}: ${cadState.diasCiclo} • Próx: ${cadState.proximoVencimento ? format(cadState.proximoVencimento, "dd/MM 'às' HH:mm") : "Pendente"}`}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[10.5px] leading-tight tracking-tight whitespace-nowrap shadow-2xs border ring-1 transition-all",
                    cadState.isPausado
                      ? "bg-blue-100 text-blue-950 border-blue-400 ring-blue-300/40"
                      : cadState.isEsperaFinal
                      ? "bg-amber-100 text-amber-950 border-amber-400 ring-amber-300/50 animate-pulse"
                      : ticket.status === "EM REATIVAÇÃO"
                      ? "bg-purple-100 text-purple-950 border-purple-400 ring-purple-300/40"
                      : "bg-emerald-100 text-emerald-950 border-emerald-400 ring-emerald-300/40"
                  )}
                >
                  <Zap className="w-2.5 h-2.5 text-emerald-700 fill-emerald-500 shrink-0" />
                  <span>
                    {formatSeloCadencia(cadState)}
                  </span>
                </span>
              )
            })()}
            {isAltoValor && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                Alto Valor
              </span>
            )}
            {isAcaoEspecial && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                Ação Especial {meta.acao_especial_destinatario ? `(${meta.acao_especial_destinatario})` : ""}
              </span>
            )}
            {(() => {
              const prop = propostasPorCpf[ticket.id] || ticket.proposta_info
              const currentStage = inferKanbanStage(ticket, meta, prop)
              const topBadge = getCardTopBadge(ticket, currentStage, prop)
              if (!topBadge) return null
              return (
                <span className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border shadow-2xs tracking-tight",
                  topBadge.bgClass,
                  topBadge.borderClass,
                  topBadge.textClass
                )}>
                  {topBadge.icon}
                  <span>{topBadge.label}</span>
                  {topBadge.sub && <span className="opacity-90 font-bold">({topBadge.sub})</span>}
                </span>
              )
            })()}
          </div>

          {/* CPF e Telefone com toggles e botões de cópia */}
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
            <div className="flex items-center gap-1 font-mono">
              <span>CPF:</span>
              <span className="font-semibold text-slate-700">
                {isCpfRevealed ? ticket.cliente_cpf : (ticket.cliente_cpf ? maskCpf(ticket.cliente_cpf) : "Não inf.")}
              </span>
              {ticket.cliente_cpf && (
                <button
                  type="button"
                  onClick={() => setRevealedCpfs(p => ({ ...p, [ticket.id]: !p[ticket.id] }))}
                  className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={isCpfRevealed ? "Ocultar CPF" : "Revelar CPF"}
                >
                  {isCpfRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              )}
              {ticket.cliente_cpf && (
                <button
                  type="button"
                  onClick={() => handleCopy(ticket.cliente_cpf!, "CPF")}
                  className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Copiar CPF"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </div>

            <span className="text-slate-300">|</span>

            <div className="flex items-center gap-1 font-mono">
              <Phone className="w-3 h-3 text-emerald-600" />
              <span className="font-semibold text-slate-700">
                {isPhoneRevealed 
                  ? (ticket.cliente_telefone || "Não inf.") 
                  : (ticket.cliente_telefone ? maskPhone(ticket.cliente_telefone) : "Não inf.")}
              </span>
              {ticket.cliente_telefone && (
                <button
                  type="button"
                  onClick={() => setRevealedPhones(p => ({ ...p, [ticket.id]: !p[ticket.id] }))}
                  className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={isPhoneRevealed ? "Ocultar Telefone" : "Revelar Telefone"}
                >
                  {isPhoneRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              )}
              {rawPhone && (
                <button
                  type="button"
                  onClick={() => handleCopy(rawPhone, "Telefone")}
                  className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Copiar Telefone"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Coluna 2: Convênio & Valores (Operação) */}
        <div className="min-w-[140px]">
          <div className="text-[10px] uppercase font-bold text-slate-400">
            Convênio / Operação
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-black text-slate-900">
              {valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {formatConvenioOrigem(meta.convenio || ticket.cliente_convenio || "INSS")}
            </span>
          </div>
          {opData.tipo && (
            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
              {opData.tipo} {opData.banco ? `• ${opData.banco}` : ""}
            </p>
          )}
        </div>

        {/* Coluna 3: Próxima Ação & Vencimento */}
        <div className="flex-1 min-w-[200px] max-w-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400">
            Próxima Ação & Prazo
          </div>
          <p className="text-xs text-slate-800 font-semibold truncate mt-0.5" title={proximaAcaoTexto}>
            {proximaAcaoTexto}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{vencimentoLabel ? `Vencimento: ${vencimentoLabel}` : "Sem agendamento definido"}</span>
            {meta.alerta_atrasado && (
              <span className="px-1.5 py-0.2 rounded-full font-bold bg-rose-100 text-rose-700 border border-rose-300">
                Atrasado
              </span>
            )}
          </div>
        </div>

        {/* Coluna 4: Responsável & Etapa */}
        <div className="min-w-[130px]">
          <div className="text-[10px] uppercase font-bold text-slate-400">
            Etapa / Responsável
          </div>
          <div className="mt-0.5">
            <span className="inline-block text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
              {ticket.status || "EM RETOMADA"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
            <User className="w-2.5 h-2.5" />
            <span>{ticket.responsavel_nome || "Não atribuído"}</span>
          </p>
        </div>

        {/* Coluna 5: Ações Rápidas (Execução item a item) */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Botão de Atendimento */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAtendimentoModalTicket(ticket)
              setAtendimentoMensagem("")
              setHistoricoMensagens([])
            }}
            className={cn(
              "h-8 px-2.5 text-xs font-bold rounded-lg border shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer",
              isEmRetomada
                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 hover:shadow-xs"
                : "bg-sky-600 hover:bg-sky-700 text-white border-sky-700 hover:shadow-xs"
            )}
            title={isEmRetomada ? "Iniciar Abordagem com este cliente" : "Abrir Informações do Cliente"}
          >
            {isEmRetomada ? <Zap className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {isEmRetomada ? "INICIAR ABORDAGEM" : "INFORMAÇÕES"}
            </span>
          </Button>

          {/* Botão AÇÃO ESPECIAL (cor âmbar da coluna Ação Especial) */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAtendimentoModalTicket(ticket)
              setIsAcaoEspecialModalOpen(true)
            }}
            className="h-8 px-2.5 text-xs font-bold rounded-lg border border-amber-400 bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Solicitar Ação Especial para este cliente"
          >
            <AlertCircle className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">AÇÃO ESPECIAL</span>
          </Button>

          {/* Botão Mover Etapa */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMoverModalTicket(ticket)
              setNovaEtapaSelecionada(ticket.status || "EM ABORDAGEM")
              setMotivoMudancaEtapa("")
            }}
            className="h-8 px-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 border border-indigo-200/80 rounded-lg text-xs font-semibold cursor-pointer"
            title="Mover etapa do Kanban"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>

          {/* Botão Histórico */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setHistoricoModalTicket(ticket)}
            className="h-8 w-8 p-0 text-purple-600 hover:text-purple-900 hover:bg-purple-50 border border-purple-200/80 rounded-lg cursor-pointer"
            title="Histórico do Atendimento"
          >
            <History className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  // Se for Corretor PJ ou usuário sem permissão: exibe mensagem informando que o módulo está restrito
  if (hasCheckedEnv && !canAccessKanban) {
    return (
      <div className="flex flex-col h-screen min-h-screen bg-[#FDFDFD]">
        <Header hideQuickLinks />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-[#FDFDFD]">
          <div className="max-w-lg w-full bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Kanban className="w-8 h-8" />
            </div>

            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100/70 text-rose-800 border border-rose-200">
                <Clock className="w-3.5 h-3.5" />
                Acesso Restrito
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Módulo KANBAN Restrito
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                O módulo KANBAN não está disponível para o perfil Corretor com regime PJ. Em caso de dúvidas, contate a administração.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Button
                variant="default"
                onClick={() => router.push("/")}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Voltar ao Início
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen min-h-screen bg-[#FDFDFD]">
      <Header hideQuickLinks>
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 mr-4 sm:mr-6 lg:mr-8">
          <div className="relative w-full max-w-[260px] sm:max-w-[320px] md:max-w-[360px] shrink-1">
            <Input 
              placeholder="Buscar Cliente por CPF ou Telefone" 
              value={clientSearchQuery}
              onChange={(e) => {
                setClientSearchQuery(e.target.value)
                if (clientSearchError) setClientSearchError(null)
              }}
              onKeyDown={(e) => e.key === "Enter" && handleClientSearch()}
              className="h-10 pr-10 pl-3.5 text-[12px] bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-400 text-slate-900 placeholder:text-slate-600 placeholder:font-medium rounded-xl transition-all"
            />
            <button
              type="button"
              onClick={handleClientSearch}
              disabled={isSearchingClient}
              title="Buscar Cliente"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Cards / Visões: Minha Fila e Kanban ao lado direito da busca */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Card / Visão: Minha Fila */}
            <div
              onClick={() => setActiveView("MINHA_FILA")}
              className={cn(
                "w-[125px] sm:w-[138px] shrink-0 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 cursor-pointer group select-none",
                activeView === "MINHA_FILA" && "ring-2 ring-sky-500 bg-sky-50/50 border-sky-300 shadow-xs"
              )}
              title="Visualizar Minha Fila (Tela inicial)"
            >
              <div className={cn(
                "w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors",
                activeView === "MINHA_FILA"
                  ? "bg-sky-500 text-white border-sky-600"
                  : "bg-sky-50 border-sky-200/60 text-sky-600"
              )}>
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className={cn(
                  "text-xs font-bold tracking-tight transition-colors leading-tight truncate",
                  activeView === "MINHA_FILA" ? "text-sky-950 font-black" : "text-slate-800 group-hover:text-slate-900"
                )}>
                  Minha Fila
                </p>
              </div>
            </div>

            {/* Card / Visão: Kanban */}
            <div
              onClick={() => setActiveView("KANBAN")}
              className={cn(
                "w-[125px] sm:w-[138px] shrink-0 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 cursor-pointer group select-none",
                activeView === "KANBAN" && "ring-2 ring-sky-500 bg-sky-50/50 border-sky-300 shadow-xs"
              )}
              title="Visualizar Pipeline Kanban"
            >
              <div className={cn(
                "w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors",
                activeView === "KANBAN"
                  ? "bg-sky-500 text-white border-sky-600"
                  : "bg-slate-100 border-slate-200 text-slate-600"
              )}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className={cn(
                  "text-xs font-bold tracking-tight transition-colors leading-tight truncate",
                  activeView === "KANBAN" ? "text-sky-950 font-black" : "text-slate-800 group-hover:text-slate-900"
                )}>
                  Kanban
                </p>
              </div>
            </div>
          </div>
        </div>
      </Header>
      
      <main className="flex-1 pt-2 px-3 sm:px-4 pb-2 sm:pb-3 space-y-2.5 overflow-hidden flex flex-col bg-[#FDFDFD] min-h-0">
        {/* Barra de Gavetas e Seletor de Modo (Quadro x Lista) */}
        <div className="flex items-center justify-between gap-2.5 shrink-0 overflow-x-auto pb-0.5 no-scrollbar">
          {/* Seletor de Modo: Quadro vs Lista (Alinhado à esquerda no início da linha) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 shadow-2xs shrink-0 select-none">
            <button
              type="button"
              onClick={() => setDisplayMode("QUADRO")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                displayMode === "QUADRO"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black"
                  : "text-slate-500 hover:text-slate-800"
              )}
              title="Visualização em Quadro (Colunas com cartões)"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-700" />
              <span>Quadro</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("LISTA")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                displayMode === "LISTA"
                  ? "bg-white text-sky-950 shadow-xs border border-sky-300 font-black"
                  : "text-slate-500 hover:text-slate-800"
              )}
              title="Visualização em Lista (Linhas sequenciais de etapas)"
            >
              <List className="w-3.5 h-3.5 text-sky-700" />
              <span>Lista</span>
            </button>
          </div>

          {/* Gavetas de WhatsApp Arquivado */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Gaveta: Não Existe Whatsapp */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                if (dragOverDrawer !== "NAO_EXISTE") setDragOverDrawer("NAO_EXISTE")
              }}
              onDragLeave={() => setDragOverDrawer(null)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverDrawer(null)
                const ticketId = e.dataTransfer.getData("text/plain")
                const ticketToMove = draggedTicket || tickets.find(t => t.id === ticketId)
                if (ticketToMove) {
                  handleDropInDrawer(ticketToMove, "NAO_EXISTE")
                }
              }}
              onClick={() => setSelectedDrawer("NAO_EXISTE")}
              className={cn(
                "w-[200px] sm:w-[215px] shrink-0 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2.5 cursor-pointer group select-none",
                dragOverDrawer === "NAO_EXISTE" && "ring-2 ring-rose-500 bg-rose-50/50 border-rose-300"
              )}
              title="Gaveta: Não Existe Whatsapp (Clique para abrir ou arraste leads para cá)"
            >
              <div className="w-6 h-6 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600 shrink-0">
                <PhoneOff className="w-3.5 h-3.5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 tracking-tight group-hover:text-slate-900 leading-tight truncate">
                  Não Existe Whatsapp
                </p>
                <p className="text-[9.5px] text-slate-400 font-medium leading-tight truncate">
                  {naoExisteWhatsappTickets.length} {naoExisteWhatsappTickets.length === 1 ? "lead arquivado" : "leads arquivados"}
                </p>
              </div>
              <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                {naoExisteWhatsappTickets.length}
              </span>
            </div>

            {/* Gaveta: Whatsapp Divergente */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                if (dragOverDrawer !== "DIVERGENTE") setDragOverDrawer("DIVERGENTE")
              }}
              onDragLeave={() => setDragOverDrawer(null)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverDrawer(null)
                const ticketId = e.dataTransfer.getData("text/plain")
                const ticketToMove = draggedTicket || tickets.find(t => t.id === ticketId)
                if (ticketToMove) {
                  handleDropInDrawer(ticketToMove, "DIVERGENTE")
                }
              }}
              onClick={() => setSelectedDrawer("DIVERGENTE")}
              className={cn(
                "w-[200px] sm:w-[215px] shrink-0 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2.5 cursor-pointer group select-none",
                dragOverDrawer === "DIVERGENTE" && "ring-2 ring-amber-500 bg-amber-50/50 border-amber-300"
              )}
              title="Gaveta: Whatsapp Divergente (Clique para abrir ou arraste leads para cá)"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                <MessageSquareOff className="w-3.5 h-3.5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 tracking-tight group-hover:text-slate-900 leading-tight truncate">
                  Whatsapp Divergente
                </p>
                <p className="text-[9.5px] text-slate-400 font-medium leading-tight truncate">
                  {whatsappDivergenteTickets.length} {whatsappDivergenteTickets.length === 1 ? "lead arquivado" : "leads arquivados"}
                </p>
              </div>
              <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                {whatsappDivergenteTickets.length}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Totais (Disponível tanto na visualização Quadro quanto Lista) */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <div className="relative flex-1 min-w-[180px] sm:min-w-[240px] max-w-md">
              <Input
                placeholder="Filtrar Atendimento por Nome, CPF ou Telefone..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="h-8.5 pr-8 pl-3 text-xs bg-slate-50 border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-500"
              />
              {listSearch && (
                <button
                  type="button"
                  onClick={() => setListSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Campo de seleção para filtrar por colaborador CLT (ao lado direito) */}
            <div className="relative shrink-0" ref={collaboratorDropdownRef}>
              <button
                type="button"
                onClick={() => setCollaboratorDropdownOpen(prev => !prev)}
                className={cn(
                  "h-8.5 px-3 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap",
                  selectedCollaboratorIds.length > 0
                    ? "bg-sky-50 border-sky-400 text-sky-900 shadow-2xs"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700"
                )}
                title="Filtrar por Colaborador"
              >
                <Users className={cn("w-3.5 h-3.5", selectedCollaboratorIds.length > 0 ? "text-sky-600" : "text-slate-500")} />
                <span className="truncate max-w-[130px] sm:max-w-[160px]">
                  {selectedCollaboratorIds.length === 0
                    ? "Colaborador"
                    : selectedCollaboratorIds.length === 1
                    ? (cltCollaborators.find(c => c.id === selectedCollaboratorIds[0])?.nome?.split(' ').slice(0, 2).join(' ') || "1 Selecionado")
                    : `${selectedCollaboratorIds.length} Colaboradores`}
                </span>
                {selectedCollaboratorIds.length > 0 ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedCollaboratorIds([])
                    }}
                    className="w-4 h-4 rounded-full bg-sky-200/70 hover:bg-sky-300 text-sky-800 flex items-center justify-center text-[10px] ml-0.5"
                    title="Limpar filtro de colaborador"
                  >
                    ×
                  </span>
                ) : (
                  <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", collaboratorDropdownOpen && "rotate-180")} />
                )}
              </button>

              {/* Menu de seleção suspenso */}
              {collaboratorDropdownOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-72 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-slate-900 text-xs animate-in fade-in-0 zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
                    <span className="font-bold text-[11px] text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" /> COLABORADORES
                    </span>
                    {selectedCollaboratorIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedCollaboratorIds([])}
                        className="text-[10.5px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        Limpar ({selectedCollaboratorIds.length})
                      </button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
                    {/* Opção Todos os colaboradores */}
                    <button
                      type="button"
                      onClick={() => setSelectedCollaboratorIds([])}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs",
                        selectedCollaboratorIds.length === 0
                          ? "bg-sky-50 text-sky-900 font-bold"
                          : "text-slate-700 hover:bg-slate-50 font-medium"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center text-[10px]",
                          selectedCollaboratorIds.length === 0 ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white"
                        )}>
                          {selectedCollaboratorIds.length === 0 && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        Todos os Colaboradores
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({cltCollaborators.length})
                      </span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {/* Lista dos Colaboradores CLT Ativos com atendimento no pipeline */}
                    {cltCollaborators.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-2 text-center">Nenhum colaborador com atendimento no pipeline</p>
                    ) : (
                      cltCollaborators.map(c => {
                        const isSelected = selectedCollaboratorIds.includes(c.id)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCollaboratorIds(prev =>
                                prev.includes(c.id)
                                  ? prev.filter(id => id !== c.id)
                                  : [...prev, c.id]
                              )
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs",
                              isSelected
                                ? "bg-sky-50 text-sky-900 font-bold"
                                : "text-slate-700 hover:bg-slate-50 font-medium"
                            )}
                          >
                            <span className="flex items-center gap-2 truncate pr-2">
                              <span className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px]",
                                isSelected ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white"
                              )}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </span>
                              <span className="truncate">{c.nome}</span>
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Filtro por Etapa */}
            <div className="relative shrink-0" ref={stageDropdownRef}>
              <button
                type="button"
                onClick={() => setStageDropdownOpen(prev => !prev)}
                className={cn(
                  "h-8.5 px-3 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap",
                  listFilterStage !== "ALL"
                    ? "bg-sky-50 border-sky-400 text-sky-900 shadow-2xs"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700"
                )}
                title="Filtrar por Etapa"
              >
                <Filter className={cn("w-3.5 h-3.5", listFilterStage !== "ALL" ? "text-sky-600" : "text-slate-500")} />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                  {listFilterStage === "ALL"
                    ? "Etapa"
                    : (listSections.find(s => s.id === listFilterStage)?.title || "Etapa")}
                </span>
                {listFilterStage !== "ALL" ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      setListFilterStage("ALL")
                    }}
                    className="w-4 h-4 rounded-full bg-sky-200/70 hover:bg-sky-300 text-sky-800 flex items-center justify-center text-[10px] ml-0.5"
                    title="Limpar filtro de etapa"
                  >
                    ×
                  </span>
                ) : (
                  <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", stageDropdownOpen && "rotate-180")} />
                )}
              </button>

              {/* Menu suspenso de Etapas */}
              {stageDropdownOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-72 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-slate-900 text-xs animate-in fade-in-0 zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
                    <span className="font-bold text-[11px] text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-slate-500" /> ETAPAS
                    </span>
                    {listFilterStage !== "ALL" && (
                      <button
                        type="button"
                        onClick={() => {
                          setListFilterStage("ALL")
                          setStageDropdownOpen(false)
                        }}
                        className="text-[10.5px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
                    {/* Opção Todas as etapas */}
                    <button
                      type="button"
                      onClick={() => {
                        setListFilterStage("ALL")
                        setStageDropdownOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs",
                        listFilterStage === "ALL"
                          ? "bg-sky-50 text-sky-900 font-bold"
                          : "text-slate-700 hover:bg-slate-50 font-medium"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center text-[10px]",
                          listFilterStage === "ALL" ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white"
                        )}>
                          {listFilterStage === "ALL" && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        Todas as etapas
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({totalListLeads})
                      </span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {/* Lista das etapas individuais */}
                    {listSections.map(sec => {
                      const isSelected = listFilterStage === sec.id
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => {
                            setListFilterStage(sec.id)
                            setStageDropdownOpen(false)
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs",
                            isSelected
                              ? "bg-sky-50 text-sky-900 font-bold"
                              : "text-slate-700 hover:bg-slate-50 font-medium"
                          )}
                        >
                          <span className="flex items-center gap-2 truncate pr-2">
                            <span className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px]",
                              isSelected ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white"
                            )}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                            <span className="truncate">{sec.title}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal shrink-0">
                            ({sec.tickets.length})
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Ordenação */}
            <div className="relative shrink-0" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setSortDropdownOpen(prev => !prev)}
                className={cn(
                  "h-8.5 px-3 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap",
                  listSortBy !== "vencimento"
                    ? "bg-sky-50 border-sky-400 text-sky-900 shadow-2xs"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700"
                )}
                title="Ordenar Lista"
              >
                <ArrowUpDown className={cn("w-3.5 h-3.5", listSortBy !== "vencimento" ? "text-sky-600" : "text-slate-500")} />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                  {listSortBy === "vencimento"
                    ? "Ordenar"
                    : listSortBy === "valor"
                    ? "Maior Valor"
                    : "Nome (A-Z)"}
                </span>
                {listSortBy !== "vencimento" ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      setListSortBy("vencimento")
                    }}
                    className="w-4 h-4 rounded-full bg-sky-200/70 hover:bg-sky-300 text-sky-800 flex items-center justify-center text-[10px] ml-0.5"
                    title="Restaurar ordenação padrão"
                  >
                    ×
                  </span>
                ) : (
                  <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", sortDropdownOpen && "rotate-180")} />
                )}
              </button>

              {/* Menu suspenso de Ordenação */}
              {sortDropdownOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-64 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-slate-900 text-xs animate-in fade-in-0 zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
                    <span className="font-bold text-[11px] text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" /> ORDENAÇÃO
                    </span>
                    {listSortBy !== "vencimento" && (
                      <button
                        type="button"
                        onClick={() => {
                          setListSortBy("vencimento")
                          setSortDropdownOpen(false)
                        }}
                        className="text-[10.5px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        Padrão
                      </button>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {[
                      { id: "vencimento", label: "⏱️ Vencimento (Urgência)" },
                      { id: "valor", label: "💰 Maior Valor de Operação" },
                      { id: "nome", label: "🔤 Nome do Cliente (A-Z)" },
                    ].map(opt => {
                      const isSelected = listSortBy === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setListSortBy(opt.id as "vencimento" | "valor" | "nome")
                            setSortDropdownOpen(false)
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs",
                            isSelected
                              ? "bg-sky-50 text-sky-900 font-bold"
                              : "text-slate-700 hover:bg-slate-50 font-medium"
                          )}
                        >
                          <span className="flex items-center gap-2 truncate pr-2">
                            <span className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px]",
                              isSelected ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white"
                            )}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                            <span className="truncate">{opt.label}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Totais Gerais */}
          <div className="flex items-center gap-2 shrink-0 text-sm pl-2 sm:border-l border-slate-200 self-end md:self-center">
            <span className="font-medium text-slate-600">
              <strong className="text-slate-900 font-bold">{totalListLeads}</strong> {totalListLeads === 1 ? "atendimento" : "atendimentos"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-medium text-slate-600">
              Total: <strong className="text-slate-950 font-black">{totalListValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
            </span>
          </div>
        </div>

        {/* Visão 1: Minha Fila (4 Colunas Simultâneas: Agora, Vencidas, Futuras e Ação Especial) em Modo Quadro */}
        {activeView === "MINHA_FILA" && displayMode === "QUADRO" && (() => {
          const ticketsAgoraAll = filterTicketsBySearch(filaCategorias.agora)
          const valorAgoraAll = ticketsAgoraAll.reduce((acc, t) => {
            const opData = getValorOperacaoDeAbertura(t)
            const opNum = parseValorToNumber(opData.valor)
            return acc + (opNum > 0 ? opNum : Number(t.valor_operacao || t.margem || 0))
          }, 0)

          const filteredVencidasAll = filaCategorias.vencidas.filter(item => filterTicketsBySearch([item.ticket]).length > 0)
          const valorVencidasAll = filteredVencidasAll.reduce((acc, i) => {
            const opData = getValorOperacaoDeAbertura(i.ticket)
            const opNum = parseValorToNumber(opData.valor)
            return acc + (opNum > 0 ? opNum : Number(i.ticket.valor_operacao || i.ticket.margem || 0))
          }, 0)

          const ticketsFuturasAll = filterTicketsBySearch(filaCategorias.futuras)
          const valorFuturasAll = ticketsFuturasAll.reduce((acc, t) => {
            const opData = getValorOperacaoDeAbertura(t)
            const opNum = parseValorToNumber(opData.valor)
            return acc + (opNum > 0 ? opNum : Number(t.valor_operacao || t.margem || 0))
          }, 0)

          const ticketsAcaoAll = filterTicketsBySearch(filaCategorias.acaoEspecial)
          const valorAcaoAll = ticketsAcaoAll.reduce((acc, t) => {
            const opData = getValorOperacaoDeAbertura(t)
            const opNum = parseValorToNumber(opData.valor)
            return acc + (opNum > 0 ? opNum : Number(t.valor_operacao || t.margem || 0))
          }, 0)

          const totalMinhaFilaLeads = ticketsAgoraAll.length + filteredVencidasAll.length + ticketsFuturasAll.length + ticketsAcaoAll.length
          const totalMinhaFilaValor = valorAgoraAll + valorVencidasAll + valorFuturasAll + valorAcaoAll

          return (
            <div className="flex-1 flex flex-col md:flex-row gap-3.5 sm:gap-4 h-full min-h-0 overflow-x-auto overflow-y-hidden">
                {/* Coluna 1: AGORA */}
                {(listFilterStage === "ALL" || listFilterStage === "agora") && (() => {
                  const ticketsAgora = sortTickets(ticketsAgoraAll)
                  const valorAgora = valorAgoraAll
                  const pctAgoraLeads = totalMinhaFilaLeads > 0 ? ((ticketsAgora.length / totalMinhaFilaLeads) * 100).toFixed(1).replace(".", ",") + "%" : "0%"
                  const pctAgoraValor = totalMinhaFilaValor > 0 ? ((valorAgora / totalMinhaFilaValor) * 100).toFixed(1).replace(".", ",") + "%" : "0%"
                  return (
                    <div className="flex-1 min-w-[260px] flex flex-col h-full min-h-0 rounded-xl border border-emerald-200/80 shadow-2xs overflow-hidden bg-emerald-50/70">
                      {/* Cabeçalho da Coluna Agora */}
                      <div className="p-3.5 border-b border-emerald-200/70 bg-emerald-50/70 border-t-4 border-t-emerald-600 rounded-t-xl shrink-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h2 className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Agora</span>
                          </h2>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {ticketsAgora.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mb-2">
                          Ações exigíveis no momento
                        </p>

                        {/* Totais Acumulados para Gestão e Operação */}
                        <div className="flex items-center justify-between pt-2 border-t border-black/10 text-[11px] gap-1">
                          <span className="font-semibold text-slate-800 whitespace-nowrap">
                            {ticketsAgora.length} {ticketsAgora.length === 1 ? "lead" : "leads"} <span className="font-bold text-slate-600">({pctAgoraLeads})</span>
                          </span>
                          <span className="font-extrabold text-slate-950 whitespace-nowrap text-right">
                            {valorAgora.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} <span className="font-bold text-slate-600">({pctAgoraValor})</span>
                          </span>
                        </div>
                      </div>

                      {/* Lista de Cards da Coluna Agora */}
                      <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar bg-emerald-50/70">
                        {ticketsAgora.length === 0 ? (
                          <div className="py-12 text-center text-xs text-emerald-800/60 font-medium">
                            Nenhum atendimento para agora
                          </div>
                        ) : (
                          ticketsAgora.map(ticket => renderTicketCard(ticket, undefined, false))
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Coluna 2: VENCIDAS */}
                {(listFilterStage === "ALL" || listFilterStage === "vencidas") && (() => {
                  const filteredVencidas = filteredVencidasAll
                  const valorVencidas = valorVencidasAll
                  const pctVencidasLeads = totalMinhaFilaLeads > 0 ? ((filteredVencidas.length / totalMinhaFilaLeads) * 100).toFixed(1).replace(".", ",") + "%" : "0%"
                  const pctVencidasValor = totalMinhaFilaValor > 0 ? ((valorVencidas / totalMinhaFilaValor) * 100).toFixed(1).replace(".", ",") + "%" : "0%"
                  return (
                    <div className="flex-1 min-w-[260px] flex flex-col h-full min-h-0 rounded-xl border border-rose-200/80 shadow-2xs overflow-hidden bg-rose-50/70">
                      {/* Cabeçalho da Coluna Vencidas */}
                      <div className="p-3.5 border-b border-rose-200/70 bg-rose-50/70 border-t-4 border-t-rose-600 rounded-t-xl shrink-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h2 className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Vencidas</span>
                          </h2>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                            {filteredVencidas.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mb-2">
                          Prazo de atendimento expirado
                        </p>

                        {/* Totais Acumulados para Gestão e Operação */}
                        <div className="flex items-center justify-between pt-2 border-t border-black/10 text-[11px] gap-1">
                          <span className="font-semibold text-slate-800 whitespace-nowrap">
                            {filteredVencidas.length} {filteredVencidas.length === 1 ? "lead" : "leads"} <span className="font-bold text-slate-600">({pctVencidasLeads})</span>
                          </span>
                          <span className="font-extrabold text-slate-950 whitespace-nowrap text-right">
                            {valorVencidas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} <span className="font-bold text-slate-600">({pctVencidasValor})</span>
                          </span>
                        </div>
                      </div>

                      {/* Lista de Cards da Coluna Vencidas */}
                      <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar bg-rose-50/70">
                        {filteredVencidas.length === 0 ? (
                          <div className="py-12 text-center text-xs text-rose-800/60 font-medium">
                            Nenhum atendimento vencido
                          </div>
                        ) : (
                          filteredVencidas.map(item => renderTicketCard(item.ticket, item.atrasoTexto, false))
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Coluna 3: FUTURAS */}
                {(listFilterStage === "ALL" || listFilterStage === "futuras") && (() => {
                  const ticketsFuturas = sortTickets(ticketsFuturasAll)
                  const valorFuturas = valorFuturasAll
                  const pctFuturasLeads = totalMinhaFilaLeads > 0 ? ((ticketsFuturas.length / totalMinhaFilaLeads) * 100).toFixed(1).replace(".", ",") + "%" : "0%"
                  const pctFuturasValor = totalMinhaFilaValor > 0 ? ((valorFuturas / totalMinhaFilaValor) * 100).toFixed(1).replace(".", ",") + "%" : "0%"
                  return (
                    <div className="flex-1 min-w-[260px] flex flex-col h-full min-h-0 rounded-xl border border-indigo-200/80 shadow-2xs overflow-hidden bg-indigo-50/70">
                      {/* Cabeçalho da Coluna Futuras */}
                      <div className="p-3.5 border-b border-indigo-200/70 bg-indigo-50/70 border-t-4 border-t-indigo-600 rounded-t-xl shrink-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h2 className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                            <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>Futuras</span>
                          </h2>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                            {ticketsFuturas.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mb-2">
                          Próximas ações do dia
                        </p>

                        {/* Totais Acumulados para Gestão e Operação */}
                        <div className="flex items-center justify-between pt-2 border-t border-black/10 text-[11px] gap-1">
                          <span className="font-semibold text-slate-800 whitespace-nowrap">
                            {ticketsFuturas.length} {ticketsFuturas.length === 1 ? "lead" : "leads"} <span className="font-bold text-slate-600">({pctFuturasLeads})</span>
                          </span>
                          <span className="font-extrabold text-slate-950 whitespace-nowrap text-right">
                            {valorFuturas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} <span className="font-bold text-slate-600">({pctFuturasValor})</span>
                          </span>
                        </div>
                      </div>

                      {/* Lista de Cards da Coluna Futuras */}
                      <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar bg-indigo-50/70">
                        {ticketsFuturas.length === 0 ? (
                          <div className="py-12 text-center text-xs text-indigo-800/60 font-medium">
                            Nenhum agendamento futuro
                          </div>
                        ) : (
                          ticketsFuturas.map(ticket => renderTicketCard(ticket, undefined, false))
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Coluna 4: AÇÃO ESPECIAL */}
                {(listFilterStage === "ALL" || listFilterStage === "acao_especial") && (() => {
                  const ticketsAcao = sortTickets(ticketsAcaoAll)
                  const valorAcao = valorAcaoAll
                  const pctAcaoLeads = totalMinhaFilaLeads > 0 ? ((ticketsAcao.length / totalMinhaFilaLeads) * 100).toFixed(1).replace(".", ",") + "%" : "0%"
                  const pctAcaoValor = totalMinhaFilaValor > 0 ? ((valorAcao / totalMinhaFilaValor) * 100).toFixed(1).replace(".", ",") + "%" : "0%"
                  return (
                    <div className="flex-1 min-w-[260px] flex flex-col h-full min-h-0 rounded-xl border border-amber-300/80 shadow-2xs overflow-hidden bg-amber-50/70">
                      {/* Cabeçalho da Coluna Ação Especial */}
                      <div className="p-3.5 border-b border-amber-200/70 bg-amber-50/70 border-t-4 border-t-amber-500 rounded-t-xl shrink-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h2 className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Ação Especial</span>
                          </h2>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            {ticketsAcao.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mb-2">
                          Intervenções e casos especiais
                        </p>

                        {/* Totais Acumulados para Gestão e Operação */}
                        <div className="flex items-center justify-between pt-2 border-t border-black/10 text-[11px] gap-1">
                          <span className="font-semibold text-slate-800 whitespace-nowrap">
                            {ticketsAcao.length} {ticketsAcao.length === 1 ? "lead" : "leads"} <span className="font-bold text-slate-600">({pctAcaoLeads})</span>
                          </span>
                          <span className="font-extrabold text-slate-950 whitespace-nowrap text-right">
                            {valorAcao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} <span className="font-bold text-slate-600">({pctAcaoValor})</span>
                          </span>
                        </div>
                      </div>

                      {/* Lista de Cards da Coluna Ação Especial */}
                      <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar bg-amber-50/70">
                        {ticketsAcao.length === 0 ? (
                          <div className="py-12 text-center text-xs text-amber-900/60 font-medium">
                            Nenhuma ação especial pendente
                          </div>
                        ) : (
                          ticketsAcao.map(ticket => renderTicketCard(ticket, undefined, false, undefined, true))
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
          )
        })()}

        {/* Visão 2: Quadro das Colunas do Kanban em Modo Quadro */}
        {activeView === "KANBAN" && displayMode === "QUADRO" && (() => {
          let kanbanAllColumnsTotalLeads = 0
          let kanbanAllColumnsTotalValor = 0

          KANBAN_COLUMNS.forEach(col => {
            const rawCol = filterTicketsBySearch(groupedColumns[col.id] || [])
            kanbanAllColumnsTotalLeads += rawCol.length
            kanbanAllColumnsTotalValor += rawCol.reduce((acc, t) => {
              const opData = getValorOperacaoDeAbertura(t)
              const opNum = parseValorToNumber(opData.valor)
              return acc + (opNum > 0 ? opNum : Number(t.valor_operacao || t.margem || 0))
            }, 0)
          })

          return (
            <div className="flex-1 overflow-x-auto pb-1 min-h-0 h-full">
              <div className="flex items-stretch gap-3.5 sm:gap-4 w-full min-w-max h-full">
                {KANBAN_COLUMNS
                  .filter(col => listFilterStage === "ALL" || col.id === listFilterStage)
                  .map(col => {
                    let colTickets = groupedColumns[col.id] || []
                    colTickets = filterTicketsBySearch(colTickets)
                    colTickets = sortTickets(colTickets)
                    const totalColValor = colTickets.reduce((acc, t) => {
                      const opData = getValorOperacaoDeAbertura(t)
                      const opNum = parseValorToNumber(opData.valor)
                      return acc + (opNum > 0 ? opNum : Number(t.valor_operacao || t.margem || 0))
                    }, 0)

                    const pctLeads = kanbanAllColumnsTotalLeads > 0
                      ? ((colTickets.length / kanbanAllColumnsTotalLeads) * 100).toFixed(1).replace(".", ",") + "%"
                      : "0%"
                    const pctValor = kanbanAllColumnsTotalValor > 0
                      ? ((totalColValor / kanbanAllColumnsTotalValor) * 100).toFixed(1).replace(".", ",") + "%"
                      : "0%"

                    return (
                      <div
                        key={col.id}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = "move"
                          if (dragOverColumnId !== col.id) {
                            setDragOverColumnId(col.id)
                          }
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setDragOverColumnId(null)
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          setDragOverColumnId(null)
                          const ticketId = e.dataTransfer.getData("text/plain")
                          const ticketToMove = draggedTicket || tickets.find(t => t.id === ticketId)
                          if (ticketToMove) {
                            executarMoverEtapa(ticketToMove, col.id)
                          }
                          setDraggedTicket(null)
                        }}
                        className={cn(
                          "flex-1 min-w-[260px] rounded-xl flex flex-col h-full min-h-0 shadow-xs transition-colors border",
                          col.bgColumn,
                          col.borderColumn,
                          dragOverColumnId === col.id && "ring-2 ring-indigo-500 brightness-95"
                        )}
                      >
                    {/* Cabeçalho da Coluna */}
                    <div className={cn("p-3.5 border-b rounded-t-xl border-t-4 shadow-xs", col.borderTop, col.headerBg)}>
                      <div className="flex items-center justify-between mb-0.5">
                        <h2 className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                          <span>{col.title ? col.title.charAt(0).toUpperCase() + col.title.slice(1).toLowerCase() : col.title}</span>
                        </h2>
                        <span className={cn("text-[11px] font-black px-2 py-0.5 rounded-full border", col.badgeClass)}>
                          {colTickets.length}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-700 font-medium line-clamp-1 mb-2">
                        {col.subtitle}
                      </p>

                      {/* Totais Acumulados para Gestão e Operação */}
                      <div className="flex items-center justify-between pt-2 border-t border-black/10 text-[11px] gap-1">
                        <span className="font-semibold text-slate-800 whitespace-nowrap">
                          {colTickets.length} {colTickets.length === 1 ? "lead" : "leads"} <span className="font-bold text-slate-600">({pctLeads})</span>
                        </span>
                        <span className="font-extrabold text-slate-950 whitespace-nowrap text-right">
                          {totalColValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} <span className="font-bold text-slate-600">({pctValor})</span>
                        </span>
                      </div>
                    </div>

                    {/* Lista de Cartões (Scroll Vertical) */}
                    <div className={cn("p-2 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar rounded-b-xl", col.bgColumn)}>
                      {colTickets.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-600 font-semibold">
                          Nenhum lead nesta etapa
                        </div>
                      ) : (
                        colTickets.map(ticket => renderTicketCard(ticket, undefined, true, col.cardBorder))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          )
        })()}

        {/* Visão Alternativa: Modo Lista (Linhas sequenciais de etapas) */}
        {displayMode === "LISTA" && (() => {
          const allListLeads = filteredListSections.reduce((acc, s) => acc + s.displayTickets.length, 0)
          const allListValor = filteredListSections.reduce((acc, s) => acc + s.displayValor, 0)

          return (
            <div className="flex-1 flex flex-col min-h-0 space-y-2.5 overflow-hidden">
              {/* Lista Sequencial de Seções de Etapas */}
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {filteredListSections.map(sec => {
                  const isCollapsed = collapsedSections[sec.id] !== undefined ? Boolean(collapsedSections[sec.id]) : true
                  const count = sec.displayTickets.length
                  const valor = sec.displayValor
                  const IconComponent = sec.icon || Kanban
                  const pctLeads = allListLeads > 0 ? ((count / allListLeads) * 100).toFixed(1).replace(".", ",") + "%" : "0%"
                  const pctValor = allListValor > 0 ? ((valor / allListValor) * 100).toFixed(1).replace(".", ",") + "%" : "0%"

                  return (
                    <div
                      key={sec.id}
                      className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs"
                    >
                      {/* Cabeçalho da Etapa / Seção (Linha expansível) */}
                      <div
                        onClick={() => toggleSectionCollapse(sec.id)}
                        className={cn(
                          "p-3 sm:px-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors border-b",
                          sec.headerBg,
                          sec.borderLeft,
                          isCollapsed ? "border-b-transparent" : "border-b-slate-200/80"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn("p-1.5 rounded-lg bg-white/90 border border-slate-200 shadow-2xs shrink-0", sec.iconColor)}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-sm text-slate-900 tracking-tight truncate">
                                {sec.title}
                              </h3>
                              <span className={cn("text-[10.5px] font-black px-2 py-0.5 rounded-full border shadow-2xs", sec.badgeClass)}>
                                {count} {count === 1 ? "lead" : "leads"} <span className="opacity-80 font-bold ml-1">({pctLeads})</span>
                              </span>
                            </div>
                            {sec.subtitle && (
                              <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                                {sec.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                              Total da Etapa
                            </p>
                            <p className="text-xs font-black text-slate-900">
                              {valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} <span className="text-[10.5px] font-bold text-slate-500 ml-1">({pctValor})</span>
                            </p>
                          </div>
                          <div className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-transform">
                            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isCollapsed && "-rotate-90")} />
                          </div>
                        </div>
                      </div>

                      {/* Itens Sequenciais da Etapa */}
                      {!isCollapsed && (
                        <div className="p-2 sm:p-3 space-y-2 bg-slate-50/40">
                          {count === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400 font-medium">
                              Nenhum lead nesta etapa
                            </div>
                          ) : (
                            sec.displayTickets.map(ticket => renderTicketListItem(ticket))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
  </main>

      {/* MODAL 1: ATENDIMENTO (Corretor / Estagiário) */}
      {atendimentoModalTicket && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAFAFA] rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            {/* Cabeçalho da Modal */}
            <div className="px-4 pb-4 pt-8 bg-[#FFFFFF] border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-xs mt-0.5 shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="space-y-1">
                  {/* NOME DO CLIENTE */}
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                      {atendimentoModalTicket.cliente_nome || "Nome não informado"}
                    </h2>
                    <button
                      type="button"
                      onClick={() => toggleRevealCard(atendimentoModalTicket.id)}
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer transition-colors"
                      title={revealedCpfs[atendimentoModalTicket.id] || revealedPhones[atendimentoModalTicket.id] ? "Ocultar dados" : "Revelar dados"}
                    >
                      {revealedCpfs[atendimentoModalTicket.id] || revealedPhones[atendimentoModalTicket.id] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* CPF */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="font-semibold text-slate-500">CPF:</span>
                    <span
                      onClick={() => atendimentoModalTicket.cliente_cpf && handleCopy(atendimentoModalTicket.cliente_cpf, "CPF")}
                      className={cn(
                        "font-mono font-medium text-slate-800 transition-colors",
                        atendimentoModalTicket.cliente_cpf && "cursor-pointer hover:text-indigo-600"
                      )}
                      title={atendimentoModalTicket.cliente_cpf ? "Clique para copiar CPF" : undefined}
                    >
                      {revealedCpfs[atendimentoModalTicket.id] || revealedPhones[atendimentoModalTicket.id]
                        ? (atendimentoModalTicket.cliente_cpf || "---")
                        : maskCpf(atendimentoModalTicket.cliente_cpf)}
                    </span>
                  </div>

                  {/* TELEFONES */}
                  {(() => {
                    const isRevealed = Boolean(revealedCpfs[atendimentoModalTicket.id] || revealedPhones[atendimentoModalTicket.id])
                    const allModalPhones = Array.from(new Set([
                      ...(atendimentoModalTicket.telefones || []),
                      atendimentoModalTicket.cliente_telefone,
                      atendimentoModalTicket.cliente_telefone_2,
                      atendimentoModalTicket.cliente_telefone_3,
                    ].filter(Boolean) as string[]))

                    const meta = parseMetadata(atendimentoModalTicket.descricao)
                    const selected = (atendimentoModalTicket.telefones_selecionados && atendimentoModalTicket.telefones_selecionados.length > 0)
                      ? atendimentoModalTicket.telefones_selecionados
                      : (Array.isArray(meta.telefones_selecionados) && meta.telefones_selecionados.length > 0)
                        ? meta.telefones_selecionados
                        : []

                    // Somente os telefones selecionados devem ser mostrados. Se não for selecionado, não mostra.
                    if (selected.length === 0) {
                      return null
                    }

                    const filtered = allModalPhones.filter(phone => {
                      const cleanPhone = phone.replace(/\D/g, "")
                      return selected.some(sp => {
                        const cleanSp = sp.replace(/\D/g, "")
                        return cleanSp === cleanPhone || (cleanPhone.length >= 8 && cleanSp.slice(-8) === cleanPhone.slice(-8))
                      })
                    })
                    const modalPhones = filtered.length > 0 ? filtered : selected

                    if (modalPhones.length === 0) {
                      return null
                    }

                    return (
                      <div className="flex flex-col gap-0.5">
                        {modalPhones.map((tel, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                            <span className="font-semibold text-slate-500 select-none">
                              {modalPhones.length > 1 ? `Tel ${idx + 1}:` : "Tel:"}
                            </span>
                            <span
                              onClick={() => tel && handleCopy(tel, "Telefone")}
                              className={cn(
                                "font-mono font-medium text-slate-800 transition-colors",
                                tel && "cursor-pointer hover:text-indigo-600"
                              )}
                              title={tel ? "Clique para copiar Telefone" : undefined}
                            >
                              {isRevealed
                                ? (formatPhone(tel) || "---")
                                : maskPhone(tel)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {/* CONVÊNIO (EM TODAS AS ETAPAS) */}
                  {(() => {
                    const meta = parseMetadata(atendimentoModalTicket.descricao)
                    const conv = resolvedConvenio || formatConvenioOrigem(atendimentoModalTicket.convenio || meta.convenio) || "Não informado"
                    return (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="font-semibold text-slate-500">Convênio:</span>
                        <span className="font-medium text-slate-800">
                          {conv}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isGestor && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const t = atendimentoModalTicket
                      setAtendimentoModalTicket(null)
                      setSupervisaoModalTicket(t)
                    }}
                    className="text-xs h-7 bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 gap-1 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Painel de Gestão
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                  onClick={() => setAtendimentoModalTicket(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Conteúdo Principal */}
            {(() => {
              const modalMeta = parseMetadata(atendimentoModalTicket.descricao)
              const modalStage = inferKanbanStage(atendimentoModalTicket, modalMeta)
              const isEtapaPersonalizada = true

              const hasChamadoNoAtendimento = clientTicketsHistory.length > 0
              const hasPropostaNoAtendimento = clientProposalsHistory.length > 0 || Boolean((modalMeta as any)?.proposta_id || (modalMeta as any)?.proposta_numero)
              const hasChamadoOuPropostaNoAtendimento = hasChamadoNoAtendimento || hasPropostaNoAtendimento

              const convenioOrigemDisplay = resolvedConvenio || formatConvenioOrigem(atendimentoModalTicket.convenio || modalMeta.convenio) || "Não informado"

              return (
                <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs bg-[#FAFAFA] text-slate-800">
                  {/* Informações Resumidas do Cliente */}
                  {!isEtapaPersonalizada && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                      <div>
                        <span className="text-slate-500 block text-xs font-medium">Telefone Principal</span>
                        <span className="font-semibold text-slate-800">{atendimentoModalTicket.cliente_telefone || "Sem telefone"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-xs font-medium">Convênio / Órgão</span>
                        <span className="font-semibold text-slate-800">{convenioOrigemDisplay}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-xs font-medium">Valor da Operação</span>
                        {(() => {
                          const modalOpData = getValorOperacaoDeAbertura(atendimentoModalTicket)
                          return (
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm leading-tight">
                                {modalOpData.valor}
                              </span>
                              <span className={cn("text-[10px] uppercase font-black tracking-tight mt-0.5", modalOpData.color)}>
                                {modalOpData.label}
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )}

                  {/* PAINEL DO MOTOR DE CADÊNCIA & RÉGUAS - SINALIZAÇÃO DESTACADA NO FRONTEND */}
                  {modalCadencia && (atendimentoModalTicket.status === "EM RETOMADA" || atendimentoModalTicket.status === "EM REATIVAÇÃO") && (
                    <div className="rounded-xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 via-teal-50/80 to-amber-50/90 p-3.5 shadow-md ring-2 ring-emerald-400/40 space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-emerald-200/80 pb-2">
                        <div className="flex items-center gap-2">
                          <strong className="text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-xs shadow-2xs">
                            {formatEtapaLabel(modalCadencia.etapaRegua)}
                          </strong>
                          <span className="text-slate-400 font-bold">•</span>
                          <span className="text-slate-900 font-extrabold text-xs">
                            {formatMarcoLabel(modalCadencia.diasCiclo)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-700">
                        <span>
                          Próximo Vencimento: <strong className="text-slate-900 font-bold">{modalCadencia.proximoVencimento ? format(modalCadencia.proximoVencimento, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Pendente de agendamento"}</strong>
                        </span>
                        {modalCadencia.isPausado && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Pausado (Cliente Respondeu)
                          </span>
                        )}
                      </div>

                      {/* Botões do Motor de Cadência */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {modalCadencia.proximaEtapa ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAvancarCadencia}
                            disabled={isAvancandoCadencia}
                            className="h-8 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5 border border-emerald-700/30 cursor-pointer"
                            title="Confirma envio da régua atual e agenda a próxima etapa calculada por dias úteis"
                          >
                            {isAvancandoCadencia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            {formatEtapaLabel(modalCadencia.etapaRegua)} Executada! Agendar {modalCadencia.proximaEtapa === "ESPERA_FINAL" ? "Aguardar Retorno (1,5d)" : formatEtapaLabel(modalCadencia.proximaEtapa)}
                          </Button>
                        ) : modalCadencia.isEsperaFinal ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleEncerrarPorEsgotamento}
                            disabled={isAvancandoCadencia}
                            className="h-8 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white shadow-sm gap-1.5 border border-amber-700/30 cursor-pointer"
                            title="Esgotar cadência e mover para Perdido com histórico após 1,5 dia útil"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Esgotar Cadência e Mover para Perdido (1,5 dia útil)
                          </Button>
                        ) : null}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClienteRespondeu}
                          disabled={isAvancandoCadencia}
                          className="h-8 text-xs font-bold text-sky-800 bg-sky-50 border-sky-300 hover:bg-sky-100 gap-1.5 shadow-2xs cursor-pointer"
                          title="Pausa a cadência e avança o lead para Negociação"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-sky-600" />
                          Cliente Respondeu (Mover para Negociação)
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Ações Rápidas de Desfecho (Ocultado nas etapas personalizadas) */}
                  {!isEtapaPersonalizada && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Atalhos de Registro Rápido:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100"
                          onClick={() => setAtendimentoMensagem("✅ Primeiro Contato (A0) realizado com sucesso via WhatsApp. Aguardando retorno do cliente.")}
                        >
                          A0 Realizado
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100"
                          onClick={() => setAtendimentoMensagem("📲 Régua de Retomada enviada no WhatsApp com nova simulação de valores.")}
                        >
                          Régua Enviada
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100"
                          onClick={() => setAtendimentoMensagem("📑 Cliente solicitou simulação personalizada de prazos e parcelas.")}
                        >
                          Simulação Solicitada
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                          onClick={() => setAtendimentoMensagem("📄 Documentação de RG e comprovante recebida do cliente para digitação da proposta.")}
                        >
                          Documentos Recebidos
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100"
                          onClick={() => setAtendimentoMensagem("❌ Cliente declarou desinteresse no momento. Autorizou contato futuro.")}
                        >
                          Sem Interesse
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-2 pb-4">
                    <div className="flex items-center gap-5">
                      {/* Opção 'Sem interação': fica oculta quando a seção dos RTs estiver ativa em 'Em interação ou retomada' ou a dos REs em 'Em reativação' */}
                      {!(
                        modalCadencia && (
                          atendimentoModalTicket.status === "EM RETOMADA" ||
                          atendimentoModalTicket.status === "EM REATIVAÇÃO" ||
                          modalStage === "EM RETOMADA" ||
                          modalStage === "EM REATIVAÇÃO"
                        )
                      ) && (
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <input
                            type="checkbox"
                            checked={opcaoSelecionada === "Sem interação"}
                            onChange={() => handleToggleOpcaoAtendimento("Sem interação")}
                            disabled={isSavingOpcao}
                            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                          />
                          <span>Sem interação</span>
                        </label>
                      )}

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none hover:text-slate-900 transition-colors">
                        <input
                          type="checkbox"
                          checked={opcaoSelecionada === "Sem interesse" && modalStage === "SEM INTERESSE"}
                          onChange={() => handleToggleOpcaoAtendimento("Sem interesse")}
                          disabled={isSavingOpcao}
                          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                        />
                        <span>Sem interesse</span>
                      </label>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleIniciarAbordagem}
                        className="text-xs h-7.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs px-3 rounded-lg cursor-pointer w-full sm:w-auto justify-center"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {hasChamadoOuPropostaNoAtendimento
                          ? "INFORMAÇÕES DO CLIENTE"
                          : (modalStage === "EM ABORDAGEM" || modalStage === "EM RETOMADA"
                              ? "INICIAR ABORDAGEM"
                              : "INFORMAÇÕES DO CLIENTE")}
                      </Button>

                      {(() => {
                        const currentMeta = parseMetadata(atendimentoModalTicket.descricao)
                        const isAcaoEspecialPendente = Boolean(currentMeta.acao_especial || currentMeta.acao_especial_status === "pendente")
                        const roleNorm = (perfil?.role || perfil?.funcao || userRole || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        const canAtenderAcaoEspecial = Boolean(
                          isAdmin ||
                          isGestor ||
                          isDeveloper ||
                          roleNorm.includes("admin") ||
                          roleNorm.includes("supervisor") ||
                          roleNorm.includes("operacion") ||
                          roleNorm.includes("monitor") ||
                          (currentMeta.acao_especial_destinatario && (
                            (perfil?.nome || "").toLowerCase().trim() === currentMeta.acao_especial_destinatario.toLowerCase().trim() ||
                            (user?.user_metadata?.nome || "").toLowerCase().trim() === currentMeta.acao_especial_destinatario.toLowerCase().trim()
                          ))
                        )

                        if (isAcaoEspecialPendente && canAtenderAcaoEspecial) {
                          return (
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleAtenderAcaoEspecial}
                              disabled={isSubmittingAcaoEspecial}
                              className="text-xs h-7.5 bg-[#0491d3] hover:bg-[#037cb5] text-white font-bold gap-1.5 shadow-xs px-3 rounded-lg cursor-pointer w-full sm:w-auto justify-center border border-[#0491d3]/40"
                              title="Marcar Ação Especial como atendida e retornar cartão para a coluna de origem"
                            >
                              {isSubmittingAcaoEspecial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              AÇÃO ESPECIAL ATENDIDA
                            </Button>
                          )
                        }

                        return (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsAcaoEspecialModalOpen(true)}
                            className="text-xs h-7.5 bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1.5 shadow-xs px-3 rounded-lg cursor-pointer w-full sm:w-auto justify-center border border-amber-600/30"
                            title="Solicitar Ação Especial"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            SOLICITAR AÇÃO ESPECIAL
                          </Button>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Card da Seção de Observações */}
                  <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-2.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Registrar Resultado do Contato / Observação:
                    </label>
                    <textarea
                      value={atendimentoMensagem}
                      onChange={e => setAtendimentoMensagem(e.target.value)}
                      placeholder="Descreva o andamento da conversa com o cliente, objeções ou próximos passos..."
                      rows={3}
                      className="w-full text-xs p-3 bg-slate-50/50 border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors shadow-2xs"
                    />
                    <div className="flex items-center justify-end pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveAtendimentoInteracao("atendimento_registro")}
                        disabled={isSubmittingAtendimento || !atendimentoMensagem.trim()}
                        className="text-xs h-8 bg-sky-600 hover:bg-sky-500 text-white gap-1 shadow-sm font-semibold cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Salvar Registro
                      </Button>
                    </div>

                    {/* Observações registradas exibidas logo abaixo da linha do botão, somente texto preto 70%, sem card, com data e hora ao lado esquerdo e texto em itálico */}
                    {(() => {
                      const cleanObservacaoFicha = (atendimentoModalTicket.descricao || "")
                        .replace(/<!-- TICKET_METADATA: ([\s\S]*?) -->/g, "")
                        .trim()
                      const meta = parseMetadata(atendimentoModalTicket.descricao)

                      // Lista bruta consultada EXCLUSIVAMENTE da tabela kanban_fichas
                      const itensBrutos: Array<{ texto: string; data?: string }> = []

                      // 1. Do histórico de observações salvas na própria ficha (coluna metadata de kanban_fichas)
                      if (Array.isArray(meta.observacoes_historico)) {
                        meta.observacoes_historico.forEach((item: any) => {
                          if (item && isUserObservation(item.texto)) {
                            const partes = String(item.texto).trim().split(/\n\s*\n/)
                            partes.forEach(p => {
                              const trimmed = p.trim()
                              if (trimmed && isUserObservation(trimmed)) {
                                itensBrutos.push({
                                  texto: trimmed,
                                  data: item.data
                                })
                              }
                            })
                          }
                        })
                      }

                      // 2. Da coluna observações direta da tabela kanban_fichas
                      if (isUserObservation(cleanObservacaoFicha)) {
                        const blocos = cleanObservacaoFicha.split(/\n\s*\n/)
                        blocos.forEach(b => {
                          const trimmed = b.trim()
                          if (isUserObservation(trimmed)) {
                            itensBrutos.push({
                              texto: trimmed,
                              data: meta.observacao_data || atendimentoModalTicket.updated_at || atendimentoModalTicket.created_at
                            })
                          }
                        })
                      }

                      // 3. Do agendamento salvo na ficha
                      if (meta.agendamento_obs && isUserObservation(meta.agendamento_obs)) {
                        const dataAg = meta.agendamento_data || meta.vencimento_acao
                        let textoAg = meta.agendamento_obs.trim()
                        if (dataAg) {
                          try {
                            const dFormat = format(new Date(dataAg), "dd/MM 'às' HH:mm")
                            textoAg = `📅 Retorno agendado para ${dFormat} - ${meta.agendamento_obs.trim()}`
                          } catch {}
                        }
                        itensBrutos.push({
                          texto: textoAg,
                          data: dataAg || meta.observacao_data || atendimentoModalTicket.updated_at
                        })
                      }

                      // Deduplicação estrita por texto normalizado
                      const seen = new Set<string>()
                      const lista: Array<{ texto: string; data?: string }> = []

                      itensBrutos.forEach(item => {
                        const key = item.texto.trim().toLowerCase().replace(/\s+/g, " ")
                        if (!key || seen.has(key)) return
                        seen.add(key)
                        lista.push(item)
                      })

                      if (lista.length === 0) return null

                      // Ordenar para follow-up cronológico (mais recentes primeiro)
                      lista.sort((a, b) => {
                        const tA = a.data ? new Date(a.data).getTime() : 0
                        const tB = b.data ? new Date(b.data).getTime() : 0
                        return tB - tA
                      })

                      return (
                        <div className="pt-2.5 border-t border-slate-100 space-y-2">
                          <h5 className="text-xs font-bold text-slate-700 block">
                            Últimas observações
                          </h5>
                          {lista.map((obs, idx) => {
                            let formattedDate = ""
                            let periodoText = ""
                            if (obs.data) {
                              try {
                                const dataObj = new Date(obs.data)
                                formattedDate = format(dataObj, "dd/MM/yyyy HH:mm")
                                periodoText = formatDistanceToNow(dataObj, { addSuffix: false, locale: ptBR })
                                  .replace(/^cerca de\s*/i, "")
                                  .replace(/^aproximadamente\s*/i, "")
                              } catch {
                                formattedDate = ""
                                periodoText = ""
                              }
                            }

                            return (
                              <p key={idx} className="whitespace-pre-wrap leading-relaxed">
                                {formattedDate && (
                                  <span className="text-[11.5px] font-semibold not-italic text-black/45 mr-1.5">
                                    {formattedDate} {periodoText ? `(${periodoText})` : ""} -
                                  </span>
                                )}
                                <span className="text-[12.7px] italic text-black/90">
                                  {formatObservacaoTexto(obs.texto)}
                                </span>
                              </p>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>

                  {/* 1. Histórico de Propostas Comerciais */}
                  <div className="mt-5 pt-5 border-t border-slate-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-5 bg-[#162546] rounded-full"></div>
                      <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        Histórico de Propostas Comerciais{" "}
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-[#162546]/10 text-[#162546] border-none font-black font-sans uppercase">
                          {clientProposalsHistory.length} {clientProposalsHistory.length === 1 ? 'Proposta Comercial' : 'Propostas Comerciais'}
                        </Badge>
                      </h4>
                    </div>

                    {isLoadingClientProposalsHistory ? (
                      <div className="flex items-center gap-2 justify-center py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <Loader2 className="w-4 h-4 animate-spin text-[#162546]" />
                        <span>Buscando histórico de propostas comerciais...</span>
                      </div>
                    ) : clientProposalsHistory.length === 0 ? (
                      <div className="p-3.5 text-center text-xs font-semibold text-slate-400 bg-white rounded-xl border border-slate-200/80">
                        Nenhuma proposta comercial gerada para este cliente.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {clientProposalsHistory.map((proposal: any) => {
                          const dateStr = proposal.created_at ? (() => {
                            try {
                              const d = new Date(proposal.created_at);
                              if (isNaN(d.getTime())) return "--/--/---- às --:--";
                              const day = String(d.getDate()).padStart(2, '0');
                              const month = String(d.getMonth() + 1).padStart(2, '0');
                              const year = d.getFullYear();
                              const hours = String(d.getHours()).padStart(2, '0');
                              const minutes = String(d.getMinutes()).padStart(2, '0');
                              return `${day}/${month}/${year} às ${hours}:${minutes}`;
                            } catch (e) {
                              return "Sem data";
                            }
                          })() : "--/--/---- às --:--";

                          const roleLower = perfil?.role?.toLowerCase() || "";
                          const isCorretor = roleLower === 'corretor';
                          const isEstagiario = roleLower === 'estágio' || roleLower === 'estagio' || perfil?.funcao?.toLowerCase()?.includes('estag');
                          const isSupervisor = roleLower === 'supervisor' || roleLower === 'supervisor/coordenador';
                          const shouldHideDownload = isCorretor || isEstagiario || isSupervisor;

                          return (
                            <div 
                              key={proposal.id} 
                              className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-[#162546]/20 transition-all shadow-xs text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-[150px]">
                                <div className="w-8 h-8 rounded-lg bg-[#162546]/5 border border-[#162546]/15 flex items-center justify-center text-[#162546]">
                                  <History className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Gerada por</span>
                                  <span className="text-[12px] font-extrabold text-slate-700 uppercase leading-none block truncate max-w-[140px]">{formatShortName(proposal.user_nome || proposal.user_email)}</span>
                                </div>
                              </div>

                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Estratégia</span>
                                {proposal.isCalculadora ? (
                                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5 uppercase tracking-tight w-fit">
                                    PERSONALIZADA
                                  </span>
                                ) : proposal.isQuitacao ? (
                                  <span className="text-[11px] font-bold text-[#162546] bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 uppercase tracking-tight w-fit">
                                    Quitação de Contrato
                                  </span>
                                ) : proposal.isNovoFormato ? (
                                  <span className="text-[11px] font-bold text-yellow-600 bg-yellow-50 border border-yellow-100 rounded px-1.5 py-0.5 uppercase tracking-tight w-fit">
                                    Novo Formato
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 uppercase tracking-tight w-fit">
                                    REDUÇÃO DE PARCELA
                                  </span>
                                )}
                              </div>

                              {proposal.isCalculadora && (
                                <>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Valor do Contrato</span>
                                    <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                                      <span className="text-emerald-600 font-bold">{proposal.valor_contrato ? formatCurrency(proposal.valor_contrato) : "--"}</span>
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Duração</span>
                                    <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                                      {proposal.prazo_estrategia ? `${proposal.prazo_estrategia}x` : "--"}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Parcela Média</span>
                                    <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                                      {proposal.parcela_media ? formatCurrency(proposal.parcela_media) : "--"}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Taxa a.m.</span>
                                    <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                                      {proposal.taxa_am !== null && proposal.taxa_am !== undefined ? `${Number(proposal.taxa_am).toFixed(2).replace('.', ',')}%` : "--"}
                                    </span>
                                  </div>
                                </>
                              )}

                              {!proposal.isQuitacao && !proposal.isNovoFormato && !proposal.isCalculadora && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Valor Liberado</span>
                                  <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                                    {proposal.valor_liberado ? (
                                      <span className="text-emerald-600 font-bold">{formatCurrency(proposal.valor_liberado)}</span>
                                    ) : (
                                      <span className="text-slate-400">--</span>
                                    )}
                                  </span>
                                </div>
                              )}

                              {proposal.isNovoFormato && (
                                <>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Valor Antigo</span>
                                    <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                                      {proposal.valor_liberado ? (
                                        <span className="text-slate-500 font-bold">{formatCurrency(proposal.valor_liberado * 0.70)}</span>
                                      ) : (
                                        <span className="text-slate-400">--</span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Valor Atual</span>
                                    <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                                      {proposal.valor_liberado ? (
                                        <span className="text-[#F4C600] font-black">{formatCurrency(proposal.valor_liberado)}</span>
                                      ) : (
                                        <span className="text-slate-400">--</span>
                                      )}
                                    </span>
                                  </div>
                                </>
                              )}

                              {!proposal.isNovoFormato && !proposal.isQuitacao && !proposal.isCalculadora && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                                    PARCELA ANTIGA {"->"} PARCELA NOVA
                                  </span>
                                  <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                                    <span className="text-slate-800">{formatCurrency(proposal.total_parcela_atual || 0)}</span> ➔ <span className="text-emerald-600 font-bold">{formatCurrency(proposal.total_parcela_nova || 0)}</span>
                                  </span>
                                </div>
                              )}

                              {proposal.isQuitacao && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                                    Saldo para Quitação
                                  </span>
                                  <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                                    <span className="text-[#c44a4a] font-bold">
                                      {proposal.saldo_quitacao ? formatCurrency(proposal.saldo_quitacao) : "--"}
                                    </span>
                                  </span>
                                </div>
                              )}

                              {proposal.isQuitacao && (() => {
                                const prazo = parseInt(proposal.prazo_restante) || 96;
                                const pAtual = parseFloat(proposal.parcela_atual) || 0;
                                const pNova = parseFloat(proposal.nova_parcela) || 0;
                                const economiaTotal = Math.max(0, (pAtual - pNova) * prazo);
                                return (
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                                      Economia Total
                                    </span>
                                    <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                                      <span className="text-emerald-600 font-bold">
                                        {formatCurrency(economiaTotal)}
                                      </span>
                                    </span>
                                  </div>
                                );
                              })()}

                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Gerado em</span>
                                <span className="text-[11px] font-bold text-slate-500 leading-none block">{dateStr}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {!shouldHideDownload && (
                                  <Button
                                    type="button"
                                    onClick={() => handleDownloadProposalHistory(proposal)}
                                    className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-md transition-all rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    {proposal.tipo_arquivo || "PDF"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. Histórico de Chamados */}
                  <div className="mt-5 pt-5 border-t border-slate-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-5 bg-rose-500 rounded-full"></div>
                      <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        Histórico de Chamados{" "}
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-rose-500/10 text-rose-600 border-none font-black font-sans uppercase">
                          {clientTicketsHistory.length} {clientTicketsHistory.length === 1 ? 'Chamado' : 'Chamados'}
                        </Badge>
                      </h4>
                    </div>

                    {isLoadingClientTicketsHistory ? (
                      <div className="flex items-center gap-2 justify-center py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                        <span>Buscando histórico de chamados...</span>
                      </div>
                    ) : clientTicketsHistory.length === 0 ? (
                      <div className="p-3.5 text-center text-xs font-semibold text-slate-400 bg-white rounded-xl border border-slate-200/80">
                        Nenhum chamado registrado para este cliente.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {clientTicketsHistory.map((chamado: any) => {
                          const statusLabel = chamado.status_chamados?.nome || chamado.status || "ABERTO";
                          const statusUpper = statusLabel.toUpperCase();

                          return (
                            <div 
                              key={chamado.id} 
                              className="p-3 rounded-xl border border-rose-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs hover:border-rose-200 transition-all text-xs"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/50 flex items-center justify-center font-bold text-[10px] text-rose-500 font-mono">
                                  #{chamado.id}
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Corretor</span>
                                  <span className="text-[12px] font-extrabold text-slate-700 uppercase leading-none block">{formatShortName(chamado.user_nome)}</span>
                                </div>
                              </div>
                              
                              <div className="flex flex-col md:items-end justify-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 md:text-right">Status do Chamado</span>
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase",
                                  statusUpper === "ABERTO" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                  statusUpper === "FECHADO" || statusUpper === "CONCLUÍDO" || statusUpper === "CONCLUIDO" ? "bg-slate-100 text-slate-600 border-slate-200" :
                                  "bg-amber-50 text-amber-700 border-amber-100"
                                )}>
                                  {statusUpper}
                                </span>
                              </div>

                              <div className="flex flex-col md:items-end justify-center">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 md:text-right">Abertura</div>
                                <div className="flex items-center gap-2">
                                  <div className="text-[12px] font-bold text-slate-700">
                                    {(() => {
                                      if (!chamado.created_at) return "--/--/----";
                                      try {
                                        const d = new Date(chamado.created_at);
                                        if (isNaN(d.getTime())) return "--/--/----";
                                        const day = String(d.getDate()).padStart(2, '0');
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const year = d.getFullYear();
                                        return `${day}/${month}/${year}`;
                                      } catch (e) {
                                        return String(chamado.created_at).split('T')[0] || "Sem data";
                                      }
                                    })()}
                                  </div>
                                  <div className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5 uppercase tracking-tight">
                                    {(() => {
                                      if (!chamado.created_at) return "0 dias passados";
                                      try {
                                        const createdDate = new Date(chamado.created_at);
                                        if (isNaN(createdDate.getTime())) return "";
                                        const today = new Date();
                                        const createdDateZero = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
                                        const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                        const diffTime = todayZero.getTime() - createdDateZero.getTime();
                                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                        if (diffDays <= 0) {
                                          return "0 dias passados (Hoje)";
                                        }
                                        return `${diffDays} ${diffDays === 1 ? "dia passado" : "dias passados"}`;
                                      } catch (e) {
                                        return "";
                                      }
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Histórico de Propostas (Propostas Digitadas) */}
                  <div className="mt-5 pt-5 border-t border-slate-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-5 bg-emerald-600 rounded-full"></div>
                      <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        Histórico de Propostas{" "}
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-emerald-600/10 text-emerald-700 border-none font-black font-sans uppercase">
                          {clientTypedProposalsHistory.length} {clientTypedProposalsHistory.length === 1 ? 'Proposta' : 'Propostas'}
                        </Badge>
                      </h4>
                    </div>

                    {isLoadingClientTypedProposalsHistory ? (
                      <div className="flex items-center gap-2 justify-center py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Buscando histórico de propostas digitadas...</span>
                      </div>
                    ) : clientTypedProposalsHistory.length === 0 ? (
                      <div className="p-3.5 text-center text-xs font-semibold text-slate-400 bg-white rounded-xl border border-slate-200/80">
                        Nenhuma proposta digitada encontrada para este cliente.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {clientTypedProposalsHistory.map((prop: any) => {
                          const dateStr = prop.created_at || prop.data_digitacao ? (() => {
                            try {
                              const d = new Date(prop.created_at || prop.data_digitacao);
                              if (isNaN(d.getTime())) return "--/--/----";
                              const day = String(d.getDate()).padStart(2, '0');
                              const month = String(d.getMonth() + 1).padStart(2, '0');
                              const year = d.getFullYear();
                              return `${day}/${month}/${year}`;
                            } catch (e) {
                              return "Sem data";
                            }
                          })() : "--/--/----";

                          const statusLabel = prop.status || "DIGITAÇÃO";
                          const statusUpper = statusLabel.toUpperCase();

                          return (
                            <div 
                              key={prop.id || prop.id_lead} 
                              className="p-3 rounded-xl border border-emerald-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs hover:border-emerald-200 transition-all text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-[130px]">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center font-bold text-[10px] text-emerald-700 font-mono">
                                  #{prop.id_lead || prop.id}
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Corretor</span>
                                  <span className="text-[12px] font-extrabold text-slate-700 uppercase leading-none block truncate max-w-[140px]">
                                    {formatShortName(prop.nome_corretor || prop.corretor || "Não informado")}
                                  </span>
                                  {prop.ade && (
                                    <span className="text-[10px] font-mono font-bold text-slate-500 block mt-0.5">
                                      ADE: {prop.ade}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Banco / Convênio</span>
                                <span className="text-[12px] font-extrabold text-slate-800 leading-none block">
                                  {prop.banco || "-"}{prop.convenio ? ` / ${prop.convenio}` : ""}
                                </span>
                              </div>

                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Operação</span>
                                <span className="text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 uppercase tracking-tight w-fit">
                                  {prop.tipo_operacao || "CONSIGNADO"}
                                </span>
                              </div>

                              <div className="flex flex-col md:items-end justify-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 md:text-right">Status da Proposta</span>
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border",
                                  statusUpper.includes("CANCELAD") ? "bg-rose-50 text-rose-700 border-rose-200" :
                                  statusUpper.includes("PAGO") ? "bg-cyan-50 text-cyan-700 border-cyan-200" :
                                  statusUpper.includes("ANDAMENTO") ? "bg-orange-50 text-orange-700 border-orange-200" :
                                  statusUpper.includes("DIGITA") ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  "bg-slate-100 text-slate-700 border-slate-200"
                                )}>
                                  {statusUpper}
                                </span>
                              </div>

                              <div className="flex flex-col md:items-end justify-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 md:text-right">Valor Operação</span>
                                <span className="text-[12px] font-extrabold text-emerald-600 leading-none block">
                                  {prop.valor_operacao ? formatCurrency(prop.valor_operacao) : (prop.valor_producao ? formatCurrency(prop.valor_producao) : "--")}
                                </span>
                                {prop.prazo && prop.valor_parcela ? (
                                  <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                    {prop.prazo}x de {formatCurrency(prop.valor_parcela)}
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex flex-col md:items-end justify-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 md:text-right">Data Digitação</span>
                                <span className="text-[11px] font-bold text-slate-600 leading-none block">{dateStr}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Histórico Auditável de Mensagens (Ocultado nas etapas personalizadas) */}
                  {!isEtapaPersonalizada && (
                    <div className="pt-3 border-t border-slate-200">
                      <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Histórico de Interações Auditáveis
                      </h4>
                      {isLoadingHistorico ? (
                        <p className="text-xs text-slate-400 py-3 text-center">Carregando histórico...</p>
                      ) : historicoMensagens.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center">Nenhuma interação anterior registrada neste chamado.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {historicoMensagens.map((msg, idx) => (
                            <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-xs">
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                <span className="font-bold text-sky-700">{msg.user_nome} ({msg.user_role || "Colaborador"})</span>
                                <span>{msg.created_at ? format(new Date(msg.created_at), "dd/MM/yyyy HH:mm") : ""}</span>
                              </div>
                              <p className="text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Rodapé da Modal */}
            <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Etapa Atual:</span>
                <span className="inline-flex items-center font-bold text-sky-700 bg-sky-50 border border-sky-200/80 px-2.5 py-1 rounded-md text-xs">
                  {inferKanbanStage(atendimentoModalTicket, parseMetadata(atendimentoModalTicket.descricao))}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold px-4 cursor-pointer"
                onClick={() => setAtendimentoModalTicket(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SUPERVISÃO (Gestores: Supervisor, Operacional, Administrador, Monitoramento) */}
      {supervisaoModalTicket && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAFAFA] rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            {/* Cabeçalho da Modal */}
            <div className="px-4 pb-4 pt-8 bg-[#FFFFFF] border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs mt-0.5 shrink-0">
                  <ShieldAlert className="w-4 h-4 text-slate-950" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                    Supervisão e Gestão de Leads
                  </h2>
                  <p className="text-xs text-slate-600">
                    Controle de titularidade e intervenções
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const t = supervisaoModalTicket
                    setSupervisaoModalTicket(null)
                    setAtendimentoModalTicket(t)
                    setAtendimentoMensagem("")
                    loadHistoricoChamado(t.id)
                  }}
                  className="text-xs h-7 bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100 gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Ir para Atendimento
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                  onClick={() => setSupervisaoModalTicket(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Conteúdo Principal */}
            {(() => {
              const meta = parseMetadata(supervisaoModalTicket.descricao)
              const stage = inferKanbanStage(supervisaoModalTicket, meta)
              const isEtapaAbordagem = true

              return (
                <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs bg-[#FAFAFA] text-slate-800">
                  {/* Resumo do Lead */}
                  {isEtapaAbordagem ? (
                    <div>
                      <span className="text-slate-500 block text-[11px]">Responsável Atual</span>
                      <span className="font-bold text-sky-700 text-[13px] truncate block">
                        {supervisaoModalTicket.user_nome || "Não atribuído"}
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Responsável Atual</span>
                        <span className="font-bold text-sky-700 text-[13px] truncate block">{supervisaoModalTicket.user_nome || "Não atribuído"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Valor da Operação</span>
                        {(() => {
                          const modalOpData = getValorOperacaoDeAbertura(supervisaoModalTicket)
                          return (
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-[13px] block leading-tight">
                                {modalOpData.valor}
                              </span>
                              <span className={cn("text-[9px] uppercase font-black tracking-tight mt-0.5", modalOpData.color)}>
                                {modalOpData.label}
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Etapa Comercial</span>
                        <span className="font-bold text-indigo-700 text-[13px] block">
                          {stage}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bloco 1: Transferência de Responsável (Transbordo) */}
                  <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs space-y-2.5">
                    <h4 className="font-bold text-slate-900 text-[13px] flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-sky-600" />
                      Transferir Lead para outro Colaborador
                    </h4>
                    {isEtapaAbordagem ? (
                      <div>
                        <label className="text-[12px] text-slate-700 font-medium block mb-1">Novo Responsável:</label>
                        <select
                          value={supervisaoNovoResponsavel}
                          onChange={e => setSupervisaoNovoResponsavel(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 text-slate-800 rounded-md focus:ring-1 focus:ring-sky-500"
                        >
                          {activeUsersList.map(u => (
                            <option key={u.id} value={u.id} className="bg-white text-slate-800">
                              {u.nome} ({u.role || u.funcao || "Colaborador"})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[12px] text-slate-700 font-medium block mb-1">Novo Responsável:</label>
                          <select
                            value={supervisaoNovoResponsavel}
                            onChange={e => setSupervisaoNovoResponsavel(e.target.value)}
                            className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 text-slate-800 rounded-md focus:ring-1 focus:ring-sky-500"
                          >
                            {usersList.map(u => (
                              <option key={u.id} value={u.id} className="bg-white text-slate-800">
                                {u.nome} ({u.role || u.funcao || "Colaborador"})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[12px] text-slate-700 font-medium block mb-1">Prioridade na Fila:</label>
                          <select
                            value={supervisaoNovaPrioridade}
                            onChange={e => setSupervisaoNovaPrioridade(e.target.value as any)}
                            className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 text-slate-800 rounded-md focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="NORMAL" className="bg-white text-slate-800">Normal</option>
                            <option value="ALTA" className="bg-white text-slate-800">Alta</option>
                            <option value="URGENTE" className="bg-white text-slate-800">Urgente / Crítica</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[12px] text-slate-700 font-medium block mb-1">Justificativa da Reatribuição (Auditável):</label>
                      <Input
                        type="text"
                        value={supervisaoMotivoTransbordo}
                        onChange={e => setSupervisaoMotivoTransbordo(e.target.value)}
                        placeholder="Ex: SLA de primeiro contato expirado / Readequação de carteira"
                        className="text-xs h-8 bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 focus-visible:ring-sky-500"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleConfirmSupervisaoTransbordo}
                        disabled={isSubmittingSupervisao || supervisaoNovoResponsavel === supervisaoModalTicket.user_id}
                        className="text-xs h-8 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Confirmar Transferência
                      </Button>
                    </div>
                  </div>

                  {/* Bloco 2: Conflito de Titularidade & Duplicidades (Ocultado em EM ABORDAGEM) */}
                  {!isEtapaAbordagem && (
                    <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs space-y-2">
                      <h4 className="font-bold text-slate-900 text-[13px] flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        Conflito de Titularidade e Negociação Simultânea
                      </h4>
                      <p className="text-slate-600 text-[12px]">
                        Evita que dois corretores entrem em contato com o mesmo cliente simultaneamente. A supervisão pode decidir liberar ou bloquear o atendimento.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolverConflito(true)}
                          className="text-xs h-8 text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Liberar Atendimento (Sem Conflito)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolverConflito(false)}
                          className="text-xs h-8 text-rose-700 border-rose-300 bg-rose-50 hover:bg-rose-100 gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Marcar Conflito Ativo
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Bloco 3: Desfecho de Ação Especial (Ocultado em EM ABORDAGEM) */}
                  {!isEtapaAbordagem && (
                    <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200 shadow-xs space-y-2">
                      <h4 className="font-bold text-amber-900 text-[13px] flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        Intervenção de Ação Especial
                      </h4>
                      <p className="text-amber-800 text-[12px] font-medium">
                        {meta.acao_especial_motivo 
                          ? `Motivo: ${meta.acao_especial_motivo}` 
                          : "Ticket alto ou solicitação da equipe comercial para suporte de negociação."}
                      </p>
                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleConcluirAcaoEspecial}
                          className="text-xs h-8 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold gap-1 shadow-xs transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Concluir Intervenção da Supervisão
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Rodapé da Modal */}
            <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Etapa Atual:</span>
                <span className="inline-flex items-center font-bold text-sky-700 bg-sky-50 border border-sky-200/80 px-2.5 py-1 rounded-md text-xs">
                  {inferKanbanStage(supervisaoModalTicket, parseMetadata(supervisaoModalTicket.descricao))}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoricoModalTicket(supervisaoModalTicket)}
                  className="h-7 px-2.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 hover:text-purple-800 border border-purple-200 flex items-center gap-1.5 rounded-md cursor-pointer shadow-2xs transition-colors"
                  title="Histórico do Atendimento"
                >
                  <History className="w-3.5 h-3.5 text-purple-600" />
                  <span>Histórico do Atendimento</span>
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold px-4 cursor-pointer"
                onClick={() => setSupervisaoModalTicket(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SOLICITAR AÇÃO ESPECIAL */}
      {isAcaoEspecialModalOpen && atendimentoModalTicket && (
        <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-amber-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-amber-50/80 border-b border-amber-200/80 border-t-4 border-t-amber-500 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Solicitar Ação Especial
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium truncate max-w-[240px]">
                    {atendimentoModalTicket.cliente_nome || "Cliente sem Nome"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                onClick={() => {
                  setIsAcaoEspecialModalOpen(false)
                  setAcaoEspecialTexto("")
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Destinatário da Ação Especial
                </label>
                <select
                  value={acaoEspecialDestinatario}
                  onChange={e => setAcaoEspecialDestinatario(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                >
                  {destinatariosAcaoEspecial.map(u => (
                    <option key={u.id} value={u.nome}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ação Necessária
                </label>
                <textarea
                  value={acaoEspecialTexto}
                  onChange={e => setAcaoEspecialTexto(e.target.value)}
                  placeholder="Escreva detalhadamente qual ação necessária deve ser realizada..."
                  rows={4}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-normal"
                />
              </div>
            </div>

            {/* Rodapé com Botões Cancelar e Solicitar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAcaoEspecialModalOpen(false)
                  setAcaoEspecialTexto("")
                }}
                disabled={isSubmittingAcaoEspecial}
                className="text-xs h-8 px-4 font-semibold text-slate-600 hover:text-slate-900 border-slate-300 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSolicitarAcaoEspecial}
                disabled={isSubmittingAcaoEspecial || !acaoEspecialTexto.trim()}
                className="text-xs h-8 px-4 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer border border-amber-600/30 gap-1.5"
              >
                {isSubmittingAcaoEspecial ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                Solicitar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AGENDAMENTO RÁPIDO */}
      {agendarModalTicket && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-sky-600" />
                Agendar Retorno com Cliente
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-600"
                onClick={() => setAgendarModalTicket(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Cliente: <strong className="text-slate-900">{agendarModalTicket.cliente_nome}</strong>
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Data:</label>
                  <Input
                    type="date"
                    value={agendamentoData}
                    onChange={e => setAgendamentoData(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Horário:</label>
                  <Input
                    type="time"
                    value={agendamentoHora}
                    onChange={e => setAgendamentoHora(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Observação do Agendamento:</label>
                <Input
                  type="text"
                  value={agendamentoObs}
                  onChange={e => setAgendamentoObs(e.target.value)}
                  placeholder="Ex: Cliente pediu para ligar após o almoço"
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => setAgendarModalTicket(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmAgendamento}
                className="text-xs h-8 bg-sky-600 hover:bg-sky-700 text-white"
              >
                Confirmar Agendamento
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MOVER ETAPA MANUAL */}
      {moverModalTicket && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ArrowRight className="w-4 h-4 text-indigo-600" />
                Mover Etapa Comercial
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-600"
                onClick={() => setMoverModalTicket(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Cliente: <strong className="text-slate-900">{moverModalTicket.cliente_nome}</strong>
              </p>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Selecione a Nova Etapa:</label>
                <select
                  value={novaEtapaSelecionada}
                  onChange={e => setNovaEtapaSelecionada(e.target.value as KanbanStage)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-sky-500 font-medium text-slate-800"
                >
                  {KANBAN_COLUMNS.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} - {c.subtitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">
                  Motivo / Observação da Mudança:
                </label>
                <Input
                  type="text"
                  value={motivoMudancaEtapa}
                  onChange={e => setMotivoMudancaEtapa(e.target.value)}
                  placeholder="Ex: Proposta enviada / Cliente aceitou simulação"
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => setMoverModalTicket(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmMoverEtapa}
                className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Salvar Nova Etapa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DO ATENDIMENTO (LOG DE ETAPAS KANBAN) */}
      {historicoModalTicket && (() => {
        const meta = parseMetadata(historicoModalTicket.descricao)
        const rawLog = Array.isArray(historicoModalTicket.historico_movimentacoes) && historicoModalTicket.historico_movimentacoes.length > 0
          ? historicoModalTicket.historico_movimentacoes
          : (Array.isArray(meta.historico_kanban) ? meta.historico_kanban : [])
        const totalMovimentacoes = rawLog.length
        // Numeração sequencial: 1 para a mais antiga até N para a atual
        // Ordenação exibida: mais recente no topo até a mais antiga lá embaixo
        const log = rawLog
          .map((item, idx) => ({
            ...item,
            numero: idx + 1,
            isAtual: idx === totalMovimentacoes - 1,
            isMaisAntiga: idx === 0
          }))
          .reverse()
        const etapaAtual = inferKanbanStage(historicoModalTicket, meta)
        const isRevealed = Boolean(revealedCpfs[historicoModalTicket.id] || revealedPhones[historicoModalTicket.id])

        // Cores oficiais das etiquetas conforme colunas do Kanban
        const getStageBadgeStyle = (stageName?: string) => {
          const s = (stageName || "").trim().toUpperCase()
          if (s.includes("ABORDAGEM")) {
            return "bg-sky-100 text-sky-950 border border-sky-400 font-bold"
          }
          if (s.includes("RETOMADA")) {
            return "bg-amber-100 text-amber-950 border border-amber-400 font-bold"
          }
          if (s.includes("NEGOCIAÇÃO") || s.includes("NEGOCIACAO")) {
            return "bg-indigo-100 text-indigo-950 border border-indigo-400 font-bold"
          }
          if (s.includes("REATIVAÇÃO") || s.includes("REATIVACAO")) {
            return "bg-purple-100 text-purple-950 border border-purple-400 font-bold"
          }
          if (s.includes("SEM INTERESSE")) {
            return "bg-slate-200 text-slate-900 border border-slate-400 font-bold"
          }
          if (s.includes("FECHADO")) {
            return "bg-emerald-100 text-emerald-950 border border-emerald-400 font-bold"
          }
          if (s.includes("PERDIDO")) {
            return "bg-rose-100 text-rose-950 border border-rose-400 font-bold"
          }
          return "bg-slate-100 text-slate-800 border border-slate-300 font-medium"
        }

        return (
          <div className="fixed inset-0 z-[350] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0">
                    <History className="w-4 h-4 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      Histórico do Atendimento
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Log auditável de movimentações no pipeline
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                  onClick={() => setHistoricoModalTicket(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Informações Resumidas do Lead */}
              <div className="px-4 py-3 bg-purple-50/40 border-b border-purple-100/60 flex items-center justify-between gap-2 text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-900 line-clamp-1">
                    {historicoModalTicket.cliente_nome || "Cliente sem Nome"}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      onClick={() => historicoModalTicket.cliente_cpf && handleCopy(historicoModalTicket.cliente_cpf, "CPF")}
                      className={cn(
                        "text-[11px] font-mono text-slate-500 transition-colors",
                        historicoModalTicket.cliente_cpf && "cursor-pointer hover:text-purple-700"
                      )}
                      title={historicoModalTicket.cliente_cpf ? "Clique para copiar CPF" : undefined}
                    >
                      CPF: {isRevealed ? (historicoModalTicket.cliente_cpf || "---") : maskCpf(historicoModalTicket.cliente_cpf)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleRevealCard(historicoModalTicket.id)}
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer transition-colors"
                      title={isRevealed ? "Ocultar CPF" : "Mostrar números ocultados"}
                      aria-label={isRevealed ? "Ocultar CPF" : "Mostrar números ocultados"}
                    >
                      {isRevealed ? (
                        <EyeOff className="w-3.5 h-3.5 text-slate-500 hover:text-slate-700" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Etapa Atual</span>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] shadow-2xs", getStageBadgeStyle(etapaAtual))}>
                    {etapaAtual}
                  </span>
                </div>
              </div>

              {/* Lista do Log (Timeline) */}
              <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                {log.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-600">Nenhuma troca de etapa registrada</p>
                    <p className="text-[11px]">As movimentações do cartão entre as colunas serão listadas aqui.</p>
                  </div>
                ) : (
                  <div className="relative pl-8 before:content-[''] before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 space-y-3">
                    {log.map((item, idx) => {
                      let dataFormatada = "--/--/---- --:--"
                      try {
                        if (item.data) {
                          dataFormatada = format(new Date(item.data), "dd/MM/yyyy 'às' HH:mm:ss")
                        }
                      } catch {}

                      return (
                        <div key={idx} className="relative bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1.5 shadow-2xs">
                          {/* Marcador numérico na linha do tempo: 1 (mais antiga) até N (atual) */}
                          <div className={cn(
                            "absolute -left-8 top-3 w-6 h-6 rounded-full font-black text-[11px] flex items-center justify-center ring-2 ring-white shadow-xs select-none",
                            item.isAtual 
                              ? "bg-purple-700 text-white ring-purple-100" 
                              : "bg-purple-600 text-white"
                          )}>
                            {item.numero}
                          </div>

                          {/* Cabeçalho do evento */}
                          <div className="flex items-center justify-between text-[11px] gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-purple-900 truncate">
                                {item.autor || "Usuário não informado"}
                              </span>
                              {item.isAtual && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                  Atual
                                </span>
                              )}
                              {item.isMaisAntiga && totalMovimentacoes > 1 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                  1ª Movimentação
                                </span>
                              )}
                            </div>
                            <span className="font-medium text-slate-600 text-[10.5px] shrink-0">
                              {dataFormatada}
                            </span>
                          </div>

                          {/* Transição de Etapa com cores originais das colunas */}
                          <div className="flex items-center gap-1.5 text-xs font-semibold pt-0.5 flex-wrap">
                            <span className={cn("px-2 py-0.5 rounded text-[11px] shadow-2xs", getStageBadgeStyle(item.etapa_anterior))}>
                              {item.etapa_anterior || "Inicial"}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className={cn("px-2 py-0.5 rounded text-[11px] shadow-2xs", getStageBadgeStyle(item.etapa_nova))}>
                              {item.etapa_nova}
                            </span>
                          </div>

                          {/* Motivo (se houver) */}
                          {item.motivo && (
                            <p className="text-[11px] text-slate-600 italic bg-white p-1.5 rounded border border-slate-100 mt-1">
                              "{item.motivo}"
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Rodapé */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">
                  {log.length} {log.length === 1 ? "movimentação registrada" : "movimentações registradas"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7.5 font-bold px-4 cursor-pointer"
                  onClick={() => setHistoricoModalTicket(null)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MODAL 5: REGISTRO RÁPIDO DE LIGAÇÃO */}
      {callFeedbackTicket && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-sky-600" />
                Resultado da Ligação
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-600"
                onClick={() => setCallFeedbackTicket(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Ligando para <strong>{callFeedbackTicket.cliente_nome}</strong> ({callFeedbackTicket.cliente_telefone || "Sem telefone"})
              </p>
              <p className="text-[11px] text-slate-500">
                Selecione o desfecho da tentativa para registrar no histórico auditável do lead:
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegisterCallResult("Atendeu - Conversa em andamento")}
                  className="h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  ✅ Atendeu
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegisterCallResult("Não Atende")}
                  className="h-8 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                >
                  📵 Não Atende
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegisterCallResult("Caixa Postal")}
                  className="h-8 text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
                >
                  📼 Caixa Postal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegisterCallResult("Número Ocupado")}
                  className="h-8 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                >
                  🚫 Ocupado
                </Button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => setCallFeedbackTicket(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Visualizador da Gaveta Selecionada */}
      {selectedDrawer && (
        <Dialog open={!!selectedDrawer} onOpenChange={(open) => !open && setSelectedDrawer(null)}>
          <DialogContent showCloseButton={false} className="w-[95vw] sm:max-w-4xl md:max-w-5xl bg-white border border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <DialogTitle className="sr-only">
              {selectedDrawer === "NAO_EXISTE" ? "Gaveta: Não Existe Whatsapp" : "Gaveta: Whatsapp Divergente"}
            </DialogTitle>

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn("w-1.5 h-6 rounded-full", selectedDrawer === "NAO_EXISTE" ? "bg-rose-500" : "bg-amber-500")} />
                <div>
                  <h2 className="text-[16px] font-black text-slate-900 tracking-tight">
                    {selectedDrawer === "NAO_EXISTE" ? "Não Existe Whatsapp" : "Whatsapp Divergente"}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {currentDrawerTickets.length} {currentDrawerTickets.length === 1 ? "lead registrado" : "leads registrados"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDrawer(null)}
                className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Conteúdo com Tabela idêntica à do Detalhamento por Tabulação */}
            <div className="flex-1 overflow-y-auto">
              {currentDrawerTickets.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-xs font-semibold space-y-1">
                  <p className="font-bold uppercase tracking-wider text-slate-500">Nenhum lead nesta gaveta</p>
                  <p className="text-[11px] text-slate-400">
                    Selecione a opção no modal de detalhes ou arraste um cartão do Kanban para cá.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] font-sans border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10">
                        <th className="px-6 py-3.5 font-black text-[#1C2643] uppercase tracking-widest text-[9.5px] w-48 whitespace-nowrap">CPF</th>
                        <th className="px-6 py-3.5 font-black text-[#1C2643] uppercase tracking-widest text-[9.5px]">NOME</th>
                        <th className="px-6 py-3.5 font-black text-[#1C2643] uppercase tracking-widest text-[9.5px] w-64 whitespace-nowrap">TELEFONES</th>
                        <th className="px-6 py-3.5 font-black text-[#1C2643] uppercase tracking-widest text-[9.5px] w-48 whitespace-nowrap">TABULADO POR</th>
                        <th className="px-6 py-3.5 font-black text-[#1C2643] uppercase tracking-widest text-[9.5px] text-right w-48 whitespace-nowrap">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentDrawerTickets.map((t, idx) => {
                        const cleanCpf = t.cliente_cpf ? t.cliente_cpf.replace(/\D/g, "") : ""
                        const formattedCpf = cleanCpf.length === 11
                          ? `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9, 11)}`
                          : t.cliente_cpf || "-"

                        const meta = parseMetadata(t.descricao)
                        const rawPhones = [
                          t.cliente_telefone,
                          t.cliente_telefone_2,
                          t.cliente_telefone_3,
                          ...(Array.isArray(meta.telefones) ? meta.telefones : [])
                        ]
                        const uniquePhones = Array.from(new Set(
                          rawPhones
                            .filter(p => p && p !== "0" && p !== "NÃO INFORMADO" && p !== "Não informado")
                            .map(p => String(p).trim())
                        ))

                        return (
                          <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                            {/* CPF */}
                            <td className="px-6 py-4 font-mono text-[12px] whitespace-nowrap align-top">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!cleanCpf) return
                                  navigator.clipboard?.writeText(cleanCpf)
                                  toast.success(`CPF copiado: ${formattedCpf}`)
                                }}
                                className="text-slate-700 hover:text-blue-600 transition-colors font-bold cursor-pointer text-left block"
                                title="Clique para copiar CPF"
                              >
                                {formattedCpf}
                              </button>
                            </td>

                            {/* NOME */}
                            <td className="px-6 py-4 text-[12px] align-top">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!t.cliente_nome) return
                                  navigator.clipboard?.writeText(t.cliente_nome.toUpperCase())
                                  toast.success(`Nome copiado: ${t.cliente_nome}`)
                                }}
                                className="text-slate-900 hover:text-blue-600 transition-colors font-bold uppercase text-left cursor-pointer block"
                                title="Clique para copiar Nome"
                              >
                                {t.cliente_nome || "NÃO INFORMADO"}
                              </button>
                            </td>

                            {/* TELEFONES */}
                            <td className="px-6 py-4 align-top whitespace-nowrap">
                              {uniquePhones.length === 0 ? (
                                <span className="text-[11px] text-slate-400 font-bold">-</span>
                              ) : (
                                <div className="flex flex-col gap-1.5">
                                  {uniquePhones.map((phone, pIdx) => {
                                    const cleanTel = phone.replace(/\D/g, "")
                                    const formattedTel = cleanTel.length === 11
                                      ? `(${cleanTel.slice(0, 2)}) ${cleanTel.slice(2, 7)}-${cleanTel.slice(7, 11)}`
                                      : cleanTel.length === 10
                                        ? `(${cleanTel.slice(0, 2)}) ${cleanTel.slice(2, 6)}-${cleanTel.slice(6, 10)}`
                                        : phone

                                    return (
                                      <button
                                        key={pIdx}
                                        type="button"
                                        onClick={() => {
                                          if (!cleanTel) return
                                          navigator.clipboard?.writeText(cleanTel)
                                          toast.success(`Telefone copiado: ${formattedTel}`)
                                        }}
                                        className="text-slate-700 hover:text-blue-600 transition-colors font-semibold text-[11.5px] font-mono cursor-pointer text-left block"
                                        title="Clique para copiar Telefone"
                                      >
                                        {formattedTel}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </td>

                            {/* TABULADO POR */}
                            <td className="px-6 py-4 align-top whitespace-nowrap">
                              <span className="font-semibold text-slate-800 text-[11.5px] block truncate max-w-[180px]">
                                {meta.tabulado_por || t.user_nome || meta.user_nome || meta.operador_nome || (
                                  Array.isArray(meta.historico_kanban) && meta.historico_kanban.length > 0 
                                    ? meta.historico_kanban[meta.historico_kanban.length - 1]?.autor 
                                    : undefined
                                ) || "Não informado"}
                              </span>
                            </td>

                            {/* AÇÕES */}
                            <td className="px-6 py-4 align-top text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedClientCpf(cleanCpf || "")
                                    setIsDrawerLeadModal(true)
                                    setIsClientDetailsModalOpen(true)
                                  }}
                                  className="h-7 text-[11px] font-bold border-slate-200 hover:bg-slate-50 cursor-pointer"
                                >
                                  Ver Lead
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/50 flex justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDrawer(null)}
                className="h-8 text-xs font-bold px-4 cursor-pointer"
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Completo de Detalhes do Cliente (Mesmo formato de ACESSAR CLIENTE) */}
      {selectedClientCpf && (() => {
        const isClientInAnyKanbanStage = Boolean(
          isViewingLeadInAttendance || tickets.some(t => {
            const cleanT = (t.cliente_cpf || "").replace(/\D/g, "")
            const cleanS = selectedClientCpf.replace(/\D/g, "")
            if (!cleanT || cleanT !== cleanS) return false
            const isMeuTicket = (t.user_id && t.user_id === user?.id) || (perfil?.nome && t.responsavel_nome?.trim().toLowerCase() === perfil?.nome?.trim().toLowerCase())
            if (!isMeuTicket) return false
            const meta = parseMetadata(t.descricao)
            const isDrawer = (
              t.status === "NÃO EXISTE WHATSAPP" ||
              t.status === "NAO_EXISTE_WHATSAPP" ||
              t.status === "WHATSAPP DIVERGENTE" ||
              Boolean(meta.tabulacao_whatsapp)
            )
            return !isDrawer
          })
        )

        return (
          <>
            <ClientDetailsModal
              isOpen={isClientDetailsModalOpen}
              cpf={selectedClientCpf}
              onClose={() => {
                setIsClientDetailsModalOpen(false)
                setIsKanbanSearchModal(false)
                setIsDrawerLeadModal(false)
                setSelectedClientCpf("")
                setIsViewingLeadInAttendance(false)
                setLeadModalAttendanceContext(null)
                fetchChamados(true)
              }}
              title={isDrawerLeadModal ? "Informações sobre o Lead" : (isKanbanSearchModal ? "EM ABORDAGEM" : "Informações sobre o Lead")}
              isEmAbordagem={isKanbanSearchModal || isDrawerLeadModal}
              onSelectTabulacao={isClientInAnyKanbanStage ? undefined : handleTabulacaoFromModal}
              showTabulacoes={!isClientInAnyKanbanStage}
              hidePhoneSelectionBanner={isClientInAnyKanbanStage}
              showPipelineActionButtons={isClientInAnyKanbanStage}
              hideAbrirChamado={Boolean(leadModalAttendanceContext?.hasChamado)}
              hideDigitarProposta={Boolean(leadModalAttendanceContext?.hasProposta)}
              onTelefonesSelecionadosChange={(cpf, selected) => {
                const cleanCpf = cpf.replace(/\D/g, "")
                setTickets(prev => prev.map(t => {
                  const tCpf = (t.cliente_cpf || "").replace(/\D/g, "")
                  if (tCpf === cleanCpf || (cleanCpf.length === 11 && tCpf.padStart(11, '0') === cleanCpf)) {
                    return {
                      ...t,
                      telefones_selecionados: selected
                    }
                  }
                  return t
                }))
              }}
            />
          </>
        )
      })()}

      {/* Modal de Notificação: Lead Já em Atendimento / Fechado / Perdido */}
      {leadEmAtendimentoInfo && (() => {
        const isMeuAtendimento = Boolean(leadEmAtendimentoInfo.isMeuAtendimento)
        const isFechado = leadEmAtendimentoInfo.etapa === "FECHADO"
        const isPerdido = leadEmAtendimentoInfo.etapa === "PERDIDO"

        const modalTitle = isMeuAtendimento
          ? "Você Já Está Atendendo Este Lead"
          : isFechado 
            ? "Lead com Atendimento Fechado" 
            : isPerdido 
              ? "Lead Perdido" 
              : "Lead Já em Atendimento"

        const modalSubtitle = isMeuAtendimento
          ? ""
          : isFechado
            ? "Cliente com negociação concluída"
            : isPerdido
              ? "Cliente finalizado como perdido"
              : "Cliente com cartão ativo no pipeline"

        const alertMessage = isMeuAtendimento
          ? `Você já possui este lead ativo no seu pipeline na etapa "${leadEmAtendimentoInfo.etapa}".`
          : isFechado
            ? "Este lead foi finalizado como negócio fechado pelo operador informado acima."
            : isPerdido
              ? "Este lead foi classificado como perdido pelo operador informado acima."
              : "Este lead já se encontra no funil de atendimento sob os cuidados do operador informado acima."

        return (
          <Dialog open={!!leadEmAtendimentoInfo} onOpenChange={(open) => !open && setLeadEmAtendimentoInfo(null)}>
            <DialogContent showCloseButton={false} className="w-[95vw] sm:max-w-md bg-white border border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col">
              <DialogTitle className="sr-only">{modalTitle}</DialogTitle>
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0",
                    isMeuAtendimento && "bg-amber-500/15 border-amber-300 text-amber-700",
                    !isMeuAtendimento && isFechado && "bg-emerald-50 border-emerald-200/80 text-emerald-600",
                    !isMeuAtendimento && isPerdido && "bg-rose-50 border-rose-200/80 text-rose-600",
                    !isMeuAtendimento && !isFechado && !isPerdido && "bg-amber-50 border-amber-200/80 text-amber-600"
                  )}>
                    {isMeuAtendimento ? (
                      <Zap className="w-4 h-4 text-amber-600 fill-amber-600" />
                    ) : isFechado ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isPerdido ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                      {modalTitle}
                    </h3>
                    {modalSubtitle ? (
                      <p className="text-[11px] text-slate-500 font-medium">
                        {modalSubtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLeadEmAtendimentoInfo(null)}
                  className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Conteúdo Informativo */}
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 space-y-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cliente</span>
                    <p 
                      onClick={() => handleCopy(leadEmAtendimentoInfo.cliente_nome || "", "Nome do cliente")}
                      className="text-sm font-bold text-slate-900 uppercase cursor-pointer hover:text-indigo-600 transition-colors"
                      title="Clique para copiar o nome"
                    >
                      {leadEmAtendimentoInfo.cliente_nome || "Cliente sem Nome"}
                    </p>
                    <p 
                      onClick={() => handleCopy(leadEmAtendimentoInfo.cliente_cpf, "CPF")}
                      className="text-xs font-mono text-slate-600 font-semibold mt-0.5 cursor-pointer hover:text-indigo-600 transition-colors"
                      title="Clique para copiar o CPF"
                    >
                      CPF: {leadEmAtendimentoInfo.cliente_cpf.length === 11 
                        ? `${leadEmAtendimentoInfo.cliente_cpf.slice(0, 3)}.${leadEmAtendimentoInfo.cliente_cpf.slice(3, 6)}.${leadEmAtendimentoInfo.cliente_cpf.slice(6, 9)}-${leadEmAtendimentoInfo.cliente_cpf.slice(9, 11)}`
                        : leadEmAtendimentoInfo.cliente_cpf}
                    </p>
                    {(() => {
                      const allModalPhones = Array.from(new Set([
                        ...(leadEmAtendimentoInfo.telefones || []),
                        leadEmAtendimentoInfo.cliente_telefone
                      ].filter(Boolean) as string[]))

                      const selected = (leadEmAtendimentoInfo.telefones_selecionados && leadEmAtendimentoInfo.telefones_selecionados.length > 0)
                        ? leadEmAtendimentoInfo.telefones_selecionados
                        : []

                      // Somente os telefones selecionados devem ser mostrados. Se não for selecionado, não mostra.
                      if (selected.length === 0) {
                        return null
                      }

                      const filtered = allModalPhones.filter(phone => {
                        const cleanPhone = phone.replace(/\D/g, "")
                        return selected.some(sp => {
                          const cleanSp = sp.replace(/\D/g, "")
                          return cleanSp === cleanPhone || (cleanPhone.length >= 8 && cleanSp.slice(-8) === cleanPhone.slice(-8))
                        })
                      })
                      const modalPhones = filtered.length > 0 ? filtered : selected

                      if (modalPhones.length === 0) return null

                      return (
                        <div className="mt-1.5 flex flex-col gap-1">
                          {modalPhones.map((tel, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs font-mono text-slate-600 font-semibold">
                              <span className="text-[10px] text-slate-400 font-semibold select-none">
                                {modalPhones.length > 1 ? `Tel ${idx + 1}:` : "Tel:"}
                              </span>
                              <span
                                onClick={() => handleCopy(tel, "Telefone")}
                                className="cursor-pointer hover:text-indigo-600 transition-colors"
                                title="Clique para copiar o telefone"
                              >
                                {formatPhone(tel)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/60">
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Etapa Atual</span>
                      <div className={cn(
                        "mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold",
                        isFechado && "bg-emerald-50 border-emerald-200/80 text-emerald-700",
                        isPerdido && "bg-rose-50 border-rose-200/80 text-rose-700",
                        !isFechado && !isPerdido && "bg-blue-50 border-blue-200/80 text-blue-700"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isFechado && "bg-emerald-600",
                          isPerdido && "bg-rose-600",
                          !isFechado && !isPerdido && "bg-blue-600"
                        )} />
                        {leadEmAtendimentoInfo.etapa}
                      </div>
                    </div>

                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Responsável</span>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{leadEmAtendimentoInfo.operador_nome || "Não atribuído"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-3 rounded-xl flex items-start gap-2.5 text-xs border",
                  isMeuAtendimento && "bg-amber-500/10 border-amber-400 text-amber-950 font-medium",
                  !isMeuAtendimento && isFechado && "bg-emerald-50/70 border-emerald-200/70 text-emerald-900",
                  !isMeuAtendimento && isPerdido && "bg-rose-50/70 border-rose-200/70 text-rose-900",
                  !isMeuAtendimento && !isFechado && !isPerdido && "bg-amber-50 border-amber-200/80 text-amber-900"
                )}>
                  {isMeuAtendimento ? (
                    <Zap className="w-4 h-4 text-amber-600 fill-amber-600 shrink-0 mt-0.5" />
                  ) : isFechado ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : isPerdido ? (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <p className="leading-relaxed">
                    {alertMessage}
                  </p>
                </div>
              </div>

              {/* Rodapé com Ações */}
              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
                {isMeuAtendimento ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const cleanCpf = leadEmAtendimentoInfo.cliente_cpf.replace(/\D/g, "")
                      const myTicket = tickets.find(t => {
                        const cleanT = (t.cliente_cpf || "").replace(/\D/g, "")
                        return cleanT === cleanCpf
                      })
                      setLeadEmAtendimentoInfo(null)
                      if (myTicket) {
                        setAtendimentoModalTicket(myTicket)
                        setAtendimentoMensagem("")
                        setHistoricoMensagens([])
                      } else {
                        setSelectedClientCpf(leadEmAtendimentoInfo.cliente_cpf)
                        setIsViewingLeadInAttendance(true)
                        setIsClientDetailsModalOpen(true)
                      }
                    }}
                    className="h-8 text-xs font-bold px-4 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    Abrir Meu Cartão
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      const cpf = leadEmAtendimentoInfo.cliente_cpf
                      setLeadEmAtendimentoInfo(null)
                      setSelectedClientCpf(cpf)
                      setIsViewingLeadInAttendance(true)
                      setIsClientDetailsModalOpen(true)
                    }}
                    className="h-8 text-xs font-bold px-4 bg-[#171717] hover:bg-[#171717]/90 text-white cursor-pointer"
                  >
                    Informações sobre o Lead
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLeadEmAtendimentoInfo(null)}
                  className="h-8 text-xs font-bold px-4 cursor-pointer"
                >
                  Fechar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}
