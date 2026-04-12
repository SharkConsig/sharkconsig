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
  DollarSign,
  Check,
  Download,
  Loader2,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ORGAOS_MAPPING } from "@/lib/orgaos-mapping"
import { CONTRATOS_TIPO_MAPPING } from "@/lib/contratos-mapping"

interface ItemCredito {
  id: string;
  orgao?: string;
  banco?: string;
  tipo?: string;
  prazo?: number;
}

interface Instituidor {
  id: string;
  saldo_70?: number;
  margem_35?: number;
  bruta_5?: number;
  utilizada_5?: number;
  liquida_5?: number;
  beneficio_bruta_5?: number;
  beneficio_utilizada_5?: number;
  beneficio_liquida_5?: number;
  itens_credito?: ItemCredito[];
}

interface Matricula {
  id: string;
  orgao?: string;
  uf?: string;
  salario?: number;
  situacao_funcional?: string;
  regime_juridico?: string;
  instituidores?: Instituidor[];
}

interface Cliente {
  cpf: string;
  nome: string;
  data_nascimento?: string;
  telefone_1?: string;
  telefone_2?: string;
  telefone_3?: string;
  matriculas?: Matricula[];
}

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
  const { isAdmin, isLoading: authLoading } = useAuth()
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
    salarioMin: "",
    salarioMax: "",
  })

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/')
    }
  }, [authLoading, isAdmin, router])

  const [isCalculating, setIsCalculating] = useState(false)
  const [estimatedAudience, setEstimatedAudience] = useState(0)
  const [campaignName, setCampaignName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

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

  const calculateAudience = async () => {
    // Backend logic removed - to be restarted from scratch
    console.log("calculateAudience: Logic removed")
  }

  const handleCreateCampaign = async () => {
    // Backend logic removed - to be restarted from scratch
    console.log("handleCreateCampaign: Logic removed")
  }

  const handleExport = async () => {
    // Backend logic removed - to be restarted from scratch
    console.log("handleExport: Logic removed")
  }

  const LOAN_BANKS = [
    "ALFA", "BMG", "BRADESCO", "BRB", "C6", "DAYCOVAL", 
    "DIGIMAIS", "DIGIO", "DO BRASIL", "INTERMEDIUM", "ITAU", 
    "ITAU CONSIGNADO", "PAN", "SAFRA", "SANTANDER", 
    "SEGURO", "BANRISUL", "BRB FINANCEIRA", "CAIXA ECONOMICA FEDERAL", 
    "CAPITAL CONSIG", "EAGLE", "MEUCASH", "NEOCREDITO", "NUBANK", 
    "PARANA BANCO", "SABEMI", "XNBANK"
  ]
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
            <CardContent className="p-6 lg:p-8 space-y-8">
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

          {/* 7.1. SALÁRIO */}
          <Card className="card-shadow">
            <CardContent className="p-6 lg:p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">7.1. SALÁRIO</h3>
                </div>
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, salarioMin: "", salarioMax: "" }))}
                  className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:underline"
                >
                  Limpar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Salário Mínimo</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                    <Input 
                      className="pl-10 h-11 bg-slate-50/30 border-slate-100 text-[12px]" 
                      placeholder="0,00" 
                      value={filters.salarioMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, salarioMin: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Salário Máximo</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                    <Input 
                      className="pl-10 h-11 bg-slate-50/30 border-slate-100 text-[12px]" 
                      placeholder="0,00" 
                      value={filters.salarioMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, salarioMax: e.target.value }))}
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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banco</h4>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => selectAll("loanBanks", LOAN_BANKS)}
                      className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      Selecionar Todos
                    </button>
                    <button 
                      onClick={() => clearAll("loanBanks", LOAN_BANKS)}
                      className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <Input 
                  placeholder="Localizar banco..." 
                  icon={<Search className="w-4 h-4" />}
                  className="bg-slate-50/30 border-slate-100 h-9 text-[12px]"
                  value={searchQueries["loan_banks"] || ""}
                  onChange={(e) => handleSearch("loan_banks", e.target.value)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {getFilteredOptions(LOAN_BANKS, "loan_banks").map((bank) => (
                    <button 
                      key={bank}
                      title={bank}
                      onClick={() => toggleFilter("loanBanks", bank)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 border rounded-lg text-[10px] font-bold transition-all uppercase tracking-tight text-left",
                        filters.loanBanks.includes(bank) 
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                          : "bg-slate-50/50 border-slate-100 text-slate-500 hover:border-primary hover:text-primary"
                      )}
                    >
                      <span className="truncate mr-2">{bank}</span>
                      {filters.loanBanks.includes(bank) && <Check className="w-3 h-3 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prazo (Meses)</h4>
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, loanPrazoMin: "", loanPrazoMax: "" }))}
                    className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:underline"
                  >
                    Limpar
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Prazo Mínimo</label>
                    <Input 
                      className="h-11 bg-slate-50/30 border-slate-100 text-[12px]" 
                      placeholder="Ex: 12" 
                      value={filters.loanPrazoMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, loanPrazoMin: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Prazo Máximo</label>
                    <Input 
                      className="h-11 bg-slate-50/30 border-slate-100 text-[12px]" 
                      placeholder="Ex: 96" 
                      value={filters.loanPrazoMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, loanPrazoMax: e.target.value }))}
                    />
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

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Cartão</h4>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => selectAll("cardTypes", CARD_TYPES)}
                      className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50 px-2 py-1 rounded-md"
                    >
                      Selecionar Todos
                    </button>
                    <button 
                      onClick={() => clearAll("cardTypes", CARD_TYPES)}
                      className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors bg-slate-50 px-2 py-1 rounded-md"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {CARD_TYPES.map((type) => (
                    <button 
                      key={type}
                      onClick={() => toggleFilter("cardTypes", type)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 border rounded-lg text-[10px] font-bold transition-all uppercase tracking-tight text-left",
                        filters.cardTypes.includes(type) 
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                          : "bg-slate-50/50 border-slate-100 text-slate-500 hover:border-primary hover:text-primary"
                      )}
                    >
                      <span className="truncate mr-2">{type}</span>
                      {filters.cardTypes.includes(type) && <Check className="w-3 h-3 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50 bg-slate-50/20 p-4 rounded-xl mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banco</h4>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => selectAll("cardBanks", CARD_BANKS)}
                      className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50 px-2 py-1 rounded-md"
                    >
                      Selecionar Todos
                    </button>
                    <button 
                      onClick={() => clearAll("cardBanks", CARD_BANKS)}
                      className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors bg-slate-50 px-2 py-1 rounded-md"
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
                  <div className="absolute inset-0 bg-primary/40 backdrop-blur-[1px] flex items-center justify-center z-10">
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
                  className="h-10 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
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
