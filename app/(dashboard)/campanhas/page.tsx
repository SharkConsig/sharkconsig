"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { 
  Search, 
  Plus, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
  Calendar,
  MoreVertical,
  Loader2,
  Info,
  X
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { normalizeText } from "@/lib/utils"
import { useState, useEffect, useCallback } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { ORGAOS_MAPPING } from "@/lib/orgaos-mapping"
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

export default function CampaignsPage() {
  const router = useRouter()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [exportProgress, setExportProgress] = useState<{current: number, total: number} | null>(null)

  const fetchCampaigns = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) return
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: supabaseError } = await supabase
        .from('campanhas')
        .select('*')
        .order('created_at', { ascending: false })

      if (supabaseError) {
        console.error("Erro ao buscar campanhas:", supabaseError.message || supabaseError)
        setError(supabaseError.message)
      } else {
        setCampaigns(data || [])
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Erro inesperado:", error.message || error)
      setError(error.message || "Ocorreu um erro inesperado.")
    } finally {
      setIsLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/')
      return
    }
    fetchCampaigns()
  }, [authLoading, isAdmin, router, fetchCampaigns])

  const parseSafeNumber = (val: string) => {
    if (!val || typeof val !== 'string') return NaN;
    const cleaned = val.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? NaN : parsed;
  };

  const handleExport = async (campaign: Campaign) => {
    if (isExporting) return
    const filters = campaign.filtros
    setIsExporting(true)
    
    try {
      const orgaoCodes = (filters.orgaos || []).flatMap((name: string) => {
        if (name === "Todos") return [];
        return Object.entries(ORGAOS_MAPPING)
          .filter(([, val]) => val === name)
          .map(([code]) => code);
      });

      const hasOrgaoFilter = orgaoCodes.length > 0;
      const hasSituacaoFilter = filters.situacoes?.length > 0 && !filters.situacoes.includes("Todos");
      const hasRegimeFilter = filters.regimes?.length > 0 && !filters.regimes.includes("Todos");
      const hasUfFilter = filters.ufs?.length > 0 && !filters.ufs.includes("Todos");

      const mMin = parseSafeNumber(filters.margemMin);
      const mMax = parseSafeNumber(filters.margemMax);
      const hasMargemFilter = !isNaN(mMin) || !isNaN(mMax);

      const sMin = parseSafeNumber(filters.saldoMin);
      const sMax = parseSafeNumber(filters.saldoMax);
      const hasSaldoFilter = !isNaN(sMin) || !isNaN(sMax);

      const cmMin = parseSafeNumber(filters.cardMargemMin);
      const hasCardMargemFilter = !isNaN(cmMin);

      const cbMin = parseSafeNumber(filters.cardBeneficioMin);
      const hasCardBeneficioFilter = !isNaN(cbMin);

      const hasLoanBankFilter = filters.loanBanks?.length > 0 && !filters.loanBanks.includes("Todos");
      const lpMin = parseInt(filters.loanPrazoMin);
      const lpMax = parseInt(filters.loanPrazoMax);
      const hasLoanPrazoFilter = !isNaN(lpMin) || !isNaN(lpMax);

      const hasCardTypeFilter = filters.cardTypes?.length > 0 && !filters.cardTypes.includes("Todos");
      const hasCardBankFilter = filters.cardBanks?.length > 0 && !filters.cardBanks.includes("Todos");

      const hasInstituidoresFilter = hasMargemFilter || hasSaldoFilter || hasCardMargemFilter || hasCardBeneficioFilter;
      const hasItensCreditoFilter = hasLoanBankFilter || hasLoanPrazoFilter || hasCardTypeFilter || hasCardBankFilter;
      const hasMatriculasFilter = hasOrgaoFilter || hasSituacaoFilter || hasRegimeFilter || hasUfFilter || hasInstituidoresFilter || hasItensCreditoFilter;

      // Phase 1: Fetch matching CPFs first (much faster)
      let matchingCpfs: string[] = [];
      const MAX_TOTAL_RECORDS = 1000000;
      const FETCH_BATCH_SIZE = 1000;
      
      setExportProgress({ current: 0, total: campaign.publico_estimado || 0 });
      
      let selectStr = 'cpf';
      if (hasMatriculasFilter) {
        if (hasItensCreditoFilter) {
          selectStr = 'cpf, matriculas!inner(instituidores!inner(itens_credito!inner()))';
        } else if (hasInstituidoresFilter) {
          selectStr = 'cpf, matriculas!inner(instituidores!inner())';
        } else {
          selectStr = 'cpf, matriculas!inner()';
        }
      }

      let offset = 0;
      let hasMore = true;
      const uniqueCpfs = new Set<string>();

      while (hasMore && uniqueCpfs.size < MAX_TOTAL_RECORDS) {
        let cpfQuery = supabase
          .from('clientes')
          .select(selectStr)
          .range(offset, offset + FETCH_BATCH_SIZE - 1);

        // Apply filters to cpfQuery (same filters as before)
        if (filters.idadeMin || filters.idadeMax) {
          const today = new Date();
          if (filters.idadeMin) {
            const minAge = parseInt(filters.idadeMin);
            if (!isNaN(minAge)) {
              const minDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
              cpfQuery = cpfQuery.lte('data_nascimento', minDate.toISOString().split('T')[0]);
            }
          }
          if (filters.idadeMax) {
            const maxAge = parseInt(filters.idadeMax);
            if (!isNaN(maxAge)) {
              const maxDate = new Date(today.getFullYear() - (maxAge + 1), today.getMonth(), today.getDate() + 1);
              cpfQuery = cpfQuery.gte('data_nascimento', maxDate.toISOString().split('T')[0]);
            }
          }
        }

        if (hasOrgaoFilter) cpfQuery = cpfQuery.in('matriculas.orgao', orgaoCodes);
        if (hasSituacaoFilter) cpfQuery = cpfQuery.in('matriculas.situacao_funcional', filters.situacoes);
        if (hasRegimeFilter) cpfQuery = cpfQuery.in('matriculas.regime_juridico', filters.regimes);
        if (hasUfFilter) cpfQuery = cpfQuery.in('matriculas.uf', filters.ufs);

        if (hasInstituidoresFilter || hasItensCreditoFilter) {
          if (hasMargemFilter) {
            if (!isNaN(mMin)) cpfQuery = cpfQuery.gte('matriculas.instituidores.margem_35', mMin);
            if (!isNaN(mMax)) cpfQuery = cpfQuery.lte('matriculas.instituidores.margem_35', mMax);
          }
          if (hasSaldoFilter) {
            if (!isNaN(sMin)) cpfQuery = cpfQuery.gte('matriculas.instituidores.saldo_70', sMin);
            if (!isNaN(sMax)) cpfQuery = cpfQuery.lte('matriculas.instituidores.saldo_70', sMax);
          }
          if (hasCardMargemFilter) cpfQuery = cpfQuery.gte('matriculas.instituidores.liquida_5', cmMin);
          if (hasCardBeneficioFilter) cpfQuery = cpfQuery.gte('matriculas.instituidores.beneficio_liquida_5', cbMin);

          if (hasItensCreditoFilter) {
            if (hasLoanBankFilter) cpfQuery = cpfQuery.in('matriculas.instituidores.itens_credito.banco', filters.loanBanks);
            if (hasLoanPrazoFilter) {
              if (!isNaN(lpMin)) cpfQuery = cpfQuery.gte('matriculas.instituidores.itens_credito.prazo', lpMin);
              if (!isNaN(lpMax)) cpfQuery = cpfQuery.lte('matriculas.instituidores.itens_credito.prazo', lpMax);
            }
            if (hasCardTypeFilter) {
              const cardTypeCodes = filters.cardTypes.flatMap((type: string) => {
                const normalizedType = normalizeText(type);
                const category = normalizedType === "CARTAO CONSIGNADO" ? "CARTAO_CONSIGNADO" : "CARTAO_BENEFICIO";
                const codes = Object.entries(CONTRATOS_TIPO_MAPPING)
                  .filter(([, info]) => info.category === category)
                  .map(([code]) => code);
                
                return [...codes, normalizedType];
              });
              cpfQuery = cpfQuery.in('matriculas.instituidores.itens_credito.tipo', cardTypeCodes);
            }
            if (hasCardBankFilter) cpfQuery = cpfQuery.in('matriculas.instituidores.itens_credito.banco', filters.cardBanks);
          }
        }

        const { data: cpfData, error: cpfError, status, statusText } = await cpfQuery;
        
        if (cpfError) {
          console.error("Erro na exportação (Supabase):", cpfError);
          console.error("Status HTTP:", status, statusText);
          
          if (status === 500) {
            throw new Error("O servidor encontrou um erro (500) ao processar a exportação. Isso ocorre devido ao grande volume de dados. Tente filtrar mais o público antes de exportar.");
          }
          
          if (cpfError.message?.includes("timeout") || cpfError.code === "57014") {
            throw new Error("A consulta demorou muito tempo. Tente aplicar mais filtros para reduzir o volume de dados.");
          }
          throw cpfError;
        }

        if (!cpfData || cpfData.length === 0) {
          hasMore = false;
        } else {
          cpfData.forEach((item: Record<string, unknown>) => uniqueCpfs.add(String(item.cpf)));
          offset += FETCH_BATCH_SIZE;
          if (cpfData.length < FETCH_BATCH_SIZE) hasMore = false;
          
          setExportProgress({ current: uniqueCpfs.size, total: campaign.publico_estimado || uniqueCpfs.size });
        }
      }

      matchingCpfs = Array.from(uniqueCpfs);

      if (matchingCpfs.length === 0) {
        toast.info("Nenhum cliente encontrado com os filtros aplicados.");
        return;
      }

      // Phase 2: Fetch full details for the matching CPFs in batches
      const csvRows: string[] = [];
      const BATCH_SIZE = 500;
      
      for (let i = 0; i < matchingCpfs.length; i += BATCH_SIZE) {
        const batch = matchingCpfs.slice(i, i + BATCH_SIZE);
        
        setExportProgress({ current: i, total: matchingCpfs.length });

        // Pequeno delay entre batches
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        const { data: batchData, error: batchError } = await supabase
          .from('clientes')
          .select('cpf, nome, telefone_1, telefone_2, telefone_3')
          .in('cpf', batch);

        if (batchError) {
          console.warn("Erro ao buscar batch de detalhes:", batchError);
          continue;
        }

        if (batchData) {
          const batchRows = (batchData as Record<string, unknown>[]).map(c => {
            return [
              String(c.cpf || ""),
              `"${String(c.nome || '')}"`,
              String(c.telefone_1 || ""),
              String(c.telefone_2 || ""),
              String(c.telefone_3 || "")
            ].join(",")
          });
          csvRows.push(...batchRows);
        }
      }

      if (csvRows.length > 0) {
        setExportProgress({ current: matchingCpfs.length, total: matchingCpfs.length });
        const headers = "cpf,nome,telefone 1,telefone 2,telefone 3\n"
        const blob = new Blob([headers + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `campanha_${campaign.nome.replace(/\s+/g, '_')}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err: unknown) {
      console.error("Erro detalhado ao exportar:", err)
      let errorMessage = "Erro desconhecido";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as Record<string, unknown>;
        errorMessage = (errorObj.message as string) || (errorObj.details as string) || (errorObj.hint as string) || JSON.stringify(err);
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      toast.error(`Erro ao exportar dados: ${errorMessage}`)
    } finally {
      setIsExporting(false)
      setExportProgress(null)
    }
  }

  const filteredCampaigns = campaigns.filter(c => 
    c.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col relative">
      <Header title="MINHAS CAMPANHAS" />
      
      {exportProgress && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] flex items-center justify-center">
          <Card className="w-full max-w-xs border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-300 relative">
            <button 
              onClick={() => setExportProgress(null)}
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Exportando Dados</p>
                <p className="text-[10px] text-slate-500 font-medium">Por favor, aguarde enquanto processamos os registros.</p>
              </div>
              <div className="w-full space-y-2">
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Progresso</span>
                  <span>{Math.round((exportProgress.current / exportProgress.total) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-center text-[9px] font-mono text-slate-400">
                  {exportProgress.current.toLocaleString('pt-BR')} / {exportProgress.total.toLocaleString('pt-BR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="p-4 lg:p-8 space-y-8 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest text-center md:text-left">Gerencie seus públicos e estratégias de vendas.</p>
          <Link href="/campanhas/nova" className="w-full md:w-auto">
            <Button className="w-full md:w-auto h-10 px-6 text-[12px] font-bold uppercase tracking-widest">
              <Plus className="w-3.5 h-3.5 mr-2" />
              Nova Campanha
            </Button>
          </Link>
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
                        <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Nome da Campanha</th>
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
                        filteredCampaigns.map((campaign) => (
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
                                <Button 
                                  onClick={() => handleExport(campaign)}
                                  disabled={isExporting}
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 px-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-primary/5 disabled:opacity-30"
                                >
                                  {isExporting ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                  )}
                                  Exportar
                                </Button>
                                <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-300 hover:text-slate-600">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

            <div className="px-8 py-12 flex items-center justify-between border-t border-slate-50">
              <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">Primeira</button>
              <div className="flex items-center gap-4">
                <button className="p-1 text-slate-400 hover:text-primary"><ChevronLeft className="w-5 h-5" /></button>
                <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">1 de 1</span>
                <button className="p-1 text-slate-400 hover:text-primary"><ChevronRight className="w-5 h-5" /></button>
              </div>
              <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">Última</button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
