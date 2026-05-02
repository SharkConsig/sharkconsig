"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { 
  Search, 
  Filter, 
  PlusCircle,
  Info,
  Wallet,
  Landmark,
  CreditCard,
  Check,
  Loader2,
  Users,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ORGAOS_MAPPING } from "@/lib/orgaos-mapping"
import { supabase } from "@/lib/supabase"
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
  const { canAccessAdminAreas, isLoading: authLoading } = useAuth()
  const [filters, setFilters] = useState({
    orgaos: [] as string[],
    situacoes: [] as string[],
    regimes: [] as string[],
    ufs: [] as string[],
    margemMin: "",
    margemMax: "",
    saldoMin: "",
    saldoMax: "" as string,
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

  useEffect(() => {
    if (!authLoading && !canAccessAdminAreas) {
      router.replace('/')
    }
  }, [authLoading, canAccessAdminAreas, router])

  const [isCalculating, setIsCalculating] = useState(false)
  const [estimatedAudience, setEstimatedAudience] = useState(0)
  const [campaignName, setCampaignName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [loanBanksList, setLoanBanksList] = useState<string[]>([
    "BANCO BMG", "BANCO DO BRASIL", "BANCO PAN", "BANCO SANTANDER", 
    "BANCO SEGURO", "BANRISUL", "BRB FINANCEIRA", "BANCO BRB", 
    "CAIXA ECONOMICA FEDERAL", "CAPITAL", "BANCO DAYCOVAL", 
    "BANCO DIGIMAIS", "BANCO DIGIO", "EAGLE", "BANCO ITAU CONSIGNADO", 
    "BANCO ITAU", "MEUCASH", "NEOCREDITO", "NUBANK", "PARANA BANCO", 
    "SABEMI", "BANCO SAFRA", "XNBANK", "BANCO C6", "BANCO BRADESCO",
    "BANCO INTERMEDIUM", "BANCO PAULISTA", "INBURSA", "LECCA"
  ])

  useEffect(() => {
    // Busca de bancos removida para nova implementação
    setLoanBanksList([
      "BANCO BMG", "BANCO DO BRASIL", "BANCO PAN", "BANCO SANTANDER", 
      "BANCO SEGURO", "BANRISUL", "BRB FINANCEIRA", "BANCO BRB", 
      "CAIXA ECONOMICA FEDERAL", "CAPITAL", "BANCO DAYCOVAL", 
      "BANCO DIGIMAIS", "BANCO DIGIO", "EAGLE", "BANCO ITAU CONSIGNADO", 
      "BANCO ITAU", "MEUCASH", "NEOCREDITO", "NUBANK", "PARANA BANCO", 
      "SABEMI", "BANCO SAFRA", "XNBANK", "BANCO C6", "BANCO BRADESCO",
      "BANCO INTERMEDIUM", "BANCO PAULISTA", "INBURSA", "LECCA"
    ])
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
      
      // Se for cardTypes, garantir o marcador de ativação da lógica binária
      if (category === 'cardTypes' && !next.includes('__ACTIVE__')) {
        next.push('__ACTIVE__');
      }
      
      return { ...prev, [category]: next }
    })
  }

  const selectAll = (category: keyof typeof filters, options: string[]) => {
    setFilters(prev => {
      const next = Array.from(new Set([...(prev[category] as string[]), ...options]));
      
      // Se for cardTypes, garantir o marcador de ativação
      if (category === 'cardTypes' && !next.includes('__ACTIVE__')) {
        next.push('__ACTIVE__');
      }
      
      return {
        ...prev,
        [category]: next
      }
    })
  }

  const clearAll = (category: keyof typeof filters, options: string[]) => {
    setFilters(prev => {
      const current = prev[category] as string[]
      let next = current.filter(v => !options.includes(v));
      
      // Se for cardTypes, também limpamos o marcador se estivermos limpando tudo
      if (category === 'cardTypes') {
        next = next.filter(v => v !== '__ACTIVE__');
      }
      
      return {
        ...prev,
        [category]: next
      }
    })
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
    // Se houver apenas ponto e não for milhar (ex: 1.000), tratamos como decimal: 2183.35 -> 2183.35
    // Se o ponto estiver na posição de milhar e não houver mais nada, parseFloat lida bem ou tratamos.
    // Na prática, se o usuário copiar do banco (ex: 2183.35), o parseFloat(2183.35) funciona.
    
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  };

  const calculateAudience = async () => {
    if (!hasActiveFilters()) return;
    
    setIsCalculating(true);
    try {
      const { 
        orgaos, situacoes, regimes, ufs, 
        saldoMin, 
        cardMargemMin, cardBeneficioMin,
        loanBanks, cardBanks, cardTypes, loanPrazoMin, loanPrazoMax,
        idadeMin, idadeMax 
      } = filters;

      // CONSULTA DIRETA NA TABELA DE SNAPSHOT (SEM JOINS)
      // Usamos apenas o CPF para contagem de alta performance
      let query = supabase.from('base_consulta_rapida').select('cpf', { count: 'exact', head: true });

      // Filtros de Margem 35% no topo para priorizar o uso do índice
      const mMinNum = parseSafeNumber(filters.margemMin);
      const mMaxNum = parseSafeNumber(filters.margemMax);
      
      if (mMinNum !== null || mMaxNum !== null) {
        // Filtro preventivo de nulos para otimizar a performance do índice
        query = query.not("margem_35", "is", null);
        
        if (mMinNum !== null) {
          query = query.gte("margem_35", mMinNum);
        }
        if (mMaxNum !== null) {
          query = query.lte("margem_35", mMaxNum);
        }
      }

      // 1. Filtros de Matrícula
      if (orgaos.length > 0) {
        const codeFilters = Object.entries(ORGAOS_MAPPING)
          .filter(([, name]) => orgaos.includes(name))
          .map(([code]) => code);
        const combinedOrgaos = Array.from(new Set([...orgaos, ...codeFilters]));
        if (combinedOrgaos.length > 0) query = query.in('orgao', combinedOrgaos);
      }
      if (situacoes.length > 0) query = query.in('situacao_funcional', situacoes);
      if (regimes.length > 0) query = query.in('regime_juridico', regimes);
      if (ufs.length > 0) query = query.in('uf', ufs);

      // 2. Filtro de IDADE
      if (idadeMin) {
        const ageMin = parseInt(idadeMin);
        if (!isNaN(ageMin)) {
          const d = new Date();
          d.setFullYear(d.getFullYear() - ageMin);
          const dateStr = d.toISOString().split('T')[0];
          query = query.lte('data_nascimento', dateStr);
        }
      }
      if (idadeMax) {
        const ageMax = parseInt(idadeMax);
        if (!isNaN(ageMax)) {
          const d = new Date();
          d.setFullYear(d.getFullYear() - ageMax - 1);
          d.setDate(d.getDate() + 1);
          const dateStr = d.toISOString().split('T')[0];
          query = query.gte('data_nascimento', dateStr);
        }
      }

      const sMin = parseSafeNumber(saldoMin);
      if (sMin !== null) {
        query = query.not('saldo_70', 'is', null).gte('saldo_70', sMin);
      }
      
      const cMMin = parseSafeNumber(cardMargemMin);
      if (cMMin !== null) {
        query = query.not('liquida_5', 'is', null).gte('liquida_5', cMMin);
      }
      const cBMin = parseSafeNumber(cardBeneficioMin);
      if (cBMin !== null) {
        query = query.not('beneficio_liquida_5', 'is', null).gte('beneficio_liquida_5', cBMin);
      }

      // 4. ITENS DE CRÉDITO (UNIFICADO PARA CARTÕES)
      if (loanBanks.length > 0) query = query.in('banco', loanBanks);
      
      // Lógica de Interseção para Filtros de Cartão (Tipo e Banco)
      const hasCardTypeFilter = cardTypes.length > 0 && !cardTypes.includes('__ACTIVE__') || (cardTypes.length > 1);
      const hasCardBankFilter = cardBanks.length > 0;

      if (hasCardTypeFilter || hasCardBankFilter) {
        // Remove o marcador técnico da lista se estiver presente para não sujar a lógica
        const cleanCardTypes = cardTypes.filter(t => t !== '__ACTIVE__');
        
        const cardQueryCodes = Object.entries(CONTRATOS_TIPO_MAPPING)
          .filter(([, info]) => {
            const matchesType = cleanCardTypes.length === 0 || cleanCardTypes.includes(info.label);
            const matchesBank = !hasCardBankFilter || (info.bank && cardBanks.includes(info.bank));
            return matchesType && matchesBank;
          })
          .map(([code]) => code);
        
        if (cardQueryCodes.length > 0) {
          // Filtro de alta performance usando coluna de prefixo indexada
          query = query.in('tipo_prefix', cardQueryCodes);
        } else if (hasCardTypeFilter && hasCardBankFilter) {
          // Se selecionou filtros sem interseção (ex: Banco X que não tem tipo Y), forçamos resultado vazio
          query = query.eq('tipo', '999999999_FORCE_EMPTY');
        }
      }

      const pMin = parseInt(loanPrazoMin);
      const pMax = parseInt(loanPrazoMax);
      if (!isNaN(pMin)) query = query.gte('prazo', pMin);
      if (!isNaN(pMax)) query = query.lte('prazo', pMax);

      const { count, error } = await query;

      if (error) {
        // Se for timeout (57014) ou erro sem código/vazio, tratamos como silêncio
        const isSilent = error.code === '57014' || !error.code || !error.message;
        
        if (isSilent) {
          console.warn("Timeout ou Resposta Vazia no Supabase: Tratando como zero resultados.");
          setEstimatedAudience(0);
          return;
        }

        console.error("Erro retornado pelo Supabase (detalhado):", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          full: error
        });
        throw error;
      }
      setEstimatedAudience(count || 0);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      // Se for timeout ou resposta vazia, não mostramos o Alerta
      const isSilent = error?.code === '57014' || !error?.code || !error?.message;
      
      console.error("ERRO NO CÁLCULO DE AUDIÊNCIA:", err);
      
      setEstimatedAudience(0);
      
      if (!isSilent) {
        const message = error?.message || "Erro de conexão ou sintaxe no banco de dados. Verifique os campos informados.";
        alert(`Houve um erro ao processar os filtros: ${message}`);
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (estimatedAudience === 0 || !campaignName) return;
    
    setIsCreating(true);
    try {
      // Salvar na tabela 'campanhas'
      // Guardamos apenas os metadados e os filtros para que a exportação seja feita na lista de campanhas
      const { error: saveError } = await supabase.from('campanhas').insert({
        nome: campaignName,
        publico_estimado: estimatedAudience,
        filtros: filters,
        created_at: new Date().toISOString()
      });

      if (saveError) throw saveError;

      alert("Campanha criada com sucesso! Agora você pode exportá-la na lista de 'Minhas Campanhas'.");
      router.push('/campanhas');

    } catch (err: unknown) {
      const error = err as { message?: string; details?: string; hint?: string; code?: string };
      console.error("Erro detalhado ao criar campanha:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: err
      });
      const message = error?.message || "Verifique o console.";
      alert(`Erro ao criar campanha: ${message}`);
    } finally {
      setIsCreating(false);
    }
  }

  // Deriva opções únicas do mapeamento para garantir sincronia
  const CARD_TYPES = Array.from(new Set(Object.values(CONTRATOS_TIPO_MAPPING).map(info => info.label))).sort();
  const CARD_BANKS = Array.from(new Set(Object.values(CONTRATOS_TIPO_MAPPING).map(info => info.bank).filter(Boolean))) as string[];
  CARD_BANKS.sort();

  return (
    <div className="flex-1 flex flex-col">
      <Header title="CRIAR CAMPANHA" />
      
      <div className="p-4 lg:p-8 flex flex-col lg:flex-row gap-8 max-w-[1600px] mx-auto w-full">
        {/* Filters Section */}
        <div className="flex-1 space-y-6 order-2 lg:order-1">
          <p className="text-[13px] font-medium text-slate-400 px-1">Defina os filtros para segmentar seu público-alvo.</p>
          
          {/* 1. IDADE */}
          <Card className={cn(
            "card-shadow transition-all duration-300",
            (filters.idadeMin || filters.idadeMax) ? "ring-1 ring-blue-500/20 bg-blue-50/5" : ""
          )}>
            <CardContent className="p-6 lg:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    (filters.idadeMin || filters.idadeMax) ? "bg-blue-100" : "bg-slate-50"
                  )}>
                    <Users className={cn(
                      "w-4 h-4 transition-colors",
                      (filters.idadeMin || filters.idadeMax) ? "text-blue-600" : "text-slate-400"
                    )} />
                  </div>
                  <h3 className={cn(
                    "text-[10.5px] font-bold uppercase tracking-widest transition-colors",
                    (filters.idadeMin || filters.idadeMax) ? "text-blue-600" : "text-slate-400"
                  )}>1. IDADE</h3>
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

          {filterSections.map((section) => {
            const category = CATEGORY_MAP[section.id] as keyof typeof filters;
            const hasSelectedFilters = category && (filters[category] as string[]).length > 0;

            return (
              <Card 
                key={section.id} 
                className={cn(
                  "card-shadow transition-all duration-300",
                  hasSelectedFilters ? "ring-1 ring-blue-500/20 bg-blue-50/5" : ""
                )}
              >
                <CardContent className="p-6 lg:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        hasSelectedFilters ? "bg-blue-100" : "bg-slate-50"
                      )}>
                        <Filter className={cn(
                          "w-4 h-4 transition-colors",
                          hasSelectedFilters ? "text-blue-600" : "text-slate-400"
                        )} />
                      </div>
                      <h3 className={cn(
                        "text-[10.5px] font-bold uppercase tracking-widest transition-colors",
                        hasSelectedFilters ? "text-blue-600" : "text-slate-400"
                      )}>
                        {section.title}
                      </h3>
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
          );
        })}

          {/* 6. MARGEM */}
          <Card className={cn(
            "card-shadow transition-all duration-300",
            (filters.margemMin || filters.margemMax) ? "ring-1 ring-blue-500/20 bg-blue-50/5" : ""
          )}>
            <CardContent className="p-6 lg:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    (filters.margemMin || filters.margemMax) ? "bg-blue-100" : "bg-slate-50"
                  )}>
                    <Wallet className={cn(
                      "w-4 h-4 transition-colors",
                      (filters.margemMin || filters.margemMax) ? "text-blue-600" : "text-slate-400"
                    )} />
                  </div>
                  <h3 className={cn(
                    "text-[10.5px] font-bold uppercase tracking-widest transition-colors",
                    (filters.margemMin || filters.margemMax) ? "text-blue-600" : "text-slate-400"
                  )}>6. MARGEM 35%</h3>
                </div>
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, margemMin: "", margemMax: "" }))}
                  className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-2.5 h-2.5" />
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
                      inputMode="decimal"
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
                      inputMode="decimal"
                      value={filters.margemMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, margemMax: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 7. SALDO 70% */}
          <Card className={cn(
            "card-shadow transition-all duration-300",
            (filters.saldoMin || filters.saldoMax) ? "ring-1 ring-blue-500/20 bg-blue-50/5" : ""
          )}>
            <CardContent className="p-6 lg:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    (filters.saldoMin || filters.saldoMax) ? "bg-blue-100" : "bg-slate-50"
                  )}>
                    <Landmark className={cn(
                      "w-4 h-4 transition-colors",
                      (filters.saldoMin || filters.saldoMax) ? "text-blue-600" : "text-slate-400"
                    )} />
                  </div>
                  <h3 className={cn(
                    "text-[10.5px] font-bold uppercase tracking-widest transition-colors",
                    (filters.saldoMin || filters.saldoMax) ? "text-blue-600" : "text-slate-400"
                  )}>7. SALDO 70%</h3>
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
                      inputMode="decimal"
                      value={filters.saldoMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, saldoMin: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* 8. EMPRÉSTIMOS */}
          <Card className={cn(
            "card-shadow transition-all duration-300",
            (filters.loanBanks.length > 0 || filters.loanPrazoMin || filters.loanPrazoMax) ? "ring-1 ring-blue-500/20 bg-blue-50/5" : ""
          )}>
            <CardContent className="p-6 lg:p-8 space-y-8">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  (filters.loanBanks.length > 0 || filters.loanPrazoMin || filters.loanPrazoMax) ? "bg-blue-100" : "bg-slate-50"
                )}>
                  <CreditCard className={cn(
                    "w-4 h-4 transition-colors",
                    (filters.loanBanks.length > 0 || filters.loanPrazoMin || filters.loanPrazoMax) ? "text-blue-600" : "text-slate-400"
                  )} />
                </div>
                <h3 className={cn(
                  "text-[10.5px] font-bold uppercase tracking-widest transition-colors",
                  (filters.loanBanks.length > 0 || filters.loanPrazoMin || filters.loanPrazoMax) ? "text-blue-600" : "text-slate-400"
                )}>8. EMPRÉSTIMOS</h3>
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

          {/* 9. CARTÕES */}
          <Card className={cn(
            "card-shadow transition-all duration-300",
            (filters.cardMargemMin || filters.cardBeneficioMin || filters.cardTypes.length > 0 || filters.cardBanks.length > 0) ? "ring-1 ring-blue-500/20 bg-blue-50/5" : ""
          )}>
            <CardContent className="p-6 lg:p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    (filters.cardMargemMin || filters.cardBeneficioMin || filters.cardTypes.length > 0 || filters.cardBanks.length > 0) ? "bg-blue-100" : "bg-slate-50"
                  )}>
                    <CreditCard className={cn(
                      "w-4 h-4 transition-colors",
                      (filters.cardMargemMin || filters.cardBeneficioMin || filters.cardTypes.length > 0 || filters.cardBanks.length > 0) ? "text-blue-600" : "text-slate-400"
                    )} />
                  </div>
                  <h3 className={cn(
                    "text-[10.5px] font-bold uppercase tracking-widest transition-colors",
                    (filters.cardMargemMin || filters.cardBeneficioMin || filters.cardTypes.length > 0 || filters.cardBanks.length > 0) ? "text-blue-600" : "text-slate-400"
                  )}>9. CARTÕES</h3>
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
                      inputMode="decimal"
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
                      inputMode="decimal"
                      value={filters.cardBeneficioMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, cardBeneficioMin: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div id="tipo-cartao-section" className="space-y-4 pt-6 border-t border-slate-50 bg-blue-50/10 p-4 rounded-xl shadow-sm border border-blue-100/30">
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

              <div id="banco-cartao-section" className="space-y-4 pt-6 border-t border-slate-50 bg-indigo-50/10 p-5 rounded-2xl mt-6 border border-indigo-100/30 shadow-sm transition-all hover:shadow-md">
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
                {isCalculating && (
                  <div className="absolute inset-0 bg-primary/40 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 gap-2">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
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

              <div className="grid grid-cols-1 gap-3">
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
