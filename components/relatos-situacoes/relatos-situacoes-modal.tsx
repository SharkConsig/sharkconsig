"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { 
  X, 
  Send, 
  Image as ImageIcon, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Clock, 
  User, 
  Check, 
  Loader2, 
  RefreshCw,
  MessageSquareWarning,
  FileText,
  Paperclip,
  Video,
  Volume2,
  ExternalLink,
  Download
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"

export interface RelatoItem {
  id: string
  usuario_id: string
  usuario_nome: string
  usuario_email: string
  usuario_role: string
  titulo: string
  relato: string
  imagem_url?: string | null
  lido: boolean
  created_at: string
  updated_at: string
}

interface RelatosSituacoesModalProps {
  isOpen: boolean
  onClose: () => void
  isAdmin: boolean
}

// Helper para detectar tipo de anexo
function detectAttachmentType(urlOrName?: string | null, fileType?: string): "imagem" | "video" | "audio" | "documento" {
  if (!urlOrName) return "documento"

  // 1. Verificar MIME type explícito se fornecido
  if (fileType?.startsWith("image/")) return "imagem"
  if (fileType?.startsWith("video/")) return "video"
  if (fileType?.startsWith("audio/")) return "audio"
  if (fileType?.includes("pdf") || fileType?.includes("document") || fileType?.includes("sheet") || fileType?.includes("msword")) return "documento"

  // 2. Verificar se é Data URI (Base64)
  if (urlOrName.startsWith("data:image/")) return "imagem"
  if (urlOrName.startsWith("data:video/")) return "video"
  if (urlOrName.startsWith("data:audio/")) return "audio"
  if (urlOrName.startsWith("data:application/") || urlOrName.startsWith("data:text/")) return "documento"

  // 3. Extrair nome real do arquivo mesmo se estiver em query param (ex: /api/relatos-situacoes?file=1729...anexo.png)
  let target = urlOrName
  if (urlOrName.includes("?")) {
    try {
      const query = urlOrName.split("?")[1] || ""
      const params = new URLSearchParams(query)
      const fileParam = params.get("file") || params.get("filename") || params.get("arquivo") || params.get("name")
      if (fileParam) {
        target = decodeURIComponent(fileParam)
      } else {
        target = urlOrName.split("?")[0]
      }
    } catch {
      target = urlOrName.split("?")[0]
    }
  }

  const clean = decodeURIComponent(target).toLowerCase()
  const ext = clean.split(".").pop()?.trim() || ""

  // Imagens
  const imageExts = ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico", "tiff", "heic", "avif"]
  if (imageExts.includes(ext) || clean.match(/\.(jpg|jpeg|png|webp|gif|svg|bmp|ico|tiff|heic|avif)($|[?#])/i)) {
    return "imagem"
  }

  // Vídeos
  const videoExts = ["mp4", "mov", "webm", "avi", "mkv", "m4v", "wmv", "3gp", "ogv"]
  if (videoExts.includes(ext) || clean.match(/\.(mp4|mov|webm|avi|mkv|m4v|wmv|3gp|ogv)($|[?#])/i)) {
    return "video"
  }

  // Áudios
  const audioExts = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma", "opus", "oga"]
  if (audioExts.includes(ext) || clean.match(/\.(mp3|wav|ogg|m4a|aac|flac|wma|opus|oga)($|[?#])/i)) {
    return "audio"
  }

  return "documento"
}

// Cache em nível de módulo para a fila de relatos do Administrador
let cachedRelatos: RelatoItem[] | null = null
let lastFetchedAt: number = 0
const CACHE_TTL_MS = 60 * 1000 // 1 minuto de cache fresco

export function RelatosSituacoesModal({ isOpen, onClose, isAdmin }: RelatosSituacoesModalProps) {
  const { user, perfil } = useAuth()

  // Estados para o Usuário Comum (Envio do Relato)
  const [titulo, setTitulo] = useState("")
  const [relatoTexto, setRelatoTexto] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Estados para o Administrador (Fila de Relatos) com suporte a Cache em Nível de Módulo
  const [relatos, setRelatos] = useState<RelatoItem[]>(() => cachedRelatos || [])
  const [loadingRelatos, setLoadingRelatos] = useState<boolean>(() => !cachedRelatos)
  const [refreshing, setRefreshing] = useState(false)
  const [filterLido, setFilterLido] = useState<"todos" | "nao_lidos" | "lidos">("todos")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [itemToDelete, setItemToDelete] = useState<RelatoItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Carregar e Revalidar relatos para o Administrador (Stale-While-Revalidate)
  const fetchRelatos = useCallback(async (isManualRefresh = false) => {
    if (!isAdmin) return
    const hasCache = cachedRelatos !== null

    if (isManualRefresh) {
      setRefreshing(true)
    } else if (!hasCache) {
      setLoadingRelatos(true)
    }

    try {
      const res = await fetch(`/api/relatos-situacoes?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Pragma": "no-cache" }
      })
      const json = await res.json()
      if (json.success && Array.isArray(json.relatos)) {
        cachedRelatos = json.relatos
        lastFetchedAt = Date.now()
        setRelatos(json.relatos)
      } else if (!hasCache) {
        setRelatos([])
      }
    } catch (err) {
      console.warn("Aviso ao buscar relatos de situações:", err)
    } finally {
      setLoadingRelatos(false)
      setRefreshing(false)
    }
  }, [isAdmin])

  // Revalidação em Segundo Plano na abertura do modal
  useEffect(() => {
    if (isOpen) {
      if (isAdmin) {
        const isStale = Date.now() - lastFetchedAt > CACHE_TTL_MS
        // Se já temos cache, exibe instantaneamente e revalida em segundo plano se expirado
        if (!cachedRelatos || isStale) {
          fetchRelatos()
        }
      }
    } else {
      // Limpar formulário do usuário ao fechar
      setTitulo("")
      setRelatoTexto("")
      setSelectedImage(null)
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
        setImagePreviewUrl(null)
      }
      setItemToDelete(null)
      setPreviewImage(null)
    }
  }, [isOpen, isAdmin, fetchRelatos])

  // Sincronização Automática periódica em segundo plano enquanto o Administrador estiver com a fila aberta
  useEffect(() => {
    if (!isOpen || !isAdmin) return
    const syncTimer = setInterval(() => {
      fetchRelatos(false)
    }, 30000) // Sincroniza a cada 30 segundos sem travar a interface
    return () => clearInterval(syncTimer)
  }, [isOpen, isAdmin, fetchRelatos])

  // Lidar com seleção de imagem do usuário
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedImage(file)
      const url = URL.createObjectURL(file)
      setImagePreviewUrl(url)
    }
  }

  // Lidar com colagem direta de prints via Ctrl+V
  const handlePasteImage = useCallback((e: ClipboardEvent | React.ClipboardEvent) => {
    if (isAdmin) return
    const clipboardData = (e as any).clipboardData
    if (!clipboardData || !clipboardData.items) return

    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i]
      if (item.type && item.type.indexOf("image") !== -1) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          setSelectedImage(file)
          if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl)
          }
          const url = URL.createObjectURL(file)
          setImagePreviewUrl(url)
          toast.success("Print anexado com sucesso!")
          return
        }
      }
    }
  }, [isAdmin, imagePreviewUrl])

  useEffect(() => {
    if (!isOpen || isAdmin) return

    const handleWindowPaste = (e: ClipboardEvent) => {
      handlePasteImage(e)
    }

    window.addEventListener("paste", handleWindowPaste)
    return () => {
      window.removeEventListener("paste", handleWindowPaste)
    }
  }, [isOpen, isAdmin, handlePasteImage])

  const handleRemoveSelectedImage = () => {
    setSelectedImage(null)
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Submissão do Relato (Usuário Comum)
  const handleSubmitRelato = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!relatoTexto.trim()) {
      toast.error("Por favor, descreva a situação ou dúvida antes de enviar.")
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading("Enviando seu relato ao Administrador...")

    try {
      const formData = new FormData()
      formData.append("usuario_id", user?.id || perfil?.id || "")
      formData.append("usuario_nome", perfil?.nome || user?.email?.split("@")[0] || "Usuário")
      formData.append("usuario_email", user?.email || "")
      formData.append("usuario_role", perfil?.role || "Colaborador")
      formData.append("titulo", titulo.trim() || "Relato de Situação")
      formData.append("relato", relatoTexto.trim())

      if (selectedImage) {
        formData.append("imagem", selectedImage)
      }

      const res = await fetch("/api/relatos-situacoes", {
        method: "POST",
        body: formData
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Não foi possível enviar o relato.")
      }

      toast.success("Relato enviado com sucesso! O Administrador foi notificado.", { id: toastId })
      
      // Invalida cache para que o Administrador veja o novo relato imediatamente
      lastFetchedAt = 0
      
      // Limpa formulário e fecha janela
      setTitulo("")
      setRelatoTexto("")
      handleRemoveSelectedImage()
      onClose()
    } catch (err: any) {
      console.error("Erro ao enviar relato:", err)
      toast.error(err?.message || "Erro ao enviar o relato.", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ações do Administrador: Alternar Lido
  const handleToggleLido = async (item: RelatoItem) => {
    const newStatus = !item.lido
    // Atualização otimista no estado e no cache
    setRelatos(prev => prev.map(r => r.id === item.id ? { ...r, lido: newStatus } : r))
    if (cachedRelatos) {
      cachedRelatos = cachedRelatos.map(r => r.id === item.id ? { ...r, lido: newStatus } : r)
    }

    try {
      const res = await fetch("/api/relatos-situacoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, lido: newStatus })
      })
      if (!res.ok) {
        throw new Error("Erro ao atualizar status.")
      }
      toast.success(newStatus ? "Marcado como lido." : "Marcado como não lido.")
    } catch (err) {
      // Reverte em caso de erro
      setRelatos(prev => prev.map(r => r.id === item.id ? { ...r, lido: item.lido } : r))
      if (cachedRelatos) {
        cachedRelatos = cachedRelatos.map(r => r.id === item.id ? { ...r, lido: item.lido } : r)
      }
      toast.error("Erro ao atualizar status do relato.")
    }
  }

  // Ações do Administrador: Excluir Relato
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    const toastId = toast.loading("Excluindo relato...")

    try {
      const res = await fetch("/api/relatos-situacoes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemToDelete.id })
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao excluir relato.")
      }

      toast.success("Relato excluído com sucesso!", { id: toastId })
      setRelatos(prev => prev.filter(r => r.id !== itemToDelete.id))
      if (cachedRelatos) {
        cachedRelatos = cachedRelatos.filter(r => r.id !== itemToDelete.id)
      }
      setItemToDelete(null)
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir o relato.", { id: toastId })
    } finally {
      setDeleting(false)
    }
  }

  // Relatos filtrados para o Administrador
  const filteredRelatos = relatos.filter(r => {
    if (filterLido === "nao_lidos") return !r.lido
    if (filterLido === "lidos") return r.lido
    return true
  })

  const naoLidosCount = relatos.filter(r => !r.lido).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* ========================================================================= */}
        {/* HEADER DO MODAL */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F172B] dark:bg-amber-600 text-white flex items-center justify-center shadow-sm">
              <MessageSquareWarning className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                {isAdmin ? "Situações relatadas" : "Relatar situação"}
                {isAdmin && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    naoLidosCount > 0 
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse" 
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {naoLidosCount} pendente{naoLidosCount === 1 ? "" : "s"}
                  </span>
                )}
              </h3>
              <p className="text-[12px] sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                {isAdmin
                  ? "Fila de relatos e dúvidas enviadas pela equipe para acompanhamento"
                  : "Descreva a situação, dúvida ou print de conversa para ciência do Administrador"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => fetchRelatos(true)}
                disabled={refreshing || loadingRelatos}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Atualizar fila de relatos"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-amber-500" : ""}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CORPO DO MODAL */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40">
          
          {/* --------------------------------------------------------------------- */}
          {/* VISÃO DO USUÁRIO COMUM (Formulário sem histórico)                      */}
          {/* --------------------------------------------------------------------- */}
          {!isAdmin ? (
            <form 
              id="form-relato-situacao"
              onSubmit={handleSubmitRelato} 
              onPaste={handlePasteImage}
              className="space-y-4 max-w-xl mx-auto py-2"
            >
              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                  Este canal é enviado exclusivamente para a direção/administração analisar a situação.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assunto / título (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Dúvida com cliente sobre portabilidade, impasse na esteira..."
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Descrição detalhada do relato <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Escreva com suas palavras o que aconteceu, as mensagens trocadas, o cliente em questão ou o motivo da sua dúvida... (você pode colar um print com Ctrl+V aqui)"
                  value={relatoTexto}
                  onChange={(e) => setRelatoTexto(e.target.value)}
                  className="w-full p-3.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172B] resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Anexar arquivo, print, vídeo, áudio ou documento (opcional)
                </label>
                
                {imagePreviewUrl ? (
                  <div className="relative border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-900/10 dark:bg-slate-900/60 p-2.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 pr-8">
                        {detectAttachmentType(selectedImage?.name, selectedImage?.type) === "imagem" && <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />}
                        {detectAttachmentType(selectedImage?.name, selectedImage?.type) === "video" && <Video className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {detectAttachmentType(selectedImage?.name, selectedImage?.type) === "audio" && <Volume2 className="w-4 h-4 text-amber-500 shrink-0" />}
                        {detectAttachmentType(selectedImage?.name, selectedImage?.type) === "documento" && <FileText className="w-4 h-4 text-purple-500 shrink-0" />}
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {selectedImage?.name || "Arquivo anexado"}
                        </span>
                        {selectedImage?.size ? (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({(selectedImage.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveSelectedImage}
                        className="p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs cursor-pointer shrink-0"
                        title="Remover anexo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Previews por tipo de mídia */}
                    {detectAttachmentType(selectedImage?.name, selectedImage?.type) === "imagem" && (
                      <div className="relative rounded-lg overflow-hidden max-h-48 flex justify-center bg-black/5 dark:bg-black/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={imagePreviewUrl} 
                          alt="Pré-visualização do anexo" 
                          className="max-h-48 w-auto object-contain rounded-lg"
                        />
                      </div>
                    )}

                    {detectAttachmentType(selectedImage?.name, selectedImage?.type) === "video" && (
                      <video 
                        src={imagePreviewUrl} 
                        controls 
                        className="max-h-48 w-full rounded-lg bg-black" 
                      />
                    )}

                    {detectAttachmentType(selectedImage?.name, selectedImage?.type) === "audio" && (
                      <audio 
                        src={imagePreviewUrl} 
                        controls 
                        className="w-full mt-1" 
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="anexo-print-relato"
                    />
                    <label
                      htmlFor="anexo-print-relato"
                      className="h-9 px-3.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
                    >
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      <span>Selecionar Arquivo / Mídia</span>
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Imagens, vídeos, áudios, PDF ou copie e cole com <kbd className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300">Ctrl + V</kbd>
                    </span>
                  </div>
                )}
              </div>
            </form>
          ) : (
            /* ----------------------------------------------------------------- */
            /* VISÃO DO ADMINISTRADOR (Fila vertical mais recente -> mais antigo) */
            /* ----------------------------------------------------------------- */
            <div className="space-y-4">
              
              {/* Barra de Filtros da Fila */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  {[
                    { id: "todos", label: "Todos", count: relatos.length },
                    { id: "nao_lidos", label: "Não Lidos", count: naoLidosCount },
                    { id: "lidos", label: "Lidos", count: relatos.length - naoLidosCount }
                  ].map(f => {
                    const isSelected = filterLido === f.id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilterLido(f.id as any)}
                        className={`h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-[#0F172B] text-white shadow-xs"
                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                        }`}
                      >
                        <span>{f.label}</span>
                        <span className="text-[10px] opacity-80">({f.count})</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {loadingRelatos ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  <p className="text-xs font-semibold">Carregando fila de relatos...</p>
                </div>
              ) : filteredRelatos.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Nenhum relato encontrado nesta lista
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    {filterLido === "nao_lidos" 
                      ? "Todas as situações reportadas pela equipe já foram marcadas como lidas." 
                      : "Nenhum usuário enviou relatos até o momento."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRelatos.map((item) => {
                    const dateFormatted = new Date(item.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })

                    return (
                      <div
                        key={item.id}
                        className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all shadow-xs ${
                          item.lido
                            ? "border-slate-200 dark:border-slate-800 opacity-80"
                            : "border-amber-300 dark:border-amber-800/80 ring-2 ring-amber-500/10 bg-amber-50/20"
                        }`}
                      >
                        {/* Topo do Card: Identificação do Autor e Data */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                              {item.usuario_nome.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                  {item.usuario_nome}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {item.usuario_role || "Colaborador"}
                                </span>
                              </div>
                              {item.usuario_email && (
                                <p className="text-[11px] text-slate-400">{item.usuario_email}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              item.lido
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}>
                              {item.lido ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {item.lido ? "Lido" : "Não Lido"}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {dateFormatted}
                            </span>
                          </div>
                        </div>

                        {/* Conteúdo do Relato */}
                        <div className="py-3 space-y-2">
                          {item.titulo && (
                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                              {item.titulo}
                            </h4>
                          )}
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {item.relato}
                          </p>

                          {/* Anexo Multimídia (Imagem, Vídeo, Áudio ou Documento) */}
                          {item.imagem_url && (
                            <div className="pt-2">
                              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                                Anexo Enviado:
                              </span>

                              {detectAttachmentType(item.imagem_url) === "imagem" && (
                                <div className="space-y-1.5">
                                  <div 
                                    onClick={() => setPreviewImage(item.imagem_url!)}
                                    className="relative inline-block max-w-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-pointer group shadow-xs hover:border-blue-400 transition-all bg-black/5"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={item.imagem_url}
                                      alt="Print anexado ao relato"
                                      className="h-32 w-auto max-w-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <Eye className="w-5 h-5 drop-shadow" />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewImage(item.imagem_url!)}
                                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Visualizar Imagem Ampliada</span>
                                    </button>
                                    <span className="text-slate-300 dark:text-slate-700">•</span>
                                    <a
                                      href={item.imagem_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                      <span>Abrir original</span>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              )}

                              {detectAttachmentType(item.imagem_url) === "video" && (
                                <div className="space-y-1.5">
                                  <video 
                                    src={item.imagem_url} 
                                    controls 
                                    className="w-full max-w-md max-h-56 rounded-xl bg-black shadow-xs" 
                                  />
                                </div>
                              )}

                              {detectAttachmentType(item.imagem_url) === "audio" && (
                                <div className="space-y-1.5">
                                  <audio 
                                    src={item.imagem_url} 
                                    controls 
                                    className="w-full max-w-md" 
                                  />
                                </div>
                              )}

                              {detectAttachmentType(item.imagem_url) === "documento" && (
                                <a
                                  href={item.imagem_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
                                >
                                  <FileText className="w-4 h-4 text-blue-600" />
                                  <span>Visualizar Documento Anexo</span>
                                  <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-1" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Ações do Administrador no Card */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleToggleLido(item)}
                            className={`h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              item.lido
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{item.lido ? "Marcar como Não Lido" : "Marcar como Lido"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            className="h-8 px-3 rounded-lg text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Excluir este relato"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* RODAPÉ DO MODAL */}
        {/* ========================================================================= */}
        {!isAdmin ? (
          <div className="px-5 sm:px-7 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-end">
            <button
              type="submit"
              form="form-relato-situacao"
              disabled={isSubmitting || !relatoTexto.trim()}
              className="w-full sm:w-auto h-10 px-6 text-xs font-bold bg-[#0F172B] hover:bg-slate-800 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-[#00D492]" />}
              {isSubmitting ? "Enviando..." : "Enviar relato ao Administrador"}
            </button>
          </div>
        ) : (
          <div className="px-5 sm:px-7 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

      </div>

      {/* Lightbox para Imagem / Print Ampliado */}
      {previewImage && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 rounded-full cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Print ampliado"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Relato (Administrador) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-slate-900 dark:text-white text-center mb-1.5">
              Excluir Relato
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
              Tem certeza que deseja excluir o relato de <strong className="text-slate-800 dark:text-slate-200">{itemToDelete.usuario_nome}</strong>? Esta ação é definitiva e removerá o registro da fila.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setItemToDelete(null)}
                className="flex-1 h-9 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 h-9 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
