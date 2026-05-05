"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { format } from "date-fns"
import { 
  Search, 
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  UserPlus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProposalDetailsAccordion } from "@/components/propostas/proposal-details-accordion"
import { StatusPropostaModal } from "@/components/propostas/status-proposta-modal"
import { TransferirPropostaModal } from "@/components/propostas/transferir-proposta-modal"
import { toast } from "react-hot-toast"

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
      "COM INCONSISTÊNCIA NO BANCO / AGUARDANDO OPERACIONAL"
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
  updated_at?: string
  created_at: string
}

export default function ProposalsPage() {
  const { perfil, isCorretor, isAdmin, isDeveloper, isOperational } = useAuth()
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

      // Use de data selecionada ou data atual
      const baseDate = customDate ? new Date(`${customDate}T${new Date().toISOString().split('T')[1]}`) : new Date();
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
              .update({ status: newStatus })
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

  const fetchProposals = async () => {
    if (!perfil) return
    setIsLoading(true)
    try {
      let query = supabase.from('propostas').select('*')
      
      if (isCorretor) {
        query = query.eq('corretor_id', perfil.id)
      }
      // Se for operacional, supervisor, administrador ou desenvolvedor, não filtra (vê tudo)

      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) {
        console.error("Erro Supabase ao buscar propostas:", error.message)
        toast.error("Erro ao conectar com o banco de dados. Verifique sua conexão ou configuração do Supabase.")
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
      const err = error as { message?: string }
      if (err?.message === 'Failed to fetch') {
        toast.error("Falha na conexão com o Supabase. Verifique se o seu projeto está ativo ou se a URL está correta.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const stabilizedFetchProposals = useCallback(fetchProposals, [perfil, isCorretor])

  useEffect(() => {
    if (perfil) {
      stabilizedFetchProposals()
    } else {
      setIsLoading(false)
    }
  }, [perfil, stabilizedFetchProposals])

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
    
    return matchesSearch && matchesStatus && matchesSecondary
  })

  // Pagination Logic
  const totalPages = Math.ceil(filteredProposals.length / itemsPerPage)
  const paginatedProposals = filteredProposals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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
    if (selectedSecondaryStatus === status) {
      setSelectedSecondaryStatus(null)
    } else {
      setSelectedSecondaryStatus(status)
    }
    setCurrentPage(1)
  }

  const toggleProposalExpansion = (proposalId: string) => {
    setExpandedProposalId(expandedProposalId === proposalId ? null : proposalId)
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="PROPOSTAS" />
      
      <main className="flex-1 p-4 lg:p-8 bg-slate-50/50 space-y-8 max-w-[1600px] mx-auto w-full">
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
                <Button 
                  onClick={fetchProposals}
                  disabled={isLoading}
                  className="bg-[#171717] hover:bg-[#171717]/90 text-white px-8 h-[38px] text-[12px] font-bold rounded-lg shadow-lg shadow-black/20 transition-all"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "BUSCAR"}
                </Button>
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
                      selectedSecondaryStatus === card.label ? "bg-[#DFF0D8] ring-2 ring-primary ring-offset-2" : (
                        ['AGUARDANDO SOLICITAÇÃO DE DIGITAÇÃO', 'COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO', 'COM INCONSISTÊNCIA NO BANCO', 'PAGAMENTO DEVOLVIDO'].includes(card.label) ? "bg-[#FCF8E3]" :
                        ['AGUARDANDO DIGITAÇÃO OPERACIONAL', 'COM INCONSISTÊNCIA / AGUARDANDO OPERACIONAL', 'COM INCONSISTÊNCIA NO BANCO / AGUARDANDO OPERACIONAL', 'PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA'].includes(card.label) ? "bg-[#D9EDF7]" :
                        ['ANDAMENTO / AGUARDANDO PAGAMENTO', 'PÓS-VENDA REALIZADA'].includes(card.label) ? "bg-[#DFF0D8]" :
                        ['CANCELADO'].includes(card.label) ? "bg-[#F2DEDE]" :
                        "bg-white"
                      )
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
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">ÚLTIMA ALTERAÇÃO</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && proposals.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-slate-400 text-[12px] font-medium">
                      Carregando propostas...
                    </td>
                  </tr>
                ) : paginatedProposals.length > 0 ? (
                  paginatedProposals
                    .filter(p => !expandedProposalId || p.id_lead === expandedProposalId)
                    .map((proposal, index) => (
                      <React.Fragment key={proposal.id}>
                        <tr 
                          onClick={() => toggleProposalExpansion(proposal.id_lead)}
                          className={cn(
                            "hover:bg-slate-50 transition-colors group cursor-pointer relative",
                            expandedProposalId === proposal.id_lead ? "bg-slate-50 border-l-2 border-primary border-b-0" : (index % 2 === 0 ? "bg-slate-100" : "bg-white"),
                            isLoading && "opacity-60 pointer-events-none"
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
                          <td className="px-4 py-4 text-[10px] font-bold text-slate-600">
                            {proposal.updated_at ? (
                              (() => {
                                try {
                                  return format(new Date(proposal.updated_at), "dd/MM/yyyy HH:mm")
                                } catch {
                                  return '-'
                                }
                              })()
                            ) : '-'}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-1">
                              {selectedStatus !== "CANCELADOS" && (isAdmin || isDeveloper || isOperational) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setSelectedProposalForTransfer(proposal)
                                    setIsTransferModalOpen(true)
                                  }}
                                  className="w-8 h-8 bg-amber-500 hover:bg-amber-600 text-white rounded-md p-1 group/btn transition-all"
                                  title="TRANSFERIR RESPONSÁVEL"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </Button>
                              )}
                              {selectedStatus !== "CANCELADOS" && (
                                (!isCorretor || [
                                  'AGUARDANDO SOLICITAÇÃO DE DIGITAÇÃO',
                                  'COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO',
                                  'COM INCONSISTÊNCIA NO BANCO'
                                ].includes(proposal.status)) && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setSelectedProposalForStatus(proposal)
                                      setIsStatusModalOpen(true)
                                    }}
                                    className="w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md p-1 group/btn transition-all"
                                    title="ALTERAR STATUS DA PROPOSTA"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                )
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(event) => {
                                  event.stopPropagation()
                                  toggleProposalExpansion(proposal.id_lead)
                                }}
                                className="w-8 h-8 bg-sky-500 hover:bg-sky-600 text-white rounded-md p-1 group/btn transition-all"
                                title="VISUALIZAR/EDITAR PROPOSTA"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {expandedProposalId === proposal.id_lead && (
                          <tr>
                            <td colSpan={12} className="p-0 border-b border-slate-200">
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
                    ))
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-slate-400 text-[12px] font-medium">
                      Nenhuma proposta encontrada com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && !expandedProposalId && (
            <div className="px-8 py-10 flex flex-col sm:flex-row items-center justify-between border-t border-slate-50 bg-slate-50/30 gap-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredProposals.length)} de {filteredProposals.length} propostas
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20 transition-all disabled:opacity-30"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-lg transition-all text-[10px] font-black tracking-widest",
                        currentPage === page 
                          ? "bg-primary text-white shadow-lg shadow-primary/20 border-primary" 
                          : "border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20"
                      )}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20 transition-all disabled:opacity-30"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
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
