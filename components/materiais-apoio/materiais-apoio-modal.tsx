"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { 
  X, 
  Upload, 
  Download, 
  Trash2, 
  Play, 
  Pause, 
  Video, 
  Image as ImageIcon, 
  Volume2, 
  FileText, 
  Search, 
  FolderOpen, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Filter
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface MaterialItem {
  id: string
  name: string
  url: string
  size: number
  created_at: string
  tipo: "video" | "imagem" | "audio" | "documento" | "outro"
  tituloFormatado: string
}

interface MateriaisApoioModalProps {
  isOpen: boolean
  onClose: () => void
  canUpload: boolean
}

const PRIMARY_BUCKET = "material_apoio"
const FALLBACK_BUCKET = "material_apoioi"

// Cache em memória para abertura instantânea e redução de requisições ao Supabase
let materialsCache: MaterialItem[] | null = null
let activeBucketCache: string = PRIMARY_BUCKET
let lastFetchedAt: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos de validade antes de revalidar em background

export function MateriaisApoioModal({ isOpen, onClose, canUpload }: MateriaisApoioModalProps) {
  const [activeBucket, setActiveBucket] = useState<string>(() => activeBucketCache)
  const [materials, setMaterials] = useState<MaterialItem[]>(() => materialsCache || [])
  const [loading, setLoading] = useState<boolean>(() => !materialsCache)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedFilter, setSelectedFilter] = useState<string>("todos")
  
  // Preview States
  const [previewItem, setPreviewItem] = useState<MaterialItem | null>(null)
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Delete Confirmation States
  const [itemToDelete, setItemToDelete] = useState<MaterialItem | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)

  // Upload Form States
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [customTitle, setCustomTitle] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Detect file type helper
  const detectFileType = (fileName: string, mime?: string): MaterialItem["tipo"] => {
    const ext = fileName.split(".").pop()?.toLowerCase() || ""
    if (mime?.startsWith("video/") || ["mp4", "mov", "webm", "avi", "mkv", "m4v"].includes(ext)) {
      return "video"
    }
    if (mime?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp"].includes(ext)) {
      return "imagem"
    }
    if (mime?.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) {
      return "audio"
    }
    if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(ext)) {
      return "documento"
    }
    return "outro"
  }

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Format readable title
  const cleanFileName = (fileName: string): string => {
    // Se tiver timestamp prefix (ex: 1730000000000_nome.mp4), limpa
    const withoutPrefix = fileName.replace(/^\d+[-_]/, "")
    // Remove extensão
    const lastDot = withoutPrefix.lastIndexOf(".")
    const nameWithoutExt = lastDot > 0 ? withoutPrefix.substring(0, lastDot) : withoutPrefix
    // Troca traços/underscores por espaços
    return nameWithoutExt.replace(/[-_]+/g, " ").trim()
  }

  // Fetch materials com SWR: abertura instantânea a partir do cache + sincronização automática em background
  const loadMaterials = useCallback(async (force = false) => {
    const hasCache = materialsCache !== null

    // Se já temos cache, exibe imediatamente na tela sem qualquer loading bloqueante
    if (hasCache && !force) {
      setMaterials(materialsCache!)
      setLoading(false)
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const res = await fetch(`/api/materiais-apoio?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Pragma": "no-cache" }
      })
      const json = await res.json()

      if (json.success && Array.isArray(json.files)) {
        materialsCache = json.files
        lastFetchedAt = Date.now()
        setMaterials(json.files)
        if (json.bucket) {
          activeBucketCache = json.bucket
          setActiveBucket(json.bucket)
        }
      } else if (!hasCache) {
        setMaterials([])
      }
    } catch (err) {
      console.warn("Aviso ao sincronizar materiais de apoio:", err)
      if (!hasCache) {
        setMaterials([])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadMaterials(false)
    } else {
      // Limpar preview de áudio ao fechar
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setAudioPlayingId(null)
      setPreviewItem(null)
      setItemToDelete(null)
      setShowUploadForm(false)
      setSelectedFile(null)
      setCustomTitle("")
    }
  }, [isOpen, loadMaterials])

  // Handle Download file
  const handleDownload = async (item: MaterialItem) => {
    const toastId = toast.loading(`Iniciando download de ${item.tituloFormatado}...`)
    try {
      // Download via fetch blob ou link direto
      const response = await fetch(item.url)
      if (!response.ok) throw new Error("Erro na requisição do arquivo")
      
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = item.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      toast.success("Download concluído com sucesso!", { id: toastId })
    } catch (err) {
      // Fallback: abrir em nova aba / download nativo do navegador
      const a = document.createElement("a")
      a.href = item.url
      a.download = item.name
      a.target = "_blank"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success("Download iniciado via navegador!", { id: toastId })
    }
  }

  // Handle Upload (apenas Supervisor e Administrador)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      toast.error("Por favor, selecione um arquivo para upload.")
      return
    }

    setUploading(true)
    const toastId = toast.loading(`Enviando material para o bucket...`)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("customTitle", customTitle.trim() || selectedFile.name)

      const res = await fetch("/api/materiais-apoio", {
        method: "POST",
        body: formData
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Falha no upload do arquivo.")
      }

      toast.success("Material de apoio adicionado com sucesso!", { id: toastId })
      setSelectedFile(null)
      setCustomTitle("")
      setShowUploadForm(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      await loadMaterials(true)
    } catch (err: any) {
      console.error("Erro ao fazer upload do material:", err)
      toast.error(err?.message || "Erro ao realizar upload do arquivo.", { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  // Handle Delete Confirmation (substitui window.confirm que é bloqueado em iframe)
  const handleConfirmDelete = async () => {
    if (!itemToDelete || !canUpload) return
    setDeleting(true)
    const toastId = toast.loading("Removendo material...")
    try {
      const res = await fetch("/api/materiais-apoio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: itemToDelete.name })
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Falha ao remover arquivo.")
      }

      toast.success("Material removido com sucesso!", { id: toastId })
      if (previewItem?.id === itemToDelete.id || previewItem?.name === itemToDelete.name) {
        setPreviewItem(null)
      }
      // Remove do cache em memória e do estado imediatamente (por id e por name)
      const updated = (materialsCache || []).filter(
        m => m.id !== itemToDelete.id && m.name !== itemToDelete.name
      )
      materialsCache = updated
      setMaterials(updated)
      setItemToDelete(null)
    } catch (err: any) {
      console.error("Erro ao excluir material:", err)
      toast.error(err?.message || "Erro ao excluir arquivo.", { id: toastId })
    } finally {
      setDeleting(false)
    }
  }

  // Handle Play/Pause Audio
  const togglePlayAudio = (item: MaterialItem) => {
    if (audioPlayingId === item.id) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setAudioPlayingId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.src = item.url
        audioRef.current.play().catch(console.error)
      }
      setAudioPlayingId(item.id)
    }
  }

  // Filtered and Searched items
  const filteredMaterials = useMemo(() => {
    return materials.filter(item => {
      const matchesSearch = 
        item.tituloFormatado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = 
        selectedFilter === "todos" || 
        item.tipo === selectedFilter

      return matchesSearch && matchesCategory
    })
  }, [materials, searchTerm, selectedFilter])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Hidden audio element for inline preview */}
      <audio 
        ref={audioRef} 
        onEnded={() => setAudioPlayingId(null)} 
        onError={() => setAudioPlayingId(null)}
        className="hidden" 
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Header da Janela */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F172B] dark:bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <FolderOpen className="w-5 h-5 text-[#00D492]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                Materiais de Apoio
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {materials.length} {materials.length === 1 ? "arquivo" : "arquivos"}
                </span>
              </h3>
              <p className="text-[12px] sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                Vídeos, imagens, áudios e documentos para suporte às operações
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canUpload && (
              <button
                type="button"
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="h-9 px-3.5 sm:px-4 text-[11px] font-black uppercase tracking-wider bg-[#0F172B] hover:bg-slate-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#00D492]" />
                <span className="hidden sm:inline">{showUploadForm ? "Cancelar Upload" : "Enviar Material"}</span>
                <span className="sm:hidden">{showUploadForm ? "Cancelar" : "Upload"}</span>
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

        {/* Formulário Retrátil de Upload (Restrito a Supervisor e Administrador) */}
        {canUpload && showUploadForm && (
          <form onSubmit={handleUploadSubmit} className="bg-blue-50/70 dark:bg-slate-800/80 p-4 sm:p-5 border-b border-blue-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-end transition-all">
            <div className="w-full sm:flex-1">
              <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">
                Título / Descrição do Material
              </label>
              <input
                type="text"
                placeholder="Ex: Áudio de Abordagem Matadora, Tabela de Coeficientes..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172B]"
              />
            </div>

            <div className="w-full sm:w-auto">
              <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">
                Arquivo (Vídeo, Imagem, Áudio ou Doc)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                required
                accept="video/*,image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0])
                    if (!customTitle) {
                      setCustomTitle(cleanFileName(e.target.files[0].name))
                    }
                  }
                }}
                className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-[#0F172B] file:text-white hover:file:bg-slate-800 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full sm:w-auto h-9 px-5 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Enviando..." : "Confirmar Envio"}
            </button>
          </form>
        )}

        {/* Barra de Filtros e Busca */}
        <div className="px-5 sm:px-7 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Categorias / Abas */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "todos", label: "Todos", icon: Filter },
              { id: "video", label: "Vídeos", icon: Video },
              { id: "imagem", label: "Imagens", icon: ImageIcon },
              { id: "audio", label: "Áudios", icon: Volume2 },
              { id: "documento", label: "Documentos", icon: FileText }
            ].map(cat => {
              const Icon = cat.icon
              const isSelected = selectedFilter === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedFilter(cat.id)}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-[#0F172B] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>

          {/* Campo de Pesquisa */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar materiais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F172B]"
            />
          </div>
        </div>

        {/* Conteúdo Principal com Lista de Materiais e Pré-visualização */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#00D492]" />
              <p className="text-xs font-semibold">Carregando materiais de apoio...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <FolderOpen className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Nenhum material encontrado
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {searchTerm
                  ? "Tente buscar por outro termo ou remova os filtros aplicados."
                  : canUpload
                  ? "Clique no botão 'Enviar Material' acima para nutrir a área de materiais."
                  : "Nenhum material de apoio foi disponibilizado no momento."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredMaterials.map((item) => {
                const isPlaying = audioPlayingId === item.id

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs group"
                  >
                    <div>
                      {/* Topo do Card: Badge de Tipo e Data */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            item.tipo === "video"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : item.tipo === "imagem"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : item.tipo === "audio"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {item.tipo === "video" && <Video className="w-3 h-3" />}
                          {item.tipo === "imagem" && <ImageIcon className="w-3 h-3" />}
                          {item.tipo === "audio" && <Volume2 className="w-3 h-3" />}
                          {item.tipo === "documento" && <FileText className="w-3 h-3" />}
                          {item.tipo}
                        </span>

                        <span className="text-[10px] text-slate-400 font-bold">
                          {formatBytes(item.size)}
                        </span>
                      </div>

                      {/* Título do Material */}
                      <h4 
                        className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors"
                        title={item.name}
                      >
                        {item.tituloFormatado}
                      </h4>

                      {/* Pré-visualização Inline */}
                      {item.tipo === "imagem" && (
                        <div 
                          onClick={() => setPreviewItem(item)}
                          className="relative h-28 w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden mb-3 cursor-pointer group/img"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={item.tituloFormatado}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              if (!e.currentTarget.src.includes("/api/materiais-apoio?file=")) {
                                e.currentTarget.src = `/api/materiais-apoio?file=${encodeURIComponent(item.name)}`
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-5 h-5 drop-shadow" />
                          </div>
                        </div>
                      )}

                      {item.tipo === "video" && (
                        <div className="relative h-28 w-full bg-slate-900 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            className="absolute w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-900 flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                            title="Reproduzir Vídeo"
                          >
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </button>
                        </div>
                      )}

                      {item.tipo === "audio" && (
                        <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 p-2.5 rounded-lg mb-3 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(item)}
                            className="w-8 h-8 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs"
                            title={isPlaying ? "Pausar Áudio" : "Ouvir Áudio"}
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-amber-900 dark:text-amber-200 truncate">
                              {isPlaying ? "Reproduzindo áudio..." : "Clique no play para ouvir"}
                            </p>
                          </div>
                        </div>
                      )}

                      {item.tipo === "documento" && (
                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg mb-3 flex items-center gap-2.5">
                          <FileText className="w-6 h-6 text-slate-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                              {item.name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações do Card: Download para todos, Excluir para Admin/Supervisor */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        className="flex-1 h-8 px-3 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Baixar material"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Baixar</span>
                      </button>

                      {/* Botão de Preview quando aplicável */}
                      {(item.tipo === "video" || item.tipo === "imagem") && (
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      {/* Excluir (somente Supervisor / Administrador) */}
                      {canUpload && (
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="h-8 px-2.5 rounded-lg text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Excluir arquivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-5 sm:px-7 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* Lightbox / Modal de Pré-visualização Ampliada */}
      {previewItem && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewItem(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 rounded-full cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {previewItem.tipo === "imagem" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewItem.url}
                alt={previewItem.tituloFormatado}
                className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
                onError={(e) => {
                  if (!e.currentTarget.src.includes("/api/materiais-apoio?file=")) {
                    e.currentTarget.src = `/api/materiais-apoio?file=${encodeURIComponent(previewItem.name)}`
                  }
                }}
              />
            )}

            {previewItem.tipo === "video" && (
              <video
                src={previewItem.url}
                controls
                autoPlay
                className="max-h-[80vh] max-w-full rounded-xl shadow-2xl bg-black"
              />
            )}

            <div className="mt-3 flex items-center justify-between w-full max-w-xl bg-slate-900/80 text-white px-4 py-2 rounded-xl border border-slate-700">
              <span className="text-xs font-bold truncate mr-3">{previewItem.tituloFormatado}</span>
              <button
                type="button"
                onClick={() => handleDownload(previewItem)}
                className="h-7 px-3 rounded-lg text-xs font-bold bg-[#00D492] hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Baixar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Customizado de Confirmação de Exclusão (Funciona 100% no iframe) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-slate-900 dark:text-white text-center mb-1.5">
              Confirmar Exclusão
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
              Tem certeza que deseja excluir o material <strong className="text-slate-800 dark:text-slate-200">&ldquo;{itemToDelete.tituloFormatado}&rdquo;</strong>? Esta ação removerá o arquivo permanentemente do bucket de apoio.
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
                className="flex-1 h-9 px-4 text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
