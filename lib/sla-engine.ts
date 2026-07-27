import { supabase } from '@/lib/supabase'

export interface SLAConfig {
  id?: string
  status_crm: string
  prazo_horas_uteis: number
  pergunta_forcada: string
  pergunta2_forcada?: string
  prazo2_horas?: number
  faixa_valor_min_margem?: number
  faixa_valor_min_cartao?: number
  faixa2_min_margem?: number
  faixa2_min_cartao?: number
  faixa3_min_margem?: number
  faixa3_min_cartao?: number
  prazo_faixa1_horas?: number
  prazo_faixa2_horas?: number
  prazo_faixa3_horas?: number
  ativo?: boolean
}

export interface SLATicketState {
  id: string
  status: string
  created_at: string
  user_id?: string
  corretor_id?: string
  timestamp_ultima_mudanca_status?: string
  pergunta_pendente?: string
  timestamp_gatilho_disparado?: string
  soneca_usada?: boolean
  timestamp_soneca?: string
  escalonamento_status?: 'nenhum' | 'supervisao' | 'administrador' | 'supervisao_administrador' | 'supervisao_gestao'
  timestamp_escalonamento?: string
  operacao_valor_margem?: number
  operacao_valor_cartao?: number
}

// Expediente Comercial: Segunda a Sexta, 08:00 às 18:00 (10 horas por dia útil)
const START_HOUR = 8
const END_HOUR = 18

export function calculateBusinessHoursElapsed(startDate: Date, endDate: Date = new Date()): number {
  if (startDate >= endDate) return 0

  let current = new Date(startDate.getTime())
  let totalMilliseconds = 0

  while (current < endDate) {
    const dayOfWeek = current.getDay() // 0 = Domingo, 6 = Sábado
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    if (!isWeekend) {
      const dayStart = new Date(current)
      dayStart.setHours(START_HOUR, 0, 0, 0)

      const dayEnd = new Date(current)
      dayEnd.setHours(END_HOUR, 0, 0, 0)

      const windowStart = new Date(Math.max(current.getTime(), dayStart.getTime()))
      const windowEnd = new Date(Math.min(endDate.getTime(), dayEnd.getTime()))

      if (windowStart < windowEnd && current < dayEnd && endDate > dayStart) {
        totalMilliseconds += (windowEnd.getTime() - windowStart.getTime())
      }
    }

    // Avança para o próximo dia às 08:00
    current.setDate(current.getDate() + 1)
    current.setHours(START_HOUR, 0, 0, 0)
  }

  return totalMilliseconds / (1000 * 60 * 60) // Retorna em horas
}

export function canBrokerSnooze(timestampUltimaSonecaEstourada?: string | null): boolean {
  if (!timestampUltimaSonecaEstourada) return true
  const lastBlown = new Date(timestampUltimaSonecaEstourada).getTime()
  const now = new Date().getTime()
  const hoursSince = (now - lastBlown) / (1000 * 60 * 60)
  return hoursSince >= 3
}

export function parsePerguntaForcadaMeta(perguntaForcadaRaw: string): {
  cleanPergunta: string
  faixa3MinMargem: number
  faixa3MinCartao: number
  pergunta2: string
  prazo2Horas: number
} {
  if (!perguntaForcadaRaw) {
    return { cleanPergunta: '', faixa3MinMargem: 0, faixa3MinCartao: 0, pergunta2: '', prazo2Horas: 0 }
  }

  let raw = perguntaForcadaRaw.trim()
  let f3Margem = 0
  let f3Cartao = 0
  let pergunta2 = ''
  let prazo2Horas = 0

  // Extract F3 metadata
  const f3Match = raw.match(/__F3:(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)__/)
  if (f3Match) {
    f3Margem = Number(f3Match[1])
    f3Cartao = Number(f3Match[2])
    raw = raw.replace(f3Match[0], '').trim()
  }

  // Extract P2 metadata: __P2:prazoHoras:pergunta2Texto__
  const p2Match = raw.match(/__P2:(\d+(?:\.\d+)?):(.*?)__$/)
  if (p2Match) {
    prazo2Horas = Number(p2Match[1])
    pergunta2 = p2Match[2].trim()
    raw = raw.replace(p2Match[0], '').trim()
  }

  return {
    cleanPergunta: raw.trim(),
    faixa3MinMargem: f3Margem,
    faixa3MinCartao: f3Cartao,
    pergunta2,
    prazo2Horas
  }
}

export function encodePerguntaForcadaMeta(
  cleanPergunta: string,
  f3Margem: number,
  f3Cartao: number,
  pergunta2?: string,
  prazo2Horas?: number
): string {
  let base = cleanPergunta.trim()
  base += ` __F3:${f3Margem}:${f3Cartao}__`
  if (pergunta2 && pergunta2.trim() && (prazo2Horas || 0) > 0) {
    base += ` __P2:${prazo2Horas}:${pergunta2.trim()}__`
  }
  return base
}

export interface SLAGlobalSettings {
  ativo: boolean
  tipo_periodo: 'todos' | '7d' | '15d' | '30d' | '60d' | '90d' | 'a_partir_de' | 'intervalo'
  data_inicio?: string
  data_fim?: string
  colaboradores?: string[]
}

export function isCollaboratorTargeted(colaboradorId: string | null | undefined, settings: SLAGlobalSettings): boolean {
  if (!settings.colaboradores || settings.colaboradores.length === 0 || settings.colaboradores.includes('todos')) {
    return true
  }
  if (!colaboradorId) return false
  return settings.colaboradores.includes(colaboradorId)
}

export function getSLAGlobalSettings(configs: SLAConfig[]): SLAGlobalSettings {
  let settings: SLAGlobalSettings = {
    ativo: true,
    tipo_periodo: '30d',
    data_inicio: '',
    data_fim: '',
    colaboradores: []
  }

  let foundInDb = false

  if (configs && Array.isArray(configs)) {
    const globalSetting = configs.find(c => c.status_crm?.trim().toUpperCase() === '__GLOBAL_SETTINGS__')
    if (globalSetting) {
      foundInDb = true
      settings.ativo = globalSetting.ativo !== false
      if (globalSetting.pergunta_forcada && globalSetting.pergunta_forcada.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(globalSetting.pergunta_forcada)
          if (parsed.tipo_periodo) settings.tipo_periodo = parsed.tipo_periodo
          if (parsed.data_inicio !== undefined) settings.data_inicio = parsed.data_inicio
          if (parsed.data_fim !== undefined) settings.data_fim = parsed.data_fim
          if (Array.isArray(parsed.colaboradores)) settings.colaboradores = parsed.colaboradores
        } catch (e) {
          // Ignora se não for JSON válido
        }
      }
    }
  }

  // Só recorre ao localStorage se a configuração global NÃO foi encontrada no banco de dados
  if (!foundInDb && typeof window !== 'undefined') {
    const localActive = localStorage.getItem('sla_global_active')
    if (localActive === 'false') settings.ativo = false
    const localPeriod = localStorage.getItem('sla_global_period')
    if (localPeriod) {
      try {
        const parsed = JSON.parse(localPeriod)
        if (parsed.tipo_periodo) settings.tipo_periodo = parsed.tipo_periodo
        if (parsed.data_inicio !== undefined) settings.data_inicio = parsed.data_inicio
        if (parsed.data_fim !== undefined) settings.data_fim = parsed.data_fim
        if (Array.isArray(parsed.colaboradores)) settings.colaboradores = parsed.colaboradores
      } catch (e) {}
    }
  }

  return settings
}

export function getSLACutoffDates(settings: SLAGlobalSettings): { startDate: Date | null, endDate: Date | null } {
  const now = new Date()

  switch (settings.tipo_periodo) {
    case '7d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      d.setHours(0, 0, 0, 0)
      return { startDate: d, endDate: null }
    }
    case '15d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 15)
      d.setHours(0, 0, 0, 0)
      return { startDate: d, endDate: null }
    }
    case '30d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      d.setHours(0, 0, 0, 0)
      return { startDate: d, endDate: null }
    }
    case '60d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 60)
      d.setHours(0, 0, 0, 0)
      return { startDate: d, endDate: null }
    }
    case '90d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 90)
      d.setHours(0, 0, 0, 0)
      return { startDate: d, endDate: null }
    }
    case 'a_partir_de': {
      if (settings.data_inicio) {
        const d = new Date(`${settings.data_inicio}T00:00:00`)
        return { startDate: isNaN(d.getTime()) ? null : d, endDate: null }
      }
      return { startDate: null, endDate: null }
    }
    case 'intervalo': {
      let start: Date | null = null
      let end: Date | null = null
      if (settings.data_inicio) {
        const d = new Date(`${settings.data_inicio}T00:00:00`)
        if (!isNaN(d.getTime())) start = d
      }
      if (settings.data_fim) {
        const d = new Date(`${settings.data_fim}T23:59:59`)
        if (!isNaN(d.getTime())) end = d
      }
      return { startDate: start, endDate: end }
    }
    case 'todos':
    default:
      return { startDate: null, endDate: null }
  }
}

export function isTicketInSLAPeriod(ticketDateISO: string, settings: SLAGlobalSettings): boolean {
  if (!ticketDateISO) return false
  const { startDate, endDate } = getSLACutoffDates(settings)
  const ticketDate = new Date(ticketDateISO)
  if (isNaN(ticketDate.getTime())) return false

  if (startDate && ticketDate < startDate) return false
  if (endDate && ticketDate > endDate) return false

  return true
}

export function isSLAGlobalActive(configs: SLAConfig[]): boolean {
  if (configs && Array.isArray(configs)) {
    const globalSetting = configs.find(c => c.status_crm?.trim().toUpperCase() === '__GLOBAL_SETTINGS__')
    if (globalSetting && globalSetting.ativo === false) {
      return false
    }
  }
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('sla_global_active')
    if (local === 'false') return false
  }
  return true
}

export function evaluateTicketSLA(
  ticket: SLATicketState,
  configs: SLAConfig[],
  brokerSonecaEstourada?: string | null
): {
  perguntaForcada: string | null
  gatilhoDisparado: boolean
  podeAdiar: boolean
  sonecaAtiva: boolean
  tempoRestanteSonecaMinutos: number
  escaladoSupervisao: boolean
  escaladoGestao: boolean
  bloquearNovoLead: boolean
  horasAtraso: number
} {
  const globalSettings = getSLAGlobalSettings(configs)
  if (!globalSettings.ativo) {
    return {
      perguntaForcada: null,
      gatilhoDisparado: false,
      podeAdiar: false,
      sonecaAtiva: false,
      tempoRestanteSonecaMinutos: 0,
      escaladoSupervisao: false,
      escaladoGestao: false,
      bloquearNovoLead: false,
      horasAtraso: 0
    }
  }

  const ticketDateISO = ticket.timestamp_ultima_mudanca_status || ticket.created_at
  if (!isTicketInSLAPeriod(ticketDateISO, globalSettings)) {
    return {
      perguntaForcada: null,
      gatilhoDisparado: false,
      podeAdiar: false,
      sonecaAtiva: false,
      tempoRestanteSonecaMinutos: 0,
      escaladoSupervisao: false,
      escaladoGestao: false,
      bloquearNovoLead: false,
      horasAtraso: 0
    }
  }

  if (!isCollaboratorTargeted(ticket.corretor_id || ticket.user_id, globalSettings)) {
    return {
      perguntaForcada: null,
      gatilhoDisparado: false,
      podeAdiar: false,
      sonecaAtiva: false,
      tempoRestanteSonecaMinutos: 0,
      escaladoSupervisao: false,
      escaladoGestao: false,
      bloquearNovoLead: false,
      horasAtraso: 0
    }
  }

  const statusUpper = (ticket.status || "").trim().toUpperCase()
  // 1. Tenta encontrar regra específica para o status
  let config = configs.find(c => c.status_crm.trim().toUpperCase() === statusUpper && c.ativo !== false)

  // 2. Se não houver regra específica, aplica a regra geral do grupo "APROVADOS" se for um status de aprovado
  if (!config && (statusUpper.includes('APROVADO') || statusUpper.includes('APROVADOS'))) {
    config = configs.find(c => {
      const cStatus = c.status_crm.trim().toUpperCase()
      return (cStatus === 'APROVADOS' || cStatus === 'APROVADO') && c.ativo !== false
    })
  }

  if (!config) {
    return {
      perguntaForcada: null,
      gatilhoDisparado: false,
      podeAdiar: false,
      sonecaAtiva: false,
      tempoRestanteSonecaMinutos: 0,
      escaladoSupervisao: false,
      escaladoGestao: false,
      bloquearNovoLead: false,
      horasAtraso: 0
    }
  }

  const meta = parsePerguntaForcadaMeta(config.pergunta_forcada || '')

  const startDate = ticket.timestamp_ultima_mudanca_status
    ? new Date(ticket.timestamp_ultima_mudanca_status)
    : new Date(ticket.created_at)

  const now = new Date()
  let horasUteisDecorridas = calculateBusinessHoursElapsed(startDate, now)

  // Checar Faixas de Valor para Escalonamento acelerado
  const margem = ticket.operacao_valor_margem || 0
  const cartao = ticket.operacao_valor_cartao || 0

  const rawF2Margem = config.faixa2_min_margem ?? config.faixa_valor_min_margem
  const rawF2Cartao = config.faixa2_min_cartao ?? config.faixa_valor_min_cartao
  const rawF3Margem = config.faixa3_min_margem ?? meta.faixa3MinMargem
  const rawF3Cartao = config.faixa3_min_cartao ?? meta.faixa3MinCartao

  const isF3Active = (rawF3Margem != null && Number(rawF3Margem) > 0 && margem >= Number(rawF3Margem)) ||
                     (rawF3Cartao != null && Number(rawF3Cartao) > 0 && cartao >= Number(rawF3Cartao))

  const isF2Active = (rawF2Margem != null && Number(rawF2Margem) > 0 && margem >= Number(rawF2Margem)) ||
                     (rawF2Cartao != null && Number(rawF2Cartao) > 0 && cartao >= Number(rawF2Cartao))

  let prazoFinalHoras = config.prazo_horas_uteis || 1
  let alvoEscalonamento: 'supervisao' | 'supervisao_gestao' = 'supervisao'

  // Regra especial para o status 'EM NEGOCIAÇÃO'
  if (statusUpper === 'EM NEGOCIAÇÃO') {
    if (isF3Active) {
      prazoFinalHoras = config.prazo_faixa3_horas ?? 12
      alvoEscalonamento = 'supervisao_gestao'
    } else if (isF2Active) {
      prazoFinalHoras = config.prazo_faixa2_horas ?? 20
      alvoEscalonamento = 'supervisao'
    } else {
      prazoFinalHoras = config.prazo_faixa1_horas ?? config.prazo_horas_uteis ?? 36
      alvoEscalonamento = 'supervisao'
    }
  } else {
    // Demais status: Faixa 3 (Supervisão + Administrativo) e Faixa 2 (Supervisão)
    if (isF3Active) {
      alvoEscalonamento = 'supervisao_gestao'
    } else {
      alvoEscalonamento = 'supervisao'
    }
  }

  // Se prazo for de teste (<= 0.1 hora / 6 min) e tempo de expediente der 0, usar tempo corrido
  if (prazoFinalHoras <= 0.1 && horasUteisDecorridas === 0 && startDate < now) {
    const diffMin = (now.getTime() - startDate.getTime()) / (1000 * 60)
    horasUteisDecorridas = diffMin / 60
  }

  const gatilhoDisparado = horasUteisDecorridas >= prazoFinalHoras
  const horasAtraso = Math.max(0, horasUteisDecorridas - prazoFinalHoras)

  // Verificar Soneca (10 minutos)
  let sonecaAtiva = false
  let tempoRestanteSonecaMinutos = 0

  if (ticket.timestamp_soneca) {
    const sonecaStart = new Date(ticket.timestamp_soneca).getTime()
    const diffMs = now.getTime() - sonecaStart
    const diffMin = diffMs / (1000 * 60)

    if (diffMin < 10) {
      sonecaAtiva = true
      tempoRestanteSonecaMinutos = Math.ceil(10 - diffMin)
    }
  }

  // Permite adiar se:
  // 1. Ainda não usou a soneca nesta pergunta
  // 2. Não estourou nenhuma soneca nos últimos 3h pelo corretor
  const podeAdiar = !ticket.soneca_usada && canBrokerSnooze(brokerSonecaEstourada)

  // Escalonamento e Bloqueio se o tempo estourar e a soneca não estiver ativa
  const estourouSLA = gatilhoDisparado && !sonecaAtiva
  const escaladoSupervisao = estourouSLA && (alvoEscalonamento === 'supervisao' || alvoEscalonamento === 'supervisao_gestao')
  const escaladoGestao = estourouSLA && alvoEscalonamento === 'supervisao_gestao'
  const bloquearNovoLead = estourouSLA

  return {
    perguntaForcada: meta.cleanPergunta || config.pergunta_forcada,
    gatilhoDisparado,
    podeAdiar,
    sonecaAtiva,
    tempoRestanteSonecaMinutos,
    escaladoSupervisao,
    escaladoGestao,
    bloquearNovoLead,
    horasAtraso
  }
}
