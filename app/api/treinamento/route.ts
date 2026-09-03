import { createAdminClient, supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// GET: Buscar respostas e progresso do treinamento do usuário autenticado
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from("treinamento")
      .select("dia, resposta_aberta, decisao_opcao_idx, decisao_opcao_texto, decisao_acertou, concluido")
      .eq("user_id", userId)

    if (error) {
      console.error("[API Treinamento GET] Erro:", error.message || error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error("[API Treinamento GET] Exceção:", err?.message || err)
    return NextResponse.json({ error: err?.message || "Erro interno" }, { status: 500 })
  }
}

// POST: Registrar ou atualizar resposta/decisão no treinamento
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      user_id,
      usuario_nome,
      usuario_email,
      regime_contratacao,
      modulo = 1,
      dia,
      resposta_aberta,
      decisao_opcao_idx,
      decisao_opcao_texto,
      decisao_acertou,
      concluido
    } = body

    if (!user_id || !dia) {
      return NextResponse.json(
        { error: "user_id e dia são obrigatórios" },
        { status: 400 }
      )
    }

    const payload: any = {
      user_id,
      usuario_nome: usuario_nome || "",
      usuario_email: usuario_email || "",
      regime_contratacao: regime_contratacao || "",
      modulo,
      dia,
      updated_at: new Date().toISOString()
    }

    if (resposta_aberta !== undefined) {
      payload.resposta_aberta = resposta_aberta
    }

    if (decisao_opcao_idx !== undefined && decisao_opcao_idx !== null) {
      payload.decisao_opcao_idx = decisao_opcao_idx
      payload.decisao_opcao_texto = decisao_opcao_texto || ""
      payload.decisao_acertou = Boolean(decisao_acertou)
    }

    if (concluido) {
      payload.concluido = true
      payload.data_hora_conclusao = new Date().toISOString()
    }

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from("treinamento")
      .upsert(payload, { onConflict: "user_id,modulo,dia" })
      .select()

    if (error) {
      console.error("[API Treinamento POST] Erro:", error.message || error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API Treinamento POST] Exceção:", err?.message || err)
    return NextResponse.json({ error: err?.message || "Erro interno" }, { status: 500 })
  }
}
