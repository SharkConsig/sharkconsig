import type { SupabaseClient } from "@supabase/supabase-js"

const normalizeRoleName = (val: string) =>
  String(val || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()

export interface ReplicateCampaignOptions {
  funcoesAlvo?: string[]
  excludeUserId?: string
}

export async function replicateCampaignPhotoToUsers(
  supabaseAdmin: SupabaseClient,
  fotoCampanhaUrl: string,
  options: ReplicateCampaignOptions = {}
): Promise<number> {
  if (!fotoCampanhaUrl || fotoCampanhaUrl.startsWith("data:image")) {
    return 0
  }

  const { funcoesAlvo, excludeUserId } = options
  const allowedRolesSet =
    Array.isArray(funcoesAlvo) && funcoesAlvo.length > 0
      ? new Set(funcoesAlvo.map(normalizeRoleName).filter(Boolean))
      : null

  const { data: perfisRows, error: fetchError } = await supabaseAdmin
    .from("perfis")
    .select("id, funcao, role, status")

  if (fetchError || !perfisRows) {
    console.warn("[replicateCampaignPhoto] Erro ao listar perfis:", fetchError?.message)
    return 0
  }

  const targetIds = perfisRows
    .filter((p: any) => {
      if (!p?.id) return false
      if (excludeUserId && p.id === excludeUserId) return false
      if ((p.status || "ATIVO").toUpperCase() === "INATIVO") return false
      if (allowedRolesSet) {
        const userRole = normalizeRoleName(p.funcao || p.role || "")
        return allowedRolesSet.has(userRole)
      }
      return true
    })
    .map((p: any) => String(p.id))

  if (targetIds.length === 0) {
    return 0
  }

  // 1 única query em lote na tabela public.perfis (baixo consumo no Supabase)
  const { error: updateError } = await supabaseAdmin
    .from("perfis")
    .update({ foto_campanha_url: fotoCampanhaUrl })
    .in("id", targetIds)

  if (updateError) {
    console.error("[replicateCampaignPhoto] Erro ao atualizar perfis em lote:", updateError.message)
    throw updateError
  }

  // Sincroniza user_metadata no Auth em pequenos lotes de 5 para manter fallback consistente sem sobrecarga
  const chunkSize = 5
  for (let i = 0; i < targetIds.length; i += chunkSize) {
    const chunk = targetIds.slice(i, i + chunkSize)
    await Promise.allSettled(
      chunk.map((uid) =>
        supabaseAdmin.auth.admin.updateUserById(uid, {
          user_metadata: { foto_campanha_url: fotoCampanhaUrl },
        })
      )
    )
  }

  return targetIds.length
}
