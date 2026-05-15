"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { 
  Search, 
  Plus, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  Loader2,
  Info,
  Download,
  Eye,
  Trash2,
  ChevronDown,
  Edit2,
  Check,
  X,
  Share2
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import { ORGAOS_MAPPING } from "@/lib/orgaos-mapping"
import { supabase } from "@/lib/supabase"
import { CONTRATOS_TIPO_MAPPING } from "@/lib/contratos-mapping"

import { useAuth } from "@/context/auth-context"

interface CampaignFilters {
  orgaos: string[];
  situacoes: string[];
  regimes: string[];
  ufs: string[];
  margemMin: string;
  margemMax: string;
  saldoMin: string;
  saldoMax: string;
  cardMargemMin: string;
  cardBeneficioMin: string;
  loanBanks: string[];
  loanPrazoMin: string;
  loanPrazoMax: string;
  cardBanks: string[];
  cardTypes: string[];
  idadeMin: string;
  idadeMax: string;
  distribuicao?: string[];
  corretores_selecionados?: string[];
}

interface Campaign {
  id: string;
  nome: string;
  created_at: string;
  publico_estimado: number;
  filtros: CampaignFilters;
}

function FilterAccordion({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200 hover:border-slate-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{title}</h4>
          {count !== undefined && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
              {count}
            </span>
          )}
        </div>
        <ChevronDown 
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform duration-300",
            isOpen ? "rotate-180 text-primary" : ""
          )} 
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-4 pb-4 border-t border-slate-50/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface User {
  id: string;
  nome: string;
  equipe: string;
  funcao: string;
  supervisor_id?: string;
  avatar_url?: string;
}

export default function CampaignsPage() {
  const { canAccessAdminAreas, isLoading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCampaignForFilters, setSelectedCampaignForFilters] = useState<Campaign | null>(null)
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Distribution State
  const [showDistributionModal, setShowDistributionModal] = useState(false)
  const [campaignToDistribute, setCampaignToDistribute] = useState<Campaign | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([])
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([])
  const [distributionStep, setDistributionStep] = useState<1 | 2>(1)
  const [isSavingDistribution, setIsSavingDistribution] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('campanhas')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setCampaigns(data || [])
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Ocorreu um erro ao carregar as campanhas.";
      console.error("Erro ao buscar campanhas:", err)
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && canAccessAdminAreas) {
      fetchCampaigns()
    }
  }, [authLoading, canAccessAdminAreas, fetchCampaigns])

  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [exportProgress, setExportProgress] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsExporting(null)
      setExportProgress(0)
      alert("Exportação cancelada pelo usuário.")
    }
  }

  const withRetry = async <T,>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await fn();
        if ((result as { error?: unknown })?.error) throw (result as { error?: unknown }).error;
        return result;
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        const isTimeout = error?.code === '57014' || error?.code === 'P0001' || (error?.message && (error.message.includes('timeout') || error.message.includes('abort')));
        if (isTimeout && i < maxRetries - 1) {
          console.warn(`Timeout detectado na exportação, tentando novamente (${i + 1}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, delay * (i + 1)));
          continue;
        }
        throw err;
      }
    }
    throw new Error("Máximo de tentativas excedido");
  };

  const parseSafeNumber = (val: string) => {
    if (!val) return null;
    let clean = val.replace(/[R$\s]/g, "");
    
    // Se houver vírgula e ponto, assumimos padrão BR (ponto milhar, vírgula decimal): 1.000,00 -> 1000.00
    if (clean.includes(",") && clean.includes(".")) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } 
    // Se houver apenas vírgula: 1000,00 -> 1000.00
    else if (clean.includes(",")) {
      clean = clean.replace(",", ".");
    }
    
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  };

  const PART_SIZE = 50000;

  const handleExport = async (campaign: Campaign, partIndex: number = 0) => {
    if (isExporting) return
    setIsExporting(`${campaign.id}_${partIndex}`)
    setExportProgress(0)
    
    abortControllerRef.current = new AbortController()
    
    try {
      const filters = campaign.filtros
      const allCsvRows: string[] = []
      const uniqueRowsKeys = new Set()
      
      const headers = [
        "CPF", "NOME", "DATA NASCIMENTO", "TELEFONE 1", "TELEFONE 2", "TELEFONE 3", 
        "MATRÍCULA", "ÓRGÃO", "SITUAÇÃO FUNCIONAL", "SALÁRIO", "INSTITUIDOR", 
        "REGIME JURÍDICO", "UF", "SALDO 70%", "MARGEM 35%", "BRUTA 5%", 
        "UTILIZADA 5%", "LÍQUIDA 5%", "BENEFÍCIO BRUTA 5%", "BENEFÍCIO UTILIZADA 5%", 
        "BENEFÍCIO LÍQUIDA 5%", "BANCO", "PRAZO", "TIPO"
      ].map(h => `"${h}"`).join(",")
      
      allCsvRows.push(headers)
      
      const pageSize = 100 // Lotes menores reduzem chance de timeout individual
      let totalProcessed = 0
      let lastCpfInBatch: string | null = null;
      
      const startRange = partIndex * PART_SIZE;
      const endRange = Math.min((partIndex + 1) * PART_SIZE - 1, (campaign.publico_estimado || 0) - 1);
      const totalToExport = Math.max(0, endRange - startRange + 1);

      if (totalToExport <= 0) {
        alert("Intervalo de exportação inválido.");
        setIsExporting(null);
        return;
      }

      while (totalProcessed < totalToExport) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error("ABORT_BY_USER")
        }
        
        const fetchBatch = async () => {
          let targetTable = 'base_consulta_rapida';
          const campaignName = (campaign.nome || "").toUpperCase();
          const convenioKey = filters.convenio;

          const TABLE_MAP: Record<string, string> = {
            'siape': 'base_consulta_siape',
            'governo_sp': 'base_consulta_governo_sp',
            'prefeitura_sp': 'base_consulta_prefeitura_sp',
            'governo_pi': 'base_consulta_governo_pi',
            'governo_ma': 'base_consulta_governo_ma',
          };

          if (convenioKey === 'siape' || campaignName.includes('SIAPE') || campaignName.includes('FEDERAL')) {
            targetTable = 'base_consulta_siape';
          } else if (convenioKey && TABLE_MAP[(convenioKey as string)]) {
            targetTable = TABLE_MAP[(convenioKey as string)];
          }

          const columnsToSelect = "cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3, numero_matricula, orgao, situacao_funcional, salario, instituidor_nome, regime_juridico, uf, saldo_70, margem_35, bruta_5, utilizada_5, liquida_5, beneficio_bruta_5, beneficio_utilizada_5, beneficio_liquida_5, banco, prazo, tipo";
          
          let query = supabase.from(targetTable).select(columnsToSelect)

          if (filters.orgaos?.length > 0) {
            const codeFilters = Object.entries(ORGAOS_MAPPING)
              .filter(([, name]) => filters.orgaos.includes(name))
              .map(([code]) => code);
            const combinedOrgaos = Array.from(new Set([...filters.orgaos, ...codeFilters]));
            if (combinedOrgaos.length > 0) query = query.in('orgao', combinedOrgaos);
          }
          
          if (filters.situacoes?.length > 0) query = query.in('situacao_funcional', filters.situacoes)
          if (filters.regimes?.length > 0) query = query.in('regime_juridico', filters.regimes)
          if (filters.ufs?.length > 0) query = query.in('uf', filters.ufs)

          if (filters.idadeMin) {
            const d = new Date()
            d.setFullYear(d.getFullYear() - parseInt(filters.idadeMin))
            query = query.lte('data_nascimento', d.toISOString().split('T')[0])
          }
          if (filters.idadeMax) {
            const d = new Date()
            d.setFullYear(d.getFullYear() - parseInt(filters.idadeMax) - 1)
            d.setDate(d.getDate() + 1)
            query = query.gte('data_nascimento', d.toISOString().split('T')[0])
          }
          
          const mMin = parseSafeNumber(filters.margemMin)
          const mMax = parseSafeNumber(filters.margemMax)
          if (mMin !== null || mMax !== null) {
            query = query.not('margem_35', 'is', null);
            if (mMin !== null && mMax !== null) query = query.gte('margem_35', mMin).lte('margem_35', mMax);
            else if (mMin !== null) query = query.gte('margem_35', mMin);
            else if (mMax !== null) query = query.lte('margem_35', mMax);
          }

          const sMin = parseSafeNumber(filters.saldoMin)
          if (sMin !== null) query = query.not('saldo_70', 'is', null).gte('saldo_70', sMin);
          
          const cMMin = parseSafeNumber(filters.cardMargemMin)
          if (cMMin !== null) query = query.not('liquida_5', 'is', null).gte('liquida_5', cMMin)
          
          const cBMin = parseSafeNumber(filters.cardBeneficioMin)
          if (cBMin !== null) query = query.not('beneficio_liquida_5', 'is', null).gte('beneficio_liquida_5', cBMin)

          if (filters.loanBanks?.length > 0) query = query.in('banco', filters.loanBanks)
          
          const hasCardTypeFilter = filters.cardTypes?.length > 0 && !filters.cardTypes.includes('__ACTIVE__') || (filters.cardTypes?.length > 1);
          const hasCardBankFilter = filters.cardBanks?.length > 0;

          if (hasCardTypeFilter || hasCardBankFilter) {
            const cleanCardTypes = filters.cardTypes?.filter(t => t !== '__ACTIVE__') || [];
            const cardQueryCodes = Object.entries(CONTRATOS_TIPO_MAPPING)
              .filter(([, info]) => {
                const matchesType = cleanCardTypes.length === 0 || cleanCardTypes.includes(info.label);
                const matchesBank = !hasCardBankFilter || (info.bank && filters.cardBanks.includes(info.bank));
                return matchesType && matchesBank;
              })
              .map(([code]) => code);
            
            if (cardQueryCodes.length > 0) {
              query = query.in('tipo_prefix', cardQueryCodes);
            } else if (hasCardTypeFilter && hasCardBankFilter) {
              query = query.eq('tipo', '999999999_FORCE_EMPTY');
            }
          }

          const pMin = parseInt(filters.loanPrazoMin)
          const pMax = parseInt(filters.loanPrazoMax)
          if (!isNaN(pMin)) query = query.gte('prazo', pMin)
          if (!isNaN(pMax)) query = query.lte('prazo', pMax)

          query = query.order('cpf', { ascending: true })

          if (totalProcessed === 0) {
            return await query.range(startRange, startRange + pageSize - 1);
          } else if (lastCpfInBatch) {
            return await query.gt('cpf', lastCpfInBatch).limit(pageSize);
          }
          return { data: [], error: null };
        };

        const { data: bcrData } = await withRetry(fetchBatch);

        if (!bcrData || bcrData.length === 0) {
          break;
        } else {
          lastCpfInBatch = bcrData[bcrData.length - 1].cpf as string;
          bcrData.forEach((row: { cpf: string; nome: string; data_nascimento?: string; telefone_1?: string; telefone_2?: string; telefone_3?: string; numero_matricula?: string; orgao?: string; situacao_funcional?: string; salario?: number; instituidor_nome?: string; regime_juridico?: string; uf?: string; saldo_70?: number; margem_35?: number; bruta_5?: number; utilizada_5?: number; liquida_5?: number; beneficio_bruta_5?: number; beneficio_utilizada_5?: number; beneficio_liquida_5?: number; banco?: string; prazo?: string | number; tipo?: string }) => {
            const key = row.cpf;
            if (uniqueRowsKeys.has(key)) return
            uniqueRowsKeys.add(key)

            const csvRow = [
              row.cpf, row.nome, row.data_nascimento || "",
              row.telefone_1 || "", row.telefone_2 || "", row.telefone_3 || "", 
              row.numero_matricula || "", row.orgao || "", row.situacao_funcional || "",
              row.salario || 0, row.instituidor_nome || "", row.regime_juridico || "", row.uf || "",
              row.saldo_70 || 0, row.margem_35 || 0, row.bruta_5 || 0, row.utilizada_5 || 0,
              row.liquida_5 || 0, row.beneficio_bruta_5 || 0, row.beneficio_utilizada_5 || 0, row.beneficio_liquida_5 || 0,
              row.banco || "", row.prazo || "", row.tipo || ""
            ].map(val => {
              const clean = String(val === null || val === undefined ? "" : val).replace(/"/g, '""');
              return `"${clean}"`;
            }).join(",")
            
            allCsvRows.push(csvRow)
          })

          totalProcessed += bcrData.length;
          const progress = Math.min(Math.round((totalProcessed / totalToExport) * 100), 100)
          setExportProgress(progress)

          // Backpressure: delay para liberar main thread e evitar sobrecarga
          await new Promise(resolve => setTimeout(resolve, 400))
        }
      }

      if (allCsvRows.length === 0) {
        alert("Nenhum dado encontrado para os filtros desta campanha.")
        setIsExporting(null)
        return
      }

      const csvContent = allCsvRows.join("\n")
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `campanha_${campaign.nome.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '_')}_p${partIndex + 1}_${new Date().getTime()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

    } catch (err: unknown) {
      if ((err as Error)?.message === "ABORT_BY_USER") {
        console.log("Exportação abortada.")
        return
      }
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido. Verifique o console.";
      console.error("ERRO DETALHADO NA EXPORTAÇÃO:", err)
      alert(`Erro ao exportar campanha: ${errorMsg}`)
    } finally {
      setIsExporting(null)
      setExportProgress(0)
      abortControllerRef.current = null
    }
  }

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return
    setIsUpdating(true)
    try {
      const { error: updateError } = await supabase
        .from('campanhas')
        .update({ nome: editingName.trim() })
        .eq('id', id)

      if (updateError) throw updateError
      
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, nome: editingName.trim() } : c))
      setEditingId(null)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Tente novamente.";
      console.error("Erro ao renomear campanha:", err)
      alert("Erro ao renomear: " + errorMsg)
    } finally {
      setIsUpdating(false)
    }
  }

  const filteredCampaigns = campaigns.filter(c => 
    c.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Pagination Logic
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const paginatedCampaigns = filteredCampaigns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    try {
      const response = await fetch('/api/usuarios')
      const data = await response.json()
      setAllUsers(data || [])
    } catch (err) {
      console.error("Erro ao buscar usuários:", err)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  const handleOpenDistribution = (campaign: Campaign) => {
    setCampaignToDistribute(campaign)
    setDistributionStep(1)
    
    const filtersWithDist = campaign.filtros
    const distributedSups = filtersWithDist?.distribuicao || []
    const distributedBrokers = filtersWithDist?.corretores_selecionados || []
    
    setSelectedSupervisors(distributedSups)
    setSelectedBrokers(distributedBrokers)
    setShowDistributionModal(true)
    fetchUsers()
  }

  const handleSaveDistribution = async () => {
    if (!campaignToDistribute) return
    setIsSavingDistribution(true)
    try {
      const updatedFiltros = {
        ...campaignToDistribute.filtros,
        distribuicao: selectedSupervisors,
        corretores_selecionados: selectedBrokers
      }

      const { error: updateError } = await supabase
        .from('campanhas')
        .update({ filtros: updatedFiltros })
        .eq('id', campaignToDistribute.id)

      if (updateError) throw updateError

      setCampaigns(prev => prev.map(c => 
        c.id === campaignToDistribute.id ? { ...c, filtros: updatedFiltros } : c
      ))
      
      setShowDistributionModal(false)
      alert("Campanha distribuída com sucesso!")
    } catch (err: unknown) {
      console.error("Erro ao salvar distribuição:", err)
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      alert("Erro ao salvar distribuição: " + errorMsg)
    } finally {
      setIsSavingDistribution(false)
    }
  }

  const supervisors = allUsers.filter(u => u.funcao === 'Supervisor' || u.funcao === 'Administrador')
  const availableBrokers = allUsers.filter(u => 
    u.funcao === 'Corretor' && 
    (u.supervisor_id && selectedSupervisors.includes(u.supervisor_id))
  )

  return (
    <div className="flex-1 flex flex-col relative">
      <Header title="CAMPANHAS" />
      
      {/* Modal de exportação removido para nova implementação */}
      
      <div className="p-4 lg:p-8 space-y-8 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest text-center md:text-left">Gerencie seus públicos e estratégias de vendas.</p>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <Link href="/campanhas/nova" className="w-full md:w-auto">
              <Button className="w-full md:w-auto h-10 px-6 text-[12px] font-bold uppercase tracking-widest">
                <Plus className="w-3.5 h-3.5 mr-2" />
                Nova Campanha
              </Button>
            </Link>
          </div>
        </div>

        <Card className="card-shadow">
          <CardContent className="p-0">
                <div className="p-8 border-b border-slate-50 flex gap-4">
                  <div className="flex-1">
                    <Input 
                      placeholder="Buscar por ID ou Nome da Campanha..." 
                      icon={<Search className="w-4 h-4" />}
                      className="h-9 text-[12px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon" className="w-9 h-9 border-slate-100 bg-slate-50/30">
                    <Filter className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-50">
                        <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Identificação</th>
                        <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Nome</th>
                        <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Data Criação</th>
                        <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Público</th>
                        <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest"></th>
                        <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <Loader2 className="w-8 h-8 text-primary animate-spin" />
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Carregando campanhas...</p>
                            </div>
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td colSpan={6} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                                <Info className="w-6 h-6 text-red-500" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest">Erro ao carregar campanhas</p>
                                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">{error}</p>
                              </div>
                              <Button 
                                onClick={fetchCampaigns}
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-4 text-[9px] font-bold uppercase tracking-widest border-slate-200"
                              >
                                Tentar Novamente
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : filteredCampaigns.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-8 py-20 text-center">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma campanha encontrada.</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedCampaigns.map((campaign) => (
                          <tr key={campaign.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                            <td className="px-8 py-5 text-[11px] font-bold text-slate-400 truncate max-w-[100px]">{campaign.id}</td>
                            <td className="px-8 py-5">
                              {editingId === campaign.id ? (
                                <div className="flex items-center gap-2 max-w-[250px]">
                                  <Input
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="h-8 text-[12px] font-bold"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleRename(campaign.id);
                                      if (e.key === 'Escape') setEditingId(null);
                                    }}
                                  />
                                  <Button 
                                    size="icon" 
                                    className="w-8 h-8 shrink-0 bg-emerald-500 hover:bg-emerald-600"
                                    onClick={() => handleRename(campaign.id)}
                                    disabled={isUpdating}
                                  >
                                    {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost"
                                    className="w-8 h-8 shrink-0 text-slate-400"
                                    onClick={() => setEditingId(null)}
                                    disabled={isUpdating}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-[12.5px] font-bold text-slate-900 uppercase tracking-tight">{campaign.nome}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-2 text-slate-500">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="text-[11.5px] font-medium">{new Date(campaign.created_at).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[12.5px] font-black text-slate-900">{campaign.publico_estimado.toLocaleString('pt-BR')}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              {isExporting?.startsWith(campaign.id) && (
                                <div className="flex items-center gap-3 w-full max-w-[160px]">
                                  <div className="flex-1 flex flex-col gap-1">
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-emerald-500 h-full transition-all duration-300" 
                                        style={{ width: `${exportProgress}%` }}
                                      />
                                    </div>
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest text-center">
                                      {exportProgress}%
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCancelExport}
                                    className="w-7 h-7 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 shrink-0"
                                    title="Parar Exportação"
                                  >
                                    <X className="w-3.5 h-3.5" strokeWidth={3} />
                                  </Button>
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-5 text-right font-medium">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Ver Filtros */}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 shadow-sm hover:shadow-md"
                                  onClick={() => {
                                    setSelectedCampaignForFilters(campaign);
                                    setShowFiltersModal(true);
                                  }}
                                  title="Ver Filtros"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>

                                {/* Renomear */}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all border border-transparent hover:border-amber-100 shadow-sm hover:shadow-md"
                                  onClick={() => {
                                    setEditingId(campaign.id);
                                    setEditingName(campaign.nome);
                                  }}
                                  title="Renomear"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>

                                {/* Distribuir Campanha */}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100 shadow-sm hover:shadow-md"
                                  onClick={() => handleOpenDistribution(campaign)}
                                  title="Distribuir Campanha"
                                >
                                  <Share2 className="w-4 h-4" />
                                </Button>

                                {/* Exportar */}
                                {campaign.publico_estimado > PART_SIZE ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        disabled={isExporting !== null}
                                        className={cn(
                                          "w-8 h-8 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100 shadow-sm hover:shadow-md",
                                          isExporting?.startsWith(campaign.id) && "text-emerald-600 bg-emerald-50 border-emerald-100"
                                        )}
                                        title="Exportar Partes"
                                      >
                                        {isExporting?.startsWith(campaign.id) ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Download className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[240px] rounded-2xl border-slate-100 shadow-xl p-2">
                                      {Array.from({ length: Math.ceil(campaign.publico_estimado / PART_SIZE) }).map((_, i) => (
                                        <DropdownMenuItem 
                                          key={i} 
                                          onClick={() => handleExport(campaign, i)}
                                          className="text-[10px] font-black uppercase tracking-widest py-2.5 px-3 cursor-pointer rounded-xl hover:bg-emerald-50 hover:text-emerald-600"
                                        >
                                          <Download className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                          Parte {i + 1} ({ (i * PART_SIZE).toLocaleString() } ao { Math.min((i + 1) * PART_SIZE - 1, campaign.publico_estimado - 1).toLocaleString() })
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    disabled={isExporting !== null}
                                    onClick={() => handleExport(campaign)}
                                    className={cn(
                                      "w-8 h-8 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100 shadow-sm hover:shadow-md",
                                      isExporting?.startsWith(campaign.id) && "text-emerald-600 bg-emerald-50 border-emerald-100"
                                    )}
                                    title="Exportar"
                                  >
                                    {isExporting?.startsWith(campaign.id) ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Download className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}

                                {/* Excluir */}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100 shadow-sm hover:shadow-md"
                                  onClick={() => {
                                    setCampaignToDelete(campaign.id);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

            {totalPages > 1 && (
              <div className="px-8 py-10 flex flex-col sm:flex-row items-center justify-between border-t border-slate-50 bg-slate-50/20 gap-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredCampaigns.length)} de {filteredCampaigns.length} campanhas
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
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 5;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={currentPage === i ? "default" : "outline"}
                            size="icon"
                            className={cn(
                              "h-8 w-8 rounded-lg transition-all text-[10px] font-black tracking-widest",
                              currentPage === i 
                                ? "bg-primary text-white shadow-lg shadow-primary/20 border-primary" 
                                : "border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20"
                            )}
                            onClick={() => handlePageChange(i)}
                          >
                            {i}
                          </Button>
                        );
                      }
                      return pages;
                    })()}
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
          </CardContent>
        </Card>
      </div>
      {/* Modal de Filtros */}
      <Dialog open={showFiltersModal} onOpenChange={setShowFiltersModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold uppercase tracking-tight text-slate-900">
              Filtros da Campanha: {selectedCampaignForFilters?.nome}
            </DialogTitle>
            <DialogDescription className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
              Confira todos os parâmetros utilizados para gerar este público.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            {selectedCampaignForFilters?.filtros && Object.keys(selectedCampaignForFilters.filtros).length > 0 ? (
              <div className="space-y-3">
                {/* Orgãos */}
                {selectedCampaignForFilters.filtros.orgaos?.length > 0 && (
                  <FilterAccordion title="Órgãos" count={selectedCampaignForFilters.filtros.orgaos.length}>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedCampaignForFilters.filtros.orgaos.map((item: string) => (
                        <span key={item} className="text-[9px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded font-bold uppercase border border-blue-100">{item}</span>
                      ))}
                    </div>
                  </FilterAccordion>
                )}

                {/* UFs */}
                {selectedCampaignForFilters.filtros.ufs?.length > 0 && (
                  <FilterAccordion title="Estados (UF)" count={selectedCampaignForFilters.filtros.ufs.length}>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedCampaignForFilters.filtros.ufs.map((item: string) => (
                        <span key={item} className="text-[9px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-bold uppercase border border-slate-200">{item}</span>
                      ))}
                    </div>
                  </FilterAccordion>
                )}

                {/* Idade */}
                {(selectedCampaignForFilters.filtros.idadeMin || selectedCampaignForFilters.filtros.idadeMax) && (
                  <FilterAccordion title="Faixa Etária">
                    <div className="pt-2">
                      <div className="text-[12px] font-bold text-slate-700 bg-orange-50/50 p-3 rounded-lg border border-orange-100 flex items-center justify-between">
                        <span className="text-[10px] text-orange-400 uppercase tracking-widest font-black">Intervalo</span>
                        <span>{selectedCampaignForFilters.filtros.idadeMin || "0"} a {selectedCampaignForFilters.filtros.idadeMax || "∞"} anos</span>
                      </div>
                    </div>
                  </FilterAccordion>
                )}

                {/* Margem */}
                {(selectedCampaignForFilters.filtros.margemMin || selectedCampaignForFilters.filtros.margemMax) && (
                  <FilterAccordion title="Margem 35%">
                    <div className="pt-2">
                      <div className="text-[12px] font-bold text-slate-700 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-black">Valor</span>
                        <span>R$ {selectedCampaignForFilters.filtros.margemMin || "0"} a R$ {selectedCampaignForFilters.filtros.margemMax || "∞"}</span>
                      </div>
                    </div>
                  </FilterAccordion>
                )}

                {/* Bancos de Empréstimo */}
                {selectedCampaignForFilters.filtros.loanBanks?.length > 0 && (
                  <FilterAccordion title="Bancos (Empréstimo)" count={selectedCampaignForFilters.filtros.loanBanks.length}>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedCampaignForFilters.filtros.loanBanks.map((item: string) => (
                        <span key={item} className="text-[9px] bg-amber-50 text-amber-600 px-2.5 py-1 rounded font-bold uppercase border border-amber-100">{item}</span>
                      ))}
                    </div>
                  </FilterAccordion>
                )}

                {/* Prazo */}
                {(selectedCampaignForFilters.filtros.loanPrazoMin || selectedCampaignForFilters.filtros.loanPrazoMax) && (
                  <FilterAccordion title="Prazo de Empréstimo">
                    <div className="pt-2">
                      <div className="text-[12px] font-bold text-slate-700 bg-amber-50/30 p-3 rounded-lg border border-amber-100/50 flex items-center justify-between">
                        <span className="text-[10px] text-amber-400 uppercase tracking-widest font-black">Meses</span>
                        <span>{selectedCampaignForFilters.filtros.loanPrazoMin || "0"} a {selectedCampaignForFilters.filtros.loanPrazoMax || "∞"} meses</span>
                      </div>
                    </div>
                  </FilterAccordion>
                )}

                {/* Bancos de Cartão */}
                {selectedCampaignForFilters.filtros.cardBanks?.length > 0 && (
                  <FilterAccordion title="Bancos (Cartão)" count={selectedCampaignForFilters.filtros.cardBanks.length}>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedCampaignForFilters.filtros.cardBanks.map((item: string) => (
                        <span key={item} className="text-[9px] bg-rose-50 text-rose-600 px-2.5 py-1 rounded font-bold uppercase border border-rose-100">{item}</span>
                      ))}
                    </div>
                  </FilterAccordion>
                )}

                {/* Tipos de Cartão */}
                {selectedCampaignForFilters.filtros.cardTypes?.length > 0 && (
                  <FilterAccordion title="Tipos de Cartão" count={selectedCampaignForFilters.filtros.cardTypes.filter((t: string) => t !== '__ACTIVE__').length}>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedCampaignForFilters.filtros.cardTypes.filter((t: string) => t !== '__ACTIVE__').map((item: string) => (
                        <span key={item} className="text-[9px] bg-rose-50 text-rose-600 px-2.5 py-1 rounded font-bold uppercase border border-rose-100">{item}</span>
                      ))}
                    </div>
                  </FilterAccordion>
                )}

                {/* Situações Funcionais */}
                {selectedCampaignForFilters.filtros.situacoes?.length > 0 && (
                  <FilterAccordion title="Situações Funcionais" count={selectedCampaignForFilters.filtros.situacoes.length}>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedCampaignForFilters.filtros.situacoes.map((item: string) => (
                        <span key={item} className="text-[9px] bg-violet-50 text-violet-600 px-2.5 py-1 rounded font-bold uppercase border border-violet-100">{item}</span>
                      ))}
                    </div>
                  </FilterAccordion>
                )}

                {/* Regimes Jurídicos */}
                {selectedCampaignForFilters.filtros.regimes?.length > 0 && (
                  <FilterAccordion title="Regimes Jurídicos" count={selectedCampaignForFilters.filtros.regimes.length}>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedCampaignForFilters.filtros.regimes.map((item: string) => (
                        <span key={item} className="text-[9px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded font-bold uppercase border border-indigo-100">{item}</span>
                      ))}
                    </div>
                  </FilterAccordion>
                )}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl">
                <Info className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhum filtro aplicado.</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50 flex justify-end">
            <Button 
              onClick={() => setShowFiltersModal(false)}
              className="h-10 px-8 text-[11px] font-bold uppercase tracking-widest"
            >
              Fechar Visualização
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-[400px] border-none rounded-3xl shadow-2xl p-0 overflow-hidden bg-white">
          <div className="p-8">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-[18px] font-black text-slate-800 text-center uppercase tracking-tighter mb-2">Excluir Campanha?</h3>
            <p className="text-[12px] font-medium text-slate-500 text-center leading-relaxed">
              Esta ação não pode ser desfeita. Todos os dados desta campanha serão removidos permanentemente.
            </p>
          </div>
          <div className="p-6 bg-slate-50 flex gap-3">
            <Button 
              variant="ghost" 
              className="flex-1 h-12 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 h-12 text-[11px] font-bold uppercase tracking-widest bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-200 rounded-xl gap-2"
              onClick={async () => {
                if (!campaignToDelete) return;
                setIsDeleting(true);
                try {
                  const { error } = await supabase.from('campanhas').delete().eq('id', campaignToDelete);
                  if (error) throw error;
                  await fetchCampaigns();
                  setIsDeleteDialogOpen(false);
                } catch (err) {
                  console.error("Erro ao excluir campanha:", err);
                  alert("Erro ao excluir campanha.");
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Exclusão"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Distribuição de Campanha */}
      <Dialog open={showDistributionModal} onOpenChange={setShowDistributionModal}>
        <DialogContent className="max-w-md border-none rounded-[32px] shadow-2xl p-0 overflow-hidden bg-white">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Share2 className="w-7 h-7 text-blue-600" />
              </div>
              {distributionStep === 2 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDistributionStep(1)}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 gap-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Voltar
                </Button>
              )}
            </div>
            
            <h3 className="text-[20px] font-black text-slate-900 uppercase tracking-tighter mb-2">
              {distributionStep === 1 ? "Distribuir Campanha" : "Selecionar Corretores"}
            </h3>
            <p className="text-[12px] font-medium text-slate-500 leading-relaxed uppercase tracking-wider">
              {distributionStep === 1 
                ? "Escolha as equipes (supervisores) que terão acesso a esta campanha:" 
                : "Selecione os corretores desta(s) equipe(s) que poderão visualizar os dados:"}
              <br />
              <span className="font-bold text-blue-600">{campaignToDistribute?.nome}</span>
            </p>

            <div className="mt-8 space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {isLoadingUsers ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Buscando {distributionStep === 1 ? "equipes" : "corretores"}...</span>
                </div>
              ) : distributionStep === 1 ? (
                supervisors.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhum supervisor encontrado.</p>
                  </div>
                ) : (
                  supervisors.map((sup) => {
                    const isSelected = selectedSupervisors.includes(sup.id)
                    return (
                      <button
                        key={sup.id}
                        onClick={() => {
                          setSelectedSupervisors(prev => {
                            const newSups = isSelected 
                              ? prev.filter(id => id !== sup.id)
                              : [...prev, sup.id]
                            
                            // Ao desmarcar um supervisor, remover corretores dele da seleção
                            if (isSelected) {
                              const broksOfThisSup = allUsers.filter(u => u.supervisor_id === sup.id).map(u => u.id)
                              setSelectedBrokers(curr => curr.filter(bid => !broksOfThisSup.includes(bid)))
                            }
                            
                            return newSups
                          })
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group text-left",
                          isSelected 
                            ? "bg-blue-600 border-blue-600 shadow-md shadow-blue-100" 
                            : "bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-black uppercase transition-colors shrink-0 overflow-hidden",
                            isSelected ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                          )}>
                            {sup.avatar_url ? (
                              <img src={sup.avatar_url} alt={sup.nome} className="w-full h-full object-cover" />
                            ) : (
                              sup.nome.substring(0, 2)
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={cn(
                              "text-[12px] font-bold uppercase tracking-tight truncate",
                              isSelected ? "text-white" : "text-slate-900 group-hover:text-blue-600"
                            )}>
                              {sup.nome}
                            </span>
                            <span className={cn(
                              "text-[10px] font-medium uppercase tracking-widest",
                              isSelected ? "text-white/70" : "text-slate-400"
                            )}>
                              {sup.equipe}
                            </span>
                          </div>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected 
                            ? "bg-white border-white text-blue-600" 
                            : "border-slate-200 text-transparent group-hover:border-blue-300"
                        )}>
                          <Check className="w-3.5 h-3.5" strokeWidth={4} />
                        </div>
                      </button>
                    )
                  })
                )
              ) : (
                // Step 2: Selecting Brokers
                availableBrokers.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhum corretor encontrado nestas equipes.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-2 mb-2">
                       <button 
                         onClick={() => {
                           const allIds = availableBrokers.map(b => b.id)
                           setSelectedBrokers(prev => {
                             const allSelected = allIds.every(id => prev.includes(id))
                             if (allSelected) {
                               return prev.filter(id => !allIds.includes(id))
                             } else {
                               return Array.from(new Set([...prev, ...allIds]))
                             }
                           })
                         }}
                         className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                       >
                         {availableBrokers.every(b => selectedBrokers.includes(b.id)) ? "Desmarcar Todos" : "Selecionar Todos"}
                       </button>
                    </div>
                    {availableBrokers.map((broker) => {
                      const isSelected = selectedBrokers.includes(broker.id)
                      const sup = supervisors.find(s => s.id === broker.supervisor_id)
                      return (
                        <button
                          key={broker.id}
                          onClick={() => {
                            setSelectedBrokers(prev => 
                              isSelected 
                                ? prev.filter(id => id !== broker.id)
                                : [...prev, broker.id]
                            )
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group text-left",
                            isSelected 
                              ? "bg-emerald-600 border-emerald-600 shadow-md shadow-emerald-100" 
                              : "bg-white border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-black uppercase transition-colors shrink-0 overflow-hidden",
                              isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"
                            )}>
                              {broker.avatar_url ? (
                                <img src={broker.avatar_url} alt={broker.nome} className="w-full h-full object-cover" />
                              ) : (
                                broker.nome.substring(0, 2)
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className={cn(
                                "text-[12px] font-bold uppercase tracking-tight truncate",
                                isSelected ? "text-white" : "text-slate-900 group-hover:text-emerald-600"
                              )}>
                                {broker.nome}
                              </span>
                              <span className={cn(
                                "text-[10px] font-medium uppercase tracking-widest",
                                isSelected ? "text-white/70" : "text-slate-400"
                              )}>
                                Equipe: {sup?.nome || broker.equipe}
                              </span>
                            </div>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected 
                              ? "bg-white border-white text-emerald-600" 
                              : "border-slate-200 text-transparent group-hover:border-emerald-300"
                          )}>
                            <Check className="w-3.5 h-3.5" strokeWidth={4} />
                          </div>
                        </button>
                      )
                    })}
                  </>
                )
              )}
            </div>
          </div>

          <div className="p-6 bg-slate-50 flex gap-3">
            <Button 
              variant="ghost" 
              className="flex-1 h-12 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl"
              onClick={() => setShowDistributionModal(false)}
              disabled={isSavingDistribution}
            >
              Cancelar
            </Button>
            {distributionStep === 1 ? (
              <Button 
                className="flex-1 h-12 text-[11px] font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 rounded-xl gap-2"
                onClick={() => {
                  if (selectedSupervisors.length === 0) {
                    alert("Selecione ao menos um supervisor.")
                    return
                  }
                  setDistributionStep(2)
                }}
                disabled={isLoadingUsers}
              >
                Próxima Etapa
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                className="flex-1 h-12 text-[11px] font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 rounded-xl gap-2"
                onClick={handleSaveDistribution}
                disabled={isSavingDistribution}
              >
                {isSavingDistribution ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalizar Distribuição"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
