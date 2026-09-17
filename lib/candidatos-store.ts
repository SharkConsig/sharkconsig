// Armazenamento em memória seguro e sincronizado como fallback caso a tabela perfil_candidatos
// ainda não tenha sido criada no Supabase pelo administrador.

export interface CandidatoPerfilRecord {
  id: string
  nome: string
  email: string
  telefone?: string
  endereco?: string
  cargo_pretendido?: string
  token_acesso: string
  status: "pendente" | "concluido" | "expirado"
  utilizado: boolean
  data_expiracao: string
  data_conclusao?: string
  versao_instrumento?: string
  respostas: Record<string, string>
  raw_scores?: any
  normalized_scores?: any
  faixas?: any
  arquetipo_primario?: string
  arquetipo_secundario?: string
  tipo_resultado?: string
  modo_aprendizagem?: string
  consistencia_pontos?: number
  consistencia_indice?: number
  consistencia_classificacao?: string
  criado_por_id?: string
  criado_por_nome?: string
  created_at: string
  updated_at: string
}

// Global store attached to globalThis to survive HMR/re-executions in Node.js
declare global {
  var __sharkconsig_candidatos_store: Map<string, CandidatoPerfilRecord> | undefined
}

if (!globalThis.__sharkconsig_candidatos_store) {
  globalThis.__sharkconsig_candidatos_store = new Map<string, CandidatoPerfilRecord>()
}

export const fallbackCandidatosStore = globalThis.__sharkconsig_candidatos_store
