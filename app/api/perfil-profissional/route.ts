import { createAdminClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { calcularPerfil, calcularCheckpointLideranca } from "@/lib/perfil-profissional"
import { QUESTOES_ESTAGIO, QUESTOES_TESTE, getQuestoesTeste } from "@/lib/perfil-profissional-data"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const listAll = searchParams.get("all") === "true"

    const supabaseAdmin = createAdminClient()

    if (listAll) {
      // 1. Buscar todas as respostas salvas na tabela perfil_profissional
      const { data: dbRows, error: dbErr } = await supabaseAdmin
        .from("perfil_profissional")
        .select("*")

      if (dbErr) {
        console.error("[API Perfil Profissional GET all] Erro ao consultar tabela:", dbErr)
      }

      // 1. Buscar usuários cadastrados no Auth para montar a listagem
      let users: any[] = []
      let page = 1
      const perPage = 1000
      while (true) {
        const { data: listData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
        if (error) break
        const pageUsers = listData?.users || []
        users = users.concat(pageUsers)
        if (pageUsers.length < perPage) break
        page++
      }

      const userMetaMap = new Map<string, { role: string; tipoTeste: string | null }>()
      users.forEach(u => {
        const role = u.user_metadata?.funcao || u.user_metadata?.role || ""
        const tipoTeste = u.user_metadata?.tipo_teste_atribuido || null
        userMetaMap.set(u.id, { role, tipoTeste })
      })

      const perfilMap = new Map<string, any>()
      ;(dbRows || []).forEach(row => {
        const userMeta = userMetaMap.get(row.user_id)
        const role = userMeta?.role || ""
        const tipoTeste = userMeta?.tipoTeste || null
        const questoes = tipoTeste === "QUESTOES_ESTAGIO" 
          ? QUESTOES_ESTAGIO 
          : tipoTeste === "QUESTOES_TESTE" 
          ? QUESTOES_TESTE 
          : getQuestoesTeste(role)
        const calculado = calcularPerfil(row.respostas || {}, row.usuario_nome, questoes)
        perfilMap.set(row.user_id, {
          versao: row.versao_instrumento || "v1.0",
          dataConclusao: row.updated_at || row.created_at,
          respostas: row.respostas,
          calculado,
          checkpoint: row.checkpoint_lider || null
        })
      })

      const perfis = users
        .filter(u => {
          const status = ((u.user_metadata?.status || "ATIVO") as string).toUpperCase().trim()
          return status === "ATIVO"
        })
        .map(u => {
          const meta = u.user_metadata || {}
          const perfilFromTable = perfilMap.get(u.id) || null
          return {
            id: u.id,
            nome: meta.nome_completo || meta.nome || u.email?.split("@")[0] || "Colaborador",
            email: u.email,
            role: meta.funcao || meta.role || "Colaborador",
            tipo_teste_atribuido: meta.tipo_teste_atribuido || null,
            regime_contratacao: meta.regime_contratacao || "",
            status: ((meta.status || "ATIVO") as string).toUpperCase().trim(),
            supervisor_id: meta.supervisor_id || null,
            supervisor_nome: meta.supervisor_nome || null,
            data_inicio_operacao: meta.data_inicio_operacao || u.created_at,
            perfilProfissional: perfilFromTable,
            checkpoint30Dias: perfilFromTable?.checkpoint || null
          }
        })

      return NextResponse.json(
        { success: true, perfis },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      )
    }

    if (userId) {
      // Busca EXCLUSIVAMENTE na tabela perfil_profissional
      const { data: dbRow, error: dbErr } = await supabaseAdmin
        .from("perfil_profissional")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (dbErr) {
        console.error("[API Perfil Profissional GET userId] Erro ao consultar tabela:", dbErr)
      }

      // Se não existir registro na tabela perfil_profissional, retorna null imediatamente
      if (!dbRow) {
        // Limpa metadado legado se existir para não haver inconsistência
        let metaTipoTeste: string | null = null
        try {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
          metaTipoTeste = userData?.user?.user_metadata?.tipo_teste_atribuido || null
          if (userData?.user?.user_metadata?.perfil_profissional) {
            const meta = { ...userData.user.user_metadata }
            delete meta.perfil_profissional
            delete meta.perfil_profissional_checkpoint
            await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: meta })
          }
        } catch (_) {}

        return NextResponse.json(
          {
            success: true,
            perfil: null,
            checkpoint: null,
            tipoTesteAtribuido: metaTipoTeste,
            dataInicioOperacao: null
          },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        )
      }

      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
      const userRole = userData?.user?.user_metadata?.funcao || userData?.user?.user_metadata?.role || ""
      const tipoTesteAtribuido = userData?.user?.user_metadata?.tipo_teste_atribuido || null
      const questoes = tipoTesteAtribuido === "QUESTOES_ESTAGIO"
        ? QUESTOES_ESTAGIO
        : tipoTesteAtribuido === "QUESTOES_TESTE"
        ? QUESTOES_TESTE
        : getQuestoesTeste(userRole)
      const calculado = calcularPerfil(dbRow.respostas || {}, dbRow.usuario_nome, questoes)

      const perfil = {
        versao: dbRow.versao_instrumento || "v1.0",
        dataConclusao: dbRow.updated_at || dbRow.created_at,
        respostas: dbRow.respostas,
        calculado
      }

      return NextResponse.json(
        {
          success: true,
          perfil,
          checkpoint: dbRow.checkpoint_lider || null,
          tipoTesteAtribuido,
          dataInicioOperacao: userData?.user?.user_metadata?.data_inicio_operacao || userData?.user?.created_at || null
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      )
    }

    return NextResponse.json({ success: false, error: "userId ou all=true obrigatório" }, { status: 400 })
  } catch (err: any) {
    console.error("[API Perfil Profissional GET] Erro:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, userId, respostas, nomeUsuario, respostasCheckpoint, colaboradorId, liderId, liderNome } = body

    const supabaseAdmin = createAdminClient()

    if (action === "salvar_teste") {
      if (!userId || !respostas) {
        return NextResponse.json({ success: false, error: "Dados incompletos" }, { status: 400 })
      }

      const { data: userData, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (fetchErr || !userData?.user) {
        return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 })
      }

      const role = body.role || userData.user.user_metadata?.funcao || userData.user.user_metadata?.role || ""
      const nome = nomeUsuario || userData.user.user_metadata?.nome || userData.user.email?.split("@")[0] || "Colaborador"
      const tipoAtribuido = userData.user.user_metadata?.tipo_teste_atribuido || body.tipoTeste || null
      const questoes = tipoAtribuido === "QUESTOES_ESTAGIO"
        ? QUESTOES_ESTAGIO
        : tipoAtribuido === "QUESTOES_TESTE"
        ? QUESTOES_TESTE
        : getQuestoesTeste(role)
      const perfilCalculado = calcularPerfil(respostas, nome, questoes)

      // Persiste com exclusividade na tabela perfil_profissional
      const { error: upsertErr } = await supabaseAdmin.from("perfil_profissional").upsert(
        {
          user_id: userId,
          usuario_nome: nome,
          usuario_email: userData.user.email || "",
          versao_instrumento: "v1.0",
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
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      )

      if (upsertErr) {
        console.error("[API Perfil Profissional POST] Erro ao salvar na tabela:", upsertErr)
        return NextResponse.json({ success: false, error: "Erro ao gravar respostas no banco de dados." }, { status: 500 })
      }

      const dadosSalvar = {
        versao: "v1.0",
        dataConclusao: new Date().toISOString(),
        respostas,
        calculado: perfilCalculado
      }

      return NextResponse.json({ success: true, perfil: dadosSalvar })
    }

    if (action === "salvar_checkpoint") {
      if (!colaboradorId || !respostasCheckpoint) {
        return NextResponse.json({ success: false, error: "Dados do checkpoint incompletos" }, { status: 400 })
      }

      const { data: dbColab } = await supabaseAdmin
        .from("perfil_profissional")
        .select("*")
        .eq("user_id", colaboradorId)
        .maybeSingle()

      const faixasIniciais = dbColab?.faixas || {
        ACT: "Equilibrada", COM: "Equilibrada", CON: "Equilibrada",
        PRE: "Equilibrada", RES: "Equilibrada", AUT: "Equilibrada"
      }

      const resultadoObservado = calcularCheckpointLideranca(respostasCheckpoint, faixasIniciais)

      const dadosCheckpoint = {
        liderId: liderId || "sistema",
        liderNome: liderNome || "Líder",
        dataConclusao: new Date().toISOString(),
        respostas: respostasCheckpoint,
        resultadoObservado
      }

      // Persiste checkpoint diretamente na tabela perfil_profissional
      await supabaseAdmin
        .from("perfil_profissional")
        .update({
          checkpoint_lider: dadosCheckpoint,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", colaboradorId)

      return NextResponse.json({ success: true, checkpoint: dadosCheckpoint })
    }

    if (action === "atribuir_tipo_teste") {
      const { userIds, tipoTeste } = body
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json({ success: false, error: "Nenhum usuário informado" }, { status: 400 })
      }

      // tipoTeste pode ser "QUESTOES_TESTE" | "QUESTOES_ESTAGIO" | "PADRAO"
      const valorMeta = (!tipoTeste || tipoTeste === "PADRAO") ? null : tipoTeste

      const promessas = userIds.map(async (uId: string) => {
        try {
          const { data: uData } = await supabaseAdmin.auth.admin.getUserById(uId)
          if (uData?.user) {
            const meta = { ...uData.user.user_metadata }
            if (valorMeta) {
              meta.tipo_teste_atribuido = valorMeta
            } else {
              delete meta.tipo_teste_atribuido
            }
            await supabaseAdmin.auth.admin.updateUserById(uId, { user_metadata: meta })
          }
        } catch (err) {
          console.error(`[API Perfil Profissional] Erro ao atribuir teste para usuário ${uId}:`, err)
        }
      })

      await Promise.all(promessas)

      return NextResponse.json({ success: true, count: userIds.length })
    }

    if (action === "resetar_teste") {
      const { userIds } = body
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json({ success: false, error: "Nenhum usuário informado para resetar." }, { status: 400 })
      }

      // Exclui os registros de perfil_profissional no Supabase para permitir refazer o teste
      const { error: delErr } = await supabaseAdmin
        .from("perfil_profissional")
        .delete()
        .in("user_id", userIds)

      if (delErr) {
        console.error("[API Perfil Profissional] Erro ao deletar registros:", delErr)
        return NextResponse.json({ success: false, error: "Erro ao resetar teste no banco de dados." }, { status: 500 })
      }

      return NextResponse.json({ success: true, count: userIds.length })
    }

    return NextResponse.json({ success: false, error: "Ação não reconhecida" }, { status: 400 })
  } catch (err: any) {
    console.error("[API Perfil Profissional POST] Erro:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
