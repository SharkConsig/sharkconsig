"use client"

import React from "react"
import { motion } from "motion/react"
import { 
  Target, 
  Zap, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Trophy,
  Loader2,
  ArrowUpRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardCard, Gauge, formatCurrency } from "./dashboard-shared"

interface Perfil {
  id: string
  nome: string
  role: string
}

interface RankingItem {
  name: string
  team: string
  supervisor: string
  total: number
  count: number
}

interface AdminStats {
  monthlyGoal: number
  monthlyProduced: number
  annualGoal: number
  annualProduced: number
  dailyGoal: number
  dailyProduced: number
  inProcessValue: number
  inProcessCount: number
  pendingActionsValue: number
  pendingActionsCount: number
  brokerRankings: RankingItem[]
}

interface AdminDashboardProps {
  perfil: Perfil | null
  isLoading: boolean
  remainingBusinessDays: number
  headerContent: { greeting: string, phrase: string }
  stats: AdminStats
}

export function AdminDashboard({ perfil, isLoading, remainingBusinessDays, headerContent, stats }: AdminDashboardProps) {
  const {
    monthlyGoal,
    monthlyProduced,
    annualGoal,
    annualProduced,
    dailyGoal,
    dailyProduced,
    inProcessValue,
    inProcessCount,
    pendingActionsValue,
    pendingActionsCount,
    brokerRankings
  } = stats

  const progressPercent = monthlyGoal > 0 ? Math.round((monthlyProduced / monthlyGoal) * 100) : 0
  const remainingValue = Math.max(0, monthlyGoal - monthlyProduced)

  const dailyProgressPercent = dailyGoal > 0 ? Math.round((dailyProduced / dailyGoal) * 100) : 0

  const annualProgressPercent = annualGoal > 0 ? Math.round((annualProduced / annualGoal) * 100) : 0
  const annualRemainingValue = Math.max(0, annualGoal - annualProduced)

  return (
    <div className="space-y-8">
      {/* 1. Linha da saudação e o prazo para bater a meta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-[#1C2643] tracking-tighter">
            {headerContent.greeting}, {perfil?.nome?.split(' ')[0] || 'Admin'}!
          </h1>
          <p className="text-[12px] font-bold text-[#718198] uppercase tracking-[0.25em] mt-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            {headerContent.phrase}
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-5 self-start md:self-center relative group"
        >
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-amber-100">
             <Clock className="w-7 h-7 text-amber-500" />
          </div>
          <div className="relative z-10">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Prazo Para Bater a Meta</p>
             <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#1C2643]">{remainingBusinessDays.toString().padStart(2, '0')}</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Dias Restantes</span>
             </div>
             <p className="text-[11px] font-medium text-slate-500 mt-1 max-w-[200px] leading-tight">
                <span className="text-amber-600 font-bold italic">Sua corrida rumo à meta.</span> Faltam apenas {remainingBusinessDays} dias úteis.
             </p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 2. Meta mensal da empresa (velocimetro) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-4 lg:row-span-2">
          <DashboardCard className="h-full flex flex-col shadow-2xl shadow-[#1C2643]/5 overflow-hidden group border-slate-100">
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                 <p className="text-[12px] font-black text-[#718198] uppercase tracking-widest">Meta Mensal da Empresa</p>
                 <div className="bg-[#1C2643]/5 p-2 rounded-xl">
                    <Target className="w-5 h-5 text-[#1C2643]" />
                 </div>
              </div>
              <p className="text-lg sm:text-xl lg:text-2xl font-black text-[#1C2643] tracking-tighter mb-6 break-words">{formatCurrency(monthlyGoal)}</p>
              
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
                   <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest mt-2 tracking-[0.3em]">PROGRESSO TOTAL</p>
                </div>
              </div>

              <div className="space-y-6 mt-auto">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-center">
                      ESTATÍSTICAS EM TEMPO REAL
                    </span>
                  </div>
                  <p className="text-[12px] sm:text-[13px] font-bold text-slate-500 mt-2 text-center">
                    {remainingValue > 0 ? (
                      <>Faltam <span className="text-[#1C2643] font-black">{formatCurrency(remainingValue)}</span> para a meta</>
                    ) : (
                      <span className="text-emerald-600 font-black">A meta da empresa foi superada!</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </DashboardCard>
        </motion.div>

        {/* 3. Meta de Hoje e 4. Meta Mensal do Time */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Meta de Hoje */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4 border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100">
                  <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
                </div>
                <div className="text-right">
                </div>
              </div>
              <div>
                 <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest">Meta de Hoje</p>
                 <p className="text-2xl lg:text-3xl font-black text-[#1C2643] tracking-tighter mt-1 leading-none">{formatCurrency(dailyGoal)}</p>
              </div>
              <div className="mt-auto pt-4">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PAGO HOJE: {formatCurrency(dailyProduced)}</p>
                    <p className="text-[10px] font-black text-[#1C2643]">{dailyProgressPercent}%</p>
                 </div>
                 <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${dailyProgressPercent}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                    />
                 </div>
              </div>
            </DashboardCard>
          </motion.div>

          {/* Meta Anual da Empresa */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col justify-between bg-[#1C2643] text-white border-[#1C2643]">
              <div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                   <Target className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest leading-tight">Meta Anual da Empresa</p>
                <div className="flex flex-col mt-2">
                  <p className="text-xl lg:text-2xl font-black text-emerald-400 tracking-tighter leading-none">{formatCurrency(annualGoal)}</p>
                  <p className="text-[10px] font-bold text-white/30 uppercase mt-1">Total acumulado: {formatCurrency(annualProduced)}</p>
                </div>
              </div>
              
              <div className="mt-8">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <p className="text-xl lg:text-2xl font-black tracking-tighter leading-none text-white">{annualProgressPercent}%</p>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">Atingido</p>
                  </div>
                  <div className="text-right pb-1">
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Faltam para bater:</p>
                    <p className="text-[11px] font-black text-white/90 uppercase tracking-tight">{formatCurrency(annualRemainingValue)}</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${annualProgressPercent}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]" 
                  />
                </div>
              </div>
            </DashboardCard>
          </motion.div>
        </div>

        {/* 5. Total de contratos em andamento e Pendente de atuação */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
             {/* Total de contratos em andamento */}
             <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-12 h-12 bg-[#1C2643] rounded-2xl flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-white" />
                     </div>
                     <div>
                        <p className="text-[14px] font-black text-[#1C2643] tracking-tight uppercase">Em Andamento</p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Volume na Esteira</p>
                     </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl lg:text-3xl font-black text-[#1C2643] tracking-tighter leading-none">
                      {formatCurrency(inProcessValue)}
                    </p>
                    <div className="flex items-center gap-2 mt-4">
                       <span className="text-[13px] font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg flex items-center">
                         {inProcessCount} Contratos
                       </span>
                    </div>
                  </div>
                </div>
             </div>

             {/* O quanto tem pendente de atuação */}
             <div className="bg-[#FFF8F1] rounded-[40px] p-8 border border-amber-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <Clock className="w-7 h-7 text-white" />
                     </div>
                     <div>
                        <p className="text-[14px] font-black text-amber-900 tracking-tight uppercase">Pendente de Atuação</p>
                        <p className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">Ações Operacionais</p>
                     </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xl lg:text-2xl font-black text-amber-900 tracking-tighter leading-none">
                      {formatCurrency(pendingActionsValue)}
                    </p>
                    <div className="flex items-center gap-2 mt-4">
                       <span className="text-[13px] font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-lg flex items-center">
                         {pendingActionsCount} Pendências
                       </span>
                    </div>
                  </div>
                </div>
                <div className="mt-10 pt-6 border-t border-amber-200/50">
                   <button className="w-full py-4 bg-amber-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-600/30 hover:bg-amber-700 transition-all flex items-center justify-center gap-2">
                      ATUAR AGORA <ArrowUpRight className="w-4 h-4" />
                   </button>
                </div>
             </div>
          </div>
        </motion.div>

        {/* 6. Ranking de Vendas dos corretores */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-4">
          <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col bg-white border-slate-100">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black text-[#1C2643] tracking-tighter uppercase">Ranking de Vendas</h3>
               <Trophy className="w-6 h-6 text-amber-500 fill-amber-500" />
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar max-h-[480px]">
              {/* Ranking de Corretores */}
              <div className="space-y-6">
                {brokerRankings.map((broker, idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-black border shrink-0",
                        idx === 0 ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-100"
                      )}>
                        {idx + 1}º
                      </div>
                      <div>
                        <p className="text-[15px] font-black text-[#1C2643] leading-none uppercase">{broker.name}</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">SUP: {broker.supervisor}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-black text-[#1C2643]">{formatCurrency(broker.total)}</p>
                      <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-tighter mt-1">{broker.count} Vendas</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-10">
              <button className="w-full py-4 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 hover:text-[#1C2643] transition-all">
                RASTREAMENTO COMPLETO
              </button>
            </div>
          </DashboardCard>
        </motion.div>
      </div>
    </div>
  )
}
