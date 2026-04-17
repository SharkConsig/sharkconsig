"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
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
  Download
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { ORGAOS_MAPPING } from "@/lib/orgaos-mapping"
import { supabase } from "@/lib/supabase"

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

  const handleExport = async (campaign: Campaign) => {
    if (isExporting) return
    setIsExporting(campaign.id)
    setExportProgress(0)
    
    try {
      const filters = campaign.filtros
      const hasItemFilters = (filters.loanBanks?.length || 0) > 0 || 
                          (filters.cardBanks?.length || 0) > 0 || 
                          filters.loanPrazoMin !== "" || 
                          filters.loanPrazoMax !== "";

      const allCsvRows: string[] = []
      const uniqueRowsKeys = new Set()
      
      let page = 0
      const pageSize = 1000 
      let hasMore = true

      // ESTRATÉGIA OTIMIZADA: Escolhemos o ponto de entrada mais seletivo
      const hasMatriculaFilters = (filters.orgaos?.length || 0) > 0 || 
                                 (filters.situacoes?.length || 0) > 0 || 
                                 (filters.regimes?.length || 0) > 0 || 
                                 (filters.ufs?.length || 0) > 0;
      
      const hasFinanceFilters = filters.margemMin || filters.margemMax || 
                               filters.saldoMin || filters.saldoMax || 
                               filters.cardMargemMin || filters.cardBeneficioMin ||
                               (filters.cardTypes?.length || 0) > 0;

      const hasAgeFilters = !!(filters.idadeMin || filters.idadeMax);

      // Se SÓ houver filtro de idade, começamos pela tabela 'clientes' (menor volume)
      // Se houver qualquer filtro de vínculo ou financeiro, começamos por 'matriculas'
      const baseTable = (hasMatriculaFilters || hasFinanceFilters || hasItemFilters) ? 'matriculas' : 'clientes';
      const cpfColumn = baseTable === 'matriculas' ? 'cliente_cpf' : 'cpf';

      while (hasMore) {
        const from = page * pageSize
        const to = from + pageSize - 1

        let selectStr = cpfColumn;
        if (baseTable === 'matriculas') {
          if (hasAgeFilters) selectStr += ', clientes!inner(cpf)'
          if (hasFinanceFilters || hasItemFilters) {
            selectStr += `, instituidores!inner(id${hasItemFilters ? ', itens_credito!inner(id)' : ''})`
          }
        } else {
          // Se base for clientes e houver outros filtros
          if (hasMatriculaFilters || hasFinanceFilters || hasItemFilters) {
             selectStr += `, matriculas!inner(id${hasFinanceFilters || hasItemFilters ? `, instituidores!inner(id${hasItemFilters ? ', itens_credito!inner(id)' : ''})` : ''})`
          }
        }

        let cpfQuery = supabase
          .from(baseTable)
          .select(selectStr)
          .range(from, to)

        // Aplicação Dinâmica de Filtros
        // 1. Filtros de Matrícula
        const matriculaPrefix = baseTable === 'matriculas' ? '' : 'matriculas.'
        if (filters.orgaos?.length > 0) {
          const codeFilters = Object.entries(ORGAOS_MAPPING)
            .filter(([, name]) => filters.orgaos.includes(name))
            .map(([code]) => code);
          if (codeFilters.length > 0) cpfQuery = cpfQuery.in(`${matriculaPrefix}orgao`, codeFilters);
        }
        if (filters.situacoes?.length > 0) cpfQuery = cpfQuery.in(`${matriculaPrefix}situacao_funcional`, filters.situacoes)
        if (filters.regimes?.length > 0) cpfQuery = cpfQuery.in(`${matriculaPrefix}regime_juridico`, filters.regimes)
        if (filters.ufs?.length > 0) cpfQuery = cpfQuery.in(`${matriculaPrefix}uf`, filters.ufs)

        // 2. Filtros de Cliente (Idade)
        const clientePrefix = baseTable === 'clientes' ? '' : 'clientes.'
        if (filters.idadeMin) {
          const d = new Date()
          d.setFullYear(d.getFullYear() - parseInt(filters.idadeMin))
          cpfQuery = cpfQuery.lte(`${clientePrefix}data_nascimento`, d.toISOString().split('T')[0])
        }
        if (filters.idadeMax) {
          const d = new Date()
          d.setFullYear(d.getFullYear() - parseInt(filters.idadeMax) - 1)
          d.setDate(d.getDate() + 1)
          cpfQuery = cpfQuery.gte(`${clientePrefix}data_nascimento`, d.toISOString().split('T')[0])
        }
        
        // 3. Filtros Financeiros (Margem e Saldo via Tabela Instituidores)
        const instPrefix = baseTable === 'matriculas' ? 'instituidores.' : 'matriculas.instituidores.'
        
        // --- Filtro MARGEM 35% ---
        const mMin = parseSafeNumber(filters.margemMin)
        const mMax = parseSafeNumber(filters.margemMax)
        if (mMin !== null || mMax !== null) {
          // Excluir NULLs conforme solicitado
          cpfQuery = cpfQuery.not(`${instPrefix}margem_35`, 'is', null);
          
          if (mMin !== null && mMax !== null) {
            cpfQuery = cpfQuery.gte(`${instPrefix}margem_35`, mMin)
                               .lte(`${instPrefix}margem_35`, mMax);
          } else if (mMin !== null) {
            cpfQuery = cpfQuery.gte(`${instPrefix}margem_35`, mMin);
          } else if (mMax !== null) {
            cpfQuery = cpfQuery.lte(`${instPrefix}margem_35`, mMax);
          }
        }

        // --- Filtro SALDO 70% ---
        const sMin = parseSafeNumber(filters.saldoMin)
        const sMax = parseSafeNumber(filters.saldoMax)
        if (sMin !== null || sMax !== null) {
          // Excluir NULLs conforme solicitado
          cpfQuery = cpfQuery.not(`${instPrefix}saldo_70`, 'is', null);
          
          if (sMin !== null && sMax !== null) {
            cpfQuery = cpfQuery.gte(`${instPrefix}saldo_70`, sMin)
                               .lte(`${instPrefix}saldo_70`, sMax);
          } else if (sMin !== null) {
            cpfQuery = cpfQuery.gte(`${instPrefix}saldo_70`, sMin);
          } else if (sMax !== null) {
            cpfQuery = cpfQuery.lte(`${instPrefix}saldo_70`, sMax);
          }
        }
        
        // --- Filtro CARTÕES (Líquida 5% e Benefício Líquida 5%) ---
        const cMMin = parseSafeNumber(filters.cardMargemMin)
        if (cMMin !== null) {
          cpfQuery = cpfQuery.not(`${instPrefix}liquida_5`, 'is', null)
                             .gte(`${instPrefix}liquida_5`, cMMin)
        }
        const cBMin = parseSafeNumber(filters.cardBeneficioMin)
        if (cBMin !== null) {
          cpfQuery = cpfQuery.not(`${instPrefix}beneficio_liquida_5`, 'is', null)
                             .gte(`${instPrefix}beneficio_liquida_5`, cBMin)
        }

        // --- Lógica de Botões de Cartão (Consignado e Benefício) ---
        const cardTypes = filters.cardTypes || [];
        const isCardBinaryActive = cardTypes.includes('__ACTIVE__');
        
        if (isCardBinaryActive) {
          const isConsignadoSelected = cardTypes.includes("CARTÃO CONSIGNADO");
          const isBeneficioSelected = cardTypes.includes("CARTÃO BENEFÍCIO");
          const fTable = instPrefix.endsWith('.') ? instPrefix.slice(0, -1) : instPrefix;

          if (isConsignadoSelected) {
            cpfQuery = cpfQuery.not(`${instPrefix}utilizada_5`, 'is', null)
                               .neq(`${instPrefix}utilizada_5`, 0);
          } else {
            cpfQuery = cpfQuery.or(`utilizada_5.eq.0,utilizada_5.is.null`, { foreignTable: fTable });
          }

          if (isBeneficioSelected) {
            cpfQuery = cpfQuery.not(`${instPrefix}beneficio_utilizada_5`, 'is', null)
                               .neq(`${instPrefix}beneficio_utilizada_5`, 0);
          } else {
            cpfQuery = cpfQuery.or(`beneficio_utilizada_5.eq.0,beneficio_utilizada_5.is.null`, { foreignTable: fTable });
          }
        }

        if (hasItemFilters) {
          const itemPrefix = `${instPrefix}itens_credito.`
          if (filters.loanBanks?.length > 0) cpfQuery = cpfQuery.in(`${itemPrefix}banco`, filters.loanBanks)
          if (filters.cardBanks?.length > 0) cpfQuery = cpfQuery.in(`${itemPrefix}banco`, filters.cardBanks)
          if (filters.loanPrazoMin) cpfQuery = cpfQuery.gte(`${itemPrefix}prazo`, parseInt(filters.loanPrazoMin))
          if (filters.loanPrazoMax) cpfQuery = cpfQuery.lte(`${itemPrefix}prazo`, parseInt(filters.loanPrazoMax))
        }

        const { data: cpfData, error: cpfError } = await cpfQuery
        if (cpfError) throw cpfError

        if (!cpfData || cpfData.length === 0) {
          hasMore = false
        } else {
          // Passo 2: Buscar Dados Detalhados por CPF
          // Atuamos SEMPRE somente nos CPFs filtrados na etapa anterior
          const cpfsInBatch = Array.from(new Set(cpfData.map((item: any) => item[cpfColumn])))
            
            const { data: fullData, error: fullError } = await supabase
              .from('clientes')
              .select(`
                cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
                matriculas (
                  numero_matricula, orgao, situacao_funcional, salario, regime_juridico, uf,
                  instituidores (
                    nome, saldo_70, margem_35, bruta_5, utilizada_5, liquida_5, beneficio_bruta_5, beneficio_utilizada_5, beneficio_liquida_5
                  )
                )
              `)
              .in('cpf', cpfsInBatch)

            if (fullError) throw fullError

            // Passo 3: Montar linhas do CSV
            fullData?.forEach((client: any) => {
              client.matriculas?.forEach((matricula: any) => {
                matricula.instituidores?.forEach((inst: any) => {
                  const key = `${client.cpf}_${matricula.numero_matricula}_${inst.nome}`
                  if (uniqueRowsKeys.has(key)) return
                  uniqueRowsKeys.add(key)

                  const row = [
                    client.cpf,
                    client.nome,
                    client.data_nascimento || "",
                    client.telefone_1 || "",
                    client.telefone_2 || "",
                    client.telefone_3 || "",
                    matricula.numero_matricula || "",
                    matricula.orgao || "",
                    matricula.situacao_funcional || "",
                    matricula.salario || 0,
                    inst.nome || "",
                    matricula.regime_juridico || "",
                    matricula.uf || "",
                    inst.saldo_70 || 0,
                    inst.margem_35 || 0,
                    inst.bruta_5 || 0,
                    inst.utilizada_5 || 0,
                    inst.liquida_5 || 0,
                    inst.beneficio_bruta_5 || 0,
                    inst.beneficio_utilizada_5 || 0,
                    inst.beneficio_liquida_5 || 0
                  ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
                  
                  allCsvRows.push(row)
                })
              })
            })

            if (cpfData.length < pageSize) {
              hasMore = false
            } else {
              page++
            }
            
            const countForProgress = campaign.publico_estimado || 1
            const progress = Math.min(Math.round((allCsvRows.length / countForProgress) * 100), 99)
            setExportProgress(progress)
          }

          if (allCsvRows.length >= 1000000) hasMore = false
        }

      if (allCsvRows.length === 0) {
        alert("Nenhum dado encontrado para esta campanha.")
        return
      }

      setExportProgress(100)
      const headers = [
        "cpf", "nome", "data_de_nascimento", "telefone_1", "telefone_2", "telefone_3",
        "matricula", "orgao", "situacao_funcional", "salario", "instituidor", "regime_juridico", "uf",
        "saldo_70%", "margem_35%", "bruta_5", "utilizada_5", "liquida_5", "beneficio_bruta_5", "beneficio_utilizada_5", "beneficio_liquida_5"
      ]
      
      const csvContent = [headers.join(","), ...allCsvRows].join("\n")
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `campanha_${campaign.nome.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

    } catch (err: any) {
      console.error("ERRO DETALHADO NA EXPORTAÇÃO:", {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
        fullError: err
      })
      alert(`Erro ao exportar campanha: ${err.message || "Verifique o console para detalhes ou tente novamente."}`)
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
                                  variant="ghost" 
                                  size="sm" 
                                  disabled={isExporting !== null}
                                  className={`h-8 px-3 text-[9px] font-bold uppercase tracking-widest transition-colors ${
                                    isExporting === campaign.id 
                                      ? "text-primary bg-primary/5" 
                                      : "text-slate-400 hover:text-primary hover:bg-primary/5"
                                  }`}
                                >
                                  {isExporting === campaign.id ? (
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
