import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { getQuestoesTeste } from "@/lib/perfil-profissional-data"
import { checkRateLimit } from "@/lib/rate-limit"
import { fallbackCandidatosStore } from "@/lib/candidatos-store"

export const dynamic = "force-dynamic"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for") || "unknown"
    const clientIp = forwardedFor.split(",")[0].trim()

    // 1. Rate Limiting: máx 40 requisições por minuto por IP para evitar ataques de força bruta
    const rateLimit = checkRateLimit(`assess_read:${clientIp}`, 40, 60 * 1000)
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: "Limite de tentativas excedido. Aguarde 1 minuto e tente novamente." },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")?.trim() || request.headers.get("x-assessment-token")?.trim()

    if (!token || !UUID_REGEX.test(token)) {
      return NextResponse.json(
        { success: false, error: "Token de avaliação inválido ou ausente." },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // 2. Consulta à tabela dedicada perfil_candidatos
    let candidato: any = null
    try {
      const { data, error: dbErr } = await supabaseAdmin
        .from("perfil_candidatos")
        .select("id, nome, email, cargo_pretendido, status, utilizado, data_expiracao")
        .eq("token_acesso", token)
        .maybeSingle()

      if (!dbErr && data) {
        candidato = data
      }
    } catch (err) {
      console.warn("[API Assessment Public GET] Supabase offline/não configurado, usando fallback:", err)
    }

    if (!candidato) {
      candidato = fallbackCandidatosStore.get(token) || null
    }

    if (!candidato) {
      return NextResponse.json(
        { success: false, error: "Convite de avaliação não encontrado ou inválido." },
        { status: 404 }
      )
    }

    // 3. Verificação de Estado Fechado: Já Concluído / Utilizado
    if (candidato.utilizado || candidato.status === "concluido") {
      return NextResponse.json({
        success: false,
        status: "completed",
        error: "Esta avaliação já foi concluída e o link foi finalizado."
      })
    }

    // 4. Verificação de Expiração
    const agora = new Date()
    const expiracao = new Date(candidato.data_expiracao)
    if (agora > expiracao) {
      // Atualiza status para expirado no banco
      await supabaseAdmin
        .from("perfil_candidatos")
        .update({ status: "expirado", updated_at: new Date().toISOString() })
        .eq("id", candidato.id)

      return NextResponse.json({
        success: false,
        status: "expired",
        error: "O prazo de validade deste link de avaliação expirou."
      })
    }

    // 5. Princípio do Menor Privilégio no Payload:
    // Retorna APENAS o número, enunciado e opções (letra e texto).
    // NUNCA envia pesos psicométricos, dimensões, IDs internos ou segredos.
    const listaQuestoes = getQuestoesTeste(candidato.cargo_pretendido)
    const questoesSeguras = listaQuestoes.map(q => ({
      numero: q.numero,
      enunciado: q.enunciado,
      opcoes: q.opcoes.map(o => ({
        letra: o.letra,
        texto: o.texto
      }))
    }))

    return NextResponse.json(
      {
        success: true,
        status: "valid",
        candidato: {
          nome: candidato.nome,
          cargo_pretendido: candidato.cargo_pretendido || ""
        },
        questoes: questoesSeguras
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Pragma": "no-cache"
        }
      }
    )
  } catch (err: any) {
    console.error("[API Assessment Public GET] Erro:", err)
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor." },
      { status: 500 }
    )
  }
}
