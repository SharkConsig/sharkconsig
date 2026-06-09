"use client"

import React, { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Clock, 
  Award, 
  Gift, 
  Heart 
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface EmployeeTenure {
  id: string
  name: string
  role: string
  joinDate: string
  tenureYears: number
  tenureMonths: number
  totalMonths: number
  nextMilestone: string
  giftAwarded: boolean
}

interface DBCollaborator {
  id: string
  nome?: string | null
  funcao?: string | null
  data_admissao?: string | null
  status?: string | null
  // fallback compatibility fields
  name?: string | null
  role?: string | null
  joinDate?: string | null
}

// Helper to parse multiple date formats safely
const parseDateStringToDate = (dateStr: string): Date | null => {
  if (!dateStr) return null
  const cleanStr = dateStr.trim()
  
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const parts = cleanStr.split("-")
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  }
  
  // Try DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanStr)) {
    const parts = cleanStr.split("/")
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10))
  }

  // Try DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleanStr)) {
    const parts = cleanStr.split("-")
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10))
  }

  const parsed = Date.parse(cleanStr)
  if (!isNaN(parsed)) {
    return new Date(parsed)
  }

  return null
}

export default function TempoEmpresaPage() {
  const [loading, setLoading] = useState(true)
  const [collaborators, setCollaborators] = useState<DBCollaborator[]>([])
  const [giftAwardedIds, setGiftAwardedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Load collaborators and gift states on start
  useEffect(() => {
    // Load local storage gift states
    try {
      const saved = localStorage.getItem("shark_hr_gifts_awarded_ids")
      if (saved) {
        setGiftAwardedIds(JSON.parse(saved))
      }
    } catch (e) {
      console.error("Failed to load custom gift tracking:", e)
    }

    async function fetchCollaborators() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("hr_colaboradores")
          .select("*")
          .order("nome", { ascending: true })

        if (error) {
          throw error
        }

        if (data) {
          const activeOnly = data.filter((item: DBCollaborator) => item.status === "Ativo")
          setCollaborators(activeOnly)
        }
      } catch (err) {
        console.error("Error loading active collaborators in tempo-empresa:", err)
        // Fallback to local storage if offline
        const saved = localStorage.getItem("shark_hr_collaborators_spreadsheet")
        if (saved) {
          try {
            const items = JSON.parse(saved).filter((item: DBCollaborator) => item.status === "Ativo")
            setCollaborators(items)
          } catch {
            setCollaborators([])
          }
        } else {
          // Defaults if no database is connected/configured or offline with empty state
          setCollaborators([
            { id: "1", nome: "Mariana Costa Neves", funcao: "Supervisor Comercial", data_admissao: "2023-01-10", status: "Ativo" },
            { id: "2", nome: "Gabriela Souza Santos", funcao: "Corretor Consignado Sênior", data_admissao: "2024-02-15", status: "Ativo" },
            { id: "3", nome: "Leonardo Albuquerque", funcao: "Corretor Executivo de Vendas", data_admissao: "2024-11-01", status: "Ativo" },
            { id: "4", nome: "Henrique de Oliveira", funcao: "Operador de Backoffice", data_admissao: "2025-05-20", status: "Ativo" },
            { id: "5", nome: "Thais Fernanda Pereira", funcao: "Estagiário Comercial", data_admissao: "2025-12-05", status: "Ativo" }
          ])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCollaborators()
  }, [])

  const handleCelebrate = (name: string) => {
    alert("Uma notificação de comemoração especial de aniversário de tempo de casa foi enviada no painel principal da " + name + "! 🎉")
  }

  const handleToggleGift = (id: string, current: boolean) => {
    let updatedIds = [...giftAwardedIds]
    if (current) {
      updatedIds = updatedIds.filter(x => x !== id)
    } else {
      updatedIds.push(id)
    }
    setGiftAwardedIds(updatedIds)
    localStorage.setItem("shark_hr_gifts_awarded_ids", JSON.stringify(updatedIds))
  }

  // Map collaborators dynamically
  const mappedTenures: EmployeeTenure[] = collaborators.map((item) => {
    const name = item.nome || item.name || "Sem Nome"
    const role = item.funcao || item.role || "Sem Função"
    const startField = item.data_admissao || item.joinDate || ""
    
    const joinDateObj = parseDateStringToDate(startField)
    let years = 0
    let months = 0
    let totalMonths = 0
    let nextMilestone = "N/A"

    if (joinDateObj) {
      const today = new Date()
      years = today.getFullYear() - joinDateObj.getFullYear()
      months = today.getMonth() - joinDateObj.getMonth()
      
      if (today.getDate() < joinDateObj.getDate()) {
        months--
      }
      
      if (months < 0) {
        years--
        months += 12
      }
      
      if (years < 0) {
        years = 0
        months = 0
      }
      
      totalMonths = (years * 12) + months

      const monthsAbbr = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
      const milestoneMonth = monthsAbbr[joinDateObj.getMonth()]
      const milestoneYear = joinDateObj.getFullYear() + Math.max(1, years + 1)
      nextMilestone = `${Math.max(1, years + 1)} Anos (${milestoneMonth} ${milestoneYear})`
    }

    const giftAwarded = giftAwardedIds.includes(item.id)

    return {
      id: item.id,
      name,
      role,
      joinDate: startField,
      tenureYears: years,
      tenureMonths: months,
      totalMonths,
      nextMilestone,
      giftAwarded
    }
  })

  // Dynamic Metrics definitions
  const getVeteran = () => {
    if (mappedTenures.length === 0) return { name: "Nenhum Ativo", detail: "Sem dados" }
    const sorted = [...mappedTenures].sort((a, b) => b.totalMonths - a.totalMonths)
    const veteran = sorted[0]
    return {
      name: veteran.name,
      detail: `${veteran.tenureYears} Anos e ${veteran.tenureMonths} Meses na SharkConsig`
    }
  }

  const getAverageTenure = () => {
    if (mappedTenures.length === 0) return "0.0 Anos"
    const sum = mappedTenures.reduce((acc, curr) => acc + curr.totalMonths, 0)
    const avgMonths = sum / mappedTenures.length
    const avgYears = avgMonths / 12
    return `${avgYears.toFixed(1)} Anos`
  }

  const veteranInfo = getVeteran()
  const averageTenureInfo = getAverageTenure()
  const totalGiftsCount = mappedTenures.filter(t => t.giftAwarded).length

  // Search filtering
  const filteredTenures = mappedTenures.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header title="TEMPO DE EMPRESA" />

      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">
        {/* Statistics and Milestones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-black">Mais Veterano(a)</p>
                <p className="text-[14px] font-black text-slate-800 mt-2 uppercase leading-none">{veteranInfo.name}</p>
                <p className="text-[10px] font-medium text-slate-500 mt-1.5">{veteranInfo.detail}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                <Award className="w-6 h-6 animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-black">Média de Permanência</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{averageTenureInfo}</p>
                <p className="text-[10px] font-medium text-slate-500 mt-1">Retenção de pessoal acima do mercado</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-black">Premiações Entregues</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{totalGiftsCount}</p>
                <p className="text-[10px] font-medium text-slate-500 mt-1">Medalhas e Kit de Aniversário</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <Gift className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List Card */}
        <Card className="border border-slate-200 overflow-hidden bg-white rounded-2xl shadow-sm">
          <CardContent className="p-0">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full md:max-w-md">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Pesquisar por colaborador..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 w-full"
                />
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto px-6 pb-6 pt-4">
              <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                <thead>
                  <tr className="bg-[#171717] text-white">
                    <th className="w-[280px] px-5 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest rounded-l-xl">
                      Colaborador
                    </th>
                    <th className="w-[130px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">
                      Admissão
                    </th>
                    <th className="w-[180px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">
                      Tempo de Serviço
                    </th>
                    <th className="w-[240px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">
                      Próxima Meta (Aniversário)
                    </th>
                    <th className="w-[240px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest">
                      Kit Aniversário Embalado?
                    </th>
                    <th className="w-[130px] px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest text-center rounded-r-xl">
                      Festejar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-20 bg-slate-50/10 border-none">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="w-8 h-8 border-4 border-[#171717] border-t-transparent rounded-full animate-spin" />
                          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Carregando dados de tempo de casa...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTenures.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-20 bg-slate-50/10 border-none">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Nenhum colaborador ativo encontrado</p>
                          <p className="text-slate-400 text-[9px] font-semibold">Tabela vazia ou sem correspondências.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTenures.map((ten) => (
                      <tr key={ten.id} className="hover:bg-slate-50/20 transition-all font-semibold align-middle whitespace-nowrap text-xs">
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <p className="text-[11px] font-extrabold text-slate-800 uppercase leading-snug">{ten.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{ten.role}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-bold text-[11px]">
                          {ten.joinDate || "Não informada"}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge className="bg-slate-50 border border-slate-200 text-slate-650 text-[9px] font-black uppercase rounded-lg px-2.5 py-0.5">
                            {ten.tenureYears > 0 ? `${ten.tenureYears} ano(s) ` : ""}
                            {ten.tenureMonths > 0 ? `${ten.tenureMonths} mes(es)` : (ten.tenureYears === 0 ? "Recém Chegado(a)" : "")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 font-bold text-[11px]">
                          {ten.nextMilestone}
                        </td>
                        <td className="px-4 py-3.5">
                          <button 
                            onClick={() => handleToggleGift(ten.id, ten.giftAwarded)}
                            className="flex items-center gap-1 bg-transparent hover:opacity-80 outline-none text-left cursor-pointer"
                          >
                            {ten.giftAwarded ? (
                              <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[8px] font-black uppercase flex items-center gap-1">
                                Entregue com Sucesso
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-600 rounded-lg border border-amber-100 text-[8px] font-black uppercase flex items-center gap-1">
                                Aguardando Envio de Aniv
                              </Badge>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Button 
                            onClick={() => handleCelebrate(ten.name)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 rounded-lg px-3 py-1.5 h-8 font-bold text-[9px] uppercase tracking-widest gap-1 shadow-none border-none flex items-center justify-center mx-auto cursor-pointer"
                          >
                            <Heart className="w-3.5 h-3.5 fill-red-600" />
                            Parabenizar
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
