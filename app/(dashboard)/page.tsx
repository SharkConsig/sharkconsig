"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { 
  TrendingUp,
  Gift,
  Users,
  Trophy,
  CheckCircle2,
  Clock,
  Target,
  Zap,
  Loader2
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"
import { supabase } from "@/lib/supabase"

interface ProposalSummary {
  id_lead: string
  nome_cliente: string
  valor_producao: string | number
  updated_at: string
}

interface RankingItem {
  corretor_id: string
  total: number
}

export default function DashboardPage() {
  const { perfil, isCorretor } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userProposals, setUserProposals] = useState<ProposalSummary[]>([])
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [teamProduced, setTeamProduced] = useState(0)
  
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const startOfMonth = new Date()
      startOfMonth.setHours(0, 0, 0, 0)
      startOfMonth.setDate(1)

      const paidStatuses = ["PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA", "PÓS-VENDA REALIZADA"]

      // 1. Fetch user's paid proposals for current month using valor_producao
      let query = supabase
        .from("propostas")
        .select("id_lead, nome_cliente, valor_producao, updated_at")
        .in("status", paidStatuses)
        .gte("updated_at", startOfMonth.toISOString())
      
      if (isCorretor) {
        query = query.eq("corretor_id", perfil?.id)
      }

      const { data: userPaid, error: userError } = await query
      if (userError) {
        console.error("Erro Supabase (User Paid):", userError)
        throw userError
      }
      
      setUserProposals(userPaid || [])

      // 2. Fetch all paid proposals for ranking
      const { data: allPaid, error: allPaidError } = await supabase
        .from("propostas")
        .select("corretor_id, valor_producao")
        .in("status", paidStatuses)
        .gte("updated_at", startOfMonth.toISOString())
      
      if (allPaidError) {
        console.error("Erro Supabase (Rankings):", allPaidError)
      } else {
        const aggregated = (allPaid || []).reduce((acc: Record<string, number>, curr) => {
          const val = typeof curr.valor_producao === "string" 
            ? parseFloat(curr.valor_producao.replace(/[^\d.,]/g, '').replace(',', '.')) 
            : (curr.valor_producao || 0)
          const id = curr.corretor_id || "unknown"
          acc[id] = (acc[id] || 0) + (isNaN(val) ? 0 : val)
          return acc
        }, {})

        const sortedRankings = Object.entries(aggregated)
          .map(([corretor_id, total]) => ({ corretor_id, total }))
          .sort((a, b) => b.total - a.total)
        
        setRankings(sortedRankings)

        // 3. Calculate team production
        const targetSupervisorId = perfil?.role === 'Supervisor' ? perfil?.id : perfil?.supervisor_id
        if (targetSupervisorId) {
          try {
            const usersRes = await fetch('/api/usuarios')
            if (usersRes.ok) {
              const allUsers = await usersRes.json()
              const teamMembers = allUsers.filter((u: { id: string, supervisor_id?: string }) => 
                u.supervisor_id === targetSupervisorId || u.id === targetSupervisorId
              )
              
              const teamIds = teamMembers.map((m: { id: string }) => m.id)
              const teamTotal = (allPaid || []).reduce((acc: number, curr: { corretor_id: string, valor_producao: string | number }) => {
                if (teamIds.includes(curr.corretor_id || "")) {
                  const val = typeof curr.valor_producao === "string" 
                    ? parseFloat(curr.valor_producao.replace(/[^\d.,]/g, '').replace(',', '.')) 
                    : (curr.valor_producao || 0)
                  return acc + (isNaN(val) ? 0 : val)
                }
                return acc
              }, 0)
              setTeamProduced(teamTotal)
            }
          } catch (err) {
            console.error("Erro ao calcular produção do time:", err)
          }
        }
      }

    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error)
    } finally {
      setIsLoading(false)
    }
  }, [perfil?.id, perfil?.role, perfil?.supervisor_id, isCorretor])

  useEffect(() => {
    setMounted(true)
    if (perfil?.id) {
      fetchDashboardData()
    }
  }, [perfil?.id, fetchDashboardData])

  const monthlyProduced = useMemo(() => {
    return userProposals.reduce((acc, p) => {
      const val = typeof p.valor_producao === "string" 
        ? parseFloat(p.valor_producao.replace(/[^\d.,]/g, '').replace(',', '.')) 
        : (p.valor_producao || 0)
      return acc + (isNaN(val) ? 0 : val)
    }, 0)
  }, [userProposals])

  const dailyProduced = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    
    return userProposals
      .filter(p => new Date(p.updated_at) >= startOfToday)
      .reduce((acc, p) => {
        const val = typeof p.valor_producao === "string" 
          ? parseFloat(p.valor_producao.replace(/[^\d.,]/g, '').replace(',', '.')) 
          : (p.valor_producao || 0)
        return acc + (isNaN(val) ? 0 : val)
      }, 0)
  }, [userProposals])

  const recentPayments = useMemo(() => {
    return [...userProposals]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 3)
  }, [userProposals])

  const monthlyGoal = 47000
  const teamGoal = 448000 // Sample team goal

  const prizeTiers = useMemo(() => [
    { goal: 47000, prize: 400 },
    { goal: 63000, prize: 650 },
    { goal: 84000, prize: 1500 },
    { goal: 100000, prize: 2250 },
    { goal: 125000, prize: 3500 },
    { goal: 150000, prize: 7000 },
    { goal: 180000, prize: 10000 },
    { goal: 200000, prize: 25000 },
  ], [])

  const currentPrize = useMemo(() => {
    const achieved = [...prizeTiers].reverse().find(tier => monthlyProduced >= tier.goal)
    return achieved ? achieved.prize : 0
  }, [monthlyProduced, prizeTiers])

  const nextPrizeTier = useMemo(() => {
    return prizeTiers.find(tier => monthlyProduced < tier.goal)
  }, [monthlyProduced, prizeTiers])

  const progressPercent = Math.round((monthlyProduced / monthlyGoal) * 100)
  const remainingValue = Math.max(0, monthlyGoal - monthlyProduced)
  
  const getBusinessDaysInMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    let count = 0
    for (let d = 1; d <= lastDay; d++) {
      const day = new Date(year, month, d).getDay()
      if (day !== 0 && day !== 6) count++
    }
    return count || 22
  }

  const getRemainingBusinessDays = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const today = now.getDate()
    const lastDay = new Date(year, month + 1, 0).getDate()
    
    let count = 0
    for (let d = today; d <= lastDay; d++) {
      const day = new Date(year, month, d).getDay()
      if (day !== 0 && day !== 6) count++
    }
    return count
  }

  const businessDays = getBusinessDaysInMonth()
  const remainingBusinessDays = getRemainingBusinessDays()
  const dailyGoal = monthlyGoal / businessDays

  const userRank = rankings.findIndex(r => r.corretor_id === perfil?.id) + 1
  
  if (!mounted) return null

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      <Header title={`Olá, ${perfil?.nome?.split(' ')[0] || 'Shark'}!`} />
      
      <div className="p-4 lg:p-8 space-y-8 max-w-[1600px] mx-auto w-full pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-black text-[#1C2643] tracking-tighter">
              Bom dia, {perfil?.nome?.split(' ')[0] || 'Shark'}!
            </h1>
            <p className="text-[12px] font-bold text-[#718198] uppercase tracking-[0.25em] mt-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              Sua jornada para o topo começa agora
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-5 self-start md:self-center relative group"
          >
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
               <Clock className="w-7 h-7 text-amber-500" />
            </div>
            <div className="relative z-10">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Prazo Para Bater a Meta</p>
               <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#1C2643]">{remainingBusinessDays.toString().padStart(2, '0')}</span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Dias Restantes</span>
               </div>
               <p className="text-[11px] font-medium text-slate-500 mt-1 max-w-[200px] leading-tight">
                  <span className="text-amber-600 font-bold italic">Sua corrida rumo à meta começou!</span> Aproveite cada dia útil para transformar esforço em resultado.
               </p>
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn("transition-opacity duration-500", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* SECTION 1: O CORAÇÃO DO DASHBOARD (Meta Individual) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-4 lg:row-span-2">
              <DashboardCard className="h-full flex flex-col border-none shadow-2xl shadow-[#1C2643]/5 overflow-hidden group">
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                     <p className="text-[12px] font-black text-[#718198] uppercase tracking-widest">Sua Meta Mensal</p>
                     <div className="bg-[#1C2643]/5 p-2 rounded-xl">
                        <Target className="w-5 h-5 text-[#1C2643]" />
                     </div>
                  </div>
                  <p className="text-lg sm:text-xl lg:text-3xl font-black text-[#1C2643] tracking-tighter mb-6 break-words">{formatCurrency(monthlyGoal)}</p>
                  
                  <div className="flex-1 flex flex-col items-center justify-center py-6 relative">
                    <div className="w-full max-w-[280px]">
                      <Gauge value={progressPercent} producedValue={monthlyProduced} />
                    </div>
                    <div className="mt-4 flex flex-col items-center justify-center">
                       {isLoading ? (
                         <Loader2 className="w-8 h-8 animate-spin text-[#1C2643]" />
                       ) : (
                         <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1C2643] tracking-tighter leading-none">{progressPercent}%</p>
                       )}
                       <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest mt-2">Atingido</p>
                    </div>
                  </div>

                  <div className="space-y-6 mt-auto">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-center">
                          {progressPercent >= 100 ? "META ALCANÇADA! PARABÉNS!" : "Você está no caminho!"}
                        </span>
                      </div>
                      <p className="text-[12px] sm:text-[13px] font-bold text-slate-500 mt-2 text-center shrink-0">
                        {remainingValue > 0 ? (
                          <>Faltam <span className="text-[#1C2643] font-black">{formatCurrency(remainingValue)}</span> para a meta</>
                        ) : (
                          <span className="text-emerald-600 font-black">Você superou sua meta este mês!</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </DashboardCard>
            </motion.div>

            {/* SECTION 2: O FOCO DO DIA E RECOMPENSAS */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                <DashboardCard className="h-full border-none shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-2 shrink-0">
                    <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
                  </div>
                  <div className="flex flex-col min-w-0 overflow-hidden">
                     <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest">Meta de Hoje</p>
                     <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-[#1C2643] tracking-tighter mt-1 break-words leading-none">{formatCurrency(dailyGoal)}</p>
                  </div>
                  <div className="mt-auto pt-4">
                     <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PAGO HOJE</p>
                        <p className="text-[10px] font-black text-[#1C2643]">
                          {isLoading ? "..." : `${Math.min(100, Math.round((dailyProduced / dailyGoal) * 100))}%`}
                        </p>
                     </div>
                     <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (dailyProduced / dailyGoal) * 100)}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full bg-amber-500" 
                        />
                     </div>
                  </div>
                </DashboardCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                <DashboardCard className="h-full border-none shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4 bg-[#1C2643] text-white">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-2 shrink-0">
                    <Gift className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex flex-col min-w-0 overflow-hidden">
                     <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest leading-tight">PRÊMIO ALCANÇADO ATÉ AGORA:</p>
                     <p className="text-lg sm:text-xl lg:text-2xl xl:text-4xl font-black text-amber-400 tracking-tighter mt-1 break-words leading-none">
                       {formatCurrency(currentPrize)}
                     </p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-white/5">
                     {nextPrizeTier ? (
                       <>
                         <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-tight">
                           Próximo Prêmio: {formatCurrency(nextPrizeTier.prize)}
                         </p>
                         <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1 shrink-0">
                           Faltam {formatCurrency(nextPrizeTier.goal - monthlyProduced)} em produção
                         </p>
                       </>
                     ) : (
                       <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest leading-tight">
                         VOCÊ ATINGIU O TOPO DAS PREMIAÇÕES!
                       </p>
                     )}
                  </div>
                </DashboardCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                <DashboardCard className="h-full border-none shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-2 shrink-0">
                    <Users className="w-6 h-6 text-[#1C2643]" />
                  </div>
                  <div className="flex flex-col min-w-0 overflow-hidden flex-1">
                     <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest leading-tight">Meta Mensal do Time</p>
                     <p className="text-[13px] font-black text-[#1C2643] mt-1.5 leading-none">
                       {formatCurrency(teamGoal)}
                     </p>
                     <p className="text-2xl sm:text-3xl lg:text-5xl xl:text-7xl font-black text-[#1C2643] tracking-tighter mt-auto break-words leading-none pb-2">
                       {Math.round((teamProduced / teamGoal) * 100)}%
                     </p>
                  </div>
                </DashboardCard>
              </motion.div>
            </div>

            {/* SECTION 3 & 4: MAPA DE OPORTUNIDADES & RANKING */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                 {/* Pagos recentemente */}
                 <div className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                       </div>
                       <div>
                          <p className="text-[14px] font-black text-[#1C2643] tracking-tight leading-none">Pagos recentemente</p>
                       </div>
                    </div>
                    <div className="space-y-3">
                       {recentPayments.length > 0 ? (
                         recentPayments.map((p) => (
                           <div key={p.id_lead} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex flex-col">
                               <span className="text-[11px] font-black text-[#1C2643] uppercase tracking-tight">{p.nome_cliente}</span>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {p.id_lead}</span>
                             </div>
                             <div className="text-right">
                               <p className="text-[11px] font-black text-emerald-600">{formatCurrency(typeof p.valor_producao === 'string' ? parseFloat(p.valor_producao.replace(/[^\d.,]/g, '').replace(',', '.')) : p.valor_producao)}</p>
                               <p className="text-[9px] font-bold text-slate-400">{new Date(p.updated_at).toLocaleDateString()} {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                             </div>
                           </div>
                         ))
                       ) : (
                         [1, 2, 3].map((_, idx) => (
                            <div key={idx} className="h-14 bg-slate-100/70 rounded-2xl border border-slate-200 border-dashed" />
                         ))
                       )}
                    </div>
                 </div>

                 {/* Mapa de oportunidades */}
                 <div className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-10 h-10 bg-[#1C2643] rounded-xl flex items-center justify-center">
                          <Clock className="w-6 h-6 text-white" />
                       </div>
                       <div>
                          <p className="text-[14px] font-black text-[#1C2643] tracking-tight leading-none">Mapa de oportunidades</p>
                       </div>
                    </div>
                    <div className="space-y-3">
                       {[1, 2, 3].map((_, index) => (
                          <div key={index} className="h-14 bg-slate-100/70 rounded-2xl border border-slate-200 border-dashed" />
                       ))}
                    </div>
                 </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-4">
              <DashboardCard className="h-full border-none shadow-lg shadow-[#1C2643]/5 flex flex-col bg-white">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-xl font-black text-[#1C2643] tracking-tight">Ranking de Vendas</h3>
                   <Trophy className="w-6 h-6 text-amber-500 fill-amber-500" />
                </div>

                <div className="flex-1 flex flex-col gap-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                       <Loader2 className="w-8 h-8 animate-spin text-[#1C2643]" />
                    </div>
                  ) : rankings.length > 0 ? (
                    <>
                      {rankings.slice(0, 6).map((rank, idx) => {
                        const isUser = rank.corretor_id === perfil?.id
                        const position = idx + 1
                        
                        return (
                          <div 
                            key={idx} 
                            className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                              isUser 
                                ? "bg-[#1C2643] text-white border-[#1C2643] shadow-lg shadow-[#1C2643]/20 scale-[1.02]" 
                                : "bg-slate-50 border-slate-100 text-[#1C2643]"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                                isUser ? "bg-white text-[#1C2643]" : "bg-white border border-slate-200 text-[#718198]"
                              )}>
                                {position}º
                              </div>
                              <p className={cn(
                                "text-[13px] font-black tracking-tight",
                                isUser ? "text-white" : "text-[#1C2643]"
                              )}>
                                {isUser ? "Você" : `Ranking ${position}`}
                              </p>
                            </div>
                            <p className={cn(
                              "text-[13px] font-black",
                              isUser ? "text-amber-400" : "text-[#718198]"
                            )}>
                              {formatCurrency(rank.total)}
                            </p>
                          </div>
                        )
                      })}
                      
                      {userRank > 6 && (
                        <div className="mt-2 text-center">
                           <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                             Sua posição atual é <span className="text-[#1C2643]">{userRank}º</span>
                           </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-10 opacity-40">
                       <Trophy className="w-12 h-12 mb-4" />
                       <p className="text-sm font-bold uppercase tracking-widest text-[#1C2643]">Sem rankings ainda</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50">
                   <div className="bg-amber-50 p-4 rounded-2xl flex items-center gap-4 border border-amber-100">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                         <Target className="w-5 h-5 text-amber-500" />
                      </div>
                      <p className="text-[12px] font-bold text-[#1C2643] leading-tight flex-1">
                         {userRank === 1 ? (
                           <span className="text-emerald-600 font-black tracking-tight">PARABÉNS! VOCÊ É O NÚMERO 1! CONTINUE LIDERANDO!</span>
                         ) : userRank > 1 ? (
                           <>Você está na <span className="text-amber-600 font-black">{userRank}ª posição</span>. Acelere para chegar ao topo!</>
                         ) : (
                           <>Comece a produzir para entrar no <span className="font-black">Ranking</span></>
                         )}
                      </p>
                   </div>
                </div>
              </DashboardCard>
            </motion.div>

            {/* SECTION 5: CAMPANHA MODO TUBARÃO */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="lg:col-span-8">
              <DashboardCard className="relative overflow-hidden border-none text-white h-full bg-[#050B1C] min-h-[440px] flex flex-col p-0">
                {/* Visual stylings to mimic the shark background */}
                <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
                  <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3" />
                </div>

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 h-full p-6 sm:p-8 lg:p-10">
                  {/* Left Side: Campaign Intro */}
                  <div className="flex flex-col justify-center space-y-6">
                    <div className="space-y-2">
                       <motion.h2 
                         initial={{ opacity: 0, x: -50 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: 0.8 }}
                         className="text-4xl sm:text-5xl lg:text-6xl font-black italic tracking-tighter leading-[0.8] text-white drop-shadow-2xl"
                       >
                         MODO<br/>
                         <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">TUBARÃO</span>
                       </motion.h2>
                       <motion.div 
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 1 }}
                         className="inline-block bg-amber-400 px-3 py-1.5 mt-4 skew-x-[-12deg]"
                       >
                         <p className="text-[#050B1C] font-black text-[10px] sm:text-xs uppercase tracking-tighter italic skew-x-[12deg]">
                           ATIVE O SEU MODO E FAÇA HISTÓRIA!
                         </p>
                       </motion.div>
                    </div>
                    
                    <p className="text-white/60 text-xs sm:text-sm font-medium max-w-[300px] leading-relaxed">
                      Sua dedicação é o motor do SharkConsig. Superar limites é o que nos torna gigantes. Confira as premiações exclusivas.
                    </p>
                  </div>

                  {/* Right Side: Prize Table */}
                  <div className="flex items-center justify-center lg:justify-end">
                    <div className="w-full max-w-[380px] bg-[#1C2643]/50 backdrop-blur-xl border border-white/10 rounded-[24px] overflow-hidden shadow-2xl">
                       <div className="grid grid-cols-2 bg-white/5 border-b border-white/10">
                          <div className="p-3 text-center border-r border-white/10">
                             <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] italic">META</span>
                          </div>
                          <div className="p-3 text-center">
                             <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] italic">PRÊMIO</span>
                          </div>
                       </div>
                       <div className="divide-y divide-white/5">
                          {prizeTiers.map((tier, idx) => (
                            <motion.div 
                              key={idx} 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 1.2 + (idx * 0.05) }}
                              className={cn(
                                "grid grid-cols-2 items-center hover:bg-white/5 transition-colors group",
                                monthlyProduced >= tier.goal ? "bg-emerald-500/10" : ""
                              )}
                            >
                               <div className="p-2 sm:p-2.5 pl-4 flex items-center gap-2 border-r border-white/10">
                                  <div className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border",
                                    monthlyProduced >= tier.goal ? "bg-emerald-500 border-emerald-400" : "bg-white/10 border-white/20"
                                  )}>
                                     <Target className={cn("w-2.5 h-2.5", monthlyProduced >= tier.goal ? "text-white" : "text-white/40")} />
                                  </div>
                                  <span className={cn(
                                    "text-[12px] font-black tracking-tight",
                                    monthlyProduced >= tier.goal ? "text-emerald-400" : "text-white"
                                  )}>
                                    {formatCurrency(tier.goal)}
                                  </span>
                               </div>
                               <div className="p-2 sm:p-2.5 pl-4 flex items-center gap-2">
                                  <Gift className={cn("w-3 h-3", monthlyProduced >= tier.goal ? "text-emerald-400" : "text-amber-400")} />
                                  <span className={cn(
                                    "text-[12px] font-black tracking-tight",
                                    monthlyProduced >= tier.goal ? "text-emerald-400" : "text-amber-400"
                                  )}>
                                    {formatCurrency(tier.prize)}
                                  </span>
                               </div>
                            </motion.div>
                          ))}
                       </div>
                       <div className="p-3 bg-white/5 text-center">
                          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                            {monthlyProduced >= 200000 
                              ? "NIVEL MÁXIMO!" 
                              : "SUPERE SEUS LIMITES!"}
                          </p>
                       </div>
                    </div>
                  </div>
                </div>
              </DashboardCard>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function Gauge({ value, producedValue }: { value: number, producedValue: number }) {
  const segments = 9
  const radius = 70
  const centerX = 90
  const centerY = 90
  
  const getGaugeColor = (val: number) => {
    if (val <= 25) return "#94A3B8" 
    if (val <= 50) return "#EF4444" 
    if (val <= 75) return "#FB923C" 
    if (val <= 90) return "#FACC15" 
    if (val <= 99) return "#86EFAC" 
    return "#10B981" 
  }

  const currentColor = getGaugeColor(value)
  const needleRotation = 180 + (Math.min(100, value) / 100) * 180
  
  const formattedValue = producedValue >= 1000 
    ? `${(producedValue / 1000).toFixed(1)}k` 
    : producedValue.toFixed(0)

  return (
    <div className="relative w-full">
      <svg className="w-full" viewBox="0 0 180 120">
        {Array.from({ length: segments }).map((_, i) => {
          const startAngle = Math.PI + (i * Math.PI) / segments
          const endAngle = Math.PI + ((i + 1) * Math.PI) / segments
          
          const gap = 0.08
          const x1 = centerX + radius * Math.cos(startAngle + gap)
          const y1 = centerY + radius * Math.sin(startAngle + gap)
          const x2 = centerX + radius * Math.cos(endAngle - gap)
          const y2 = centerY + radius * Math.sin(endAngle - gap)
          
          return (
            <path
              key={`track-${i}`}
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="14"
              strokeLinecap="butt"
            />
          )
        })}

        {Array.from({ length: segments }).map((_, i) => {
          const clampedValue = Math.min(100, value)
          const segmentThreshold = (i / segments) * 100
          if (clampedValue < segmentThreshold) return null

          const startAngle = Math.PI + (i * Math.PI) / segments
          const segmentProgress = Math.min(1, Math.max(0, (clampedValue - segmentThreshold) / (100 / segments)))
          const endAngle = startAngle + (segmentProgress * Math.PI) / segments
          
          const gap = 0.08
          const x1 = centerX + radius * Math.cos(startAngle + gap)
          const y1 = centerY + radius * Math.sin(startAngle + gap)
          const x2 = centerX + radius * Math.cos(Math.max(startAngle + gap, endAngle - gap))
          const y2 = centerY + radius * Math.sin(Math.max(startAngle + gap, endAngle - gap))
          
          return (
            <motion.path
              key={`active-${i}`}
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
              fill="none"
              stroke={currentColor}
              strokeWidth="14"
              strokeLinecap="butt"
            />
          )
        })}

        <motion.g
          initial={{ rotate: 180 }}
          animate={{ rotate: needleRotation }}
          transition={{ duration: 1.5, type: "spring", stiffness: 40, damping: 12 }}
          style={{ originX: '90px', originY: '90px' }}
        >
          <line
            x1="90"
            y1="90"
            x2="155"
            y2="95"
            stroke="black"
            strokeOpacity="0.05"
            strokeWidth="4"
            className="blur-[1px]"
          />
          <line
            x1="90"
            y1="90"
            x2="155"
            y2="90"
            stroke="#1C2643"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="90" cy="90" r="6" fill="#1C2643" stroke="white" strokeWidth="2.5" />
          
          <g transform={`translate(165, 90) rotate(${-needleRotation}, 0, 0)`}>
             <rect 
               x="-12" 
               y="-7" 
               width="24" 
               height="14" 
               rx="4" 
               fill="#1C2643"
             />
             <text
               x="0"
               y="0"
               dy="3.5"
               textAnchor="middle"
               fill="white"
               className="text-[8px] font-black"
             >
               {formattedValue}
             </text>
          </g>
        </motion.g>
      </svg>
    </div>
  )
}

function DashboardCard({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) {
  return (
    <div 
      id={id}
      className={cn(
        "bg-white p-5 sm:p-7 rounded-[32px] sm:rounded-[40px] border border-slate-100 transition-all duration-500",
        className
      )}
    >
      {children}
    </div>
  )
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "R$ 0,00"
  return value.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
