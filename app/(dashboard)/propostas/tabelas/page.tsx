"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Building2,
  X
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Banco {
  id: string
  nome: string
  ativo?: boolean
}

interface Convenio {
  id: string
  nome: string
  ativo?: boolean
}

interface TipoOperacao {
  id: string
  nome: string
}

interface ProdutoRegra {
  prazo: string | number
  coeficiente: string | number
  percentual_producao: string | number
  percentual_comissao?: string | number
  percentual_comissao_pj?: string | number
  comissoes_pj_corretores?: Record<string, string | number>
  ativo?: boolean
}

interface ProdutoConfig {
  id: string
  banco_id: string
  convenio_id: string
  nome_tabela?: string
  operacoes: string[]
  regras?: ProdutoRegra[]
  prazo?: string | number
  coeficiente?: string | number
  percentual_producao?: string | number
  percentual_comissao?: string | number
  percentual_comissao_pj?: string | number
  ativo?: boolean
  created_at: string
}

export default function TabelasRegrasPage() {
  const { perfil, user, isAdmin } = useAuth()
  
  const [bancos, setBancos] = useState<Banco[]>([])
  const [convenios, setConvenios] = useState<Convenio[]>([])
  const [tiposOperacao, setTiposOperacao] = useState<TipoOperacao[]>([])
  const [produtosConfig, setProdutosConfig] = useState<ProdutoConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null)

  // Identificação do Regime/Função do Usuário
  const regimeUpper = (perfil?.regime_contratacao || user?.user_metadata?.regime_contratacao || '').toUpperCase().trim()
  const roleUpper = (perfil?.role || '').toUpperCase().trim()
  const funcaoUpper = ((perfil as any)?.funcao || '').toUpperCase().trim()

  const isPJ = regimeUpper === 'PJ' || roleUpper === 'PJ' || funcaoUpper === 'PJ'
  const isAdminOrDev = roleUpper === 'ADMINISTRADOR' || roleUpper === 'DESENVOLVEDOR' || isAdmin

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [
          { data: bancoData },
          { data: convData },
          { data: operData },
          { data: prodData }
        ] = await Promise.all([
          supabase.from('bancos').select('*').order('nome', { ascending: true }),
          supabase.from('convenios').select('*').order('nome', { ascending: true }),
          supabase.from('tipos_operacao').select('*').order('nome', { ascending: true }),
          supabase.from('produtos_config').select('*')
        ])

        setBancos(bancoData || [])
        setConvenios(convData || [])
        setTiposOperacao(operData || [])
        setProdutosConfig(prodData || [])
      } catch (err) {
        console.error("Erro ao carregar tabelas de regras:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Função auxiliar para calcular e formatar a comissão do PJ
  const getPJCommissionDisplay = (regra: ProdutoRegra) => {
    let valPJRaw = (user?.id && regra.comissoes_pj_corretores?.[user.id]) || regra.percentual_comissao_pj
    let valPJ: number | null = null
    if (valPJRaw) {
      valPJ = typeof valPJRaw === 'string' ? parseFloat(valPJRaw.replace(',', '.')) : valPJRaw
    }
    if (valPJ !== null && !isNaN(valPJ) && regra.percentual_comissao) {
      const valComissao = typeof regra.percentual_comissao === 'string'
        ? parseFloat(regra.percentual_comissao.replace(',', '.'))
        : regra.percentual_comissao
      if (!isNaN(valComissao)) {
        const converted = (valComissao * valPJ) / 100
        return `${parseFloat(converted.toFixed(2)).toString().replace('.', ',')}%`
      }
    }
    return valPJRaw ? `${valPJRaw}%` : '--'
  }

  // Termos de busca informados
  const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean)

  // Função para verificar se uma tabela/produto corresponde à busca
  const matchesProduct = (prod: ProdutoConfig, banco: Banco) => {
    if (searchTerms.length === 0) return true

    const conv = convenios.find(c => c.id === prod.convenio_id)
    const convName = (conv?.nome || '').toLowerCase()
    const tableName = (prod.nome_tabela || '').toLowerCase()
    const bankName = (banco.nome || '').toLowerCase()

    const opNames = (prod.operacoes || [])
      .map(opId => tiposOperacao.find(o => o.id === opId)?.nome.toLowerCase() || '')
      .join(' ')

    const regrasText = (prod.regras || [])
      .map(r => `${r.prazo} ${r.prazo}x ${r.coeficiente}`)
      .join(' ')

    const prodText = `${prod.prazo || ''} ${prod.prazo ? prod.prazo + 'x' : ''} ${prod.coeficiente || ''}`

    const searchableStr = `${bankName} ${convName} ${tableName} ${opNames} ${regrasText} ${prodText}`.toLowerCase()

    return searchTerms.every(term => searchableStr.includes(term))
  }

  // Filtragem de bancos e produtos ativas
  const activeBancos = bancos.filter(b => b.ativo !== false)

  const filteredBancos = activeBancos.filter(banco => {
    const bankProds = produtosConfig.filter(p => p.banco_id === banco.id && p.ativo !== false && matchesProduct(p, banco))
    return bankProds.length > 0
  })

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 min-h-screen">
      {/* Barra Fixa do Topo */}
      <Header title="TABELAS DE COEFICIENTES" />

      <main className="p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Campo de Busca */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por banco, convênio, tabela, operação ou prazo (ex: Itaú SIAPE Novo 84x)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-10 text-[11px] font-bold bg-white border-slate-200 rounded-xl uppercase placeholder:normal-case placeholder:font-normal shadow-sm"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Conteúdo Principal */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carregando tabelas de regras...</p>
          </div>
        ) : filteredBancos.length === 0 ? (
          <Card className="p-12 text-center border border-slate-200 rounded-2xl bg-white shadow-sm space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Nenhuma tabela encontrada</h3>
            <p className="text-[10px] text-slate-400 max-w-md mx-auto">
              {searchQuery ? "Nenhum resultado atende à busca realizada." : "Não há tabelas de regras ativas no momento."}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBancos.map((banco) => {
              const bankProducts = produtosConfig.filter(p => p.banco_id === banco.id && p.ativo !== false && matchesProduct(p, banco))
              const isExpanded = expandedBankId === banco.id || !!searchQuery.trim()

              return (
                <Card key={banco.id} className="border border-slate-200 overflow-hidden rounded-2xl bg-white shadow-sm overflow-visible">
                  {/* Topo do Banco com estilo idêntico ao Administrador */}
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedBankId(expandedBankId === banco.id ? null : banco.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                        {banco.nome.substring(0, 2)}
                      </div>
                      <h3 className="font-bold text-[12px] text-slate-700 uppercase tracking-widest">{banco.nome}</h3>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {bankProducts.length} {bankProducts.length === 1 ? 'Convênio' : 'Convênios'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                    </div>
                  </div>

                  {/* Conteúdo Expandido do Banco */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: "auto", opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }} 
                        className="overflow-hidden border-t border-slate-100"
                      >
                        <div className="p-6 bg-slate-50/30 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TABELAS DE REGRAS</h4>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            {bankProducts.map((prod) => {
                              const convenio = convenios.find(c => c.id === prod.convenio_id)
                              if (!convenio) return null

                              const activeRegras = (prod.regras || []).filter(r => r.ativo !== false)

                              return (
                                <div 
                                  key={prod.id} 
                                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group space-y-4"
                                >
                                  {/* Header do Produto / Convênio */}
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <span className="font-bold text-[13px] text-slate-800 uppercase tracking-widest">
                                        {prod.nome_tabela || convenio.nome}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                          {format(new Date(prod.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                        </span>
                                        <span className={cn(
                                          "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                                          prod.ativo !== false ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                                        )}>
                                          {prod.ativo !== false ? "ATIVA" : "INATIVA"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Convênio */}
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Convênio</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[11px] font-bold uppercase tracking-tight border border-slate-100">
                                          {convenio.nome}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Operações Permitidas */}
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operações Permitidas</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {(prod.operacoes || []).map(opId => {
                                          const op = tiposOperacao.find(o => o.id === opId)
                                          return op ? (
                                            <span key={opId} className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[11px] font-bold uppercase tracking-tight border border-slate-100">
                                              {op.nome}
                                            </span>
                                          ) : null
                                        })}
                                      </div>
                                      {(prod.operacoes || []).length === 0 && (
                                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest italic">
                                          Nenhuma operação selecionada
                                        </span>
                                      )}
                                    </div>

                                    {/* Tabela de Coeficientes */}
                                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Tabela de Coeficientes
                                      </span>

                                      {activeRegras.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-2">
                                          {activeRegras.map((regra, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 justify-between">
                                              <div className="flex items-center gap-2">
                                                {/* Prazo */}
                                                <div className="flex flex-col">
                                                  <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Prazo</span>
                                                  <span className="text-[12px] font-bold text-slate-700">{regra.prazo}x</span>
                                                </div>

                                                <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                                                {/* Coef */}
                                                <div className="flex flex-col">
                                                  <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Coef</span>
                                                  <span className="text-[12px] font-bold text-slate-700">{regra.coeficiente}</span>
                                                </div>

                                                {/* Visualizações Condicionais conforme perfil */}
                                                {isPJ ? (
                                                  <>
                                                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                                                    <div className="flex flex-col">
                                                      <span className="text-[9px] font-bold text-purple-600 uppercase leading-none">Comissão</span>
                                                      <span className="text-[12px] font-bold text-purple-700">
                                                        {getPJCommissionDisplay(regra)}
                                                      </span>
                                                    </div>
                                                  </>
                                                ) : isAdminOrDev ? (
                                                  <>
                                                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                                                    <div className="flex flex-col">
                                                      <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Prod</span>
                                                      <span className="text-[12px] font-bold text-emerald-600">{regra.percentual_producao}%</span>
                                                    </div>

                                                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                                                    <div className="flex flex-col">
                                                      <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Comissão</span>
                                                      <span className="text-[12px] font-bold text-sky-600">
                                                        {regra.percentual_comissao ? `${regra.percentual_comissao}%` : '--'}
                                                      </span>
                                                    </div>

                                                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                                                    <div className="flex flex-col">
                                                      <span className="text-[9px] font-bold text-purple-600 uppercase leading-none">Comissão PJ</span>
                                                      <span className="text-[12px] font-bold text-purple-700">
                                                        {getPJCommissionDisplay(regra)}
                                                      </span>
                                                    </div>
                                                  </>
                                                ) : (
                                                  <>
                                                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                                                    <div className="flex flex-col">
                                                      <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Prod</span>
                                                      <span className="text-[12px] font-bold text-emerald-600">{regra.percentual_producao}%</span>
                                                    </div>
                                                  </>
                                                )}
                                              </div>

                                              <div className="flex items-center">
                                                <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                                                <span className={cn(
                                                  "h-6 px-2 rounded text-[10px] font-extrabold uppercase tracking-wide flex items-center justify-center border",
                                                  regra.ativo !== false 
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                                    : "bg-rose-50 text-rose-600 border-rose-100"
                                                )}>
                                                  {regra.ativo !== false ? "ATIVA" : "INATIVA"}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="flex gap-6 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prazo</span>
                                            <span className="text-[12px] font-extrabold text-slate-600">{prod.prazo ? `${prod.prazo}x` : '--'}</span>
                                          </div>
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coeficiente</span>
                                            <span className="text-[12px] font-extrabold text-slate-600">{prod.coeficiente || '--'}</span>
                                          </div>
                                          {isPJ ? (
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Comissão</span>
                                              <span className="text-[12px] font-extrabold text-purple-700">
                                                {prod.percentual_comissao_pj ? `${prod.percentual_comissao_pj}%` : '--'}
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produção</span>
                                              <span className="text-[12px] font-extrabold text-emerald-600">{prod.percentual_producao ? `${prod.percentual_producao}%` : '--'}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
