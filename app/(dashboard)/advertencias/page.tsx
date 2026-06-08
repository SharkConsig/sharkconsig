"use client"

import React, { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  Search, 
  AlertTriangle, 
  Trash2,
  Bookmark,
  ChevronDown,
  X,
  FileText,
  Check,
  Paperclip,
  Loader2
} from "lucide-react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface WarningRecord {
  id: string
  collaboratorName: string
  verbal: "Sim" | "Não" | ""
  verbalDate: string
  verbalQtd: string
  escrita: "Sim" | "Não" | "2º" | ""
  escritaDate: string
  escritaQtd: string
  quantidade: string
  suspensao: "Sim" | "Não" | ""
  pdfUrl?: string
}

const initialRecords: WarningRecord[] = [
  {
    id: "1",
    collaboratorName: "Felícia Moraes",
    verbal: "",
    verbalDate: "",
    verbalQtd: "",
    escrita: "",
    escritaDate: "",
    escritaQtd: "",
    quantidade: "",
    suspensao: ""
  },
  {
    id: "2",
    collaboratorName: "Valéria Sena do Nascimento",
    verbal: "Sim",
    verbalDate: "01/04/2026",
    verbalQtd: "1",
    escrita: "",
    escritaDate: "",
    escritaQtd: "",
    quantidade: "1",
    suspensao: ""
  },
  {
    id: "3",
    collaboratorName: "Letícia de Lourdes Araújo Pereira",
    verbal: "",
    verbalDate: "",
    verbalQtd: "",
    escrita: "",
    escritaDate: "",
    escritaQtd: "",
    quantidade: "",
    suspensao: ""
  },
  {
    id: "4",
    collaboratorName: "Matheus de Quadros Santos",
    verbal: "",
    verbalDate: "",
    verbalQtd: "",
    escrita: "",
    escritaDate: "",
    escritaQtd: "",
    quantidade: "",
    suspensao: ""
  },
  {
    id: "5",
    collaboratorName: "Jorge Fabrício Marques Siqueira",
    verbal: "Sim",
    verbalDate: "30/03/2026",
    verbalQtd: "1",
    escrita: "Sim",
    escritaDate: "27/05/2026",
    escritaQtd: "1",
    quantidade: "2",
    suspensao: ""
  }
]

const verbalOptions = [
  { value: "", label: "Vazio", bg: "bg-slate-50 hover:bg-slate-100", text: "text-slate-400 font-bold", border: "border-slate-200/60" },
  { value: "Sim", label: "Sim", bg: "bg-[#ddf7e2] hover:bg-[#c9f2d1]", text: "text-[#1b7337] font-bold" },
  { value: "Não", label: "Não", bg: "bg-[#ffdcd7] hover:bg-[#fca59d]", text: "text-[#c53030] font-bold" }
]

const escritaOptions = [
  { value: "", label: "Vazio", bg: "bg-slate-50 hover:bg-slate-100", text: "text-slate-400 font-bold", border: "border-slate-200/60" },
  { value: "Sim", label: "Sim", bg: "bg-[#ddf7e2] hover:bg-[#c9f2d1]", text: "text-[#1b7337] font-bold" },
  { value: "Não", label: "Não", bg: "bg-[#ffdcd7] hover:bg-[#fca59d]", text: "text-[#c53030] font-bold" },
  { value: "2º", label: "2º", bg: "bg-[#9a0007] hover:bg-[#7e0004]", text: "text-white font-bold" }
]

const suspensaoOptions = [
  { value: "", label: "Vazio", bg: "bg-slate-50 hover:bg-slate-100", text: "text-slate-400 font-bold", border: "border-slate-200/60" },
  { value: "Sim", label: "Sim", bg: "bg-[#ddf7e2] hover:bg-[#c9f2d1]", text: "text-[#1b7337] font-bold" },
  { value: "Não", label: "Não", bg: "bg-[#ffdcd7] hover:bg-[#fca59d]", text: "text-[#c53030] font-bold" }
]

// Interactive Dropdown Component
function PillDropdown({ 
  value, 
  options, 
  onChange
}: { 
  value: string
  options: { value: string; label: string; bg: string; border?: string; text: string }[]
  onChange: (val: "Sim" | "Não" | "2º" | "") => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const currentOpt = options.find(o => o.value === value) || options[0]

  return (
    <div className={cn("relative inline-block text-left w-full max-w-full select-none", isOpen ? "z-30" : "z-10")}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full rounded-full px-3.5 py-1.5 h-[32px] text-xs font-black uppercase transition-all shadow-sm outline-none cursor-pointer",
          currentOpt.bg,
          currentOpt.text,
          currentOpt.border ? `border ${currentOpt.border}` : "border border-transparent"
        )}
      >
        <span className="truncate pr-1.5 text-left">{currentOpt.label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 opacity-80", currentOpt.text)} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-[140px] rounded-xl bg-white shadow-2xl border border-slate-200 focus:outline-none z-30 py-1.5 p-1 flex flex-col gap-1 max-h-[220px] overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value as "Sim" | "Não" | "2º" | "")
                  setIsOpen(false)
                }}
                className={cn(
                  "flex items-center justify-between w-full rounded-lg px-3 py-1.5 text-xs font-black uppercase transition-all text-left hover:brightness-95",
                  opt.bg,
                  opt.text,
                  opt.border ? `border ${opt.border}` : "border border-transparent"
                )}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0 animate-in zoom-in-50 duration-75 text-slate-800" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// PDF Attachment Trigger & Action Component
function PdfAttachmentButton({ 
  record, 
  onUpload, 
  isUploading 
}: { 
  record: WarningRecord
  onUpload: (file: File) => void
  isUploading: boolean
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleIconClick = () => {
    if (record.pdfUrl) {
      window.open(record.pdfUrl, "_blank")
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
    }
  }

  if (isUploading) {
    return (
      <div className="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg text-slate-500 animate-pulse inline-flex">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </div>
    )
  }

  if (record.pdfUrl) {
    return (
      <div className="flex items-center gap-1 shrink-0 inline-flex">
        <Button
          onClick={handleIconClick}
          variant="ghost"
          size="icon"
          title="Visualizar PDF Assinado"
          className="w-7 h-7 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg shrink-0 transition-all inline-flex items-center justify-center cursor-pointer border border-emerald-100/50"
        >
          <FileText className="w-3.5 h-3.5 text-rose-500 fill-rose-50" />
        </Button>
      </div>
    )
  }

  return (
    <div className="relative shrink-0 inline-flex">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf"
        className="hidden"
      />
      <Button
        onClick={handleIconClick}
        variant="ghost"
        size="icon"
        title="Anexar PDF Assinado"
        className="w-7 h-7 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg shrink-0 transition-colors inline-flex items-center justify-center cursor-pointer border border-slate-200/40"
      >
        <Paperclip className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

// Utility helpers to convert between DD/MM/YYYY database string format and YYYY-MM-DD input date format
const toYMD = (val: string) => {
  if (!val) return ""
  if (val.includes("-")) return val
  const parts = val.split("/")
  if (parts.length === 3) {
    const [d, m, y] = parts
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  return val
}

const toDMY = (val: string) => {
  if (!val) return ""
  if (val.includes("/")) return val
  const parts = val.split("-")
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${d}/${m}/${y}`
  }
  return val
}

const calculateTotal = (rec: WarningRecord) => {
  const v = parseInt(rec.verbalQtd || "0", 10) || 0
  const e = parseInt(rec.escritaQtd || "0", 10) || 0
  return (v + e).toString()
}

const sanitizeRecord = (item: unknown): WarningRecord => {
  const typedItem = item as Record<string, unknown>
  const verbal = (typedItem.verbal || "") as "Sim" | "Não" | ""
  let verbalQtd = (typedItem.verbalQtd ?? typedItem.verbal_qtd ?? "") as string
  if (verbal === "Sim" && !verbalQtd) {
    verbalQtd = "1"
  }
  
  const escrita = (typedItem.escrita || "") as "Sim" | "Não" | "2º" | ""
  let escritaQtd = (typedItem.escritaQtd ?? typedItem.escrita_qtd ?? "") as string
  if ((escrita === "Sim" || escrita === "2º") && !escritaQtd) {
    escritaQtd = "1"
  }

  const rec: WarningRecord = {
    id: String(typedItem.id ?? ""),
    collaboratorName: (typedItem.collaboratorName ?? typedItem.collaborator_name ?? "") as string,
    verbal,
    verbalDate: (typedItem.verbalDate ?? typedItem.verbal_date ?? "") as string,
    verbalQtd,
    escrita,
    escritaDate: (typedItem.escritaDate ?? typedItem.escrita_date ?? "") as string,
    escritaQtd,
    quantidade: (typedItem.quantidade ?? "") as string,
    suspensao: (typedItem.suspensao || "") as "Sim" | "Não" | "",
    pdfUrl: (typedItem.pdfUrl ?? typedItem.pdf_url ?? "") as string
  }
  rec.quantidade = calculateTotal(rec)
  return rec
}

export default function AdvertenciasPage() {
  const [loadingTable, setLoadingTable] = useState(false)
  const [records, setRecords] = useState<WarningRecord[]>([])

  const [searchQuery, setSearchQuery] = useState("")
  const [newColabName, setNewColabName] = useState("")
  const [newVerbal, setNewVerbal] = useState(false)
  const [newEscrita, setNewEscrita] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  // Load and hydrate database
  useEffect(() => {
    async function loadData() {
      setLoadingTable(true)
      
      const saved = localStorage.getItem("hr_warning_records_v2")
      let initialData: WarningRecord[] = []
      
      if (saved) {
        try {
          initialData = JSON.parse(saved).map(sanitizeRecord)
        } catch {
          initialData = initialRecords.map(sanitizeRecord)
        }
      } else {
        initialData = initialRecords.map(sanitizeRecord)
      }

      if (!isSupabaseConfigured) {
        setRecords(initialData)
        localStorage.setItem("hr_warning_records_v2", JSON.stringify(initialData))
        setLoadingTable(false)
        return
      }

      let supaData: Record<string, unknown>[] | null = null
      let supaError: { message: string } | null = null

      try {
        const { data, error } = await supabase
          .from('hr_advertencias')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) {
          supaError = error
        } else {
          supaData = data
        }
      } catch (err) {
        const errorObject = err as Error
        supaError = { message: errorObject?.message || "Unknown error on schema" }
      }

      try {
        if (supaError) {
          console.warn("Supabase database query failed on schema:", supaError.message)
          setRecords(initialData)
        } else if (supaData) {
          console.log("Connected successfully to public.hr_advertencias")
          if (supaData.length > 0) {
            const mappedData: WarningRecord[] = supaData.map(sanitizeRecord)
            setRecords(mappedData)
            localStorage.setItem("hr_warning_records_v2", JSON.stringify(mappedData))
            localStorage.setItem("shark_hr_advertencias_database_seeded_v1", "true")
          } else {
            const wasSeeded = localStorage.getItem("shark_hr_advertencias_database_seeded_v1")
            if (wasSeeded) {
              setRecords([])
              localStorage.setItem("hr_warning_records_v2", JSON.stringify([]))
            } else {
              // Seed Supabase with defaults
              const seedToSupa = initialData.map(item => ({
                id: item.id,
                collaboratorName: item.collaboratorName,
                verbal: item.verbal,
                verbalDate: item.verbalDate,
                verbalQtd: item.verbalQtd,
                escrita: item.escrita,
                escritaDate: item.escritaDate,
                escritaQtd: item.escritaQtd,
                quantidade: item.quantidade,
                suspensao: item.suspensao
              }))
              
              const { error: insertErr } = await supabase.from('hr_advertencias').upsert(seedToSupa)
              if (insertErr && insertErr.code !== '23505') {
                console.error("Failed to seed initial warnings to Supabase:", insertErr.message)
              }
              setRecords(initialData)
              localStorage.setItem("hr_warning_records_v2", JSON.stringify(initialData))
              localStorage.setItem("shark_hr_advertencias_database_seeded_v1", "true")
            }
          }
        }
      } catch (err) {
        console.warn("Error processing loaded Supabase warning data, offline fallback active:", err)
        setRecords(initialData)
      } finally {
        setLoadingTable(false)
      }
    }
    
    loadData()
  }, [])

  const handleAddCollaboratorRow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColabName.trim()) {
      console.warn("Nome do colaborador em branco.")
      return
    }

    const todayStr = new Date().toLocaleDateString('pt-BR')

    const newRecord: WarningRecord = {
      id: Date.now().toString(),
      collaboratorName: newColabName.trim(),
      verbal: newVerbal ? "Sim" : "",
      verbalDate: newVerbal ? todayStr : "",
      verbalQtd: newVerbal ? "1" : "",
      escrita: newEscrita ? "Sim" : "",
      escritaDate: newEscrita ? todayStr : "",
      escritaQtd: newEscrita ? "1" : "",
      quantidade: "",
      suspensao: "",
      pdfUrl: ""
    }
    newRecord.quantidade = calculateTotal(newRecord)

    // 1. Instant local update
    const updated = [newRecord, ...records]
    setRecords(updated)
    localStorage.setItem("hr_warning_records_v2", JSON.stringify(updated))
    setNewColabName("")
    setNewVerbal(false)
    setNewEscrita(false)

    // 2. Sync online
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('hr_advertencias')
          .insert([newRecord])
        if (error) {
          console.error("Failed to insert row on Supabase:", error.message)
        } else {
          console.log("Advertência criada e sincronizada com o banco com sucesso.")
        }
      } catch (err) {
        console.error("Error inserting record on Supabase:", err)
      }
    } else {
      console.log("Colaborador inserido com sucesso (Modo Offline).")
    }
  }

  const handleDeleteRecord = async (id: string) => {
    const recordToDelete = records.find(r => r.id === id)
    const name = recordToDelete?.collaboratorName || ""

    // 1. Instant local update
    const updated = records.filter(r => r.id !== id)
    setRecords(updated)
    localStorage.setItem("hr_warning_records_v2", JSON.stringify(updated))

    // 2. Sync online
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('hr_advertencias')
          .delete()
          .eq('id', id)
        if (error) {
          console.error("Failed to delete row on Supabase:", error.message)
        } else {
          console.log(`Advertência de ${name || "Colaborador"} removida com sucesso.`)
        }
      } catch (err) {
        console.error("Error deleting from Supabase:", err)
      }
    } else {
      console.log(`Registro de ${name || "Colaborador"} removido com sucesso (Offline).`)
    }
  }

  const handleUpdateField = async (id: string, field: keyof WarningRecord, value: string) => {
    // 1. Instant local ui update
    const updated = records.map(r => {
      if (r.id === id) {
        const nr = { ...r, [field]: value }
        // Automatically compute total quantity (quantidade)
        nr.quantidade = calculateTotal(nr)
        return nr
      }
      return r
    })
    setRecords(updated)
    localStorage.setItem("hr_warning_records_v2", JSON.stringify(updated))

    // 2. Sync online
    if (isSupabaseConfigured) {
      try {
        const recordToSync = updated.find(r => r.id === id)
        if (recordToSync) {
          const { error } = await supabase
            .from('hr_advertencias')
            .update({ 
              [field]: value,
              quantidade: recordToSync.quantidade
            })
            .eq('id', id)
          if (error) {
            console.error("Failed to update field on Supabase:", error.message)
          }
        }
      } catch (err) {
        console.error("Offline or error updating field in Supabase:", err)
      }
    }
  }

  const handleSelectOption = async (id: string, col: "verbal" | "escrita" | "suspensao", val: "Sim" | "Não" | "2º" | "") => {
    // 1. Instant local ui update
    const updated = records.map(r => {
      if (r.id === id) {
        const nr = { ...r, [col]: val }
        if (col === "verbal") {
          if (val === "Sim" && !nr.verbalQtd) {
            nr.verbalQtd = "1"
          } else if (val !== "Sim") {
            nr.verbalQtd = ""
          }
        } else if (col === "escrita") {
          if ((val === "Sim" || val === "2º") && !nr.escritaQtd) {
            nr.escritaQtd = "1"
          } else if (val !== "Sim" && val !== "2º") {
            nr.escritaQtd = ""
          }
        }
        nr.quantidade = calculateTotal(nr)
        return nr
      }
      return r
    })
    setRecords(updated)
    localStorage.setItem("hr_warning_records_v2", JSON.stringify(updated))

    // 2. Sync online
    if (isSupabaseConfigured) {
      try {
        const recordToSync = updated.find(r => r.id === id)
        if (recordToSync) {
          const { error } = await supabase
            .from('hr_advertencias')
            .update({ 
              [col]: val,
              verbalQtd: recordToSync.verbalQtd,
              escritaQtd: recordToSync.escritaQtd,
              quantidade: recordToSync.quantidade
            })
            .eq('id', id)
          if (error) {
            console.error("Failed to update option on Supabase:", error.message)
          }
        }
      } catch (err) {
        console.error("Offline or error updating option in Supabase:", err)
      }
    }
  }

  const handleUpdatePdfUrl = async (id: string, url: string) => {
    // 1. Instant local ui update
    const updated = records.map(r => r.id === id ? { ...r, pdfUrl: url } : r)
    setRecords(updated)
    localStorage.setItem("hr_warning_records_v2", JSON.stringify(updated))

    // 2. Sync online
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('hr_advertencias')
          .update({ pdfUrl: url })
          .eq('id', id)
        if (error) {
          console.error("Failed to update pdfUrl on Supabase:", error.message)
        }
      } catch (err) {
        console.error("Offline or error updating pdfUrl in Supabase:", err)
      }
    }
  }

  const handleUploadPdf = async (id: string, file: File) => {
    if (!file) return
    if (file.type !== "application/pdf") {
      alert("Por favor, selecione apenas arquivos PDF.")
      return
    }

    setUploadingId(id)

    try {
      if (!isSupabaseConfigured) {
        // Fallback offline: generate object URL and save/mock
        const localUrl = URL.createObjectURL(file)
        await handleUpdatePdfUrl(id, localUrl)
        setUploadingId(null)
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${id}-${Date.now()}.${fileExt}`
      const fullPath = `advertencias/${fileName}`

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('hr-advertencias-attachments')
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage
        .from('hr-advertencias-attachments')
        .getPublicUrl(fullPath)

      const publicUrl = data.publicUrl
      await handleUpdatePdfUrl(id, publicUrl)
    } catch (err) {
      console.error("Erro no upload de PDF para Supabase:", err)
      alert("Houve um erro ao enviar o arquivo PDF.")
    } finally {
      setUploadingId(null)
    }
  }

  const filteredRecords = records.filter(r => 
    r.collaboratorName && r.collaboratorName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Statistical calculations for cards
  const verbalCount = records.filter(r => r.verbal === "Sim").length
  const escritaCount = records.filter(r => r.escrita === "Sim" || r.escrita === "2º").length
  const suspensaoCount = records.filter(r => r.suspensao === "Sim").length

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen relative">
      <Header title="ADVERTÊNCIAS" />

      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">
        
        {/* Metric cards adapted to the warning table data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Advertências Verbais</p>
                <p className="text-3xl font-black text-[#1b7337] mt-1">{verbalCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-[#1b7337] shrink-0 border border-emerald-100">
                <Bookmark className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Advertências Escritas</p>
                <p className="text-3xl font-black text-amber-600 mt-1">{escritaCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
                <FileText className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suspensões Ativas</p>
                <p className="text-3xl font-black text-[#9a0007] mt-1">{suspensaoCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-[#9a0007] shrink-0 border border-red-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Panel */}
        <Card className="border border-slate-200 overflow-visible bg-white rounded-2xl shadow-sm">
          <CardContent className="p-0 overflow-visible">
            
            {/* Form Cadastro (Sempre Visível / Expandido) */}
            <div className="bg-slate-50/50 p-6 border-b border-slate-100" id="quick-add-colab-form">
              <form onSubmit={handleAddCollaboratorRow} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="space-y-1.5 col-span-1 md:col-span-3">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nome Completo do Colaborador *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Ana Clara Silva" 
                    value={newColabName} 
                    onChange={(e) => setNewColabName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none focus:border-slate-350 text-slate-800"
                  />
                  <div className="flex items-center gap-6 mt-3 ml-1 select-none">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={newVerbal} 
                        onChange={(e) => setNewVerbal(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#171717] focus:ring-[#171717]/30 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider group-hover:text-slate-700 transition-colors">VERBAL</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={newEscrita} 
                        onChange={(e) => setNewEscrita(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#171717] focus:ring-[#171717]/30 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider group-hover:text-slate-700 transition-colors">ESCRITA</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 w-full shrink-0">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setNewColabName("")
                      setNewVerbal(false)
                      setNewEscrita(false)
                    }}
                    className="text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-[10px] uppercase tracking-widest flex-1 h-[38px] transition-colors"
                  >
                    Limpar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-[#171717] hover:bg-[#171717]/90 text-white rounded-xl px-4 h-[38px] font-bold text-[10px] uppercase tracking-widest flex-1 shadow-sm transition-colors"
                  >
                    Confirmar
                  </Button>
                </div>
              </form>
            </div>

            {/* Search/Controls Header */}
            <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full md:max-w-md">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Pesquisar colaborador..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 w-full placeholder:text-slate-400 focus:ring-0"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Main Interactive Grid Table in Spreadsheet Style */}
            <div className="overflow-x-auto px-6 pb-6">
              <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                <thead>
                  <tr className="bg-[#171717] text-white">
                    <th className="w-[18%] px-5 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest rounded-l-xl">
                      Colaborador
                    </th>
                    <th className="w-[9%] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center">
                      Verbal
                    </th>
                    <th className="w-[10%] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center">
                      Data Verbal
                    </th>
                    <th className="w-[8%] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center">
                      Quantidade
                    </th>
                    <th className="w-[9%] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center">
                      Escrita
                    </th>
                    <th className="w-[10%] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center">
                      Data Escrita
                    </th>
                    <th className="w-[8%] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center">
                      Quantidade
                    </th>
                    <th className="w-[8%] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center">
                      Total
                    </th>
                    <th className="w-[10%] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center">
                      Suspensão
                    </th>
                    <th className="w-[10%] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center rounded-r-xl">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingTable ? (
                    <tr>
                      <td colSpan={10} className="text-center py-20 bg-slate-50/10 border-none">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="w-8 h-8 border-4 border-[#171717] border-t-transparent rounded-full animate-spin" />
                          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Carregando dados das advertências...</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => {
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/20 transition-all font-semibold align-middle whitespace-nowrap">
                          {/* Colaborador Column */}
                          <td className="px-4 py-3.5">
                            <input 
                              type="text" 
                              value={rec.collaboratorName || ""} 
                              onChange={(e) => handleUpdateField(rec.id, "collaboratorName", e.target.value)}
                              placeholder="Sem nome"
                              className="w-full bg-transparent border-none hover:bg-slate-100/60 focus:bg-white focus:ring-1 focus:ring-slate-200 rounded-lg px-2 py-1.5 text-xs font-black text-slate-700 uppercase outline-none transition-all"
                            />
                          </td>

                          {/* Verbal Warning Selection Cell */}
                          <td className="px-4 py-3.5 text-center">
                            <PillDropdown 
                              value={rec.verbal} 
                              onChange={(val) => handleSelectOption(rec.id, "verbal", val)} 
                              options={verbalOptions} 
                            />
                          </td>

                          {/* Verbal Date Cell */}
                          <td className="px-4 py-3.5 text-center">
                            <input
                              type="date"
                              value={toYMD(rec.verbalDate)}
                              onChange={(e) => handleUpdateField(rec.id, "verbalDate", toDMY(e.target.value))}
                              className="w-full bg-transparent border-none hover:bg-slate-100/60 focus:bg-white focus:ring-1 focus:ring-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none transition-all text-center"
                            />
                          </td>

                          {/* Verbal Quantity (Quantidade) Cell */}
                          <td className="px-4 py-3.5 text-center">
                            <input
                              type="text"
                              placeholder="0"
                              value={rec.verbalQtd || ""}
                              onChange={(e) => handleUpdateField(rec.id, "verbalQtd", e.target.value)}
                              className="w-full bg-transparent border-none hover:bg-slate-100/60 focus:bg-white focus:ring-1 focus:ring-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none transition-all text-center font-mono"
                            />
                          </td>

                          {/* Escrita Warning Selection Cell */}
                          <td className="px-4 py-3.5 text-center">
                            <PillDropdown 
                              value={rec.escrita} 
                              onChange={(val) => handleSelectOption(rec.id, "escrita", val)} 
                              options={escritaOptions} 
                            />
                          </td>

                          {/* Escrita Date Cell */}
                          <td className="px-4 py-3.5 text-center">
                            <input
                              type="date"
                              value={toYMD(rec.escritaDate)}
                              onChange={(e) => handleUpdateField(rec.id, "escritaDate", toDMY(e.target.value))}
                              className="w-full bg-transparent border-none hover:bg-slate-100/60 focus:bg-white focus:ring-1 focus:ring-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none transition-all text-center"
                            />
                          </td>

                          {/* Escrita Quantity (Quantidade) Cell */}
                          <td className="px-4 py-3.5 text-center">
                            <input
                              type="text"
                              placeholder="0"
                              value={rec.escritaQtd || ""}
                              onChange={(e) => handleUpdateField(rec.id, "escritaQtd", e.target.value)}
                              className="w-full bg-transparent border-none hover:bg-slate-100/60 focus:bg-white focus:ring-1 focus:ring-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none transition-all text-center font-mono"
                            />
                          </td>

                          {/* Total Warning Cell (Dynamically Calculated) */}
                          <td className="px-4 py-3.5 text-center font-bold text-xs text-slate-700 font-mono">
                            {calculateTotal(rec)}
                          </td>

                          {/* Suspensão Selection Cell */}
                          <td className="px-4 py-3.5 text-center">
                            <PillDropdown 
                              value={rec.suspensao} 
                              onChange={(val) => handleSelectOption(rec.id, "suspensao", val)} 
                              options={suspensaoOptions} 
                            />
                          </td>

                          {/* Ações Column with micro-confirm delete inside table */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              {deletingId === rec.id ? (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    onClick={() => {
                                      handleDeleteRecord(rec.id)
                                      setDeletingId(null)
                                    }}
                                    size="sm"
                                    className="h-6 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm cursor-pointer inline-flex items-center gap-0.5 transition-colors"
                                    title="Confirmar Exclusão"
                                  >
                                    <Check className="w-3 h-3" /> Excluir
                                  </Button>
                                  <Button
                                    onClick={() => setDeletingId(null)}
                                    size="sm"
                                    className="h-6 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[9px] font-bold uppercase tracking-wider cursor-pointer inline-flex items-center transition-colors"
                                    title="Cancelar"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <PdfAttachmentButton 
                                    record={rec}
                                    onUpload={(file) => handleUploadPdf(rec.id, file)}
                                    isUploading={uploadingId === rec.id}
                                  />

                                  <Button 
                                    onClick={() => setDeletingId(rec.id)}
                                    variant="ghost" 
                                    size="icon" 
                                    title="Remover Registro"
                                    className="w-7 h-7 bg-amber-50 hover:bg-rose-100 text-amber-600 hover:text-red-600 rounded-lg shrink-0 transition-colors inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                  {!loadingTable && filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-20 bg-slate-50/10 border-none">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FileText className="w-10 h-10 text-slate-350 animate-bounce" />
                          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Lista de advertências vazia ou sem resultados</p>
                          <p className="text-[11px] text-slate-400">Insira um colaborador acima para registrar uma nova advertência.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* SPREADSHEET FOOTER */}
            <div className="bg-transparent text-slate-400 px-8 py-4 text-[10px] font-bold uppercase tracking-wider flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 select-none">
              <div>
                <span>Exibindo <strong>{filteredRecords.length}</strong> de <strong>{records.length}</strong> registros cadastrados</span>
              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  )
}
