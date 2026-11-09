"use client"

import React, { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { FilePreviewModal } from "@/components/propostas/file-preview-modal"
import { 
  Target, 
  Search, 
  User, 
  Award, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  TrendingUp, 
  Compass, 
  Copy, 
  Plus, 
  Trash2, 
  Pencil, 
  ArrowLeft, 
  Calendar, 
  ChevronRight, 
  ExternalLink, 
  Save, 
  Check, 
  Briefcase, 
  Sparkles,
  Building2,
  Mail,
  Phone,
  LayoutGrid,
  List,
  ChevronDown,
  X,
  Bold,
  Italic,
  Underline,
  Highlighter,
  Palette,
  Paperclip,
  FileText,
  Film,
  Volume2,
  Loader2,
  Download
} from "lucide-react"

// Types
export type EtapaProfissional = 
  | "Integração" 
  | "Desenvolvimento" 
  | "Acompanhamento" 
  | "Preparação para Promoção/Efetivação"
  | "Outros"

export interface WeeklyLog {
  acaoPrevista: string
  evidenciaObservada: string
  status: "Não iniciado" | "Em andamento" | "Concluído" | "Precisa de reforço"
  proximoPasso: string
}

export interface PDIAttachment {
  id: string
  name: string
  url: string
  type: string
  size?: number
}

export interface PDIFeedback {
  id: string
  data: string
  responsavel: string
  contexto: string
  percepcaoFuncionario: string
  pontosPositivos: string
  pontosMelhoria: string
  combinados: string
  dataRetorno: string
  anexos?: PDIAttachment[]
}

export interface PDIComportamento {
  id: string
  comportamento: string
  situacao: string
  impacto: string
  comportamentoEsperado: string
  prioridade: "Alta" | "Média" | "Baixa"
  status: "Não iniciado" | "Em desenvolvimento" | "Consolidado"
}

export interface PDIAcao {
  id: string
  objetivo: string
  acoesPraticas: string
  responsavel: string
  prazo: string
  frequencia: "Semanal" | "Quinzenal" | "Mensal"
  indicador: string
  resultadoEsperado: string
  resultadoAlcancado: string
  status: "Não iniciado" | "Em andamento" | "Concluído" | "Precisa de reforço"
}

export interface PDIEvidencia {
  id: string
  titulo: string
  atividadesConcluidas: string
  situacaoReal: string
  resultadoAntesDepois: string
  linkDocumento: string
  evidenciaAplicacao: string
  validacaoLideranca: "Validado" | "Em análise" | "Necessita reforço"
  dataValidacao: string
}

export interface PDIData {
  // 1. Perfil & Contexto
  etapaProfissional: EtapaProfissional
  etapaProfissionalOutros?: string
  liderancaDireta: string
  area: string
  cargo: string
  objetivosProfissionais: string
  interessesCrescimento: string
  
  // 2. Habilidades & Forças
  habilidadesTecnicas: Array<{ nome: string; nivel: "Básico" | "Intermediário" | "Avançado" }>
  habilidadesComportamentais: string[]
  pontosFortes: string[]
  competenciasNovas: string[]

  // 3. Histórico de Feedbacks
  feedbacks: PDIFeedback[]

  // 4. Comportamentos a Desenvolver
  comportamentos: PDIComportamento[]

  // 5. Plano de Ação & Registro Semanal
  acoes: PDIAcao[]
  registroSemanal: {
    semana1: WeeklyLog
    semana2: WeeklyLog
    semana3: WeeklyLog
    semana4: WeeklyLog
  }

  // 6. Evidências & Entregas
  evidencias: PDIEvidencia[]

  // 7. Evolução & Reavaliações
  avaliacaoInicial: string
  revisoesPeriodicas: string
  evolucoesPercebidas: string
  pontosAtencao: string
  validacaoRotina: string
  proximosPassosEvolucao: string

  // 8. Potencial & Próximos Passos
  competenciasProximoNivel: string
  preparacaoNovasResponsabilidades: string
  necessidadesTreinamento: string
  criteriosEfetivacao: string
  decisoesAcordadas: string
  prontidao: "Pronto para Promoção" | "Pronto em 3-6 Meses" | "Em Desenvolvimento Ativo" | "Foco no Cargo Atual"
}

export interface CollaboratorBasic {
  id: string
  name: string
  role: string
  employmentType?: string
  cnpj?: string
  avatarUrl?: string
  area?: string
  email?: string
  phone?: string
  joinDate?: string
  status?: string
  usuarioId?: string
  workLocation?: string
  pdiData?: PDIData
}

function safeFormatDate(dateStr: any, fallback = "2026"): string {
  if (!dateStr) return fallback
  const s = String(dateStr).trim()
  if (s.includes("/")) return s
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR")
  return s || fallback
}

export function isPJCollaborator(regime?: string, role?: string, cnpj?: string, metaIncentives?: string): boolean {
  const r = (regime || "").toUpperCase().trim()
  const f = (role || "").toUpperCase().trim()
  const c = (cnpj || "").trim()

  if (r === "PJ" || r.includes("PJ")) return true
  if (f === "PJ" || f.startsWith("PJ ") || f.endsWith(" PJ")) return true
  if (c && c.length > 0 && c !== "-") return true

  if (metaIncentives && metaIncentives.startsWith("{") && metaIncentives.includes('"__meta":true')) {
    try {
      const parsed = JSON.parse(metaIncentives)
      if (parsed.empType && String(parsed.empType).toUpperCase().includes("PJ")) return true
    } catch {}
  }

  return false
}

export function isActiveCollaborator(status?: string, dataDemissao?: string | null): boolean {
  if (dataDemissao && dataDemissao.trim().length > 0) return false
  const s = (status || "Ativo").toLowerCase().trim()
  return s !== "inativo" && s !== "desligado" && s !== "demitido"
}

const DEFAULT_WEEKLY_LOG: WeeklyLog = {
  acaoPrevista: "",
  evidenciaObservada: "",
  status: "Em andamento",
  proximoPasso: ""
}

function createBlankPDIData(colab?: Partial<CollaboratorBasic>): PDIData {
  return {
    etapaProfissional: "Desenvolvimento",
    etapaProfissionalOutros: "",
    liderancaDireta: "",
    area: colab?.area || "",
    cargo: colab?.role || "",
    objetivosProfissionais: "",
    interessesCrescimento: "",
    
    habilidadesTecnicas: [],
    habilidadesComportamentais: [],
    pontosFortes: [],
    competenciasNovas: [],

    feedbacks: [],
    comportamentos: [],
    acoes: [],

    registroSemanal: {
      semana1: { acaoPrevista: "", evidenciaObservada: "", status: "Não iniciado", proximoPasso: "" },
      semana2: { acaoPrevista: "", evidenciaObservada: "", status: "Não iniciado", proximoPasso: "" },
      semana3: { acaoPrevista: "", evidenciaObservada: "", status: "Não iniciado", proximoPasso: "" },
      semana4: { acaoPrevista: "", evidenciaObservada: "", status: "Não iniciado", proximoPasso: "" }
    },

    evidencias: [],

    avaliacaoInicial: "",
    revisoesPeriodicas: "",
    evolucoesPercebidas: "",
    pontosAtencao: "",
    validacaoRotina: "",
    proximosPassosEvolucao: "",

    competenciasProximoNivel: "",
    preparacaoNovasResponsabilidades: "",
    necessidadesTreinamento: "",
    criteriosEfetivacao: "",
    decisoesAcordadas: "",
    prontidao: "Em Desenvolvimento Ativo"
  }
}

function toDateInputValue(val?: string): string {
  if (!val) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const parts = val.split("/")
  if (parts.length === 3) {
    const [d, m, y] = parts
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  return ""
}

function formatDateBR(val?: string): string {
  if (!val) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-")
    return `${d}/${m}/${y}`
  }
  return val
}

function getAttachmentIcon(type?: string) {
  if (!type) return <Paperclip className="w-3.5 h-3.5 text-slate-500" />
  const lower = type.toLowerCase()
  if (lower.startsWith("image/") || lower.includes("png") || lower.includes("jpg") || lower.includes("jpeg")) {
    return <Sparkles className="w-3.5 h-3.5 text-blue-500" />
  }
  if (lower.startsWith("video/") || lower.includes("mp4") || lower.includes("mov")) {
    return <Film className="w-3.5 h-3.5 text-purple-500" />
  }
  if (lower.startsWith("audio/") || lower.includes("mp3") || lower.includes("wav") || lower.includes("ogg")) {
    return <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
  }
  if (lower.includes("pdf") || lower.includes("doc") || lower.includes("sheet") || lower.includes("text")) {
    return <FileText className="w-3.5 h-3.5 text-rose-500" />
  }
  return <Paperclip className="w-3.5 h-3.5 text-slate-500" />
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function renderFormattedFeedbackText(text: string) {
  if (!text) return "—"
  if (text.includes("<") && text.includes(">")) {
    return (
      <div 
        className="font-normal text-slate-800 whitespace-pre-wrap break-words leading-relaxed [&_mark]:px-1 [&_mark]:py-0.5 [&_mark]:rounded [&_span]:inline"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    )
  }
  return <p className="font-normal text-slate-800 whitespace-pre-wrap break-words">{text}</p>
}

function FormattedFeedbackField({
  label,
  labelColor,
  value,
  onChange,
  placeholder,
  rows = 3
}: {
  label: string
  labelColor: string
  value: string
  onChange: (val: string) => void
  placeholder: string
  rows?: number
}) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showBgPicker, setShowBgPicker] = useState(false)

  const fontColors = [
    { name: "Preto", hex: "#0f172a" },
    { name: "Azul", hex: "#2563eb" },
    { name: "Verde", hex: "#16a34a" },
    { name: "Vermelho", hex: "#dc2626" },
    { name: "Laranja", hex: "#ea580c" },
    { name: "Roxo", hex: "#9333ea" },
  ]

  const bgColors = [
    { name: "Amarelo", hex: "#fef08a" },
    { name: "Verde", hex: "#bbf7d0" },
    { name: "Azul", hex: "#bfdbfe" },
    { name: "Rosa", hex: "#fbcfe8" },
    { name: "Laranja", hex: "#fed7aa" },
  ]

  // Sincroniza o innerHTML com o value externo (abertura de modal, edições externas)
  useEffect(() => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML
      const cleanVal = value || ""
      if (currentHtml !== cleanVal) {
        editorRef.current.innerHTML = cleanVal
      }
    }
  }, [value])

  const handleInput = () => {
    if (!editorRef.current) return
    const rawHtml = editorRef.current.innerHTML
    if (rawHtml === "<br>" || rawHtml === "<p><br></p>" || editorRef.current.innerText.trim() === "") {
      onChange("")
    } else {
      onChange(rawHtml)
    }
  }

  const execCmd = (command: string, val: string | undefined = undefined) => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    document.execCommand(command, false, val)
    handleInput()
  }

  const applyBullet = () => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      editor.innerHTML = (editor.innerHTML || "") + "•&nbsp;"
      handleInput()
      return
    }
    const range = sel.getRangeAt(0)
    const bulletNode = document.createTextNode("• ")
    range.insertNode(bulletNode)
    range.setStartAfter(bulletNode)
    range.setEndAfter(bulletNode)
    sel.removeAllRanges()
    sel.addRange(range)
    handleInput()
  }

  const applyColor = (hex: string) => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      const span = document.createElement("span")
      span.setAttribute("style", `color: ${hex}`)
      span.textContent = "texto"
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        range.insertNode(span)
        range.selectNodeContents(span)
        sel.removeAllRanges()
        sel.addRange(range)
      } else {
        editor.appendChild(span)
      }
    } else {
      const range = sel.getRangeAt(0)
      const selectedContent = range.extractContents()
      const span = document.createElement("span")
      span.setAttribute("style", `color: ${hex}`)
      span.appendChild(selectedContent)
      range.insertNode(span)
      sel.removeAllRanges()
      const newRange = document.createRange()
      newRange.selectNode(span)
      sel.addRange(newRange)
    }
    handleInput()
  }

  const applyHighlight = (hex: string) => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      const mark = document.createElement("mark")
      mark.setAttribute("style", `background-color: ${hex}; padding: 1px 4px; border-radius: 4px`)
      mark.textContent = "destaque"
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        range.insertNode(mark)
        range.selectNodeContents(mark)
        sel.removeAllRanges()
        sel.addRange(range)
      } else {
        editor.appendChild(mark)
      }
    } else {
      const range = sel.getRangeAt(0)
      const selectedContent = range.extractContents()
      const mark = document.createElement("mark")
      mark.setAttribute("style", `background-color: ${hex}; padding: 1px 4px; border-radius: 4px`)
      mark.appendChild(selectedContent)
      range.insertNode(mark)
      sel.removeAllRanges()
      const newRange = document.createRange()
      newRange.selectNode(mark)
      sel.addRange(newRange)
    }
    handleInput()
  }

  const minHeightPx = Math.max(76, rows * 24)

  return (
    <div className="space-y-1">
      {(showColorPicker || showBgPicker) && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => { setShowColorPicker(false); setShowBgPicker(false); }} 
        />
      )}
      <div className="flex items-center justify-between">
        <label className={cn("font-bold block text-xs", labelColor)}>{label}</label>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:border-[#00D492] focus-within:bg-white transition-all shadow-xs">
        {/* Barra de Ferramentas */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-2 py-1 flex items-center gap-1 flex-wrap select-none relative">
          <button
            type="button"
            title="Negrito"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("bold")
            }}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-slate-700 hover:text-slate-900 border border-transparent hover:border-slate-300 transition-colors cursor-pointer text-xs font-bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="Itálico"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("italic")
            }}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-slate-700 hover:text-slate-900 border border-transparent hover:border-slate-300 transition-colors cursor-pointer text-xs"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="Sublinhado"
            onMouseDown={(e) => {
              e.preventDefault()
              execCmd("underline")
            }}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-slate-700 hover:text-slate-900 border border-transparent hover:border-slate-300 transition-colors cursor-pointer text-xs"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

          <button
            type="button"
            title="Marcadores"
            onMouseDown={(e) => {
              e.preventDefault()
              applyBullet()
            }}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-slate-700 hover:text-slate-900 border border-transparent hover:border-slate-300 transition-colors cursor-pointer text-xs"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

          {/* Cor da Fonte */}
          <div className="relative">
            <button
              type="button"
              title="Cor da Fonte"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowColorPicker(prev => !prev)
                setShowBgPicker(false)
              }}
              className="px-1.5 h-6 rounded flex items-center gap-1 hover:bg-white text-slate-700 hover:text-slate-900 border border-transparent hover:border-slate-300 transition-colors cursor-pointer text-[11px]"
            >
              <Palette className="w-3.5 h-3.5 text-blue-600" />
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 flex gap-1 z-50 animate-in fade-in zoom-in-95">
                {fontColors.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      applyColor(c.hex)
                      setShowColorPicker(false)
                    }}
                    className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Cor do Fundo (Marca-texto) */}
          <div className="relative">
            <button
              type="button"
              title="Cor do Fundo do Texto"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowBgPicker(prev => !prev)
                setShowColorPicker(false)
              }}
              className="px-1.5 h-6 rounded flex items-center gap-1 hover:bg-white text-slate-700 hover:text-slate-900 border border-transparent hover:border-slate-300 transition-colors cursor-pointer text-[11px]"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-500" />
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {showBgPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 flex gap-1 z-50 animate-in fade-in zoom-in-95">
                {bgColors.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      applyHighlight(c.hex)
                      setShowBgPicker(false)
                    }}
                    className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor WYSIWYG ContentEditable formatado em tempo real */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={() => {
            if (editorRef.current && (editorRef.current.innerHTML === "<br>" || editorRef.current.innerText.trim() === "")) {
              editorRef.current.innerHTML = ""
              onChange("")
            }
          }}
          data-placeholder={placeholder}
          style={{ minHeight: `${minHeightPx}px`, resize: "vertical" }}
          className={cn(
            "w-full bg-transparent p-2.5 text-xs text-slate-800 focus:outline-none overflow-y-auto resize-y leading-relaxed font-normal break-words whitespace-pre-wrap cursor-text",
            "[&_mark]:px-1 [&_mark]:py-0.5 [&_mark]:rounded [&_span]:inline",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:font-normal empty:before:pointer-events-none"
          )}
        />
      </div>
    </div>
  )
}

export default function PDIPage() {
  const [collaborators, setCollaborators] = useState<CollaboratorBasic[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterEtapa, setFilterEtapa] = useState<string>("todos")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  
  // Selection
  const [selectedColab, setSelectedColab] = useState<CollaboratorBasic | null>(null)
  const [activeTab, setActiveTab] = useState<number>(1)
  
  // Active Weekly Log Tab in Tab 5 (Semana 1 a 4)
  const [selectedSemana, setSelectedSemana] = useState<"semana1" | "semana2" | "semana3" | "semana4">("semana1")
  
  // New entry modals & states
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string } | null>(null)
  const [previewAttachment, setPreviewAttachment] = useState<PDIAttachment | null>(null)
  const [showAddFeedbackModal, setShowAddFeedbackModal] = useState(false)
  const [newFeedbackData, setNewFeedbackData] = useState<Partial<PDIFeedback>>({
    data: new Date().toISOString().split("T")[0],
    responsavel: "",
    contexto: "",
    percepcaoFuncionario: "",
    pontosPositivos: "",
    pontosMelhoria: "",
    combinados: "",
    dataRetorno: "",
    anexos: []
  })
  const [feedbackParaExcluir, setFeedbackParaExcluir] = useState<{ feedback: PDIFeedback; index: number } | null>(null)
  const [isDeletingFeedback, setIsDeletingFeedback] = useState(false)
  const [editingFeedbackIndex, setEditingFeedbackIndex] = useState<number | null>(null)

  const [comportamentoParaExcluir, setComportamentoParaExcluir] = useState<{ comportamento: PDIComportamento; index: number } | null>(null)
  const [isDeletingComportamento, setIsDeletingComportamento] = useState(false)
  const [editingComportamentoIndex, setEditingComportamentoIndex] = useState<number | null>(null)
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false)

  const handleUploadFeedbackFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !selectedColab) return

    setIsUploadingAttachments(true)

    try {
      const formData = new FormData()
      formData.append("colaboradorId", String(selectedColab.id))
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i])
      }

      const res = await fetch("/api/pdi/upload", {
        method: "POST",
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Erro ao fazer upload dos arquivos.")
      }

      if (data.attachments && data.attachments.length > 0) {
        setNewFeedbackData(prev => ({
          ...prev,
          anexos: [...(prev.anexos || []), ...data.attachments]
        }))
        toast.success(`${data.attachments.length} anexo(s) adicionado(s) com sucesso!`)
      }
    } catch (err: any) {
      console.error("Erro no upload de anexos:", err)
      toast.error(err.message || "Erro ao enviar anexos.")
    } finally {
      setIsUploadingAttachments(false)
      e.target.value = ""
    }
  }

  const [showAddComportamentoModal, setShowAddComportamentoModal] = useState(false)
  const [newCompData, setNewCompData] = useState<Partial<PDIComportamento>>({
    comportamento: "",
    situacao: "",
    impacto: "",
    comportamentoEsperado: "",
    prioridade: "Média",
    status: "Não iniciado"
  })

  const [showAddAcaoModal, setShowAddAcaoModal] = useState(false)
  const [newAcaoData, setNewAcaoData] = useState<Partial<PDIAcao>>({
    objetivo: "",
    acoesPraticas: "",
    responsavel: "",
    prazo: "",
    frequencia: "Semanal",
    indicador: "",
    resultadoEsperado: "",
    resultadoAlcancado: "",
    status: "Em andamento"
  })

  // Estados para inserção inline de habilidades e competências (evita window.prompt bloqueado em iframes)
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [quickSkillName, setQuickSkillName] = useState("")
  const [quickSkillLevel, setQuickSkillLevel] = useState<"Básico" | "Intermediário" | "Avançado">("Intermediário")

  const [showAddSoft, setShowAddSoft] = useState(false)
  const [quickSoftName, setQuickSoftName] = useState("")

  const [showAddForte, setShowAddForte] = useState(false)
  const [quickForteName, setQuickForteName] = useState("")

  const [showAddComp, setShowAddComp] = useState(false)
  const [quickCompName, setQuickCompName] = useState("")

  const [showAddEvidencia, setShowAddEvidencia] = useState(false)
  const [quickEvidenciaTitle, setQuickEvidenciaTitle] = useState("")

  // Load collaborators from Supabase or fallback
  useEffect(() => {
    async function fetchCollaborators() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("hr_colaboradores")
          .select("id, nome, funcao, regime_contratacao, preferencia_incentivos, cnpj, local_trabalho, email, telefone, data_admissao, data_demissao, status, usuario_id")
          .order("nome", { ascending: true })

        // Buscar mapeamento de avatares de perfis (mesma fonte usada no cabeçalho)
        const avatarsMap: Record<string, string> = {}
        try {
          const { data: perfisList } = await supabase
            .from("perfis")
            .select("id, nome, email, avatar_url, username")
          if (perfisList && Array.isArray(perfisList)) {
            perfisList.forEach((p: any) => {
              if (p.avatar_url) {
                if (p.id) avatarsMap[p.id] = p.avatar_url
                if (p.email) avatarsMap[p.email.toLowerCase().trim()] = p.avatar_url
                if (p.nome) avatarsMap[p.nome.toLowerCase().trim()] = p.avatar_url
                if (p.username) avatarsMap[p.username.toLowerCase().trim()] = p.avatar_url
              }
            })
          }
        } catch (e) {
          // ignore
        }

        let list: CollaboratorBasic[] = []

        if (!error && data && data.length > 0) {
          // Filtrar estritamente: SOMENTE ATIVOS e EXCLUIR PJ (PDI exclusivo para CLT e Estágio)
          const validData = data.filter((d: any) => {
            const active = isActiveCollaborator(d.status, d.data_demissao)
            const isPJ = isPJCollaborator(d.regime_contratacao, d.funcao, d.cnpj, d.preferencia_incentivos)
            return active && !isPJ
          })

          list = validData.map((d: any) => {
            let parsedEmpType = d.regime_contratacao || ""
            if (d.preferencia_incentivos && d.preferencia_incentivos.includes('"__meta":true')) {
              try {
                const parsed = JSON.parse(d.preferencia_incentivos)
                if (parsed.empType) parsedEmpType = parsed.empType
              } catch {}
            }
            if (!parsedEmpType) {
              if (d.funcao === "Estagiário" || d.funcao === "Estagiário Operacional") parsedEmpType = "Estágio"
              else parsedEmpType = "CLT"
            }

            const emailKey = (d.email || "").toLowerCase().trim()
            const nameKey = (d.nome || "").toLowerCase().trim()
            const userIdKey = d.usuario_id || ""
            const resolvedAvatar = 
              avatarsMap[userIdKey] ||
              avatarsMap[emailKey] ||
              avatarsMap[nameKey] ||
              d.avatar_url ||
              d.foto_url ||
              `https://picsum.photos/seed/${encodeURIComponent(d.nome || d.id)}/100/100`

            return {
              id: String(d.id),
              name: d.nome || "Colaborador",
              role: d.funcao || "Consultor",
              employmentType: parsedEmpType,
              cnpj: d.cnpj || "",
              avatarUrl: resolvedAvatar,
              area: d.local_trabalho === "Home Office" ? "Vendas Remoto (Home Office)" : "Comercial Presencial",
              email: d.email || `${d.nome?.toLowerCase().replace(/\s+/g, '.')}@sharkconsig.com.br`,
              phone: d.telefone || "(11) 99999-0000",
              joinDate: safeFormatDate(d.data_admissao, "02/01/2026"),
              status: d.status || "Ativo",
              usuarioId: d.usuario_id || ""
            }
          })
        } else {
          // Default mock list se banco estiver vazio: estritamente ATIVOS e CLT/Estágio (sem PJ)
          list = [
            {
              id: "colab-1",
              name: "Maria Dolores Rodriguez",
              role: "Consultora de Vendas - Consignado",
              employmentType: "CLT",
              area: "Comercial / Vendas",
              email: "maria.dolores@sharkconsig.com.br",
              phone: "(11) 98765-4321",
              joinDate: "02/01/2026",
              status: "Ativo",
              usuarioId: "USR-0039"
            },
            {
              id: "colab-2",
              name: "Pablo Navarro Muñoz",
              role: "Estagiário Operacional",
              employmentType: "Estágio",
              area: "Operações & Esteiras",
              email: "pablo.navarro@sharkconsig.com.br",
              phone: "(11) 98765-1122",
              joinDate: "15/02/2026",
              status: "Ativo",
              usuarioId: "USR-0040"
            },
            {
              id: "colab-3",
              name: "Sónia Jiménez Ruiz",
              role: "Supervisora Comercial",
              employmentType: "CLT",
              area: "Comercial / Liderança",
              email: "sonia.jimenez@sharkconsig.com.br",
              phone: "(11) 98765-9988",
              joinDate: "10/06/2025",
              status: "Ativo",
              usuarioId: "USR-0012"
            },
            {
              id: "colab-4",
              name: "Francisco Martín Rodriguez",
              role: "Consultor de Portabilidade",
              employmentType: "CLT",
              area: "Vendas Externas",
              email: "francisco.martin@sharkconsig.com.br",
              phone: "(11) 97654-3321",
              joinDate: "18/03/2026",
              status: "Ativo",
              usuarioId: "USR-0055"
            }
          ]
        }

        // Buscar registros existentes da tabela 'pdi' no Supabase
        const pdiDbMap: Record<string, PDIData> = {}
        try {
          const { data: pdiRows, error: pdiError } = await supabase
            .from("pdi")
            .select("*")
          if (!pdiError && pdiRows && Array.isArray(pdiRows)) {
            const parseList = (val: any) => {
              if (Array.isArray(val)) return val
              if (typeof val === "string" && val.trim().startsWith("[")) {
                try {
                  const parsed = JSON.parse(val)
                  if (Array.isArray(parsed)) return parsed
                } catch {}
              }
              return []
            }
            pdiRows.forEach((row: any) => {
              if (row.colaborador_id) {
                const dbDados = (row.dados && typeof row.dados === "object") ? row.dados : {}
                const parsed: PDIData = {
                  etapaProfissional: row.etapa_profissional || dbDados.etapaProfissional || "Desenvolvimento",
                  etapaProfissionalOutros: row.etapa_profissional_outros || dbDados.etapaProfissionalOutros || "",
                  prontidao: row.prontidao || dbDados.prontidao || "Em Desenvolvimento Ativo",
                  liderancaDireta: row.lideranca_direta || dbDados.liderancaDireta || "",
                  area: row.area || dbDados.area || "",
                  cargo: row.cargo || dbDados.cargo || "",
                  objetivosProfissionais: row.objetivos_profissionais || dbDados.objetivosProfissionais || "",
                  interessesCrescimento: row.interesses_crescimento || dbDados.interessesCrescimento || "",
                  habilidadesTecnicas: parseList(row.habilidades_tecnicas).length > 0
                    ? parseList(row.habilidades_tecnicas)
                    : parseList(dbDados.habilidadesTecnicas),
                  habilidadesComportamentais: parseList(row.habilidades_comportamentais).length > 0
                    ? parseList(row.habilidades_comportamentais)
                    : parseList(dbDados.habilidadesComportamentais),
                  pontosFortes: parseList(row.pontos_fortes).length > 0
                    ? parseList(row.pontos_fortes)
                    : parseList(dbDados.pontosFortes),
                  competenciasNovas: parseList(row.competencias_novas).length > 0
                    ? parseList(row.competencias_novas)
                    : parseList(dbDados.competenciasNovas),
                  feedbacks: parseList(row.feedbacks).length > 0
                    ? parseList(row.feedbacks)
                    : parseList(dbDados.feedbacks),
                  comportamentos: parseList(row.comportamentos).length > 0
                    ? parseList(row.comportamentos)
                    : parseList(dbDados.comportamentos),
                  acoes: parseList(row.acoes).length > 0
                    ? parseList(row.acoes)
                    : parseList(dbDados.acoes),
                  registroSemanal: row.registro_semanal || dbDados.registroSemanal || {
                    semana1: { acaoPrevista: "", evidenciaObservada: "", status: "Não iniciado", proximoPasso: "" },
                    semana2: { acaoPrevista: "", evidenciaObservada: "", status: "Não iniciado", proximoPasso: "" },
                    semana3: { acaoPrevista: "", evidenciaObservada: "", status: "Não iniciado", proximoPasso: "" },
                    semana4: { acaoPrevista: "", evidenciaObservada: "", status: "Não iniciado", proximoPasso: "" }
                  },
                  evidencias: parseList(row.evidencias).length > 0
                    ? parseList(row.evidencias)
                    : parseList(dbDados.evidencias),
                  avaliacaoInicial: row.avaliacao_inicial || dbDados.avaliacaoInicial || "",
                  revisoesPeriodicas: row.revisoes_periodicas || dbDados.revisoesPeriodicas || "",
                  evolucoesPercebidas: row.evolucoes_percebidas || dbDados.evolucoesPercebidas || "",
                  pontosAtencao: row.pontos_atencao || dbDados.pontosAtencao || "",
                  validacaoRotina: row.validacao_rotina || dbDados.validacaoRotina || "",
                  proximosPassosEvolucao: row.proximos_passos_evolucao || dbDados.proximosPassosEvolucao || "",
                  competenciasProximoNivel: row.competencias_proximo_nivel || dbDados.competenciasProximoNivel || "",
                  preparacaoNovasResponsabilidades: row.preparacao_novas_responsabilidades || dbDados.preparacaoNovasResponsabilidades || "",
                  necessidadesTreinamento: row.necessidades_treinamento || dbDados.necessidadesTreinamento || "",
                  criteriosEfetivacao: row.criterios_efetivacao || dbDados.criteriosEfetivacao || "",
                  decisoesAcordadas: row.decisoes_acordadas || dbDados.decisoesAcordadas || ""
                }
                pdiDbMap[String(row.colaborador_id)] = parsed
              }
            })
          }
        } catch (e) {
          // ignore
        }

        // Limpar qualquer cache residual do localStorage para garantir fidelidade estrita com o banco de dados
        try {
          list.forEach((c) => {
            localStorage.removeItem(`shark_pdi_data_${c.id}`)
          })
        } catch {}

        // Carrega dados estritamente fiéis aos registros salvos na tabela 'pdi' do Supabase
        const enriched = list.map((c) => {
          const basePdi = pdiDbMap[c.id] || null
          return { ...c, pdiData: basePdi || createBlankPDIData(c) }
        })

        setCollaborators(enriched)
      } catch (err) {
        console.error("Erro ao carregar colaboradores do PDI:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchCollaborators()
  }, [])

  // Persistência direta e resiliente no Supabase na tabela 'pdi'
  const persistPDIToSupabase = async (colaboradorId: string, pdiData: PDIData): Promise<boolean> => {
    try {
      const payload = {
        colaborador_id: String(colaboradorId),
        etapa_profissional: pdiData.etapaProfissional || "Desenvolvimento",
        prontidao: pdiData.prontidao || "Em Desenvolvimento Ativo",
        lideranca_direta: pdiData.liderancaDireta || "",
        area: pdiData.area || "",
        cargo: pdiData.cargo || "",
        objetivos_profissionais: pdiData.objetivosProfissionais || "",
        interesses_crescimento: pdiData.interessesCrescimento || "",
        habilidades_tecnicas: pdiData.habilidadesTecnicas || [],
        habilidades_comportamentais: pdiData.habilidadesComportamentais || [],
        pontos_fortes: pdiData.pontosFortes || [],
        competencias_novas: pdiData.competenciasNovas || [],
        feedbacks: pdiData.feedbacks || [],
        comportamentos: pdiData.comportamentos || [],
        acoes: pdiData.acoes || [],
        registro_semanal: pdiData.registroSemanal || {},
        evidencias: pdiData.evidencias || [],
        avaliacao_inicial: pdiData.avaliacaoInicial || "",
        revisoes_periodicas: pdiData.revisoesPeriodicas || "",
        evolucoes_percebidas: pdiData.evolucoesPercebidas || "",
        pontos_atencao: pdiData.pontosAtencao || "",
        validacao_rotina: pdiData.validacaoRotina || "",
        proximos_passos_evolucao: pdiData.proximosPassosEvolucao || "",
        competencias_proximo_nivel: pdiData.competenciasProximoNivel || "",
        preparacao_novas_responsabilidades: pdiData.preparacaoNovasResponsabilidades || "",
        necessidades_treinamento: pdiData.necessidadesTreinamento || "",
        criterios_efetivacao: pdiData.criteriosEfetivacao || "",
        decisoes_acordadas: pdiData.decisoesAcordadas || "",
        dados: pdiData,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from("pdi")
        .upsert(payload, { onConflict: "colaborador_id" })

      if (error) {
        console.warn("Aviso no upsert pdi, tentando fallback update/insert:", error.message)
        const { data: existing } = await supabase
          .from("pdi")
          .select("id")
          .eq("colaborador_id", String(colaboradorId))
          .maybeSingle()
        if (existing?.id) {
          await supabase.from("pdi").update(payload).eq("colaborador_id", String(colaboradorId))
        } else {
          await supabase.from("pdi").insert(payload)
        }
      }
      return true
    } catch (e) {
      console.warn("Aviso ao persistir no Supabase tabela pdi:", e)
      return false
    }
  }

  // Sincroniza dados do colaborador no estado e opcionalmente no Supabase
  const handleUpdatePDIData = async (updatedData: PDIData, persistDatabase = false) => {
    if (!selectedColab) return
    const updatedColab = { ...selectedColab, pdiData: updatedData }
    setSelectedColab(updatedColab)
    setCollaborators((prev) => prev.map((c) => (c.id === updatedColab.id ? updatedColab : c)))

    if (persistDatabase) {
      await persistPDIToSupabase(selectedColab.id, updatedData)
    }
  }

  // Auto-save com debounce de 1 segundo para qualquer edição em tempo real
  useEffect(() => {
    if (!selectedColab?.id || !selectedColab?.pdiData) return
    const timer = setTimeout(() => {
      persistPDIToSupabase(selectedColab.id, selectedColab.pdiData!)
    }, 1000)
    return () => clearTimeout(timer)
  }, [selectedColab?.id, selectedColab?.pdiData])

  const handleConfirmAddSkill = async () => {
    if (!selectedColab || !quickSkillName.trim()) {
      toast.error("Informe o nome da habilidade técnica.")
      return
    }
    const updatedSkills = [
      ...(selectedColab.pdiData.habilidadesTecnicas || []),
      { nome: quickSkillName.trim(), nivel: quickSkillLevel }
    ]
    const updatedData: PDIData = {
      ...selectedColab.pdiData,
      habilidadesTecnicas: updatedSkills
    }
    setQuickSkillName("")
    setShowAddSkill(false)
    await handleUpdatePDIData(updatedData, true)
    toast.success("Habilidade técnica adicionada e salva na tabela pdi!")
  }

  const handleConfirmAddSoft = async () => {
    if (!selectedColab || !quickSoftName.trim()) {
      toast.error("Informe o nome da soft skill.")
      return
    }
    const updatedSoft = [...(selectedColab.pdiData.habilidadesComportamentais || []), quickSoftName.trim()]
    const updatedData: PDIData = {
      ...selectedColab.pdiData,
      habilidadesComportamentais: updatedSoft
    }
    setQuickSoftName("")
    setShowAddSoft(false)
    await handleUpdatePDIData(updatedData, true)
    toast.success("Soft skill adicionada e salva na tabela pdi!")
  }

  const handleConfirmAddForte = async () => {
    if (!selectedColab || !quickForteName.trim()) {
      toast.error("Informe o ponto forte.")
      return
    }
    const updatedFortes = [...(selectedColab.pdiData.pontosFortes || []), quickForteName.trim()]
    const updatedData: PDIData = {
      ...selectedColab.pdiData,
      pontosFortes: updatedFortes
    }
    setQuickForteName("")
    setShowAddForte(false)
    await handleUpdatePDIData(updatedData, true)
    toast.success("Ponto forte adicionado e salvo na tabela pdi!")
  }

  const handleConfirmAddComp = async () => {
    if (!selectedColab || !quickCompName.trim()) {
      toast.error("Informe a competência.")
      return
    }
    const updatedComps = [...(selectedColab.pdiData.competenciasNovas || []), quickCompName.trim()]
    const updatedData: PDIData = {
      ...selectedColab.pdiData,
      competenciasNovas: updatedComps
    }
    setQuickCompName("")
    setShowAddComp(false)
    await handleUpdatePDIData(updatedData, true)
    toast.success("Competência adicionada e salva na tabela pdi!")
  }

  const handleConfirmAddEvidencia = async () => {
    if (!selectedColab || !quickEvidenciaTitle.trim()) {
      toast.error("Informe o título da evidência.")
      return
    }
    const novaEv: PDIEvidencia = {
      id: `ev-${Date.now()}`,
      titulo: quickEvidenciaTitle.trim(),
      atividadesConcluidas: "",
      situacaoReal: "",
      resultadoAntesDepois: "",
      linkDocumento: "",
      evidenciaAplicacao: "",
      validacaoLideranca: "Em análise",
      dataValidacao: new Date().toLocaleDateString("pt-BR")
    }
    const updatedData: PDIData = {
      ...selectedColab.pdiData,
      evidencias: [...(selectedColab.pdiData.evidencias || []), novaEv]
    }
    setQuickEvidenciaTitle("")
    setShowAddEvidencia(false)
    await handleUpdatePDIData(updatedData, true)
    toast.success("Evidência adicionada e salva na tabela pdi!")
  }

  const handleConfirmDeleteFeedback = async () => {
    if (!selectedColab?.pdiData || feedbackParaExcluir === null) return
    setIsDeletingFeedback(true)
    try {
      const updatedFeedbacks = selectedColab.pdiData.feedbacks.filter((fb, i) => {
        if (feedbackParaExcluir.feedback.id && fb.id) {
          return fb.id !== feedbackParaExcluir.feedback.id
        }
        return i !== feedbackParaExcluir.index
      })
      await handleUpdatePDIData({
        ...selectedColab.pdiData,
        feedbacks: updatedFeedbacks
      }, true)
      setFeedbackParaExcluir(null)
      toast.success("Feedback excluído com sucesso!")
    } catch (e) {
      toast.error("Erro ao excluir feedback.")
    } finally {
      setIsDeletingFeedback(false)
    }
  }

  const handleConfirmDeleteComportamento = async () => {
    if (!selectedColab?.pdiData || comportamentoParaExcluir === null) return
    setIsDeletingComportamento(true)
    try {
      const updatedComps = selectedColab.pdiData.comportamentos.filter((c, i) => {
        if (comportamentoParaExcluir.comportamento.id && c.id) {
          return c.id !== comportamentoParaExcluir.comportamento.id
        }
        return i !== comportamentoParaExcluir.index
      })
      await handleUpdatePDIData({
        ...selectedColab.pdiData,
        comportamentos: updatedComps
      }, true)
      setComportamentoParaExcluir(null)
      toast.success("Comportamento excluído com sucesso!")
    } catch (e) {
      toast.error("Erro ao excluir comportamento.")
    } finally {
      setIsDeletingComportamento(false)
    }
  }

  const handleOpenEditFeedback = (fb: PDIFeedback, index: number) => {
    setEditingFeedbackIndex(index)
    setNewFeedbackData({
      id: fb.id,
      data: toDateInputValue(fb.data) || fb.data,
      responsavel: fb.responsavel || "",
      contexto: fb.contexto || "",
      percepcaoFuncionario: fb.percepcaoFuncionario || "",
      pontosPositivos: fb.pontosPositivos || "",
      pontosMelhoria: fb.pontosMelhoria || "",
      combinados: fb.combinados || "",
      dataRetorno: toDateInputValue(fb.dataRetorno) || fb.dataRetorno || "",
      anexos: fb.anexos ? [...fb.anexos] : []
    })
    setShowAddFeedbackModal(true)
  }

  const handleOpenEditComportamento = (comp: PDIComportamento, index: number) => {
    setEditingComportamentoIndex(index)
    setNewCompData({
      id: comp.id,
      comportamento: comp.comportamento || "",
      situacao: comp.situacao || "",
      impacto: comp.impacto || "",
      comportamentoEsperado: comp.comportamentoEsperado || "",
      prioridade: comp.prioridade || "Média",
      status: comp.status || "Não iniciado"
    })
    setShowAddComportamentoModal(true)
  }

  const handleSaveExplicitly = async () => {
    if (!selectedColab?.pdiData) return
    setSaving(true)
    const toastId = toast.loading(`Salvando Ficha do PDI de ${selectedColab.name}...`)

    try {
      const payload = {
        colaborador_id: String(selectedColab.id),
        etapa_profissional: selectedColab.pdiData.etapaProfissional || "Desenvolvimento",
        prontidao: selectedColab.pdiData.prontidao || "Em Desenvolvimento Ativo",
        lideranca_direta: selectedColab.pdiData.liderancaDireta || "",
        area: selectedColab.pdiData.area || "",
        cargo: selectedColab.role || selectedColab.pdiData.cargo || "",
        objetivos_profissionais: selectedColab.pdiData.objetivosProfissionais || "",
        interesses_crescimento: selectedColab.pdiData.interessesCrescimento || "",
        habilidades_tecnicas: selectedColab.pdiData.habilidadesTecnicas || [],
        habilidades_comportamentais: selectedColab.pdiData.habilidadesComportamentais || [],
        pontos_fortes: selectedColab.pdiData.pontosFortes || [],
        competencias_novas: selectedColab.pdiData.competenciasNovas || [],
        feedbacks: selectedColab.pdiData.feedbacks || [],
        comportamentos: selectedColab.pdiData.comportamentos || [],
        acoes: selectedColab.pdiData.acoes || [],
        registro_semanal: selectedColab.pdiData.registroSemanal || {},
        evidencias: selectedColab.pdiData.evidencias || [],
        avaliacao_inicial: selectedColab.pdiData.avaliacaoInicial || "",
        revisoes_periodicas: selectedColab.pdiData.revisoesPeriodicas || "",
        evolucoes_percebidas: selectedColab.pdiData.evolucoesPercebidas || "",
        pontos_atencao: selectedColab.pdiData.pontosAtencao || "",
        validacao_rotina: selectedColab.pdiData.validacaoRotina || "",
        proximos_passos_evolucao: selectedColab.pdiData.proximosPassosEvolucao || "",
        competencias_proximo_nivel: selectedColab.pdiData.competenciasProximoNivel || "",
        preparacao_novas_responsabilidades: selectedColab.pdiData.preparacaoNovasResponsabilidades || "",
        necessidades_treinamento: selectedColab.pdiData.necessidadesTreinamento || "",
        criterios_efetivacao: selectedColab.pdiData.criteriosEfetivacao || "",
        decisoes_acordadas: selectedColab.pdiData.decisoesAcordadas || "",
        dados: selectedColab.pdiData,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from("pdi")
        .upsert(payload, { onConflict: "colaborador_id" })

      if (error) {
        console.warn("Aviso ao persistir no Supabase tabela pdi:", error.message)
      }

      toast.success(`Ficha do PDI de ${selectedColab.name} salva com sucesso no banco de dados!`, { id: toastId })
    } catch (e) {
      console.error("Erro ao salvar PDI no Supabase:", e)
      toast.error(`Erro ao salvar ficha do PDI no banco de dados.`, { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  // Copy Weekly Log Formatted (conforme Imagem 3.jpeg)
  const handleCopyWeeklyLog = () => {
    if (!selectedColab || !selectedColab.pdiData) return
    const curWeek = selectedColab.pdiData.registroSemanal[selectedSemana]
    const weekLabel = 
      selectedSemana === "semana1" ? "Semana 1" :
      selectedSemana === "semana2" ? "Semana 2" :
      selectedSemana === "semana3" ? "Semana 3" : "Semana 4"

    const textToCopy = `📋 REGISTRO SEMANAL — ${selectedColab.name.toUpperCase()}
────────────────────────────────────────
📌 Período: ${weekLabel}
🎯 Ação prevista:
${curWeek.acaoPrevista || "Não informada"}

👁️ Evidência observada:
${curWeek.evidenciaObservada || "Não informada"}

📊 Status do Progresso: [ ${curWeek.status.toUpperCase()} ]
🚀 Próximo passo / obstáculo identificado:
${curWeek.proximoPasso || "Não informado"}
────────────────────────────────────────
Registrado no SharkConsig CRM - Módulo PDI`

    navigator.clipboard.writeText(textToCopy).then(() => {
      toast.success(`Registro da ${weekLabel} de ${selectedColab.name.split(" ")[0]} copiado para a área de transferência!`)
    }).catch(() => {
      toast.error("Não foi possível copiar o texto automaticamente.")
    })
  }

  // Filtered collaborators for the directory grid
  const filteredCollaborators = useMemo(() => {
    return collaborators.filter((c) => {
      // Regra 1: Somente colaboradores Ativos
      if (!isActiveCollaborator(c.status)) return false

      // Regra 2: Módulo exclusivo para CLT e Estágio (remover PJ)
      if (isPJCollaborator(c.employmentType, c.role, c.cnpj)) return false

      const matchSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
      
      if (!matchSearch) return false

      if (filterEtapa !== "todos") {
        const etapa = c.pdiData?.etapaProfissional || "Desenvolvimento"
        if (etapa !== filterEtapa) return false
      }

      return true
    })
  }, [collaborators, searchQuery, filterEtapa])

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ")
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getEtapaBadgeClass = (etapa: EtapaProfissional) => {
    switch (etapa) {
      case "Integração":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Desenvolvimento":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "Acompanhamento":
        return "bg-purple-50 text-purple-700 border-purple-200"
      case "Preparação para Promoção/Efetivação":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "Outros":
        return "bg-slate-100 text-slate-700 border-slate-200"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Concluído":
      case "Consolidado":
      case "Validado":
        return "bg-emerald-100 text-emerald-800 border-emerald-300"
      case "Em andamento":
      case "Em desenvolvimento":
      case "Em análise":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "Precisa de reforço":
      case "Necessita reforço":
        return "bg-amber-100 text-amber-800 border-amber-300"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
    }
  }

  return (
    <div className="flex-1 min-h-screen bg-[#F8FAFC] pb-16">
      <Header title="PDI — PLANO DE DESENVOLVIMENTO INDIVIDUAL" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* ============================================================== */}
        {/* VIEW 1: DIRETÓRIO DE COLABORADORES (Estilo Bizneo HR Imagem 1) */}
        {/* ============================================================== */}
        {!selectedColab && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Target className="w-6 h-6 text-[#00D492]" />
                    <span>Diretório de Talentos & PDI</span>
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Acompanhamento contínuo, ciclos semanais e evolução profissional.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                        viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                      title="Visualização em Grade (Cards)"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span className="hidden sm:inline">Grade</span>
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                        viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                      title="Visualização em Lista"
                    >
                      <List className="w-4 h-4" />
                      <span className="hidden sm:inline">Lista</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Search & Filter Chips */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisa por nome, cargo ou e-mail..."
                    className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00D492] focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter by Etapa */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold text-slate-600">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Etapa:</span>
                  {[
                    { key: "todos", label: "Todas" },
                    { key: "Integração", label: "Integração" },
                    { key: "Desenvolvimento", label: "Desenvolvimento" },
                    { key: "Acompanhamento", label: "Acompanhamento" },
                    { key: "Preparação para Promoção/Efetivação", label: "Promoção / Efetivação" },
                    { key: "Outros", label: "Outros" }
                  ].map((chip) => (
                    <button
                      key={chip.key}
                      onClick={() => setFilterEtapa(chip.key)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer",
                        filterEtapa === chip.key
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total counter */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>{filteredCollaborators.length} colaborador(es) ativo(s) encontrado(s)</span>
              <span className="text-[11px] font-medium text-slate-400">Clique em qualquer colaborador para acessar o PDI completo</span>
            </div>

            {/* GRID VIEW (Estilo Bizneo HR Imagem 1) */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCollaborators.map((c) => {
                  const etapa = c.pdiData?.etapaProfissional || "Desenvolvimento"
                  const totalAcoes = c.pdiData?.acoes?.length || 0
                  const totalFeedbacks = c.pdiData?.feedbacks?.length || 0
                  const weeklyStatus = c.pdiData?.registroSemanal?.semana1?.status || "Em andamento"

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedColab(c)
                        setActiveTab(1)
                      }}
                      className="group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md hover:border-slate-400/80 transition-all cursor-pointer flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Foto de perfil (clique para ampliar) */}
                        <div className="relative flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewPhoto({
                                url: c.avatarUrl || `https://picsum.photos/seed/${encodeURIComponent(c.name || c.id)}/600/600`,
                                name: c.name
                              })
                            }}
                            title="Clique para ver a foto em tamanho real"
                            className="relative w-14 h-14 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-50 shadow-sm ring-2 ring-white hover:ring-[#00D492] hover:scale-105 transition-all cursor-zoom-in block"
                          >
                            <Image
                              src={c.avatarUrl || `https://picsum.photos/seed/${encodeURIComponent(c.name || c.id)}/100/100`}
                              alt={c.name}
                              fill
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        </div>

                        {/* Informações Básicas */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-sm text-slate-900 truncate group-hover:text-[#00D492] transition-colors">
                            {c.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                            {c.role} {c.area ? `— ${c.area}` : ""}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{c.email || "email@sharkconsig.com.br"}</span>
                          </p>
                        </div>
                      </div>

                      {/* Badges de Etapa & Status */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {c.employmentType || "CLT"}
                          </span>
                          <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border", getEtapaBadgeClass(etapa))}>
                            {etapa === "Outros" && c.pdiData?.etapaProfissionalOutros
                              ? `Outros: ${c.pdiData.etapaProfissionalOutros}`
                              : etapa}
                          </span>
                        </div>

                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Desde {c.joinDate || "2026"}</span>
                        </span>
                      </div>

                      {/* Mini Indicadores de PDI */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Ações PDI</span>
                          <span className="text-xs font-black text-slate-800">{totalAcoes}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Feedbacks</span>
                          <span className="text-xs font-black text-slate-800">{totalFeedbacks}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Ciclo Sem.</span>
                          <span className="text-[10px] font-extrabold text-[#00D492] truncate block">{weeklyStatus}</span>
                        </div>
                      </div>

                      {/* Botão Acessar */}
                      <button
                        type="button"
                        className="w-full bg-slate-900 group-hover:bg-[#00D492] group-hover:text-slate-950 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <span>Acessar Ficha do Colaborador</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Colaborador</th>
                      <th className="py-3.5 px-4">Cargo & Área</th>
                      <th className="py-3.5 px-4 text-center">Regime</th>
                      <th className="py-3.5 px-4">Etapa Profissional</th>
                      <th className="py-3.5 px-4 text-center">Ações PDI</th>
                      <th className="py-3.5 px-4 text-center">Feedbacks</th>
                      <th className="py-3.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredCollaborators.map((c, idx) => (
                      <tr 
                        key={c.id} 
                        onClick={() => {
                          setSelectedColab(c)
                          setActiveTab(1)
                        }}
                        className={cn("hover:bg-slate-50 transition-colors cursor-pointer", idx % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewPhoto({
                                url: c.avatarUrl || `https://picsum.photos/seed/${encodeURIComponent(c.name || c.id)}/600/600`,
                                name: c.name
                              })
                            }}
                            title="Clique para ver a foto em tamanho real"
                            className="relative w-9 h-9 rounded-full overflow-hidden bg-slate-200 border border-slate-200 shrink-0 hover:ring-2 hover:ring-[#00D492] hover:scale-105 transition-all cursor-zoom-in block"
                          >
                            <Image
                              src={c.avatarUrl || `https://picsum.photos/seed/${encodeURIComponent(c.name || c.id)}/100/100`}
                              alt={c.name}
                              fill
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                          <div>
                            <span className="block text-slate-900 font-extrabold">{c.name}</span>
                            <span className="text-[11px] text-slate-400 font-normal">{c.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{c.role}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {c.employmentType || "CLT"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", getEtapaBadgeClass(c.pdiData?.etapaProfissional || "Desenvolvimento"))}>
                            {c.pdiData?.etapaProfissional === "Outros" && c.pdiData?.etapaProfissionalOutros
                              ? `Outros: ${c.pdiData.etapaProfissionalOutros}`
                              : (c.pdiData?.etapaProfissional || "Desenvolvimento")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900">{c.pdiData?.acoes?.length || 0}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900">{c.pdiData?.feedbacks?.length || 0}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-[#00D492] font-bold text-xs hover:underline flex items-center justify-end gap-1">
                            Abrir Ficha <ChevronRight className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: FICHA DO COLABORADOR - BIZNEO HR (Imagens 2 & 3)       */}
        {/* ============================================================== */}
        {selectedColab && selectedColab.pdiData && (
          <div className="space-y-6">
            
            {/* Top Navigation & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (selectedColab?.id && selectedColab?.pdiData) {
                    await persistPDIToSupabase(selectedColab.id, selectedColab.pdiData)
                  }
                  setSelectedColab(null)
                }}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-all hover:bg-slate-50 w-fit"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>Voltar ao Diretório de Talentos</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Switch Collaborator Selector */}
                <select
                  value={selectedColab.id}
                  onChange={async (e) => {
                    if (selectedColab?.id && selectedColab?.pdiData) {
                      await persistPDIToSupabase(selectedColab.id, selectedColab.pdiData)
                    }
                    const found = filteredCollaborators.find((c) => c.id === e.target.value) || collaborators.find((c) => c.id === e.target.value)
                    if (found) setSelectedColab(found)
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00D492]"
                >
                  {filteredCollaborators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.employmentType || "CLT"})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveExplicitly}
                  className="bg-[#00D492] hover:bg-[#00BD82] disabled:opacity-50 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Salvando..." : "Salvar Ficha"}</span>
                </button>
              </div>
            </div>

            {/* ========================================================== */}
            {/* CABEÇALHO DO COLABORADOR ESTILO BIZNEO HR (Imagem 2)       */}
            {/* ========================================================== */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                
                {/* Avatar e Dados Principais */}
                <div className="flex items-start sm:items-center gap-4">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewPhoto({
                          url: selectedColab.avatarUrl || `https://picsum.photos/seed/${encodeURIComponent(selectedColab.name || selectedColab.id)}/600/600`,
                          name: selectedColab.name
                        })
                      }}
                      title="Clique para ver a foto em tamanho real"
                      className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-slate-200 shadow-md ring-4 ring-slate-100 border-2 border-white hover:ring-[#00D492] hover:scale-105 transition-all cursor-zoom-in block"
                    >
                      <Image
                        src={selectedColab.avatarUrl || `https://picsum.photos/seed/${encodeURIComponent(selectedColab.name || selectedColab.id)}/200/200`}
                        alt={selectedColab.name}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {selectedColab.name}
                      </h2>
                      <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {selectedColab.employmentType || "CLT"}
                      </span>
                      <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full border", getEtapaBadgeClass(selectedColab.pdiData.etapaProfissional))}>
                        {selectedColab.pdiData.etapaProfissional === "Outros" && selectedColab.pdiData.etapaProfissionalOutros
                          ? `Outros: ${selectedColab.pdiData.etapaProfissionalOutros}`
                          : selectedColab.pdiData.etapaProfissional}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                      {selectedColab.role} • {selectedColab.pdiData.area}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-medium pt-1">
                      <span>Admissão: <strong className="text-slate-700 font-bold">{selectedColab.joinDate || "02/01/2026"}</strong></span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <strong className="text-slate-700 font-bold">{selectedColab.email}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Métricas Rápidas do Cabeçalho */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                  <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Feedbacks</span>
                    <span className="text-sm font-black text-slate-900">{selectedColab.pdiData.feedbacks.length}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ações Ativas</span>
                    <span className="text-sm font-black text-[#00D492]">{selectedColab.pdiData.acoes.length}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prontidão</span>
                    <span className="text-xs font-black text-slate-800">{selectedColab.pdiData.prontidao}</span>
                  </div>
                </div>

              </div>

              {/* ======================================================== */}
              {/* AS 8 ABAS DO BIZNEO HR & PDI                             */}
              {/* ======================================================== */}
              <div className="mt-6 pt-2 border-t border-slate-100">
                <nav className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 custom-scrollbar text-xs font-bold [scrollbar-width:thin] [scrollbar-color:#94a3b8_#f1f5f9]">
                  {[
                    { id: 1, label: "1. Perfil & Contexto", icon: User },
                    { id: 2, label: "2. Habilidades & Forças", icon: Award },
                    { id: 3, label: "3. Histórico de Feedbacks", icon: MessageSquare },
                    { id: 4, label: "4. Comportamentos a Desenvolver", icon: AlertCircle },
                    { id: 5, label: "5. PDI & Registro Semanal", icon: Target },
                    { id: 6, label: "6. Evidências & Entregas", icon: FileCheck },
                    { id: 7, label: "7. Evolução & Reavaliações", icon: TrendingUp },
                    { id: 8, label: "8. Potencial & Próximos Passos", icon: Compass },
                  ].map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border",
                          isActive
                            ? "bg-slate-900 text-[#00D492] border-slate-900 shadow-sm"
                            : "bg-white text-slate-600 border-transparent hover:border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#00D492]" : "text-slate-400")} />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </div>

            </div>

            {/* ========================================================== */}
            {/* CONTEÚDO DAS 8 ABAS                                        */}
            {/* ========================================================== */}

            {/* ---------------------------------------------------------- */}
            {/* ABA 1: PERFIL & CONTEXTO                                   */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Card 1: Informações Gerais */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm border-b border-slate-100 pb-3">
                    <User className="w-4 h-4 text-[#00D492]" />
                    <span>Informações Gerais do Profissional</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={selectedColab.name}
                        disabled
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Cargo / Função
                        </label>
                        <input
                          type="text"
                          value={selectedColab.role || selectedColab.pdiData.cargo}
                          disabled
                          readOnly
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Área / Setor
                        </label>
                        <input
                          type="text"
                          value={selectedColab.pdiData.area}
                          onChange={(e) => handleUpdatePDIData({
                            ...selectedColab.pdiData,
                            area: e.target.value
                          })}
                          placeholder="Ex.: Comercial / Vendas, Operações Consignado..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-[#00D492]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Liderança Direta / Gestor Responsável
                      </label>
                      <input
                        type="text"
                        value={selectedColab.pdiData.liderancaDireta}
                        onChange={(e) => handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          liderancaDireta: e.target.value
                        })}
                        placeholder="Ex.: Gestão Comercial & Operacional..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-[#00D492]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Etapa Profissional
                      </label>
                      <select
                        value={selectedColab.pdiData.etapaProfissional}
                        onChange={(e) => handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          etapaProfissional: e.target.value as EtapaProfissional
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-[#00D492]"
                      >
                        <option value="Integração">Integração (Onboarding / Primeiros 90 dias)</option>
                        <option value="Desenvolvimento">Desenvolvimento (Consolidação de metas)</option>
                        <option value="Acompanhamento">Acompanhamento (Rotina e reciclagem)</option>
                        <option value="Preparação para Promoção/Efetivação">Preparação para Promoção / Efetivação</option>
                        <option value="Outros">Outros</option>
                      </select>

                      {selectedColab.pdiData.etapaProfissional === "Outros" && (
                        <div className="mt-2.5 animate-in fade-in duration-150">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Descrição da Etapa Profissional (Outros)
                          </label>
                          <input
                            type="text"
                            value={selectedColab.pdiData.etapaProfissionalOutros || ""}
                            onChange={(e) => handleUpdatePDIData({
                              ...selectedColab.pdiData,
                              etapaProfissionalOutros: e.target.value
                            })}
                            placeholder="Descreva a etapa profissional..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00D492]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card 2: Objetivos e Interesses de Crescimento */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm border-b border-slate-100 pb-3">
                    <Sparkles className="w-4 h-4 text-[#00D492]" />
                    <span>Objetivos Profissionais & Interesses de Crescimento</span>
                  </div>

                  <div className="space-y-4 text-xs">
                    <FormattedFeedbackField
                      label="Objetivos Profissionais (Curto e Médio Prazo)"
                      labelColor="text-slate-700 font-extrabold uppercase tracking-wider text-[10px]"
                      value={selectedColab.pdiData.objetivosProfissionais || ""}
                      onChange={(val) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        objetivosProfissionais: val
                      })}
                      placeholder="Ex.: Aprimorar assertividade no fechamento de propostas de portabilidade e alcançar consistência de superação de metas mensais..."
                      rows={3}
                    />

                    <FormattedFeedbackField
                      label="Interesses de Crescimento & Próximos Passos na Carreira"
                      labelColor="text-slate-700 font-extrabold uppercase tracking-wider text-[10px]"
                      value={selectedColab.pdiData.interessesCrescimento || ""}
                      onChange={(val) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        interessesCrescimento: val
                      })}
                      placeholder="Ex.: Assumir liderança de equipe júnior de televendas e especializar-se em negociações de alto valor..."
                      rows={3}
                    />
                  </div>
                </div>

              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 2: HABILIDADES & PONTOS FORTES                         */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Habilidades Técnicas (Hard Skills) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                      <Award className="w-4 h-4 text-[#00D492]" />
                      <span>Habilidades Técnicas (Hard Skills)</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {selectedColab.pdiData.habilidadesTecnicas.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">
                        Nenhuma habilidade técnica cadastrada ainda. (Ex.: Cálculo de Coeficientes & Simulação, CRM SharkConsig & Discador, Esteiras Bancárias & Regras INSS).
                      </p>
                    )}
                    {selectedColab.pdiData.habilidadesTecnicas.map((h, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <span className="text-xs font-bold text-slate-800">{h.nome}</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={h.nivel}
                            onChange={async (e) => {
                              const updated = [...selectedColab.pdiData.habilidadesTecnicas]
                              updated[i].nivel = e.target.value as any
                              await handleUpdatePDIData({
                                ...selectedColab.pdiData,
                                habilidadesTecnicas: updated
                              }, true)
                            }}
                            className="bg-white border border-slate-200 rounded-lg text-[10px] font-bold px-2 py-1 text-slate-700"
                          >
                            <option value="Básico">Básico</option>
                            <option value="Intermediário">Intermediário</option>
                            <option value="Avançado">Avançado</option>
                          </select>
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = selectedColab.pdiData.habilidadesTecnicas.filter((_, idx) => idx !== i)
                              await handleUpdatePDIData({ ...selectedColab.pdiData, habilidadesTecnicas: updated }, true)
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Hard Skill */}
                    {showAddSkill ? (
                      <div className="bg-slate-50 border border-slate-300 p-3 rounded-xl space-y-2 mt-2">
                        <input
                          type="text"
                          value={quickSkillName}
                          onChange={(e) => setQuickSkillName(e.target.value)}
                          placeholder="Ex.: Simulação de Coeficientes & Esteiras..."
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-[#00D492] focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleConfirmAddSkill()
                            if (e.key === "Escape") {
                              setShowAddSkill(false)
                              setQuickSkillName("")
                            }
                          }}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500">Nível:</span>
                            <select
                              value={quickSkillLevel}
                              onChange={(e) => setQuickSkillLevel(e.target.value as any)}
                              className="bg-white border border-slate-200 rounded-lg text-[10px] font-bold px-2 py-1 text-slate-700"
                            >
                              <option value="Básico">Básico</option>
                              <option value="Intermediário">Intermediário</option>
                              <option value="Avançado">Avançado</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddSkill(false)
                                setQuickSkillName("")
                              }}
                              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmAddSkill}
                              className="text-[11px] font-extrabold bg-slate-900 text-white hover:bg-[#00D492] hover:text-slate-950 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddSkill(true)}
                        className="w-full border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-600 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Habilidade Técnica</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Habilidades Comportamentais (Soft Skills) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm border-b border-slate-100 pb-3">
                    <Sparkles className="w-4 h-4 text-[#00D492]" />
                    <span>Habilidades Comportamentais (Soft Skills)</span>
                  </div>

                  {selectedColab.pdiData.habilidadesComportamentais.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-2">
                      Nenhuma soft skill cadastrada ainda. (Ex.: Comunicação persuasiva e clara, Resiliência sob pressão, Proatividade em follow-ups).
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {selectedColab.pdiData.habilidadesComportamentais.map((soft, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl">
                        <span>{soft}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            const updated = selectedColab.pdiData.habilidadesComportamentais.filter((_, idx) => idx !== i)
                            await handleUpdatePDIData({ ...selectedColab.pdiData, habilidadesComportamentais: updated }, true)
                          }}
                          className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  {showAddSoft ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={quickSoftName}
                        onChange={(e) => setQuickSoftName(e.target.value)}
                        placeholder="Ex.: Comunicação persuasiva e clara..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#00D492] focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleConfirmAddSoft()
                          if (e.key === "Escape") {
                            setShowAddSoft(false)
                            setQuickSoftName("")
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleConfirmAddSoft}
                        className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#00D492] hover:text-slate-950 transition-colors cursor-pointer"
                      >
                        Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddSoft(false)
                          setQuickSoftName("")
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddSoft(true)}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-600 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Soft Skill</span>
                    </button>
                  )}
                </div>

                {/* Pontos Fortes Validados */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm border-b border-slate-100 pb-3">
                    <CheckCircle2 className="w-4 h-4 text-[#00D492]" />
                    <span>Pontos Fortes Identificados pelo RH & Liderança</span>
                  </div>

                  {selectedColab.pdiData.pontosFortes.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-2">
                      Nenhum ponto forte adicionado ainda. (Ex.: Excelente rapport inicial com aposentados e pensionistas, Alto volume de ligações diárias com energia contagiante).
                    </p>
                  )}

                  <ul className="space-y-2 text-xs">
                    {selectedColab.pdiData.pontosFortes.map((ponto, i) => (
                      <li key={i} className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl text-slate-800 font-semibold">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="flex-1">{ponto}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            const updated = selectedColab.pdiData.pontosFortes.filter((_, idx) => idx !== i)
                            await handleUpdatePDIData({ ...selectedColab.pdiData, pontosFortes: updated }, true)
                          }}
                          className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  {showAddForte ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={quickForteName}
                        onChange={(e) => setQuickForteName(e.target.value)}
                        placeholder="Ex.: Excelente rapport inicial com aposentados..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#00D492] focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleConfirmAddForte()
                          if (e.key === "Escape") {
                            setShowAddForte(false)
                            setQuickForteName("")
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleConfirmAddForte}
                        className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#00D492] hover:text-slate-950 transition-colors cursor-pointer"
                      >
                        Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForte(false)
                          setQuickForteName("")
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddForte(true)}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-600 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Ponto Forte</span>
                    </button>
                  )}
                </div>

                {/* Competências a Explorar */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm border-b border-slate-100 pb-3">
                    <Compass className="w-4 h-4 text-[#00D492]" />
                    <span>Competências para Novas Responsabilidades</span>
                  </div>

                  {selectedColab.pdiData.competenciasNovas.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-2">
                      Nenhuma competência cadastrada ainda. (Ex.: Mentoria de novos consultores em fase de onboarding, Negociação consultiva com clientes de grande margem).
                    </p>
                  )}

                  <ul className="space-y-2 text-xs">
                    {selectedColab.pdiData.competenciasNovas.map((comp, i) => (
                      <li key={i} className="flex items-start gap-2 bg-purple-50/50 border border-purple-100 p-2.5 rounded-xl text-slate-800 font-semibold">
                        <ChevronRight className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                        <span className="flex-1">{comp}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            const updated = selectedColab.pdiData.competenciasNovas.filter((_, idx) => idx !== i)
                            await handleUpdatePDIData({ ...selectedColab.pdiData, competenciasNovas: updated }, true)
                          }}
                          className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  {showAddComp ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={quickCompName}
                        onChange={(e) => setQuickCompName(e.target.value)}
                        placeholder="Ex.: Mentoria de novos consultores..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#00D492] focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleConfirmAddComp()
                          if (e.key === "Escape") {
                            setShowAddComp(false)
                            setQuickCompName("")
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleConfirmAddComp}
                        className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#00D492] hover:text-slate-950 transition-colors cursor-pointer"
                      >
                        Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddComp(false)
                          setQuickCompName("")
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddComp(true)}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-600 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Competência</span>
                    </button>
                  )}
                </div>

              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 3: HISTÓRICO DE FEEDBACKS                              */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 3 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[#00D492]" />
                      <span>Linha do Tempo de Feedbacks & Alinhamentos</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Histórico transparente de 1:1s, alinhamentos de expectativas e combinados acordados.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingFeedbackIndex(null)
                      setNewFeedbackData({
                        data: new Date().toISOString().split("T")[0],
                        responsavel: "",
                        contexto: "",
                        percepcaoFuncionario: "",
                        pontosPositivos: "",
                        pontosMelhoria: "",
                        combinados: "",
                        dataRetorno: "",
                        anexos: []
                      })
                      setShowAddFeedbackModal(true)
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4 text-[#00D492]" />
                    <span>Registrar Novo Feedback</span>
                  </button>
                </div>

                {/* Timeline */}
                <div className="space-y-6">
                  {selectedColab.pdiData.feedbacks.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                      Nenhum feedback registrado ainda para este colaborador.
                    </div>
                  ) : (
                    selectedColab.pdiData.feedbacks.map((fb, idx) => (
                      <div key={fb.id || idx} className="relative pl-6 border-l-2 border-slate-200 space-y-3 pb-6 last:pb-0">
                        {/* Timeline Pin */}
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 ring-4 ring-white" />

                        {/* Feedback Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-900">{formatDateBR(fb.data)}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs font-semibold text-slate-600">Por: <strong>{fb.responsavel}</strong></span>

                              {/* Anexos vinculados ao feedback (ao lado direito da data e responsável) */}
                              {fb.anexos && fb.anexos.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap ml-1 pl-2 border-l border-slate-200">
                                  {fb.anexos.map((att, attIdx) => (
                                    <button
                                      key={att.id || attIdx}
                                      type="button"
                                      onClick={() => setPreviewAttachment(att)}
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-slate-700 border border-slate-200 transition-all shadow-xs cursor-pointer group"
                                      title={`Visualizar anexo: ${att.name}`}
                                    >
                                      {getAttachmentIcon(att.type)}
                                      <span className="max-w-[130px] truncate">{att.name}</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {fb.dataRetorno && (
                                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 mr-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Retorno agendado: {formatDateBR(fb.dataRetorno)}</span>
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditFeedback(fb, idx)}
                                className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Editar este feedback"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setFeedbackParaExcluir({ feedback: fb, index: idx })}
                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Excluir este feedback"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contexto ou Situação Abordada</span>
                              <p className="font-semibold text-slate-800 mt-0.5">{fb.contexto}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Percepção do Colaborador</span>
                              <p className="font-semibold text-slate-800 mt-0.5">{fb.percepcaoFuncionario || "—"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200/80">
                            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Pontos Positivos</span>
                              <div className="text-slate-800">{renderFormattedFeedbackText(fb.pontosPositivos)}</div>
                            </div>
                            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Pontos de Melhoria</span>
                              <div className="text-slate-800">{renderFormattedFeedbackText(fb.pontosMelhoria)}</div>
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Combinados Definidos & Próximos Passos</span>
                            <p className="font-bold text-slate-900">{fb.combinados}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 4: COMPORTAMENTOS A DESENVOLVER                        */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 4 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-[#00D492]" />
                      <span>Matriz de Comportamentos a Desenvolver</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Mapeamento de desvios, situações recorrentes, impactos e comportamentos esperados.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingComportamentoIndex(null)
                      setNewCompData({
                        comportamento: "",
                        situacao: "",
                        impacto: "",
                        comportamentoEsperado: "",
                        prioridade: "Média",
                        status: "Não iniciado"
                      })
                      setShowAddComportamentoModal(true)
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4 text-[#00D492]" />
                    <span>Adicionar Comportamento</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {selectedColab.pdiData.comportamentos.map((c, i) => (
                    <div key={c.id || i} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">{c.comportamento}</h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap", getStatusBadgeClass(c.status))}>
                              {c.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditComportamento(c, i)}
                              className="text-slate-400 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Editar este comportamento"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setComportamentoParaExcluir({ comportamento: c, index: i })}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Excluir este comportamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Situação em que aparece:</span>
                            <p className="font-medium text-slate-700">{c.situacao}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Impacto nos resultados/trabalho:</span>
                            {renderFormattedFeedbackText(c.impacto)}
                          </div>
                          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Comportamento esperado:</span>
                            <div className="mt-0.5">
                              {renderFormattedFeedbackText(c.comportamentoEsperado)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 text-xs">
                        <span className="text-[11px] font-bold text-slate-500">
                          Prioridade: <strong className={c.prioridade === "Alta" ? "text-rose-600" : "text-slate-800"}>{c.prioridade}</strong>
                        </span>

                        <select
                          value={c.status}
                          onChange={(e) => {
                            const updated = [...selectedColab.pdiData.comportamentos]
                            updated[i].status = e.target.value as any
                            handleUpdatePDIData({ ...selectedColab.pdiData, comportamentos: updated })
                          }}
                          className="bg-white border border-slate-200 rounded-lg text-[10px] font-bold px-2 py-1 text-slate-800"
                        >
                          <option value="Não iniciado">Não iniciado</option>
                          <option value="Em desenvolvimento">Em desenvolvimento</option>
                          <option value="Consolidado">Consolidado</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 5: PDI & REGISTRO SEMANAL (Fiel à Imagem 3.jpeg)        */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 5 && (
              <div className="space-y-6">
                
                {/* ====================================================== */}
                {/* COMPONENTE INTERATIVO DE REGISTRO SEMANAL (Imagem 3)   */}
                {/* ====================================================== */}
                <div className="bg-white rounded-2xl border-2 border-slate-900/10 p-6 shadow-sm space-y-6">
                  
                  {/* Header do Registro Semanal */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        Registro semanal — {selectedColab.name.split(" ")[0]}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Acompanhamento prático das metas semana a semana com cópia rápida para atas de 1:1.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyWeeklyLog}
                      className="bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
                    >
                      <Copy className="w-4 h-4 text-[#00D492]" />
                      <span>Copiar registro semanal</span>
                    </button>
                  </div>

                  {/* 1. Seleção de Período (Radio buttons horizontais da Imagem 3) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Período
                    </label>
                    <div className="flex flex-wrap items-center gap-6 pt-1">
                      {[
                        { key: "semana1", label: "Semana 1" },
                        { key: "semana2", label: "Semana 2" },
                        { key: "semana3", label: "Semana 3" },
                        { key: "semana4", label: "Semana 4" },
                      ].map((sem) => (
                        <label
                          key={sem.key}
                          className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none"
                        >
                          <input
                            type="radio"
                            name="weekly_period"
                            checked={selectedSemana === sem.key}
                            onChange={() => setSelectedSemana(sem.key as any)}
                            className="w-4 h-4 text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                          />
                          <span>{sem.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 2. Ação prevista */}
                  <FormattedFeedbackField
                    label="Ação prevista"
                    labelColor="text-xs font-bold text-slate-700"
                    value={selectedColab.pdiData.registroSemanal[selectedSemana].acaoPrevista || ""}
                    onChange={(val) => {
                      const curWeek = { ...selectedColab.pdiData.registroSemanal[selectedSemana], acaoPrevista: val }
                      handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        registroSemanal: {
                          ...selectedColab.pdiData.registroSemanal,
                          [selectedSemana]: curWeek
                        }
                      })
                    }}
                    placeholder="Treinar a objeção 'vou pensar' em duas simulações e aplicar a técnica nas negociações reais."
                    rows={2}
                  />

                  {/* 3. Evidência observada */}
                  <FormattedFeedbackField
                    label="Evidência observada"
                    labelColor="text-xs font-bold text-slate-700"
                    value={selectedColab.pdiData.registroSemanal[selectedSemana].evidenciaObservada || ""}
                    onChange={(val) => {
                      const curWeek = { ...selectedColab.pdiData.registroSemanal[selectedSemana], evidenciaObservada: val }
                      handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        registroSemanal: {
                          ...selectedColab.pdiData.registroSemanal,
                          [selectedSemana]: curWeek
                        }
                      })
                    }}
                    placeholder="Ex.: conduziu duas simulações, identificou a objeção e combinou a retomada..."
                    rows={2}
                  />

                  {/* 4. Status (Radio buttons verticais da Imagem 3) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Status
                    </label>
                    <div className="space-y-2 pt-0.5">
                      {[
                        { val: "Não iniciado", label: "Não iniciado" },
                        { val: "Em andamento", label: "Em andamento" },
                        { val: "Concluído", label: "Concluído" },
                        { val: "Precisa de reforço", label: "Precisa de reforço" },
                      ].map((opt) => (
                        <label
                          key={opt.val}
                          className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer select-none"
                        >
                          <input
                            type="radio"
                            name="weekly_status"
                            value={opt.val}
                            checked={selectedColab.pdiData.registroSemanal[selectedSemana].status === opt.val}
                            onChange={() => {
                              const curWeek = { ...selectedColab.pdiData.registroSemanal[selectedSemana], status: opt.val as any }
                              handleUpdatePDIData({
                                ...selectedColab.pdiData,
                                registroSemanal: {
                                  ...selectedColab.pdiData.registroSemanal,
                                  [selectedSemana]: curWeek
                                }
                              })
                            }}
                            className="w-4 h-4 text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 5. Próximo passo / obstáculo identificado */}
                  <FormattedFeedbackField
                    label="Próximo passo / obstáculo identificado"
                    labelColor="text-xs font-bold text-slate-700"
                    value={selectedColab.pdiData.registroSemanal[selectedSemana].proximoPasso || ""}
                    onChange={(val) => {
                      const curWeek = { ...selectedColab.pdiData.registroSemanal[selectedSemana], proximoPasso: val }
                      handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        registroSemanal: {
                          ...selectedColab.pdiData.registroSemanal,
                          [selectedSemana]: curWeek
                        }
                      })
                    }}
                    placeholder="O que será feito, por quem e até quando?"
                    rows={2}
                  />

                  {/* Botão de Rodapé Copiar Registro Semanal (Idêntico ao da imagem 3) */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCopyWeeklyLog}
                      className="w-full bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-[#00D492]" />
                      <span>Copiar registro semanal</span>
                    </button>
                  </div>

                </div>

                {/* ====================================================== */}
                {/* TABELA DE METAS E AÇÕES PRÁTICAS DO PDI                */}
                {/* ====================================================== */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Target className="w-5 h-5 text-[#00D492]" />
                        <span>Metas & Plano de Ação Individual (PDI)</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Objetivos de desenvolvimento, atividades propostas, prazos e indicadores de sucesso.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddAcaoModal(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4 text-[#00D492]" />
                      <span>Adicionar Nova Meta</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wider">
                          <th className="py-3 px-3 rounded-l-lg">Objetivo</th>
                          <th className="py-3 px-3">Ações Práticas</th>
                          <th className="py-3 px-3">Responsável</th>
                          <th className="py-3 px-3">Prazo</th>
                          <th className="py-3 px-3">Indicador</th>
                          <th className="py-3 px-3 text-center">Status</th>
                          <th className="py-3 px-3 text-right rounded-r-lg">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                        {selectedColab.pdiData.acoes.map((acao, i) => (
                          <tr key={acao.id || i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-bold text-slate-900">{acao.objetivo}</td>
                            <td className="py-3 px-3 text-slate-600">{acao.acoesPraticas}</td>
                            <td className="py-3 px-3 text-slate-500">{acao.responsavel}</td>
                            <td className="py-3 px-3 font-bold text-slate-800">{formatDateBR(acao.prazo)}</td>
                            <td className="py-3 px-3 text-slate-600">{acao.indicador}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", getStatusBadgeClass(acao.status))}>
                                {acao.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = selectedColab.pdiData.acoes.filter((_, idx) => idx !== i)
                                  handleUpdatePDIData({ ...selectedColab.pdiData, acoes: updated })
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 6: EVIDÊNCIAS & ENTREGAS                               */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 6 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-[#00D492]" />
                      <span>Repositório de Evidências & Entregas</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Comprovação do que foi realizado e aprendido, registros de situações reais e validação da liderança.
                    </p>
                  </div>

                  {showAddEvidencia ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={quickEvidenciaTitle}
                        onChange={(e) => setQuickEvidenciaTitle(e.target.value)}
                        placeholder="Título da evidência / entrega..."
                        className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#00D492] focus:outline-none min-w-[260px]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleConfirmAddEvidencia()
                          if (e.key === "Escape") {
                            setShowAddEvidencia(false)
                            setQuickEvidenciaTitle("")
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleConfirmAddEvidencia}
                        className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#00D492] hover:text-slate-950 transition-colors cursor-pointer"
                      >
                        Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddEvidencia(false)
                          setQuickEvidenciaTitle("")
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddEvidencia(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4 text-[#00D492]" />
                      <span>Adicionar Evidência</span>
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {selectedColab.pdiData.evidencias.length === 0 && (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                      Nenhuma evidência ou entrega registrada ainda. Clique no botão &quot;Adicionar Evidência&quot; acima para registrar comprovações práticas do PDI.
                    </div>
                  )}

                  {selectedColab.pdiData.evidencias.map((ev, i) => (
                    <div key={ev.id || i} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                          <CheckCircle2 className="w-4 h-4 text-[#00D492] flex-shrink-0" />
                          <input
                            type="text"
                            value={ev.titulo}
                            onChange={(e) => {
                              const updated = [...selectedColab.pdiData.evidencias]
                              updated[i] = { ...updated[i], titulo: e.target.value }
                              handleUpdatePDIData({ ...selectedColab.pdiData, evidencias: updated })
                            }}
                            placeholder="Título da evidência / entrega..."
                            className="font-extrabold text-sm text-slate-900 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-slate-300 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-[#00D492]"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Data: {ev.dataValidacao}</span>
                          <select
                            value={ev.validacaoLideranca}
                            onChange={async (e) => {
                              const updated = [...selectedColab.pdiData.evidencias]
                              updated[i] = { ...updated[i], validacaoLideranca: e.target.value as any }
                              await handleUpdatePDIData({ ...selectedColab.pdiData, evidencias: updated }, true)
                            }}
                            className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-white cursor-pointer", getStatusBadgeClass(ev.validacaoLideranca))}
                          >
                            <option value="Em análise">Em análise</option>
                            <option value="Validado">Validado</option>
                            <option value="Necessita Ajustes">Necessita Ajustes</option>
                          </select>
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = selectedColab.pdiData.evidencias.filter((_, idx) => idx !== i)
                              await handleUpdatePDIData({ ...selectedColab.pdiData, evidencias: updated }, true)
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir evidência"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <FormattedFeedbackField
                          label="Atividades Concluídas"
                          labelColor="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                          value={ev.atividadesConcluidas || ""}
                          onChange={(val) => {
                            const updated = [...selectedColab.pdiData.evidencias]
                            updated[i] = { ...updated[i], atividadesConcluidas: val }
                            handleUpdatePDIData({ ...selectedColab.pdiData, evidencias: updated })
                          }}
                          placeholder="Descreva a aplicação prática das novas rotinas combinadas no PDI..."
                          rows={2}
                        />

                        <FormattedFeedbackField
                          label="Situação Real Enfrentada"
                          labelColor="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                          value={ev.situacaoReal || ""}
                          onChange={(val) => {
                            const updated = [...selectedColab.pdiData.evidencias]
                            updated[i] = { ...updated[i], situacaoReal: val }
                            handleUpdatePDIData({ ...selectedColab.pdiData, evidencias: updated })
                          }}
                          placeholder="Atendimento ou projeto com cliente real enfrentado pelo colaborador..."
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200/80">
                        <FormattedFeedbackField
                          label="Resultado Antes vs Depois"
                          labelColor="text-[10px] font-bold text-emerald-700 uppercase tracking-wider"
                          value={ev.resultadoAntesDepois || ""}
                          onChange={(val) => {
                            const updated = [...selectedColab.pdiData.evidencias]
                            updated[i] = { ...updated[i], resultadoAntesDepois: val }
                            handleUpdatePDIData({ ...selectedColab.pdiData, evidencias: updated })
                          }}
                          placeholder="Melhoria perceptível na conversão, tempo de resposta e satisfação..."
                          rows={2}
                        />

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Material / Link de Comprovação
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={ev.linkDocumento}
                              onChange={(e) => {
                                const updated = [...selectedColab.pdiData.evidencias]
                                updated[i] = { ...updated[i], linkDocumento: e.target.value }
                                handleUpdatePDIData({ ...selectedColab.pdiData, evidencias: updated })
                              }}
                              placeholder="Link da gravação, pasta de arquivos ou ID da proposta..."
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00D492]"
                            />
                            {ev.linkDocumento && (ev.linkDocumento.startsWith("http://") || ev.linkDocumento.startsWith("https://")) && (
                              <a
                                href={ev.linkDocumento}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl text-blue-600 transition-colors flex-shrink-0"
                                title="Abrir link"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 7: EVOLUÇÃO & REAVALIAÇÕES                             */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 7 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#00D492]" />
                    <span>Evolução & Reavaliações Periódicas</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Comparativo entre o ponto de partida e o momento atual da jornada profissional.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
                    <FormattedFeedbackField
                      label="Avaliação Inicial (Ponto de Partida)"
                      labelColor="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                      value={selectedColab.pdiData.avaliacaoInicial || ""}
                      onChange={(val) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        avaliacaoInicial: val
                      })}
                      placeholder="Ex.: Diagnóstico inicial de competências, postura em atendimento, nível de conhecimento dos produtos consignados e esteiras operacionais..."
                      rows={3}
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
                    <FormattedFeedbackField
                      label="Revisões Periódicas Realizadas"
                      labelColor="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                      value={selectedColab.pdiData.revisoesPeriodicas || ""}
                      onChange={(val) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        revisoesPeriodicas: val
                      })}
                      placeholder="Ex.: Checkpoints periódicos realizados com alinhamento de escutas e acompanhamento da evolução nos indicadores acordados..."
                      rows={3}
                    />
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl space-y-1.5">
                    <FormattedFeedbackField
                      label="Evoluções Percebidas na Rotina"
                      labelColor="text-[10px] font-bold text-emerald-800 uppercase tracking-wider"
                      value={selectedColab.pdiData.evolucoesPercebidas || ""}
                      onChange={(val) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        evolucoesPercebidas: val
                      })}
                      placeholder="Ex.: Aumento na assertividade de fechamento de propostas, maior segurança nas negociações e redução de pendências operacionais..."
                      rows={3}
                    />
                  </div>

                  <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl space-y-1.5">
                    <FormattedFeedbackField
                      label="Pontos que Continuam Exigindo Atenção"
                      labelColor="text-[10px] font-bold text-amber-800 uppercase tracking-wider"
                      value={selectedColab.pdiData.pontosAtencao || ""}
                      onChange={(val) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        pontosAtencao: val
                      })}
                      placeholder="Ex.: Reforçar consistência no follow-up com clientes e atenção ao preenchimento de propostas..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 8: POTENCIAL & PRÓXIMOS PASSOS                         */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 8 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Compass className="w-5 h-5 text-[#00D492]" />
                      <span>Potencial, Prontidão & Plano de Carreira</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Visibilidade de oportunidades, competências para o próximo nível e critérios para promoção/efetivação.
                    </p>
                  </div>

                  {/* Prontidão Badge / Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Prontidão:</span>
                    <select
                      value={selectedColab.pdiData.prontidao}
                      onChange={(e) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        prontidao: e.target.value as any
                      })}
                      className="bg-slate-900 text-[#00D492] font-black text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none"
                    >
                      <option value="Pronto para Promoção">Pronto para Promoção (Imediato)</option>
                      <option value="Pronto em 3-6 Meses">Pronto em 3-6 Meses</option>
                      <option value="Em Desenvolvimento Ativo">Em Desenvolvimento Ativo</option>
                      <option value="Foco no Cargo Atual">Foco no Cargo Atual</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
                    <FormattedFeedbackField
                      label="Competências Necessárias para o Próximo Nível"
                      labelColor="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                      value={selectedColab.pdiData.competenciasProximoNivel || ""}
                      onChange={(val) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        competenciasProximoNivel: val
                      })}
                      placeholder="Ex.: Visão estratégica das esteiras bancárias, negociação com clientes de alta margem e liderança situacional..."
                      rows={3}
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
                    <FormattedFeedbackField
                      label="Preparação para Novas Responsabilidades"
                      labelColor="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                      value={selectedColab.pdiData.preparacaoNovasResponsabilidades || ""}
                      onChange={(val) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        preparacaoNovasResponsabilidades: val
                      })}
                      placeholder="Ex.: Auxiliar na mentoria e apoio técnico aos consultores em fase de onboarding..."
                      rows={3}
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
                    <FormattedFeedbackField
                      label="Necessidades de Treinamento & Capacitação"
                      labelColor="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                      value={selectedColab.pdiData.necessidadesTreinamento || ""}
                      onChange={(val) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        necessidadesTreinamento: val
                      })}
                      placeholder="Ex.: Treinamento avançado em técnicas de persuasão e regras específicas de novos convênios..."
                      rows={3}
                    />
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl space-y-1.5">
                    <FormattedFeedbackField
                      label="Critérios para Efetivação ou Promoção"
                      labelColor="text-[10px] font-bold text-emerald-800 uppercase tracking-wider"
                      value={selectedColab.pdiData.criteriosEfetivacao || ""}
                      onChange={(val) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        criteriosEfetivacao: val
                      })}
                      placeholder="Ex.: Superação contínua de metas, assiduidade exemplar e aderência total aos combinados do PDI..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2">
                  <span className="text-[10px] font-extrabold text-[#00D492] uppercase tracking-wider block">
                    Decisões & Encaminhamentos Acordados (RH & Liderança)
                  </span>
                  <textarea
                    rows={3}
                    value={selectedColab.pdiData.decisoesAcordadas}
                    onChange={(e) => handleUpdatePDIData({
                      ...selectedColab.pdiData,
                      decisoesAcordadas: e.target.value
                    })}
                    placeholder="Decisões pactuadas para os próximos ciclos de desenvolvimento..."
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00D492]"
                  />
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE FEEDBACK                          */}
      {/* ============================================================== */}
      {feedbackParaExcluir && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-black text-slate-900 leading-tight">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tem certeza que deseja excluir o feedback de <strong className="text-slate-900 font-bold">{formatDateBR(feedbackParaExcluir.feedback.data) || "data não informada"}</strong> registrado por <strong className="text-slate-900 font-bold">{feedbackParaExcluir.feedback.responsavel || "responsável não informado"}</strong>?
                </p>
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  Esta ação é irreversível e o registro será removido permanentemente do PDI.
                </p>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingFeedback}
                onClick={() => setFeedbackParaExcluir(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingFeedback}
                onClick={handleConfirmDeleteFeedback}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingFeedback ? "Excluindo..." : "Sim, Excluir"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE COMPORTAMENTO                     */}
      {/* ============================================================== */}
      {comportamentoParaExcluir && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-black text-slate-900 leading-tight">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tem certeza que deseja excluir o comportamento <strong className="text-slate-900 font-bold">{comportamentoParaExcluir.comportamento.comportamento}</strong>?
                </p>
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  Esta ação é irreversível e o registro será removido permanentemente do PDI.
                </p>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingComportamento}
                onClick={() => setComportamentoParaExcluir(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingComportamento}
                onClick={handleConfirmDeleteComportamento}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingComportamento ? "Excluindo..." : "Sim, Excluir"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVO FEEDBACK                                           */}
      {/* ============================================================== */}
      {showAddFeedbackModal && selectedColab && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                {editingFeedbackIndex !== null ? (
                  <>
                    <Pencil className="w-4 h-4 text-[#00D492]" />
                    <span>Editar Feedback</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 text-[#00D492]" />
                    <span>Registrar Novo Feedback</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setShowAddFeedbackModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Data</label>
                  <input
                    type="date"
                    value={toDateInputValue(newFeedbackData.data)}
                    onChange={(e) => setNewFeedbackData({ ...newFeedbackData, data: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#00D492] transition-colors cursor-pointer"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Responsável</label>
                  <input
                    type="text"
                    value={newFeedbackData.responsavel}
                    onChange={(e) => setNewFeedbackData({ ...newFeedbackData, responsavel: e.target.value })}
                    placeholder="Nome do Líder / RH"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Contexto ou Situação Abordada</label>
                <input
                  type="text"
                  value={newFeedbackData.contexto}
                  onChange={(e) => setNewFeedbackData({ ...newFeedbackData, contexto: e.target.value })}
                  placeholder="Ex.: Alinhamento de metas de conversão de propostas..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Percepção do Colaborador</label>
                <input
                  type="text"
                  value={newFeedbackData.percepcaoFuncionario}
                  onChange={(e) => setNewFeedbackData({ ...newFeedbackData, percepcaoFuncionario: e.target.value })}
                  placeholder="Como o colaborador reagiu..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormattedFeedbackField
                  label="Pontos Positivos"
                  labelColor="text-emerald-700"
                  value={newFeedbackData.pontosPositivos}
                  onChange={(val) => setNewFeedbackData({ ...newFeedbackData, pontosPositivos: val })}
                  placeholder="Ex.: Demonstrou dedicação na prospecção e rápida assimilação das orientações..."
                  rows={3}
                />
                <FormattedFeedbackField
                  label="Pontos de Melhoria"
                  labelColor="text-amber-700"
                  value={newFeedbackData.pontosMelhoria}
                  onChange={(val) => setNewFeedbackData({ ...newFeedbackData, pontosMelhoria: val })}
                  placeholder="Ex.: Aprimorar assertividade no fechamento e contorno de objeções de taxas..."
                  rows={3}
                />
              </div>

              {/* Anexos do Feedback (fotos, documentos, áudios, vídeos) */}
              <div className="space-y-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-slate-600" />
                    <label className="font-bold text-slate-800 text-xs">
                      Anexos do Feedback
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      (imagens, documentos, áudios ou vídeos)
                    </span>
                  </div>

                  <label className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-[#00D492] hover:text-slate-950 cursor-pointer transition-all shadow-xs select-none",
                    isUploadingAttachments && "opacity-50 pointer-events-none"
                  )}>
                    {isUploadingAttachments ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Anexar Arquivo</span>
                      </>
                    )}
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleUploadFeedbackFiles}
                      className="hidden"
                      disabled={isUploadingAttachments}
                    />
                  </label>
                </div>

                {newFeedbackData.anexos && newFeedbackData.anexos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {newFeedbackData.anexos.map((att, i) => (
                      <div 
                        key={att.id || i}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
                            {getAttachmentIcon(att.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 truncate" title={att.name}>
                              {att.name}
                            </p>
                            {att.size && (
                              <p className="text-[9px] text-slate-400 font-medium">
                                {formatFileSize(att.size)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment(att)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar anexo"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewFeedbackData(prev => ({
                                ...prev,
                                anexos: prev.anexos?.filter((_, idx) => idx !== i)
                              }))
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remover anexo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Nenhum arquivo anexado a este feedback ainda.
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Combinados Definidos</label>
                <input
                  type="text"
                  value={newFeedbackData.combinados}
                  onChange={(e) => setNewFeedbackData({ ...newFeedbackData, combinados: e.target.value })}
                  placeholder="Acordos e ações práticas..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Data para Retomar o Assunto</label>
                <input
                  type="date"
                  value={toDateInputValue(newFeedbackData.dataRetorno)}
                  onChange={(e) => setNewFeedbackData({ ...newFeedbackData, dataRetorno: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-[#00D492] transition-colors cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddFeedbackModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newFeedbackData.responsavel || !newFeedbackData.contexto) {
                    toast.error("Preencha ao menos o responsável e o contexto.")
                    return
                  }
                  if (editingFeedbackIndex !== null && selectedColab.pdiData?.feedbacks) {
                    const updatedFeedbacks = [...selectedColab.pdiData.feedbacks]
                    const currentId = updatedFeedbacks[editingFeedbackIndex]?.id || `fb-${Date.now()}`
                    updatedFeedbacks[editingFeedbackIndex] = {
                      id: currentId,
                      data: formatDateBR(newFeedbackData.data) || newFeedbackData.data || new Date().toLocaleDateString("pt-BR"),
                      responsavel: newFeedbackData.responsavel || "",
                      contexto: newFeedbackData.contexto || "",
                      percepcaoFuncionario: newFeedbackData.percepcaoFuncionario || "",
                      pontosPositivos: newFeedbackData.pontosPositivos || "",
                      pontosMelhoria: newFeedbackData.pontosMelhoria || "",
                      combinados: newFeedbackData.combinados || "",
                      dataRetorno: formatDateBR(newFeedbackData.dataRetorno) || newFeedbackData.dataRetorno || "",
                      anexos: newFeedbackData.anexos || []
                    }
                    handleUpdatePDIData({
                      ...selectedColab.pdiData,
                      feedbacks: updatedFeedbacks
                    })
                    setShowAddFeedbackModal(false)
                    setEditingFeedbackIndex(null)
                    toast.success("Feedback atualizado com sucesso!")
                  } else {
                    const created: PDIFeedback = {
                      id: `fb-${Date.now()}`,
                      data: formatDateBR(newFeedbackData.data) || new Date().toLocaleDateString("pt-BR"),
                      responsavel: newFeedbackData.responsavel || "",
                      contexto: newFeedbackData.contexto || "",
                      percepcaoFuncionario: newFeedbackData.percepcaoFuncionario || "",
                      pontosPositivos: newFeedbackData.pontosPositivos || "",
                      pontosMelhoria: newFeedbackData.pontosMelhoria || "",
                      combinados: newFeedbackData.combinados || "",
                      dataRetorno: formatDateBR(newFeedbackData.dataRetorno) || "",
                      anexos: newFeedbackData.anexos || []
                    }
                    handleUpdatePDIData({
                      ...selectedColab.pdiData!,
                      feedbacks: [created, ...selectedColab.pdiData!.feedbacks]
                    })
                    setShowAddFeedbackModal(false)
                    toast.success("Feedback registrado com sucesso!")
                  }
                }}
                className="bg-slate-900 hover:bg-[#00D492] hover:text-slate-950 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                {editingFeedbackIndex !== null ? "Salvar Alterações" : "Salvar Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVO COMPORTAMENTO                                      */}
      {/* ============================================================== */}
      {showAddComportamentoModal && selectedColab && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                {editingComportamentoIndex !== null ? (
                  <>
                    <Pencil className="w-4 h-4 text-[#00D492]" />
                    <span>Editar Comportamento a Desenvolver</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-[#00D492]" />
                    <span>Adicionar Comportamento a Desenvolver</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setShowAddComportamentoModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Comportamento Identificado</label>
                <input
                  type="text"
                  value={newCompData.comportamento}
                  onChange={(e) => setNewCompData({ ...newCompData, comportamento: e.target.value })}
                  placeholder="Ex.: Hesitação no fechamento ao ouvir objeção..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Situação em que ele aparece</label>
                <input
                  type="text"
                  value={newCompData.situacao}
                  onChange={(e) => setNewCompData({ ...newCompData, situacao: e.target.value })}
                  placeholder="Ex.: Chamadas ativas de portabilidade..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormattedFeedbackField
                  label="Impacto no trabalho ou resultados"
                  labelColor="text-rose-500"
                  value={newCompData.impacto || ""}
                  onChange={(val) => setNewCompData({ ...newCompData, impacto: val })}
                  placeholder="Ex.: Perda de clientes quentes..."
                  rows={3}
                />
                <FormattedFeedbackField
                  label="Comportamento Esperado"
                  labelColor="text-emerald-700"
                  value={newCompData.comportamentoEsperado || ""}
                  onChange={(val) => setNewCompData({ ...newCompData, comportamentoEsperado: val })}
                  placeholder="Padrão de excelência acordado..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Prioridade</label>
                  <select
                    value={newCompData.prioridade}
                    onChange={(e) => setNewCompData({ ...newCompData, prioridade: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Status</label>
                  <select
                    value={newCompData.status}
                    onChange={(e) => setNewCompData({ ...newCompData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  >
                    <option value="Não iniciado">Não iniciado</option>
                    <option value="Em desenvolvimento">Em desenvolvimento</option>
                    <option value="Consolidado">Consolidado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddComportamentoModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newCompData.comportamento) {
                    toast.error("Informe o comportamento a ser trabalhado.")
                    return
                  }
                  if (editingComportamentoIndex !== null && selectedColab.pdiData?.comportamentos) {
                    const updatedComps = [...selectedColab.pdiData.comportamentos]
                    const currentId = updatedComps[editingComportamentoIndex]?.id || `comp-${Date.now()}`
                    updatedComps[editingComportamentoIndex] = {
                      id: currentId,
                      comportamento: newCompData.comportamento || "",
                      situacao: newCompData.situacao || "",
                      impacto: newCompData.impacto || "",
                      comportamentoEsperado: newCompData.comportamentoEsperado || "",
                      prioridade: (newCompData.prioridade as any) || "Média",
                      status: (newCompData.status as any) || "Não iniciado"
                    }
                    handleUpdatePDIData({
                      ...selectedColab.pdiData,
                      comportamentos: updatedComps
                    })
                    setShowAddComportamentoModal(false)
                    setEditingComportamentoIndex(null)
                    toast.success("Comportamento atualizado!")
                  } else {
                    const created: PDIComportamento = {
                      id: `comp-${Date.now()}`,
                      comportamento: newCompData.comportamento || "",
                      situacao: newCompData.situacao || "",
                      impacto: newCompData.impacto || "",
                      comportamentoEsperado: newCompData.comportamentoEsperado || "",
                      prioridade: newCompData.prioridade as any || "Média",
                      status: newCompData.status as any || "Não iniciado"
                    }
                    handleUpdatePDIData({
                      ...selectedColab.pdiData!,
                      comportamentos: [...selectedColab.pdiData!.comportamentos, created]
                    })
                    setShowAddComportamentoModal(false)
                    toast.success("Comportamento adicionado!")
                  }
                }}
                className="bg-slate-900 hover:bg-[#00D492] hover:text-slate-950 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                {editingComportamentoIndex !== null ? "Salvar Alterações" : "Salvar Comportamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVA META PDI                                           */}
      {/* ============================================================== */}
      {showAddAcaoModal && selectedColab && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#00D492]" />
                <span>Adicionar Meta ao PDI</span>
              </h3>
              <button
                onClick={() => setShowAddAcaoModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Objetivo de Desenvolvimento</label>
                <input
                  type="text"
                  value={newAcaoData.objetivo}
                  onChange={(e) => setNewAcaoData({ ...newAcaoData, objetivo: e.target.value })}
                  placeholder="Ex.: Dominar e aplicar contorno de objeções..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Ações Práticas e Atividades Propostas</label>
                <textarea
                  rows={2}
                  value={newAcaoData.acoesPraticas}
                  onChange={(e) => setNewAcaoData({ ...newAcaoData, acoesPraticas: e.target.value })}
                  placeholder="Ex.: Treinar a objeção 'vou pensar' em duas simulações..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Responsável</label>
                  <input
                    type="text"
                    value={newAcaoData.responsavel}
                    onChange={(e) => setNewAcaoData({ ...newAcaoData, responsavel: e.target.value })}
                    placeholder="Colaborador + Líder"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Prazo</label>
                  <input
                    type="date"
                    value={toDateInputValue(newAcaoData.prazo)}
                    onChange={(e) => setNewAcaoData({ ...newAcaoData, prazo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#00D492] transition-colors cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Frequência</label>
                  <select
                    value={newAcaoData.frequencia}
                    onChange={(e) => setNewAcaoData({ ...newAcaoData, frequencia: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  >
                    <option value="Semanal">Semanal</option>
                    <option value="Quinzenal">Quinzenal</option>
                    <option value="Mensal">Mensal</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Status</label>
                  <select
                    value={newAcaoData.status}
                    onChange={(e) => setNewAcaoData({ ...newAcaoData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  >
                    <option value="Não iniciado">Não iniciado</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Precisa de reforço">Precisa de reforço</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Indicador de Evolução</label>
                <input
                  type="text"
                  value={newAcaoData.indicador}
                  onChange={(e) => setNewAcaoData({ ...newAcaoData, indicador: e.target.value })}
                  placeholder="Ex.: Taxa de conversão de leads > 18%"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddAcaoModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newAcaoData.objetivo) {
                    toast.error("Informe o objetivo de desenvolvimento.")
                    return
                  }
                  const created: PDIAcao = {
                    id: `acao-${Date.now()}`,
                    objetivo: newAcaoData.objetivo || "",
                    acoesPraticas: newAcaoData.acoesPraticas || "",
                    responsavel: newAcaoData.responsavel || "Colaborador",
                    prazo: formatDateBR(newAcaoData.prazo) || "A definir",
                    frequencia: newAcaoData.frequencia as any || "Semanal",
                    indicador: newAcaoData.indicador || "",
                    resultadoEsperado: newAcaoData.resultadoEsperado || "",
                    resultadoAlcancado: newAcaoData.resultadoAlcancado || "",
                    status: newAcaoData.status as any || "Em andamento"
                  }
                  handleUpdatePDIData({
                    ...selectedColab.pdiData!,
                    acoes: [...selectedColab.pdiData!.acoes, created]
                  })
                  setShowAddAcaoModal(false)
                  toast.success("Meta adicionada ao PDI!")
                }}
                className="bg-slate-900 hover:bg-[#00D492] hover:text-slate-950 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Simples de Foto em Tamanho Real */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-[999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-w-lg w-full flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <h3 className="font-extrabold text-sm text-slate-900 truncate">
                  {previewPhoto.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Imagem em tamanho real */}
            <div className="relative bg-slate-950 flex items-center justify-center p-2 min-h-[280px] max-h-[75vh] overflow-hidden">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.name}
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-md"
              />
            </div>

            {/* Rodapé com botão fechar */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
              <span className="text-[11px] font-medium text-slate-400">
                Visualização em tamanho real
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-[#00D492] hover:text-slate-950 text-white transition-all cursor-pointer shadow-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizador de PDF (renderizado via canvas com react-pdf, sem bloqueio de iframe de navegador) */}
      {previewAttachment && (
        (previewAttachment.type || "").toLowerCase().includes("pdf") ||
        (previewAttachment.name || "").toLowerCase().endsWith(".pdf")
      ) && (
        <FilePreviewModal
          isOpen={true}
          onClose={() => setPreviewAttachment(null)}
          url={previewAttachment.url}
          label={previewAttachment.name}
          extension="PDF"
        />
      )}

      {/* Modal Visualizador de Imagens, Vídeos, Áudios e outros Anexos */}
      {previewAttachment && !(
        (previewAttachment.type || "").toLowerCase().includes("pdf") ||
        (previewAttachment.name || "").toLowerCase().endsWith(".pdf")
      ) && (
        <div 
          className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewAttachment(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0">
                  {getAttachmentIcon(previewAttachment.type)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 truncate" title={previewAttachment.name}>
                    {previewAttachment.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <span>{previewAttachment.type || "Arquivo"}</span>
                    {previewAttachment.size ? (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(previewAttachment.size)}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
                  title="Baixar ou abrir original"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Baixar / Abrir</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Preview */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/5 min-h-[300px] max-h-[75vh]">
              {(() => {
                const type = (previewAttachment.type || "").toLowerCase()
                const url = previewAttachment.url
                const name = (previewAttachment.name || "").toLowerCase()

                const isImage = type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(name)
                const isVideo = type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(name)
                const isAudio = type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac)$/i.test(name)
                const isPdf = type.includes("pdf") || /\.pdf$/i.test(name)

                if (isImage) {
                  return (
                    <div className="relative max-h-[70vh] flex items-center justify-center">
                      <img 
                        src={url} 
                        alt={previewAttachment.name}
                        className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-md"
                      />
                    </div>
                  )
                }

                if (isVideo) {
                  return (
                    <video 
                      controls 
                      autoPlay={false}
                      src={url}
                      className="max-h-[70vh] max-w-full rounded-xl shadow-md bg-black"
                    >
                      Seu navegador não suporta reprodução deste vídeo.
                    </video>
                  )
                }

                if (isAudio) {
                  return (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md max-w-md w-full space-y-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                        <Volume2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{previewAttachment.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatFileSize(previewAttachment.size)}</p>
                      </div>
                      <audio controls src={url} className="w-full">
                        Seu navegador não suporta reprodução de áudio.
                      </audio>
                    </div>
                  )
                }

                if (isPdf) {
                  return (
                    <iframe 
                      src={url} 
                      title={previewAttachment.name}
                      className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white shadow-sm"
                    />
                  )
                }

                return (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md text-center max-w-md w-full space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto border border-slate-200">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{previewAttachment.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Este formato não possui pré-visualização direta integrada.
                      </p>
                    </div>
                    <a
                      href={url}
                      download={previewAttachment.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-[#00D492] hover:text-slate-950 text-white font-bold text-xs transition-all shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar Documento</span>
                    </a>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
