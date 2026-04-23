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
  MoreVertical,
  Loader2,
  Info,
  Download,
  Eye,
  Trash2,
  ChevronDown
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
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

export default function CampaignsPage() {
  const { canAccessAdminAreas, isLoading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCampaignForFilters, setSelectedCampaignForFilters] = useState<Campaign | null>(null)
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  
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
    
    try {
      const filters = campaign.filtros
      const allCsvRows: string[] = []
      const uniqueRowsKeys = new Set()
      
      const pageSize = 500 
      let totalProcessed = 0
      
      const startRange = partIndex * PART_SIZE;
      const endRange = Math.min((partIndex + 1) * PART_SIZE - 1, (campaign.publico_estimado || 0) - 1);
      const totalToExport = Math.max(0, endRange - startRange + 1);

      if (totalToExport <= 0) {
        alert("Intervalo de exportação inválido.");
        return;
      }

      while (totalProcessed < totalToExport) {
        const from = startRange + totalProcessed;
        const to = Math.min(from + pageSize - 1, endRange);

        // CONSULTA DIRETA NA TABELA DE SNAPSHOT (SEM JOINS)
        let query = supabase.from('base_consulta_rapida').select('*')

        // ... (Filtros permanecem idênticos)
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

        // 4. ITENS DE CRÉDITO (UNIFICADO PARA CARTÕES COM INTERSEÇÃO)
        if (filters.loanBanks?.length > 0) query = query.in('banco', filters.loanBanks)
        
        const hasCardTypeFilter = filters.cardTypes?.length > 0;
        const hasCardBankFilter = filters.cardBanks?.length > 0;

        if (hasCardTypeFilter || hasCardBankFilter) {
          const cardQueryCodes = Object.entries(CONTRATOS_TIPO_MAPPING)
            .filter(([, info]) => {
              const matchesType = !hasCardTypeFilter || filters.cardTypes.includes(info.label);
              const matchesBank = !hasCardBankFilter || (info.bank && filters.cardBanks.includes(info.bank));
              return matchesType && matchesBank;
            })
            .map(([code]) => code);
          
          if (cardQueryCodes.length > 0) {
            // Filtro de alta performance usando coluna de prefixo indexada
            query = query.in('tipo_prefix', cardQueryCodes);
          } else if (hasCardTypeFilter && hasCardBankFilter) {
            // Sem interseção, força resultado vazio para o lote
            query = query.eq('tipo', '999999999_FORCE_EMPTY');
          }
        }

        const pMin = parseInt(filters.loanPrazoMin)
        const pMax = parseInt(filters.loanPrazoMax)
        if (!isNaN(pMin)) query = query.gte('prazo', pMin)
        if (!isNaN(pMax)) query = query.lte('prazo', pMax)

        const { data: bcrData, error: bcrError } = await query.range(from, to)
        if (bcrError) throw bcrError

        if (!bcrData || bcrData.length === 0) {
          break;
        } else {
          bcrData.forEach((row) => {
            // UNICIDADE GARANTIDA POR CPF
            const key = row.cpf as string;
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
            ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
            
            allCsvRows.push(csvRow)
          })

          totalProcessed += bcrData.length;
          const progress = Math.min(Math.round((totalProcessed / totalToExport) * 100), 100)
          setExportProgress(progress)
        }
      }

      if (allCsvRows.length === 0) {
        alert("Nenhum dado encontrado para este intervalo.")
        return
      }

      const headers = [
        "cpf", "nome", "data_de_nascimento", "telefone_1", "telefone_2", "telefone_3",
        "matricula", "orgao", "situacao_funcional", "salario", "instituidor", "regime_juridico", "uf",
        "saldo_70%", "margem_35%", "bruta_5", "utilizada_5", "liquida_5", "beneficio_bruta_5", "beneficio_utilizada_5", "beneficio_liquida_5",
        "banco", "prazo", "tipo"
      ]
      
      const csvContent = [headers.join(","), ...allCsvRows].join("\n")
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `campanha_${campaign.nome.toLowerCase().replace(/\s+/g, '_')}_p${partIndex + 1}_${new Date().getTime()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Verifique o console.";
      console.error("ERRO DETALHADO NA EXPORTAÇÃO:", err)
      alert(`Erro ao exportar campanha: ${errorMsg}`)
    } finally {
      setIsExporting(null)
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

  return (
    <div className="flex-1 flex flex-col relative">
      <Header title="MINHAS CAMPANHAS" />
      
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
                        <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Status</th>
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
                              <div className="flex flex-col">
                                <span className="text-[12.5px] font-bold text-slate-900 uppercase tracking-tight">{campaign.nome}</span>
                              </div>
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
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[8.5px] font-bold uppercase tracking-widest">ATIVO</span>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {campaign.publico_estimado > PART_SIZE ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger 
                                      render={
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          disabled={isExporting !== null}
                                          className={`h-8 px-3 text-[9px] font-bold uppercase tracking-widest transition-colors ${
                                            isExporting?.startsWith(campaign.id) 
                                              ? "text-primary bg-primary/5" 
                                              : "text-slate-400 hover:text-primary hover:bg-primary/5"
                                          }`}
                                        >
                                          {isExporting?.startsWith(campaign.id) ? (
                                            <div className="flex items-center gap-2">
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                              <span>{exportProgress}%</span>
                                            </div>
                                          ) : (
                                            <>
                                              <Download className="w-3 h-3 mr-2" />
                                              Exportar Partes
                                            </>
                                          )}
                                        </Button>
                                      }
                                    />
                                    <DropdownMenuContent align="end" className="w-[240px]">
                                      {Array.from({ length: Math.ceil(campaign.publico_estimado / PART_SIZE) }).map((_, i) => (
                                        <DropdownMenuItem 
                                          key={i} 
                                          onClick={() => handleExport(campaign, i)}
                                          className="text-[10px] font-bold uppercase tracking-tight py-2 px-3 cursor-pointer"
                                        >
                                          <Download className="w-3 h-3 mr-2 text-slate-400" />
                                          Parte {i + 1} ({ (i * PART_SIZE).toLocaleString() } ao { Math.min((i + 1) * PART_SIZE - 1, campaign.publico_estimado - 1).toLocaleString() })
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <Button 
                                    onClick={() => handleExport(campaign)}
                                    variant="ghost" 
                                    size="sm" 
                                    disabled={isExporting !== null}
                                    className={`h-8 px-3 text-[9px] font-bold uppercase tracking-widest transition-colors ${
                                      isExporting?.startsWith(campaign.id) 
                                        ? "text-primary bg-primary/5" 
                                        : "text-slate-400 hover:text-primary hover:bg-primary/5"
                                    }`}
                                  >
                                    {isExporting?.startsWith(campaign.id) ? (
                                      <div className="flex flex-col items-end gap-1 min-w-[100px]">
                                        <div className="flex items-center gap-2">
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                          <span className="text-[9px]">{exportProgress}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-primary transition-all duration-300" 
                                            style={{ width: `${exportProgress}%` }}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <Download className="w-3 h-3 mr-2" />
                                        Exportar
                                      </>
                                    )}
                                  </Button>
                                )}
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger 
                                    render={
                                      <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-300 hover:text-slate-600">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    }
                                  />
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedCampaignForFilters(campaign);
                                        setShowFiltersModal(true);
                                      }}
                                      className="text-[11px] font-bold uppercase tracking-tight py-2 px-3 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                      Ver Filtros
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-[11px] font-bold uppercase tracking-tight py-2 px-3 cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => {
                                        if (confirm("Deseja realmente excluir esta campanha?")) {
                                          supabase.from('campanhas').delete().eq('id', campaign.id).then(() => fetchCampaigns());
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
    </div>
  )
}
