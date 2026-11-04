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

export const syncKanbanForClosedProposal = async (_info: ProposalSyncInfo): Promise<void> => {
  // Operação silenciosa e segura sem chamadas que possam onerar ou gerar erros de rede
  return
}
