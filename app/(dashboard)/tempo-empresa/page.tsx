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
  Heart,
  PartyPopper,
  Sparkles,
  CheckCircle2,
  X,
  Send,
  MessageSquare,
  Check,
  Zap,
  Calendar
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import confetti from "canvas-confetti"
import { RHMessagingModal } from "@/components/rh/rh-messaging-modal"

interface EmployeeTenure {
  id: string
  usuarioId?: string | null
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
  usuario_id?: string | null
  usuarioId?: string | null
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

  // Modal State for Central de Reconhecimento RH
  const [isRHMessagingOpen, setIsRHMessagingOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<EmployeeTenure | null>(null)
  const [customMessage, setCustomMessage] = useState("")
  const [markKitDelivered, setMarkKitDelivered] = useState(true)
  const [displayOnDashboard, setDisplayOnDashboard] = useState(true)
  const [displayDurationDays, setDisplayDurationDays] = useState<number>(3)
  const [triggerConfettiEffect, setTriggerConfettiEffect] = useState(true)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

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

  const handleOpenCelebrateModal = (emp: EmployeeTenure) => {
    setSelectedEmp(emp)
    const firstName = emp.name.split(" ")[0]
    
    // Suggest intelligent message based on tenure
    let suggestedMsg = ""
    if (emp.tenureYears >= 1) {
      suggestedMsg = `🎉 ${emp.tenureYears} ano${emp.tenureYears > 1 ? 's' : ''} de dedicação, metas superadas e história no SharkConsig! Parabéns pela jornada, ${firstName}!`
    } else if (emp.tenureMonths >= 1) {
      suggestedMsg = `🎉 Parabéns pelo seu tempo de ${emp.tenureMonths} mês(es) no SharkConsig, ${firstName}! É muito bom ter sua energia no time!`
    } else {
      suggestedMsg = `🎉 Parabéns pelo seu primeiro mês no SharkConsig, ${firstName}! É muito bom ter sua energia no time!`
    }

    setCustomMessage(suggestedMsg)
    setMarkKitDelivered(!emp.giftAwarded)
    setDisplayOnDashboard(true)
    setDisplayDurationDays(3)
    setTriggerConfettiEffect(true)
    setIsModalOpen(true)
  }

  const handleConfirmCelebration = () => {
    if (!selectedEmp) return

    // 1. Confetti effect on RH screen
    if (triggerConfettiEffect) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 }
        })
      } catch (e) {
        console.error("Confetti trigger failed:", e)
      }
    }

    // 2. Mark Kit Aniversario Embalado? as Entregue/Enviado
    if (markKitDelivered) {
      if (!giftAwardedIds.includes(selectedEmp.id)) {
        const updatedIds = [...giftAwardedIds, selectedEmp.id]
        setGiftAwardedIds(updatedIds)
        localStorage.setItem("shark_hr_gifts_awarded_ids", JSON.stringify(updatedIds))
      }
    }

    // 3. Save celebration to localStorage (and trigger events for Dashboard)
    if (displayOnDashboard) {
      try {
        const stored = localStorage.getItem("shark_hr_celebrations")
        let celebrations = stored ? JSON.parse(stored) : []
        
        const now = new Date()
        let expiresAt: string | null = null
        if (displayDurationDays && displayDurationDays > 0) {
          const expDate = new Date(now.getTime() + displayDurationDays * 24 * 60 * 60 * 1000)
          expiresAt = expDate.toISOString()
        }

        const newCelebration = {
          id: "cel_" + Date.now(),
          collaboratorId: selectedEmp.id,
          usuarioId: selectedEmp.usuarioId || "",
          name: selectedEmp.name,
          message: customMessage,
          kitDelivered: markKitDelivered,
          createdAt: now.toISOString(),
          displayDurationDays,
          expiresAt,
          active: true
        }

        // Replace any existing active celebration for this collaborator or prepend
        celebrations = celebrations.filter((c: any) => c.collaboratorId !== selectedEmp.id && c.name !== selectedEmp.name)
        celebrations.unshift(newCelebration)

        localStorage.setItem("shark_hr_celebrations", JSON.stringify(celebrations))
        window.dispatchEvent(new Event("storage"))
        window.dispatchEvent(new CustomEvent("shark_hr_celebration_updated", { detail: selectedEmp.name }))
      } catch (e) {
        console.error("Error saving celebration:", e)
      }
    }

    setIsModalOpen(false)
    setSuccessBanner(`🎉 Reconhecimento enviado com sucesso para ${selectedEmp.name}! O painel e o kit foram atualizados.`)
    setTimeout(() => {
      setSuccessBanner(null)
    }, 5000)
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
      usuarioId: item.usuario_id || item.usuarioId || "",
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
                            onClick={() => handleOpenCelebrateModal(ten)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 rounded-lg px-3 py-1.5 h-8 font-bold text-[9px] uppercase tracking-widest gap-1.5 shadow-none border border-red-100 flex items-center justify-center mx-auto cursor-pointer transition-all active:scale-95"
                          >
                            <Heart className="w-3.5 h-3.5 fill-red-600 animate-pulse" />
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

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-emerald-500/50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 max-w-md">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <div className="space-y-0.5 text-xs">
            <p className="font-extrabold text-white">Reconhecimento Registrado!</p>
            <p className="text-slate-300 text-[11px] leading-relaxed font-medium">{successBanner}</p>
          </div>
        </div>
      )}

      {/* Central de Reconhecimento RH Modal */}
      {isModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col space-y-0 relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white relative">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 px-2.5 py-0.5">
                  <PartyPopper className="w-3.5 h-3.5 text-amber-400" />
                  Central de Reconhecimento RH
                </Badge>
              </div>

              <h3 className="text-xl font-black text-white leading-tight">
                Parabenizar Colaborador
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-medium">
                Envie mensagens personalizadas, destaque a conquista no painel e gerencie os kits de comemoração.
              </p>

              {/* Employee Summary Card in Header */}
              <div className="mt-4 bg-white/10 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shrink-0 shadow-sm">
                    {selectedEmp.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white truncate uppercase">{selectedEmp.name}</p>
                    <p className="text-[10px] text-slate-300 font-semibold truncate">{selectedEmp.role}</p>
                  </div>
                </div>

                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold uppercase shrink-0 px-2.5 py-1">
                  {selectedEmp.tenureYears > 0 ? `${selectedEmp.tenureYears} Anos` : `${selectedEmp.tenureMonths} Meses`} de Casa
                </Badge>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              {/* Option 1: Mensagem Automática Inteligente */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    1. Mensagem de Reconhecimento
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">Personalizável</span>
                </div>
                
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Digite a mensagem de parabéns..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />

                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  <span className="text-[10px] font-bold text-slate-500 mr-1">Sugestões rápidas:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const fn = selectedEmp.name.split(" ")[0]
                      setCustomMessage(`🎉 Parabéns pelo seu tempo de dedicação no SharkConsig, ${fn}! É um orgulho ter você conosco!`)
                    }}
                    className="text-[10px] font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                  >
                    1. Orgulho do Time
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fn = selectedEmp.name.split(" ")[0]
                      setCustomMessage(`🏆 ${selectedEmp.tenureYears > 0 ? `${selectedEmp.tenureYears} ano(s)` : 'Meses'} de metas batidas e inspiração para todos nós, ${fn}! Parabéns!`)
                    }}
                    className="text-[10px] font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                  >
                    2. Foco em Metas
                  </button>
                </div>
              </div>

              {/* Option 2 & 3: Engagement Toggles & Logística */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  2. Ações de Engajamento e Logística RH
                </label>

                <div className="space-y-2.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  
                  {/* Dashboard Display Toggle */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={displayOnDashboard}
                      onChange={(e) => setDisplayOnDashboard(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        Mural de Conquistas: Exibir Mensagem de Destaque no Dashboard do Colaborador
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Substitui a frase padrão do topo do painel do colaborador durante o período selecionado.
                      </p>
                    </div>
                  </label>

                  {/* Duration Selector */}
                  {displayOnDashboard && (
                    <div className="ml-7 pt-2 pb-1 space-y-1.5 animate-in fade-in duration-200 border-t border-slate-200/50">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        Período de Exibição no Dashboard:
                      </label>
                      <select
                        value={displayDurationDays}
                        onChange={(e) => setDisplayDurationDays(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs outline-none"
                      >
                        <option value={1}>1 Dia (24 horas)</option>
                        <option value={3}>3 Dias (Padrão)</option>
                        <option value={7}>7 Dias (1 Semana)</option>
                        <option value={15}>15 Dias</option>
                        <option value={30}>30 Dias (1 Mês)</option>
                        <option value={0}>Sem expiração (Permanente)</option>
                      </select>
                      <p className="text-[10px] text-slate-400 font-medium italic">
                        Após o período definido, a mensagem original do topo do Dashboard voltará a ser exibida automaticamente.
                      </p>
                    </div>
                  )}

                  {/* Confetti Effect Toggle */}
                  <label className="flex items-start gap-3 cursor-pointer group pt-1">
                    <input
                      type="checkbox"
                      checked={triggerConfettiEffect}
                      onChange={(e) => setTriggerConfettiEffect(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        Disparar efeito de Confetti 🎊 na confirmação
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Animação comemorativa em tela para marcar o momento.
                      </p>
                    </div>
                  </label>

                  {/* Kit Aniversario Toggle */}
                  <label className="flex items-start gap-3 cursor-pointer group pt-1 border-t border-slate-200/60">
                    <input
                      type="checkbox"
                      checked={markKitDelivered}
                      onChange={(e) => setMarkKitDelivered(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-emerald-600" />
                        Marcar Kit Aniversário como &quot;Entregue/Enviado&quot;
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Atualiza automaticamente a coluna na tabela de amarelo (Aguardando) para verde (Entregue).
                      </p>
                    </div>
                  </label>

                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-4 py-2 h-10 rounded-xl"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={handleConfirmCelebration}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2 h-10 rounded-xl gap-2 shadow-sm transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                Confirmar e Disparar Reconhecimento
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
