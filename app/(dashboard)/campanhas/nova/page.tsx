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
  Download,
  Loader2,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ORGAOS_MAPPING } from "@/lib/orgaos-mapping"
import { CONTRATOS_TIPO_MAPPING } from "@/lib/contratos-mapping"

const filterSections = [
  {
    id: "1",
    title: "2. ÓRGÃO",
    options: [
      "ADVOCACIA-GERAL DA UNIAO", "AGENCIA BRASILEIRA DE INTELIGENCIA", "AGENCIA ESPACIAL BRASILEIRA",
      "AGENCIA NAC PETROLEO GAS NAT BIOCOMBUSTI", "AGENCIA NACIONAL DE AGUAS", "AGENCIA NACIONAL DE AVIACAO CIVIL",
      "AGENCIA NACIONAL DE ENERGIA ELETRICA", "AGENCIA NACIONAL DE MINERACAO", "AGENCIA NACIONAL DE SAUDE SUPLEMENTAR",
      "AGENCIA NACIONAL DE TELECOMUNICACOES", "AGENCIA NACIONAL DE VIGILANCIA SANITARIA", "AGENCIA NACIONAL DO CINEMA",
      "AMAZONIA AZUL TECNOLOGIAS DE DEFESA SA", "AMAZONIA AZUL TECNOLOGIAS ...", "ANIST PRIVADO L10559",
      "ANIST PUBLICO L10559", "ANISTIADO ADCT CF", "ANTIGO EST.GUANABARA E DISTRITO FEDERAL",
      "CAIXA DE FINANCIAMENTO IMOB.AERONAUTICA", "CENTRO FED.DE EDUC.TECNOL.MINAS GERAIS", "CENTRO FED.EDUC.TECNOL.CELSO S. FONSECA",
      "CENTRO NAC.TECNO.ELETRONICA AVANCADA S.A", "COLEGIO PEDRO II", "COMANDO DA AERONAUTICA",
      "COMANDO DA MARINHA", "COMANDO DO EXERCITO", "COMISSAO DE VALORES MOBILIARIOS",
      "COMISSAO NACIONAL DE ENERGIA NUCLEAR", "COMPANHIA BRASILEIRA DE TRENS URBANOS", "COMPANHIA DESENV. DO VALE SAO FRANCISCO",
      "COMPANHIA DE PESQUISA DE REC. MINERAIS", "COMPANHIA NACIONAL DE ABASTECIMENTO", "CONSELHO ADMINIST.DE DEFESA ECONOMICA",
      "CONS. DE CONTROLE DE ATIV. FINANCEIRAS", "CONSELHO NAC.DE DESEN.CIEN.E TECNOLOGICO", "CORPO DE BOMBEIROS MILITAR DO DIST FED",
      "DEP.DE CENTRAL.SERV.DE INATIVOS E PENS.", "DEPARTAMENTO DE POLICIA FEDERAL", "DEPARTAMENTO NAC.DE INFRAEST. DE TRANSP.",
      "DEPTO. DE POLICIA RODOVIARIA FEDERAL", "DEPTO. NACIONAL DE OBRAS CONTRA AS SECAS", "EMPRESA BRASIL DE COMUNICACAO",
      "EMPRESA BRASILEIRA DE PESQ. AGROPECUARIA", "EMPRESA BRAS. DE SERVICOS HOSPITALARES", "EMPRESA DE TRENS URBANOS DE PORTO ALEGRE",
      "FUNDACAO ALEXANDRE DE GUSMAO", "FUNDACAO BIBLIOTECA NACIONAL", "FUNDACAO CASA DE RUI BARBOSA",
      "FUND COORD APERF PESSOAL NIVEL SUPERIOR", "FUNDACAO CULTURAL PALMARES", "FUNDACAO ESCOLA NACIONAL DE ADM. PUBLICA",
      "FUNDACAO JOAQUIM NABUCO", "FUND.JORGE DUPRAT FIG. SEG. MED.TRABALHO", "FUNDACAO NACIONAL DE ARTES",
      "FUNDACAO NACIONAL DE SAUDE", "FUNDACAO NACIONAL DOS POVOS INDIGENAS", "FUNDACAO OSORIO",
      "FUNDACAO OSWALDO CRUZ", "FUNDACAO UNIVERSIDADE DE BRASILIA", "FUNDACAO UNIVERSIDADE DE SAO JOAO DEL REI",
      "FUNDACAO UNIVERSIDADE DO AMAZONAS", "FUNDACAO UNIVERSIDADE DO MARANHAO", "FUNDACAO UNIVERSIDADE FED. DO TOCANTINS",
      "FUNDACAO UNIVERSIDADE FEDERAL DE OURO PRETO", "FUNDACAO UNIVERSIDADE FEDERAL DE PELOTAS", "FUNDACAO UNIVERSIDADE FEDERAL DE RONDONIA",
      "FUNDACAO UNIVERSIDADE FEDERAL DE SERGIPE", "FUNDACAO UNIVERSIDADE FEDERAL DO ABC", "FUNDACAO UNIVERSIDADE FEDERAL DO PAMPA",
      "FUNDACAO UNVERSIDADE FEDERAL DO AMAPA", "FUND.UNIV.FED.CIENC.SAUDE D PORTO ALEGRE", "FUND.UNIV.FED.DO VALE DO SAO FRANCISCO",
      "FUNDACAO UNIV. FEDERAL DE UBERLANDIA", "GOVERNO DO EX-TERRITORIO DE RONDONIA", "GOVERNO DO EX-TERRITORIO DO AMAPA",
      "GOVERNO DO EX-TERRITORIO DE RORAIMA", "HOSPITAL DE CLINICAS DE PORTO ALEGRE", "INSTITUTO BRASILEIRO DE MUSEUS",
      "INST. BR. MEIO AMB. REC. NAT. RENOVAVEIS", "INSTITUTO CHICO MENDES CONSERV.BIODIVER.", "INSTITUTO DE PESQUISA ECONOMICA APLICADA",
      "INSTITUTO DE PESQ. JARDIM BOTANICO DO RJ", "INSTITUTO DO PATR.HIST.E ART. NACIONAL", "INSTITUTO FEDERAL BAIANO",
      "INSTITUTO FEDERAL CATARINENSE", "INSTITUTO FEDERAL DA BAHIA", "INSTITUTO FEDERAL DA PARAIBA",
      "INSTITUTO FEDERAL DE ALAGOAS", "INSTITUTO FEDERAL DE BRASILIA", "INSTITUTO FEDERAL DE GOIAS",
      "INSTITUTO FEDERAL DE MATO GROSSO DO SUL", "INSTITUTO FEDERAL DE MINAS GERAIS", "INSTITUTO FEDERAL DE PERNAMBUCO",
      "INSTITUTO FEDERAL DE RONDONIA", "INSTITUTO FEDERAL DE RORAIMA", "INSTITUTO FEDERAL DE SANTA CATARINA",
      "INSTITUTO FEDERAL DE SAO PAULO", "INSTITUTO FEDERAL DE SERGIPE", "INSTITUTO FEDERAL DO ACRE",
      "INSTITUTO FEDERAL DO AMAPA", "INSTITUTO FEDERAL DO AMAZONAS", "INSTITUTO FEDERAL DO ESPIRITO SANTO",
      "INSTITUTO FEDERAL DO MARANHAO", "INSTITUTO FEDERAL DO PARA", "INSTITUTO FEDERAL DO PARANA",
      "INSTITUTO FEDERAL DO PIAUI", "INSTITUTO FEDERAL DO RIO DE JANEIRO", "INSTITUTO FEDERAL DO RIO GRANDE DO NORTE",
      "INSTITUTO FEDERAL DO RIO GRANDE DO SUL", "INSTITUTO FEDERAL DO SERTAO PERNAMBUCANO", "INSTITUTO FEDERAL DO SUL DE MINAS GERAIS",
      "INSTITUTO FEDERAL DO TOCANTINS", "INSTITUTO FEDERAL DO TRIANGULO MINEIRO", "INSTITUTO FEDERAL FARROUPILHA",
      "INSTITUTO FEDERAL FLUMINENSE", "INSTITUTO FEDERAL GOIANO", "INSTITUTO FEDERAL SUL RIO-GRANDENSE",
      "INSTITUTO FED. DO NORTE DE MINAS GERAIS", "INSTITUTO FED.DO SUDESTE DE MINAS GERAIS",
      "INSTITUTO NAC. DA PROPRIEDADE INDUSTRIAL", "INSTITUTO NACIONAL DE SEGURO SOCIAL", "INST.NACIONAL DE EST.E PESQ.EDUCACIONAIS",
      "INST.NAC.METROLOGIA,NORM.E QUAL.INDL.", "INSTITUTO NAC. DE COLONIZ E REF AGRARIA", "INST NAC DE TECN DA INFORMACAO",
      "MINISTERIO CIENCIA TECNOLOGIA INOVA", "MINISTERIO DA AGRICULTURA E PECUARIA", "MINISTERIO DA CULTURA",
      "MINISTERIO DA DEFESA", "MINISTERIO DA EDUCACAO", "MINISTERIO DA PESCA E AQUICULTURA",
      "MINISTERIO DA PREVIDENCIA SOCIAL", "MINISTERIO DA SAUDE", "MINISTERIO DAS CIDADES",
      "MINISTERIO DAS COMUNICACOES", "MINISTERIO DAS MULHERES", "MINISTERIO DAS RELACOES EXTERIORES",
      "MINISTERIO DE MINAS E ENERGIA", "MINISTERIO DE PORTOS E AEROPORTOS", "MINISTERIO DO ESPORTE",
      "MINISTERIO DO MEIO AMBIENTE", "MINISTERIO DO PLANEJAMENTO E ORCAMENTO", "MINISTERIO DO TRABALHO E EMPREGO",
      "MINISTERIO DO TURISMO", "MINISTERIO DOS POVOS INDIGENAS", "MINIST. DA JUSTICA E SEGURANCA PUBLICA",
      "MIN DESENV ASSIS SOCI FAMIL COMBATE FOME", "MIN DESENVOLV IND COMERCIO E SERVICOS", "MIN DO DESENV AGR E AGRIC FAMILIAR",
      "MIN DA INTEG E DO DESENV REGIONAL", "MIN DOS DIR HUM E DA CIDADANIA", "MINISTERIO DA IGUALDADE RACIAL",
      "NUCLEBRAS EQUIPAMENTOS PESADOS", "POLICIA CIVIL DO DISTRITO FEDERAL", "POLICIA MILITAR DO DISTRITO FEDERAL",
      "PRESIDENCIA DA REPUBLICA", "SUPERINTENDENCIA DO DESENV. DA AMAZONIA", "SUPERINTENDENCIA DO DESENV. DO NORDESTE",
      "SUPERINTENDENCIA DE SEGUROS PRIVADOS", "SUPERINTENDENCIA ZONA FRANCA DE MANAUS", "SUPERINT.NAC.DE PREVIDENCIA COMPLEMENTAR",
      "SUP.DE DESENVOLVIMENTO DO CENTRO OESTE", "TELEBRAS - TELECOM. BRASILEIRAS S.A.", "UNIVERSIDADE DO RIO DE JANEIRO",
      "UNIVERSIDADE FEDERAL DA BAHIA", "UNIVERSIDADE FEDERAL DA PARAIBA", "UNIVERSIDADE FEDERAL DE ALAGOAS",
      "UNIVERSIDADE FEDERAL DE ALFENAS", "UNIVERSIDADE FEDERAL DE CAMPINA GRANDE", "UNIVERSIDADE FEDERAL DE CATALAO",
      "UNIVERSIDADE FEDERAL DE GOIAS", "UNIVERSIDADE FEDERAL DE ITAJUBA", "UNIVERSIDADE FEDERAL DE JATAI",
      "UNIVERSIDADE FEDERAL DE JUIZ DE FORA", "UNIVERSIDADE FEDERAL DE LAVRAS", "UNIVERSIDADE FEDERAL DE MATO GROSSO",
      "UNIVERSIDADE FEDERAL DE MINAS GERAIS", "UNIVERSIDADE FEDERAL DE RORAIMA", "UNIVERSIDADE FEDERAL DE SAO CARLOS",
      "UNIVERSIDADE FEDERAL DE SAO PAULO", "UNIVERSIDADE FEDERAL DE VICOSA", "UNIVERSIDADE FEDERAL DO ACRE",
      "UNIVERSIDADE FEDERAL DO CARIRI", "UNIVERSIDADE FEDERAL DO CEARA", "UNIVERSIDADE FEDERAL DO ESPIRITO SANTO",
      "UNIVERSIDADE FEDERAL DO PARA", "UNIVERSIDADE FEDERAL DO PARANA", "UNIVERSIDADE FEDERAL DO PIAUI",
      "UNIVERSIDADE FEDERAL DO RIO GRANDE", "UNIVERSIDADE FEDERAL FLUMINENSE", "UNIVERSIDADE FEDERAL RURAL DA AMAZONIA",
      "UNIVERSIDADE FEDERAL RURAL DE PERNAMBUCO", "UNIVERSIDADE FED. DO RIO GRANDE DO NORTE", "UNIVERSIDADE FED. DO RIO GRANDE DO SUL",
      "UNIVERSIDADE FED. RURAL DO RIO DE JANEIRO", "UNIVERSIDADE FED. RURAL DO SEMI-ARIDO", "UNIVERSIDADE FED. SUL SUDESTE DO PARA",
      "UNIVERSIDADE FED.DO TRIANGULO MINEIRO",
      "UNIVER. FEDERAL DO AGRESTE DE PERNAMBUCO", "UNIV. FEDERAL DO DELTA DO PARNAIBA", "UNIV. FEDERAL DO RECONCAVO DA BAHIA",
      "UNIV. FEDERAL DE MATO GROSSO DO SUL", "UNIV. FEDERAL DO OESTE DO PARA", "UNIV. FEDERAL DO SUL DA BAHIA",
      "UNIV. FEDERAL DO OESTE DA BAHIA", "UNIV. FEDERAL NORTE DO TOCANTINS", "UNIV. FEDERAL DO RONDONOPOLIS",
      "UNIV.FED. DA INTEGRACAO LATINO-AMERICANA", "UNIV.FED. VALES DO JEQUITINHONHA E MUCURI", "UNIVERS. TECNOLOGICA FEDERAL DO PARANA",
      "VICE-PRESIDENCIA DA REPUBLICA"
    ]
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
    if (!isSupabaseConfigured) return
    setIsCalculating(true)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 15000) // 15 seconds timeout
    
    try {
      // Build select string based on active filters
      let selectStr = 'cpf'
      const hasMatriculasFilter = filters.orgaos.length > 0 || filters.situacoes.length > 0 || filters.regimes.length > 0 || filters.ufs.length > 0
      const hasInstituidoresFilter = filters.margemMin || filters.margemMax || filters.saldoMin || filters.saldoMax || filters.cardMargemMin || filters.cardBeneficioMin
      const hasItensCreditoFilter = filters.loanBanks.length > 0 || filters.loanPrazoMin || filters.loanPrazoMax || filters.cardTypes.length > 0 || filters.cardBanks.length > 0

      if (hasItensCreditoFilter) {
        selectStr = 'cpf, matriculas!inner(instituidores!inner(itens_credito!inner(id)))'
      } else if (hasInstituidoresFilter) {
        selectStr = 'cpf, matriculas!inner(instituidores!inner(id))'
      } else if (hasMatriculasFilter) {
        selectStr = 'cpf, matriculas!inner(id)'
      }

      let query = supabase.from('clientes').select(selectStr, { count: 'planned', head: true })

      // Apply filters
      if (filters.orgaos.length > 0) {
        const orgaoCodes = filters.orgaos.flatMap(name => 
          Object.entries(ORGAOS_MAPPING)
            .filter(([, val]) => val === name)
            .map(([code]) => code)
        );
        const finalOrgaos = orgaoCodes.length > 0 ? orgaoCodes : filters.orgaos;
        query = query.in('matriculas.orgao', finalOrgaos)
      }
      if (filters.situacoes.length > 0) query = query.in('matriculas.situacao_funcional', filters.situacoes)
      if (filters.regimes.length > 0) query = query.in('matriculas.regime_juridico', filters.regimes)
      if (filters.ufs.length > 0) query = query.in('matriculas.uf', filters.ufs)

      if (filters.margemMin && !isNaN(parseFloat(filters.margemMin))) 
        query = query.gte('matriculas.instituidores.margem_35', parseFloat(filters.margemMin))
      if (filters.margemMax && !isNaN(parseFloat(filters.margemMax))) 
        query = query.lte('matriculas.instituidores.margem_35', parseFloat(filters.margemMax))
      if (filters.saldoMin && !isNaN(parseFloat(filters.saldoMin))) 
        query = query.gte('matriculas.instituidores.saldo_70', parseFloat(filters.saldoMin))
      if (filters.saldoMax && !isNaN(parseFloat(filters.saldoMax))) 
        query = query.lte('matriculas.instituidores.saldo_70', parseFloat(filters.saldoMax))
      
      if (filters.cardMargemMin && !isNaN(parseFloat(filters.cardMargemMin))) 
        query = query.gte('matriculas.instituidores.bruta_5', parseFloat(filters.cardMargemMin))
      if (filters.cardBeneficioMin && !isNaN(parseFloat(filters.cardBeneficioMin))) 
        query = query.gte('matriculas.instituidores.beneficio_bruta_5', parseFloat(filters.cardBeneficioMin))

      if (filters.loanBanks.length > 0) {
        const normalizedBanks = filters.loanBanks.map(b => b.replace(/^BANCO\s+/i, "").trim().toUpperCase());
        query = query.in('matriculas.instituidores.itens_credito.banco', normalizedBanks)
      }
      if (filters.loanPrazoMin && !isNaN(parseInt(filters.loanPrazoMin))) 
        query = query.gte('matriculas.instituidores.itens_credito.prazo', parseInt(filters.loanPrazoMin))
      if (filters.loanPrazoMax && !isNaN(parseInt(filters.loanPrazoMax))) 
        query = query.lte('matriculas.instituidores.itens_credito.prazo', parseInt(filters.loanPrazoMax))
      
      if (filters.cardTypes.length > 0) {
        const cardCodes = filters.cardTypes.flatMap(label => 
          Object.entries(CONTRATOS_TIPO_MAPPING)
            .filter(([, info]) => info.label === label)
            .map(([code]) => code)
        );
        const finalCardTypes = cardCodes.length > 0 ? cardCodes : filters.cardTypes;
        query = query.in('matriculas.instituidores.itens_credito.tipo', finalCardTypes)
      }
      if (filters.cardBanks.length > 0) {
        const normalizedBanks = filters.cardBanks.map(b => b.replace(/^BANCO\s+/i, "").trim().toUpperCase());
        query = query.in('matriculas.instituidores.itens_credito.banco', normalizedBanks)
      }

      if (filters.idadeMin || filters.idadeMax) {
        const today = new Date();
        if (filters.idadeMin) {
          const minDate = new Date(today.getFullYear() - parseInt(filters.idadeMin), today.getMonth(), today.getDate());
          query = query.lte('data_nascimento', minDate.toISOString().split('T')[0]);
        }
        if (filters.idadeMax) {
          const maxDate = new Date(today.getFullYear() - (parseInt(filters.idadeMax) + 1), today.getMonth(), today.getDate() + 1);
          query = query.gte('data_nascimento', maxDate.toISOString().split('T')[0]);
        }
      }

      const { count, error, status } = await query.abortSignal(controller.signal)
      
      if (error) {
        console.error("Erro ao calcular audiência:", error)
        if (error.message?.includes("timeout") || error.code === '57014' || status === 504) {
          alert("A consulta demorou muito devido ao grande volume de dados. Tente usar filtros mais específicos para reduzir o tempo de busca.")
        } else {
          alert(`Erro ao calcular audiência: ${error.message || "Erro desconhecido"}`)
        }
        setEstimatedAudience(0)
      } else {
        setEstimatedAudience(count || 0)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        alert("A consulta foi cancelada porque demorou muito. Tente usar filtros mais específicos.")
      } else {
        console.error("Erro inesperado ao calcular audiência:", err)
        alert(`Erro inesperado: ${err.message || "Erro desconhecido"}`)
      }
    } finally {
      clearTimeout(timeoutId)
      setIsCalculating(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!campaignName || estimatedAudience === 0) return
    setIsCreating(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const { error } = await supabase
        .from('campanhas')
        .insert({
          nome: campaignName,
          filtros: filters,
          publico_estimado: estimatedAudience,
          user_id: session?.user?.id
        })

      if (error) {
        console.error("Erro ao criar campanha:", error.message || error)
        alert(`Erro ao criar campanha: ${error.message || "Verifique se a tabela 'campanhas' existe."}`)
      } else {
        router.push("/campanhas")
      }
    } catch (err: any) {
      console.error("Erro inesperado:", err.message || err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleExport = async () => {
    if (estimatedAudience === 0) return
    setIsCalculating(true)
    
    try {
      // Fetch data for export
      // Similar query but with data
      let selectStr = `
        cpf, 
        nome, 
        telefone_1, 
        telefone_2, 
        telefone_3,
        matriculas!inner(
          orgao, 
          uf,
          instituidores!inner(
            saldo_70, 
            margem_35, 
            bruta_5, 
            utilizada_5, 
            liquida_5, 
            beneficio_bruta_5, 
            beneficio_utilizada_5, 
            beneficio_liquida_5
          )
        )
      `

      // If any loan/card filters are active, we need to join itens_credito
      const hasItensCreditoFilters = 
        (filters.loanBanks.length > 0) || 
        filters.loanPrazoMin || 
        filters.loanPrazoMax || 
        (filters.cardBanks.length > 0) || 
        (filters.cardTypes.length > 0);

      if (hasItensCreditoFilters) {
        selectStr = selectStr.replace(
          'beneficio_liquida_5',
          'beneficio_liquida_5, itens_credito!inner(id)'
        );
      }

      let query = supabase
        .from('clientes')
        .select(selectStr)

      // Apply same filters as calculateAudience
      if (filters.orgaos.length > 0) {
        const orgaoCodes = filters.orgaos.flatMap(name => 
          Object.entries(ORGAOS_MAPPING)
            .filter(([, val]) => val === name)
            .map(([code]) => code)
        );
        const finalOrgaos = orgaoCodes.length > 0 ? orgaoCodes : filters.orgaos;
        query = query.in('matriculas.orgao', finalOrgaos)
      }
      if (filters.situacoes.length > 0) query = query.in('matriculas.situacao_funcional', filters.situacoes)
      if (filters.regimes.length > 0) query = query.in('matriculas.regime_juridico', filters.regimes)
      if (filters.ufs.length > 0) query = query.in('matriculas.uf', filters.ufs)
      if (filters.margemMin) query = query.gte('matriculas.instituidores.margem_35', parseFloat(filters.margemMin))
      if (filters.margemMax) query = query.lte('matriculas.instituidores.margem_35', parseFloat(filters.margemMax))
      if (filters.saldoMin) query = query.gte('matriculas.instituidores.saldo_70', parseFloat(filters.saldoMin))
      if (filters.saldoMax) query = query.lte('matriculas.instituidores.saldo_70', parseFloat(filters.saldoMax))
      if (filters.cardMargemMin) query = query.gte('matriculas.instituidores.bruta_5', parseFloat(filters.cardMargemMin))
      if (filters.cardBeneficioMin) query = query.gte('matriculas.instituidores.beneficio_bruta_5', parseFloat(filters.cardBeneficioMin))
      
      if (filters.loanBanks.length > 0) {
        const normalizedBanks = filters.loanBanks.map(b => b.replace(/^BANCO\s+/i, "").trim().toUpperCase());
        query = query.in('matriculas.instituidores.itens_credito.banco', normalizedBanks)
      }
      if (filters.loanPrazoMin) query = query.gte('matriculas.instituidores.itens_credito.prazo', parseInt(filters.loanPrazoMin))
      if (filters.loanPrazoMax) query = query.lte('matriculas.instituidores.itens_credito.prazo', parseInt(filters.loanPrazoMax))
      if (filters.cardBanks.length > 0) {
        const normalizedBanks = filters.cardBanks.map(b => b.replace(/^BANCO\s+/i, "").trim().toUpperCase());
        query = query.in('matriculas.instituidores.itens_credito.banco', normalizedBanks)
      }

      if (filters.cardTypes.length > 0) {
        const cardCodes = filters.cardTypes.flatMap(label => 
          Object.entries(CONTRATOS_TIPO_MAPPING)
            .filter(([, info]) => info.label === label)
            .map(([code]) => code)
        );
        const finalCardTypes = cardCodes.length > 0 ? cardCodes : filters.cardTypes;
        query = query.in('matriculas.instituidores.itens_credito.tipo', finalCardTypes)
      }

      if (filters.idadeMin || filters.idadeMax) {
        const today = new Date();
        if (filters.idadeMin) {
          const minDate = new Date(today.getFullYear() - parseInt(filters.idadeMin), today.getMonth(), today.getDate());
          query = query.lte('data_nascimento', minDate.toISOString().split('T')[0]);
        }
        if (filters.idadeMax) {
          const maxDate = new Date(today.getFullYear() - (parseInt(filters.idadeMax) + 1), today.getMonth(), today.getDate() + 1);
          query = query.gte('data_nascimento', maxDate.toISOString().split('T')[0]);
        }
      }

      const { data, error } = await query.limit(5000) // Limit for safety in browser
      
      if (error) throw error

      if (data) {
        const headers = "cpf,nome,telefone 1,telefone 2,telefone 3,orgao,uf,saldo_70%,margem_35%,bruta_5,utilizada_5,liquida_5,beneficio_bruta_5,beneficio_utilizada_5,beneficio_liquida_5\n"
        const csvRows = (data as any[]).map(c => {
          const m = c.matriculas?.[0]
          const i = m?.instituidores?.[0]
          return [
            c.cpf,
            c.nome,
            c.telefone_1 || "",
            c.telefone_2 || "",
            c.telefone_3 || "",
            m?.orgao || "",
            m?.uf || "",
            i?.saldo_70 || 0,
            i?.margem_35 || 0,
            i?.bruta_5 || 0,
            i?.utilizada_5 || 0,
            i?.liquida_5 || 0,
            i?.beneficio_bruta_5 || 0,
            i?.beneficio_utilizada_5 || 0,
            i?.beneficio_liquida_5 || 0
          ].join(",")
        }).join("\n")

        const blob = new Blob([headers + csvRows], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `campanha_${campaignName.replace(/\s+/g, '_') || 'export'}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err: any) {
      console.error("Erro ao exportar:", err.message || err)
      alert(`Erro ao exportar dados: ${err.message || "Erro desconhecido"}`)
    } finally {
      setIsCalculating(false)
    }
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
                        const categoryMap: Record<string, keyof typeof filters> = {
                          "1": "orgaos",
                          "2": "situacoes",
                          "3": "regimes",
                          "4": "ufs"
                        };
                        selectAll(categoryMap[section.id], section.options);
                      }}
                      className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      Selecionar Todos
                    </button>
                    <button 
                      onClick={() => {
                        const categoryMap: Record<string, keyof typeof filters> = {
                          "1": "orgaos",
                          "2": "situacoes",
                          "3": "regimes",
                          "4": "ufs"
                        };
                        clearAll(categoryMap[section.id], section.options);
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
                    const categoryMap: Record<string, keyof typeof filters> = {
                      "1": "orgaos",
                      "2": "situacoes",
                      "3": "regimes",
                      "4": "ufs"
                    };
                    const category = categoryMap[section.id];
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
                  <h3 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">6. MARGEM</h3>
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
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Margem 5% (Mínima)</label>
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
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Benefício 5% (Mínima)</label>
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
