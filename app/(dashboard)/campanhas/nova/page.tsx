"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { 
  Search, 
  Filter, 
  PlusCircle,
  Info,
  Wallet,
  Landmark,
  CreditCard,
  Check,
  Download,
  Loader2,
  Users,
  X
} from "lucide-react"
import { cn, normalizeText } from "@/lib/utils"
import { useState, useEffect, useRef } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ORGAOS_MAPPING } from "@/lib/orgaos-mapping"
import { CONTRATOS_TIPO_MAPPING } from "@/lib/contratos-mapping"

const orgaoOptions = Array.from(new Set(Object.values(ORGAOS_MAPPING)))
  .filter(name => name && name.trim() !== "")
  .sort();

const filterSections = [
  {
    id: "1",
    title: "2. ÓRGÃO",
    options: orgaoOptions
  },
  {
    id: "2",
    title: "3. SITUAÇÃO FUNCIONAL",
    options: [
      "ANIST PRIVADO L10559", "ANIST PUBLICO L10559", "ANISTIADO ADCT CF",
      "APOSENTADO", "APOSENTADO TCU733 94", "APRENDIZ",
      "ATIVO DEC JUDIC", "ATIVO EM OUTRO ORGAO", "ATIVO PERMANENTE",
      "BENEFICIARIO PENSAO", "CDT PROF TUT MMEDICO", "CEDIDO REQUISITADO",
      "CEDIDO SUS LEI 8270", "CELETISTA", "CELETISTA DEC JUDIC",
      "CELETISTA EMPREGADO", "CLT ANS DEC 6657 08", "CLT ANS DEC JUDICIAL",
      "CLT ANS JUD CEDIDO", "CLT APOS COMPLEMENTO", "CLT APS DEC JUDICIAL",
      "COLAB PCCTAE E MAGIS", "CONT PROF SUBSTITUTO", "CONT PROF TEMPORARIO",
      "CONTR PROF VISITANTE", "CONTR TEMPORARIO CLT", "CONTRATO TEMPORARIO",
      "EMPREGO PCC EX TERRI", "EMPREGO PUBLICO", "EXCEDENTE A LOTACAO",
      "EXERC 7 ART93 8112", "EXERC DESCENT CARREI", "EXERCICIO PROVISORIO",
      "NATUREZA ESPECIAL", "NOMEADO CARGO COMIS", "QUADRO ESPEC QE MRE",
      "QE MRE CEDIDO", "REFORMA CBM PM", "REQ DE OUTROS ORGAOS",
      "RESERVA CBM PM", "RESIDENCIA E PMM", "SEM VINCULO"
    ]
  },
  {
    id: "3",
    title: "4. REGIME JURÍDICO",
    options: [
      "ANS", "CDT", "CLT", "EST", "MRD", "NES", "RMI"
    ]
  },
  {
    id: "4",
    title: "5. UF (ESTADO)",
    options: [
      "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
    ]
  }
]

import { useAuth } from "@/context/auth-context"

const CATEGORY_MAP: Record<string, string> = {
  "1": "orgaos",
  "2": "situacoes",
  "3": "regimes",
  "4": "ufs"
};

export default function NewCampaignPage() {
  const router = useRouter()
  const { isAdmin, session, isLoading: authLoading } = useAuth()
  const [filters, setFilters] = useState({
    orgaos: [] as string[],
    situacoes: [] as string[],
    regimes: [] as string[],
    ufs: [] as string[],
    margemMin: "",
    margemMax: "",
    saldoMin: "",
    saldoMax: "",
    loanBanks: [] as string[],
    loanPrazoMin: "",
    loanPrazoMax: "",
    cardTypes: [] as string[],
    cardBanks: [] as string[],
    cardMargemMin: "",
    cardBeneficioMin: "",
    idadeMin: "",
    idadeMax: "",
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/')
    }
  }, [authLoading, isAdmin, router])

  const [isCalculating, setIsCalculating] = useState(false)
  const [estimatedAudience, setEstimatedAudience] = useState(0)
  const [campaignName, setCampaignName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [exportProgress, setExportProgress] = useState<{current: number, total: number} | null>(null)
  const [loanBanksList, setLoanBanksList] = useState<string[]>([
    "BANCO BMG", "BANCO DO BRASIL", "BANCO PAN", "BANCO SANTANDER", 
    "BANCO SEGURO", "BANRISUL", "BRB FINANCEIRA", "BANCO BRB", 
    "CAIXA ECONOMICA FEDERAL", "CAPITAL CONSIG", "BANCO DAYCOVAL", 
    "BANCO DIGIMAIS", "BANCO DIGIO", "EAGLE", "BANCO ITAU CONSIGNADO", 
    "BANCO ITAU", "MEUCASH", "NEOCREDITO", "NUBANK", "PARANA BANCO", 
    "SABEMI", "BANCO SAFRA", "XNBANK", "BANCO C6", "BANCO BRADESCO"
  ])

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const { data, error } = await supabase
          .from('itens_credito')
          .select('banco')
          .not('banco', 'is', null);
        
        if (error) throw error;
        
        if (data) {
          const dbBanks = data.map(item => item.banco).filter(Boolean) as string[];
          setLoanBanksList(prev => {
            const combined = new Set([...prev, ...dbBanks]);
            return Array.from(combined).sort();
          });
        }
      } catch (err) {
        console.error("Erro ao buscar bancos:", err);
      }
    };

    fetchBanks();
  }, []);

  const hasActiveFilters = () => {
    return (
      filters.orgaos.length > 0 ||
      filters.situacoes.length > 0 ||
      filters.regimes.length > 0 ||
      filters.ufs.length > 0 ||
      filters.margemMin !== "" ||
      filters.margemMax !== "" ||
      filters.saldoMin !== "" ||
      filters.saldoMax !== "" ||
      filters.loanBanks.length > 0 ||
      filters.loanPrazoMin !== "" ||
      filters.loanPrazoMax !== "" ||
      filters.cardMargemMin !== "" ||
      filters.cardBeneficioMin !== "" ||
      filters.cardTypes.length > 0 ||
      filters.cardBanks.length > 0 ||
      filters.idadeMin !== "" ||
      filters.idadeMax !== ""
    )
  }

  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({
    "1": "", // Órgão
    "2": "", // Situação Funcional
    "3": "", // Regime Jurídico
    "4": "", // UF
    "loan_banks": "",
    "card_banks": "",
  })

  const toggleFilter = (category: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const current = prev[category] as string[]
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [category]: next }
    })
  }

  const selectAll = (category: keyof typeof filters, options: string[]) => {
    setFilters(prev => ({
      ...prev,
      [category]: Array.from(new Set([...(prev[category] as string[]), ...options]))
    }))
  }

  const clearAll = (category: keyof typeof filters, options: string[]) => {
    setFilters(prev => ({
      ...prev,
      [category]: (prev[category] as string[]).filter(v => !options.includes(v))
    }))
  }

  const handleSearch = (id: string, query: string) => {
    setSearchQueries(prev => ({ ...prev, [id]: query }))
  }

  const getFilteredOptions = (options: string[], id: string) => {
    const query = searchQueries[id]?.toLowerCase() || ""
    if (!query) return options
    
    if (id === "1") { // Órgão
      return options.filter(opt => {
        const matchesName = opt.toLowerCase().includes(query);
        // Find if any code for this name matches the query
        const codes = Object.entries(ORGAOS_MAPPING)
          .filter(([, val]) => val === opt)
          .map(([code]) => code);
        const matchesCode = codes.some(code => code.includes(query));
        return matchesName || matchesCode;
      });
    }

    if (id === "loan_banks" || id === "card_banks") {
      return options.filter(opt => {
        const normalizedOpt = opt.toLowerCase();
        const normalizedQuery = query.replace(/^banco\s+/i, "").trim();
        return normalizedOpt.includes(normalizedQuery) || normalizedOpt.includes(query);
      });
    }
    
    return options.filter(opt => opt.toLowerCase().includes(query))
  }

  const parseSafeNumber = (val: string) => {
    if (!val) return NaN;
    // Remove R$, spaces and dots (thousands separator), then replace comma with dot
    const clean = val.replace(/[R$\s.]/g, "").replace(",", ".");
    return parseFloat(clean);
  };

  const calculateAudience = async () => {
    if (!isSupabaseConfigured) return
    
    // Aborta cálculo anterior se houver
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setIsCalculating(true)
    setEstimatedAudience(0)
    
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      // Build query
      let query;
      
      console.log("Calculando audiência com filtros:", filters);

      const orgaoCodes = (filters.orgaos || []).flatMap(name => {
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

      if (hasMatriculasFilter) {
        // Para filtrar por uma tabela relacionada e obter o count da tabela principal,
        // usamos !inner no select. O uso de () vazio evita o retorno de colunas desnecessárias,
        // reduzindo o payload e o tempo de processamento.
        let selectStr = 'cpf, matriculas!inner()';
        if (hasItensCreditoFilter) {
          selectStr = 'cpf, matriculas!inner(instituidores!inner(itens_credito!inner()))';
        } else if (hasInstituidoresFilter) {
          selectStr = 'cpf, matriculas!inner(instituidores!inner())';
        }

        query = supabase
          .from('clientes')
          .select(selectStr, { count: 'exact', head: true });
        
        if (hasOrgaoFilter) query = query.in('matriculas.orgao', orgaoCodes);
        if (hasSituacaoFilter) query = query.in('matriculas.situacao_funcional', filters.situacoes);
        if (hasRegimeFilter) query = query.in('matriculas.regime_juridico', filters.regimes);
        if (hasUfFilter) query = query.in('matriculas.uf', filters.ufs);

        if (hasInstituidoresFilter || hasItensCreditoFilter) {
          if (hasMargemFilter) {
            if (!isNaN(mMin)) {
              console.log("Aplicando margem_35 >= ", mMin, typeof mMin);
              query = query.gte('matriculas.instituidores.margem_35', mMin);
            }
            if (!isNaN(mMax)) {
              console.log("Aplicando margem_35 <= ", mMax, typeof mMax);
              query = query.lte('matriculas.instituidores.margem_35', mMax);
            }
          }
          if (hasSaldoFilter) {
            if (!isNaN(sMin)) query = query.gte('matriculas.instituidores.saldo_70', sMin);
            if (!isNaN(sMax)) query = query.lte('matriculas.instituidores.saldo_70', sMax);
          }
          if (hasCardMargemFilter) {
            query = query.gte('matriculas.instituidores.liquida_5', cmMin);
          }
          if (hasCardBeneficioFilter) {
            query = query.gte('matriculas.instituidores.beneficio_liquida_5', cbMin);
          }

          if (hasItensCreditoFilter) {
            if (hasLoanBankFilter) query = query.in('matriculas.instituidores.itens_credito.banco', filters.loanBanks);
            if (hasLoanPrazoFilter) {
              if (!isNaN(lpMin)) query = query.gte('matriculas.instituidores.itens_credito.prazo', lpMin);
              if (!isNaN(lpMax)) query = query.lte('matriculas.instituidores.itens_credito.prazo', lpMax);
            }
            if (hasCardTypeFilter) {
              const cardTypeCodes = filters.cardTypes.flatMap(type => {
                const normalizedType = normalizeText(type);
                const category = normalizedType === "CARTAO CONSIGNADO" ? "CARTAO_CONSIGNADO" : "CARTAO_BENEFICIO";
                const codes = Object.entries(CONTRATOS_TIPO_MAPPING)
                  .filter(([, info]) => info.category === category)
                  .map(([code]) => code);
                
                console.log(`Mapeando tipo "${type}" (categoria ${category}) para códigos:`, codes);
                // Incluímos também o nome normalizado para cobrir casos onde o código não foi usado na importação
                return [...codes, normalizedType];
              });
              console.log("Filtro cardTypes aplicado com valores:", cardTypeCodes);
              query = query.in('matriculas.instituidores.itens_credito.tipo', cardTypeCodes);
            }
            if (hasCardBankFilter) query = query.in('matriculas.instituidores.itens_credito.banco', filters.cardBanks);
          }
        }
      } else {
        query = supabase
          .from('clientes')
          .select('cpf', { count: 'exact', head: true });
      }

      // Filtro de Idade
      if (filters.idadeMin || filters.idadeMax) {
        const today = new Date();
        if (filters.idadeMin) {
          const minAge = parseInt(filters.idadeMin);
          if (!isNaN(minAge)) {
            const minDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
            query = query.lte('data_nascimento', minDate.toISOString().split('T')[0]);
          }
        }
        if (filters.idadeMax) {
          const maxAge = parseInt(filters.idadeMax);
          if (!isNaN(maxAge)) {
            const maxDate = new Date(today.getFullYear() - (maxAge + 1), today.getMonth(), today.getDate() + 1);
            query = query.gte('data_nascimento', maxDate.toISOString().split('T')[0]);
          }
        }
      }

      const { count, error, status, statusText } = await query.abortSignal(controller.signal)
      
      if (error) {
        console.error("Erro retornado pelo Supabase (Objeto):", error);
        console.error("Erro retornado pelo Supabase (String):", JSON.stringify(error));
        console.error("Status HTTP:", status, statusText);
        
        // Se for erro 500, pode ser timeout ou query muito complexa
        if (status === 500) {
          throw new Error("O servidor do banco de dados encontrou um erro (500). Isso geralmente acontece quando a consulta é muito complexa para o volume de dados atual (1.3M+ registros). Tente aplicar filtros mais específicos (ex: selecione um Órgão ou UF específica) para reduzir a carga no banco.");
        }
        
        throw error;
      }
      
      setEstimatedAudience(count || 0)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      
      console.error("Erro ao calcular audiência. Objeto completo:", err);
      
      let errorMsg = "Erro desconhecido";
      if (err instanceof Error) {
        errorMsg = err.message;
        console.error("Stack trace:", err.stack);
      } else if (typeof err === 'object' && err !== null) {
        const e = err as Record<string, unknown>;
        // Tenta extrair o máximo de informação possível do objeto de erro
        const message = String(e.message || e.error_description || e.error || "");
        const code = String(e.code || "");
        const details = String(e.details || "");
        const hint = String(e.hint || "");
        
        console.error("Detalhes do erro extraídos:", { message, code, details, hint, status: e.status });

        if (message || code || details) {
          errorMsg = `[${code}] ${message} ${details ? `(${details})` : ""} ${hint ? `Dica: ${hint}` : ""}`.trim();
        } else {
          errorMsg = JSON.stringify(err);
        }
      } else {
        errorMsg = String(err);
      }

      if (errorMsg === "{}" || errorMsg === "[]") {
        errorMsg = "Erro de banco de dados ou timeout. Verifique os filtros e tente novamente.";
      }

      toast.error(`Erro ao calcular audiência: ${errorMsg}`);
      setEstimatedAudience(0);
    } finally {
      setIsCalculating(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!campaignName || estimatedAudience === 0) {
      toast.warning("Por favor, defina um nome para a campanha e realize a busca do público.")
      return
    }
    setIsCreating(true)
    
    try {
      if (!session) {
        toast.error("Sessão não encontrada. Por favor, faça login novamente.")
        return
      }
      
      const { error } = await supabase
        .from('campanhas')
        .insert({
          nome: campaignName,
          filtros: filters,
          publico_estimado: estimatedAudience,
          user_id: session.user.id
        })

      if (error) throw error
      
      router.push("/campanhas")
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Erro ao criar campanha:", error)
      toast.error(`Erro ao criar campanha: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleExport = async () => {
    if (estimatedAudience === 0) return
    setIsCalculating(true)
    
    try {
      const orgaoCodes = (filters.orgaos || []).flatMap(name => {
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
      const MAX_TOTAL_RECORDS = 1000000; // Aumentado para 1 milhão
      const FETCH_BATCH_SIZE = 500; // Reduzido para evitar timeouts
      
      setExportProgress({ current: 0, total: estimatedAudience || 0 });
      
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
        const fetchBatch = async (retryCount = 0): Promise<Record<string, unknown>[]> => {
          let cpfQuery = supabase
            .from('clientes')
            .select(selectStr)
            .range(offset, offset + FETCH_BATCH_SIZE - 1);

          // Apply filters to cpfQuery
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
                const cardTypeCodes = filters.cardTypes.flatMap(type => {
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

          const { data, error, status, statusText } = await cpfQuery;
          
          if (error) {
            console.error("Erro na exportação (Supabase):", error);
            console.error("Status HTTP:", status, statusText);

            if (status === 500) {
              throw new Error("O servidor encontrou um erro (500) ao processar a exportação. Isso ocorre devido ao grande volume de dados. Tente filtrar mais o público antes de exportar.");
            }

            if ((error.message?.includes("timeout") || error.code === "57014") && retryCount < 2) {
              console.warn(`[RETRY] Timeout na busca de CPFs, tentativa ${retryCount + 1}...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              return fetchBatch(retryCount + 1);
            }
            throw error;
          }
          return data;
        };

        const cpfData = await fetchBatch();

        if (!cpfData || cpfData.length === 0) {
          hasMore = false;
        } else {
          cpfData.forEach((item: Record<string, unknown>) => uniqueCpfs.add(String(item.cpf)));
          offset += FETCH_BATCH_SIZE;
          if (cpfData.length < FETCH_BATCH_SIZE) hasMore = false;
          
          setExportProgress({ current: uniqueCpfs.size, total: estimatedAudience || uniqueCpfs.size });
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
        link.setAttribute("download", `campanha_export_${new Date().getTime()}.csv`)
        link.style.visibility = "hidden"
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
      toast.error(`Erro ao exportar: ${errorMessage}`)
    } finally {
      setIsCalculating(false)
      setExportProgress(null)
    }
  }

  const CARD_TYPES = ["CARTÃO CONSIGNADO", "CARTÃO BENEFÍCIO"]
  const CARD_BANKS = [
    "AGIBANK", "BARU", "BMG", "DAYCOVAL", "DIGIMAIS", 
    "PAN", "PINE", "SANTANDER", "CAPITAL CONSIG", "EAGLE", 
    "MASTER", "MEUCASH", "NEOCREDITO", "XNBANK"
  ]

  return (
    <div className="flex-1 flex flex-col">
      <Header title="CRIAR CAMPANHA" />
      
      <div className="p-4 lg:p-8 flex flex-col lg:flex-row gap-8 max-w-[1600px] mx-auto w-full">
        {/* Filters Section */}
        <div className="flex-1 space-y-6 order-2 lg:order-1">
          <p className="text-[13px] font-medium text-slate-400 px-1">Defina os filtros para segmentar seu público-alvo.</p>
          
          {/* 1. IDADE */}
          <Card className="card-shadow">
            <CardContent className="p-6 lg:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">1. IDADE</h3>
                </div>
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, idadeMin: "", idadeMax: "" }))}
                  className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:underline"
                >
                  Limpar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Idade Mínima</label>
                  <div className="relative">
                    <Input 
                      className="h-11 bg-slate-50/30 border-slate-100 text-[12px]" 
                      placeholder="Ex: 18" 
                      type="number"
                      value={filters.idadeMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, idadeMin: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Idade Máxima</label>
                  <div className="relative">
                    <Input 
                      className="h-11 bg-slate-50/30 border-slate-100 text-[12px]" 
                      placeholder="Ex: 80" 
                      type="number"
                      value={filters.idadeMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, idadeMax: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {filterSections.map((section) => (
            <Card key={section.id} className="card-shadow">
              <CardContent className="p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                      <Filter className="w-4 h-4 text-slate-400" />
                    </div>
                    <h3 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">{section.title}</h3>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        const category = CATEGORY_MAP[section.id] as keyof typeof filters;
                        if (category) selectAll(category, section.options);
                      }}
                      className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      Selecionar Todos
                    </button>
                    <button 
                      onClick={() => {
                        const category = CATEGORY_MAP[section.id] as keyof typeof filters;
                        if (category) clearAll(category, section.options);
                      }}
                      className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Input 
                    placeholder="Localizar filtro..." 
                    icon={<Search className="w-4 h-4" />}
                    className="bg-slate-50/30 border-slate-100 h-9 text-[12px]"
                    value={searchQueries[section.id] || ""}
                    onChange={(e) => handleSearch(section.id, e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {getFilteredOptions(section.options, section.id).map((option) => {
                    const category = CATEGORY_MAP[section.id] as keyof typeof filters;
                    if (!category) return null;
                    
                    const isSelected = (filters[category] as string[]).includes(option);

                    return (
                      <button 
                        key={option}
                        title={option}
                        onClick={() => toggleFilter(category, option)}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 border rounded-lg text-[10px] font-bold transition-all uppercase tracking-tight text-left",
                          isSelected 
                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                            : "bg-slate-50/50 border-slate-100 text-slate-500 hover:border-primary hover:text-primary"
                        )}
                      >
                        <span className="truncate mr-2">{option}</span>
                        {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 6. MARGEM */}
          <Card className="card-shadow">
            <CardContent className="p-6 lg:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">6. MARGEM 35%</h3>
                </div>
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, margemMin: "", margemMax: "" }))}
                  className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:underline"
                >
                  Limpar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Mínimo</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                    <Input 
                      className="pl-10 h-11 bg-slate-50/30 border-slate-100 text-[12px]" 
                      placeholder="0,00" 
                      value={filters.margemMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, margemMin: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Máximo</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                    <Input 
                      className="pl-10 h-11 bg-slate-50/30 border-slate-100 text-[12px]" 
                      placeholder="0,00" 
                      value={filters.margemMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, margemMax: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 7. SALDO 70% */}
          <Card className="card-shadow">
            <CardContent className="p-6 lg:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                    <Landmark className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">7. SALDO 70%</h3>
                </div>
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, saldoMin: "", saldoMax: "" }))}
                  className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:underline"
                >
                  Limpar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Mínimo</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                    <Input 
                      className="pl-10 h-11 bg-slate-50/30 border-slate-100 text-[12px]" 
                      placeholder="0,00" 
                      value={filters.saldoMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, saldoMin: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor Máximo</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                    <Input 
                      className="pl-10 h-11 bg-slate-50/30 border-slate-100 text-[12px]" 
                      placeholder="0,00" 
                      value={filters.saldoMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, saldoMax: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* 8. EMPRÉSTIMOS */}
          <Card className="card-shadow">
            <CardContent className="p-6 lg:p-8 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">8. EMPRÉSTIMOS</h3>
              </div>

              <div className="space-y-6 bg-slate-50/30 p-5 rounded-xl border border-slate-100/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest">Banco</h4>
                    <p className="text-[8px] text-slate-400 font-medium">Selecione os bancos para filtrar os contratos</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => selectAll("loanBanks", loanBanksList)}
                      className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                    >
                      Selecionar Todos
                    </button>
                    <button 
                      onClick={() => clearAll("loanBanks", loanBanksList)}
                      className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <Input 
                    placeholder="Localizar banco..." 
                    icon={<Search className="w-4 h-4" />}
                    className="bg-white border-slate-200 h-10 text-[12px] shadow-sm focus:ring-2 focus:ring-primary/10"
                    value={searchQueries["loan_banks"] || ""}
                    onChange={(e) => handleSearch("loan_banks", e.target.value)}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                    {getFilteredOptions(loanBanksList, "loan_banks").map((bank) => (
                      <button 
                        key={bank}
                        title={bank}
                        onClick={() => toggleFilter("loanBanks", bank)}
                        className={cn(
                          "flex items-center justify-between px-4 py-3.5 border rounded-xl text-[10px] font-bold transition-all uppercase tracking-tight text-left",
                          filters.loanBanks.includes(bank) 
                            ? "bg-primary border-primary text-white shadow-md shadow-primary/20 scale-[0.98]" 
                            : "bg-white border-slate-100 text-slate-500 hover:border-primary/30 hover:bg-slate-50/50"
                        )}
                      >
                        <span className="truncate mr-2">{bank}</span>
                        {filters.loanBanks.includes(bank) && <Check className="w-3 h-3 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6 bg-slate-50/30 p-5 rounded-xl border border-slate-100/50 hover:border-slate-200/50 transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest group-hover:text-primary transition-colors">Prazo (Meses)</h4>
                    <p className="text-[8px] text-slate-400 font-medium">Defina o intervalo de meses dos contratos</p>
                  </div>
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, loanPrazoMin: "", loanPrazoMax: "" }))}
                    className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-2.5 h-2.5" />
                    Limpar
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                      Prazo Mínimo
                    </label>
                    <div className="relative group/input">
                      <Input 
                        className="h-11 bg-white border-slate-200 text-[12px] shadow-sm focus:ring-2 focus:ring-primary/10 transition-all group-hover/input:border-slate-300" 
                        placeholder="Ex: 12" 
                        type="number"
                        value={filters.loanPrazoMin}
                        onChange={(e) => setFilters(prev => ({ ...prev, loanPrazoMin: e.target.value }))}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <div className="w-[1px] h-4 bg-slate-100" />
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Meses</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                      Prazo Máximo
                    </label>
                    <div className="relative group/input">
                      <Input 
                        className="h-11 bg-white border-slate-200 text-[12px] shadow-sm focus:ring-2 focus:ring-primary/10 transition-all group-hover/input:border-slate-300" 
                        placeholder="Ex: 96" 
                        type="number"
                        value={filters.loanPrazoMax}
                        onChange={(e) => setFilters(prev => ({ ...prev, loanPrazoMax: e.target.value }))}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <div className="w-[1px] h-4 bg-slate-100" />
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Meses</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 8. CARTÕES */}
          <Card className="card-shadow">
            <CardContent className="p-6 lg:p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">9. CARTÕES</h3>
                </div>
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, cardMargemMin: "", cardBeneficioMin: "" }))}
                  className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:underline"
                >
                  Limpar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Líquida 5% (Mínima)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                    <Input 
                      className="pl-10 h-11 bg-slate-50/30 border-slate-100 text-[12px]" 
                      placeholder="Ex: 100,00" 
                      value={filters.cardMargemMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, cardMargemMin: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Benefício Líquida 5% (Mínima)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                    <Input 
                      className="pl-10 h-11 bg-slate-50/30 border-slate-100 text-[12px]" 
                      placeholder="Ex: 100,00" 
                      value={filters.cardBeneficioMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, cardBeneficioMin: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Tipo de Cartão</h4>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => selectAll("cardTypes", CARD_TYPES)}
                      className="text-[9px] font-bold text-primary uppercase tracking-widest hover:text-primary/80 transition-colors px-2 py-1 rounded-md bg-primary/5 hover:bg-primary/10"
                    >
                      Todos
                    </button>
                    <button 
                      onClick={() => clearAll("cardTypes", CARD_TYPES)}
                      className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CARD_TYPES.map((type) => (
                    <button 
                      key={type}
                      onClick={() => toggleFilter("cardTypes", type)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3.5 border rounded-xl text-[10.5px] font-bold transition-all uppercase tracking-tight text-left group",
                        filters.cardTypes.includes(type) 
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 ring-2 ring-primary/10" 
                          : "bg-white border-slate-100 text-slate-500 hover:border-primary/30 hover:bg-slate-50/50"
                      )}
                    >
                      <span className="truncate mr-2">{type}</span>
                      {filters.cardTypes.includes(type) && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50 bg-slate-50/30 p-5 rounded-2xl mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Banco do Cartão</h4>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => selectAll("cardBanks", CARD_BANKS)}
                      className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100/50"
                    >
                      Todos
                    </button>
                    <button 
                      onClick={() => clearAll("cardBanks", CARD_BANKS)}
                      className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors px-2 py-1 rounded-md bg-white hover:bg-slate-50"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <Input 
                  placeholder="Localizar banco..." 
                  icon={<Search className="w-4 h-4" />}
                  className="bg-slate-50/30 border-slate-100 h-9 text-[12px]"
                  value={searchQueries["card_banks"] || ""}
                  onChange={(e) => handleSearch("card_banks", e.target.value)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {getFilteredOptions(CARD_BANKS, "card_banks").map((bank) => (
                    <button 
                      key={bank}
                      title={bank}
                      onClick={() => toggleFilter("cardBanks", bank)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 border rounded-lg text-[10px] font-bold transition-all uppercase tracking-tight text-left",
                        filters.cardBanks.includes(bank) 
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                          : "bg-slate-50/50 border-slate-100 text-slate-500 hover:border-primary hover:text-primary"
                      )}
                    >
                      <span className="truncate mr-2">{bank}</span>
                      {filters.cardBanks.includes(bank) && <Check className="w-3 h-3 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="w-full lg:w-96 lg:sticky lg:top-28 h-fit order-1 lg:order-2 z-20 lg:pt-11">
          <Card className="bg-primary border-none shadow-2xl overflow-hidden card-shadow">
            <CardContent className="px-5 sm:px-6 py-5 sm:py-[22px] space-y-4 sm:space-y-[18px]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-[14px] sm:text-[15px] font-bold text-white tracking-widest">Resumo da Campanha</h3>
              </div>

              <div className="space-y-1 bg-white/5 p-4 sm:p-5 rounded-xl border border-white/10 relative overflow-hidden">
                {(isCalculating || exportProgress) && (
                  <div className="absolute inset-0 bg-primary/40 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 gap-2">
                    {exportProgress && (
                      <button 
                        onClick={() => setExportProgress(null)}
                        className="absolute top-1 right-1 p-1 text-white/50 hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                    {exportProgress && (
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-white uppercase tracking-widest">
                          Exportando...
                        </p>
                        <p className="text-[9px] text-white/70 font-mono">
                          {exportProgress.current.toLocaleString('pt-BR')} / {exportProgress.total.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Público Estimado</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[28px] sm:text-[34px] font-black text-white tracking-tighter">
                    {estimatedAudience.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Clientes Encontrados</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={calculateAudience}
                  disabled={isCalculating || !hasActiveFilters()}
                  variant="secondary" 
                  className="h-10 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                >
                  {isCalculating ? (
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5 mr-2" />
                  )}
                  Buscar
                </Button>
                <Button 
                  onClick={handleExport}
                  disabled={estimatedAudience === 0 || isCalculating}
                  variant="secondary" 
                  className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 transition-all shadow-lg shadow-emerald-500/10"
                >
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Exportar
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest ml-1">Nome da Campanha</label>
                <Input 
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex: Campanha SIAPE SP" 
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-white/20 h-[41px] text-[12px]"
                />
              </div>

              <Button 
                onClick={handleCreateCampaign}
                disabled={estimatedAudience === 0 || !campaignName || isCreating}
                className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-[12px] disabled:opacity-50"
              >
                {isCreating ? (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5 mr-2" />
                )}
                Criar Campanha
              </Button>

              <div className="flex gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                <Info className="w-4 h-4 text-white/30 flex-shrink-0" />
                <p className="text-[9px] text-white/40 leading-relaxed italic">
                  O sistema está buscando CPFs em tempo real com base nos filtros selecionados. O lote final será gerado ao criar a campanha.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
