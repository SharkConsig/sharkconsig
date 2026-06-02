"use client"

import React, { useState, useEffect, useRef } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trash2,
  Download,
  Upload,
  Check,
  ChevronDown,
  Info,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  HelpCircle,
  Database
} from "lucide-react"
import { toast } from "sonner"
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
}

// Preloaded high-fidelity dataset direct from user's Excel spreadsheet screenshot
const DEFAULT_CANDIDATES: Interview[] = [
  {
    id: "int-1",
    name: "Jenifer",
    phone: "48 9922-1458",
    date: "2025-10-08",
    time: "14:00:00",
    fase: "Não compareceu",
    plataforma: "Instagram",
    area: "Estágio",
    notes: ""
  },
  {
    id: "int-2",
    name: "João Lucas",
    phone: "48 8821-8244",
    date: "2025-10-13",
    time: "14:00:00",
    fase: "Não compareceu",
    plataforma: "Instagram",
    area: "Estágio",
    notes: "Mora nos Ingleses, tem 21 anos. Trabalhou durante 4 meses na motorola (saída: temporário), JA compact constante 1 ano..."
  },
  {
    id: "int-3",
    name: "Gabryella",
    phone: "48 9821-5955",
    date: "2025-10-13",
    time: "14:00:00",
    fase: "Desistiu",
    plataforma: "Instagram",
    area: "Estágio",
    notes: "Mora no Ipiranga, tem 21 anos. Trabalhou durante 5 meses na vivo (saída: mudou de loja), Clinica Imagem por 5 meses..."
  },
  {
    id: "int-4",
    name: "Airton",
    phone: "48 9955-1364",
    date: "2025-10-16",
    time: "14:00:00",
    fase: "Reprovado",
    plataforma: "Instagram",
    area: "Comercial",
    notes: "Mora na Vargem BJ, tem 22 anos. Trabalhou durante 3 meses na N1 (saiu por conta da saúde), 7 meses na colombo..."
  },
  {
    id: "int-5",
    name: "Julia",
    phone: "48 8830-2219",
    date: "2025-10-16",
    time: "14:00:00",
    fase: "Desistiu",
    plataforma: "Indicação",
    area: "Comercial",
    notes: "Mora em Serraria, tem 20 anos. Trabalhou durante 7 meses na JobSolution (clube de desconto, cartão, consignado) que..."
  },
  {
    id: "int-6",
    name: "Marina",
    phone: "48 8843-9504",
    date: "2025-10-16",
    time: "14:00:00",
    fase: "Reprovado",
    plataforma: "Indicação",
    area: "Comercial",
    notes: "Mora no Pantano do Sul, tem 33 anos. Trabalhou 1 ano na Fontes como aux. adm. (saída: fechou), Grupo Gold p..."
  },
  {
    id: "int-7",
    name: "Maria Eduarda",
    phone: "48 8850-7338",
    date: "2025-10-16",
    time: "14:00:00",
    fase: "Reprovado",
    plataforma: "Indicação",
    area: "Comercial",
    notes: "Mora no Ipiranga, tem 22 anos. Trabalhou 2 meses na JobSolution (saída: quer ter chance de crescimento)"
  },
  {
    id: "int-8",
    name: "Flavia",
    phone: "48 9800-3784",
    date: "2025-10-16",
    time: "14:00:00",
    fase: "Reprovado",
    plataforma: "Instagram",
    area: "Comercial",
    notes: "Mora no Rio Tavares, tem 19 anos. Trabalhou durante 1 mês na job solution (saída: localização), vendas de crédito cons..."
  },
  {
    id: "int-9",
    name: "Amine",
    phone: "48 9223-0087",
    date: "2025-11-22",
    time: "14:15:00",
    fase: "Aprovado",
    plataforma: "Instagram",
    area: "Estágio",
    notes: "Aptidão técnica ótima, perfil focado e carismática para vendas."
  },
  {
    id: "int-10",
    name: "Laura",
    phone: "54 9704-0185",
    date: "2025-12-22",
    time: "14:15:00",
    fase: "Outra oportunidade",
    plataforma: "Instagram",
    area: "Estágio",
    notes: "Excelente bagagem, porém indisponibilidade de horário aos sábados."
  },
  {
    id: "int-11",
    name: "Vitória",
    phone: "48 9846-9240",
    date: "2025-12-22",
    time: "14:15:00",
    fase: "Reprovado",
    plataforma: "Instagram",
    area: "Estágio",
    notes: "Sem experiência e perfil muito tímido para ligações ativas."
  },
  {
    id: "int-12",
    name: "Poliana",
    phone: "48 9156-0253",
    date: "2025-12-22",
    time: "14:15:00",
    fase: "Reprovado",
    plataforma: "Instagram",
    area: "Estágio",
    notes: "Falta de fit cultura com o restante dos corretores de plantão."
  },
  {
    id: "int-13",
    name: "Helena",
    phone: "48 9901-7497",
    date: "2025-10-17",
    time: "14:15:00",
    fase: "Não compareceu",
    plataforma: "Instagram",
    area: "Estágio",
    notes: "Não atendeu ligações no dia agendado."
  },
  {
    id: "int-14",
    name: "Andriw",
    phone: "48 8456-8906",
    date: "2025-10-24",
    time: "14:00:00",
    fase: "Desistiu",
    plataforma: "Instagram",
    area: "Comercial",
    notes: "Aceitou outra vaga concorrente."
  },
  {
    id: "int-15",
    name: "Jainara",
    phone: "48 9684-9480",
    date: "2025-10-24",
    time: "14:00:00",
    fase: "Não compareceu",
    plataforma: "Instagram",
    area: "Comercial",
    notes: "Candidata alegou problema de saúde, tentará reagendar."
  }
]

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
  const [faseFilter, setFaseFilter] = useState("Todas")
  const [plataformaFilter, setPlataformaFilter] = useState("Todas")
  const [areaFilter, setAreaFilter] = useState("Todas")
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [supabaseActive, setSupabaseActive] = useState<boolean | null>(null)
  const [activeSchema, setActiveSchema] = useState<"rh" | "public">("rh")
  const [loadingTable, setLoadingTable] = useState(true)
  const [showSqlModal, setShowSqlModal] = useState(false)
  
  // Quick Add Form States
  const [quickName, setQuickName] = useState("")
  const [quickPhone, setQuickPhone] = useState("")
  const [quickDate, setQuickDate] = useState(new Date().toISOString().split('T')[0])
  const [quickTime, setQuickTime] = useState("14:00")
  const [quickFase, setQuickFase] = useState("Entrevista")
  const [quickPlataforma, setQuickPlataforma] = useState("Instagram")
  const [quickArea, setQuickArea] = useState("Comercial")
  const [quickNotes, setQuickNotes] = useState("")
  const [showQuickAdd, setShowQuickAdd] = useState(true)
  
  // Ref for hidden file input used to trigger CSV upload
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load and hydrate database
  useEffect(() => {
    async function loadData() {
      setLoadingTable(true)
      
      const saved = localStorage.getItem("shark_hr_interviews_spreadsheet")
      let initialData: Interview[] = []
      
      if (saved) {
        try {
          initialData = JSON.parse(saved)
        } catch (e) {
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
              notes: item.notes || ""
            }))
            initialData = migrated
          } catch (err) {
            initialData = DEFAULT_CANDIDATES
          }
        } else {
          initialData = DEFAULT_CANDIDATES
        }
      }

      if (!isSupabaseConfigured) {
        setSupabaseActive(false)
        setInterviews(initialData)
        setLoadingTable(false)
        return
      }

      try {
        const { data, error } = await supabase
          .schema('rh')
          .from('hr_interviews')
          .select('*')
          .order('date', { ascending: false })
        
        if (error) {
          console.warn("Supabase load failed for schema 'rh':", error.message)
          setSupabaseActive(false)
          setInterviews(initialData)
          
          if (error.message.includes("Invalid schema") || error.message.includes("does not exist") || error.message.includes("schema \"rh\"")) {
            toast.error(
              "Atenção: O schema 'rh' não está exposto nas configurações de API do seu Supabase. Adicione 'rh' em 'Settings -> API -> Exposed Schemas' no painel do Supabase para ativar a sincronização.",
              { duration: 15000 }
            )
          } else {
            toast.error(`Erro ao sincronizar com Supabase: ${error.message}`)
          }
        } else if (data) {
          setSupabaseActive(true)
          setActiveSchema("rh")
          console.log("Connected successfully to database on schema 'rh'")
          if (data.length > 0) {
            const mappedData: Interview[] = (data as Interview[]).map((item) => ({
              id: item.id,
              name: item.name,
              phone: item.phone || "",
              date: item.date,
              time: item.time,
              fase: item.fase,
              plataforma: item.plataforma,
              area: item.area,
              notes: item.notes || ""
            }))
            setInterviews(mappedData)
            localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(mappedData))
            localStorage.setItem("shark_hr_interviews_database_seeded_v1", "true")
          } else {
            const wasSeeded = localStorage.getItem("shark_hr_interviews_database_seeded_v1")
            if (wasSeeded) {
              setInterviews([])
              localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify([]))
            } else {
              // Seed Supabase with defaults in custom schema 'rh'
              const seedToSupa = initialData.map(item => ({
                id: item.id,
                name: item.name,
                phone: item.phone || "",
                date: item.date,
                time: item.time,
                fase: item.fase,
                plataforma: item.plataforma,
                area: item.area,
                notes: item.notes || ""
              }))
              
              const client = supabase.schema('rh')
              const { error: insertErr } = await client.from('hr_interviews').upsert(seedToSupa)
              if (insertErr && insertErr.code !== '23505') {
                console.error("Failed to seed initial candidates to Supabase under schema rh:", insertErr.message)
              }
              setInterviews(initialData)
              localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(initialData))
              localStorage.setItem("shark_hr_interviews_database_seeded_v1", "true")
            }
          }
        }
      } catch (err) {
        console.warn("Error connecting to Supabase in schema rh, offline status active:", err)
        setSupabaseActive(false)
        setInterviews(initialData)
      } finally {
        setLoadingTable(false)
      }
    }
    
    loadData()
  }, [])

  // Update a single cell directly in our state (Spreadsheet behavior!) & Sync
  const updateCell = async (id: string, field: keyof Interview, value: string) => {
    // 1. Instant local ui update
    const updated = interviews.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value }
      }
      return item
    })
    setInterviews(updated)
    localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(updated))

    // 2. Sync online
    if (isSupabaseConfigured) {
      try {
        let valueForDb = value
        if (field === 'time' && typeof value === 'string' && value.length === 5) {
          valueForDb = `${value}:00`
        }
        const client = activeSchema === 'rh' ? supabase.schema('rh') : supabase
        const { error } = await client
          .from('hr_interviews')
          .update({ [field]: valueForDb })
          .eq('id', id)
        if (error) {
          console.error("Failed to update field on Supabase:", error.message)
          toast.error("Erro ao sincronizar com Supabase. Salvo localmente.")
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
      toast.error("Por favor, preencha o nome do candidato.")
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
      notes: quickNotes.trim()
    }

    // 1. Instant local state & cache update
    const updated = [newRow, ...interviews]
    setInterviews(updated)
    localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(updated))

    // 2. Sync with database
    if (isSupabaseConfigured) {
      try {
        const client = activeSchema === 'rh' ? supabase.schema('rh') : supabase
        const { error } = await client
          .from('hr_interviews')
          .insert([newRow])
        if (error) {
          console.error("Failed to insert row on Supabase:", error.message)
          toast.error("Salvo localmente, erro ao persistir no Supabase.")
        } else {
          toast.success("Candidato cadastrado e sincronizado com o banco!")
        }
      } catch (err) {
        console.error("Network sync error:", err)
        toast.error("Salvo offline! Sincronizará quando a rede retornar.")
      }
    } else {
      toast.success("Candidato inserido com sucesso (Modo Offline)!")
    }

    // Reset simple values for bulk insertion comfort (keep date, time, and drops)
    setQuickName("")
    setQuickPhone("")
    setQuickNotes("")
  }

  // Insert a new blank row immediately and save & Sync
  const handleAddNewRow = async () => {
    const newId = `int-${Date.now()}`
    const newRow: Interview = {
      id: newId,
      name: "",
      phone: "",
      date: new Date().toISOString().split('T')[0],
      time: "14:00:00",
      fase: "Agendada",
      plataforma: "Instagram",
      area: "Comercial",
      notes: ""
    }
    
    // 1. Instant local update
    const updated = [newRow, ...interviews]
    setInterviews(updated)
    localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(updated))

    // 2. Sync online
    if (isSupabaseConfigured) {
      try {
        const client = activeSchema === 'rh' ? supabase.schema('rh') : supabase
        const { error } = await client
          .from('hr_interviews')
          .insert([newRow])
        if (error) {
          console.error("Failed to insert row on Supabase:", error.message)
          toast.error("Erro ao sincronizar nova linha no banco. Salva localmente.")
        } else {
          toast.success("Nova linha adicionada em tempo real!")
          return
        }
      } catch (err) {
        console.error("Network error on Supabase sync:", err)
      }
    }
    toast.success("Nova linha em branco adicionada no topo da planilha (Offline)!")
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
        const client = activeSchema === 'rh' ? supabase.schema('rh') : supabase
        const { error } = await client
          .from('hr_interviews')
          .delete()
          .eq('id', id)
        if (error) {
          console.error("Failed to delete row on Supabase:", error.message)
          toast.error("Erro ao excluir do banco. Excluído localmente.")
        } else {
          toast.success(`Candidato(a) ${name || "Sem Nome"} removido(a) em tempo real!`)
          return
        }
      } catch (err) {
        console.error("Network error on Supabase sync:", err)
      }
    }
    toast.success(`Candidato(a) ${name || "Sem Nome"} removido(a) com sucesso (Offline).`)
  }

  // Restore Default spreadsheet values & Sync
  const handleResetToDefault = async () => {
    if (window.confirm("Deseja realmente restaurar os dados originais da demonstração? Isso substituirá as edições atuais.")) {
      setInterviews(DEFAULT_CANDIDATES)
      localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(DEFAULT_CANDIDATES))
      
      if (isSupabaseConfigured) {
        try {
          const client = activeSchema === 'rh' ? supabase.schema('rh') : supabase
          const { error: delErr } = await client
            .from('hr_interviews')
            .delete()
            .neq('id', 'dummy-id-never-match')
            
          if (delErr) {
            console.error("Failed to clean database table:", delErr.message)
          }

          const { error: insErr } = await client
            .from('hr_interviews')
            .insert(DEFAULT_CANDIDATES)
            
          if (insErr) {
            console.error("Failed to insert default rows to database:", insErr.message)
            toast.error("Restaurado localmente de forma segura, mas falhou ao semear no Supabase.")
          } else {
            toast.success("Tabela restaurada para os padrões no Supabase!")
          }
        } catch (err) {
          console.error("Network error on restore:", err)
        }
      } else {
        toast.success("Planilha redefinida localmente para os dados padrões!")
      }
    }
  }

  // Pure TypeScript CSV parsing client side & Sync
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      if (!text) {
        toast.error("Erro ao ler conteúdo do arquivo.")
        return
      }

      try {
        const lines = text.split("\n")
        const parsed: Interview[] = []
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const delimiter = line.includes(";") ? ";" : ","
          // Regex to parse CSV columns respecting quotes
          const cols = line.match(/(".*?"|[^";\s]+)(?=\s*[;,\n]|\s*$)/g) || line.split(delimiter)
          
          if (cols.length < 3) continue

          const cleanCell = (cell: string) => {
            if (!cell) return ""
            return cell.replace(/^["']|["']$/g, "").replace(/""/g, '"').trim()
          }

          const name = cleanCell(cols[0]) || "Candidato"
          const phone = cleanCell(cols[1]) || ""
          
          let date = cleanCell(cols[2])
          if (date.includes("/")) {
            const parts = date.split("/")
            if (parts.length === 3) {
              date = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
            }
          }

          const time = cleanCell(cols[3]) || "14:00:00"
          
          let faseVal = cleanCell(cols[4])
          if (!["Não compareceu", "Desistiu", "Reprovado", "Aprovado", "Outra oportunidade", "Agendada", "Realizada"].includes(faseVal)) {
            faseVal = "Agendada"
          }

          let plataformaVal = cleanCell(cols[5]) as string
          if (!["Instagram", "Indicação", "WhatsApp", "LinkedIn", "Outro"].includes(plataformaVal)) {
            plataformaVal = "Instagram"
          }

          let areaVal = cleanCell(cols[6]) as string
          if (!["Estágio", "Comercial", "Operacional", "TI"].includes(areaVal)) {
            areaVal = "Comercial"
          }

          const notes = cleanCell(cols[7]) || ""

          parsed.push({
            id: `csv-${Date.now()}-${i}`,
            name,
            phone,
            date,
            time,
            fase: faseVal as string,
            plataforma: plataformaVal,
            area: areaVal,
            notes
          })
        }

        if (parsed.length > 0) {
          const combined = [...parsed, ...interviews]
          setInterviews(combined)
          localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(combined))
          
          if (isSupabaseConfigured) {
            try {
              const client = activeSchema === 'rh' ? supabase.schema('rh') : supabase
              const { error } = await client
                .from('hr_interviews')
                .insert(parsed)
              if (error) {
                console.error("Failed to insert CSV rows on Supabase:", error.message)
                toast.error(`Importado localmente apenas. Supabase: ${error.message}`)
              } else {
                toast.success(`Sucesso! ${parsed.length} novos candidatos integrados ao Supabase.`);
              }
            } catch (err) {
              console.error("Network error inserting CSV rows on Supabase:", err)
              toast.error("Importado localmente apenas (erro de conexão com banco).")
            }
          } else {
            toast.success(`Sucesso! ${parsed.length} candidatos importados da planilha (Offline).`);
          }
        } else {
          toast.error("Nenhuma linha válida encontrada para importação.")
        }
      } catch (err) {
        toast.error("Formato de arquivo inválido. Certifique-se de que é um CSV válido.")
      }
    }
    reader.readAsText(file)
    e.target.value = "" // Clear input
  }

  // Client side CSV download formatted specifically for Excel to open beautifully (UTF-8 BOM)
  const handleExportCSV = () => {
    const headers = ["Candidato", "Contato", "Data", "Horário", "Fase", "Plataforma", "Área", "Observações"]
    
    const rows = interviews.map(item => {
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
    link.setAttribute("download", `Recrutamento_RH_Excel_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Download iniciado! Planilha exportada idealmente para Excel.")
  }

  // Filter application
  const filteredInterviews = interviews.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                        item.phone.toLowerCase().includes(search.toLowerCase()) || 
                        item.notes.toLowerCase().includes(search.toLowerCase())
                        
    const matchFase = faseFilter === "Todas" || item.fase === faseFilter
    const matchPlataforma = plataformaFilter === "Todas" || item.plataforma === plataformaFilter
    const matchArea = areaFilter === "Todas" || item.area === areaFilter
    
    return matchSearch && matchFase && matchPlataforma && matchArea
  })

  // Calculations for quick metrics
  const totalCandidatos = interviews.length
  const totalAprovados = interviews.filter(i => i.fase === "Aprovado").length
  const totalNãoCompareceu = interviews.filter(i => i.fase === "Não compareceu").length
  const totalDesistiu = interviews.filter(i => i.fase === "Desistiu").length

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] min-h-screen font-sans">
      <Header title="ENTREVISTAS" />

      <div className="p-4 lg:p-8 max-w-[1700px] mx-auto w-full space-y-6 pb-24 animate-fade-in text-slate-800">
        
        {/* TOP ALERT HEADER LINKING THE GRAPHICS/EXCEL */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#172554] via-[#1E293B] to-[#0F172A] p-6 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 bg-teal-400 text-[#0F172A] text-[9.5px] uppercase tracking-widest font-black px-3 py-1 rounded-full border border-teal-300">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Planilha de Entrevistas
                </span>
                <span className="bg-white/10 text-white text-[9.5px] uppercase tracking-widest font-black px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">
                  Sincronizado Integrado
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
                Área de Recrutamento & Seleção (Planilha RH)
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Uma réplica fiel e funcional de sua planilha de acompanhamento do Excel. Edite qualquer célula diretamente com 1 clique, use filtros integrados e faça importações ou exportações.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-1 text-xs">
                {supabaseActive === true ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/25">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    Supabase Ativo (Sincronização em Tempo Real via schema &apos;{activeSchema}&apos;)
                  </span>
                ) : supabaseActive === false ? (
                  <span 
                    onClick={() => setShowSqlModal(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-medium cursor-pointer hover:bg-amber-500/30 transition-colors border border-amber-500/25"
                    title="Clique para ver instruções de SQL para o seu Supabase"
                  >
                    <Database className="w-3.5 h-3.5 text-amber-400" />
                    Banco Local Ativo (Tabela &apos;{activeSchema}.hr_interviews&apos; offline - Clique para configurar SQL)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-500/20 text-slate-300 font-medium border border-slate-550/25">
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                    Buscando conexões de banco de dados...
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-row flex-wrap gap-2 shrink-0">
              {/* Reset state */}
              <Button 
                onClick={handleResetToDefault}
                variant="outline"
                className="bg-white/5 text-white hover:bg-white/10 border-white/10 h-[38px] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Dados Originais
              </Button>

              {/* Upload Excel Button */}
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white h-[38px] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md border border-emerald-500"
              >
                <Upload className="w-3.5 h-3.5" />
                Importar CSV
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportCSV} 
                className="hidden" 
                accept=".csv"
              />

              {/* Download Excel Button */}
              <Button 
                onClick={handleExportCSV}
                className="bg-[#0f172a] hover:bg-[#1e293b] text-white border border-slate-700 h-[38px] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                Exportar Excel (CSV)
              </Button>
            </div>
          </div>
          <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* QUICK NUMERIC PERFORMANCE STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Triagens</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">{totalCandidatos}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Registros totais</p>
              </div>
              <div className="w-[42px] h-[42px] rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Aprovados</p>
                <p className="text-2xl font-black text-emerald-600 tracking-tight">{totalAprovados}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Aptos para admissão</p>
              </div>
              <div className="w-[42px] h-[42px] rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Desistiram</p>
                <p className="text-2xl font-black text-sky-600 tracking-tight">{totalDesistiu}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Optaram por não seguir</p>
              </div>
              <div className="w-[42px] h-[42px] rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/80 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Não Compareceu</p>
                <p className="text-2xl font-black text-rose-500 tracking-tight">{totalNãoCompareceu}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Ausências registradas</p>
              </div>
              <div className="w-[42px] h-[42px] rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CADASTRO RÁPIDO DO CANDIDATO */}
        {showQuickAdd && (
          <Card className="border border-slate-200 bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-300">
            <div className="bg-[#0B1E36] px-5 py-3.5 text-white flex items-center justify-between border-b border-slate-900 select-none">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-black uppercase tracking-wider">⚡ Formulário de Cadastro Rápido de Candidato</h2>
              </div>
              <span className="text-[9px] text-[#A5F3FC] uppercase font-black tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-505">
                Sincronização em Tempo Real
              </span>
            </div>
            <CardContent className="p-5">
              <form onSubmit={handleQuickAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Nome */}
                <div className="space-y-1.25">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Candidato *</label>
                  <Input 
                    placeholder="Nome completo do candidato"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="h-[38px] text-xs font-bold rounded-xl bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white"
                    required
                  />
                </div>

                {/* Contato/Telefone */}
                <div className="space-y-1.25">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Contato (Telefone)</label>
                  <Input 
                    placeholder="e.g. 48 99123-4567"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    className="h-[38px] text-xs font-bold rounded-xl bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white"
                  />
                </div>

                {/* Data */}
                <div className="space-y-1.25">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Data da Entrevista</label>
                  <Input 
                    type="date"
                    value={quickDate}
                    onChange={(e) => setQuickDate(e.target.value)}
                    className="h-[38px] text-xs font-mono font-bold rounded-xl bg-slate-50 border-slate-200 text-slate-800 focus:bg-white"
                  />
                </div>

                {/* Horário */}
                <div className="space-y-1.25">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Horário</label>
                  <Input 
                    type="time"
                    value={quickTime}
                    onChange={(e) => setQuickTime(e.target.value)}
                    className="h-[38px] text-xs font-mono font-bold rounded-xl bg-slate-50 border-slate-200 text-slate-800 focus:bg-white"
                  />
                </div>

                {/* Fase */}
                <div className="space-y-1.25">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Fase Inicial</label>
                  <select
                    value={quickFase}
                    onChange={(e) => setQuickFase(e.target.value)}
                    className="w-full h-[38px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-1 focus:ring-slate-350 focus:bg-white"
                  >
                    {faseOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Plataforma */}
                <div className="space-y-1.25">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Plataforma</label>
                  <select
                    value={quickPlataforma}
                    onChange={(e) => setQuickPlataforma(e.target.value)}
                    className="w-full h-[38px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-1 focus:ring-slate-350 focus:bg-white"
                  >
                    {plataformaOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Área */}
                <div className="space-y-1.25">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Área / Cargo</label>
                  <select
                    value={quickArea}
                    onChange={(e) => setQuickArea(e.target.value)}
                    className="w-full h-[38px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-1 focus:ring-slate-350 focus:bg-white"
                  >
                    {areaOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Observações */}
                <div className="space-y-1.25">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Observações Iniciais</label>
                  <Input 
                    placeholder="e.g. Ótima comunicação, mora perto..."
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    className="h-[38px] text-xs font-bold rounded-xl bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white"
                  />
                </div>

                {/* Action buttons */}
                <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end gap-2 pt-3 mt-1 border-t border-slate-100">
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setQuickName("")
                      setQuickPhone("")
                      setQuickNotes("")
                    }}
                    className="h-[36px] rounded-xl text-xs font-black uppercase tracking-wider px-5 text-slate-500 hover:text-slate-[#0B1E36]"
                  >
                    Limpar
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-[36px] px-6 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/10"
                  >
                    <Check className="w-4 h-4" />
                    Adicionar Candidato
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        )}

        {/* CONTROLS BAR: SEARCH & COLUMN FILTERS */}
        <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
          <CardContent className="p-5 flex flex-col gap-4">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Search text input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input 
                  placeholder="Pesquisar nos registros (Nome, Telefone, Observações)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-[38px] bg-slate-50/50 border-slate-200 text-xs font-semibold text-slate-700 placeholder:text-slate-400 rounded-xl"
                />
              </div>

              {/* Inline Column Filter Dropdowns */}
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Filter Fase */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fase:</span>
                  <select
                    value={faseFilter}
                    onChange={(e) => setFaseFilter(e.target.value)}
                    className="h-[34px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none cursor-pointer focus:ring-1 focus:ring-slate-350"
                  >
                    <option value="Todas">Todas</option>
                    <option value="Em processo de contratação">Em processo de contratação</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Reprovado">Reprovado</option>
                    <option value="Stand-by">Stand-by</option>
                    <option value="Entrevista">Entrevista</option>
                    <option value="Não compareceu">Não compareceu</option>
                    <option value="Desistiu">Desistiu</option>
                    <option value="Rep. formulário">Rep. formulário</option>
                    <option value="Outra oportunidade">Outra oportunidade</option>
                    <option value="Não veio para o teste">Não veio para o teste</option>
                    <option value="Remarcar">Remarcar</option>
                  </select>
                </div>

                {/* Filter Plataforma */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plataforma:</span>
                  <select
                    value={plataformaFilter}
                    onChange={(e) => setPlataformaFilter(e.target.value)}
                    className="h-[34px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none cursor-pointer focus:ring-1 focus:ring-slate-350"
                  >
                    <option value="Todas">Todas</option>
                    <option value="Indeed">Indeed</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Escola">Escola</option>
                  </select>
                </div>

                {/* Filter Área */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Área:</span>
                  <select
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="h-[34px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none cursor-pointer focus:ring-1 focus:ring-slate-350"
                  >
                    <option value="Todas">Todas</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Operacional">Operacional</option>
                    <option value="Estágio">Estágio</option>
                    <option value="Não estudam">Não estudam</option>
                    <option value="PJ">PJ</option>
                  </select>
                </div>

                {/* Toggle Quick Add Form */}
                <Button 
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  variant="outline"
                  className={cn(
                    "rounded-xl h-[36px] px-3.5 text-[10px] font-black uppercase tracking-widest gap-1.5 transition-all border shrink-0",
                    showQuickAdd 
                      ? "bg-slate-150 border-slate-300 text-slate-700 hover:bg-slate-200" 
                      : "bg-[#0F172A] text-teal-400 border-slate-800 hover:bg-slate-800"
                  )}
                  title={showQuickAdd ? "Ocultar o Formulário de Cadastro Rápido" : "Exibir o Formulário de Cadastro Rápido"}
                >
                  {showQuickAdd ? "Esconder Formulário" : "⚡ Cadastro Rápido"}
                </Button>

                {/* Add new inline row */}
                <Button 
                  onClick={handleAddNewRow}
                  className="bg-[#0B1E36] hover:bg-[#0B1E36]/90 text-white rounded-xl h-[36px] px-4 text-[10px] font-black uppercase tracking-widest gap-1.5 ml-auto md:ml-0 shadow-sm"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  + Nova Linha
                </Button>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* THE EXCEL-LIKE SPREADSHEET VIEWER */}
        <div className="bg-[#FFFFFF] border border-slate-200 rounded-2xl shadow-md overflow-hidden relative">
          
          {/* SPREADSHEET TOP CAP */}
          <div className="bg-[#0B192C] px-3 py-1.5 text-white flex items-center justify-between border-b border-slate-900 select-none">
            <div className="flex items-center gap-2">
              {/* Fake dropdown selector mimicking the screenshot top bar */}
              <div className="flex items-center gap-1 bg-[#1E293B]/60 hover:bg-[#1E293B] rounded px-2.5 py-1 text-[11px] font-extrabold uppercase transition-all cursor-pointer border border-[#1E293B]">
                <span className="text-[#38BDF8] font-black text-xs">RH</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </div>
              <div className="w-[1px] h-4 bg-slate-700 mx-1" />
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase select-none">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                Painel Ativo de Processamento de Leads de Contratação
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-slate-400 font-extrabold">
              <span>Modo SpreadSheet Ativado</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse table-fixed min-w-[1250px]">
              
              {/* Navy blue table header mimicking print exactly */}
              <thead>
                <tr className="bg-[#0B192C] text-white select-none border-b border-slate-900 text-xs font-bold divide-x divide-slate-800">
                  <th className="w-[14%] px-3 py-2 text-left flex-row items-center gap-1 uppercase tracking-wider">
                    <span className="text-[10px] font-thin text-stone-400 opacity-60 font-mono mr-1">Tt</span>
                    Candidato
                  </th>
                  <th className="w-[11%] px-3 py-2 text-left uppercase tracking-wider">
                    <span className="text-[10px] font-thin text-stone-400 opacity-60 font-mono mr-1">Tt</span>
                    Contato
                  </th>
                  <th className="w-[11%] px-3 py-2 text-left uppercase tracking-wider col-span-1">
                    <span className="text-[10px] font-thin text-stone-400 opacity-60 font-mono mr-1">📅</span>
                    Data
                  </th>
                  <th className="w-[9%] px-3 py-2 text-left uppercase tracking-wider">
                    <span className="text-[10px] font-thin text-stone-400 opacity-60 font-mono mr-1">⏱️</span>
                    Horário
                  </th>
                  <th className="w-[15%] px-3 py-2 text-center uppercase tracking-wider">
                    <span className="text-[10px] font-thin text-stone-400 opacity-60 font-mono mr-1">🔗</span>
                    Fase
                  </th>
                  <th className="w-[12%] px-3 py-2 text-center uppercase tracking-wider">
                    <span className="text-[10px] font-thin text-stone-400 opacity-60 font-mono mr-1">🔗</span>
                    Plataforma
                  </th>
                  <th className="w-[10%] px-3 py-2 text-center uppercase tracking-wider">
                    <span className="text-[10px] font-thin text-stone-400 opacity-60 font-mono mr-1">🔗</span>
                    Área
                  </th>
                  <th className="w-[24%] px-4 py-2 text-left uppercase tracking-wider">
                    <span className="text-[10px] font-thin text-stone-400 opacity-60 font-mono mr-1">Tt</span>
                    Observações
                  </th>
                  <th className="w-[4%] px-2 py-2 text-center uppercase tracking-wider">
                    X
                  </th>
                </tr>
              </thead>

              {/* Spreadsheet rows list */}
              <tbody className="divide-y divide-slate-200">
                {loadingTable ? (
                  <tr>
                    <td colSpan={9} className="text-center py-20 bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center space-y-3 animate-pulse">
                        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" strokeWidth={3} />
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-none">Sincronizando com Banco de Dados em tempo real...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredInterviews.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-20 bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileSpreadsheet className="w-10 h-10 text-slate-350" />
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Planilha vazia ou com filtros excessivos</p>
                        <p className="text-[11px] text-slate-500">Clique em &quot;+ Nova Linha&quot; ou &quot;Dados Originais&quot; para carregar registros.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInterviews.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className={cn(
                        "hover:bg-slate-50/85 transition-colors divide-x divide-slate-200 text-xs font-semibold align-middle",
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                      )}
                    >
                      {/* CANDIDATO CELL (INLINE EDITABLE INPUT) */}
                      <td className="px-2.5 py-1">
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={(e) => updateCell(item.id, "name", e.target.value)}
                          placeholder="Sem nome"
                          className="w-full bg-transparent border-0 hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1.5 text-xs font-black text-slate-800 uppercase outline-none transition-all"
                        />
                      </td>

                      {/* CONTATO CELL (INLINE EDITABLE INPUT) */}
                      <td className="px-2.5 py-1">
                        <input 
                          type="text" 
                          value={item.phone} 
                          onChange={(e) => updateCell(item.id, "phone", e.target.value)}
                          placeholder="e.g. 48 9999-9999"
                          className="w-full bg-transparent border-0 hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1.5 text-xs font-bold text-slate-700 outline-none transition-all"
                        />
                      </td>

                      {/* DATA CELL DELEGATED (NATIVE PICKER ON CLICK) */}
                      <td className="px-2 py-1">
                        <DateCell 
                          value={item.date} 
                          onChange={(val) => updateCell(item.id, "date", val)} 
                        />
                      </td>

                      {/* HORÁRIO CELL DELEGATED (TIME CHOOSE ON CLICK) */}
                      <td className="px-2 py-1">
                        <TimeCell 
                          value={item.time} 
                          onChange={(val) => updateCell(item.id, "time", val)} 
                        />
                      </td>

                      {/* FASE PILL DROPDOWN */}
                      <td className="px-2 py-1.5 text-center">
                        <PillDropdown 
                          value={item.fase} 
                          onChange={(val) => updateCell(item.id, "fase", val)} 
                          options={faseOptions} 
                        />
                      </td>

                      {/* PLATAFORMA PILL DROPDOWN */}
                      <td className="px-2 py-1.5 text-center">
                        <PillDropdown 
                          value={item.plataforma} 
                          onChange={(val) => updateCell(item.id, "plataforma", val)} 
                          options={plataformaOptions} 
                        />
                      </td>

                      {/* ÁREA PILL DROPDOWN */}
                      <td className="px-2 py-1.5 text-center">
                        <PillDropdown 
                          value={item.area} 
                          onChange={(val) => updateCell(item.id, "area", val)} 
                          options={areaOptions} 
                        />
                      </td>

                      {/* OBSERVAÇÕES CELL DELEGATED (AUTO-TEXTAREA SWELL) */}
                      <td className="px-2.5 py-1">
                        <NotesCell 
                          value={item.notes} 
                          onChange={(val) => updateCell(item.id, "notes", val)} 
                        />
                      </td>

                      {/* TRASH ROW BUTTON */}
                      <td className="px-1 py-1 text-center">
                        <Button 
                          onClick={() => handleDeleteRow(item.id, item.name)}
                          variant="ghost" 
                          size="icon" 
                          title="Remover Candidato"
                          className="w-7 h-7 bg-red-100/70 hover:bg-rose-100 hover:text-red-650 text-rose-600 rounded-lg shrink-0 transition-colors inline-flex align-middle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>

          {/* SPREADSHEET FOOTER INSTRUCTIONS */}
          <div className="bg-[#0B192C] text-white/50 px-4 py-2.5 text-[10px] font-medium flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-900 select-none">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Instrução: Dê 1 clique sobre campos de texto para editá-los de imediato. Sincronização offline-first persistida.</span>
            </div>
            <div>
              <span>Exibindo <strong>{filteredInterviews.length}</strong> de <strong>{interviews.length}</strong> registros cadastrados</span>
            </div>
          </div>

        </div>

        {/* TIPS BOX AT THE BOTTTOM */}
        <div className="bg-slate-100 border border-slate-205/60 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#0B1E36]/10 text-[#0B1E36] flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Como funciona o sincronizador do Excel?</h4>
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-5xl">
              Você pode trabalhar direto na ferramenta acima preenchendo novos candidatos e fases. Caso prefira inserir dados que já possui em sua planilha local original do Excel, basta salvar sua planilha excel no formato <strong>CSV delimitado por ponto e vírgula (.csv)</strong> e clicar no botão <strong>&quot;Importar CSV&quot;</strong>. Seus dados se acoplarão imediatamente à tela.
            </p>
          </div>
        </div>

      </div>

      {/* SQL Setup Modal helper */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-2xl w-full bg-slate-900 text-slate-100 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">Configurar Supabase para Entrevistas</h3>
                </div>
                <p className="text-slate-400 text-xs">Instalação e estruturação da tabela <code className="text-amber-300 font-mono">hr_interviews</code> no banco.</p>
              </div>
              <button 
                onClick={() => setShowSqlModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto space-y-4 pr-1 text-slate-300 text-xs leading-relaxed">
              <p>
                Para habilitar a persistência real das entrevistas em nuvem de forma imediata, execute o seguinte comando SQL na aba **SQL Editor** do seu painel do Supabase. O módulo se conectará de forma totalmente segura e automática.
              </p>

              <div className="relative">
                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl font-mono text-[10px] overflow-y-auto max-h-[250px] whitespace-pre border border-slate-800/80">
{`-- OPÇÃO 1 (Schema 'rh')
CREATE SCHEMA IF NOT EXISTS rh;
CREATE TABLE IF NOT EXISTS rh.hr_interviews (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    fase TEXT NOT NULL DEFAULT 'Entrevista',
    plataforma TEXT NOT NULL DEFAULT 'Instagram',
    area TEXT NOT NULL DEFAULT 'Comercial',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE rh.hr_interviews ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE rh.hr_interviews TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Acesso total livre para hr_interviews" ON rh.hr_interviews;
CREATE POLICY "Acesso total livre para hr_interviews" ON rh.hr_interviews FOR ALL USING (true) WITH CHECK (true);

-- OPÇÃO 2 (AUTO-FALLBACK - Schema 'public')
CREATE TABLE IF NOT EXISTS public.hr_interviews (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    fase TEXT NOT NULL DEFAULT 'Entrevista',
    plataforma TEXT NOT NULL DEFAULT 'Instagram',
    area TEXT NOT NULL DEFAULT 'Comercial',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE public.hr_interviews ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.hr_interviews TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Acesso total livre para hr_interviews" ON public.hr_interviews;
CREATE POLICY "Acesso total livre para hr_interviews" ON public.hr_interviews FOR ALL USING (true) WITH CHECK (true);`}
                </pre>
                <Button
                  onClick={async () => {
                    const sqlText = `CREATE SCHEMA IF NOT EXISTS rh;
CREATE TABLE IF NOT EXISTS rh.hr_interviews (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    fase TEXT NOT NULL DEFAULT 'Entrevista',
    plataforma TEXT NOT NULL DEFAULT 'Instagram',
    area TEXT NOT NULL DEFAULT 'Comercial',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE rh.hr_interviews ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE rh.hr_interviews TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Acesso total livre para hr_interviews" ON rh.hr_interviews;
CREATE POLICY "Acesso total livre para hr_interviews" ON rh.hr_interviews FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.hr_interviews (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    fase TEXT NOT NULL DEFAULT 'Entrevista',
    plataforma TEXT NOT NULL DEFAULT 'Instagram',
    area TEXT NOT NULL DEFAULT 'Comercial',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE public.hr_interviews ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.hr_interviews TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Acesso total livre para hr_interviews" ON public.hr_interviews;
CREATE POLICY "Acesso total livre para hr_interviews" ON public.hr_interviews FOR ALL USING (true) WITH CHECK (true);`;
                    try {
                      await navigator.clipboard.writeText(sqlText);
                      toast.success("Script SQL completo (Duo Schema) copiado com sucesso!");
                    } catch (err) {
                      toast.error("Erro ao copiar.");
                    }
                  }}
                  className="absolute top-2 right-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg px-2.5 py-1 text-[10px] uppercase font-bold"
                >
                  Copiar SQL
                </Button>
              </div>

              <div className="p-3.5 bg-slate-950/40 rounded-2xl border border-slate-800/60 text-slate-400 text-[11px] leading-snug">
                💡 <strong>Dica de Automação:</strong> Ao executar o código acima, as tabelas serão geradas nos schemas <code className="text-amber-300">rh</code> e <code className="text-amber-300">public</code>. Caso sua API do Supabase não possua o schema <code className="text-amber-300">rh</code> exposto, o sistema usará o schema <code className="text-amber-300">public</code> de forma 100% transparente para garantir o sincronismo!
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <Button
                onClick={() => setShowSqlModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase text-[10px] h-[36px] px-6 rounded-xl"
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}
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
          placeholder="Escreva observações do candidato..."
          className="w-full bg-white border border-blue-500 rounded px-2 py-1.5 text-xs font-medium text-slate-700 outline-none shadow-md resize-y"
        />
      ) : (
        <span 
          onClick={() => setIsEditing(true)} 
          className="text-xs font-medium text-slate-500 italic block w-full hover:bg-slate-100 rounded px-2 py-1.5 truncate max-w-sm transition-colors"
          title={value}
        >
          {value || <span className="text-slate-300">Observações</span>}
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
    <div className="relative inline-block text-left w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase transition-all shadow-sm outline-none",
          currentOpt.bg,
          currentOpt.text,
          currentOpt.border ? `border ${currentOpt.border}` : "border border-transparent"
        )}
      >
        <span className="truncate">{currentOpt.label}</span>
        <ChevronDown className={cn("w-3 h-3 ml-1 shrink-0 opacity-80", currentOpt.arrowColor || currentOpt.text)} />
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
