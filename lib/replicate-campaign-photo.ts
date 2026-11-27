import type { SupabaseClient } from "@supabase/supabase-js"

const normalizeText = (val: string) =>
  String(val || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()

const matchRegime = (userRegimeNorm: string, allowedRegimes: Set<string>) => {
  if (!userRegimeNorm) return false
  for (const target of allowedRegimes) {
    if (target === "clt" && userRegimeNorm.includes("clt")) return true
    if (target === "estagio" && userRegimeNorm.includes("estagio")) return true
    if (target === "pj" && userRegimeNorm.includes("pj")) return true
    if (userRegimeNorm === target) return true
  }
  return false
}

export interface ReplicateCampaignOptions {
  funcoesAlvo?: string[]
  regimesAlvo?: string[]
  incluirDesenvolvedorPj?: boolean
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

  const { funcoesAlvo, regimesAlvo, incluirDesenvolvedorPj = false, excludeUserId } = options
  const allowedRolesSet =
    Array.isArray(funcoesAlvo) && funcoesAlvo.length > 0
      ? new Set(funcoesAlvo.map(normalizeText).filter(Boolean))
      : null
  const allowedRegimesSet =
    Array.isArray(regimesAlvo) && regimesAlvo.length > 0
      ? new Set(regimesAlvo.map(normalizeText).filter(Boolean))
      : null

  const { data: perfisRows, error: fetchError } = await supabaseAdmin
    .from("perfis")
    .select("id, funcao, role, regime_contratacao, status")

  if (fetchError || !perfisRows) {
    console.warn("[replicateCampaignPhoto] Erro ao listar perfis:", fetchError?.message)
    return 0
  }

  const targetIds = perfisRows
    .filter((p: any) => {
      if (!p?.id) return false
      if (excludeUserId && p.id === excludeUserId) return false
      if ((p.status || "ATIVO").toUpperCase() === "INATIVO") return false

      const userRole = normalizeText(p.funcao || p.role || "")
      const userRegime = normalizeText(p.regime_contratacao || "")
      const isDevPjException =
        incluirDesenvolvedorPj && userRole === "desenvolvedor" && userRegime.includes("pj")

      const roleOk = !allowedRolesSet || allowedRolesSet.has(userRole) || isDevPjException
      const regimeOk =
        !allowedRegimesSet || matchRegime(userRegime, allowedRegimesSet) || isDevPjException

      return roleOk && regimeOk
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
