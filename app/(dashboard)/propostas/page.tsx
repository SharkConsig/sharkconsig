"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { format } from "date-fns"
import { useSidebar } from "@/context/sidebar-context"
import { 
  Search, 
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  UserPlus,
  RefreshCw,
  Eraser,
  FileSpreadsheet
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProposalDetailsAccordion } from "@/components/propostas/proposal-details-accordion"
import { StatusPropostaModal } from "@/components/propostas/status-proposta-modal"
import { TransferirPropostaModal } from "@/components/propostas/transferir-proposta-modal"
import { toast } from "react-hot-toast"
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const TABS_CONFIG = [
  {
    label: "DIGITAÇÃO",
    textColor: "text-amber-600",
    subTabs: [
      "AGUARDANDO SOLICITAÇÃO DE DIGITAÇÃO",
      "AGUARDANDO DIGITAÇÃO OPERACIONAL",
      "COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO",
      "COM INCONSISTÊNCIA / AGUARDANDO OPERACIONAL"
    ]
  },
  {
    label: "EM ANDAMENTO",
    textColor: "text-orange-600",
    subTabs: [
      "ANDAMENTO / AGUARDANDO PAGAMENTO",
      "COM INCONSISTÊNCIA NO BANCO",
      "COM INCONSISTÊNCIA NO BANCO / AGUARDANDO OPERACIONAL",
      "PORTABILIDADE"
    ]
  },
  {
    label: "PAGO AO CLIENTE",
    textColor: "text-cyan-600",
    subTabs: [
      "PAGAMENTO DEVOLVIDO",
      "PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA",
      "PÓS-VENDA REALIZADA"
    ]
  },
  {
    label: "CANCELADOS",
    textColor: "text-rose-600",
    subTabs: [
      "CANCELADO"
    ]
  }
]

interface Proposal {
  id: number
  id_lead: string
  corretor_id?: string
  corretor?: string
  equipe?: string
  ade?: string
  nome_corretor?: string
  nome_cliente: string
  cliente_cpf: string
  convenio: string
  banco: string
  tipo_operacao: string
  status: string
  resposta_corretor?: string
  obs_corretor?: string
  obs_operacional?: string
  observacoes?: string
  valor_base?: number
  valor_cliente_operacional?: number
  valor_producao?: number
  valor_operacao?: number
  valor_cliente?: number
  valor_parcela?: number
  prazo?: number | string
  coeficiente?: number | string
  email?: string
  tel_residencial_1?: string
  tel_residencial_2?: string
  tel_comercial?: string
  matricula?: string
  data_nascimento?: string
  naturalidade?: string
  uf_naturalidade?: string
  identidade?: string
  orgao_emissor?: string
  uf_emissao?: string
  data_emissao?: string
  nome_pai?: string
  nome_mae?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
  banco_cliente?: string
  chave_pix?: string
  conta?: string
  agencia?: string
  dv?: string
  tipo_conta?: string
  valor_operacao_operacional?: number
  coeficiente_prazo?: string
  data_consulta?: string
  data_digitacao?: string
  updated_at?: string
  created_at: string
}

export default function ProposalsPage() {
  const { perfil, isCorretor, isAdmin, isDeveloper, isOperational, isSupervisor } = useAuth()
  const { isCollapsed } = useSidebar()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [counts, setCounts] = useState<{[key: string]: number}>({})
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedSecondaryStatus, setSelectedSecondaryStatus] = useState<string | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(null)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [selectedProposalForStatus, setSelectedProposalForStatus] = useState<Proposal | null>(null)
  const [selectedProposalForTransfer, setSelectedProposalForTransfer] = useState<Proposal | null>(null)

  const handleStatusUpdate = async (idLead: string, newStatus: string, ade?: string, obsCorretor?: string, obsOperacional?: string, customDate?: string) => {
    if (!perfil) return
    const loadingToast = toast.loading("Atualizando status...")
    
    try {
      const proposal = proposals.find(p => p.id_lead === idLead)
      if (!proposal) throw new Error("Proposta não encontrada")

      // Use de data selecionada ou data atual, garantindo que não ocorra problemas de timezone
      const baseDate = customDate ? (() => {
        const d = new Date();
        const parts = customDate.split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          d.setFullYear(parts[0]);
          d.setMonth(parts[1] - 1);
          d.setDate(parts[2]);
        }
        return d;
      })() : new Date();
      const isoDate = baseDate.toISOString();

      // Base data that definitely exists
      const baseUpdate = { 
        status: newStatus, 
        updated_at: isoDate 
      }

      // Try with all columns first
      const actualFullUpdate: Record<string, string | number | undefined | null> = { ...baseUpdate }
      if (typeof ade === 'string') actualFullUpdate.ade = ade
      if (typeof obsCorretor === 'string') actualFullUpdate.obs_corretor = obsCorretor
      if (typeof obsOperacional === 'string') actualFullUpdate.obs_operacional = obsOperacional

      // Verificar se é status de pagamento para salvar data_pago_cliente
      if (newStatus.includes("PAGO AO CLIENTE")) {
        actualFullUpdate.data_pago_cliente = isoDate
      }

      // NOVO: Salvar data_digitacao quando a proposta sai de 'AGUARDANDO DIGITAÇÃO OPERACIONAL' e ganha um ADE
      // Só salva se o campo ainda estiver vazio (não pode sofrer alteração posterior)
      if (
        proposal.status === "AGUARDANDO DIGITAÇÃO OPERACIONAL" && 
        newStatus !== "AGUARDANDO DIGITAÇÃO OPERACIONAL" &&
        ade && 
        !proposal.data_digitacao
      ) {
        actualFullUpdate.data_digitacao = isoDate
      }

      let { error: updateError } = await supabase
        .from('propostas')
        .update(actualFullUpdate)
        .eq('id_lead', idLead)

      if (updateError) {
        const errDetails = {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        }
        console.error("Erro na primeira tentativa de atualização:", errDetails)
        
        // Se o erro for de coluna inexistente, tenta o fallback
        if (updateError.code === '42703' || updateError.message?.includes('column')) {
          console.warn("Iniciando fallback: Tentando salvar dados extras no campo 'observacoes'...")
          const currentObs = (proposal as Proposal).observacoes || ""
          
          const cleanObs = currentObs
            .replace(/\[ADE\]:.*?(?:\n\n|\n|$)/g, "")
            .replace(/\[CORRETOR\]:.*?(?:\n\n|\n|$)/g, "")
            .replace(/\[OPERACIONAL\]:.*?(?:\n\n|\n|$)/g, "")
            .trim()
          
          const combinedObs = `${cleanObs}${cleanObs ? "\n\n" : ""}[ADE]: ${ade || ""}\n[CORRETOR]: ${obsCorretor || ""}\n[OPERACIONAL]: ${obsOperacional || ""}`
          
          // Fallback seguro: tenta salvar apenas o que é garantido
          const safeFallbackData = {
            status: newStatus,
            updated_at: isoDate,
            observacoes: combinedObs
          }
          
          const { error: fallbackError } = await supabase
            .from('propostas')
            .update(safeFallbackData)
            .eq('id_lead', idLead)
          
          if (!fallbackError) {
            console.log("Fallback concluído com sucesso!")
            actualFullUpdate.observacoes = combinedObs
            delete actualFullUpdate.ade
            delete actualFullUpdate.obs_corretor
            delete actualFullUpdate.obs_operacional
            updateError = null
          } else {
            console.error("Erro no fallback seguro:", fallbackError)
            
            // Tentativa FINAL de desespero: Salvar APENAS o status
            console.warn("Tentativa de emergência: Salvando apenas o STATUS...")
            const { error: emergencyError } = await supabase
              .from('propostas')
              .update({ status: newStatus, updated_at: isoDate })
              .eq('id_lead', idLead)
            
            if (!emergencyError) {
              console.log("Status salvo via emergência (sem observações)")
              updateError = null
            } else {
              updateError = emergencyError
            }
          }
        }
      }
      
      if (updateError) throw updateError

      // Log de Histórico
      try {
        const histObs = []
        if (ade) histObs.push(`ADE: ${ade}`)
        if (obsCorretor) histObs.push(`Obs Corretor: ${obsCorretor}`)
        if (obsOperacional) histObs.push(`Obs Operacional: ${obsOperacional}`)
        
        // Inserção no histórico - usamos proposta_id_lead como TEXT (REFERENCES propostas(id_lead))
        await supabase.from('historico_propostas').insert({
          proposta_id_lead: proposal.id_lead,
          usuario_id: perfil.id,
          status_anterior: proposal.status,
          status_novo: newStatus,
          observacoes: histObs.join(' | '),
          descricao: `Status alterado de "${proposal.status}" para "${newStatus}"`,
          tipo: 'alteracao_status',
          created_at: isoDate
        })
      } catch (histErr) {
        console.warn("Erro ao gravar histórico (não letal):", histErr)
      }

      // Update local state
      setProposals(prev => prev.map(p => 
        p.id_lead === idLead ? { ...p, ...actualFullUpdate } : p
      ))

      // Update counts
      setCounts(prev => {
        const newCounts = { ...prev }
        if (proposal.status !== newStatus) {
          newCounts[proposal.status] = Math.max(0, (newCounts[proposal.status] || 0) - 1)
          newCounts[newStatus] = (newCounts[newStatus] || 0) + 1
        }
        return newCounts
      })

      toast.success("Status atualizado com sucesso!", { id: loadingToast })
    } catch (error: unknown) {
      console.error("Erro completo capturado:", error)
      let errorMessage = "Erro desconhecido"
      
      if (error && typeof error === 'object' && 'message' in error) {
        const err = error as { message?: string; details?: string; hint?: string; code?: string }
        errorMessage = err.message || err.details || err.hint || err.code || JSON.stringify(err)
        if (errorMessage === '{}') {
          errorMessage = `Código: ${err.code || 'N/A'}, Mensagem: ${err.message || 'N/A'}`
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast.error(`Erro ao atualizar status: ${errorMessage}`, { id: loadingToast, duration: 5000 })
    }
  }

  const handleUpdateConsulta = async (idLead: string) => {
    if (!perfil) return
    const loadingToast = toast.loading("Atualizando data de consulta...")
    
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('propostas')
        .update({ 
          data_consulta: now,
          updated_at: now 
        })
        .eq('id_lead', idLead)

      if (error) throw error

      setProposals(prev => prev.map(p => 
        p.id_lead === idLead ? { ...p, data_consulta: now, updated_at: now } : p
      ))

      toast.success("Data de consulta atualizada!", { id: loadingToast })
    } catch (error: unknown) {
      console.error("Erro ao atualizar consulta:", error)
      toast.error("Erro ao atualizar consulta", { id: loadingToast })
    }
  }

  const fetchProposals = async (isSilent = false) => {
    if (!perfil) return
    if (!isSilent) setIsLoading(true)
    try {
      let query = supabase.from('propostas').select('*')
      
      if (isCorretor) {
        query = query.eq('corretor_id', perfil.id)
      }
      // Se for operacional, supervisor, administrador ou desenvolvedor, não filtra (vê tudo)

      const { data, error } = await query.order('updated_at', { ascending: true })
      
      if (error) {
        console.error("Erro Supabase ao buscar propostas:", error.message)
        if (!isSilent) toast.error("Erro ao conectar com o banco de dados.")
        setIsLoading(false)
        return
      }

      if (!data || data.length === 0) {
        setProposals([])
        setCounts({})
        setIsLoading(false)
        return
      }

      // Fetch users list to map missing names
      interface UserSummary {
        id: string;
        nome: string;
        supervisor_nome?: string;
      }
      
      const usersMap = new Map<string, { nome: string, equipe: string }>()
      try {
        const usersResponse = await fetch("/api/usuarios")
        if (usersResponse.ok) {
          const usersList: UserSummary[] = await usersResponse.json()
          usersList.forEach((u) => {
            usersMap.set(u.id, {
              nome: u.nome || "-",
              equipe: u.supervisor_nome || "-"
            })
          })
        }
      } catch (err) {
        console.warn("Erro ao buscar usuários para mapeamento:", err)
      }

      const formattedData = data.map((p: Proposal) => {
        // Normalizar status para garantir que apareça nas abas corretas (com espaços ao redor da barra)
        let normalizedStatus = p.status
        if (normalizedStatus === "ANDAMENTO/AGUARDANDO PAGAMENTO") {
          normalizedStatus = "ANDAMENTO / AGUARDANDO PAGAMENTO"
        }
        if (normalizedStatus === "COM INCONSISTÊNCIA NO BANCO AGUARDANDO OPERACIONAL" || normalizedStatus === "INCONSISTÊNCIA RESOLVIDA") {
          normalizedStatus = "COM INCONSISTÊNCIA NO BANCO / AGUARDANDO OPERACIONAL"
        }
        
        const userDetails = p.corretor_id ? usersMap.get(p.corretor_id) : null
        
        // Define equipe prioritize stored value, then user metadata, then "-"
        let finalEquipe = p.equipe
        if (!finalEquipe || finalEquipe === "-" || finalEquipe === "Não informado") {
          finalEquipe = userDetails?.equipe || "-"
        }

        return {
          ...p,
          status: normalizedStatus,
          nome_corretor: p.corretor || userDetails?.nome || '-',
          equipe: finalEquipe
        }
      })

      setProposals(formattedData)

      // Calculate counts based on current accessible proposals
      const newCounts: {[key: string]: number} = {}
      formattedData.forEach((p: Proposal) => {
        newCounts[p.status] = (newCounts[p.status] || 0) + 1
      })
      setCounts(newCounts)
    } catch (error: unknown) {
      console.error("Erro geral ao buscar propostas:", error)
      if (!isSilent) toast.error("Falha ao carregar propostas.")
    } finally {
      if (!isSilent) setIsLoading(false)
    }
  }

  const stabilizedFetchProposals = useCallback(fetchProposals, [perfil?.id, isCorretor])

  useEffect(() => {
    if (perfil?.id) {
      stabilizedFetchProposals(proposals.length > 0)
    } else {
      setIsLoading(false)
    }
  }, [perfil?.id, stabilizedFetchProposals])

  useEffect(() => {
    setExpandedProposalId(null)
  }, [selectedStatus, selectedSecondaryStatus])

  const statusCards = TABS_CONFIG.map(tab => {
    const total = (tab.subTabs || []).reduce((acc, sub) => acc + (counts[sub] || 0), 0)
    return {
      ...tab,
      count: total
    }
  })

  const selectedTabObj = TABS_CONFIG.find(t => t.label === selectedStatus)
  const secondaryCards = selectedTabObj ? selectedTabObj.subTabs.map(sub => ({
    label: sub,
    count: counts[sub] || 0
  })) : []

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredProposals = proposals.filter((proposal: Proposal) => {
    const cleanSearch = searchTerm.toLowerCase().replace(/\D/g, "")
    const cleanCpf = (proposal.cliente_cpf || "").replace(/\D/g, "")

    const matchesSearch = 
      (proposal.id_lead?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (proposal.ade?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (proposal.nome_cliente?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (proposal.cliente_cpf?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (cleanSearch !== "" && cleanCpf.includes(cleanSearch))
    
    const matchesStatus = !selectedStatus || 
      TABS_CONFIG.find(t => t.label === selectedStatus)?.subTabs.includes(proposal.status)
    const matchesSecondary = !selectedSecondaryStatus || proposal.status === selectedSecondaryStatus

    const matchesDate = (() => {
      if (!startDate && !endDate) return true;
      
      try {
        // Obter a data da proposta em formato YYYY-MM-DD (local) para comparação simples
        const pDate = new Date(proposal.created_at);
        if (isNaN(pDate.getTime())) return true;
        
        const proposalDateStr = format(pDate, "yyyy-MM-dd");
        
        if (startDate && proposalDateStr < startDate) return false;
        if (endDate && proposalDateStr > endDate) return false;
      } catch (err) {
        console.error("Erro ao validar data da proposta:", err);
        return true;
      }
      
      return true;
    })();
    
    return matchesSearch && matchesStatus && matchesSecondary && matchesDate
  }).sort((a, b) => {
    const timeA = new Date(a.updated_at || a.created_at).getTime()
    const timeB = new Date(b.updated_at || b.created_at).getTime()
    
    // Ordem inversa (mais recentes primeiro) para PAGO AO CLIENTE e CANCELADOS
    if (selectedStatus === "PAGO AO CLIENTE" || selectedStatus === "CANCELADOS") {
      return timeB - timeA
    }
    
    // Ordem padrão (mais antigos primeiro) para CONTRATOS (Digitação) e EM ANDAMENTO
    return timeA - timeB
  })

  // Pagination Logic
  const totalPages = Math.ceil(filteredProposals.length / itemsPerPage)
  const paginatedProposals = filteredProposals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleClearFilters = () => {
    setSearchTerm("")
    setStartDate("")
    setEndDate("")
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleParentClick = (status: string) => {
    if (selectedStatus === status) {
      setSelectedStatus(null)
    } else {
      setSelectedStatus(status)
    }
    setSelectedSecondaryStatus(null)
    setCurrentPage(1)
  }

  const handleSecondaryClick = (status: string) => {
    setSelectedSecondaryStatus(status)
    setCurrentPage(1)
  }

  const toggleProposalExpansion = (proposalId: string) => {
    setExpandedProposalId(expandedProposalId === proposalId ? null : proposalId)
  }

  const exportToExcel = async () => {
    if (filteredProposals.length === 0) {
      toast.error("Não há dados para exportar.")
      return
    }

    const loadingToast = toast.loading("Gerando arquivo Excel...")

    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Propostas')

      // Define columns
      worksheet.columns = [
        { header: 'ID LEAD', key: 'id_lead', width: 15 },
        { header: 'ADE', key: 'ade', width: 15 },
        { header: 'CORRETOR', key: 'corretor', width: 30 },
        { header: 'EQUIPE', key: 'equipe', width: 25 },
        { header: 'CPF CLIENTE', key: 'cpf', width: 20 },
        { header: 'NOME CLIENTE', key: 'cliente', width: 35 },
        { header: 'BANCO', key: 'banco', width: 15 },
        { header: 'CONVÊNIO', key: 'convenio', width: 20 },
        { header: 'TIPO OPERAÇÃO', key: 'tipo', width: 20 },
        { header: 'STATUS', key: 'status', width: 40 },
        { header: 'VALOR OPERAÇÃO', key: 'valor', width: 20 },
        { header: 'DATA CRIAÇÃO', key: 'criado', width: 20 },
        { header: 'ÚLTIMA ATUALIZAÇÃO', key: 'atualizado', width: 20 },
      ]

      // Add rows
      filteredProposals.forEach(p => {
        worksheet.addRow({
          id_lead: p.id_lead,
          ade: p.ade || '-',
          corretor: p.nome_corretor || '-',
          equipe: p.equipe || '-',
          cpf: p.cliente_cpf,
          cliente: p.nome_cliente,
          banco: p.banco,
          convenio: p.convenio,
          tipo: p.tipo_operacao,
          status: p.status,
          valor: (p.valor_operacao || p.valor_cliente || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          criado: format(new Date(p.created_at), "dd/MM/yyyy HH:mm:ss"),
          atualizado: p.updated_at ? format(new Date(p.updated_at), "dd/MM/yyyy HH:mm:ss") : '-',
        })
      })

      // Stylize header
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1C2643' }
      }
      
      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `SharkConsig_Propostas_${format(new Date(), "ddMMyyyy_HHmm")}.xlsx`)
      toast.success("Exportação Excel concluída!", { id: loadingToast })
    } catch (error) {
      console.error("Erro ao exportar Excel:", error)
      toast.error("Erro ao exportar arquivo Excel.", { id: loadingToast })
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="PROPOSTAS" />
      
      <main className={cn(
        "flex-1 p-4 lg:p-8 bg-slate-50/50 space-y-8 mx-auto w-full transition-all duration-300",
        isCollapsed ? "max-w-full lg:px-10" : "max-w-[1600px]"
      )}>
        {/* Filters Card */}
        <Card className="card-shadow border border-slate-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Buscar Proposta</label>
                <Input 
                  placeholder="ID, ADE, Nome do Cliente ou CPF..." 
                  className="h-[38px] bg-slate-50/50 border-slate-100 text-[12px]"
                  icon={<Search className="w-4 h-4 text-slate-400" />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Período</label>
                  <div className="flex items-center gap-2">
                    {/* Data Inicial */}
                    <div className="relative">
                      <Input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-[38px] w-[140px] px-3 bg-slate-50/50 border-slate-100 text-[11px] font-normal text-slate-600 focus-visible:ring-0 appearance-none rounded-lg"
                      />
                    </div>

                    <span className="text-slate-300 text-[10px] font-bold scale-x-75">A</span>

                    {/* Data Final */}
                    <div className="relative">
                      <Input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-[38px] w-[140px] px-3 bg-slate-50/50 border-slate-100 text-[11px] font-normal text-slate-600 focus-visible:ring-0 appearance-none rounded-lg"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleClearFilters}
                    className="border-slate-200 text-slate-500 h-[38px] text-[11px] font-bold rounded-lg transition-all px-4 gap-2 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    LIMPAR
                  </Button>
                  <Button 
                    onClick={fetchProposals}
                    disabled={isLoading}
                    className="bg-[#171717] hover:bg-[#171717]/90 text-white px-8 h-[38px] text-[12px] font-bold rounded-lg shadow-lg shadow-black/20 transition-all"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "BUSCAR"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Section with Grouping */}
        <div className="space-y-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {statusCards.map((card) => (
              <div 
                key={card.label} 
                className="relative group cursor-pointer"
                onClick={() => handleParentClick(card.label)}
              >
                {selectedStatus === card.label && (
                  <div className={cn(
                    "absolute -left-4 -right-4 -top-4 -bottom-10 rounded-t-3xl z-0 hidden lg:block transition-colors bg-slate-100"
                  )} />
                )}
                <Card className={cn(
                  "card-shadow border border-slate-200 h-full relative z-10 transition-all hover:scale-[1.02]", 
                  selectedStatus === card.label ? "bg-[#DFF0D8] ring-2 ring-primary ring-offset-2 shadow-xl shadow-primary/10" : "bg-white"
                )}>
                  <CardContent className="p-5">
                    <p className="text-[9px] font-bold text-[#171717] uppercase mb-4 h-8 leading-tight tracking-widest">{card.label}</p>
                    <div className="flex items-center gap-2">
                      <div className="bg-[#1e293b] px-2 py-0.5 rounded text-[10px] font-bold text-white min-w-[20px] flex justify-center shadow-sm">
                        {card.count}
                      </div>
                      <span className="text-[9px] font-bold text-[#171717] uppercase tracking-widest leading-none">Contrato(s)</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {selectedStatus && secondaryCards.length > 0 && (
            <div className={cn(
              "rounded-3xl p-6 mt-6 relative z-0 border border-slate-200/50 shadow-inner transition-colors -mx-4 bg-slate-100"
            )}>
              <div className="flex overflow-x-auto gap-4 pb-2 custom-scrollbar lg:grid lg:grid-cols-4 lg:overflow-x-visible">
                {secondaryCards.map((card) => (
                  <Card 
                    key={card.label} 
                    className={cn(
                      "card-shadow border border-slate-200 min-w-[160px] lg:min-w-0 cursor-pointer transition-all hover:scale-[1.02]",
                      selectedSecondaryStatus === card.label && "ring-2 ring-primary ring-offset-2",
                      ['AGUARDANDO SOLICITAÇÃO DE DIGITAÇÃO', 'COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO', 'COM INCONSISTÊNCIA NO BANCO', 'PAGAMENTO DEVOLVIDO'].includes(card.label) ? "bg-[#FCF8E3]" :
                      ['AGUARDANDO DIGITAÇÃO OPERACIONAL', 'COM INCONSISTÊNCIA / AGUARDANDO OPERACIONAL', 'COM INCONSISTÊNCIA NO BANCO / AGUARDANDO OPERACIONAL', 'PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA'].includes(card.label) ? "bg-[#D9EDF7]" :
                      ['ANDAMENTO / AGUARDANDO PAGAMENTO', 'PÓS-VENDA REALIZADA'].includes(card.label) ? "bg-[#DFF0D8]" :
                      ['CANCELADO'].includes(card.label) ? "bg-[#F2DEDE]" :
                      "bg-white"
                    )}
                    onClick={() => handleSecondaryClick(card.label)}
                  >
                    <CardContent className="p-4">
                      <p className="text-[8.5px] font-bold text-[#171717] uppercase mb-3 h-7 leading-tight tracking-wider">{card.label}</p>
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-700 px-2 py-0.5 rounded text-[10px] font-normal text-white">
                          {card.count}
                        </div>
                        <span className="text-[8px] font-bold text-[#171717] uppercase tracking-widest">Contrato(s)</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Export Button Row - Only for Operacional and Admin */}
        {(isAdmin || isOperational) && (
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="h-10 px-6 bg-white border-primary/20 text-primary hover:bg-primary/5 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-sm cursor-pointer border-2 min-w-[200px]"
            >
              <FileSpreadsheet className="w-5 h-5" />
              EXPORTAR EXCEL
            </Button>
          </div>
        )}

        {/* Table */}
        <Card className="card-shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">ID</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">ADE</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">CORRETOR</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">SUPERVISOR (EQUIPE)</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">CPF</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">CLIENTE</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">BANCO/CONVÊNIO</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">OPERAÇÃO</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">STATUS</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">VALOR OPERAÇÃO</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">OBSERVAÇÃO</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">ÚLTIMA ATUALIZAÇÃO</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && proposals.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-slate-400 text-[12px] font-medium">
                      Carregando propostas...
                    </td>
                  </tr>
                ) : paginatedProposals.length > 0 ? (
                  paginatedProposals
                    .filter(p => !expandedProposalId || p.id_lead === expandedProposalId)
                    .map((proposal, index) => {
                      return (
                        <React.Fragment key={proposal.id}>
                          <tr 
                            onClick={() => {
                              toggleProposalExpansion(proposal.id_lead);
                            }}
                            className={cn(
                              "hover:bg-slate-50 transition-colors group cursor-pointer relative",
                              expandedProposalId === proposal.id_lead ? "bg-slate-50 border-l-2 border-primary border-b-0" : (index % 2 === 0 ? "bg-slate-100" : "bg-white"),
                              isLoading && expandedProposalId !== proposal.id_lead && "opacity-80",
                              isLoading && "pointer-events-none"
                            )}
                          >
                            <td className="px-4 py-4 text-[11px] font-bold text-slate-400 group-hover:text-primary">
                              {proposal.id_lead}
                              {isLoading && index === 0 && (
                              <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 overflow-hidden">
                                <div className="h-full bg-primary animate-progress w-full origin-left" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-[11px] font-medium text-slate-500">{proposal.ade || '-'}</td>
                          <td className="px-4 py-4 text-[11px] font-bold text-slate-600 uppercase bg-blue-50/20">{proposal.nome_corretor || '-'}</td>
                          <td className="px-4 py-4 text-[11px] font-bold text-slate-600 uppercase bg-indigo-50/20">{proposal.equipe || '-'}</td>
                          <td className="px-4 py-4 text-[11px] font-medium text-slate-500">{proposal.cliente_cpf}</td>
                          <td className="px-4 py-4 text-[11px] font-bold text-slate-700 uppercase tracking-tight">{proposal.nome_cliente}</td>
                          <td className="px-4 py-4 text-[11px] font-bold text-slate-500">{proposal.banco}/{proposal.convenio}</td>
                          <td className="px-4 py-4 text-[11px] font-bold text-slate-500">{proposal.tipo_operacao}</td>
                          <td className="px-4 py-4">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                              {proposal.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-[11px] font-bold text-slate-700 text-right">
                            R$ {(proposal.valor_operacao || proposal.valor_cliente || proposal.valor_cliente_operacional || proposal.valor_base || proposal.valor_parcela || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-4 text-[11px] text-slate-500 max-w-[250px] whitespace-pre-wrap break-words">
                            {(() => {
                              const isAuthorized = isAdmin || isDeveloper || isOperational;
                              let obsCorr = proposal.obs_corretor || "";
                              let obsOper = proposal.obs_operacional || "";

                              // Fallback extraction if columns are empty but combined field exists
                              if (!obsCorr && !obsOper && proposal.observacoes) {
                                const obs = proposal.observacoes;
                                const corretorMatch = obs.match(/\[CORRETOR\]: ([\s\S]*?)(?=\n\[OPERACIONAL\]|$)/);
                                const operacionalMatch = obs.match(/\[OPERACIONAL\]: ([\s\S]*?)$/);
                                if (corretorMatch) obsCorr = corretorMatch[1].trim();
                                if (operacionalMatch) obsOper = operacionalMatch[1].trim();
                              }

                              if (isAuthorized) {
                                if (obsCorr && obsOper) return `${obsCorr} | ${obsOper}`;
                                return obsOper || obsCorr || "-";
                              }
                              return obsCorr || "-";
                            })()}
                          </td>
                          <td className="px-4 py-4 text-[10px] font-bold text-slate-600">
                            {proposal.updated_at || proposal.created_at ? (
                              (() => {
                                try {
                                  return format(new Date(proposal.updated_at || proposal.created_at), "dd/MM/yyyy HH:mm")
                                } catch {
                                  return '-'
                                }
                              })()
                            ) : '-'}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleUpdateConsulta(proposal.id_lead)
                                }}
                                className="w-[28px] h-[28px] bg-slate-500 hover:bg-slate-600 text-white rounded-lg p-1.5 group/btn transition-all shadow-sm hover:shadow-md active:scale-95"
                                title="ATUALIZAR DATA DE CONSULTA"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                              {(isAdmin || isDeveloper || (selectedStatus !== "CANCELADOS" && (
                                (!(isCorretor || isSupervisor) && isOperational) || [
                                  'AGUARDANDO SOLICITAÇÃO DE DIGITAÇÃO',
                                  'COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO',
                                  'COM INCONSISTÊNCIA NO BANCO',
                                  'PAGAMENTO DEVOLVIDO'
                                ].includes(proposal.status)
                              ))) && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setSelectedProposalForStatus(proposal)
                                      setIsStatusModalOpen(true)
                                    }}
                                    className="w-[28px] h-[28px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg p-1.5 group/btn transition-all shadow-sm hover:shadow-md active:scale-95"
                                    title="ALTERAR STATUS DA PROPOSTA"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </Button>
                                )
                              }
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(event) => {
                                  event.stopPropagation()
                                  toggleProposalExpansion(proposal.id_lead)
                                }}
                                className="w-[26px] h-[26px] bg-sky-500 hover:bg-sky-600 text-white rounded-md p-1 group/btn transition-all"
                                title="VISUALIZAR/EDITAR PROPOSTA"
                              >
                                <Eye className="w-[13px] h-[13px]" />
                              </Button>
                              {selectedStatus !== "CANCELADOS" && (isAdmin || isDeveloper || isOperational) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setSelectedProposalForTransfer(proposal)
                                    setIsTransferModalOpen(true)
                                  }}
                                  className="w-[28px] h-[28px] bg-amber-500 hover:bg-amber-600 text-white rounded-lg p-1.5 group/btn transition-all shadow-sm hover:shadow-md active:scale-95"
                                  title="TRANSFERIR RESPONSÁVEL"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedProposalId === proposal.id_lead && (
                          <tr>
                            <td colSpan={13} className="p-0 border-b border-slate-200">
                              <div className="animate-in slide-in-from-top-2 duration-300">
                                <ProposalDetailsAccordion 
                                  proposal={proposal} 
                                  onRefresh={fetchProposals}
                                />
                                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
                                  <Button 
                                    variant="outline"
                                    onClick={() => setExpandedProposalId(null)}
                                    className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
                                  >
                                    Fechar e Voltar para a Lista
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )})
                ) : (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-slate-400 text-[12px] font-medium">
                      Nenhuma proposta encontrada com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && !expandedProposalId && (
            <div className="px-6 py-8 flex flex-col md:flex-row items-center justify-between border-t border-slate-100 bg-slate-50/20 gap-6">
              <div className="flex flex-col items-center md:items-start">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  RESULTADOS DA BUSCA
                </p>
                <p className="text-[11px] font-bold text-[#1C2643] uppercase">
                  Mostrando <span className="text-primary">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="text-primary">{Math.min(currentPage * itemsPerPage, filteredProposals.length)}</span> de <span className="text-primary">{filteredProposals.length}</span> propostas
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 rounded-xl border-slate-200 text-[#1C2643] hover:bg-white hover:border-primary hover:text-primary transition-all disabled:opacity-30 font-bold text-[10px] uppercase cursor-pointer"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
                
                <div className="hidden sm:flex items-center gap-2">
                  {(() => {
                    const pages = [];
                    const maxVisible = 5;
                    let startPage = Math.max(1, currentPage - 2);
                    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
                    
                    if (endPage - startPage < maxVisible - 1) {
                      startPage = Math.max(1, endPage - maxVisible + 1);
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="icon"
                          className={cn(
                            "h-10 w-10 rounded-xl transition-all text-[11px] font-black tracking-widest cursor-pointer",
                            currentPage === i 
                              ? "bg-primary text-white shadow-xl shadow-primary/30 border-primary" 
                              : "bg-white border-slate-200 text-slate-400 hover:text-primary hover:border-primary/40"
                          )}
                          onClick={() => handlePageChange(i)}
                        >
                          {i}
                        </Button>
                      );
                    }
                    
                    // Add ellipses for many pages
                    if (startPage > 1) {
                       pages.unshift(<span key="start-dots" className="text-slate-300 font-bold px-1">...</span>);
                       pages.unshift(
                         <Button
                            key={1}
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-xl bg-white border-slate-200 text-slate-400 hover:text-primary transition-all text-[11px] font-black cursor-pointer"
                            onClick={() => handlePageChange(1)}
                          >
                            1
                          </Button>
                       );
                    }
                    
                    if (endPage < totalPages) {
                      pages.push(<span key="end-dots" className="text-slate-300 font-bold px-1">...</span>);
                      pages.push(
                        <Button
                           key={totalPages}
                           variant="outline"
                           size="icon"
                           className="h-10 w-10 rounded-xl bg-white border-slate-200 text-slate-400 hover:text-primary transition-all text-[11px] font-black cursor-pointer"
                           onClick={() => handlePageChange(totalPages)}
                         >
                           {totalPages}
                         </Button>
                      );
                    }

                    return pages;
                  })()}
                </div>

                <div className="flex sm:hidden items-center bg-white border border-slate-200 rounded-xl px-4 h-10">
                  <span className="text-[11px] font-black text-primary">{currentPage}</span>
                  <span className="mx-2 text-slate-300">/</span>
                  <span className="text-[11px] font-bold text-slate-500">{totalPages}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 rounded-xl border-slate-200 text-[#1C2643] hover:bg-white hover:border-primary hover:text-primary transition-all disabled:opacity-30 font-bold text-[10px] uppercase cursor-pointer"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>

      <StatusPropostaModal 
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        proposal={selectedProposalForStatus}
        onStatusUpdate={handleStatusUpdate}
      />

      <TransferirPropostaModal 
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        proposal={selectedProposalForTransfer}
        onTransferComplete={fetchProposals}
      />
    </div>
  )
}
