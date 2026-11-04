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

export const hasProposalDigitacao = (proposal: any): boolean => {
  if (!proposal) return false
  const ade = String(proposal.ade || "").trim()
  const dataDigitacao = String(proposal.data_digitacao || "").trim()
  return Boolean(ade && ade !== "-" && dataDigitacao && dataDigitacao !== "-")
}

import { supabase } from "@/lib/supabase"

export const syncKanbanForClosedProposal = async (info: ProposalSyncInfo): Promise<void> => {
  try {
    const rawCpf = String(info.cliente_cpf || "").trim()
    const cleanCpf = rawCpf.replace(/\D/g, "")
    if (!cleanCpf && !info.id_lead) return

    const ade = String(info.ade || "").trim()
    const dataDigitacao = String(info.data_digitacao || "").trim()
    if (!ade || ade === "-" || !dataDigitacao || dataDigitacao === "-") return

    const conditions: string[] = []
    if (cleanCpf) {
      const padded = cleanCpf.padStart(11, "0")
      conditions.push(`cliente_cpf.eq.${cleanCpf}`, `cliente_cpf.eq.${padded}`)
    }

    const { data: fichas } = await supabase
      .from("kanban_fichas")
      .select("id, etapa, operador_id, operador_nome, metadata")
      .or(conditions.join(","))

    if (!fichas || fichas.length === 0) return

    const opId = String(info.corretor_id || info.user_id || info.estagiario_colaborador_id || "").trim().toLowerCase()
    const opNome = String(info.nome_corretor || info.corretor || info.estagiario_colaborador_nome || "").trim().toLowerCase()

    for (const ficha of fichas) {
      const fOpId = String(ficha.operador_id || "").trim().toLowerCase()
      const fOpNome = String(ficha.operador_nome || "").trim().toLowerCase()
      const meta = typeof ficha.metadata === "object" && ficha.metadata ? { ...ficha.metadata } : {}

      const isSameOp = (opId && fOpId && opId === fOpId) ||
        (opNome && fOpNome && (opNome === fOpNome || opNome.includes(fOpNome) || fOpNome.includes(opNome)))

      if (isSameOp) {
        meta.kanban_stage = "FECHADO"
        meta.ade = ade
        meta.data_digitacao = dataDigitacao
        await supabase
          .from("kanban_fichas")
          .update({ etapa: "FECHADO", metadata: meta })
          .eq("id", ficha.id)
      } else if (ficha.etapa !== "FECHADO" && ficha.etapa !== "PERDIDO") {
        meta.kanban_stage = "PERDIDO"
        meta.motivo_perda = "Cliente já foi fechado por outro usuário"
        await supabase
          .from("kanban_fichas")
          .update({
            etapa: "PERDIDO",
            motivo_perda: `Cliente já foi fechado pelo operador ${info.corretor || "outro operador"} (ADE: ${ade})`,
            metadata: meta
          })
          .eq("id", ficha.id)
      }
    }
  } catch (err) {
    console.warn("Aviso ao sincronizar fechamento no Kanban:", err)
  }
}
