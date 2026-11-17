import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

const BUCKET_NAME = "propostas-comerciais"

const TARGET_TABLES = [
  { name: "historico_proposta_comercial", folder: "geral", label: "Redução de Parcela" },
  { name: "historico_proposta_comercial_quitacao_contrato", folder: "quitacao", label: "Quitação de Contrato" },
  { name: "historico_proposta_comercial_novo_formato", folder: "novo-formato", label: "Novo Formato" },
  { name: "historico_proposta_comercial_calculadora", folder: "calculadora", label: "Calculadora" },
] as const

const ADMIN_EMAILS = new Set([
  "souendrionovo@gmail.com",
  "acertofacilpromotoradecredito@gmail.com",
  "donajericoescritorio@gmail.com",
])

async function verifyAdminRequest(req: NextRequest, supabaseAdmin: ReturnType<typeof createAdminClient>) {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""

  if (!token) {
    return { ok: false as const, status: 401, error: "Token de autenticação ausente." }
  }

  const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !userData?.user) {
    return { ok: false as const, status: 401, error: "Sessão inválida ou expirada." }
  }

  const user = userData.user
  const email = (user.email || "").toLowerCase().trim()
  if (ADMIN_EMAILS.has(email)) {
    return { ok: true as const, user }
  }

  const { data: perfilData } = await supabaseAdmin
    .from("perfis")
    .select("role, funcao")
    .eq("id", user.id)
    .maybeSingle()

  const roleCandidates = [
    perfilData?.role,
    perfilData?.funcao,
    user.user_metadata?.role,
    user.user_metadata?.funcao,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase())

  const isAuthorized = roleCandidates.some((r) =>
    ["administrador", "admin", "desenvolvedor"].includes(r)
  )

  if (!isAuthorized) {
    return { ok: false as const, status: 403, error: "Acesso restrito a Administrador ou Desenvolvedor." }
  }

  return { ok: true as const, user }
}

async function ensureBucket(supabaseAdmin: ReturnType<typeof createAdminClient>) {
  const { data: existing, error: getErr } = await supabaseAdmin.storage.getBucket(BUCKET_NAME)
  if (existing && !getErr) return

  const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: 26214400,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "application/pdf"],
  })

  if (createErr && !String(createErr.message || "").toLowerCase().includes("already exists")) {
    throw new Error(`Falha ao preparar bucket ${BUCKET_NAME}: ${createErr.message}`)
  }
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/i)
  if (!match) return null
  const cleanBase64 = match[2].replace(/\s+/g, "")
  return {
    mime: match[1].toLowerCase().trim(),
    buffer: Buffer.from(cleanBase64, "base64"),
  }
}

function resolveMimeAndExt(mimeInput?: string, tipoArquivo?: string) {
  const mime = (mimeInput || "").toLowerCase().trim()
  const tipo = (tipoArquivo || "").toLowerCase().trim()

  if (mime.includes("pdf") || tipo === "pdf") {
    return { contentType: "application/pdf", ext: "pdf" }
  }
  if (mime.includes("jpeg") || mime.includes("jpg") || tipo === "jpg" || tipo === "jpeg") {
    return { contentType: "image/jpeg", ext: "jpg" }
  }
  return { contentType: "image/png", ext: "png" }
}

async function collectCounts(supabaseAdmin: ReturnType<typeof createAdminClient>) {
  const results = await Promise.all(
    TARGET_TABLES.map(async (t) => {
      const [totalRes, pendingRes, migratedRes] = await Promise.all([
        supabaseAdmin.from(t.name).select("id", { count: "exact", head: true }),
        supabaseAdmin.from(t.name).select("id", { count: "exact", head: true }).like("arquivo_url", "data:%"),
        supabaseAdmin.from(t.name).select("id", { count: "exact", head: true }).like("arquivo_url", "http%"),
      ])

      return {
        table: t.name,
        label: t.label,
        total: totalRes.count || 0,
        pendingBase64: pendingRes.count || 0,
        migratedStorage: migratedRes.count || 0,
      }
    })
  )

  const totalPending = results.reduce((acc, item) => acc + item.pendingBase64, 0)
  return { tables: results, totalPending }
}

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const auth = await verifyAdminRequest(req, supabaseAdmin)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const summary = await collectCounts(supabaseAdmin)
    return NextResponse.json({ success: true, dryRun: true, ...summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao consultar status da migração."
    console.error("[API migrar-storage GET] Erro:", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const auth = await verifyAdminRequest(req, supabaseAdmin)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await req.json().catch(() => ({}))
    const requestedTable = typeof body?.table === "string" ? body.table.trim() : ""
    const dryRun = Boolean(body?.dryRun)
    const rawLimit = Number(body?.limit)
    const safeLimit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 10) : 5

    if (dryRun) {
      const summary = await collectCounts(supabaseAdmin)
      return NextResponse.json({ success: true, dryRun: true, ...summary })
    }

    await ensureBucket(supabaseAdmin)

    let targetConfig = TARGET_TABLES.find((t) => t.name === requestedTable)
    if (requestedTable && !targetConfig) {
      return NextResponse.json({ success: false, error: "Tabela inválida para migração." }, { status: 400 })
    }

    if (!targetConfig) {
      const summary = await collectCounts(supabaseAdmin)
      const nextPending = summary.tables.find((t) => t.pendingBase64 > 0)
      if (!nextPending) {
        return NextResponse.json({
          success: true,
          finished: true,
          processed: 0,
          migrated: 0,
          failed: 0,
          migratedItems: [],
          failedItems: [],
          ...summary,
        })
      }
      targetConfig = TARGET_TABLES.find((t) => t.name === nextPending.table)!
    }

    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from(targetConfig.name)
      .select("id, cliente_nome, arquivo_url, tipo_arquivo, created_at")
      .like("arquivo_url", "data:%")
      .order("created_at", { ascending: true })
      .limit(safeLimit)

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
    }

    const migratedItems: Array<{ id: string | number; cliente_nome: string; table: string; tipo_arquivo: string; url: string; bytes: number }> = []
    const failedItems: Array<{ id: string | number; table: string; error: string }> = []

    for (const row of rows || []) {
      try {
        const rawUrl = typeof row.arquivo_url === "string" ? row.arquivo_url : ""
        const parsed = parseDataUrl(rawUrl)
        if (!parsed || parsed.buffer.length === 0) {
          failedItems.push({ id: row.id, table: targetConfig.name, error: "Data URL Base64 inválido ou vazio." })
          continue
        }

        const { contentType, ext } = resolveMimeAndExt(parsed.mime, row.tipo_arquivo)
        const createdDate = row.created_at ? new Date(row.created_at) : new Date()
        const validDate = isNaN(createdDate.getTime()) ? new Date() : createdDate
        const yearMonth = `${validDate.getUTCFullYear()}-${String(validDate.getUTCMonth() + 1).padStart(2, "0")}`
        const storagePath = `${targetConfig.folder}/${yearMonth}/${row.id}_${crypto.randomUUID()}.${ext}`

        const { error: uploadErr } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .upload(storagePath, parsed.buffer, {
            contentType,
            cacheControl: "31536000",
            upsert: false,
          })

        if (uploadErr) {
          failedItems.push({ id: row.id, table: targetConfig.name, error: uploadErr.message })
          continue
        }

        const { data: publicData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(storagePath)
        const publicUrl = publicData?.publicUrl
        if (!publicUrl || !publicUrl.startsWith("http")) {
          failedItems.push({ id: row.id, table: targetConfig.name, error: "URL pública inválida retornada pelo Storage." })
          continue
        }

        const { error: updateErr } = await supabaseAdmin
          .from(targetConfig.name)
          .update({ arquivo_url: publicUrl })
          .eq("id", row.id)

        if (updateErr) {
          await supabaseAdmin.storage.from(BUCKET_NAME).remove([storagePath]).catch(() => {})
          failedItems.push({ id: row.id, table: targetConfig.name, error: updateErr.message })
          continue
        }

        migratedItems.push({
          id: row.id,
          cliente_nome: row.cliente_nome || "Cliente",
          table: targetConfig.name,
          tipo_arquivo: row.tipo_arquivo || ext.toUpperCase(),
          url: publicUrl,
          bytes: parsed.buffer.length,
        })
      } catch (rowErr: unknown) {
        const msg = rowErr instanceof Error ? rowErr.message : "Erro inesperado na linha."
        failedItems.push({ id: row.id, table: targetConfig.name, error: msg })
      }
    }

    const updatedSummary = await collectCounts(supabaseAdmin)

    return NextResponse.json({
      success: true,
      table: targetConfig.name,
      processed: (rows || []).length,
      migrated: migratedItems.length,
      failed: failedItems.length,
      migratedItems,
      failedItems,
      finished: updatedSummary.totalPending === 0,
      ...updatedSummary,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno na migração."
    console.error("[API migrar-storage POST] Erro:", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
