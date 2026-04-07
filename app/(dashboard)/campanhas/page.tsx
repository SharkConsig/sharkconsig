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
  Download,
  Users,
  Calendar,
  MoreVertical,
  ArrowRight,
  Loader2,
  Info
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { ORGAOS_MAPPING } from "@/lib/orgaos-mapping"
import { CONTRATOS_TIPO_MAPPING } from "@/lib/contratos-mapping"

import { useAuth } from "@/context/auth-context"

export default function CampaignsPage() {
  const router = useRouter()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/')
      return
    }
    fetchCampaigns()
  }, [authLoading, isAdmin, router])

  const fetchCampaigns = async () => {
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
    } catch (err: any) {
      console.error("Erro inesperado:", err.message || err)
      setError(err.message || "Ocorreu um erro inesperado.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (campaign: any) => {
    // Similar export logic as in nova/page.tsx but using campaign.filtros
    const filters = campaign.filtros
    setIsLoading(true)
    
    try {
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
        (filters.loanBanks?.length > 0) || 
        filters.loanPrazoMin || 
        filters.loanPrazoMax || 
        (filters.cardBanks?.length > 0) || 
        (filters.cardTypes?.length > 0);

      if (hasItensCreditoFilters) {
        selectStr = selectStr.replace(
          'beneficio_liquida_5',
          'beneficio_liquida_5, itens_credito!inner(id)'
        );
      }

      let query = supabase
        .from('clientes')
        .select(selectStr)

      if (filters.orgaos?.length > 0) {
        const orgaoCodes = filters.orgaos.flatMap((name: string) => 
          Object.entries(ORGAOS_MAPPING)
            .filter(([_, val]) => val === name)
            .map(([code]) => code)
        );
        const finalOrgaos = orgaoCodes.length > 0 ? orgaoCodes : filters.orgaos;
        query = query.in('matriculas.orgao', finalOrgaos)
      }
      if (filters.situacoes?.length > 0) query = query.in('matriculas.situacao_funcional', filters.situacoes)
      if (filters.regimes?.length > 0) query = query.in('matriculas.regime_juridico', filters.regimes)
      if (filters.ufs?.length > 0) query = query.in('matriculas.uf', filters.ufs)
      if (filters.margemMin) query = query.gte('matriculas.instituidores.margem_35', parseFloat(filters.margemMin))
      if (filters.margemMax) query = query.lte('matriculas.instituidores.margem_35', parseFloat(filters.margemMax))
      if (filters.saldoMin) query = query.gte('matriculas.instituidores.saldo_70', parseFloat(filters.saldoMin))
      if (filters.saldoMax) query = query.lte('matriculas.instituidores.saldo_70', parseFloat(filters.saldoMax))
      if (filters.cardMargemMin) query = query.gte('matriculas.instituidores.bruta_5', parseFloat(filters.cardMargemMin))
      if (filters.cardBeneficioMin) query = query.gte('matriculas.instituidores.beneficio_bruta_5', parseFloat(filters.cardBeneficioMin))

      if (filters.loanBanks?.length > 0) {
        const normalizedBanks = filters.loanBanks.map((b: string) => b.replace(/^BANCO\s+/i, "").trim().toUpperCase());
        query = query.in('matriculas.instituidores.itens_credito.banco', normalizedBanks)
      }
      if (filters.loanPrazoMin) query = query.gte('matriculas.instituidores.itens_credito.prazo', parseInt(filters.loanPrazoMin))
      if (filters.loanPrazoMax) query = query.lte('matriculas.instituidores.itens_credito.prazo', parseInt(filters.loanPrazoMax))
      if (filters.cardBanks?.length > 0) {
        const normalizedBanks = filters.cardBanks.map((b: string) => b.replace(/^BANCO\s+/i, "").trim().toUpperCase());
        query = query.in('matriculas.instituidores.itens_credito.banco', normalizedBanks)
      }

      if (filters.cardTypes?.length > 0) {
        const cardCodes = filters.cardTypes.flatMap((label: string) => 
          Object.entries(CONTRATOS_TIPO_MAPPING)
            .filter(([_, info]) => info.label === label)
            .map(([code]) => code)
        );
        const finalCardTypes = cardCodes.length > 0 ? cardCodes : filters.cardTypes;
        query = query.in('matriculas.instituidores.itens_credito.tipo', finalCardTypes)
      }

      const { data, error } = await query.limit(5000)
      
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
        link.setAttribute("download", `campanha_${campaign.nome.replace(/\s+/g, '_')}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err: any) {
      console.error("Erro ao exportar:", err.message || err)
      alert(`Erro ao exportar dados: ${err.message || "Erro desconhecido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCampaigns = campaigns.filter(c => 
    c.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col">
      <Header title="MINHAS CAMPANHAS" />
      
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
                                <Link href={`/campanhas/distribuir/${campaign.id}`}>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 px-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-primary/5"
                                  >
                                    <Users className="w-3.5 h-3.5 mr-1.5" />
                                    Distribuir
                                  </Button>
                                </Link>
                                <Button 
                                  onClick={() => handleExport(campaign)}
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 px-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-primary/5"
                                >
                                  <Download className="w-3.5 h-3.5 mr-1.5" />
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
