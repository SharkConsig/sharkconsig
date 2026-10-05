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
  Trash2
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { ClientDetailsModal, type LeadContactInfo } from "@/components/clients/client-details-modal"

// Definição das 7 Etapas Oficiais do Kanban Comercial
export type KanbanStage = 
  | "EM ABORDAGEM"
  | "EM RETOMADA"
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
  descriptionOperador: string
  descriptionGestor: string
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: "EM ABORDAGEM",
    title: "EM ABORDAGEM",
    subtitle: "Entrada e Primeiro Contato",
    code: "A0",
    color: "sky",
    headerBg: "bg-sky-200 border-sky-400 text-sky-950",
    borderTop: "border-t-sky-600",
    badgeClass: "bg-sky-100 text-sky-900 border-sky-400",
    descriptionOperador: "Realizar o primeiro contato (A0) o mais rápido possível.",
    descriptionGestor: "Velocidade de distribuição e tempo de reação da equipe."
  },
  {
    id: "EM RETOMADA",
    title: "EM RETOMADA",
    subtitle: "Réguas de Contato",
    code: "RT1 - RT6",
    color: "amber",
    headerBg: "bg-amber-200 border-amber-400 text-amber-950",
    borderTop: "border-t-amber-500",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-400",
    descriptionOperador: "Executar tentativas planejadas (RT1 a RT6) para quem não respondeu.",
    descriptionGestor: "Disciplina de execução e cumprimento da sequência planejada."
  },
  {
    id: "EM NEGOCIAÇÃO",
    title: "EM NEGOCIAÇÃO",
    subtitle: "Foco em Fechamento",
    code: "NEG",
    color: "indigo",
    headerBg: "bg-indigo-200 border-indigo-400 text-indigo-950",
    borderTop: "border-t-indigo-600",
    badgeClass: "bg-indigo-100 text-indigo-900 border-indigo-400",
    descriptionOperador: "Trabalhar propostas ativas, simulações, dúvidas e documentos.",
    descriptionGestor: "Pipeline quente, volume potencial e apoio em negócios complexos."
  },
  {
    id: "EM REATIVAÇÃO",
    title: "EM REATIVAÇÃO",
    subtitle: "Atenção ao Cliente Esfriado",
    code: "RE1 - RE3",
    color: "purple",
    headerBg: "bg-purple-200 border-purple-400 text-purple-950",
    borderTop: "border-t-purple-600",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-400",
    descriptionOperador: "Clientes há 48h úteis sem resposta: resgate imediato da oportunidade.",
    descriptionGestor: "Monitoramento de gargalos e oportunidades quentes em risco de perda."
  },
  {
    id: "SEM INTERESSE",
    title: "SEM INTERESSE",
    subtitle: "Nutrição e Longo Prazo",
    code: "DDD / SI",
    color: "slate",
    headerBg: "bg-slate-200 border-slate-400 text-slate-900",
    borderTop: "border-t-slate-600",
    badgeClass: "bg-slate-300 text-slate-900 border-slate-400",
    descriptionOperador: "Registrar motivo da recusa e programar abordagem futura permitida.",
    descriptionGestor: "Preservação da base para futuro retrabalho no momento certo."
  },
  {
    id: "FECHADO",
    title: "FECHADO",
    subtitle: "Venda Concluída",
    code: "GOL",
    color: "emerald",
    headerBg: "bg-emerald-200 border-emerald-400 text-emerald-950",
    borderTop: "border-t-emerald-600",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-400",
    descriptionOperador: "Documentação anexada e proposta digitada no sistema.",
    descriptionGestor: "Resultado final e faturamento consolidado vs metas da equipe."
  },
  {
    id: "PERDIDO",
    title: "PERDIDO",
    subtitle: "Finalização por Inviabilidade",
    code: "FIM",
    color: "rose",
    headerBg: "bg-rose-200 border-rose-400 text-rose-950",
    borderTop: "border-t-rose-600",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-400",
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
  convenio?: string
  selected_operation_type?: string
  enviado_para_corretor?: boolean
  corretor_id?: string
  corretor_nome?: string
  estagiario_id?: string
  estagiario_nome?: string
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
  margem?: number
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
}

interface UserSummary {
  id: string
  nome: string
  funcao?: string
  role?: string
  equipe?: string
  avatar_url?: string
  status?: string
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

// Mapeia o chamado para a etapa do Kanban
function inferKanbanStage(ticket: TicketItem, meta: TicketMetadata): KanbanStage {
  if (meta.kanban_stage) {
    return meta.kanban_stage
  }
  const s = (ticket.status || "").toUpperCase()
  if (s === "FECHADO" || s.includes("PROPOSTA CADASTRADA")) return "FECHADO"
  if (s.includes("NÃO APROVADO") || s.includes("CANCELADO") || s.includes("NÃO É O CLIENTE") || s.includes("IMPOSSIBILITADO")) return "PERDIDO"
  if (s.includes("SEM INTERESSE")) return "SEM INTERESSE"
  if (s.includes("AÇÃO SUPERVISOR") || s.includes("SUPORTE") || s.includes("REATIVA")) return "EM REATIVAÇÃO"
  if (s.includes("PROPOSTA") || s.includes("NEGOCIA") || s.includes("APROVAD") || s.includes("PENDENTE DOCUMENTAÇÃO") || s.includes("AGUARDANDO OPERACIONAL")) return "EM NEGOCIAÇÃO"
  if (s.includes("RETOMADA") || s.includes("SEM INTERAÇÃO") || s.includes("REENVIO") || s.includes("FUTURO")) return "EM RETOMADA"
  return "EM ABORDAGEM"
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

export default function KanbanPage() {
  const { user, perfil, isAdmin } = useAuth()

  // Determinar se o usuário atual é gestor ou operador de execução
  const userRole = (perfil?.role || "").trim()
  const isGestor = Boolean(
    isAdmin || 
    userRole === "Administrador" || 
    userRole === "Supervisor" || 
    userRole === "Operacional" || 
    userRole === "Monitoramento" ||
    userRole === "Desenvolvedor"
  )

  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [usersList, setUsersList] = useState<UserSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Busca de Cliente (Acessar Clientes - CPF ou Telefone)
  const router = useRouter()
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [isSearchingClient, setIsSearchingClient] = useState(false)
  const [clientSearchError, setClientSearchError] = useState<string | null>(null)
  const [isClientDetailsModalOpen, setIsClientDetailsModalOpen] = useState(false)
  const [selectedClientCpf, setSelectedClientCpf] = useState<string>("")
  const [isViewingLeadInAttendance, setIsViewingLeadInAttendance] = useState(false)

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

      // 1. Buscar primeiramente nos cards já carregados em memória no Kanban (inclui todos os telefones de cada lead)
      const ticketMatch = tickets.find(t => {
        const cleanTicketCpf = (t.cliente_cpf || "").replace(/\D/g, "")
        if (digits && cleanTicketCpf === digits) return true
        const allPhones = [
          t.cliente_telefone,
          t.cliente_telefone_2,
          t.cliente_telefone_3,
          ...(t.telefones || [])
        ].map(p => (p || "").replace(/\D/g, "")).filter(Boolean)
        return allPhones.some(p => {
          if (p === digits) return true
          if (digits.length >= 8 && (p.endsWith(digits) || digits.endsWith(p) || p.slice(-8) === last8)) return true
          return false
        })
      })

      if (ticketMatch?.cliente_cpf) {
        foundCpf = ticketMatch.cliente_cpf
      }

      // 2. Se foram digitados exatamente 11 dígitos que correspondem a um CPF válido, verifica na tabela de clientes
      if (!foundCpf && digits.length === 11 && isValidCPF(digits)) {
        const { data: directClient } = await supabase
          .from("clientes")
          .select("cpf")
          .eq("cpf", digits)
          .maybeSingle()

        if (directClient?.cpf) {
          foundCpf = directClient.cpf
        }
      }

      // 3. Se não encontrou ou a busca foi por número de telefone (>= 8 dígitos), busca em clientes por telefone
      if (!foundCpf && digits.length >= 8) {
        const { data: cByTel } = await supabase
          .from("clientes")
          .select("cpf")
          .or(`telefone_1.ilike.%${last8}%,telefone_2.ilike.%${last8}%,telefone_3.ilike.%${last8}%`)
          .limit(1)

        if (cByTel && cByTel.length > 0 && cByTel[0]?.cpf) {
          foundCpf = cByTel[0].cpf
        }
      }

      // 4. Busca por telefone ou CPF em kanban_fichas no Supabase (incluindo metadados de telefones múltiplos)
      if (!foundCpf) {
        const { data: fByTel } = await supabase
          .from("kanban_fichas")
          .select("cliente_cpf, cliente_telefone, metadata")
          .or(`cliente_telefone.ilike.%${last8}%,cliente_cpf.ilike.%${digits}%`)
          .not("cliente_cpf", "is", null)
          .limit(5)

        if (fByTel && fByTel.length > 0 && fByTel[0]?.cliente_cpf) {
          foundCpf = fByTel[0].cliente_cpf
        }

        // Se não achou na coluna direta, busca dentro do array metadata.telefones
        if (!foundCpf && digits.length >= 8) {
          const { data: fByMeta } = await supabase
            .from("kanban_fichas")
            .select("cliente_cpf, metadata")
            .or(`metadata.cs.{"telefones":["${digits}"]},metadata.cs.{"telefones":["${last9}"]}`)
            .not("cliente_cpf", "is", null)
            .limit(1)

          if (fByMeta && fByMeta.length > 0 && fByMeta[0]?.cliente_cpf) {
            foundCpf = fByMeta[0].cliente_cpf
          }
        }
      }

      // 5. Busca por telefone ou CPF em chamados
      if (!foundCpf) {
        const { data: chByTel } = await supabase
          .from("chamados")
          .select("cliente_cpf")
          .or(`cliente_telefone.ilike.%${last8}%,cliente_telefone_2.ilike.%${last8}%,cliente_telefone_3.ilike.%${last8}%,cliente_cpf.ilike.%${digits}%`)
          .not("cliente_cpf", "is", null)
          .limit(1)

        if (chByTel && chByTel.length > 0 && chByTel[0]?.cliente_cpf) {
          foundCpf = chByTel[0].cliente_cpf
        }
      }

      // 6. Se digitou 11 dígitos e é estritamente um CPF VÁLIDO (não um número de telefone celular com DDD),
      // repassa o CPF para o ClientDetailsModal (que busca de forma completa em todos os 17 convênios suportados)
      if (!foundCpf && digits.length === 11 && isValidCPF(digits)) {
        foundCpf = digits
      }

      if (!foundCpf) {
        toast.error("Nenhum cliente localizado para o telefone ou CPF informado.")
        setClientSearchError("Cliente não localizado.")
        return
      }

      const cleanCpf = foundCpf.replace(/\D/g, "")

      // Verificar se o lead já está no pipeline (em alguma das colunas do Kanban e não em gavetas)
      const { data: existingInPipeline } = await supabase
        .from("kanban_fichas")
        .select("cliente_nome, cliente_cpf, cliente_telefone, etapa, operador_nome, motivo_perda, metadata")
        .eq("cliente_cpf", cleanCpf)
        .maybeSingle()

      let pipelineLead: { 
        cliente_nome: string
        cliente_cpf: string
        cliente_telefone?: string
        telefones?: string[]
        etapa: string
        operador_nome: string 
      } | null = null

      if (existingInPipeline) {
        const meta = (existingInPipeline.metadata && typeof existingInPipeline.metadata === "object") ? existingInPipeline.metadata : {}
        const isDrawer = (existingInPipeline.etapa === "PERDIDO" || !existingInPipeline.etapa) && (
          Boolean(meta.tabulacao_whatsapp) || 
          existingInPipeline.motivo_perda === "Não Existe Whatsapp" || 
          existingInPipeline.motivo_perda === "Whatsapp Divergente"
        )
        if (!isDrawer) {
          const rawPhones = [
            existingInPipeline.cliente_telefone,
            meta.cliente_telefone,
            meta.cliente_telefone_2,
            meta.cliente_telefone_3,
            ...(Array.isArray(meta.telefones) ? meta.telefones.map((t: any) => typeof t === "string" ? t : t?.numero) : [])
          ].filter(Boolean) as string[]

          pipelineLead = {
            cliente_nome: existingInPipeline.cliente_nome || "Cliente sem Nome",
            cliente_cpf: cleanCpf,
            cliente_telefone: existingInPipeline.cliente_telefone || "",
            telefones: Array.from(new Set(rawPhones.map(p => p.trim()).filter(Boolean))),
            telefones_selecionados: Array.isArray(meta.telefones_selecionados) ? meta.telefones_selecionados : undefined,
            etapa: existingInPipeline.etapa || "EM ABORDAGEM",
            operador_nome: existingInPipeline.operador_nome || "Corretor"
          }
        }
      }

      if (!pipelineLead) {
        const localTicket = tickets.find(t => {
          const tCpf = (t.cliente_cpf || "").replace(/\D/g, "")
          if (tCpf !== cleanCpf) return false
          const tMeta = parseMetadata(t.descricao)
          const inDrawer = (
            t.status === "NÃO EXISTE WHATSAPP" ||
            t.status === "NAO_EXISTE_WHATSAPP" ||
            t.status === "WHATSAPP DIVERGENTE" ||
            Boolean(tMeta.tabulacao_whatsapp)
          )
          return !inDrawer
        })
        if (localTicket) {
          const rawPhones = [
            localTicket.cliente_telefone,
            localTicket.cliente_telefone_2,
            localTicket.cliente_telefone_3,
            ...(localTicket.telefones || [])
          ].filter(Boolean) as string[]

          const tMeta = parseMetadata(localTicket.descricao)
          pipelineLead = {
            cliente_nome: localTicket.cliente_nome || "Cliente sem Nome",
            cliente_cpf: cleanCpf,
            cliente_telefone: localTicket.cliente_telefone || "",
            telefones: Array.from(new Set(rawPhones.map(p => p.trim()).filter(Boolean))),
            telefones_selecionados: localTicket.telefones_selecionados || (Array.isArray(tMeta.telefones_selecionados) ? tMeta.telefones_selecionados : undefined),
            etapa: localTicket.status || "EM ABORDAGEM",
            operador_nome: localTicket.corretor_nome || localTicket.user_nome || "Corretor"
          }
        }
      }

      // Complementar telefones se estiver vazio ou buscar de chamados
      if (pipelineLead) {
        const localT = tickets.find(t => (t.cliente_cpf || "").replace(/\D/g, "") === cleanCpf)
        if (localT) {
          const morePhones = [
            localT.cliente_telefone, 
            localT.cliente_telefone_2, 
            localT.cliente_telefone_3,
            ...(localT.telefones || [])
          ].filter(Boolean) as string[]
          pipelineLead.telefones = Array.from(new Set([...(pipelineLead.telefones || []), ...morePhones]))
          if (!pipelineLead.telefones_selecionados && localT.telefones_selecionados) {
            pipelineLead.telefones_selecionados = localT.telefones_selecionados
          }
        }
        if (!pipelineLead.telefones || pipelineLead.telefones.length === 0) {
          const { data: ch } = await supabase
            .from("chamados")
            .select("cliente_telefone, cliente_telefone_2, cliente_telefone_3")
            .eq("cliente_cpf", cleanCpf)
            .limit(1)
          if (ch && ch[0]) {
            const list = [ch[0].cliente_telefone, ch[0].cliente_telefone_2, ch[0].cliente_telefone_3].filter(Boolean) as string[]
            pipelineLead.telefones = Array.from(new Set(list))
            pipelineLead.cliente_telefone = list[0] || ""
          }
        }
      }

      // Se já estiver em atendimento no pipeline (e não nas gavetas), abre o modal notificando
      if (pipelineLead) {
        setLeadEmAtendimentoInfo(pipelineLead)
        setClientSearchQuery("")
        return
      }

      // Abre o modal completo de detalhes do cliente sem criar cartão no Kanban
      setSelectedClientCpf(foundCpf)
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
  } | null>(null)

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

  // Sincronizar opção selecionada a partir da observação da ficha
  useEffect(() => {
    if (!atendimentoModalTicket) {
      setOpcaoSelecionada("")
      return
    }
    const cleanObs = (atendimentoModalTicket.descricao || "")
      .replace(/<!-- TICKET_METADATA: ([\s\S]*?) -->/g, "")
      .trim()
    if (cleanObs === "Sem interação") {
      setOpcaoSelecionada("Sem interação")
    } else if (cleanObs === "Sem interesse") {
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
        { name: "inss_clientes", label: "INSS" }
      ]

      for (const t of tables) {
        try {
          const { data } = await supabase.from(t.name).select("id").or(`cpf.eq.${padded},cpf.eq.${digits}`).limit(1)
          if (data && data.length > 0 && isMounted) {
            setResolvedConvenio(t.label)
            if (atendimentoModalTicket.source_table === "kanban_fichas") {
              const currentMeta = parseMetadata(atendimentoModalTicket.descricao)
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
              status: u.status ? String(u.status).trim().toUpperCase() : "ATIVO"
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
    if (!silent) setIsLoading(true)
    setIsRefreshing(true)
    try {
      let query = supabase
        .from("kanban_fichas")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1000)

      // Regras de visibilidade conforme o papel
      if (!isGestor && user) {
        if (userRole === "Estágio" || userRole === "Estagio") {
          query = query.or(`operador_id.eq.${user.id},operador_nome.ilike.%${perfil?.nome || user.email}%`)
        } else if (userRole === "Corretor") {
          // Corretor vê seus chamados e pode ver estagiários vinculados
          try {
            const res = await fetch("/api/usuarios")
            if (res.ok) {
              const all = await res.json()
              const myEstagiarios = all
                .filter((u: { padrinho_id: string }) => u.padrinho_id === user.id)
                .map((u: { id: string }) => u.id)
              query = query.or(`operador_id.in.(${[user.id, ...myEstagiarios].join(",")}),operador_nome.ilike.%${perfil?.nome || user.email}%`)
            } else {
              query = query.or(`operador_id.eq.${user.id},operador_nome.ilike.%${perfil?.nome || user.email}%`)
            }
          } catch {
            query = query.or(`operador_id.eq.${user.id},operador_nome.ilike.%${perfil?.nome || user.email}%`)
          }
        }
      }

      const { data, error } = await query
      if (error) {
        console.error("Erro ao consultar kanban_fichas:", error)
        setTickets([])
        return
      }

      // Normalizar registros vindos da tabela kanban_fichas para o formato TicketItem
      const formatted: TicketItem[] = (data || []).map((f: any) => {
        const meta: TicketMetadata = (f.metadata && typeof f.metadata === "object") ? f.metadata : {}
        const isDrawer = (f.etapa === "PERDIDO" || !f.etapa) && (
          Boolean(meta.tabulacao_whatsapp) || 
          f.motivo_perda === "Não Existe Whatsapp" || 
          f.motivo_perda === "Whatsapp Divergente"
        )
        const drawerStatus = (meta.tabulacao_whatsapp === "WHATSAPP_DIVERGENTE" || f.motivo_perda === "Whatsapp Divergente")
          ? "WHATSAPP DIVERGENTE"
          : "NÃO EXISTE WHATSAPP"

        meta.kanban_stage = isDrawer ? drawerStatus : (f.etapa || meta.kanban_stage || "EM ABORDAGEM")
        meta.proxima_acao = meta.proxima_acao || "Iniciar primeiro contato comercial"
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

        return {
          id: String(f.id),
          status: isDrawer ? drawerStatus : (f.etapa || "EM ABORDAGEM"),
          origem: "KANBAN",
          cliente_nome: f.cliente_nome || "Cliente sem Nome",
          cliente_cpf: f.cliente_cpf || "",
          cliente_telefone: uniquePhones[0] || f.cliente_telefone || "",
          cliente_telefone_2: uniquePhones[1] || f.cliente_telefone_2 || undefined,
          cliente_telefone_3: uniquePhones[2] || f.cliente_telefone_3 || undefined,
          telefones: uniquePhones,
          telefones_selecionados: Array.isArray(meta.telefones_selecionados) 
            ? meta.telefones_selecionados 
            : (Array.isArray(f.telefones_selecionados) ? f.telefones_selecionados : undefined),
          margem: f.margem_disponivel ? Number(f.margem_disponivel) : undefined,
          valor_operacao: f.valor_solicitado ? Number(f.valor_solicitado) : undefined,
          convenio: f.convenio || meta.convenio || undefined,
          equipe: f.equipe || undefined,
          descricao: stringifyWithMetadata(f.observacoes || "", meta),
          user_id: f.operador_id || meta.user_id || "",
          user_nome: f.operador_nome || meta.user_nome || undefined,
          user_avatar: meta.user_avatar || undefined,
          created_at: f.created_at || new Date().toISOString(),
          updated_at: f.updated_at || new Date().toISOString(),
          source_table: "kanban_fichas"
        }
      })

      setTickets(formatted)
    } catch (err) {
      console.error("Erro ao carregar fichas para o Kanban:", err)
      toast.error("Não foi possível carregar as fichas do Kanban.")
      setTickets([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [isGestor, user, userRole])

  useEffect(() => {
    fetchChamados()
  }, [fetchChamados])

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
        (Boolean(meta.tabulacao_whatsapp) && t.status !== "EM ABORDAGEM")
      ) {
        return false
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
      "EM NEGOCIAÇÃO": [],
      "EM REATIVAÇÃO": [],
      "SEM INTERESSE": [],
      "FECHADO": [],
      "PERDIDO": []
    }

    filteredTickets.forEach(t => {
      const meta = parseMetadata(t.descricao)
      const stage = inferKanbanStage(t, meta)
      if (map[stage]) {
        map[stage].push(t)
      } else {
        map["EM ABORDAGEM"].push(t)
      }
    })

    return map
  }, [filteredTickets])

  // Totais Gerais para o Dashboard superior
  const metrics = useMemo(() => {
    let totalValor = 0
    let totalAtrasados = 0
    let totalAcaoEspecial = 0
    let totalConflitos = 0
    let totalFechados = groupedColumns["FECHADO"].length

    filteredTickets.forEach(t => {
      const meta = parseMetadata(t.descricao)
      const val = Number(t.valor_operacao || t.margem || 0)
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
    const meta = parseMetadata(ticket.descricao)
    setAgendarModalTicket(ticket)
    setAgendamentoData(meta.agendamento_data ? meta.agendamento_data.split("T")[0] : format(new Date(), "yyyy-MM-dd"))
    setAgendamentoHora("14:30")
    setAgendamentoObs(meta.agendamento_obs || "")
  }

  const handleConfirmAgendamento = async () => {
    if (!agendarModalTicket || !user) return
    try {
      const meta = parseMetadata(agendarModalTicket.descricao)
      const dataHoraIso = `${agendamentoData}T${agendamentoHora}:00`
      const dataFormatada = `${format(new Date(`${agendamentoData}T${agendamentoHora}:00`), "dd/MM 'às' HH:mm")}`

      const updatedMeta: TicketMetadata = {
        ...meta,
        proxima_acao: `[Agendado] Retornar contato com cliente`,
        vencimento_acao: dataHoraIso,
        agendamento_data: dataHoraIso,
        agendamento_obs: agendamentoObs,
        alerta_atrasado: false
      }

      const newDesc = stringifyWithMetadata(agendarModalTicket.descricao, updatedMeta)
      const { error } = await supabase
        .from("chamados")
        .update({ 
          descricao: newDesc,
          updated_at: new Date().toISOString()
        })
        .eq("id", agendarModalTicket.id)

      if (error) throw error

      await supabase.from("mensagens_chamado").insert({
        chamado_id: parseInt(agendarModalTicket.id, 10),
        user_id: user.id,
        user_nome: perfil?.nome || "Colaborador",
        user_role: perfil?.role || "Corretor",
        user_avatar: perfil?.avatar_url || null,
        content: `📅 Retorno agendado para ${dataFormatada}. Observação: ${agendamentoObs || "Sem observações adicionais."}`,
        action: "retorno_agendado"
      })

      toast.success(`Retorno agendado para ${dataFormatada}!`)
      setAgendarModalTicket(null)
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao agendar retorno:", err)
      toast.error("Não foi possível salvar o agendamento.")
    }
  }

  // Ação Rápida: Mover de Etapa
  const handleOpenMoverEtapa = (ticket: TicketItem, etapaDestino?: KanbanStage) => {
    const meta = parseMetadata(ticket.descricao)
    const current = inferKanbanStage(ticket, meta)
    setMoverModalTicket(ticket)
    setNovaEtapaSelecionada(etapaDestino || current)
    setMotivoMudancaEtapa("")
  }

  const handleConfirmMoverEtapa = async () => {
    if (!moverModalTicket || !user) return
    try {
      const meta = parseMetadata(moverModalTicket.descricao)
      const etapaAtual = inferKanbanStage(moverModalTicket, meta)

      if (novaEtapaSelecionada === etapaAtual) {
        toast.info("O chamado já se encontra nesta etapa.")
        setMoverModalTicket(null)
        return
      }

      // Próxima ação padrão da nova etapa (sem siglas)
      let proximaAcaoPadrao = ""
      if (novaEtapaSelecionada === "EM ABORDAGEM") proximaAcaoPadrao = "Realizar Primeiro Contato Imediato"
      else if (novaEtapaSelecionada === "EM RETOMADA") proximaAcaoPadrao = "Enviar Régua de Retomada 1"
      else if (novaEtapaSelecionada === "EM NEGOCIAÇÃO") proximaAcaoPadrao = "Enviar simulação e recolher documentos"
      else if (novaEtapaSelecionada === "EM REATIVAÇÃO") proximaAcaoPadrao = "Resgatar oportunidade esfriada"
      else if (novaEtapaSelecionada === "SEM INTERESSE") proximaAcaoPadrao = "Cadência de Longo Prazo / Nutrição"
      else if (novaEtapaSelecionada === "FECHADO") proximaAcaoPadrao = "Proposta Digitada e Formalizada"
      else if (novaEtapaSelecionada === "PERDIDO") proximaAcaoPadrao = "Atendimento Encerrado"

      const historicoAtual = meta.historico_kanban || []
      const updatedMeta: TicketMetadata = {
        ...meta,
        kanban_stage: novaEtapaSelecionada,
        proxima_acao: proximaAcaoPadrao,
        vencimento_acao: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        alerta_atrasado: false,
        historico_kanban: [
          ...historicoAtual,
          {
            data: new Date().toISOString(),
            etapa_anterior: etapaAtual,
            etapa_nova: novaEtapaSelecionada,
            autor: perfil?.nome || "Usuário",
            motivo: motivoMudancaEtapa || undefined
          }
        ]
      }

      const newDesc = stringifyWithMetadata(moverModalTicket.descricao, updatedMeta)
      
      if (moverModalTicket.source_table === "kanban_fichas") {
        const { error } = await supabase
          .from("kanban_fichas")
          .update({
            etapa: novaEtapaSelecionada,
            metadata: updatedMeta,
            updated_at: new Date().toISOString()
          })
          .eq("id", moverModalTicket.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("chamados")
          .update({
            descricao: newDesc,
            updated_at: new Date().toISOString()
          })
          .eq("id", moverModalTicket.id)

        if (error) throw error

        await supabase.from("mensagens_chamado").insert({
          chamado_id: parseInt(moverModalTicket.id, 10),
          user_id: user.id,
          user_nome: perfil?.nome || "Colaborador",
          user_role: perfil?.role || "Corretor",
          user_avatar: perfil?.avatar_url || null,
          content: `➡️ Etapa alterada no Kanban: [${etapaAtual}] ➔ [${novaEtapaSelecionada}]. ${motivoMudancaEtapa ? `Motivo: ${motivoMudancaEtapa}` : ""}`,
          action: "etapa_kanban_change"
        })
      }

      toast.success(`Ficha movida para "${novaEtapaSelecionada}"!`)
      setMoverModalTicket(null)
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao mover etapa:", err)
      toast.error("Erro ao mover a ficha de etapa.")
    }
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

  // Enviar anotação na Modal de Atendimento
  const handleSaveAtendimentoInteracao = async (acaoTipo = "registro_contato") => {
    if (!atendimentoModalTicket || !user || !atendimentoMensagem.trim()) {
      toast.warning("Digite uma mensagem ou observação do contato.")
      return
    }
    setIsSubmittingAtendimento(true)
    try {
      await supabase.from("mensagens_chamado").insert({
        chamado_id: parseInt(atendimentoModalTicket.id, 10),
        user_id: user.id,
        user_nome: perfil?.nome || "Colaborador",
        user_role: perfil?.role || "Corretor",
        user_avatar: perfil?.avatar_url || null,
        content: atendimentoMensagem.trim(),
        action: acaoTipo
      })

      // Atualizar também na tabela kanban_fichas na coluna observacoes
      if (atendimentoModalTicket.source_table === "kanban_fichas" || atendimentoModalTicket.id) {
        await supabase
          .from("kanban_fichas")
          .update({
            observacoes: atendimentoMensagem.trim(),
            updated_at: new Date().toISOString()
          })
          .eq("id", atendimentoModalTicket.id)

        const currentMeta = parseMetadata(atendimentoModalTicket.descricao)
        atendimentoModalTicket.descricao = stringifyWithMetadata(atendimentoMensagem.trim(), currentMeta)
      }

      toast.success("Registro salvo no histórico do chamado!")
      setAtendimentoMensagem("")
      loadHistoricoChamado(atendimentoModalTicket.id)
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao salvar interação:", err)
      toast.error("Erro ao salvar mensagem.")
    } finally {
      setIsSubmittingAtendimento(false)
    }
  }

  // Alternar opções rápidas (Sem interação / Sem interesse) com gravação direta em kanban_fichas
  const handleToggleOpcaoAtendimento = async (opcao: "Sem interação" | "Sem interesse") => {
    if (!atendimentoModalTicket) return
    const novaOpcao = opcaoSelecionada === opcao ? "" : opcao
    setOpcaoSelecionada(novaOpcao)
    setIsSavingOpcao(true)

    try {
      // 1. Grava na tabela kanban_fichas na coluna observacoes
      const { error } = await supabase
        .from("kanban_fichas")
        .update({
          observacoes: novaOpcao,
          updated_at: new Date().toISOString()
        })
        .eq("id", atendimentoModalTicket.id)

      if (error) {
        console.error("Erro ao atualizar kanban_fichas:", error)
        toast.error("Erro ao registrar escolha em kanban_fichas.")
        return
      }

      // 2. Atualizar em memória
      const currentMeta = parseMetadata(atendimentoModalTicket.descricao)
      atendimentoModalTicket.descricao = stringifyWithMetadata(novaOpcao, currentMeta)

      // 3. Registrar no histórico se opção marcada
      if (novaOpcao) {
        await supabase.from("mensagens_chamado").insert({
          chamado_id: parseInt(atendimentoModalTicket.id, 10),
          user_id: user?.id,
          user_nome: perfil?.nome || "Colaborador",
          user_role: perfil?.role || "Corretor",
          user_avatar: perfil?.avatar_url || null,
          content: `📌 Registrado: ${novaOpcao}`,
          action: "registro_opcao"
        })
        loadHistoricoChamado(atendimentoModalTicket.id)
        toast.success(`"${novaOpcao}" registrado em kanban_fichas!`)
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

  // Ação para abrir o modal 'Informações do Lead' ao clicar em 'INICIAR ABORDAGEM'
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

      const meta = parseMetadata(supervisaoModalTicket.descricao)
      const updatedMeta: TicketMetadata = {
        ...meta,
        prioridade: supervisaoNovaPrioridade,
        conflito_titularidade: false
      }
      const newDesc = stringifyWithMetadata(supervisaoModalTicket.descricao, updatedMeta)

      const { error } = await supabase
        .from("chamados")
        .update({
          user_id: supervisaoNovoResponsavel,
          user_nome: targetName,
          descricao: newDesc,
          updated_at: new Date().toISOString()
        })
        .eq("id", supervisaoModalTicket.id)

      if (error) throw error

      await supabase.from("mensagens_chamado").insert({
        chamado_id: parseInt(supervisaoModalTicket.id, 10),
        user_id: user.id,
        user_nome: perfil?.nome || "Supervisor",
        user_role: perfil?.role || "Supervisor",
        user_avatar: perfil?.avatar_url || null,
        content: `🔄 TRANSBORDO DE LEAD: Reatribuído para ${targetName} pela Supervisão. Motivo: ${supervisaoMotivoTransbordo || "Redistribuição estratégica de carteira"}.`,
        action: "transbordo_supervisao"
      })

      toast.success(`Lead reatribuído com sucesso para ${targetName}!`)
      setSupervisaoModalTicket(null)
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao salvar supervisão:", err)
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
      await supabase
        .from("chamados")
        .update({ descricao: newDesc, updated_at: new Date().toISOString() })
        .eq("id", supervisaoModalTicket.id)

      await supabase.from("mensagens_chamado").insert({
        chamado_id: parseInt(supervisaoModalTicket.id, 10),
        user_id: user.id,
        user_nome: perfil?.nome || "Supervisor",
        user_role: perfil?.role || "Supervisor",
        user_avatar: perfil?.avatar_url || null,
        content: liberar 
          ? `🛡️ Conflito de titularidade auditado e LIBERADO pela supervisão.` 
          : `🛡️ Conflito de titularidade mantido como BLOQUEADO para concorrência de atendimento.`,
        action: "conflito_titularidade_decisao"
      })

      toast.success(liberar ? "Conflito liberado!" : "Conflito mantido!")
      setSupervisaoModalTicket(null)
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao resolver conflito:", err)
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
      await supabase
        .from("chamados")
        .update({ descricao: newDesc, updated_at: new Date().toISOString() })
        .eq("id", supervisaoModalTicket.id)

      await supabase.from("mensagens_chamado").insert({
        chamado_id: parseInt(supervisaoModalTicket.id, 10),
        user_id: user.id,
        user_nome: perfil?.nome || "Supervisor",
        user_role: perfil?.role || "Supervisor",
        user_avatar: perfil?.avatar_url || null,
        content: `✅ Ação Especial analisada e concluída pela Supervisão. Oportunidade liberada para avanço comercial.`,
        action: "acao_especial_concluida"
      })

      toast.success("Ação Especial concluída!")
      setSupervisaoModalTicket(null)
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao concluir ação especial:", err)
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
      const newDesc = stringifyWithMetadata(ticket.descricao, updatedMeta)

      if (ticket.source_table === "kanban_fichas") {
        await supabase.from("kanban_fichas").update({
          etapa: "PERDIDO",
          motivo_perda: label,
          operador_nome: perfil?.nome || ticket.user_nome || "Corretor",
          metadata: updatedMeta,
          updated_at: new Date().toISOString()
        }).eq("id", ticket.id)
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
        await supabase.from("kanban_fichas").update({
          etapa: "EM ABORDAGEM",
          motivo_perda: null,
          metadata: meta,
          updated_at: new Date().toISOString()
        }).eq("id", ticket.id)
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

      // 1. Caso 'CLIENTE CHAMADO': fechar o modal e criar/mover ficha para 'EM ABORDAGEM'
      if (tabulacao === "CLIENTE CHAMADO") {
        setIsClientDetailsModalOpen(false)
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
            origem: "KANBAN",
            data_chamado: new Date().toISOString().split("T")[0]
          }).then(() => {})
        } catch {}

        const { data: existing } = await supabase
          .from("kanban_fichas")
          .select("id, metadata, etapa")
          .eq("cliente_cpf", cleanCpf)
          .maybeSingle()

        if (existing) {
          const updatedMeta = {
            ...(existing.metadata || {}),
            kanban_stage: "EM ABORDAGEM",
            proxima_acao: "Realizar Primeiro Contato Imediato",
            telefones: clientInfo.telefones,
            telefones_selecionados: clientInfo.telefones_selecionados || (existing.metadata as any)?.telefones_selecionados || [],
            convenio: clientInfo.convenio || (existing.metadata as any)?.convenio
          }
          delete (updatedMeta as any).tabulacao_whatsapp

          const { error: updateErr } = await supabase
            .from("kanban_fichas")
            .update({
              etapa: "EM ABORDAGEM",
              motivo_perda: null,
              metadata: updatedMeta,
              operador_id: validOperadorId,
              operador_nome: perfil?.nome || "Corretor",
              convenio: clientInfo.convenio || existing.convenio,
              updated_at: new Date().toISOString()
            })
            .eq("id", existing.id)

          if (updateErr) {
            console.error("Erro ao atualizar kanban_fichas:", updateErr)
            toast.error("Erro ao atualizar cartão no Kanban.")
            return
          }
        } else {
          const meta: TicketMetadata = {
            kanban_stage: "EM ABORDAGEM",
            proxima_acao: "Realizar Primeiro Contato Imediato",
            vencimento_acao: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            prioridade: "NORMAL",
            user_id: user?.id,
            user_nome: perfil?.nome || "Corretor",
            telefones: clientInfo.telefones,
            telefones_selecionados: clientInfo.telefones_selecionados || [],
            convenio: clientInfo.convenio
          }
          delete (meta as any).tabulacao_whatsapp

          const { error: insertErr } = await supabase.from("kanban_fichas").insert({
            cliente_nome: clientInfo.nome || "Cliente sem Nome",
            cliente_cpf: cleanCpf,
            cliente_telefone: (clientInfo.telefones_selecionados && clientInfo.telefones_selecionados[0]) || clientInfo.telefones[0] || "",
            operador_id: validOperadorId,
            operador_nome: perfil?.nome || "Corretor",
            etapa: "EM ABORDAGEM",
            motivo_perda: null,
            metadata: meta,
            convenio: clientInfo.convenio || undefined,
            observacoes: "Atendimento iniciado via modal (CLIENTE CHAMADO)"
          })

          if (insertErr) {
            console.error("Erro ao inserir em kanban_fichas:", insertErr)
            toast.error("Erro ao registrar cartão no Kanban.")
            return
          }
        }

        // Se houver algum registro em chamados com essa tabulação de gaveta, limpar também
        try {
          const { data: chamadosList } = await supabase
            .from("chamados")
            .select("id, descricao")
            .eq("cliente_cpf", cleanCpf)
          if (chamadosList && chamadosList.length > 0) {
            for (const ch of chamadosList) {
              const chMeta = parseMetadata(ch.descricao)
              if (chMeta.tabulacao_whatsapp) {
                delete chMeta.tabulacao_whatsapp
                chMeta.kanban_stage = "EM ABORDAGEM"
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

        toast.success(`Cartão de atendimento criado em "EM ABORDAGEM"!`)
        await fetchChamados(true)
        return
      }

      // 2. Caso 'NÃO EXISTE WHATSAPP' ou 'WHATSAPP DIVERGENTE': fechar modal e registrar na tabela 'kanban_fichas'
      setIsClientDetailsModalOpen(false)
      setSelectedClientCpf("")

      const drawerType = tabulacao === "NÃO EXISTE WHATSAPP" ? "NAO_EXISTE_WHATSAPP" : "WHATSAPP_DIVERGENTE"
      const drawerLabel = tabulacao === "NÃO EXISTE WHATSAPP" ? "Não Existe Whatsapp" : "Whatsapp Divergente"

      const { data: existing } = await supabase
        .from("kanban_fichas")
        .select("id, metadata")
        .eq("cliente_cpf", cleanCpf)
        .maybeSingle()

      if (existing) {
        const updatedMeta = {
          ...(existing.metadata || {}),
          tabulacao_whatsapp: drawerType,
          telefones: clientInfo.telefones,
          telefones_selecionados: clientInfo.telefones_selecionados || (existing.metadata as any)?.telefones_selecionados || [],
          tabulado_por: perfil?.nome || user?.email || "Corretor",
          user_id: validOperadorId || user?.id,
          user_nome: perfil?.nome || "Corretor"
        }
        const { error: updateErr } = await supabase
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
          telefones_selecionados: clientInfo.telefones_selecionados || [],
          tabulado_por: perfil?.nome || user?.email || "Corretor",
          user_id: user?.id,
          user_nome: perfil?.nome || "Corretor"
        }
        const { error: insertErr } = await supabase.from("kanban_fichas").insert({
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

  return (
    <div className="flex flex-col h-screen min-h-screen bg-[#FDFDFD]">
      <Header hideQuickLinks>
        <div className="relative w-full max-w-[510px] sm:max-w-[630px] md:max-w-[720px]">
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
      </Header>
      
      <main className="flex-1 p-4 lg:p-6 space-y-3.5 overflow-hidden flex flex-col bg-[#FDFDFD]">
        {/* Linha Superior: Métricas Rápidas (Esquerda) e Gavetas de Triagem (Direita) */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
          {/* Métricas Rápidas alinhadas à esquerda */}
          <div className="flex flex-wrap items-center gap-6 pl-1">
            {/* Total de Clientes */}
            <div className="text-left select-none">
              <p className="text-base font-bold text-slate-800 tracking-tight">
                Total de Clientes: <span className="text-slate-900 font-extrabold">{metrics.totalLeads}</span>
              </p>
              <p className="text-xs text-slate-400 font-medium">
                {metrics.totalLeads} {metrics.totalLeads === 1 ? "lead em atendimento" : "leads em atendimento"}
              </p>
            </div>

            {/* Pipeline */}
            <div className="text-left select-none">
              <p className="text-base font-bold text-slate-800 tracking-tight">
                Pipeline: <span className="text-slate-900 font-extrabold">{metrics.totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Valores em atendimento
              </p>
            </div>
          </div>

          {/* Gavetas de Triagem WhatsApp */}
          <div className="flex flex-wrap items-center gap-3">
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
                "bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-3.5 py-2 shadow-xs hover:shadow-sm transition-all flex items-center gap-3 cursor-pointer group select-none",
                dragOverDrawer === "NAO_EXISTE" && "ring-2 ring-rose-500 bg-rose-50/50 border-rose-300"
              )}
              title="Gaveta: Não Existe Whatsapp (Clique para abrir ou arraste leads para cá)"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600 shrink-0">
                <PhoneOff className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 tracking-tight group-hover:text-slate-900">
                  Não Existe Whatsapp
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {naoExisteWhatsappTickets.length} {naoExisteWhatsappTickets.length === 1 ? "lead arquivado" : "leads arquivados"}
                </p>
              </div>
              <span className="ml-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
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
                "bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-3.5 py-2 shadow-xs hover:shadow-sm transition-all flex items-center gap-3 cursor-pointer group select-none",
                dragOverDrawer === "DIVERGENTE" && "ring-2 ring-amber-500 bg-amber-50/50 border-amber-300"
              )}
              title="Gaveta: Whatsapp Divergente (Clique para abrir ou arraste leads para cá)"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                <MessageSquareOff className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 tracking-tight group-hover:text-slate-900">
                  Whatsapp Divergente
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {whatsappDivergenteTickets.length} {whatsappDivergenteTickets.length === 1 ? "lead arquivado" : "leads arquivados"}
                </p>
              </div>
              <span className="ml-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {whatsappDivergenteTickets.length}
              </span>
            </div>
          </div>
        </div>

        {/* Card Principal do Kanban (Filtros e 7 Colunas) */}
        <Card className="card-shadow bg-white border border-slate-200 rounded-2xl overflow-hidden flex-1 max-h-[95%] flex flex-col min-h-0">
          <CardContent className="p-3 sm:p-5 flex-1 flex flex-col overflow-hidden min-h-0 space-y-4">
            {/* Barra de Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100 shadow-xs shrink-0">
              {/* Busca por Nome, CPF ou Telefone */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar por Nome, CPF ou Telefone..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs h-9 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filtro por Responsável (Gestores) com campo de busca e ordenação A-Z de ativos */}
              {isGestor && (
                <div ref={responsavelDropdownRef} className="relative">
                  <div
                    onClick={() => {
                      setIsResponsavelDropdownOpen(prev => !prev)
                    }}
                    className={cn(
                      "w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md flex items-center justify-between font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors shadow-2xs select-none",
                      isResponsavelDropdownOpen && "ring-1 ring-sky-500 border-sky-400"
                    )}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {selectedResponsavel === "ALL" ? (
                        <>
                          <span className="text-slate-400">👥</span>
                          <span className="truncate">Todos os Responsáveis</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sky-600 font-bold">👤</span>
                          <span className="font-semibold text-slate-900 truncate">
                            {selectedUserObj ? selectedUserObj.nome : "Responsável selecionado"}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {selectedResponsavel !== "ALL" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedResponsavel("ALL")
                          }}
                          title="Limpar filtro de responsável"
                          className="p-0.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200/60"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isResponsavelDropdownOpen && "rotate-180")} />
                    </div>
                  </div>

                  {isResponsavelDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100">
                      {/* Campo de Busca de Responsável */}
                      <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            autoFocus
                            type="text"
                            placeholder="Buscar responsável..."
                            value={responsavelSearchQuery}
                            onChange={e => setResponsavelSearchQuery(e.target.value)}
                            className="pl-8 pr-7 h-8 text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-sky-500"
                          />
                          {responsavelSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setResponsavelSearchQuery("")}
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lista de Opções (Ativos em ordem A-Z) */}
                      <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50">
                        {/* Opção Todos os Responsáveis */}
                        {!responsavelSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedResponsavel("ALL")
                              setIsResponsavelDropdownOpen(false)
                              setResponsavelSearchQuery("")
                            }}
                            className={cn(
                              "w-full text-left px-2.5 py-2 rounded flex items-center justify-between hover:bg-slate-100 transition-colors",
                              selectedResponsavel === "ALL" ? "bg-sky-50 text-sky-800 font-bold" : "text-slate-700"
                            )}
                          >
                            <span className="flex items-center gap-1.5">
                              <span>👥</span>
                              <span>Todos os Responsáveis</span>
                            </span>
                            {selectedResponsavel === "ALL" && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                          </button>
                        )}

                        {filteredResponsaveis.length === 0 ? (
                          <div className="py-4 text-center text-slate-400 text-xs">
                            Nenhum responsável encontrado.
                          </div>
                        ) : (
                          filteredResponsaveis.map(u => {
                            const isSelected = selectedResponsavel === u.id
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setSelectedResponsavel(u.id)
                                  setIsResponsavelDropdownOpen(false)
                                  setResponsavelSearchQuery("")
                                }}
                                className={cn(
                                  "w-full text-left px-2.5 py-2 rounded flex items-center justify-between hover:bg-slate-100 transition-colors",
                                  isSelected ? "bg-sky-50 text-sky-800 font-bold" : "text-slate-700"
                                )}
                              >
                                <div className="truncate pr-2">
                                  <span className="block truncate font-medium text-slate-800">{u.nome}</span>
                                  <span className="block text-[10px] text-slate-400 font-normal">
                                    {u.role || u.funcao || "Colaborador"}
                                  </span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Filtro por Alertas */}
              <div>
                <select
                  value={selectedAlertFilter}
                  onChange={e => setSelectedAlertFilter(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300 font-medium text-slate-700"
                >
                  <option value="ALL">🎯 Todos os Alertas / Status</option>
                  <option value="ATRASADO">🔴 Somente Atrasados</option>
                  <option value="ACAO_ESPECIAL">🟡 Somente Ação Especial</option>
                  <option value="CONFLITO">🔵 Somente Conflito de Titularidade</option>
                </select>
              </div>
            </div>

            {/* Quadro das 7 Colunas do Kanban */}
            <div className="flex-1 overflow-x-auto pb-2 min-h-0">
              <div className="flex items-start gap-4 min-w-[1850px] h-full">
                {KANBAN_COLUMNS.map(col => {
                  const colTickets = groupedColumns[col.id] || []
                  const totalColValor = colTickets.reduce((acc, t) => acc + Number(t.valor_operacao || t.margem || 0), 0)

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
                          handleOpenMoverEtapa(ticketToMove, col.id)
                        }
                        setDraggedTicket(null)
                      }}
                      className={cn(
                        "flex-1 min-w-[250px] max-w-[270px] bg-[#28365E] border border-white/10 rounded-xl flex flex-col max-h-[calc(100vh-340px)] shadow-xs transition-colors",
                        dragOverColumnId === col.id && "ring-2 ring-indigo-500 bg-[#324475]"
                      )}
                    >
                  {/* Cabeçalho da Coluna */}
                  <div className={cn("p-3.5 border-b rounded-t-xl border-t-4 shadow-xs", col.borderTop, col.headerBg)}>
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="font-extrabold text-xs text-slate-950 tracking-tight flex items-center gap-1.5">
                        {col.title}
                      </h2>
                    </div>

                    <p className="text-[11px] text-slate-700 font-medium line-clamp-1 mb-2">
                      {col.subtitle}
                    </p>

                    {/* Totais Acumulados para Gestão e Operação */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/10 text-[11px]">
                      <span className="font-semibold text-slate-800">
                        {colTickets.length} {colTickets.length === 1 ? "lead" : "leads"}
                      </span>
                      <span className="font-extrabold text-slate-950">
                        {totalColValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Cartões (Scroll Vertical) */}
                  <div className="p-2 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar bg-[#28365E] rounded-b-xl">
                    {colTickets.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-300 font-semibold">
                        Nenhum lead nesta etapa
                      </div>
                    ) : (
                      colTickets.map(ticket => {
                        const meta = parseMetadata(ticket.descricao)
                        const valorTotal = Number(ticket.valor_operacao || ticket.margem || 0)
                        const isCardRevealed = Boolean(revealedCpfs[ticket.id] || revealedPhones[ticket.id])
                        const isCpfRevealed = isCardRevealed
                        const isPhoneRevealed = isCardRevealed

                        // Identificar se há alerta de alto valor (> 20k ou > 50k)
                        const isAltoValor = valorTotal >= 20000

                        // Próxima Ação e Vencimento (sem siglas como [A0], [RT1], etc.)
                        const rawProximaAcao = meta.proxima_acao || (
                          col.id === "EM ABORDAGEM" ? "Realizar Primeiro Contato Imediato" :
                          col.id === "EM RETOMADA" ? "Enviar Régua de Retomada 1 via WhatsApp" :
                          col.id === "EM NEGOCIAÇÃO" ? "Enviar simulação ajustada e esclarecer dúvidas" :
                          col.id === "EM REATIVAÇÃO" ? "Resgatar contato esfriado após 48h úteis" :
                          col.id === "SEM INTERESSE" ? "Programar cadência longa / nutrição" :
                          col.id === "FECHADO" ? "Proposta Digitada no Sistema" :
                          "Finalização registrada por inviabilidade"
                        )
                        const proximaAcaoTexto = rawProximaAcao.replace(/^\[[^\]]+\]\s*/, "")

                        const vencimentoLabel = meta.vencimento_acao 
                          ? format(new Date(meta.vencimento_acao), "dd/MM 'às' HH:mm")
                          : "Hoje às 14:30"

                        return (
                          <div
                            key={ticket.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", ticket.id)
                              e.dataTransfer.effectAllowed = "move"
                              setDraggedTicket(ticket)
                            }}
                            onDragEnd={() => {
                              setDraggedTicket(null)
                              setDragOverColumnId(null)
                            }}
                            onClick={() => handleCardClick(ticket)}
                            className={cn(
                              "bg-white rounded-lg border border-slate-200 p-3 shadow-xs hover:shadow-xl hover:shadow-slate-900/15 hover:scale-[1.025] hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 ease-out transform cursor-grab active:cursor-grabbing space-y-2.5 relative group hover:z-10",
                              draggedTicket?.id === ticket.id && "opacity-40 scale-95 border-dashed border-indigo-400"
                            )}
                          >
                            {/* 1. Cabeçalho Visual: Tags de Alerta e Cronômetro/Prazo */}
                            <div className="flex items-start justify-between gap-1.5 text-[10px]">
                              <div className="flex flex-wrap gap-1">
                                {meta.alerta_atrasado && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                                    🔴 ATRASADO
                                  </span>
                                )}
                                {(meta.acao_especial || isAltoValor) && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    🟡 AÇÃO ESPECIAL
                                  </span>
                                )}
                                {meta.conflito_titularidade && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                    🔵 EM NEGOCIAÇÃO COM OUTRO
                                  </span>
                                )}
                              </div>

                              {/* Cronômetro / Tempo na Etapa */}
                              <span className="text-slate-400 font-medium whitespace-nowrap flex items-center gap-1 text-[10px]">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {ticket.updated_at 
                                  ? formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: false, locale: ptBR })
                                  : "recente"}
                              </span>
                            </div>

                            {/* 2. Dados Principais do Cliente */}
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight line-clamp-1 group-hover:text-sky-600 transition-colors">
                                  {ticket.cliente_nome || "Nome não informado"}
                                </h3>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleRevealCard(ticket.id)
                                  }}
                                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer shrink-0 transition-colors"
                                  title={isCardRevealed ? "Ocultar dados" : "Revelar dados"}
                                >
                                  {isCardRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                <span>CPF:</span>
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

                                const meta = parseMetadata(ticket.descricao)
                                const selected = (ticket.telefones_selecionados && ticket.telefones_selecionados.length > 0)
                                  ? ticket.telefones_selecionados
                                  : (Array.isArray(meta.telefones_selecionados) && meta.telefones_selecionados.length > 0)
                                    ? meta.telefones_selecionados
                                    : []

                                // Somente os telefones selecionados devem ser mostrados. Se não for selecionado, não mostra.
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
                                  <div className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                                    {cardPhones.map((phone, pIdx) => (
                                      <div key={pIdx} className="flex items-center gap-1">
                                        <span className="text-[10px] text-slate-400 font-semibold">
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
                            </div>

                            {/* 3. Informações Comerciais e de Titularidade */}
                            <div className="bg-slate-50/90 rounded-md p-2 border border-slate-100 text-[11px] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Valor Operação:</span>
                                <span className="font-bold text-slate-900">
                                  {valorTotal > 0 
                                    ? valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) 
                                    : "Sob Consulta"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Tipo:</span>
                                <span className="font-medium text-slate-700 truncate max-w-[120px]">
                                  {meta.selected_operation_type || ticket.convenio || "Consignado"}
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
                            </div>

                            {/* 4. Bloco da Próxima Ação */}
                            <div className="bg-amber-100/90 border border-amber-300 rounded-md p-2 text-[11px] space-y-0.5 shadow-2xs">
                              <div className="font-extrabold text-amber-950 flex items-center gap-1">
                                <span>📌 PRÓXIMA AÇÃO:</span>
                              </div>
                              <p className="text-amber-900 font-semibold line-clamp-2">
                                {proximaAcaoTexto}
                              </p>
                              <div className="text-[10px] text-amber-800 flex items-center gap-1 pt-0.5 font-semibold">
                                <Clock className="w-3 h-3 text-amber-700" />
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
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
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
                        <span className="font-bold text-emerald-600">
                          {Number(atendimentoModalTicket.valor_operacao || atendimentoModalTicket.margem || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
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

                  {/* Opções com Caixas Seletoras e Botão INICIAR ABORDAGEM */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-2 pb-4">
                    <div className="flex items-center gap-5">
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

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none hover:text-slate-900 transition-colors">
                        <input
                          type="checkbox"
                          checked={opcaoSelecionada === "Sem interesse"}
                          onChange={() => handleToggleOpcaoAtendimento("Sem interesse")}
                          disabled={isSavingOpcao}
                          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                        />
                        <span>Sem interesse</span>
                      </label>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleIniciarAbordagem}
                      className="text-xs h-7.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs px-3 rounded-lg cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      INICIAR ABORDAGEM
                    </Button>
                  </div>

                  {/* Campo para Registrar Interação */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Registrar Resultado do Contato / Observação:
                    </label>
                    <textarea
                      value={atendimentoMensagem}
                      onChange={e => setAtendimentoMensagem(e.target.value)}
                      placeholder="Descreva o andamento da conversa com o cliente, objeções ou próximos passos..."
                      rows={3}
                      className="w-full text-xs p-3 bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                    />
                    <div className="flex items-center justify-end pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveAtendimentoInteracao("atendimento_registro")}
                        disabled={isSubmittingAtendimento || !atendimentoMensagem.trim()}
                        className="text-xs h-8 bg-sky-600 hover:bg-sky-500 text-white gap-1 shadow-sm font-semibold"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Salvar Registro
                      </Button>
                    </div>
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
                        <span className="font-bold text-emerald-600 text-[13px] block">
                          {Number(supervisaoModalTicket.valor_operacao || supervisaoModalTicket.margem || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
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
          <ClientDetailsModal
            cpf={selectedClientCpf}
            isOpen={isClientDetailsModalOpen}
            onClose={() => {
              setIsClientDetailsModalOpen(false)
              setSelectedClientCpf("")
              setIsViewingLeadInAttendance(false)
            }}
            title="Informações sobre o Lead"
            onSelectTabulacao={isClientInAnyKanbanStage ? undefined : handleTabulacaoFromModal}
            showTabulacoes={!isClientInAnyKanbanStage}
            hidePhoneSelectionBanner={isClientInAnyKanbanStage}
            showPipelineActionButtons={isClientInAnyKanbanStage}
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
        )
      })()}

      {/* Modal de Notificação: Lead Já em Atendimento / Fechado / Perdido */}
      {leadEmAtendimentoInfo && (() => {
        const isFechado = leadEmAtendimentoInfo.etapa === "FECHADO"
        const isPerdido = leadEmAtendimentoInfo.etapa === "PERDIDO"

        const modalTitle = isFechado 
          ? "Lead com Atendimento Fechado" 
          : isPerdido 
            ? "Lead Perdido" 
            : "Lead Já em Atendimento"

        const modalSubtitle = isFechado
          ? "Cliente com negociação concluída"
          : isPerdido
            ? "Cliente finalizado como perdido"
            : "Cliente com cartão ativo no pipeline"

        const alertMessage = isFechado
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
                    isFechado && "bg-emerald-50 border-emerald-200/80 text-emerald-600",
                    isPerdido && "bg-rose-50 border-rose-200/80 text-rose-600",
                    !isFechado && !isPerdido && "bg-amber-50 border-amber-200/80 text-amber-600"
                  )}>
                    {isFechado ? (
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
                    <p className="text-[11px] text-slate-500 font-medium">
                      {modalSubtitle}
                    </p>
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
                  isFechado && "bg-emerald-50/70 border-emerald-200/70 text-emerald-900",
                  isPerdido && "bg-rose-50/70 border-rose-200/70 text-rose-900",
                  !isFechado && !isPerdido && "bg-amber-50/70 border-amber-200/70 text-amber-900"
                )}>
                  {isFechado ? (
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
