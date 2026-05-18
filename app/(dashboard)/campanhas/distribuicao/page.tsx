"use client"
 
import { useRouter } from "next/navigation"

import { Header } from "@/components/layout/header"
import { useSidebar } from "@/context/sidebar-context"
import { cn } from "@/lib/utils"
import { 
  Users, 
  Target, 
  Loader2,
  Search,
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
  
  const [startedCampaigns, setStartedCampaigns] = useState<string[]>([])
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const handleStartCampaign = (campaignId: string) => {
    router.push(`/campanhas/atendimento/${campaignId}`)
  }

  // Access check removed - now accessible to all roles
  useEffect(() => {
    // Access is controlled by sidebar and supabase policies
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
      
      // Filter for only distributed campaigns
      filteredData = filteredData.filter(c => {
        const distribution = c.filtros?.distribuicao || []
        const brokers = c.filtros?.corretores_selecionados || []
        
        const isDistributed = (Array.isArray(distribution) && distribution.length > 0) || 
                             (Array.isArray(brokers) && brokers.length > 0)
        
        if (!isAdmin && !isDeveloper) {
          if (!isDistributed) return false;
          
          const userId = user.id
          const supervisorId = perfil.supervisor_id
          
          if (Array.isArray(brokers) && brokers.length > 0) {
            return brokers.includes(userId)
          }
          
          return distribution.includes(userId) || (supervisorId && distribution.includes(supervisorId))
        }
        
        return isDistributed
      })

      setCampaigns(filteredData as Campaign[])

      // Fetch progress (which campaigns have at least 1 record for this user)
      try {
        const { data: progressData } = await supabase
          .from('campanha_atendimentos')
          .select('campanha_id')
          .eq('corretor_id', user.id)

        if (progressData) {
          const uniqueIds = Array.from(new Set(progressData.map(p => p.campanha_id)))
          setStartedCampaigns(uniqueIds)
        }
      } catch (err) {
        // Table might not exist yet if migration didn't run, ignore silenty
        console.warn("Could not fetch campaign progress:", err)
      }
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

  const filteredCampaigns = campaigns.filter(c => 
    c.nome.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedCampaigns = filteredCampaigns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      <Header title="ACESSAR CAMPANHA" />
            <div className={cn(
         "p-4 lg:p-8 space-y-8 mx-auto w-full pb-20 transition-all duration-300",
         "max-w-[1400px]"
       )}>
         <Card className="card-shadow">
           <CardContent className="p-0">
             <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
               <div className="flex-1 w-full">
                 <Input 
                   placeholder="Buscar por nome da campanha..." 
                   className="h-10 text-[12px]"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   icon={<Search className="w-4 h-4 text-slate-400" />}
                 />
               </div>
               <div className="flex items-center gap-3 w-full md:w-auto">
                 <Button 
                   className="h-10 px-8 text-[12px] font-bold uppercase tracking-widest w-full md:w-auto"
                   onClick={fetchCampaigns}
                 >
                   Atualizar
                 </Button>
               </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50/50 border-b border-slate-50">
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Identificação</th>
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Campanha</th>
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Convênio</th>
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest text-center">Público</th>
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest text-center">Status</th>
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest text-right">Ação</th>
                   </tr>
                 </thead>
                 <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-10 h-10 text-primary animate-spin" />
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Carregando campanhas liberadas...</p>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center justify-center gap-4 bg-red-50/30">
                          <Info className="w-10 h-10 text-red-400" />
                          <p className="text-sm font-bold text-red-500 uppercase tracking-widest text-center px-8">
                            Erro ao carregar: {error}
                          </p>
                          <Button variant="outline" onClick={fetchCampaigns} className="mt-2 border-red-200 text-red-500 hover:bg-red-100 rounded-xl">
                            Tentar Novamente
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-slate-300" />
                          </div>
                          <h3 className="text-[13px] font-black text-[#1C2643] mb-1 uppercase tracking-tight">Nenhuma Campanha Liberada</h3>
                          <p className="text-[11px] text-slate-500 max-w-sm">Você ainda não possui campanhas distribuídas para sua equipe.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCampaigns.map((campaign) => {
                      const isStarted = startedCampaigns.includes(campaign.id);
                      return (
                        <tr key={campaign.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5 text-[11px] font-bold text-slate-400 truncate max-w-[100px]">
                            {campaign.id.substring(0, 8)}...
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-[12.5px] font-black text-slate-900 uppercase tracking-tight group-hover:text-primary transition-colors">
                                {campaign.nome}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                Liberada em {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200/50">
                              {campaign.filtros?.convenio || 'Geral'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[12.5px] font-black text-slate-900 tracking-tight">
                                {campaign.publico_estimado.toLocaleString('pt-BR')}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Leads</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Ativa</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <Button 
                              onClick={() => handleStartCampaign(campaign.id)}
                              className={cn(
                                "h-9 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm transition-all active:scale-95",
                                isStarted 
                                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                                  : "bg-[#1C2643] text-white hover:bg-black shadow-slate-200"
                              )}
                            >
                              {isStarted ? "Continuar" : "INICIAR"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                 </tbody>
               </table>
             </div>
           </CardContent>
         </Card>
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
                    currentPage === i + 1 ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200"
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
    </div>
  )
}
