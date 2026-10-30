import { supabase } from "@/lib/supabase"

export interface ProximaAcaoConfig {
  id: string
  titulo: string
  descricao?: string
  etapa_kanban: string
  sla_minutos: number
  apenas_dias_uteis: boolean
  ativo: boolean
  ordem?: number
  created_at?: string
  updated_at?: string
}

export const ETAPAS_KANBAN_OPCOES = [
  "TODAS",
  "EM ABORDAGEM",
  "EM RETOMADA",
  "EM NEGOCIAÇÃO",
  "EM REATIVAÇÃO",
  "AÇÃO ESPECIAL",
  "SEM INTERESSE",
  "FECHADO",
  "PERDIDO"
]

export const DEFAULT_PROXIMAS_ACOES: ProximaAcaoConfig[] = [
  {
    id: "padrao-1",
    titulo: "Realizar Primeiro Contato Imediato",
    descricao: "Abordagem inicial de novos leads recebidos",
    etapa_kanban: "EM ABORDAGEM",
    sla_minutos: 60,
    apenas_dias_uteis: true,
    ativo: true,
    ordem: 1
  },
  {
    id: "padrao-2",
    titulo: "Enviar Régua de Retomada 1",
    descricao: "Primeiro contato da cadência de retomada via WhatsApp",
    etapa_kanban: "EM RETOMADA",
    sla_minutos: 120,
    apenas_dias_uteis: true,
    ativo: true,
    ordem: 2
  },
  {
    id: "padrao-3",
    titulo: "Enviar Régua de Retomada 2",
    descricao: "Segundo contato de acompanhamento da oportunidade",
    etapa_kanban: "EM RETOMADA",
    sla_minutos: 1440,
    apenas_dias_uteis: true,
    ativo: true,
    ordem: 3
  },
  {
    id: "padrao-4",
    titulo: "Enviar Régua de Retomada 3",
    descricao: "Terceiro contato de acompanhamento da oportunidade",
    etapa_kanban: "EM RETOMADA",
    sla_minutos: 2880,
    apenas_dias_uteis: true,
    ativo: true,
    ordem: 4
  },
  {
    id: "padrao-5",
    titulo: "Enviar Simulação e Esclarecer Dúvidas",
    descricao: "Envio de propostas detalhadas e cálculos de margem",
    etapa_kanban: "EM NEGOCIAÇÃO",
    sla_minutos: 120,
    apenas_dias_uteis: true,
    ativo: true,
    ordem: 5
  },
  {
    id: "padrao-6",
    titulo: "Recolher Documentação / Formalização",
    descricao: "Solicitar RG, comprovante de residência e extrato",
    etapa_kanban: "EM NEGOCIAÇÃO",
    sla_minutos: 240,
    apenas_dias_uteis: true,
    ativo: true,
    ordem: 6
  },
  {
    id: "padrao-7",
    titulo: "Resgatar Oportunidade Esfriada",
    descricao: "Reativação de clientes com contato após 48h úteis",
    etapa_kanban: "EM REATIVAÇÃO",
    sla_minutos: 2880,
    apenas_dias_uteis: true,
    ativo: true,
    ordem: 7
  },
  {
    id: "padrao-8",
    titulo: "Intervenção Especial de Atendimento",
    descricao: "Ação prioritária solicitada a outro colaborador ou supervisor",
    etapa_kanban: "AÇÃO ESPECIAL",
    sla_minutos: 60,
    apenas_dias_uteis: true,
    ativo: true,
    ordem: 8
  },
  {
    id: "padrao-9",
    titulo: "Cadência de Longo Prazo / Nutrição",
    descricao: "Acompanhamento periódico de clientes sem interesse imediato",
    etapa_kanban: "SEM INTERESSE",
    sla_minutos: 10080,
    apenas_dias_uteis: true,
    ativo: true,
    ordem: 9
  }
]

const LOCAL_STORAGE_KEY = "sharkconsig_proximas_acoes_kanban"

export function getLocalProximasAcoes(): ProximaAcaoConfig[] {
  if (typeof window === "undefined") return DEFAULT_PROXIMAS_ACOES
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fallback
  }
  return DEFAULT_PROXIMAS_ACOES
}

export function saveLocalProximasAcoes(list: ProximaAcaoConfig[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

export async function fetchProximasAcoes(): Promise<ProximaAcaoConfig[]> {
  try {
    const { data, error } = await supabase
      .from("kanban_proximas_acoes")
      .select("*")
      .order("ordem", { ascending: true })

    if (error || !data || data.length === 0) {
      return getLocalProximasAcoes()
    }

    saveLocalProximasAcoes(data)
    return data
  } catch {
    return getLocalProximasAcoes()
  }
}

export async function createProximaAcao(
  item: Omit<ProximaAcaoConfig, "id" | "created_at" | "updated_at">
): Promise<ProximaAcaoConfig> {
  const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `acao_${Date.now()}`
  const now = new Date().toISOString()
  const payload: ProximaAcaoConfig = {
    ...item,
    id: newId,
    created_at: now,
    updated_at: now
  }

  try {
    const { data, error } = await supabase
      .from("kanban_proximas_acoes")
      .insert({
        titulo: item.titulo,
        descricao: item.descricao || "",
        etapa_kanban: item.etapa_kanban,
        sla_minutos: Number(item.sla_minutos) || 60,
        apenas_dias_uteis: Boolean(item.apenas_dias_uteis),
        ativo: item.ativo !== false,
        ordem: Number(item.ordem) || 0
      })
      .select()
      .maybeSingle()

    if (!error && data) {
      const current = getLocalProximasAcoes().filter(x => x.id !== data.id)
      saveLocalProximasAcoes([...current, data])
      return data
    }
  } catch {
    // ignore
  }

  // Fallback local
  const current = getLocalProximasAcoes()
  const updated = [...current, payload]
  saveLocalProximasAcoes(updated)
  return payload
}

export async function updateProximaAcao(
  id: string,
  updates: Partial<ProximaAcaoConfig>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("kanban_proximas_acoes")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)

    if (!error) {
      const current = getLocalProximasAcoes().map(item => item.id === id ? { ...item, ...updates } : item)
      saveLocalProximasAcoes(current)
      return true
    }
  } catch {
    // ignore
  }

  // Fallback local
  const current = getLocalProximasAcoes().map(item => item.id === id ? { ...item, ...updates } : item)
  saveLocalProximasAcoes(current)
  return true
}

export async function deleteProximaAcao(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("kanban_proximas_acoes")
      .delete()
      .eq("id", id)

    if (!error) {
      const current = getLocalProximasAcoes().filter(item => item.id !== id)
      saveLocalProximasAcoes(current)
      return true
    }
  } catch {
    // ignore
  }

  // Fallback local
  const current = getLocalProximasAcoes().filter(item => item.id !== id)
  saveLocalProximasAcoes(current)
  return true
}

export function formatSlaPrazoAmigavel(minutos: number): string {
  if (!minutos || minutos <= 0) return "Imediato"
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const remMinutos = minutos % 60
  if (horas < 24) {
    return remMinutos > 0 ? `${horas}h ${remMinutos}m` : `${horas} ${horas === 1 ? 'hora' : 'horas'}`
  }
  const dias = Math.floor(horas / 24)
  const remHoras = horas % 24
  if (remHoras === 0) {
    return `${dias} ${dias === 1 ? 'dia' : 'dias'}`
  }
  return `${dias}d ${remHoras}h`
}

/**
 * Calcula a data/hora limite (vencimento) com base nos minutos de SLA
 * e regra de dias úteis (seg-sex, 08h às 18h).
 */
export function calcularVencimentoComSla(slaMinutos: number, apenasDiasUteis: boolean = true): Date {
  const data = new Date()
  if (!apenasDiasUteis || slaMinutos <= 0) {
    return new Date(data.getTime() + (slaMinutos || 60) * 60 * 1000)
  }

  let minutosRestantes = slaMinutos
  let cursor = new Date(data)

  // Expediente comercial: 08:00 às 18:00 (10 horas / 600 minutos por dia útil)
  const HORA_INICIO = 8
  const HORA_FIM = 18

  while (minutosRestantes > 0) {
    // Se for fim de semana, avança para segunda-feira 08:00
    const diaSemana = cursor.getDay() // 0 = Domingo, 6 = Sábado
    if (diaSemana === 0) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(HORA_INICIO, 0, 0, 0)
      continue
    }
    if (diaSemana === 6) {
      cursor.setDate(cursor.getDate() + 2)
      cursor.setHours(HORA_INICIO, 0, 0, 0)
      continue
    }

    // Se estiver antes das 08h, ajusta para 08h do mesmo dia
    if (cursor.getHours() < HORA_INICIO) {
      cursor.setHours(HORA_INICIO, 0, 0, 0)
    }

    // Se estiver após as 18h, avança para o próximo dia às 08h
    if (cursor.getHours() >= HORA_FIM) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(HORA_INICIO, 0, 0, 0)
      continue
    }

    // Minutos disponíveis no dia útil atual até as 18:00
    const fimDoDia = new Date(cursor)
    fimDoDia.setHours(HORA_FIM, 0, 0, 0)
    const minutosAteFimDoDia = Math.floor((fimDoDia.getTime() - cursor.getTime()) / (60 * 1000))

    if (minutosRestantes <= minutosAteFimDoDia) {
      cursor = new Date(cursor.getTime() + minutosRestantes * 60 * 1000)
      minutosRestantes = 0
    } else {
      minutosRestantes -= minutosAteFimDoDia
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(HORA_INICIO, 0, 0, 0)
    }
  }

  return cursor
}
