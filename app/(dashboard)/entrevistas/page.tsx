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
  HelpCircle
} from "lucide-react"
import { toast } from "sonner"

// Our main spreadsheet interview record interface
interface Interview {
  id: string
  name: string
  phone: string
  date: string
  time: string
  fase: "Não compareceu" | "Desistiu" | "Reprovado" | "Aprovado" | "Outra oportunidade" | "Agendada" | "Realizada"
  plataforma: "Instagram" | "Indicação" | "WhatsApp" | "LinkedIn" | "Outro"
  area: "Estágio" | "Comercial" | "Operacional" | "TI"
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
  
  // Ref for hidden file input used to trigger CSV upload
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load and hydrate database
  useEffect(() => {
    const saved = localStorage.getItem("shark_hr_interviews_spreadsheet")
    if (saved) {
      try {
        setInterviews(JSON.parse(saved))
      } catch (e) {
        setInterviews(DEFAULT_CANDIDATES)
      }
    } else {
      // Fallback/Legacy data merge
      const legacySaved = localStorage.getItem("shark_hr_interviews")
      if (legacySaved) {
        try {
          const parsedLegacy = JSON.parse(legacySaved)
          // Map to spreadsheet candidate model
          const migrated: Interview[] = parsedLegacy.map((item: any, index: number) => ({
            id: item.id || `mig-${index}`,
            name: item.name || "Candidato",
            phone: item.phone || "",
            date: item.date || new Date().toISOString().split('T')[0],
            time: item.time ? (item.time.length === 5 ? `${item.time}:00` : item.time) : "14:00:00",
            fase: (item.status === "Aprovada" ? "Aprovado" : item.status === "Reprovada" ? "Reprovado" : item.status || "Agendada") as any,
            plataforma: item.plataforma || "Instagram",
            area: item.role === "Estágio" || item.role === "Estagio" ? "Estágio" : "Comercial",
            notes: item.notes || ""
          }))
          setInterviews(migrated)
          localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(migrated))
        } catch (err) {
          setInterviews(DEFAULT_CANDIDATES)
        }
      } else {
        setInterviews(DEFAULT_CANDIDATES)
        localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(DEFAULT_CANDIDATES))
      }
    }
  }, [])

  const saveInterviews = (updated: Interview[]) => {
    setInterviews(updated)
    localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(updated))
  }

  // Update a single cell directly in our state (Spreadsheet behavior!)
  const updateCell = (id: string, field: keyof Interview, value: any) => {
    const updated = interviews.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value }
      }
      return item
    })
    saveInterviews(updated)
  }

  // Insert a new blank row immediately and save
  const handleAddNewRow = () => {
    const newRow: Interview = {
      id: `int-${Date.now()}`,
      name: "",
      phone: "",
      date: new Date().toISOString().split('T')[0],
      time: "14:00:00",
      fase: "Agendada",
      plataforma: "Instagram",
      area: "Comercial",
      notes: ""
    }
    const updated = [newRow, ...interviews]
    saveInterviews(updated)
    toast.success("Nova linha em branco adicionada no topo da planilha!")
  }

  // Delete an entire candidate row
  const handleDeleteRow = (id: string, name: string) => {
    const updated = interviews.filter(item => item.id !== id)
    saveInterviews(updated)
    toast.success(`Candidato(a) ${name || "Sem Nome"} removido(a) com sucesso.`)
  }

  // Restore Default spreadsheet values
  const handleResetToDefault = () => {
    if (window.confirm("Deseja realmente restaurar os dados originais da demonstração? Isso substituirá as edições atuais.")) {
      saveInterviews(DEFAULT_CANDIDATES)
      toast.success("Planilha redefinida para os dados padrões!")
    }
  }

  // Pure TypeScript CSV parsing client side
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
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

          let plataformaVal = cleanCell(cols[5]) as any
          if (!["Instagram", "Indicação", "WhatsApp", "LinkedIn", "Outro"].includes(plataformaVal)) {
            plataformaVal = "Instagram"
          }

          let areaVal = cleanCell(cols[6]) as any
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
            fase: faseVal as any,
            plataforma: plataformaVal,
            area: areaVal,
            notes
          })
        }

        if (parsed.length > 0) {
          const combined = [...parsed, ...interviews]
          saveInterviews(combined)
          toast.success(`Sucesso! ${parsed.length} candidatos importados da planilha.`);
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
      <Header title="PLANEJAMENTO DE RECRUTAMENTO" />

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
                    <option value="Não compareceu">Não compareceu</option>
                    <option value="Desistiu">Desistiu</option>
                    <option value="Reprovado">Reprovado</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Outra oportunidade">Outra oportunidade</option>
                    <option value="Agendada">Agendada</option>
                    <option value="Realizada">Realizada</option>
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
                    <option value="Instagram">Instagram</option>
                    <option value="Indicação">Indicação</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Outro">Outro</option>
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
                    <option value="Estágio">Estágio</option>
                    <option value="Comercial">Comercial</option>
                  </select>
                </div>

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
                {filteredInterviews.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-20 bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileSpreadsheet className="w-10 h-10 text-slate-350" />
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Planilha vazia ou com filtros excessivos</p>
                        <p className="text-[11px] text-slate-500">Clique em "+ Nova Linha" ou "Dados Originais" para carregar registros.</p>
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
              Você pode trabalhar direto na ferramenta acima preenchendo novos candidatos e fases. Caso prefira inserir dados que já possui em sua planilha local original do Excel, basta salvar sua planilha excel no formato <strong>CSV delimitado por ponto e vírgula (.csv)</strong> e clicar no botão <strong>"Importar CSV"</strong>. Seus dados se acoplarão imediatamente à tela.
            </p>
          </div>
        </div>

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
  onChange: (val: any) => void
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
  { value: "Não compareceu", label: "Não compareceu", bg: "bg-red-50 hover:bg-red-100", border: "border-red-200", text: "text-red-700", arrowColor: "text-red-700" },
  { value: "Desistiu", label: "Desistiu", bg: "bg-sky-50 hover:bg-sky-100", border: "border-sky-200", text: "text-sky-700", arrowColor: "text-sky-700" },
  { value: "Reprovado", label: "Reprovado", bg: "bg-[#922b21] hover:bg-[#922b21]/90", text: "text-white", arrowColor: "text-white" },
  { value: "Aprovado", label: "Aprovado", bg: "bg-[#1e8449] hover:bg-[#1e8449]/90", text: "text-white", arrowColor: "text-white" },
  { value: "Outra oportunidade", label: "Outra oportunidade", bg: "bg-[#5c4033] hover:bg-[#5c4033]/90", text: "text-white", arrowColor: "text-white" },
  { value: "Agendada", label: "Agendada", bg: "bg-blue-50 border-blue-200", border: "border-blue-200", text: "text-blue-700", arrowColor: "text-blue-700" },
  { value: "Realizada", label: "Realizada", bg: "bg-slate-50 border-slate-200", border: "border-slate-200", text: "text-slate-600", arrowColor: "text-slate-600" }
]

const plataformaOptions = [
  { value: "Instagram", label: "Instagram", bg: "bg-purple-100 hover:bg-purple-150", border: "border-purple-300", text: "text-purple-700", arrowColor: "text-purple-700" },
  { value: "Indicação", label: "Indicação", bg: "bg-amber-100 hover:bg-amber-150", border: "border-amber-300", text: "text-amber-800", arrowColor: "text-amber-800" },
  { value: "WhatsApp", label: "WhatsApp", bg: "bg-emerald-100 hover:bg-emerald-150", border: "border-emerald-300", text: "text-emerald-800", arrowColor: "text-emerald-800" },
  { value: "LinkedIn", label: "LinkedIn", bg: "bg-blue-105 hover:bg-blue-150", border: "border-blue-300", text: "text-blue-800", arrowColor: "text-blue-800" },
  { value: "Outro", label: "Outro", bg: "bg-slate-100 hover:bg-slate-150", border: "border-slate-300", text: "text-slate-700", arrowColor: "text-slate-700" }
]

const areaOptions = [
  { value: "Estágio", label: "Estágio", bg: "bg-[#115e59] hover:bg-[#115e59]/90", text: "text-white", arrowColor: "text-white" },
  { value: "Comercial", label: "Comercial", bg: "bg-[#d4efdf] hover:bg-[#d4efdf]/90", border: "border-emerald-250", text: "text-emerald-800", arrowColor: "text-emerald-800" },
  { value: "Operacional", label: "Operacional", bg: "bg-sky-100", border: "border-sky-305", text: "text-sky-800", arrowColor: "text-sky-800" },
  { value: "TI", label: "TI", bg: "bg-slate-800", text: "text-white", arrowColor: "text-white" }
]
