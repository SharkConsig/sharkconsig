import { createAdminClient, supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const CONFIG_KEY = "TREINAMENTO_LIBERACOES_CONFIG"

async function getLiberacoesProgramadas(supabaseAdmin: any): Promise<any[]> {
  try {
    const { data } = await supabaseAdmin
      .from("dashboard_banners")
      .select("image_url")
      .eq("title", CONFIG_KEY)
      .maybeSingle()
    if (data?.image_url) {
      return JSON.parse(data.image_url)
    }
  } catch (e) {
    console.error("Erro ao ler liberações programadas:", e)
  }
  return []
}

async function saveLiberacoesProgramadas(supabaseAdmin: any, lista: any[]) {
  const jsonStr = JSON.stringify(lista)
  const { data: existing } = await supabaseAdmin
    .from("dashboard_banners")
    .select("id")
    .eq("title", CONFIG_KEY)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin
      .from("dashboard_banners")
      .update({ image_url: jsonStr, link: "TREINAMENTO", active: true })
      .eq("id", existing.id)
  } else {
    await supabaseAdmin
      .from("dashboard_banners")
      .insert({ title: CONFIG_KEY, image_url: jsonStr, link: "TREINAMENTO", active: true })
  }
}

// GET: Buscar respostas e progresso do treinamento ou dados do Painel de Controle
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const userId = searchParams.get("userId")
    const supabaseAdmin = createAdminClient()

    if (action === "painel") {
      const [{ data: rows, error: rowsError }, liberacoes, usersResult] = await Promise.all([
        supabaseAdmin.from("treinamento").select("*"),
        getLiberacoesProgramadas(supabaseAdmin),
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      ])

      if (rowsError) {
        console.error("[API Treinamento Painel GET] Erro ao listar linhas:", rowsError.message || rowsError)
        return NextResponse.json({ error: rowsError.message }, { status: 500 })
      }

      const allUsers = (usersResult?.data?.users || []).map(u => {
        const meta = u.user_metadata || {}
        return {
          id: u.id,
          email: u.email,
          nome: meta.nome_completo || meta.full_name || u.email || "Sem Nome",
          funcao: meta.funcao || "Corretor",
          regime_contratacao: meta.regime_contratacao || ""
        }
      })

      return NextResponse.json({
        rows: rows || [],
        usuarios: allUsers,
        liberacoes: liberacoes || []
      })
    }

    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 })
    }

    const [{ data, error }, liberacoes] = await Promise.all([
      supabaseAdmin
        .from("treinamento")
        .select("dia, resposta_aberta, decisao_opcao_idx, decisao_opcao_texto, decisao_acertou, concluido, data_hora_conclusao, updated_at, created_at")
        .eq("user_id", userId),
      getLiberacoesProgramadas(supabaseAdmin)
    ])

    if (error) {
      console.error("[API Treinamento GET] Erro:", error.message || error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const userLiberacoes = (liberacoes || []).filter(
      (l: any) => l.usuario_id === "ALL" || l.usuario_id === userId
    )

    return NextResponse.json({ data, liberacoes: userLiberacoes })
  } catch (err: any) {
    console.error("[API Treinamento GET] Exceção:", err?.message || err)
    return NextResponse.json({ error: err?.message || "Erro interno" }, { status: 500 })
  }
}

// POST: Registrar ou atualizar resposta/decisão ou gerenciar liberações programadas
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body
    const supabaseAdmin = createAdminClient()

    if (action === "programar_liberacao") {
      const { dia, usuario_id, usuario_nome, data_hora_liberacao, liberado_por } = body
      if (!dia || !data_hora_liberacao) {
        return NextResponse.json(
          { error: "Dia e data/horário de liberação são obrigatórios" },
          { status: 400 }
        )
      }

      const liberacoes = await getLiberacoesProgramadas(supabaseAdmin)
      const alvoId = usuario_id || "ALL"
      const novaLista = liberacoes.filter(
        (l: any) => !(l.dia === Number(dia) && l.usuario_id === alvoId)
      )

      novaLista.push({
        id: `lib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        dia: Number(dia),
        usuario_id: alvoId,
        usuario_nome: usuario_nome || (alvoId === "ALL" ? "Todos os Usuários" : "Usuário"),
        data_hora_liberacao,
        liberado_por: liberado_por || "Gestor",
        criado_em: new Date().toISOString()
      })

      await saveLiberacoesProgramadas(supabaseAdmin, novaLista)
      return NextResponse.json({ success: true, liberacoes: novaLista })
    }

    if (action === "liberar_em_massa") {
      const { itens, liberado_por } = body
      if (!Array.isArray(itens) || itens.length === 0) {
        return NextResponse.json({ error: "Lista de itens vazia" }, { status: 400 })
      }
      const liberacoes = await getLiberacoesProgramadas(supabaseAdmin)
      let novaLista = [...liberacoes]

      for (const item of itens) {
        const { dia, usuario_id, usuario_nome, data_hora_liberacao } = item
        if (!dia || !usuario_id) continue
        novaLista = novaLista.filter(
          (l: any) => !(l.dia === Number(dia) && l.usuario_id === usuario_id)
        )
        novaLista.push({
          id: `lib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          dia: Number(dia),
          usuario_id,
          usuario_nome: usuario_nome || "Usuário",
          data_hora_liberacao: data_hora_liberacao || new Date().toISOString(),
          liberado_por: liberado_por || "Gestor",
          criado_em: new Date().toISOString()
        })
      }

      await saveLiberacoesProgramadas(supabaseAdmin, novaLista)
      return NextResponse.json({ success: true, liberacoes: novaLista })
    }

    if (action === "remover_liberacoes_em_massa") {
      const { ids } = body
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Lista de ids vazia" }, { status: 400 })
      }
      const idsSet = new Set(ids)
      const liberacoes = await getLiberacoesProgramadas(supabaseAdmin)
      const novaLista = liberacoes.filter((l: any) => !idsSet.has(l.id))
      await saveLiberacoesProgramadas(supabaseAdmin, novaLista)
      return NextResponse.json({ success: true, liberacoes: novaLista })
    }

    if (action === "remover_liberacao") {
      const { id } = body
      if (!id) {
        return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
      }
      const liberacoes = await getLiberacoesProgramadas(supabaseAdmin)
      const novaLista = liberacoes.filter((l: any) => l.id !== id)
      await saveLiberacoesProgramadas(supabaseAdmin, novaLista)
      return NextResponse.json({ success: true, liberacoes: novaLista })
    }

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
