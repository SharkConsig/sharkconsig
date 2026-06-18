"use client"

import React, { useState, useEffect } from "react"
import { toast } from "sonner"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Search, 
  Clock, 
  Trash2,
  Download,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  Check,
  X
} from "lucide-react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

// Our main spreadsheet interview record interface
interface Interview {
  id: string
  name: string
  phone: string
  date: string
  time: string
  fase: string
  plataforma: string
  area: string
  notes: string
  tipo?: string
}

// Preloaded dataset starting empty to receive real new registrations
const DEFAULT_CANDIDATES: Interview[] = []

export default function EntrevistasPage() {
  const router = useRouter()
  const { isRecursosHumanos, isAdmin, isDeveloper, isLoading: authLoading } = useAuth()
  
  // Guard clause to protect route
  useEffect(() => {
    if (!authLoading && !isRecursosHumanos && !isAdmin && !isDeveloper) {
      router.replace("/")
    }
  }, [authLoading, isRecursosHumanos, isAdmin, isDeveloper, router])

  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"ENTREVISTAS" | "LIGAÇÕES">("ENTREVISTAS")
  const [hasTipoColumn, setHasTipoColumn] = useState(true)
  const [faseFilter, setFaseFilter] = useState("Todas")
  const [plataformaFilter, setPlataformaFilter] = useState("Todas")
  const [areaFilter, setAreaFilter] = useState("Todas")
  const [dateFilter, setDateFilter] = useState("")
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loadingTable, setLoadingTable] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Quick Add Form States
  const [quickName, setQuickName] = useState("")
  const [quickPhone, setQuickPhone] = useState("")
  const [quickDate, setQuickDate] = useState("")
  const [quickTime, setQuickTime] = useState("")
  const [quickFase, setQuickFase] = useState("")
  const [quickPlataforma, setQuickPlataforma] = useState("")
  const [quickArea, setQuickArea] = useState("")
  const [quickNotes, setQuickNotes] = useState("")

  // Load and hydrate database
  useEffect(() => {
    async function loadData() {
      setLoadingTable(true)
      
      const saved = localStorage.getItem("shark_hr_interviews_spreadsheet")
      let initialData: Interview[] = []
      
      if (saved) {
        try {
          initialData = (JSON.parse(saved) as Interview[]).map((item) => ({
            id: item.id,
            name: item.name || "Candidato",
            phone: item.phone || "",
            date: item.date || new Date().toISOString().split('T')[0],
            time: item.time || "14:00:00",
            fase: item.fase || "Agendada",
            plataforma: item.plataforma || "Indeed",
            area: item.area || "Comercial",
            notes: item.notes || "",
            tipo: item.tipo || "ENTREVISTAS"
          }))
        } catch {
          initialData = DEFAULT_CANDIDATES
        }
      } else {
        // Fallback/Legacy data merge
        const legacySaved = localStorage.getItem("shark_hr_interviews")
        if (legacySaved) {
          try {
            const parsedLegacy = JSON.parse(legacySaved) as { 
              id?: string; 
              name?: string; 
              phone?: string; 
              date?: string; 
              time?: string; 
              status?: string; 
              plataforma?: string; 
              role?: string; 
              notes?: string;
            }[]
            // Map to spreadsheet candidate model
            const migrated: Interview[] = parsedLegacy.map((item, index: number) => ({
              id: item.id || `mig-${index}`,
              name: item.name || "Candidato",
              phone: item.phone || "",
              date: item.date || new Date().toISOString().split('T')[0],
              time: item.time ? (item.time.length === 5 ? `${item.time}:00` : item.time) : "14:00:00",
              fase: item.status === "Aprovada" ? "Aprovado" : item.status === "Reprovada" ? "Reprovado" : item.status || "Agendada",
              plataforma: item.plataforma || "Instagram",
              area: item.role === "Estágio" || item.role === "Estagio" ? "Estágio" : "Comercial",
              notes: item.notes || "",
              tipo: "ENTREVISTAS"
            }))
            initialData = migrated
          } catch {
            initialData = DEFAULT_CANDIDATES
          }
        } else {
          initialData = DEFAULT_CANDIDATES
        }
      }

      // Automatically purge any mock candidates so the list is clean
      const mockNames = ["Jenifer", "João Lucas", "Gabryella", "Airton", "Julia", "Marina", "Maria Eduarda", "Flavia", "Amine", "Laura", "Vitória", "Poliana", "Helena", "Andriw", "Jainara"]
      initialData = initialData.filter(item => {
        const isMockId = /^int-([1-9]|1[0-5])$/.test(item.id)
        const isMockName = mockNames.includes(item.name)
        return !isMockId && !isMockName
      })

      if (!isSupabaseConfigured) {
        setInterviews(initialData)
        localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(initialData))
        setLoadingTable(false)
        return
      }

      let supaData: Record<string, unknown>[] | null = null
      let supaError: { message: string } | null = null

      try {
        const { data, error } = await supabase
          .from('hr_interviews')
          .select('*')
          .order('date', { ascending: false })
        
        if (error) {
          supaError = error
        } else {
          supaData = data as Record<string, unknown>[]
        }
      } catch (err) {
        const errorObject = err as Error
        supaError = { message: errorObject?.message || "Unknown error on public schema" }
      }

      try {
        if (supaError) {
          console.warn("Supabase database query failed on public schema:", supaError.message)
          setInterviews(initialData)
        } else if (supaData) {
          console.log("Connected successfully to database on public.hr_interviews")
          
          // Dynamically query if the column 'tipo' exists using a targeted select
          const { error: checkError } = await supabase
            .from('hr_interviews')
            .select('tipo')
            .limit(1)
          
          const columnExists = !checkError || (checkError.code !== '42703' && !checkError.message?.toLowerCase().includes('column "tipo"'))
          setHasTipoColumn(columnExists)
          
          if (supaData.length > 0) {
            const mappedData: Interview[] = (supaData as unknown as Interview[]).map((item) => ({
              id: item.id,
              name: item.name,
              phone: item.phone || "",
              date: item.date,
              time: item.time,
              fase: item.fase,
              plataforma: item.plataforma,
              area: item.area,
              notes: item.notes || "",
              tipo: item.tipo || "ENTREVISTAS"
            })).filter(item => {
              const isMockId = /^int-([1-9]|1[0-5])$/.test(item.id)
              const isMockName = mockNames.includes(item.name)
              return !isMockId && !isMockName
            })
            setInterviews(mappedData)
            localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(mappedData))
            localStorage.setItem("shark_hr_interviews_database_seeded_v1", "true")
          } else {
            const wasSeeded = localStorage.getItem("shark_hr_interviews_database_seeded_v1")
            if (wasSeeded) {
              setInterviews([])
              localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify([]))
            } else {
              // Seed Supabase with defaults in chosen schema
              const seedToSupa = initialData.map(item => {
                const row: Record<string, unknown> = {
                  id: item.id,
                  name: item.name,
                  phone: item.phone || "",
                  date: item.date,
                  time: item.time,
                  fase: item.fase,
                  plataforma: item.plataforma,
                  area: item.area,
                  notes: item.notes || ""
                }
                if (columnExists) {
                  row.tipo = item.tipo || "ENTREVISTAS"
                }
                return row
              })
              
              const { error: insertErr } = await supabase.from('hr_interviews').upsert(seedToSupa)
              if (insertErr && insertErr.code !== '23505') {
                console.error("Failed to seed initial candidates to Supabase under public schema:", insertErr.message)
              }
              setInterviews(initialData)
              localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(initialData))
              localStorage.setItem("shark_hr_interviews_database_seeded_v1", "true")
            }
          }
        }
      } catch (err) {
        console.warn("Error processing loaded Supabase data, offline fallback active:", err)
        setInterviews(initialData)
      } finally {
        setLoadingTable(false)
      }
    }
    
    loadData()
  }, [])

  // Update a single cell directly in our state (Spreadsheet behavior!) & Sync
  const updateCell = async (id: string, field: keyof Interview, value: string) => {
    let overrideTipo: string | undefined = undefined
    if (field === "fase" && value === "Entrevista") {
      const candidate = interviews.find(item => item.id === id)
      if (candidate && candidate.tipo === "LIGAÇÕES") {
        toast.success(`Candidato ${candidate.name} agora foi migrado definitivamente para a aba ENTREVISTAS!`)
        overrideTipo = "ENTREVISTAS"
      }
    }

    // 1. Instant local ui update
    const updated = interviews.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        if (overrideTipo) {
          updatedItem.tipo = overrideTipo
        }
        return updatedItem
      }
      return item
    })
    setInterviews(updated)
    localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(updated))

    // 2. Sync online
    if (isSupabaseConfigured) {
      if (field === 'tipo' && !hasTipoColumn) {
        return; // Skip syncing tipo if the DB doesn't support it yet
      }
      try {
        let valueForDb = value
        if (field === 'time' && typeof value === 'string' && value.length === 5) {
          valueForDb = `${value}:00`
        }
        
        const updatePayload: Record<string, string | null | undefined> = { [field]: valueForDb }
        if (overrideTipo && hasTipoColumn) {
          updatePayload.tipo = overrideTipo
        }

        const { error } = await supabase
          .from('hr_interviews')
          .update(updatePayload)
          .eq('id', id)
        if (error) {
          console.error("Failed to update field on Supabase:", error.message)
          if (error.message?.includes('column "tipo"') || error.message?.toLowerCase().includes('does not exist')) {
            setHasTipoColumn(false)
          }
        }
      } catch (err) {
        console.error("Network error on Supabase sync:", err)
      }
    }
  }

  // Insert a new pre-filled candidate from the Quick Add Form
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickName.trim()) {
      console.warn("Por favor, preencha o nome do candidato.")
      return
    }

    const newId = `int-${Date.now()}`
    
    // Format time to HH:MM:SS
    let formattedTime = quickTime
    if (formattedTime && formattedTime.length === 5) {
      formattedTime = `${formattedTime}:00`
    } else if (!formattedTime) {
      formattedTime = "14:00:00"
    }

    const newRow: Interview = {
      id: newId,
      name: quickName.trim(),
      phone: quickPhone.trim(),
      date: quickDate || new Date().toISOString().split('T')[0],
      time: formattedTime,
      fase: quickFase,
      plataforma: quickPlataforma,
      area: quickArea,
      notes: quickNotes.trim(),
      tipo: activeTab // Links candidate to the current tab (ENTREVISTAS or LIGAÇÕES)
    }

    // 1. Instant local state & cache update
    const updated = [newRow, ...interviews]
    setInterviews(updated)
    localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(updated))

    // 2. Sync with database
    if (isSupabaseConfigured) {
      try {
        const rowToSync = { ...newRow }
        if (!hasTipoColumn) {
          delete rowToSync.tipo
        }
        const { error } = await supabase
          .from('hr_interviews')
          .insert([rowToSync])
        if (error) {
          console.error("Failed to insert row on Supabase:", error.message)
          if (error.message?.includes('column "tipo"') || error.message?.toLowerCase().includes('does not exist')) {
            setHasTipoColumn(false)
            // Retry without 'tipo'
            const retryRow = { ...newRow }
            delete retryRow.tipo
            await supabase.from('hr_interviews').insert([retryRow])
          }
        } else {
          console.log("Candidato cadastrado e sincronizado com o banco com sucesso.")
        }
      } catch (err) {
        console.error("Network sync error:", err)
      }
    } else {
      console.log("Candidato inserido com sucesso (Modo Offline).")
    }

    // Reset simple values for bulk insertion comfort (keep date, time, and drops)
    setQuickName("")
    setQuickPhone("")
    setQuickNotes("")
  }

  // Delete an entire candidate row & Sync
  const handleDeleteRow = async (id: string, name: string) => {
    // 1. Instant local update
    const updated = interviews.filter(item => item.id !== id)
    setInterviews(updated)
    localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(updated))

    // 2. Sync online
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('hr_interviews')
          .delete()
          .eq('id', id)
        if (error) {
          console.error("Failed to delete row on Supabase:", error.message)
        } else {
          console.log(`Candidato(a) ${name || "Sem Nome"} removido(a) com sucesso.`)
          return
        }
      } catch (err) {
        console.error("Network error on Supabase sync:", err)
      }
    }
    console.log(`Candidato(a) ${name || "Sem Nome"} removido(a) com sucesso (Offline).`)
  }

  // Helper to get today's date string in local YYYY-MM-DD
  const getTodayDateStr = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isCandidateInTab = (item: Interview, tab: "ENTREVISTAS" | "LIGAÇÕES") => {
    const itemTipo = item.tipo || "ENTREVISTAS"
    if (tab === "ENTREVISTAS") {
      return itemTipo === "ENTREVISTAS" || item.fase === "Entrevista"
    }
    return itemTipo === "LIGAÇÕES" && item.fase !== "Entrevista"
  }

  const sortCandidates = (list: Interview[]) => {
    const today = getTodayDateStr()
    return [...list].sort((a, b) => {
      const dateA = a.date || ""
      const dateB = b.date || ""

      const hasDateA = !!dateA
      const hasDateB = !!dateB

      if (hasDateA && hasDateB) {
        const isPastA = dateA < today
        const isPastB = dateB < today

        if (isPastA !== isPastB) {
          return isPastA ? 1 : -1
        }

        if (dateA !== dateB) {
          if (isPastA) {
            // Mais recente do passado vem acima (decrescente para as datas passadas)
            return dateB.localeCompare(dateA)
          } else {
            // Mais proximo de hoje/futuras vem acima (crescente para datas hoje/futuras)
            return dateA.localeCompare(dateB)
          }
        }
      } else if (hasDateA !== hasDateB) {
        return hasDateA ? -1 : 1
      }

      const timeA = a.time || ""
      const timeB = b.time || ""
      return timeA.localeCompare(timeB)
    })
  }

  // Client side CSV download formatted specifically for Excel to open beautifully (UTF-8 BOM)
  const handleExportCSV = () => {
    const headers = ["Candidato", "Contato", "Data", "Horário", "Fase", "Plataforma", "Área", "Observações"]
    
    const visibleRows = sortCandidates(interviews.filter(item => isCandidateInTab(item, activeTab)))
    const rows = visibleRows.map(item => {
      const formattedDate = item.date ? item.date.split("-").reverse().join("/") : ""
      return [
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.phone.replace(/"/g, '""')}"`,
        `"${formattedDate}"`,
        `"${item.time}"`,
        `"${item.fase}"`,
        `"${item.plataforma}"`,
        `"${item.area}"`,
        `"${item.notes.replace(/"/g, '""')}"`
      ]
    })
    
    // Semicolon is widely default in Excel Brazilian locales
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `Recrutamento_RH_${activeTab}_Excel_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    console.log("Download de planilha excel iniciado de forma silenciosa.")
  }

  // Filter application
  const filteredInterviews = sortCandidates(
    interviews.filter(item => {
      const matchTab = isCandidateInTab(item, activeTab)

      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.phone.toLowerCase().includes(search.toLowerCase()) || 
                          item.notes.toLowerCase().includes(search.toLowerCase())
                          
      const matchFase = faseFilter === "Todas" || item.fase === faseFilter
      const matchPlataforma = plataformaFilter === "Todas" || item.plataforma === plataformaFilter
      const matchArea = areaFilter === "Todas" || item.area === areaFilter
      const matchDate = !dateFilter || item.date === dateFilter
      
      return matchTab && matchSearch && matchFase && matchPlataforma && matchArea && matchDate
    })
  )

  // Calculations for quick metrics
  const tabInterviews = interviews.filter(i => isCandidateInTab(i, activeTab))
  const totalCandidatos = tabInterviews.length

  const todayDateStr = getTodayDateStr()
  const todayList = tabInterviews.filter(i => i.date === todayDateStr)
  const countToday = todayList.length

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen font-sans">
      <Header title="ENTREVISTAS" />

      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">
        
        {/* Statistics Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between h-full">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Triagens</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{totalCandidatos}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Layers className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm md:col-span-3">
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 h-full">
              <div className="flex items-center gap-4 shrink-0">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {activeTab === "ENTREVISTAS" ? "Entrevistas de Hoje" : "Ligações de Hoje"}
                  </p>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {countToday} {countToday === 1 ? "agendada" : "agendadas"}
                  </p>
                </div>
              </div>
              
              {/* Horários e Nomes de Hoje */}
              <div className="flex-1 min-w-0 md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 w-full">
                {(() => {
                  let cltCount = 0;
                  let estagioCount = 0;
                  let pjCount = 0;

                  todayList.forEach(i => {
                    const areaLower = (i.area || "").toLowerCase().trim();
                    if (areaLower === "estágio" || areaLower === "estagio") {
                      estagioCount++;
                    } else if (areaLower === "não estudas" || areaLower === "nao estudas" || areaLower === "pj") {
                      pjCount++;
                    } else if (areaLower === "comercial" || areaLower === "operacional" || areaLower === "não estudam" || areaLower === "nao estudam") {
                      cltCount++;
                    } else {
                      cltCount++;
                    }
                  });

                  return (
                    <div className="grid grid-cols-3 gap-3 md:gap-4 w-full">
                      {/* CLT block */}
                      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-2 md:p-3 flex flex-col items-center justify-center text-center shadow-sm hover:border-[#1C2643]/20 transition-all">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 mb-1 pointer-events-none">
                          CLT
                        </span>
                        <span className="text-xl md:text-2xl font-black text-[#1C2643] tracking-tighter">
                          {cltCount}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          {cltCount === 1 ? "vaga" : "vagas"}
                        </span>
                      </div>

                      {/* ESTÁGIO block */}
                      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-2 md:p-3 flex flex-col items-center justify-center text-center shadow-sm hover:border-[#1C2643]/20 transition-all">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 mb-1 pointer-events-none">
                          ESTÁGIO
                        </span>
                        <span className="text-xl md:text-2xl font-black text-[#1C2643] tracking-tighter">
                          {estagioCount}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          {estagioCount === 1 ? "vaga" : "vagas"}
                        </span>
                      </div>

                      {/* PJ block */}
                      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-2 md:p-3 flex flex-col items-center justify-center text-center shadow-sm hover:border-[#1C2643]/20 transition-all">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 mb-1 pointer-events-none">
                          PJ
                        </span>
                        <span className="text-xl md:text-2xl font-black text-[#1C2643] tracking-tighter">
                          {pjCount}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          {pjCount === 1 ? "vaga" : "vagas"}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs style navigation identical to colaboradores page */}
        <div className="flex flex-wrap gap-1 px-4 sm:px-8 -mb-[1px]">
          <button
            type="button"
            onClick={() => setActiveTab("ENTREVISTAS")}
            className={cn(
              "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 cursor-pointer",
              activeTab === "ENTREVISTAS"
                ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black"
                : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            )}
            id="tab-entrevistas"
          >
            ENTREVISTAS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("LIGAÇÕES")}
            className={cn(
              "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 cursor-pointer",
              activeTab === "LIGAÇÕES"
                ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black"
                : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            )}
            id="tab-ligacoes"
          >
            LIGAÇÕES
          </button>
        </div>

        {/* Content Box */}
        <Card className="border border-slate-200 overflow-hidden bg-white rounded-2xl rounded-tl-none shadow-sm animate-in fade-in duration-300">
          <CardContent className="p-0">

            {/* Form Cadastro (Sempre Visível) */}
            <div className="bg-slate-50/50 p-6 border-b border-slate-155">
                <form onSubmit={handleQuickAdd} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nome Completo do Candidato *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="" 
                      value={quickName} 
                      onChange={(e) => setQuickName(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none focus:border-slate-350 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Telefone / Contato</label>
                    <input 
                      type="text" 
                      placeholder="" 
                      value={quickPhone} 
                      onChange={(e) => setQuickPhone(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none focus:border-slate-350 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Data da Entrevista</label>
                    <input 
                      type="date" 
                      value={quickDate} 
                      onChange={(e) => setQuickDate(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none focus:border-slate-350 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Horário</label>
                    <input 
                      type="time" 
                      value={quickTime} 
                      onChange={(e) => setQuickTime(e.target.value)}
                      className="bg-white border border-slate-205 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none focus:border-slate-350 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Fase Inicial</label>
                    <select 
                      value={quickFase}
                      onChange={(e) => setQuickFase(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none cursor-pointer focus:border-slate-350 text-slate-700"
                    >
                      <option value=""></option>
                      {faseOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Plataforma</label>
                    <select 
                      value={quickPlataforma}
                      onChange={(e) => setQuickPlataforma(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none cursor-pointer focus:border-slate-350 text-slate-700"
                    >
                      <option value=""></option>
                      {plataformaOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Área de Atuação</label>
                    <select 
                      value={quickArea}
                      onChange={(e) => setQuickArea(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none cursor-pointer focus:border-slate-350 text-slate-700"
                    >
                      <option value=""></option>
                      {areaOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 col-span-1 md:col-span-4">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Observações Iniciais</label>
                    <input 
                      type="text" 
                      placeholder="" 
                      value={quickNotes} 
                      onChange={(e) => setQuickNotes(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none focus:border-slate-350 text-slate-800"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-4 flex justify-end gap-3 pt-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => {
                        setQuickName("")
                        setQuickPhone("")
                        setQuickNotes("")
                      }}
                      className="text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-[10px] uppercase tracking-widest"
                    >
                      Limpar Formulario
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-[#171717] hover:bg-[#171717]/90 text-white rounded-xl px-6 h-[38px] font-bold text-[10px] uppercase tracking-widest"
                    >
                      Adicionar Candidato
                    </Button>
                  </div>
                </form>
              </div>

            {/* Filtros e Pesquisa */}
            <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full md:max-w-md">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Pesquisar registros de entrevista..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Filtro por Data */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 relative">
                  <input 
                    type="date" 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 cursor-pointer w-[125px]"
                  />
                  {dateFilter && (
                    <button 
                      type="button"
                      onClick={() => setDateFilter("")}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer ml-1 select-none"
                      title="Limpar data"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select 
                    value={faseFilter}
                    onChange={(e) => setFaseFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="Todas">Fase: Todas</option>
                    <option value="Em processo de contratação">Em processo de contratação</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Reprovado">Reprovado</option>
                    <option value="Stand-by">Stand-by</option>
                    <option value="Entrevista">Entrevista</option>
                    <option value="Não compareceu">Não compareceu</option>
                    <option value="Não atendeu">Não atendeu</option>
                    <option value="Desistiu">Desistiu</option>
                    <option value="Rep. formulário">Rep. formulário</option>
                    <option value="Outra oportunidade">Outra oportunidade</option>
                    <option value="Não veio para o teste">Não veio para o teste</option>
                    <option value="Remarcar">Remarcar</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <select 
                    value={plataformaFilter}
                    onChange={(e) => setPlataformaFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="Todas">Plataforma: Todos</option>
                    <option value="Indeed">Indeed</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Escola">Escola</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <select 
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="Todas">Área: Todas</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Operacional">Operacional</option>
                    <option value="Estágio">Estágio</option>
                    <option value="Não estudam">Não estudam</option>
                    <option value="PJ">PJ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto min-h-[460px] px-6">
              <table className="w-full text-left border-collapse table-fixed min-w-[1450px]">
                <thead>
                  <tr className="bg-[#171717] text-white">
                    <th className="w-[180px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest rounded-l-xl">Candidato</th>
                    <th className="w-[140px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Contato</th>
                    <th className="w-[130px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Data</th>
                    <th className="w-[110px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Horário</th>
                    <th className="w-[170px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center">Fase</th>
                    <th className="w-[170px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center">Plataforma</th>
                    <th className="w-[170px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center">Área</th>
                    <th className="w-[280px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">Observações</th>
                    <th className="w-[100px] px-4 pr-6 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center rounded-r-xl">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingTable ? (
                    <tr>
                      <td colSpan={9} className="text-center py-20 bg-slate-50/10">
                        <div className="flex flex-col items-center justify-center space-y-3 animate-pulse">
                          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" strokeWidth={3} />
                          <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-none">Sincronizando com Banco de Dados em tempo real...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredInterviews.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-20 bg-slate-50/10 border-none">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FileSpreadsheet className="w-10 h-10 text-slate-350 animate-bounce" />
                          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Planilha vazia ou filtros sem correspondência</p>
                          <p className="text-[11px] text-slate-400">Clique em &quot;Adicionar Candidato&quot; para registrar novos candidatos.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInterviews.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/20 transition-all font-semibold align-middle whitespace-nowrap">
                        {/* CANDIDATO CELL */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <input 
                              type="text" 
                              value={item.name} 
                              onChange={(e) => updateCell(item.id, "name", e.target.value)}
                              placeholder="Sem nome"
                              className="w-full bg-transparent border-none hover:bg-slate-100/60 focus:bg-white focus:ring-1 focus:ring-slate-200 rounded-lg px-2 py-1.5 text-xs font-black text-slate-705 uppercase outline-none transition-all"
                            />
                          </div>
                        </td>

                        {/* CONTATO CELL */}
                        <td className="px-4 py-3.5">
                          <input 
                            type="text" 
                            value={item.phone} 
                            onChange={(e) => updateCell(item.id, "phone", e.target.value)}
                            placeholder="Inserir fone"
                            className="w-full bg-transparent border-none hover:bg-slate-100/60 focus:bg-white focus:ring-1 focus:ring-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 outline-none transition-all"
                          />
                        </td>

                        {/* DATA CELL */}
                        <td className="px-4 py-3.5">
                          <DateCell 
                            value={item.date} 
                            onChange={(val) => updateCell(item.id, "date", val)} 
                          />
                        </td>

                        {/* HORÁRIO CELL */}
                        <td className="px-4 py-3.5">
                          <TimeCell 
                            value={item.time} 
                            onChange={(val) => updateCell(item.id, "time", val)} 
                          />
                        </td>

                        {/* FASE PILL DROPDOWN */}
                        <td className="px-4 py-3.5 text-center">
                          <PillDropdown 
                            value={item.fase} 
                            onChange={(val) => updateCell(item.id, "fase", val)} 
                            options={faseOptions} 
                          />
                        </td>

                        {/* PLATAFORMA PILL DROPDOWN */}
                        <td className="px-4 py-3.5 text-center">
                          <PillDropdown 
                            value={item.plataforma} 
                            onChange={(val) => updateCell(item.id, "plataforma", val)} 
                            options={plataformaOptions} 
                          />
                        </td>

                        {/* ÁREA PILL DROPDOWN */}
                        <td className="px-4 py-3.5 text-center">
                          <PillDropdown 
                            value={item.area} 
                            onChange={(val) => updateCell(item.id, "area", val)} 
                            options={areaOptions} 
                          />
                        </td>

                        {/* OBSERVAÇÕES CELL */}
                        <td className="px-4 py-3.5">
                          <NotesCell 
                            value={item.notes} 
                            onChange={(val) => updateCell(item.id, "notes", val)} 
                          />
                        </td>

                        {/* EXCLUIR ROW BUTTON */}
                        <td className="px-2 py-3.5 text-center">
                          {deletingId === item.id ? (
                            <div className="flex items-center gap-1.5 justify-center">
                              <Button
                                onClick={() => {
                                  handleDeleteRow(item.id, item.name)
                                  setDeletingId(null)
                                }}
                                size="sm"
                                className="h-6 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm cursor-pointer inline-flex items-center gap-1"
                                title="Confirmar Exclusão"
                              >
                                <Check className="w-3 h-3" /> Excluir
                              </Button>
                              <Button
                                onClick={() => setDeletingId(null)}
                                size="sm"
                                className="h-6 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[9px] font-bold uppercase tracking-wider cursor-pointer inline-flex items-center"
                                title="Cancelar"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              onClick={() => setDeletingId(item.id)}
                              variant="ghost" 
                              size="icon" 
                              title="Remover Candidato"
                              className="w-7 h-7 bg-amber-50 hover:bg-rose-100 text-amber-600 hover:text-red-600 rounded-lg shrink-0 transition-colors inline-flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* SPREADSHEET FOOTER */}
            <div className="bg-transparent text-slate-400 px-8 py-4 text-[10px] font-bold uppercase tracking-wider flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 select-none">
              <div>
                <span>Exibindo <strong>{filteredInterviews.length}</strong> de <strong>{interviews.length}</strong> registros cadastrados</span>
              </div>
              <Button 
                onClick={handleExportCSV}
                className="bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl h-[38px] px-4 text-[10px] font-black uppercase tracking-widest gap-2 border border-slate-200 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Exportar CSV</span>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

// ---------------------------------------------------------
// COMPACT CUSTOM COMPONENT CONTROLLERS FOR EXCEL SPREADSHEET
// ---------------------------------------------------------

// 1. DATE PICKER SPREADSHEET-STYLE INLINE CELL
function DateCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Insira Data"
    const parts = dateStr.split("-")
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  return (
    <div className="w-full flex items-center min-h-[30px] rounded cursor-text transition-all">
      {isEditing ? (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          autoFocus
          className="w-full bg-white border border-blue-500 rounded px-1.5 py-1 text-xs font-mono font-bold text-slate-800 outline-none shadow-sm"
        />
      ) : (
        <span 
          onClick={() => setIsEditing(true)} 
          className="text-xs font-mono font-bold text-slate-700 w-full hover:bg-slate-100 rounded px-2 py-1.5 block transition-colors"
        >
          {formatDate(value)}
        </span>
      )}
    </div>
  )
}

// 2. TIME CHOOSE SPREADSHEET-STYLE INLINE CELL
function TimeCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isEditing, setIsEditing] = useState(false)

  // Ensure format always has seconds if default matches screenshot HH:MM:SS
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "14:00:00"
    if (timeStr.split(":").length === 2) {
      return `${timeStr}:00`
    }
    return timeStr
  }

  return (
    <div className="w-full flex items-center min-h-[30px] rounded cursor-text transition-all">
      {isEditing ? (
        <input
          type="time"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          autoFocus
          className="w-full bg-white border border-blue-500 rounded px-1.5 py-1 text-xs font-mono font-bold text-slate-800 outline-none shadow-sm"
        />
      ) : (
        <span 
          onClick={() => setIsEditing(true)} 
          className="text-xs font-mono font-bold text-slate-700 w-full hover:bg-slate-100 rounded px-2 py-1.5 block transition-colors"
        >
          {formatTime(value)}
        </span>
      )}
    </div>
  )
}

// 3. EXPANDING TEXT/OBSERVATIONS INLINE SPREADSHEET CELL
function NotesCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="w-full min-h-[30px] rounded cursor-text transition-all flex items-center">
      {isEditing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          autoFocus
          rows={2}
          placeholder=""
          className="w-full bg-white border border-blue-500 rounded px-2 py-1.5 text-xs font-medium text-slate-700 outline-none shadow-md resize-y"
        />
      ) : (
        <span 
          onClick={() => setIsEditing(true)} 
          className={cn(
            "text-xs font-semibold block w-full rounded px-2.5 py-1.5 truncate max-w-full transition-colors min-h-[28px] border cursor-text",
            value 
              ? "bg-amber-50 hover:bg-amber-100/80 text-amber-800 border-amber-200/60" 
              : "bg-slate-50 hover:bg-slate-100 text-slate-400 border-slate-200/40 font-medium italic"
          )}
          title={value}
        >
          {value || ""}
        </span>
      )}
    </div>
  )
}

// 4. FLOATING POPUP-SELECT MENU FOR EXCEL PILLS
function PillDropdown({ 
  value, 
  options, 
  onChange
}: { 
  value: string
  options: { value: string; label: string; bg: string; border?: string; text: string; arrowColor?: string }[]
  onChange: (val: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const currentOpt = options.find(o => o.value === value) || options[0]

  return (
    <div className={cn("relative inline-block text-center w-[150px] select-none", isOpen ? "z-35" : "z-10")}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center gap-1 w-full rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase transition-all shadow-sm outline-none cursor-pointer text-center",
          currentOpt.bg,
          currentOpt.text,
          currentOpt.border ? `border ${currentOpt.border}` : "border border-transparent"
        )}
      >
        <span className="truncate text-center">{currentOpt.label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 opacity-80", currentOpt.arrowColor || currentOpt.text)} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-[185px] rounded-xl bg-white shadow-2xl border border-slate-200 focus:outline-none z-30 py-1.5 p-1 flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={cn(
                  "flex items-center justify-between w-full rounded-lg px-3 py-2 text-[10.5px] font-black uppercase transition-all text-left hover:brightness-95",
                  opt.bg,
                  opt.text,
                  opt.border ? `border ${opt.border}` : "border border-transparent"
                )}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// SPREADSHEET PILLS CUSTOM SELECT BADGES STYLING CATALOGUE ARRAYS
// -------------------------------------------------------------

const faseOptions = [
  { value: "Em processo de contratação", label: "Em processo de contratação", bg: "bg-[#dcfce7] hover:bg-[#dcfce7]/90", border: "border-[#bbf7d0]", text: "text-[#15803d]", arrowColor: "text-[#15803d]" },
  { value: "Aprovado", label: "Aprovado", bg: "bg-[#15803d] hover:bg-[#166534]", border: "border-transparent", text: "text-white", arrowColor: "text-white" },
  { value: "Reprovado", label: "Reprovado", bg: "bg-[#b91c1c] hover:bg-[#991b1b]", border: "border-transparent", text: "text-white", arrowColor: "text-white" },
  { value: "Stand-by", label: "Stand-by", bg: "bg-[#fef3c7] hover:bg-[#fef3c7]/90", border: "border-[#fde68a]", text: "text-[#d97706]", arrowColor: "text-[#d97706]" },
  { value: "Entrevista", label: "Entrevista", bg: "bg-[#f3e8ff] hover:bg-[#f3e8ff]/90", border: "border-[#e9d5ff]", text: "text-[#6b21a8]", arrowColor: "text-[#6b21a8]" },
  { value: "Não compareceu", label: "Não compareceu", bg: "bg-[#fee2e2] hover:bg-[#fee2e2]/90", border: "border-[#fecaca]", text: "text-[#b91c1c]", arrowColor: "text-[#b91c1c]" },
  { value: "Não atendeu", label: "Não atendeu", bg: "bg-[#ffedd5] hover:bg-[#ffedd5]/90", border: "border-[#fed7aa]", text: "text-[#c2410c]", arrowColor: "text-[#c2410c]" },
  { value: "Desistiu", label: "Desistiu", bg: "bg-[#e0f2fe] hover:bg-[#e0f2fe]/90", border: "border-[#bae6fd]", text: "text-[#0369a1]", arrowColor: "text-[#0369a1]" },
  { value: "Rep. formulário", label: "Rep. formulário", bg: "bg-[#f1f5f9] hover:bg-[#cbd5e1]/50", border: "border-[#cbd5e1]", text: "text-[#475569]", arrowColor: "text-[#475569]" },
  { value: "Outra oportunidade", label: "Outra oportunidade", bg: "bg-[#5c1c1c] hover:bg-[#521c1c]", border: "border-transparent", text: "text-white", arrowColor: "text-white" },
  { value: "Não veio para o teste", label: "Não veio para o teste", bg: "bg-[#205361] hover:bg-[#1f4a56]", border: "border-transparent", text: "text-white", arrowColor: "text-white" },
  { value: "Remarcar", label: "Remarcar", bg: "bg-[#f1f5f9] hover:bg-[#e2e8f0]", border: "border-[#cbd5e1]", text: "text-[#475569]", arrowColor: "text-[#475569]" }
]

const plataformaOptions = [
  { value: "Indeed", label: "Indeed", bg: "bg-[#e0f2fe] hover:bg-[#e0f2fe]/90", border: "border-[#bae6fd]", text: "text-[#0369a1]", arrowColor: "text-[#0369a1]" },
  { value: "Instagram", label: "Instagram", bg: "bg-[#f3e8ff] hover:bg-[#f3e8ff]/90", border: "border-[#e9d5ff]", text: "text-[#6b21a8]", arrowColor: "text-[#6b21a8]" },
  { value: "Indicação", label: "Indicação", bg: "bg-[#fef3c7] hover:bg-[#fef3c7]/90", border: "border-[#fde68a]", text: "text-[#b45309]", arrowColor: "text-[#b45309]" },
  { value: "Escola", label: "Escola", bg: "bg-[#f1f5f9] hover:bg-[#f1f5f9]/90", border: "border-[#e2e8f0]", text: "text-[#475569]", arrowColor: "text-[#475569]" }
]

const areaOptions = [
  { value: "Comercial", label: "Comercial", bg: "bg-[#dcfce7] hover:bg-[#dcfce7]/90", border: "border-[#bbf7d0]", text: "text-[#15803d]", arrowColor: "text-[#15803d]" },
  { value: "Operacional", label: "Operacional", bg: "bg-[#e0f2fe] hover:bg-[#e0f2fe]/90", border: "border-[#bae6fd]", text: "text-[#0369a1]", arrowColor: "text-[#0369a1]" },
  { value: "Estágio", label: "Estágio", bg: "bg-[#15803d] hover:bg-[#166534]", border: "border-transparent", text: "text-white", arrowColor: "text-white" },
  { value: "Não estudam", label: "Não estudam", bg: "bg-[#205361] hover:bg-[#1f4a56]", border: "border-transparent", text: "text-white", arrowColor: "text-white" },
  { value: "PJ", label: "PJ", bg: "bg-[#334155] hover:bg-[#1e293b]", border: "border-transparent", text: "text-white", arrowColor: "text-white" }
]
