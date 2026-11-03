import { supabase } from "@/lib/supabase"

export interface SyncProposalData {
  cliente_cpf?: string | null
  id_lead?: string | number | null
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

export function hasProposalDigitacao(prop?: SyncProposalData | null): boolean {
  if (!prop) return false
  const ade = prop.ade ? String(prop.ade).trim() : ""
  const dataDigitacao = prop.data_digitacao ? String(prop.data_digitacao).trim() : ""
  const pStatus = (prop.status || "").toUpperCase().trim()
  const isCancelled = pStatus === "CANCELADO" || pStatus === "CANCELADOS" || pStatus.includes("CANCELAD")
  return Boolean(ade && dataDigitacao && !isCancelled)
}

/**
 * Sincroniza os cartões do Kanban vinculados ao cliente de uma proposta digitada no banco:
 * 1. Move automaticamente o cartão do operador responsável para a coluna 'FECHADO'.
 * 2. Se o mesmo cliente estiver em atendimento por outro operador, move o cartão desse outro
 *    operador para 'PERDIDO' e adiciona notificação em 'Últimas observações'.
 */
export async function syncKanbanForClosedProposal(proposal: SyncProposalData) {
  try {
    if (!hasProposalDigitacao(proposal)) return

    const ade = String(proposal.ade).trim()
    const cleanCpf = (proposal.cliente_cpf || "").replace(/\D/g, "")
    const idLead = proposal.id_lead ? String(proposal.id_lead).trim() : ""

    if (!cleanCpf && !idLead) return

    // Tenta primeiro chamar a API com credenciais administrativas
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/kanban/sync-closed-proposal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(proposal)
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success) return
        }
      } catch (apiErr) {
        // Fallback para execução direta com Supabase
      }
    }

    // Monta termos de busca para localizar todas as fichas associadas a este cliente
    const lookupTerms = [
      cleanCpf ? `cliente_cpf.eq.${cleanCpf}` : "",
      cleanCpf ? `cliente_cpf.eq.${cleanCpf.padStart(11, "0")}` : "",
      idLead ? `id.eq.${idLead}` : ""
    ].filter(Boolean).join(",")

    const { data: fichas, error } = await supabase
      .from("kanban_fichas")
      .select("id, cliente_cpf, operador_id, operador_nome, etapa, motivo_perda, observacoes, metadata, historico_movimentacoes")
      .or(lookupTerms)

    if (error || !fichas || fichas.length === 0) return

    const closingName = proposal.nome_corretor || proposal.corretor || proposal.estagiario_colaborador_nome || "outro operador"
    const closingIds = [
      proposal.corretor_id,
      proposal.estagiario_colaborador_id,
      proposal.user_id
    ].map(id => String(id || "").trim().toLowerCase()).filter(Boolean)
    const closingNames = [
      proposal.nome_corretor,
      proposal.corretor,
      proposal.estagiario_colaborador_nome
    ].map(n => String(n || "").trim().toLowerCase()).filter(Boolean)

    for (const f of fichas) {
      const meta = (f.metadata && typeof f.metadata === "object") ? { ...f.metadata } : {}
      const fUserId = String(f.operador_id || meta.operador_id || meta.user_id || "").trim().toLowerCase()
      const fUserName = String(f.operador_nome || meta.operador_nome || meta.user_nome || "").trim().toLowerCase()

      const isSameOperator = (fUserId && closingIds.includes(fUserId)) ||
        (fUserName && closingNames.some(cn => cn === fUserName || cn.includes(fUserName) || fUserName.includes(cn))) ||
        (idLead && String(f.id).trim() === idLead)

      if (isSameOperator) {
        // 1. Move automaticamente para a coluna 'FECHADO'
        if (f.etapa !== "FECHADO") {
          meta.kanban_stage = "FECHADO"
          const historico = Array.isArray(f.historico_movimentacoes) ? [...f.historico_movimentacoes] : []
          historico.push({
            data: new Date().toISOString(),
            autor: closingName,
            motivo: `Proposta digitada no banco com ADE ${ade}`,
            etapa_anterior: f.etapa || "EM RETOMADA",
            etapa_nova: "FECHADO"
          })

          await supabase
            .from("kanban_fichas")
            .update({
              etapa: "FECHADO",
              motivo_perda: null,
              metadata: meta,
              historico_movimentacoes: historico,
              updated_at: new Date().toISOString()
            })
            .eq("id", f.id)
        }
      } else {
        // 2. Para outro usuário com este mesmo cliente em comum: move para 'PERDIDO' e notifica nas observações
        if (f.etapa !== "PERDIDO") {
          meta.kanban_stage = "PERDIDO"
          const noteText = `Cliente já foi fechado pelo operador ${closingName} (ADE: ${ade}). Atendimento encerrado automaticamente.`

          const obsHistorico = Array.isArray(meta.observacoes_historico) ? [...meta.observacoes_historico] : []
          // Evita duplicar a mesma observação se já foi adicionada
          const alreadyNotified = obsHistorico.some((o: any) => String(o?.texto || "").includes(`ADE: ${ade}`))
          if (!alreadyNotified) {
            obsHistorico.push({
              texto: noteText,
              data: new Date().toISOString(),
              autor: "Sistema"
            })
          }
          meta.observacoes_historico = obsHistorico

          const existingObs = f.observacoes ? String(f.observacoes).trim() : ""
          const newObs = existingObs.includes(`ADE: ${ade}`)
            ? existingObs
            : (existingObs ? `${existingObs}\n\n${noteText}` : noteText)

          const historico = Array.isArray(f.historico_movimentacoes) ? [...f.historico_movimentacoes] : []
          historico.push({
            data: new Date().toISOString(),
            autor: "Sistema",
            motivo: `Cliente já foi fechado por outro usuário (${closingName} - ADE: ${ade})`,
            etapa_anterior: f.etapa || "EM RETOMADA",
            etapa_nova: "PERDIDO"
          })

          await supabase
            .from("kanban_fichas")
            .update({
              etapa: "PERDIDO",
              motivo_perda: "Cliente já foi fechado por outro usuário",
              observacoes: newObs,
              metadata: meta,
              historico_movimentacoes: historico,
              updated_at: new Date().toISOString()
            })
            .eq("id", f.id)
        }
      }
    }
  } catch (err) {
    console.warn("Aviso ao sincronizar ficha com proposta fechada:", err)
  }
}
