import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { calcularPerfil } from "@/lib/perfil-profissional"
import { getQuestoesTeste } from "@/lib/perfil-profissional-data"
import { checkRateLimit } from "@/lib/rate-limit"
import { fallbackCandidatosStore } from "@/lib/candidatos-store"

export const dynamic = "force-dynamic"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for") || "unknown"
    const clientIp = forwardedFor.split(",")[0].trim()

    // 1. Rate Limiting no Envio: máx 10 tentativas por minuto por IP
    const rateLimit = checkRateLimit(`assess_submit:${clientIp}`, 10, 60 * 1000)
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: "Limite de tentativas excedido. Aguarde alguns instantes." },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }

    const body = await request.json()
    const { token, respostas } = body

    // 2. Proteção Estrita contra IDOR:
    // Nunca aceita ou confia em user_id, candidate_id ou outros identificadores no corpo da requisição.
    // Apenas o token criptográfico define a identidade e o escopo da alteração.
    if (!token || !UUID_REGEX.test(token)) {
      return NextResponse.json(
        { success: false, error: "Token de acesso inválido ou expirado." },
        { status: 400 }
      )
    }

    if (!respostas || typeof respostas !== "object") {
      return NextResponse.json(
        { success: false, error: "Respostas não informadas ou em formato inválido." },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // 3. Busca registro exclusivo atrelado ao token
    let candidato: any = null
    let usingFallback = false

    try {
      const { data, error: fetchErr } = await supabaseAdmin
        .from("perfil_candidatos")
        .select("id, nome, email, cargo_pretendido, status, utilizado, data_expiracao")
        .eq("token_acesso", token)
        .maybeSingle()

      if (!fetchErr && data) {
        candidato = data
      }
    } catch (err) {
      console.warn("[API Assessment Public Submit] Supabase error:", err)
    }

    if (!candidato) {
      const fb = fallbackCandidatosStore.get(token)
      if (fb) {
        candidato = fb
        usingFallback = true
      }
    }

    if (!candidato) {
      return NextResponse.json(
        { success: false, error: "Convite de avaliação não encontrado." },
        { status: 404 }
      )
    }

    // 4. Validação das 36 questões para o cargo do candidato
    const listaQuestoes = getQuestoesTeste(candidato.cargo_pretendido)
    const questoesRespondidas = Object.keys(respostas).filter(k => {
      const num = parseInt(k, 10)
      const val = respostas[k]
      return !isNaN(num) && num >= 1 && num <= listaQuestoes.length && ["A", "B", "C", "D"].includes(val)
    })

    if (questoesRespondidas.length < listaQuestoes.length) {
      return NextResponse.json(
        {
          success: false,
          error: `É obrigatório responder a todas as ${listaQuestoes.length} questões do teste. (${questoesRespondidas.length}/${listaQuestoes.length} respondidas)`
        },
        { status: 400 }
      )
    }

    // 5. Invalidação e Estado Fechado: Token de uso único
    if (candidato.utilizado || candidato.status === "concluido") {
      return NextResponse.json(
        { success: false, error: "Este teste já foi concluído anteriormente e o token foi invalidado." },
        { status: 400 }
      )
    }

    const agora = new Date()
    if (agora > new Date(candidato.data_expiracao)) {
      if (!usingFallback) {
        await supabaseAdmin
          .from("perfil_candidatos")
          .update({ status: "expirado", updated_at: agora.toISOString() })
          .eq("id", candidato.id)
      } else {
        candidato.status = "expirado"
        candidato.updated_at = agora.toISOString()
        fallbackCandidatosStore.set(token, candidato)
      }

      return NextResponse.json(
        { success: false, error: "O prazo deste convite expirou." },
        { status: 400 }
      )
    }

    // 6. Cálculo psicométrico completo no backend
    const perfilCalculado = calcularPerfil(respostas, candidato.nome, listaQuestoes)

    // 7. Atualização atômica marcando como concluído e invalidando o token
    if (!usingFallback) {
      const { error: updateErr } = await supabaseAdmin
        .from("perfil_candidatos")
        .update({
          respostas,
          raw_scores: perfilCalculado.rawScores,
          normalized_scores: perfilCalculado.normalizedScores,
          faixas: perfilCalculado.faixas,
          arquetipo_primario: perfilCalculado.arqPrimario,
          arquetipo_secundario: perfilCalculado.arqSecundario,
          tipo_resultado: perfilCalculado.tipoResultado,
          modo_aprendizagem: perfilCalculado.modoAprendizagem,
          consistencia_pontos: perfilCalculado.consistenciaPontos,
          consistencia_indice: perfilCalculado.consistenciaIndice,
          consistencia_classificacao: perfilCalculado.consistenciaClassificacao,
          status: "concluido",
          utilizado: true,
          data_conclusao: agora.toISOString(),
          updated_at: agora.toISOString()
        })
        .eq("id", candidato.id)
        .eq("token_acesso", token)
        .eq("utilizado", false)

      if (updateErr) {
        console.error("[API Assessment Public Submit] Erro ao gravar:", updateErr)
        return NextResponse.json(
          { success: false, error: "Erro ao gravar respostas no banco de dados." },
          { status: 500 }
        )
      }
    }

    // Também atualiza o fallbackStore se aplicável
    const updatedCandidate = {
      ...candidato,
      respostas,
      raw_scores: perfilCalculado.rawScores,
      normalized_scores: perfilCalculado.normalizedScores,
      faixas: perfilCalculado.faixas,
      arquetipo_primario: perfilCalculado.arqPrimario,
      arquetipo_secundario: perfilCalculado.arqSecundario,
      tipo_resultado: perfilCalculado.tipoResultado,
      modo_aprendizagem: perfilCalculado.modoAprendizagem,
      consistencia_pontos: perfilCalculado.consistenciaPontos,
      consistencia_indice: perfilCalculado.consistenciaIndice,
      consistencia_classificacao: perfilCalculado.consistenciaClassificacao,
      status: "concluido",
      utilizado: true,
      data_conclusao: agora.toISOString(),
      updated_at: agora.toISOString()
    }
    fallbackCandidatosStore.set(token, updatedCandidate)

    return NextResponse.json({
      success: true,
      message: "Avaliação finalizada com sucesso! Suas respostas foram computadas e o convite foi encerrado com segurança."
    })
  } catch (err: any) {
    console.error("[API Assessment Public Submit] Erro:", err)
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor ao processar envio." },
      { status: 500 }
    )
  }
}
