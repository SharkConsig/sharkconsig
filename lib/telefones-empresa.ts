import { SupabaseClient } from "@supabase/supabase-js"

export interface TelefoneEmpresa {
  id: string
  numero: string
  descricao?: string | null
  ativo: boolean
  created_at?: string
  updated_at?: string
}

export const STORAGE_KEY_TELEFONES = "sharkconsig_telefones_empresa"
export const EVENT_TELEFONES_UPDATED = "sharkconsig_telefones_updated"
export const TABLE_TELEFONES_EMPRESA = "telefones_empresa"

export const DEFAULT_TELEFONES_EMPRESA: TelefoneEmpresa[] = [
  { id: "1", numero: "(48) 99999-9901", descricao: "WhatsApp Comercial 01", ativo: true },
  { id: "2", numero: "(48) 99999-9902", descricao: "WhatsApp Comercial 02", ativo: true },
  { id: "3", numero: "(48) 99999-9903", descricao: "WhatsApp Suporte", ativo: true },
  { id: "4", numero: "(48) 99999-9904", descricao: "Atendimento Geral", ativo: true },
]

export function getLocalTelefonesEmpresa(): TelefoneEmpresa[] {
  if (typeof window === "undefined") return DEFAULT_TELEFONES_EMPRESA
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TELEFONES)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.error("Erro ao ler telefones da empresa do cache local:", e)
  }
  return DEFAULT_TELEFONES_EMPRESA
}

export function saveLocalTelefonesEmpresa(telefones: TelefoneEmpresa[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY_TELEFONES, JSON.stringify(telefones))
    window.dispatchEvent(new CustomEvent(EVENT_TELEFONES_UPDATED, { detail: telefones }))
  } catch (e) {
    console.error("Erro ao salvar telefones da empresa no cache local:", e)
  }
}

export async function fetchTelefonesEmpresa(
  supabase: SupabaseClient
): Promise<TelefoneEmpresa[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_TELEFONES_EMPRESA)
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && Array.isArray(data)) {
      saveLocalTelefonesEmpresa(data)
      return data
    }

    if (error) {
      console.warn("Aviso ao consultar tabela telefones_empresa:", error.message)
    }
  } catch (e) {
    console.error("Erro ao carregar telefones da empresa do Supabase:", e)
  }
  return getLocalTelefonesEmpresa()
}

export async function createTelefoneEmpresa(
  supabase: SupabaseClient,
  tel: { numero: string; descricao?: string; ativo: boolean }
): Promise<TelefoneEmpresa> {
  const payload = {
    numero: tel.numero.trim(),
    descricao: tel.descricao?.trim() || null,
    ativo: tel.ativo,
  }

  const { data, error } = await supabase
    .from(TABLE_TELEFONES_EMPRESA)
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error("Erro ao inserir telefone na tabela telefones_empresa:", error)
    // Fallback local se a tabela ainda estiver sendo criada
    const fallbackItem: TelefoneEmpresa = {
      id: Date.now().toString(),
      numero: payload.numero,
      descricao: payload.descricao,
      ativo: payload.ativo,
      created_at: new Date().toISOString(),
    }
    const current = getLocalTelefonesEmpresa()
    const updated = [fallbackItem, ...current]
    saveLocalTelefonesEmpresa(updated)
    return fallbackItem
  }

  const current = getLocalTelefonesEmpresa().filter(t => t.id !== data.id)
  const updated = [data, ...current]
  saveLocalTelefonesEmpresa(updated)
  return data
}

export async function updateTelefoneEmpresa(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<TelefoneEmpresa, "numero" | "descricao" | "ativo">>
): Promise<void> {
  const payload: Record<string, any> = {
    ...updates,
    updated_at: new Date().toISOString(),
  }
  if (payload.numero) payload.numero = payload.numero.trim()
  if (payload.descricao !== undefined) {
    payload.descricao = payload.descricao ? payload.descricao.trim() : null
  }

  const { error } = await supabase
    .from(TABLE_TELEFONES_EMPRESA)
    .update(payload)
    .eq("id", id)

  if (error) {
    console.error("Erro ao atualizar telefone na tabela telefones_empresa:", error)
  }

  const current = getLocalTelefonesEmpresa()
  const updated = current.map(item => (item.id === id ? { ...item, ...payload } : item))
  saveLocalTelefonesEmpresa(updated)
}

export async function deleteTelefoneEmpresa(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_TELEFONES_EMPRESA)
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Erro ao excluir telefone da tabela telefones_empresa:", error)
  }

  const current = getLocalTelefonesEmpresa()
  const updated = current.filter(item => item.id !== id)
  saveLocalTelefonesEmpresa(updated)
}

export async function persistTelefonesEmpresa(
  supabase: SupabaseClient,
  telefones: TelefoneEmpresa[]
): Promise<void> {
  saveLocalTelefonesEmpresa(telefones)
}
