export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const commaIdx = dataUrl.indexOf(",")
    if (commaIdx === -1) return null

    const header = dataUrl.slice(0, commaIdx)
    const base64Data = dataUrl.slice(commaIdx + 1)
    const mimeMatch = header.match(/data:([^;]+);base64/i)
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream"

    const binaryStr = atob(base64Data)
    const len = binaryStr.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

export async function uploadCommercialProposalToStorage(params: {
  dataUrlOrBlob: string | Blob
  format: string
  model?: string
}): Promise<string | null> {
  try {
    const ext = params.format.toLowerCase() === "pdf" ? "pdf" : params.format.toLowerCase() === "jpg" || params.format.toLowerCase() === "jpeg" ? "jpg" : "png"
    const blob =
      typeof params.dataUrlOrBlob === "string"
        ? dataUrlToBlob(params.dataUrlOrBlob)
        : params.dataUrlOrBlob

    if (!blob) return null

    const formData = new FormData()
    formData.append("file", blob, `proposta.${ext}`)
    formData.append("tipoArquivo", ext.toUpperCase())
    if (params.model) {
      formData.append("model", params.model)
    }

    const res = await fetch("/api/propostas-comerciais/upload", {
      method: "POST",
      body: formData,
    })

    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.url === "string" && data.url ? data.url : null
  } catch (err) {
    console.warn("Falha ao enviar proposta para o Supabase Storage:", err)
    return null
  }
}

export async function downloadCommercialProposalFile(arquivoUrl: string | null | undefined, fileName: string) {
  if (!arquivoUrl) return

  const trimmed = arquivoUrl.trim()

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    // URLs do Supabase Storage suportam ?download=nome para forçar Content-Disposition: attachment sem usar fetch/RAM extra
    if (trimmed.includes("/storage/v1/object/")) {
      try {
        const urlObj = new URL(trimmed)
        urlObj.searchParams.set("download", fileName)
        const link = document.createElement("a")
        link.href = urlObj.toString()
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      } catch {
        // segue para fallback via blob
      }
    }

    try {
      const response = await fetch(trimmed)
      if (response.ok) {
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = blobUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
        return
      }
    } catch {
      // fallback abaixo
    }
  }

  const link = document.createElement("a")
  link.href = trimmed
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
