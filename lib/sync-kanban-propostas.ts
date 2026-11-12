/**
 * Utilitário de integração entre propostas e o Kanban
 */

export interface ProposalSyncInfo {
  cliente_cpf?: string | null
  id_lead?: string | null
  ade?: string | null
  data_digitacao?: string | null
  status?: string | null
  corretor_id?: string | null
  corretor?: string | null
  nome_corretor?: string | null
  estagiario_colaborador_id?: string | null
  estagiario_colaborador_nome?: string | null
  user_id?: string | null
}

export const DATA_CORTE_REGRA_DIGITACAO = "2026-10-30"

/**
 * Valida se a data de digitação do ADE pertence ao período ativo da regra (a partir de 30/10/2026).
 * Datas de digitação do dia 29/10/2026 para trás são desconsideradas.
 */
export function isDigitacaoAposDataCorte(dataDigitacao?: string | null): boolean {
  if (!dataDigitacao) return false
  const str = String(dataDigitacao).trim()
  if (!str || str === "-") return false

  // Formato ISO: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const ymd = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
    return ymd >= DATA_CORTE_REGRA_DIGITACAO
  }

  // Formato BR: DD/MM/YYYY
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (brMatch) {
    const ymd = `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`
    return ymd >= DATA_CORTE_REGRA_DIGITACAO
  }

  // Fallback com Date
  try {
    const d = new Date(str)
    if (!isNaN(d.getTime())) {
      const corte = new Date(2026, 9, 30, 0, 0, 0)
      return d.getTime() >= corte.getTime()
    }
  } catch {}

  return false
}

export function normalizeOperatorName(name?: string | null): string {
  if (!name) return ""
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

export function areOperatorsEquivalent(
  opId1?: string | null, 
  opNome1?: string | null, 
  opId2?: string | null, 
  opNome2?: string | null
): boolean {
  const id1 = String(opId1 || "").trim().toLowerCase()
  const id2 = String(opId2 || "").trim().toLowerCase()
  if (id1 && id2 && id1 === id2) return true

  const n1 = normalizeOperatorName(opNome1)
  const n2 = normalizeOperatorName(opNome2)
  if (!n1 || !n2) return false
  if (n1 === n2) return true
  if (n1.includes(n2) || n2.includes(n1)) return true

  const parts1 = n1.split(/\s+/).filter(Boolean)
  const parts2 = n2.split(/\s+/).filter(Boolean)
  if (parts1.length > 0 && parts2.length > 0) {
    if (parts1[0] === parts2[0]) {
      if (parts1.length === 1 || parts2.length === 1) return true
      if (parts1[parts1.length - 1] === parts2[parts2.length - 1]) return true
      if (parts1.slice(1).some(p => parts2.slice(1).includes(p))) return true
    }
  }

  return false
}

export function isProposalCancelled(status?: string | null): boolean {
  if (!status) return false
  const s = String(status).toUpperCase().trim()
  return (
    s.includes("CANCEL") ||
    s.includes("REPROV") ||
    s.includes("RECUS") ||
    s.includes("DISTRAT") ||
    s.includes("DEVOLV") ||
    s.includes("ESTORN") ||
    s.includes("DESIST") ||
    s === "PERDIDO"
  )
}

export const hasProposalDigitacao = (proposal: any): boolean => {
  if (!proposal) return false
  const ade = String(proposal.ade || "").trim()
  const dataDigitacao = String(proposal.data_digitacao || "").trim()
  const createdAt = String(proposal.created_at || "").trim()
  const statusUpper = String(proposal.status || "").toUpperCase().trim()

  // Regra idêntica à dos chamados: desconsiderar registros anteriores ao início do Kanban (30/10/2026)
  const dateToCheck = (dataDigitacao && dataDigitacao !== "-") ? dataDigitacao : createdAt
  if (!dateToCheck || !isDigitacaoAposDataCorte(dateToCheck)) {
    return false
  }

  const isPagoOuConcluido = statusUpper.includes("PAGO") || statusUpper.includes("CONCLU") || statusUpper.includes("FINALIZAD")
  const isCancelado = isProposalCancelled(statusUpper)
  const hasAde = Boolean(ade && ade !== "-" && ade !== "null" && ade !== "undefined")

  if (hasAde && (isPagoOuConcluido || isCancelado || ade.length >= 3)) return true
  if (isPagoOuConcluido) return true

  return false
}

import { supabase } from "@/lib/supabase"

export const syncKanbanForClosedProposal = async (info: ProposalSyncInfo): Promise<void> => {
  try {
    const rawCpf = String(info.cliente_cpf || "").trim()
    const cleanCpf = rawCpf.replace(/\D/g, "")
    if (!cleanCpf && !info.id_lead) return

    const ade = String(info.ade || "").trim()
    const dataDigitacao = String(info.data_digitacao || "").trim()
    const createdAt = String((info as any).created_at || "").trim()
    if (!ade || ade === "-") return

    // Regra idêntica à dos chamados: desconsiderar registros anteriores ao início do Kanban (30/10/2026)
    const dateToCheck = (dataDigitacao && dataDigitacao !== "-") ? dataDigitacao : createdAt
    if (!dateToCheck || !isDigitacaoAposDataCorte(dateToCheck)) {
      return
    }

    const statusUpper = String(info.status || "").toUpperCase().trim()
    const isCancelled = isProposalCancelled(statusUpper)

    const conditions: string[] = []
    if (cleanCpf) {
      const padded = cleanCpf.padStart(11, "0")
      const unpadded = cleanCpf.replace(/^0+/, "")
      conditions.push(`cliente_cpf.eq.${cleanCpf}`, `cliente_cpf.eq.${padded}`, `cliente_cpf.eq.${unpadded}`)
    }
    if (info.id_lead) {
      conditions.push(`id.eq.${info.id_lead}`)
    }

    const { data: fichas } = await supabase
      .from("kanban_fichas")
      .select("id, etapa, operador_id, operador_nome, metadata")
      .or(conditions.join(","))

    if (!fichas || fichas.length === 0) return

    const opId = String(info.corretor_id || info.user_id || info.estagiario_colaborador_id || "").trim()
    const opNome = String(info.nome_corretor || info.corretor || info.estagiario_colaborador_nome || "").trim()

    for (const ficha of fichas) {
      const fOpId = String(ficha.operador_id || "").trim()
      const fOpNome = String(ficha.operador_nome || "").trim()
      const meta = typeof ficha.metadata === "object" && ficha.metadata ? { ...ficha.metadata } : {}

      const isSameOp = areOperatorsEquivalent(opId, opNome, fOpId, fOpNome)

      if (isSameOp) {
        if (isCancelled) {
          meta.kanban_stage = "PERDIDO"
          meta.motivo_perda = "Proposta cancelada pelo banco"
          meta.ade = ade
          if (dataDigitacao && dataDigitacao !== "-") meta.data_digitacao = dataDigitacao
          await supabase
            .from("kanban_fichas")
            .update({ 
              etapa: "PERDIDO", 
              motivo_perda: "Proposta cancelada pelo banco",
              metadata: meta 
            })
            .eq("id", ficha.id)
        } else {
          meta.kanban_stage = "FECHADO"
          meta.motivo_perda = null
          meta.ade = ade
          if (dataDigitacao && dataDigitacao !== "-") meta.data_digitacao = dataDigitacao
          await supabase
            .from("kanban_fichas")
            .update({ 
              etapa: "FECHADO", 
              motivo_perda: null,
              metadata: meta 
            })
            .eq("id", ficha.id)
        }
      } else if (ficha.etapa !== "FECHADO" && ficha.etapa !== "PERDIDO") {
        if (!isCancelled) {
          meta.kanban_stage = "PERDIDO"
          meta.motivo_perda = `Cliente já foi fechado pelo operador ${info.corretor || info.nome_corretor || "outro operador"} (ADE: ${ade})`
          await supabase
            .from("kanban_fichas")
            .update({
              etapa: "PERDIDO",
              motivo_perda: `Cliente já foi fechado pelo operador ${info.corretor || info.nome_corretor || "outro operador"} (ADE: ${ade})`,
              metadata: meta
            })
            .eq("id", ficha.id)
        }
      }
    }
  } catch (err) {
    console.warn("Aviso ao sincronizar fechamento no Kanban:", err)
  }
}
