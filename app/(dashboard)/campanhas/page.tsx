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
  RefreshCw
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
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

export default function CampaignsPage() {
  const { canAccessAdminAreas, isLoading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSyncBase = async () => {
    setIsSyncing(true)
    try {
      const { error: syncError } = await supabase.rpc('refresh_base_consulta_rapida')
      if (syncError) throw syncError
      alert("Base de consulta rápida sincronizada com sucesso!")
    } catch (err: any) {
      console.error("Erro ao sincronizar base:", err)
      alert(`Erro ao sincronizar base: ${err.message || "Certifique-se de que a função 'refresh_base_consulta_rapida' foi criada no SQL Editor do Supabase."}`)
    } finally {
      setIsSyncing(false)
    }
  }

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
    } catch (err: any) {
      console.error("Erro ao buscar campanhas:", err)
      setError(err.message || "Ocorreu um erro ao carregar as campanhas.")
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

        if (filters.loanBanks?.length > 0) query = query.in('banco', filters.loanBanks)
        
        // Lógica de Banco do Cartão baseada no prefixo da coluna 'tipo'
        if (filters.cardBanks?.length > 0) {
          const selectedCodes = Object.entries(CONTRATOS_TIPO_MAPPING)
            .filter(([, info]) => info.bank && filters.cardBanks.includes(info.bank))
            .map(([code]) => code);
          
          if (selectedCodes.length > 0) {
            const orFilter = selectedCodes.map(code => `tipo.ilike.${code}%`).join(',');
            query = query.or(orFilter);
          }
        }

        if (filters.cardTypes?.length > 0) {
          // Mapeia as categorias selecionadas (CARTÃO CONSIGNADO / CARTÃO BENEFÍCIO) para os códigos reais
          const selectedCodes = Object.entries(CONTRATOS_TIPO_MAPPING)
            .filter(([, info]) => filters.cardTypes.includes(info.label))
            .map(([code]) => code);
          
          if (selectedCodes.length > 0) {
            // Usa OR com ILIKE para buscar pelos 5 primeiros dígitos (prefixo)
            const orFilter = selectedCodes.map(code => `tipo.ilike.${code}%`).join(',');
            query = query.or(orFilter);
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
          bcrData.forEach((row: any) => {
            // UNICIDADE GARANTIDA POR CPF
            const key = row.cpf
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

    } catch (err: any) {
      console.error("ERRO DETALHADO NA EXPORTAÇÃO:", err)
      alert(`Erro ao exportar campanha: ${err.message || "Verifique o console."}`)
    } finally {
      setIsExporting(null)
    }
  }

  const filteredCampaigns = campaigns.filter(c => 
    c.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col relative">
      <Header title="MINHAS CAMPANHAS" />
      
      {/* Modal de exportação removido para nova implementação */}
      
      <div className="p-4 lg:p-8 space-y-8 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest text-center md:text-left">Gerencie seus públicos e estratégias de vendas.</p>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <Button 
               variant="outline"
               onClick={handleSyncBase}
               disabled={isSyncing}
               className="w-full md:w-auto h-10 px-6 text-[11px] font-bold uppercase tracking-widest border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
            >
              {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
              {isSyncing ? "Sincronizando..." : "Sincronizar Base"}
            </Button>
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
                                        />
                                      }
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
                                    </DropdownMenuTrigger>
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
