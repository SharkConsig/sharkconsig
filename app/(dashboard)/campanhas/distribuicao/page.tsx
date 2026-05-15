"use client"
 
import { useRouter } from "next/navigation"

import { Header } from "@/components/layout/header"
import { useSidebar } from "@/context/sidebar-context"
import { cn } from "@/lib/utils"
import { 
  Users, 
  Target, 
  Calendar, 
  Eye, 
  Download, 
  Loader2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Info
} from "lucide-react"
import { motion } from "motion/react"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ORGAOS_MAPPING } from "@/lib/orgaos-mapping"
import { CONTRATOS_TIPO_MAPPING } from "@/lib/contratos-mapping"

// Reusable components from the main page
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
        <div className={cn(
          "w-4 h-4 text-slate-400 transition-transform duration-300 transform",
          isOpen ? "rotate-180" : ""
        )}>
          <Filter className="w-full h-full" />
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-slate-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

const PART_SIZE = 50000;

interface Campaign {
  id: string;
  nome: string;
  created_at: string;
  publico_estimado: number;
  filtros: {
    convenio?: string;
    orgaos?: string[];
    situacoes?: string[];
    regimes?: string[];
    ufs?: string[];
    margemMin?: string;
    margemMax?: string;
    saldoMin?: string;
    saldoMax?: string;
    cardMargemMin?: string;
    cardBeneficioMin?: string;
    loanBanks?: string[];
    loanPrazoMin?: string;
    loanPrazoMax?: string;
    cardTypes?: string[];
    distribuicao?: string[];
    corretores_selecionados?: string[];
    idadeMin?: string;
    idadeMax?: string;
  };
}

export default function DistribuicaoCampanhaPage() {
  const router = useRouter()
  const { isCollapsed } = useSidebar()
  const { user, perfil, isAdmin, isDeveloper } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCampaignForFilters, setSelectedCampaignForFilters] = useState<Campaign | null>(null)
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Access check
  useEffect(() => {
    if (perfil && !isAdmin && !isDeveloper) {
      if (perfil.role === 'Supervisor' || perfil.role === 'Corretor') {
        router.push('/')
      }
    }
  }, [perfil, isAdmin, isDeveloper, router])

  const fetchCampaigns = useCallback(async () => {
    if (!user || !perfil) return
    setIsLoading(true)
    setError(null)
    try {
      const query = supabase.from('campanhas').select('*')
      
      const { data, error: fetchError } = await query.order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      
      let filteredData = data || []
      
      // Client side filtering for distribution if not admin
      if (!isAdmin && !isDeveloper) {
        const userId = user.id
        const supervisorId = perfil.supervisor_id
        
        filteredData = filteredData.filter(c => {
          const distribution = c.filtros?.distribuicao || []
          const brokers = c.filtros?.corretores_selecionados || []
          
          // If explicit brokers are selected, check if user is one of them
          if (brokers.length > 0) {
            return brokers.includes(userId)
          }
          
          // If no brokers selected, fall back to supervisor/team distribution
          return distribution.includes(userId) || (supervisorId && distribution.includes(supervisorId))
        })
      }

      setCampaigns(filteredData as Campaign[])
    } catch (err: unknown) {
      console.error("Erro ao buscar campanhas distribuídas:", err)
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [user, perfil, isAdmin, isDeveloper])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [exportProgress, setExportProgress] = useState(0)

  const handleExport = async (campaign: Campaign, partIndex: number = 0) => {
    if (isExporting) return
    setIsExporting(`${campaign.id}_${partIndex}`)
    setExportProgress(0)
    
    try {
      const filters = campaign.filtros
      const allCsvRows: string[] = []
      
      const headers = [
        "CPF", "NOME", "DATA NASCIMENTO", "TELEFONE 1", "TELEFONE 2", "TELEFONE 3", 
        "MATRÍCULA", "ÓRGÃO", "SITUAÇÃO FUNCIONAL", "SALÁRIO", "INSTITUIDOR", 
        "REGIME JURÍDICO", "UF", "SALDO 70%", "MARGEM 35%", "BRUTA 5%", 
        "UTILIZADA 5%", "LÍQUIDA 5%", "BENEFÍCIO BRUTA 5%", "BENEFÍCIO UTILIZADA 5%", 
        "BENEFÍCIO LÍQUIDA 5%", "BANCO", "PRAZO", "TIPO"
      ].map(h => `"${h}"`).join(",")
      
      allCsvRows.push(headers)
      
      const pageSize = 200
      let totalProcessed = 0
      let lastCpfInBatch: string | null = null;
      
      const startRange = partIndex * PART_SIZE;
      const endRange = Math.min((partIndex + 1) * PART_SIZE - 1, (campaign.publico_estimado || 0) - 1);
      const totalToExport = Math.max(0, endRange - startRange + 1);

      while (totalProcessed < totalToExport) {
        let targetTable = 'base_consulta_siape';
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
        } else if (convenioKey && TABLE_MAP[convenioKey]) {
          targetTable = TABLE_MAP[convenioKey];
        }

        const columnsToSelect = "cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3, numero_matricula, orgao, situacao_funcional, salario, instituidor_nome, regime_juridico, uf, saldo_70, margem_35, bruta_5, utilizada_5, liquida_5, beneficio_bruta_5, beneficio_utilizada_5, beneficio_liquida_5, banco, prazo, tipo";
        
        let query = supabase.from(targetTable).select(columnsToSelect)

        if (filters.orgaos?.length > 0) {
          const codeFilters = Object.entries(ORGAOS_MAPPING).filter(([, name]) => filters.orgaos.includes(name)).map(([code]) => code);
          const combinedOrgaos = Array.from(new Set([...filters.orgaos, ...codeFilters]));
          if (combinedOrgaos.length > 0) query = query.in('orgao', combinedOrgaos);
        }
        if (filters.situacoes?.length > 0) query = query.in('situacao_funcional', filters.situacoes)
        if (filters.regimes?.length > 0) query = query.in('regime_juridico', filters.regimes)
        if (filters.ufs?.length > 0) query = query.in('uf', filters.ufs)
        if (filters.idadeMin) {
          const d = new Date(); d.setFullYear(d.getFullYear() - parseInt(filters.idadeMin));
          query = query.lte('data_nascimento', d.toISOString().split('T')[0])
        }
        if (filters.idadeMax) {
          const d = new Date(); d.setFullYear(d.getFullYear() - parseInt(filters.idadeMax) - 1); d.setDate(d.getDate() + 1);
          query = query.gte('data_nascimento', d.toISOString().split('T')[0])
        }
        
        const parseSafeNumber = (val: string) => {
          if (!val) return null;
          const clean = val.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
          const num = parseFloat(clean);
          return isNaN(num) ? null : num;
        };

        const mMin = parseSafeNumber(filters.margemMin)
        const mMax = parseSafeNumber(filters.margemMax)
        if (mMin !== null) query = query.gte('margem_35', mMin)
        if (mMax !== null) query = query.lte('margem_35', mMax)

        const sMin = parseSafeNumber(filters.saldoMin)
        if (sMin !== null) query = query.gte('saldo_70', sMin)
        
        const cMMin = parseSafeNumber(filters.cardMargemMin)
        if (cMMin !== null) query = query.gte('liquida_5', cMMin)
        const cBMin = parseSafeNumber(filters.cardBeneficioMin)
        if (cBMin !== null) query = query.gte('beneficio_liquida_5', cBMin)

        if (filters.loanBanks?.length > 0) query = query.in('banco', filters.loanBanks)
        
        const hasCardTypeFilter = filters.cardTypes?.length > 0 && !filters.cardTypes.includes('__ACTIVE__') || (filters.cardTypes?.length > 1);
        if (hasCardTypeFilter) {
          const cleanCardTypes = filters.cardTypes?.filter((t: string) => t !== '__ACTIVE__') || [];
          const cardQueryCodes = Object.entries(CONTRATOS_TIPO_MAPPING).filter(([, info]) => cleanCardTypes.includes(info.label)).map(([code]) => code);
          if (cardQueryCodes.length > 0) query = query.in('tipo_prefix', cardQueryCodes);
        }

        const pMin = parseInt(filters.loanPrazoMin)
        const pMax = parseInt(filters.loanPrazoMax)
        if (!isNaN(pMin)) query = query.gte('prazo', pMin)
        if (!isNaN(pMax)) query = query.lte('prazo', pMax)

        query = query.order('cpf', { ascending: true })

        let bcrData, bcrError;
        if (totalProcessed === 0) {
          const { data, error } = await query.range(startRange, startRange + pageSize - 1)
          bcrData = data; bcrError = error;
        } else if (lastCpfInBatch) {
          const { data, error } = await query.gt('cpf', lastCpfInBatch).limit(pageSize)
          bcrData = data; bcrError = error;
        }

        if (bcrError) throw bcrError
        if (!bcrData || bcrData.length === 0) break;

        lastCpfInBatch = bcrData[bcrData.length - 1].cpf as string;
        bcrData.forEach((row) => {
          const csvRow = [
            row.cpf, row.nome, row.data_nascimento || "",
            row.telefone_1 || "", row.telefone_2 || "", row.telefone_3 || "", 
            row.numero_matricula || "", row.orgao || "", row.situacao_funcional || "",
            row.salario || 0, row.instituidor_nome || "", row.regime_juridico || "", row.uf || "",
            row.saldo_70 || 0, row.margem_35 || 0, row.bruta_5 || 0, row.utilizada_5 || 0,
            row.liquida_5 || 0, row.beneficio_bruta_5 || 0, row.beneficio_utilizada_5 || 0, row.beneficio_liquida_5 || 0,
            row.banco || "", row.prazo || "", row.tipo || ""
          ].map(val => `"${String(val || "").replace(/"/g, '""')}"`).join(",")
          allCsvRows.push(csvRow)
        })

        totalProcessed += bcrData.length;
        setExportProgress(Math.min(Math.round((totalProcessed / totalToExport) * 100), 100))
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      const csvContent = allCsvRows.join("\n")
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `campanha_${campaign.nome.toLowerCase().replace(/\s+/g, '_')}_p${partIndex+1}.csv`
      link.click()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      alert("Erro ao exportar: " + errorMsg)
    } finally {
      setIsExporting(null); setExportProgress(0)
    }
  }

  const filteredCampaigns = campaigns.filter(c => 
    c.nome.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedCampaigns = filteredCampaigns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      <Header title="CAMPANHAS" />
      
      <div className={cn(
        "p-4 lg:p-8 space-y-8 mx-auto w-full pb-20 transition-all duration-300",
        isCollapsed ? "max-w-full lg:px-12" : "max-w-[1600px]"
      )}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-black text-[#1C2643] tracking-tighter">
              Acessar Campanhas
            </h1>
            <p className="text-[12px] font-bold text-[#718198] uppercase tracking-[0.25em] mt-2">
              Campanhas distribuídas para sua equipe
            </p>
          </motion.div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar campanha..." 
                className="pl-10 h-10 border-none bg-slate-50 rounded-xl text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:bg-slate-50 rounded-xl">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Carregando campanhas da sua equipe...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-red-50 rounded-[32px] border border-red-100">
            <Info className="w-10 h-10 text-red-400" />
            <p className="text-sm font-bold text-red-500 uppercase tracking-widest text-center px-8">
              Ocorreu um erro ao carregar as campanhas: {error}
            </p>
            <Button variant="outline" onClick={fetchCampaigns} className="mt-2 border-red-200 text-red-500 hover:bg-red-100 rounded-xl">
              Tentar Novamente
            </Button>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-slate-200 border-dashed p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-[#1C2643] mb-2 uppercase tracking-tight">Nenhuma Campanha Liberada</h3>
            <p className="text-sm text-slate-500 max-w-sm">Você ainda não possui campanhas distribuídas para sua equipe. Entre em contato com o administrador.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedCampaigns.map((campaign) => (
              <motion.div
                key={campaign.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="group border-none rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden bg-white hover:-translate-y-1">
                  <CardContent className="p-0">
                    <div className="p-6 pb-2">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                          <Target className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Público</span>
                          <span className="text-sm font-black text-slate-900">
                            {campaign.publico_estimado.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="text-[15px] font-black text-[#1C2643] uppercase tracking-tight line-clamp-2 min-h-[40px]">
                        {campaign.nome}
                      </h3>
                      
                      <div className="mt-4 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none pt-0.5">
                          {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 pt-4 flex flex-col gap-3">
                      <Button 
                        onClick={() => {
                          setSelectedCampaignForFilters(campaign);
                          setShowFiltersModal(true);
                        }}
                        variant="ghost" 
                        size="sm"
                        className="w-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-2xl text-[10px] font-bold uppercase tracking-widest gap-2"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver Filtros
                      </Button>

                      {campaign.publico_estimado > PART_SIZE ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            onClick={() => handleExport(campaign, 0)}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest h-11"
                            disabled={isExporting !== null}
                          >
                            {isExporting?.startsWith(campaign.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Parte 1"}
                          </Button>
                          <Button 
                            onClick={() => handleExport(campaign, 1)}
                            className="bg-slate-900 hover:bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest h-11"
                            disabled={isExporting !== null || campaign.publico_estimado <= PART_SIZE}
                          >
                            Parte 2
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => handleExport(campaign)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] h-11 shadow-lg shadow-blue-100 gap-2"
                          disabled={isExporting !== null}
                        >
                          {isExporting?.startsWith(campaign.id) ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{exportProgress}%</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              Exportar Lote
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-slate-200"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  className={cn(
                    "h-10 w-10 rounded-xl text-[10px] font-bold",
                    currentPage === i + 1 ? "bg-blue-600" : "border-slate-200"
                  )}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-slate-200"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Modal de Filtros (Reutilizado) */}
      <Dialog open={showFiltersModal} onOpenChange={setShowFiltersModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-black uppercase tracking-tight text-[#1C2643]">
              Resumo da Campanha: {selectedCampaignForFilters?.nome}
            </DialogTitle>
            <DialogDescription className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
              Segmentação aplicada nesta campanha
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            {selectedCampaignForFilters?.filtros && Object.keys(selectedCampaignForFilters.filtros).length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {selectedCampaignForFilters.filtros.orgaos?.length > 0 && (
                  <FilterAccordion title="Órgãos" count={selectedCampaignForFilters.filtros.orgaos.length}>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedCampaignForFilters.filtros.orgaos.map((item: string) => (
                        <span key={item} className="text-[9px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg font-bold uppercase border border-blue-100">{item}</span>
                      ))}
                    </div>
                  </FilterAccordion>
                )}

                {selectedCampaignForFilters.filtros.ufs?.length > 0 && (
                  <FilterAccordion title="Estados (UF)" count={selectedCampaignForFilters.filtros.ufs.length}>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedCampaignForFilters.filtros.ufs.map((item: string) => (
                        <span key={item} className="text-[9px] bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg font-bold uppercase border border-slate-200">{item}</span>
                      ))}
                    </div>
                  </FilterAccordion>
                )}

                {(selectedCampaignForFilters.filtros.margemMin || selectedCampaignForFilters.filtros.margemMax) && (
                  <FilterAccordion title="Margem 35%">
                    <div className="pt-2">
                      <div className="text-[12px] font-bold text-slate-700 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-black">Intervalo</span>
                        <span>R$ {selectedCampaignForFilters.filtros.margemMin || "0"} a R$ {selectedCampaignForFilters.filtros.margemMax || "∞"}</span>
                      </div>
                    </div>
                  </FilterAccordion>
                )}

                {selectedCampaignForFilters.filtros.cardTypes?.length > 0 && (
                  <FilterAccordion title="Tipos de Cartão">
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedCampaignForFilters.filtros.cardTypes.filter((t: string) => t !== '__ACTIVE__').map((item: string) => (
                        <span key={item} className="text-[9px] bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg font-bold uppercase border border-rose-100">{item}</span>
                      ))}
                    </div>
                  </FilterAccordion>
                )}
              </div>
            ) : (
              <p className="text-center py-12 text-slate-400 text-sm italic">Dados de filtros indisponíveis.</p>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50 flex justify-end">
            <Button 
              onClick={() => setShowFiltersModal(false)}
              className="h-12 px-8 bg-slate-900 hover:bg-black text-white text-[11px] font-bold uppercase tracking-widest rounded-2xl"
            >
              Fechar Visualização
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
