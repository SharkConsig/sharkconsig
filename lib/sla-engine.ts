import { supabase } from '@/lib/supabase'

export interface SLAConfig {
  id: string
  status_crm: string
  prazo_horas_uteis: number
  pergunta_forcada: string
  faixa_valor_min_margem: number
  faixa_valor_min_cartao: number
  prazo_escalonamento_horas: number
  alvo_escalonamento: 'supervisao' | 'administrador' | 'supervisao_administrador' | 'supervisao_gestao'
  ativo: boolean
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
  const statusUpper = (ticket.status || "").trim().toUpperCase()
  const config = configs.find(c => c.status_crm.trim().toUpperCase() === statusUpper && c.ativo !== false)

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

  const startDate = ticket.timestamp_ultima_mudanca_status
    ? new Date(ticket.timestamp_ultima_mudanca_status)
    : new Date(ticket.created_at)

  const now = new Date()
  const horasUteisDecorridas = calculateBusinessHoursElapsed(startDate, now)

  // Checar Faixas de Valor para Escalonamento acelerado
  const margem = ticket.operacao_valor_margem || 0
  const cartao = ticket.operacao_valor_cartao || 0

  let prazoFinalHoras = config.prazo_horas_uteis
  let alvoEscalonamento: 'supervisao' | 'supervisao_gestao' = config.alvo_escalonamento || 'supervisao'

  // Faixa 3: R$ 50k margem principal / R$ 10k cartão -> Escala para Supervisão + Gestão (Administrador)
  if (margem >= 50000 || cartao >= 10000) {
    if (config.prazo_escalonamento_horas > 0) {
      prazoFinalHoras = Math.min(prazoFinalHoras, config.prazo_escalonamento_horas)
    }
    alvoEscalonamento = 'supervisao_gestao'
  } 
  // Faixa 2: R$ 30k margem / R$ 5k cartão -> Escala para Supervisão
  else if (margem >= 30000 || cartao >= 5000) {
    if (config.prazo_escalonamento_horas > 0) {
      prazoFinalHoras = Math.min(prazoFinalHoras, config.prazo_escalonamento_horas)
    }
    alvoEscalonamento = 'supervisao'
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
    perguntaForcada: config.pergunta_forcada,
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
