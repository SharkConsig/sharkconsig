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

      const queryError =
        pendingRes.error?.message ||
        migratedRes.error?.message ||
        totalRes.error?.message ||
        null

      return {
        table: t.name,
        label: t.label,
        total: totalRes.count ?? 0,
        pendingBase64: pendingRes.error ? null : (pendingRes.count ?? 0),
        migratedStorage: migratedRes.error ? null : (migratedRes.count ?? 0),
        queryError,
      }
    })
  )

  const hasUnknownPending = results.some((item) => item.pendingBase64 === null && item.total > 0)
  const knownPending = results.reduce((acc, item) => acc + (item.pendingBase64 ?? 0), 0)
  const totalRows = results.reduce((acc, item) => acc + item.total, 0)

  return { tables: results, totalPending: knownPending, hasUnknownPending, totalRows }
}

async function migrateSingleRow(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  targetConfig: (typeof TARGET_TABLES)[number],
  row: { id: string | number; cliente_nome?: string | null; arquivo_url?: string | null; tipo_arquivo?: string | null; created_at?: string | null }
) {
  const rawUrl = typeof row.arquivo_url === "string" ? row.arquivo_url.trim() : ""
  const parsed = parseDataUrl(rawUrl)
  if (!parsed || parsed.buffer.length === 0) {
    return { ok: false as const, error: "Data URL Base64 inválido ou vazio." }
  }

  const { contentType, ext } = resolveMimeAndExt(parsed.mime, row.tipo_arquivo || undefined)
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
    return { ok: false as const, error: uploadErr.message }
  }

  const { data: publicData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(storagePath)
  const publicUrl = publicData?.publicUrl
  if (!publicUrl || !publicUrl.startsWith("http")) {
    return { ok: false as const, error: "URL pública inválida retornada pelo Storage." }
  }

  const { error: updateErr } = await supabaseAdmin
    .from(targetConfig.name)
    .update({ arquivo_url: publicUrl })
    .eq("id", row.id)

  if (updateErr) {
    await supabaseAdmin.storage.from(BUCKET_NAME).remove([storagePath]).catch(() => {})
    return { ok: false as const, error: updateErr.message }
  }

  return {
    ok: true as const,
    item: {
      id: row.id,
      cliente_nome: row.cliente_nome || "Cliente",
      table: targetConfig.name,
      tipo_arquivo: row.tipo_arquivo || ext.toUpperCase(),
      url: publicUrl,
      bytes: parsed.buffer.length,
    },
  }
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
    const pilot = Boolean(body?.pilot)
    const cursor = body?.cursor !== undefined && body?.cursor !== null && body?.cursor !== "" ? body.cursor : null
    const rawLimit = Number(body?.limit)
    const safeLimit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 10) : 5

    if (dryRun) {
      const summary = await collectCounts(supabaseAdmin)
      return NextResponse.json({ success: true, dryRun: true, ...summary })
    }

    await ensureBucket(supabaseAdmin)

    const targetConfig = TARGET_TABLES.find((t) => t.name === requestedTable) || TARGET_TABLES[0]
    if (requestedTable && !TARGET_TABLES.some((t) => t.name === requestedTable)) {
      return NextResponse.json({ success: false, error: "Tabela inválida para migração." }, { status: 400 })
    }

    const migratedItems: Array<{ id: string | number; cliente_nome: string; table: string; tipo_arquivo: string; url: string; bytes: number }> = []
    const failedItems: Array<{ id: string | number; table: string; error: string }> = []
    let alreadyStorage = 0
    let skippedEmpty = 0
    let processed = 0
    let currentCursor: string | number | null = cursor
    let hasMore = false

    if (pilot) {
      // Varre em micro-páginas pelo índice primário (id) sem fazer LIKE na coluna TOAST inteira
      for (let page = 0; page < 15; page++) {
        let query = supabaseAdmin
          .from(targetConfig.name)
          .select("id, cliente_nome, arquivo_url, tipo_arquivo, created_at")
          .order("id", { ascending: true })
          .limit(3)

        if (currentCursor !== null) {
          query = query.gt("id", currentCursor)
        }

        const { data: rows, error: fetchErr } = await query
        if (fetchErr) {
          return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
        }

        if (!rows || rows.length === 0) {
          hasMore = false
          break
        }

        for (const row of rows) {
          processed++
          currentCursor = row.id
          const rawUrl = typeof row.arquivo_url === "string" ? row.arquivo_url.trim() : ""

          if (rawUrl.startsWith("data:")) {
            const res = await migrateSingleRow(supabaseAdmin, targetConfig, row)
            if (res.ok) {
              migratedItems.push(res.item)
            } else {
              failedItems.push({ id: row.id, table: targetConfig.name, error: res.error })
            }
            hasMore = true
            return NextResponse.json({
              success: true,
              table: targetConfig.name,
              processed,
              migrated: migratedItems.length,
              alreadyStorage,
              skippedEmpty,
              failed: failedItems.length,
              migratedItems,
              failedItems,
              nextCursor: currentCursor,
              hasMore,
            })
          } else if (rawUrl.startsWith("http")) {
            alreadyStorage++
          } else {
            skippedEmpty++
          }
        }

        hasMore = rows.length === 3
        if (!hasMore) break
      }

      return NextResponse.json({
        success: true,
        table: targetConfig.name,
        processed,
        migrated: migratedItems.length,
        alreadyStorage,
        skippedEmpty,
        failed: failedItems.length,
        migratedItems,
        failedItems,
        nextCursor: currentCursor,
        hasMore,
      })
    }

    // Varredura determinística em lote pequeno pelo índice primário (id)
    let batchQuery = supabaseAdmin
      .from(targetConfig.name)
      .select("id, cliente_nome, arquivo_url, tipo_arquivo, created_at")
      .order("id", { ascending: true })
      .limit(safeLimit)

    if (currentCursor !== null) {
      batchQuery = batchQuery.gt("id", currentCursor)
    }

    const { data: rows, error: fetchErr } = await batchQuery
    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
    }

    const fetchedRows = rows || []
    hasMore = fetchedRows.length === safeLimit

    for (const row of fetchedRows) {
      processed++
      currentCursor = row.id
      const rawUrl = typeof row.arquivo_url === "string" ? row.arquivo_url.trim() : ""

      if (rawUrl.startsWith("data:")) {
        const res = await migrateSingleRow(supabaseAdmin, targetConfig, row)
        if (res.ok) {
          migratedItems.push(res.item)
        } else {
          failedItems.push({ id: row.id, table: targetConfig.name, error: res.error })
        }
      } else if (rawUrl.startsWith("http")) {
        alreadyStorage++
      } else {
        skippedEmpty++
      }
    }

    return NextResponse.json({
      success: true,
      table: targetConfig.name,
      processed,
      migrated: migratedItems.length,
      alreadyStorage,
      skippedEmpty,
      failed: failedItems.length,
      migratedItems,
      failedItems,
      nextCursor: currentCursor,
      hasMore,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno na migração."
    console.error("[API migrar-storage POST] Erro:", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
