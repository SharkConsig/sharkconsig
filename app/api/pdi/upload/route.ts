import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]
    const colaboradorId = (formData.get("colaboradorId") as string) || "geral"

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const uploadedAttachments: Array<{
      id: string
      name: string
      url: string
      type: string
      size: number
    }> = []

    for (const file of files) {
      if (!file || typeof file.name !== "string") continue

      const cleanName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")

      const filePath = `pdi/${colaboradorId}/${Date.now()}_${cleanName}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await supabaseAdmin.storage
        .from("rh_images")
        .upload(filePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true
        })

      if (uploadError) {
        console.error("[PDI Upload] Erro no upload Supabase Storage:", uploadError)
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      const { data: urlData } = supabaseAdmin.storage
        .from("rh_images")
        .getPublicUrl(filePath)

      uploadedAttachments.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        url: urlData.publicUrl,
        type: file.type || "application/octet-stream",
        size: file.size
      })
    }

    return NextResponse.json({ attachments: uploadedAttachments })
  } catch (error: any) {
    console.error("[PDI Upload] Erro interno:", error)
    return NextResponse.json({ error: error.message || "Erro no upload" }, { status: 500 })
  }
}
