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
  PieChart as PieChartIcon,
  BarChart3,
  MessageSquare
} from "lucide-react"
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts"
import { cn } from "@/lib/utils"
import { DashboardCard, Gauge, formatCurrency } from "./dashboard-shared"

interface Perfil {
  id: string
  nome: string
  role: string
}

interface RankingItem {
  corretor_id: string
  name: string
  team: string
  supervisor: string
  totalPaid: number
  totalInProcess: number
  totalToday: number
  countPaid: number
  countInProcess: number
  countToday: number
}

interface TicketStats {
  total: number
  notApproved: number
  converted: number
  byStatus: { name: string; value: number; color: string }[]
  byOrigin: { name: string; value: number }[]
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
  createdTodayValue: number
  createdTodayCount: number
  createdWeekValue: number
  createdWeekCount: number
  createdMonthValue: number
  createdMonthCount: number
  brokerRankings: RankingItem[]
  ticketStats?: TicketStats
}

interface AdminDashboardProps {
  perfil: Perfil | null
  isLoading: boolean
  remainingBusinessDays: number
  headerContent: { greeting: string, phrase: string }
  stats: AdminStats
  startDate: string
  endDate: string
  setStartDate: (d: string) => void
  setEndDate: (d: string) => void
}

export function AdminDashboard({ 
  perfil, 
  isLoading, 
  remainingBusinessDays, 
  headerContent, 
  stats,
  startDate,
  endDate,
  setStartDate,
  setEndDate
}: AdminDashboardProps) {
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
    createdTodayValue,
    createdTodayCount,
    createdWeekValue,
    createdWeekCount,
    createdMonthValue,
    createdMonthCount,
    brokerRankings,
    ticketStats
  } = stats

  const [tempStartDate, setTempStartDate] = React.useState(startDate)
  const [tempEndDate, setTempEndDate] = React.useState(endDate)
  const [activeTab, setActiveTab] = React.useState<'propostas' | 'chamados'>('propostas')

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

      {/* TABS SELECTION */}
      <div className="flex items-center gap-2 p-1 bg-slate-100/80 w-fit rounded-2xl mb-8">
        <button
          onClick={() => setActiveTab('propostas')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
            activeTab === 'propostas' 
              ? "bg-white text-[#1C2643] shadow-md shadow-[#1C2643]/5" 
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Propostas e Metas
        </button>
        <button
          onClick={() => setActiveTab('chamados')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
            activeTab === 'chamados' 
              ? "bg-white text-[#1C2643] shadow-md shadow-[#1C2643]/5" 
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Gráficos de Chamados
        </button>
      </div>

      {activeTab === 'propostas' ? (
        <motion.div 
          key="propostas"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Existing Proposal Content */}
          {/* 2. Meta mensal da empresa (velocimetro) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-4 lg:row-span-2">
          <DashboardCard className="h-full flex flex-col shadow-2xl shadow-[#1C2643]/5 overflow-hidden group border-slate-100">
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                 <p className="text-[12px] font-black text-[#718198] uppercase tracking-widest">META MENSAL DA EMPRESA</p>
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
             <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-8">
                     <div className="w-12 h-12 bg-[#00C896] rounded-2xl flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-7 h-7 text-white" />
                     </div>
                     <p className="text-[13px] font-black text-[#1C2643] tracking-tighter uppercase whitespace-nowrap">TOTAL DE CONTRATOS EM ANDAMENTO</p>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">VALOR TOTAL EM ANDAMENTO</p>
                    <p className="text-4xl lg:text-6xl font-black text-[#FF4A00] tracking-tighter leading-none">
                      {formatCurrency(inProcessValue)}
                    </p>
                    
                    <div className="w-full h-[1px] bg-slate-100 my-6" />
                    
                    <p className="text-[14px] font-bold text-[#1C2643]">
                      {inProcessCount} Contratos
                    </p>

                    <p className="text-[13px] font-medium text-slate-500 mt-6">
                      Você tem <span className="text-[#1C2643] font-black">{formatCurrency(pendingActionsValue)}</span> pendentes de atuação
                    </p>
                  </div>
                </div>
             </div>

             {/* Contratos Digitados (Replacing redundant Pendente de Atuação) */}
             <div className="bg-[#1C2643] rounded-[40px] p-8 border border-[#1C2643] shadow-lg shadow-[#1C2643]/10 flex flex-col justify-between text-white">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                        <Zap className="w-7 h-7 text-amber-400" />
                     </div>
                     <div>
                        <p className="text-[14px] font-black text-white tracking-tight uppercase">CONTRATOS DIGITADOS</p>
                        <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest leading-none">Produção Bruta</p>
                     </div>
                  </div>

                  <div className="space-y-4 mt-6">
                    <div>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Hoje</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl lg:text-3xl font-black text-amber-400 tracking-tighter leading-none">
                          {formatCurrency(createdTodayValue)}
                        </p>
                        <span className="text-[11px] font-bold text-white/60 uppercase">{createdTodayCount} CONTRATOS</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Esta Semana</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-xl font-black text-white tracking-tighter leading-none">
                          {formatCurrency(createdWeekValue)}
                        </p>
                        <span className="text-[11px] font-bold text-white/60 uppercase">{createdWeekCount} CONTRATOS</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Este Mês</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-base font-black text-white tracking-tighter leading-none">
                          {formatCurrency(createdMonthValue)}
                        </p>
                        <span className="text-[11px] font-bold text-white/60 uppercase">{createdMonthCount} CONTRATOS</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5">
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                     <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest leading-none">
                       Atualizado em Tempo Real
                     </p>
                   </div>
                </div>
             </div>
          </div>
        </motion.div>

        {/* 6. Ranking de Vendas dos corretores */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-12">
          <DashboardCard className="h-full shadow-lg shadow-[#1C2643]/5 flex flex-col bg-white border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
               <div className="flex items-center gap-3">
                 <h3 className="text-xl font-black text-[#1C2643] tracking-tighter uppercase">Ranking de Vendas</h3>
                 <Trophy className="w-6 h-6 text-amber-500 fill-amber-500" />
               </div>
               
               <div className="flex flex-wrap items-end gap-3">
                 <div className="flex flex-col">
                   <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Início</span>
                   <input 
                     type="date" 
                     value={tempStartDate}
                     onChange={(e) => setTempStartDate(e.target.value)}
                     className="text-[13px] font-bold text-[#1C2643] bg-slate-100 border-none rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#1C2643]/20"
                   />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fim</span>
                   <input 
                     type="date" 
                     value={tempEndDate}
                     onChange={(e) => setTempEndDate(e.target.value)}
                     className="text-[13px] font-bold text-[#1C2643] bg-slate-100 border-none rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#1C2643]/20"
                   />
                 </div>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => {
                       setStartDate(tempStartDate);
                       setEndDate(tempEndDate);
                     }}
                     disabled={!tempStartDate && !tempEndDate}
                     className="px-4 py-2 bg-[#1C2643] text-white text-[11px] font-black rounded-lg hover:bg-[#1C2643]/90 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                   >
                     APLICAR
                   </button>
                   <button 
                     onClick={() => {
                       setTempStartDate("");
                       setTempEndDate("");
                       setStartDate("");
                       setEndDate("");
                     }}
                     className="px-4 py-2 bg-slate-100 text-slate-500 text-[11px] font-black rounded-lg hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                   >
                     HOJE
                   </button>
                 </div>
               </div>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posição e Nome</th>
                    <th className="px-4 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right bg-emerald-100/50">Produção (Pagos)</th>
                    <th className="px-4 py-3 text-[10px] font-black text-orange-600 uppercase tracking-widest text-right bg-orange-100/50">Em Andamento</th>
                    <th className="px-4 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest text-right bg-blue-100/50">Digitadas Hoje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brokerRankings.map((rank, idx) => {
                    const isUser = rank.corretor_id === perfil?.id
                    const position = idx + 1
                    return (
                      <tr key={rank.corretor_id || idx} className={cn(
                        "transition-colors",
                        isUser ? "bg-[#1C2643]/5" : "hover:bg-slate-50/80"
                      )}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 border",
                              position === 1 ? "bg-amber-100 text-amber-600 border-amber-200" : 
                              position === 2 ? "bg-slate-100 text-slate-500 border-slate-200" :
                              position === 3 ? "bg-orange-100 text-orange-600 border-orange-200" :
                              "bg-white text-slate-400 border-slate-100"
                            )}>
                              {position}º
                            </div>
                            <div>
                              <p className={cn(
                                "text-[14px] font-black tracking-tight uppercase",
                                isUser ? "text-[#1C2643]" : "text-slate-700"
                              )}>
                                {rank.name} {isUser && "(Você)"}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">SUP: {rank.supervisor}</p>
                            </div>
                          </div>
                        </td>
                        <td className={cn(
                          "px-4 py-4 text-right transition-colors",
                          isUser ? "bg-emerald-100/70" : "bg-emerald-100/25"
                        )}>
                          <div className="flex flex-col items-end">
                            <span className="text-[14px] font-black text-[#1C2643]">{formatCurrency(rank.totalPaid)}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              {rank.countPaid} {rank.countPaid === 1 ? 'Contrato' : 'Contratos'}
                            </span>
                          </div>
                        </td>
                        <td className={cn(
                          "px-4 py-4 text-right transition-colors",
                          isUser ? "bg-orange-100/70" : "bg-orange-100/25"
                        )}>
                          <div className="flex flex-col items-end">
                            <span className="text-[14px] font-bold text-orange-600">{formatCurrency(rank.totalInProcess)}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              {rank.countInProcess} {rank.countInProcess === 1 ? 'Contrato' : 'Contratos'}
                            </span>
                          </div>
                        </td>
                        <td className={cn(
                          "px-4 py-4 text-right transition-colors",
                          isUser ? "bg-blue-100/70" : "bg-blue-100/25"
                        )}>
                          <div className="flex flex-col items-end">
                            <span className={cn(
                              "text-[14px] font-bold",
                              rank.totalToday > 0 ? "text-blue-600" : "text-slate-400"
                            )}>
                              {formatCurrency(rank.totalToday)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              {rank.countToday} {rank.countToday === 1 ? 'Contrato' : 'Contratos'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>


          </DashboardCard>
        </motion.div>
      </motion.div>
    ) : (
        <motion.div 
          key="chamados"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Ticket Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <DashboardCard className="p-6 bg-white border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total de Chamados</p>
              <p className="text-3xl font-black text-[#1C2643] tracking-tighter">{ticketStats?.total || 0}</p>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Abertos no Período</p>
            </DashboardCard>
            
            <DashboardCard className="p-6 bg-white border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Não Aprovados</p>
              <p className="text-3xl font-black text-rose-600 tracking-tighter">{ticketStats?.notApproved || 0}</p>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Recusados/Cancelados</p>
            </DashboardCard>

            <DashboardCard className="p-6 bg-white border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Convertidos em Proposta</p>
              <p className="text-3xl font-black text-emerald-600 tracking-tighter">{ticketStats?.converted || 0}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                  {ticketStats?.total ? Math.round((ticketStats.converted / ticketStats.total) * 100) : 0}% Taxa
                </span>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">de Conversão</p>
              </div>
            </DashboardCard>

            <DashboardCard className="p-6 bg-white border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Aguardando Análise</p>
              <p className="text-3xl font-black text-amber-500 tracking-tighter">
                {(ticketStats?.byStatus?.find(s => s.name === 'ABERTO')?.value || 0)}
              </p>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Em fila de espera</p>
            </DashboardCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart: Status dos Chamados */}
            <DashboardCard className="p-8 bg-white border-slate-100 h-[400px] flex flex-col">
              <div className="flex items-center gap-2 mb-8">
                <PieChartIcon className="w-5 h-5 text-[#1C2643]" />
                <h3 className="text-sm font-black text-[#1C2643] uppercase tracking-[0.15em]">Distribuição por Status</h3>
              </div>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketStats?.byStatus || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={100}
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                      labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text 
                                x={x} 
                                y={y} 
                                fill="#FFFFFF" 
                                textAnchor="middle" 
                                dominantBaseline="central" 
                                className="text-[12px] font-black"
                              >
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                            );
                          }}
                    >
                      {(ticketStats?.byStatus || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>

            {/* Bar Chart: Origem dos Clientes */}
            <DashboardCard className="p-8 bg-white border-slate-100 h-[400px] flex flex-col">
              <div className="flex items-center gap-2 mb-8">
                <TrendingUp className="w-5 h-5 text-[#1C2643]" />
                <h3 className="text-sm font-black text-[#1C2643] uppercase tracking-[0.15em]">Origem dos Clientes</h3>
              </div>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketStats?.byOrigin || []} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                        fontSize: '12px'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#1C2643" 
                      radius={[0, 4, 4, 0]} 
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>
          </div>
        </motion.div>
      )}
    </div>
  )
}
