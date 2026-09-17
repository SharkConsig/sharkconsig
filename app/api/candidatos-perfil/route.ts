import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createAdminClient } from "@/lib/supabase"
import { calcularPerfil } from "@/lib/perfil-profissional"
import { fallbackCandidatosStore, CandidatoPerfilRecord } from "@/lib/candidatos-store"

export const dynamic = "force-dynamic"

const generateUUID = () => {
  try {
    return randomUUID()
  } catch (_) {
    return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0
      const v = c === "x" ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }
}

const isValidUUID = (str?: string | null): boolean => {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function GET(request: Request) {
  try {
    let candidatos: any[] = []

    try {
      const supabaseAdmin = createAdminClient()
      const { data, error } = await supabaseAdmin
        .from("perfil_candidatos")
        .select("*")
        .order("created_at", { ascending: false })

      if (!error && Array.isArray(data)) {
        candidatos = data
      }
    } catch (err) {
      console.warn("[API Candidatos Perfil GET] Usando fallback em memória:", err)
    }

    // Mescla registros do fallback store caso existam
    const fallbackList = Array.from(fallbackCandidatosStore.values())
    const existingIds = new Set(candidatos.map(c => c.id || c.token_acesso))
    for (const fb of fallbackList) {
      if (!existingIds.has(fb.id) && !existingIds.has(fb.token_acesso)) {
        candidatos.push(fb)
      }
    }

    // Formata e adiciona cálculos psicométricos para candidatos com teste concluído
    const agora = new Date()
    const perfisFormatados = candidatos.map(c => {
      const isExpirado = c.status !== "concluido" && new Date(c.data_expiracao) < agora
      const statusFinal = isExpirado ? "expirado" : c.status

      let perfilCalculado = null
      if (c.status === "concluido" && c.respostas && Object.keys(c.respostas).length > 0) {
        perfilCalculado = calcularPerfil(c.respostas, c.nome)
      }

      return {
        ...c,
        status: statusFinal,
        perfilCalculado
      }
    })

    return NextResponse.json(
      { success: true, candidatos: perfisFormatados },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    )
  } catch (err: any) {
    console.error("[API Candidatos Perfil GET] Erro:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      nome,
      email,
      telefone,
      endereco,
      cargo_pretendido,
      diasValidade = 3,
      criado_por_id,
      criado_por_nome
    } = body

    if (!nome?.trim() || !email?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nome e e-mail do candidato são obrigatórios." },
        { status: 400 }
      )
    }

    const token = generateUUID()
    const agora = new Date()
    const validadeDiasNum = Math.max(1, Math.min(30, parseInt(diasValidade, 10) || 3))
    const dataExpiracao = new Date(agora.getTime() + validadeDiasNum * 24 * 60 * 60 * 1000).toISOString()

    const novoCandidato: CandidatoPerfilRecord = {
      id: generateUUID(),
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      telefone: telefone?.trim() || "",
      endereco: endereco?.trim() || "",
      cargo_pretendido: cargo_pretendido?.trim() || "Candidato",
      token_acesso: token,
      status: "pendente",
      utilizado: false,
      data_expiracao: dataExpiracao,
      respostas: {},
      versao_instrumento: "v1.0",
      criado_por_id: isValidUUID(criado_por_id) ? criado_por_id : null,
      criado_por_nome: criado_por_nome || "RH SharkConsig",
      created_at: agora.toISOString(),
      updated_at: agora.toISOString()
    }

    // Salva no fallback store para garantia instantânea
    fallbackCandidatosStore.set(token, novoCandidato)

    // Tenta persistir no Supabase se a tabela estiver pronta
    try {
      const supabaseAdmin = createAdminClient()
      const { data, error } = await supabaseAdmin
        .from("perfil_candidatos")
        .insert({
          id: novoCandidato.id,
          nome: novoCandidato.nome,
          email: novoCandidato.email,
          telefone: novoCandidato.telefone,
          endereco: novoCandidato.endereco,
          cargo_pretendido: novoCandidato.cargo_pretendido,
          token_acesso: novoCandidato.token_acesso,
          status: "pendente",
          utilizado: false,
          data_expiracao: novoCandidato.data_expiracao,
          versao_instrumento: "v1.0",
          respostas: {},
          criado_por_id: novoCandidato.criado_por_id,
          criado_por_nome: novoCandidato.criado_por_nome
        })
        .select()
        .maybeSingle()

      if (!error && data) {
        novoCandidato.id = data.id
      }
    } catch (dbErr) {
      console.warn("[API Candidatos Perfil POST] Persistido em fallback store:", dbErr)
    }

    return NextResponse.json({
      success: true,
      candidato: novoCandidato,
      linkToken: token
    })
  } catch (err: any) {
    console.error("[API Candidatos Perfil POST] Erro:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, token, action, diasValidade = 3 } = body

    if (!id && !token) {
      return NextResponse.json({ success: false, error: "Identificador ausente" }, { status: 400 })
    }

    const agora = new Date()

    if (action === "renovar") {
      const novoToken = generateUUID()
      const dataExpiracao = new Date(agora.getTime() + diasValidade * 24 * 60 * 60 * 1000).toISOString()

      try {
        const supabaseAdmin = createAdminClient()
        await supabaseAdmin
          .from("perfil_candidatos")
          .update({
            token_acesso: novoToken,
            status: "pendente",
            utilizado: false,
            data_expiracao: dataExpiracao,
            updated_at: agora.toISOString()
          })
          .or(`id.eq.${id},token_acesso.eq.${token}`)
      } catch (_) {}

      // Atualiza no fallback store
      for (const [k, v] of fallbackCandidatosStore.entries()) {
        if (v.id === id || v.token_acesso === token) {
          fallbackCandidatosStore.delete(k)
          v.token_acesso = novoToken
          v.status = "pendente"
          v.utilizado = false
          v.data_expiracao = dataExpiracao
          v.updated_at = agora.toISOString()
          fallbackCandidatosStore.set(novoToken, v)
          break
        }
      }

      return NextResponse.json({ success: true, novoToken, dataExpiracao })
    }

    return NextResponse.json({ success: false, error: "Ação não reconhecida" }, { status: 400 })
  } catch (err: any) {
    console.error("[API Candidatos Perfil PATCH] Erro:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const token = searchParams.get("token")

    if (!id && !token) {
      return NextResponse.json({ success: false, error: "id ou token obrigatório" }, { status: 400 })
    }

    try {
      const supabaseAdmin = createAdminClient()
      if (id) {
        await supabaseAdmin.from("perfil_candidatos").delete().eq("id", id)
      } else if (token) {
        await supabaseAdmin.from("perfil_candidatos").delete().eq("token_acesso", token)
      }
    } catch (_) {}

    // Remove do fallback store
    for (const [k, v] of fallbackCandidatosStore.entries()) {
      if (v.id === id || v.token_acesso === token) {
        fallbackCandidatosStore.delete(k)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[API Candidatos Perfil DELETE] Erro:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
