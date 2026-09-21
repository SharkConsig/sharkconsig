"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  RefreshCw, 
  Phone, 
  Calendar as CalendarIcon, 
  ArrowRight, 
  Clock, 
  AlertCircle, 
  AlertTriangle, 
  ShieldAlert, 
  User, 
  DollarSign, 
  ChevronRight, 
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
  Plus
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

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
    headerBg: "bg-sky-50/80 border-sky-200",
    borderTop: "border-t-sky-500",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-300",
    descriptionOperador: "Realizar o primeiro contato (A0) o mais rápido possível.",
    descriptionGestor: "Velocidade de distribuição e tempo de reação da equipe."
  },
  {
    id: "EM RETOMADA",
    title: "EM RETOMADA",
    subtitle: "Réguas de Contato",
    code: "RT1 - RT6",
    color: "amber",
    headerBg: "bg-amber-50/80 border-amber-200",
    borderTop: "border-t-amber-500",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    descriptionOperador: "Executar tentativas planejadas (RT1 a RT6) para quem não respondeu.",
    descriptionGestor: "Disciplina de execução e cumprimento da sequência planejada."
  },
  {
    id: "EM NEGOCIAÇÃO",
    title: "EM NEGOCIAÇÃO",
    subtitle: "Foco em Fechamento",
    code: "NEG",
    color: "indigo",
    headerBg: "bg-indigo-50/80 border-indigo-200",
    borderTop: "border-t-indigo-500",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300",
    descriptionOperador: "Trabalhar propostas ativas, simulações, dúvidas e documentos.",
    descriptionGestor: "Pipeline quente, volume potencial e apoio em negócios complexos."
  },
  {
    id: "EM REATIVAÇÃO",
    title: "EM REATIVAÇÃO",
    subtitle: "Atenção ao Cliente Esfriado",
    code: "RE1 - RE3",
    color: "purple",
    headerBg: "bg-purple-50/80 border-purple-200",
    borderTop: "border-t-purple-500",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
    descriptionOperador: "Clientes há 48h úteis sem resposta: resgate imediato da oportunidade.",
    descriptionGestor: "Monitoramento de gargalos e oportunidades quentes em risco de perda."
  },
  {
    id: "SEM INTERESSE",
    title: "SEM INTERESSE",
    subtitle: "Nutrição e Longo Prazo",
    code: "DDD / SI",
    color: "slate",
    headerBg: "bg-slate-100/90 border-slate-300",
    borderTop: "border-t-slate-500",
    badgeClass: "bg-slate-200 text-slate-800 border-slate-300",
    descriptionOperador: "Registrar motivo da recusa e programar abordagem futura permitida.",
    descriptionGestor: "Preservação da base para futuro retrabalho no momento certo."
  },
  {
    id: "FECHADO",
    title: "FECHADO",
    subtitle: "Venda Concluída",
    code: "GOL",
    color: "emerald",
    headerBg: "bg-emerald-50/80 border-emerald-200",
    borderTop: "border-t-emerald-500",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    descriptionOperador: "Documentação anexada e proposta digitada no sistema.",
    descriptionGestor: "Resultado final e faturamento consolidado vs metas da equipe."
  },
  {
    id: "PERDIDO",
    title: "PERDIDO",
    subtitle: "Finalização por Inviabilidade",
    code: "FIM",
    color: "rose",
    headerBg: "bg-rose-50/80 border-rose-200",
    borderTop: "border-t-rose-500",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    descriptionOperador: "Encerramento por tentativas esgotadas ou inviabilidade do crédito.",
    descriptionGestor: "Taxa de perda, motivos de descarte e qualidade da listagem."
  }
]

interface TicketMetadata {
  kanban_stage?: KanbanStage
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
}

interface UserSummary {
  id: string
  nome: string
  funcao?: string
  role?: string
  equipe?: string
  avatar_url?: string
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

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>("ALL")
  const [selectedAlertFilter, setSelectedAlertFilter] = useState<string>("ALL") // ALL, ATRASADO, ACAO_ESPECIAL, CONFLITO

  // Estado de desmascarar CPF temporariamente no card
  const [revealedCpfs, setRevealedCpfs] = useState<Record<string, boolean>>({})

  // Modais
  const [atendimentoModalTicket, setAtendimentoModalTicket] = useState<TicketItem | null>(null)
  const [supervisaoModalTicket, setSupervisaoModalTicket] = useState<TicketItem | null>(null)
  const [agendarModalTicket, setAgendarModalTicket] = useState<TicketItem | null>(null)
  const [moverModalTicket, setMoverModalTicket] = useState<TicketItem | null>(null)
  const [callFeedbackTicket, setCallFeedbackTicket] = useState<TicketItem | null>(null)

  // Campos de formulário em modais
  const [atendimentoMensagem, setAtendimentoMensagem] = useState("")
  const [isSubmittingAtendimento, setIsSubmittingAtendimento] = useState(false)
  const [historicoMensagens, setHistoricoMensagens] = useState<any[]>([])
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false)

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
              avatar_url: u.avatar_url
            })))
          }
        }
      } catch (err) {
        console.error("Erro ao carregar lista de usuários:", err)
      }
    }
    loadUsers()
  }, [])

  // Carregar Chamados do Supabase
  const fetchChamados = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    setIsRefreshing(true)
    try {
      let query = supabase
        .from("chamados")
        .select(`
          id,
          status,
          origem,
          cliente_nome,
          cliente_cpf,
          cliente_telefone,
          cliente_telefone_2,
          cliente_telefone_3,
          margem,
          valor_operacao,
          convenio,
          equipe,
          descricao,
          user_id,
          user_nome,
          user_avatar,
          created_at,
          updated_at,
          status_id
        `)
        .order("updated_at", { ascending: false })
        .limit(1000)

      // Regras de visibilidade conforme o papel
      if (!isGestor && user) {
        if (userRole === "Estágio" || userRole === "Estagio") {
          query = query.eq("user_id", user.id)
        } else if (userRole === "Corretor") {
          // Corretor vê seus chamados e pode ver estagiários vinculados
          try {
            const res = await fetch("/api/usuarios")
            if (res.ok) {
              const all = await res.json()
              const myEstagiarios = all
                .filter((u: { padrinho_id: string }) => u.padrinho_id === user.id)
                .map((u: { id: string }) => u.id)
              query = query.in("user_id", [user.id, ...myEstagiarios])
            } else {
              query = query.eq("user_id", user.id)
            }
          } catch {
            query = query.eq("user_id", user.id)
          }
        }
      }

      const { data, error } = await query
      if (error) throw error
      setTickets((data || []) as TicketItem[])
    } catch (err) {
      console.error("Erro ao carregar chamados para o Kanban:", err)
      toast.error("Não foi possível carregar os chamados do Kanban.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [isGestor, user, userRole])

  useEffect(() => {
    fetchChamados()
  }, [fetchChamados])

  // Filtragem dos chamados
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const meta = parseMetadata(t.descricao)

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

  // Toggle revelação do CPF
  const toggleRevealCpf = (ticketId: string) => {
    setRevealedCpfs(prev => ({
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
  const handleOpenMoverEtapa = (ticket: TicketItem) => {
    const meta = parseMetadata(ticket.descricao)
    const current = inferKanbanStage(ticket, meta)
    setMoverModalTicket(ticket)
    setNovaEtapaSelecionada(current)
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

      // Próxima ação padrão da nova etapa
      let proximaAcaoPadrao = ""
      if (novaEtapaSelecionada === "EM ABORDAGEM") proximaAcaoPadrao = "[A0] Realizar Primeiro Contato Imediato"
      else if (novaEtapaSelecionada === "EM RETOMADA") proximaAcaoPadrao = "[RT1] Enviar Régua de Retomada 1"
      else if (novaEtapaSelecionada === "EM NEGOCIAÇÃO") proximaAcaoPadrao = "[NEG] Enviar simulação e recolher documentos"
      else if (novaEtapaSelecionada === "EM REATIVAÇÃO") proximaAcaoPadrao = "[RE1] Resgatar oportunidade esfriada"
      else if (novaEtapaSelecionada === "SEM INTERESSE") proximaAcaoPadrao = "[SI] Cadência de Longo Prazo / Nutrição"
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

      toast.success(`Chamado movido para "${novaEtapaSelecionada}"!`)
      setMoverModalTicket(null)
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao mover etapa:", err)
      toast.error("Erro ao mover a ficha de etapa.")
    }
  }

  // Abrir Modal ao Clicar no Card:
  // - Corretor / Estagiário -> Modal de Atendimento
  // - Gestor -> Modal de Supervisão
  const handleCardClick = (ticket: TicketItem) => {
    if (isGestor) {
      const meta = parseMetadata(ticket.descricao)
      setSupervisaoModalTicket(ticket)
      setSupervisaoNovoResponsavel(ticket.user_id || "")
      setSupervisaoMotivoTransbordo("")
      setSupervisaoNovaPrioridade(meta.prioridade || "NORMAL")
    } else {
      setAtendimentoModalTicket(ticket)
      setAtendimentoMensagem("")
      loadHistoricoChamado(ticket.id)
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

  // Confirmar Ação Especial solicitada pelo Corretor
  const handleSolicitarAcaoEspecial = async () => {
    if (!atendimentoModalTicket || !user) return
    try {
      const meta = parseMetadata(atendimentoModalTicket.descricao)
      const updatedMeta: TicketMetadata = {
        ...meta,
        acao_especial: true,
        acao_especial_motivo: atendimentoMensagem.trim() || "Solicitação de apoio da supervisão para fechamento de proposta.",
        acao_especial_status: "pendente"
      }
      const newDesc = stringifyWithMetadata(atendimentoModalTicket.descricao, updatedMeta)
      await supabase
        .from("chamados")
        .update({ descricao: newDesc, updated_at: new Date().toISOString() })
        .eq("id", atendimentoModalTicket.id)

      await supabase.from("mensagens_chamado").insert({
        chamado_id: parseInt(atendimentoModalTicket.id, 10),
        user_id: user.id,
        user_nome: perfil?.nome || "Colaborador",
        user_role: perfil?.role || "Corretor",
        user_avatar: perfil?.avatar_url || null,
        content: `🟡 AÇÃO ESPECIAL SOLICITADA: ${atendimentoMensagem.trim() || "Apoio de supervisão requerido."}`,
        action: "solicitacao_acao_especial"
      })

      toast.success("Ação Especial solicitada à Supervisão!")
      setAtendimentoModalTicket(null)
      fetchChamados(true)
    } catch (err) {
      console.error("Erro ao solicitar ação especial:", err)
      toast.error("Erro ao solicitar intervenção.")
    }
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />
      
      <main className="flex-1 p-4 lg:p-6 space-y-5 overflow-hidden flex flex-col">
        {/* Barra Superior: Título, Métricas Consolidadas e Controles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  KANBAN DE ATENDIMENTO COMERCIAL
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Fluxo comercial em tempo real integrado aos Chamados do SharkConsig
                </p>
              </div>
            </div>
          </div>

          {/* Métricas Rápidas */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className="text-slate-500 font-medium">Total Fichas: </span>
              <span className="font-bold text-slate-900">{metrics.totalLeads}</span>
            </div>
            <div className="bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg">
              <span className="text-sky-700 font-medium">Pipeline: </span>
              <span className="font-bold text-sky-900">
                {metrics.totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            {metrics.totalAtrasados > 0 && (
              <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-rose-700">
                <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                <span className="font-bold">{metrics.totalAtrasados} Atrasados</span>
              </div>
            )}
            {metrics.totalAcaoEspecial > 0 && (
              <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-bold">{metrics.totalAcaoEspecial} Ação Especial</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchChamados(false)}
              disabled={isRefreshing}
              className="h-8 gap-1.5 text-xs text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          {/* Busca por Nome, CPF ou Telefone */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por Nome, CPF ou Telefone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50/60"
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

          {/* Filtro por Responsável (Gestores) */}
          {isGestor && (
            <div>
              <select
                value={selectedResponsavel}
                onChange={e => setSelectedResponsavel(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-slate-50/60 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium text-slate-700"
              >
                <option value="ALL">👥 Todos os Responsáveis</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.role || u.funcao || "Colaborador"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Alertas */}
          <div>
            <select
              value={selectedAlertFilter}
              onChange={e => setSelectedAlertFilter(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-slate-50/60 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium text-slate-700"
            >
              <option value="ALL">🎯 Todos os Alertas / Status</option>
              <option value="ATRASADO">🔴 Somente Atrasados</option>
              <option value="ACAO_ESPECIAL">🟡 Somente Ação Especial</option>
              <option value="CONFLITO">🔵 Somente Conflito de Titularidade</option>
            </select>
          </div>

          {/* Indicador de Papel Ativo */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
            <span className="text-slate-500 font-medium">Modo Ativo:</span>
            <Badge variant="outline" className={cn(
              "font-bold text-[11px]",
              isGestor ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-sky-50 text-sky-800 border-sky-300"
            )}>
              {isGestor ? "Painel de Gestão (Supervisão)" : "Mesa de Trabalho (Execução)"}
            </Badge>
          </div>
        </div>

        {/* Quadro das 7 Colunas do Kanban */}
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex items-start gap-4 min-w-[1850px] h-full">
            {KANBAN_COLUMNS.map(col => {
              const colTickets = groupedColumns[col.id] || []
              const totalColValor = colTickets.reduce((acc, t) => acc + Number(t.valor_operacao || t.margem || 0), 0)

              return (
                <div
                  key={col.id}
                  className="flex-1 min-w-[250px] max-w-[270px] bg-slate-100/70 border border-slate-200/90 rounded-xl flex flex-col max-h-[calc(100vh-230px)] shadow-xs"
                >
                  {/* Cabeçalho da Coluna */}
                  <div className={cn("p-3.5 border-b rounded-t-xl border-t-4", col.borderTop, col.headerBg)}>
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="font-bold text-xs text-slate-900 tracking-tight flex items-center gap-1.5">
                        {col.title}
                      </h2>
                      <Badge className={cn("text-[10px] font-bold px-1.5 py-0.5", col.badgeClass)}>
                        {col.code}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mb-2">
                      {col.subtitle}
                    </p>

                    {/* Totais Acumulados para Gestão e Operação */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-[11px]">
                      <span className="font-semibold text-slate-700">
                        {colTickets.length} {colTickets.length === 1 ? "lead" : "leads"}
                      </span>
                      <span className="font-bold text-slate-900">
                        {totalColValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Cartões (Scroll Vertical) */}
                  <div className="p-2 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar">
                    {colTickets.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 font-medium">
                        Nenhum lead nesta etapa
                      </div>
                    ) : (
                      colTickets.map(ticket => {
                        const meta = parseMetadata(ticket.descricao)
                        const valorTotal = Number(ticket.valor_operacao || ticket.margem || 0)
                        const isCpfRevealed = Boolean(revealedCpfs[ticket.id])

                        // Identificar se há alerta de alto valor (> 20k ou > 50k)
                        const isAltoValor = valorTotal >= 20000

                        // Próxima Ação e Vencimento
                        const proximaAcaoTexto = meta.proxima_acao || (
                          col.id === "EM ABORDAGEM" ? "[A0] Realizar Primeiro Contato Imediato" :
                          col.id === "EM RETOMADA" ? "[RT1] Enviar Régua de Retomada 1 via WhatsApp" :
                          col.id === "EM NEGOCIAÇÃO" ? "[NEG] Enviar simulação ajustada e esclarecer dúvidas" :
                          col.id === "EM REATIVAÇÃO" ? "[RE1] Resgatar contato esfriado após 48h úteis" :
                          col.id === "SEM INTERESSE" ? "[SI] Programar cadência longa / nutrição" :
                          col.id === "FECHADO" ? "Proposta Digitada no Sistema" :
                          "Finalização registrada por inviabilidade"
                        )

                        const vencimentoLabel = meta.vencimento_acao 
                          ? format(new Date(meta.vencimento_acao), "dd/MM 'às' HH:mm")
                          : "Hoje às 14:30"

                        return (
                          <div
                            key={ticket.id}
                            onClick={() => handleCardClick(ticket)}
                            className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2.5 hover:border-slate-300 relative group"
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
                              <h3 className="text-xs font-bold text-slate-900 tracking-tight line-clamp-1 group-hover:text-sky-600 transition-colors">
                                {ticket.cliente_nome || "Nome não informado"}
                              </h3>

                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                <span>CPF:</span>
                                <span className="font-mono font-medium text-slate-700 whitespace-nowrap">
                                  {isCpfRevealed ? (ticket.cliente_cpf || "---") : maskCpf(ticket.cliente_cpf)}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleRevealCpf(ticket.id)
                                  }}
                                  className="text-slate-400 hover:text-slate-600 p-0.5"
                                  title={isCpfRevealed ? "Ocultar CPF" : "Revelar CPF"}
                                >
                                  {isCpfRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                {isCpfRevealed && ticket.cliente_cpf && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCopy(ticket.cliente_cpf, "CPF")
                                    }}
                                    className="text-slate-400 hover:text-slate-600 p-0.5"
                                    title="Copiar CPF"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                <span>Tel:</span>
                                <span className="font-mono font-medium text-slate-700 whitespace-nowrap">
                                  {maskPhone(ticket.cliente_telefone)}
                                </span>
                              </div>
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
                              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                                <span className="text-slate-500">Responsável:</span>
                                <span className="font-semibold text-sky-700 truncate max-w-[130px]">
                                  {ticket.user_nome || meta.corretor_nome || "Não atribuído"}
                                </span>
                              </div>
                            </div>

                            {/* 4. Bloco da Próxima Ação */}
                            <div className="bg-amber-50/70 border border-amber-200/80 rounded-md p-2 text-[11px] space-y-0.5">
                              <div className="font-bold text-amber-900 flex items-center gap-1">
                                <span>📌 PRÓXIMA AÇÃO:</span>
                              </div>
                              <p className="text-amber-800 font-medium line-clamp-2">
                                {proximaAcaoTexto}
                              </p>
                              <div className="text-[10px] text-amber-700 flex items-center gap-1 pt-0.5 font-medium">
                                <Clock className="w-3 h-3 text-amber-600" />
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
                                onClick={() => handleOpenCallFeedback(ticket)}
                                className="h-7 p-0 flex items-center justify-center text-slate-700 hover:text-sky-700 hover:bg-sky-50 flex-1 border-slate-200"
                                title="Ligar / Registrar Ligação"
                                aria-label="Ligar"
                              >
                                <Phone className="w-3.5 h-3.5 text-sky-600" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenWhatsApp(ticket)}
                                className="h-7 p-0 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 flex-1 border-emerald-200"
                                title="WhatsApp"
                                aria-label="WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAgendar(ticket)}
                                className="h-7 p-0 flex items-center justify-center text-slate-700 hover:bg-slate-50 flex-1 border-slate-200"
                                title="Agendar Retorno"
                                aria-label="Agendar"
                              >
                                <CalendarIcon className="w-3.5 h-3.5 text-slate-600" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenMoverEtapa(ticket)}
                                className="h-7 p-0 flex items-center justify-center text-indigo-700 hover:bg-indigo-50 flex-1 border-indigo-200"
                                title="Mover para outra Etapa"
                                aria-label="Mover"
                              >
                                <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
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
      </main>

      {/* MODAL 1: ATENDIMENTO (Corretor / Estagiário) */}
      {atendimentoModalTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabeçalho da Modal */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                  A0
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Modal de Atendimento Comercial
                  </h2>
                  <p className="text-xs text-slate-500">
                    {atendimentoModalTicket.cliente_nome} • CPF: {maskCpf(atendimentoModalTicket.cliente_cpf)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                onClick={() => setAtendimentoModalTicket(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Conteúdo Principal */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Informações Resumidas do Cliente */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Telefone Principal</span>
                  <span className="font-semibold text-slate-800">{atendimentoModalTicket.cliente_telefone || "Sem telefone"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Convênio / Órgão</span>
                  <span className="font-semibold text-slate-800">{atendimentoModalTicket.convenio || "Não informado"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Valor da Operação</span>
                  <span className="font-bold text-emerald-700">
                    {Number(atendimentoModalTicket.valor_operacao || atendimentoModalTicket.margem || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Etapa Atual</span>
                  <span className="font-bold text-sky-700">
                    {inferKanbanStage(atendimentoModalTicket, parseMetadata(atendimentoModalTicket.descricao))}
                  </span>
                </div>
              </div>

              {/* Ações Rápidas de Desfecho */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Atalhos de Registro Rápido:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 text-sky-700 border-sky-200 hover:bg-sky-50"
                    onClick={() => setAtendimentoMensagem("✅ Primeiro Contato (A0) realizado com sucesso via WhatsApp. Aguardando retorno do cliente.")}
                  >
                    A0 Realizado
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 text-amber-700 border-amber-200 hover:bg-amber-50"
                    onClick={() => setAtendimentoMensagem("📲 Régua de Retomada enviada no WhatsApp com nova simulação de valores.")}
                  >
                    Régua Enviada
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                    onClick={() => setAtendimentoMensagem("📑 Cliente solicitou simulação personalizada de prazos e parcelas.")}
                  >
                    Simulação Solicitada
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => setAtendimentoMensagem("📄 Documentação de RG e comprovante recebida do cliente para digitação da proposta.")}
                  >
                    Documentos Recebidos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 text-rose-700 border-rose-200 hover:bg-rose-50"
                    onClick={() => setAtendimentoMensagem("❌ Cliente declarou desinteresse no momento. Autorizou contato futuro.")}
                  >
                    Sem Interesse
                  </Button>
                </div>
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
                  className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSolicitarAcaoEspecial}
                    className="text-xs h-8 text-amber-700 border-amber-300 hover:bg-amber-50 gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Solicitar Ação Especial à Gestão
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSaveAtendimentoInteracao("atendimento_registro")}
                    disabled={isSubmittingAtendimento || !atendimentoMensagem.trim()}
                    className="text-xs h-8 bg-sky-600 hover:bg-sky-700 text-white gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Salvar Registro
                  </Button>
                </div>
              </div>

              {/* Histórico Auditável de Mensagens */}
              <div className="pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
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
                      <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-bold text-slate-700">{msg.user_nome} ({msg.user_role || "Colaborador"})</span>
                          <span>{msg.created_at ? format(new Date(msg.created_at), "dd/MM/yyyy HH:mm") : ""}</span>
                        </div>
                        <p className="text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé da Modal */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabeçalho da Modal */}
            <div className="p-4 bg-amber-500/10 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Painel de Supervisão e Gestão de Leads
                  </h2>
                  <p className="text-xs text-slate-500">
                    Controle de titularidade, transbordo e intervenções para {supervisaoModalTicket.cliente_nome}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                onClick={() => setSupervisaoModalTicket(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Conteúdo Principal */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Resumo do Lead */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Responsável Atual</span>
                  <span className="font-bold text-sky-800">{supervisaoModalTicket.user_nome || "Não atribuído"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Valor da Operação</span>
                  <span className="font-bold text-slate-900">
                    {Number(supervisaoModalTicket.valor_operacao || supervisaoModalTicket.margem || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Etapa Comercial</span>
                  <span className="font-bold text-indigo-700">
                    {inferKanbanStage(supervisaoModalTicket, parseMetadata(supervisaoModalTicket.descricao))}
                  </span>
                </div>
              </div>

              {/* Bloco 1: Reatribuição de Responsável (Transbordo) */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  Reatribuir Lead para outro Colaborador
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Novo Responsável:</label>
                    <select
                      value={supervisaoNovoResponsavel}
                      onChange={e => setSupervisaoNovoResponsavel(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-sky-500"
                    >
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nome} ({u.role || u.funcao || "Colaborador"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Prioridade na Fila:</label>
                    <select
                      value={supervisaoNovaPrioridade}
                      onChange={e => setSupervisaoNovaPrioridade(e.target.value as any)}
                      className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="ALTA">Alta</option>
                      <option value="URGENTE">Urgente / Crítica</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Justificativa da Reatribuição (Auditável):</label>
                  <Input
                    type="text"
                    value={supervisaoMotivoTransbordo}
                    onChange={e => setSupervisaoMotivoTransbordo(e.target.value)}
                    placeholder="Ex: SLA de primeiro contato expirado / Readequação de carteira"
                    className="text-xs h-8 bg-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleConfirmSupervisaoTransbordo}
                    disabled={isSubmittingSupervisao || supervisaoNovoResponsavel === supervisaoModalTicket.user_id}
                    className="text-xs h-8 bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    Confirmar Transbordo de Lead
                  </Button>
                </div>
              </div>

              {/* Bloco 2: Conflito de Titularidade & Duplicidades */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Conflito de Titularidade e Negociação Simultânea
                </h4>
                <p className="text-slate-500 text-[11px]">
                  Evita que dois corretores entrem em contato com o mesmo cliente simultaneamente. A supervisão pode decidir liberar ou bloquear o atendimento.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolverConflito(true)}
                    className="text-xs h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Liberar Atendimento (Sem Conflito)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolverConflito(false)}
                    className="text-xs h-8 text-rose-700 border-rose-200 hover:bg-rose-50 gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    Marcar Conflito Ativo
                  </Button>
                </div>
              </div>

              {/* Bloco 3: Desfecho de Ação Especial */}
              {(() => {
                const meta = parseMetadata(supervisaoModalTicket.descricao)
                return (
                  <div className="p-3.5 bg-amber-50/60 rounded-lg border border-amber-200/80 space-y-2">
                    <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Intervenção de Ação Especial
                    </h4>
                    <p className="text-amber-800 text-[11px]">
                      {meta.acao_especial_motivo 
                        ? `Motivo: ${meta.acao_especial_motivo}` 
                        : "Ticket alto ou solicitação da equipe comercial para suporte de negociação."}
                    </p>
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleConcluirAcaoEspecial}
                        className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Concluir Intervenção da Supervisão
                      </Button>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Rodapé da Modal */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
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
    </div>
  )
}
