"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { 
  TrendingUp,
  Gift,
  Users,
  Trophy,
  CheckCircle2,
  Clock,
  Target,
  Zap
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"

export default function DashboardPage() {
  const { perfil } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  }

  // Mock data for dashboard
  const monthlyGoal = 47000
  const monthlyProduced = 0 // Zeroed to simulate start of month
  const progressPercent = Math.round((monthlyProduced / monthlyGoal) * 100)
  const remainingValue = monthlyGoal - monthlyProduced
  
  // Calculate business days in current month
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

  // Calculate remaining business days including today
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
  const dailyProduced = 0 // Zeroed as requested
  const currentBonus = 0 // Zeroed as requested
  const teamProduced = 448000

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
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* SECTION 1: O CORAÇÃO DO DASHBOARD (Meta Individual) */}
          <motion.div variants={item} className="lg:col-span-4 lg:row-span-2">
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
                     <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1C2643] tracking-tighter leading-none">{progressPercent}%</p>
                     <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest mt-2">Atingido</p>
                  </div>
                </div>

                <div className="space-y-6 mt-auto">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-center">Você está no caminho!</span>
                    </div>
                    <p className="text-[12px] sm:text-[13px] font-bold text-slate-500 mt-2 text-center shrink-0">
                      Faltam <span className="text-[#1C2643] font-black">{formatCurrency(remainingValue)}</span> para a meta
                    </p>
                  </div>
                </div>
              </div>
            </DashboardCard>
          </motion.div>

          {/* SECTION 2: O FOCO DO DIA E RECOMPENSAS */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={item}>
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
                      <p className="text-[10px] font-black text-[#1C2643]">{Math.round((dailyProduced / dailyGoal) * 100)}%</p>
                   </div>
                   <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(dailyProduced / dailyGoal) * 100}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-amber-500" 
                      />
                   </div>
                </div>
              </DashboardCard>
            </motion.div>

            <motion.div variants={item}>
              <DashboardCard className="h-full border-none shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4 bg-[#1C2643] text-white">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-2 shrink-0">
                  <Gift className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex flex-col min-w-0 overflow-hidden">
                   <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest">COMEÇANDO</p>
                   <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-amber-400 tracking-tighter mt-1 break-words leading-none">{formatCurrency(currentBonus)}</p>
                </div>
                <div className="mt-auto pt-3 border-t border-white/5">
                   <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Próxima Faixa: R$ 400,00</p>
                   <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1 shrink-0">(Meta: R$ 47.000,00)</p>
                </div>
              </DashboardCard>
            </motion.div>

            <motion.div variants={item}>
              <DashboardCard className="h-full border-none shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-2 shrink-0">
                  <Users className="w-6 h-6 text-[#1C2643]" />
                </div>
                <div className="flex flex-col min-w-0 overflow-hidden flex-1">
                   <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest leading-tight">Meta Mensal do Time</p>
                   <p className="text-[13px] font-black text-[#1C2643] mt-1.5 leading-none">
                     {formatCurrency(teamProduced)}
                   </p>
                   <p className="text-2xl sm:text-3xl lg:text-5xl xl:text-7xl font-black text-[#1C2643] tracking-tighter mt-auto break-words leading-none pb-2">0%</p>
                </div>
              </DashboardCard>
            </motion.div>
          </div>

          {/* SECTION 3 & 4: MAPA DE OPORTUNIDADES & RANKING */}
          <motion.div variants={item} className="lg:col-span-8">
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
                     {[1, 2, 3].map(i => (
                        <div key={i} className="h-14 bg-slate-100/70 rounded-2xl border border-slate-200 border-dashed" />
                     ))}
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
                     {[1, 2, 3].map(i => (
                        <div key={i} className="h-14 bg-slate-100/70 rounded-2xl border border-slate-200 border-dashed" />
                     ))}
                  </div>
               </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="lg:col-span-4">
            <DashboardCard className="h-full border-none shadow-lg shadow-[#1C2643]/5 flex flex-col bg-white">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-xl font-black text-[#1C2643] tracking-tight">Ranking de Vendas</h3>
                 <Trophy className="w-6 h-6 text-amber-500 fill-amber-500" />
              </div>

              <div className="space-y-8 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between p-6 bg-[#1C2643] rounded-[24px] text-white shadow-xl shadow-[#1C2643]/20">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 border-2 border-white/20 rounded-full flex items-center justify-center font-black text-xl">3º</div>
                      <div>
                         <p className="text-[15px] font-black tracking-tight">Você</p>
                         <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Sua Posição</p>
                      </div>
                   </div>
                   <p className="text-2xl font-black tracking-tight">{formatCurrency(monthlyProduced)}</p>
                </div>

                <div className="pt-8 border-t border-slate-50">
                   <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4 border border-slate-100">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                         <Target className="w-5 h-5 text-amber-500" />
                      </div>
                      <p className="text-[13px] font-bold text-[#1C2643] leading-tight">
                         Faltam <span className="text-amber-600 font-black">{formatCurrency(remainingValue)}</span> para você alcançar a <span className="font-black underline decoration-amber-500 decoration-2 underline-offset-2">meta</span>
                      </p>
                   </div>
                </div>
              </div>
            </DashboardCard>
          </motion.div>

          {/* SECTION 5: CAMPANHAS PROMOCIONAIS */}
          <motion.div variants={item} className="lg:col-span-8">
            <DashboardCard className="relative overflow-hidden border-none text-white h-full bg-gradient-to-br from-[#1C2643] to-[#2D3A63] min-h-[320px] group flex flex-col justify-center pl-6 sm:pl-10">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-max h-max bg-blue-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 h-full">
                <div className="flex-1 space-y-6">
                  <div>

                    <h3 className="text-3xl sm:text-4xl font-black tracking-tighter leading-tight italic">
                      PREPARE-SE: <span className="text-amber-400"> NOVIDADES EM BREVE</span>
                    </h3>
                    <p className="text-white/60 text-sm font-medium mt-3 max-w-[450px] leading-relaxed">
                      Uma nova campanha avassaladora está sendo preparada para recompensar sua dedicação. Continue focado em suas metas, pois o que vem por aí será histórico!
                    </p>
                  </div>
                  

                </div>
                
              </div>
            </DashboardCard>
          </motion.div>
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
  
  // Dynamic color based on value
  const getGaugeColor = (val: number) => {
    if (val <= 25) return "#94A3B8" // Gray
    if (val <= 50) return "#EF4444" // Red
    if (val <= 75) return "#FB923C" // Orange
    if (val <= 90) return "#FACC15" // Yellow
    if (val <= 99) return "#86EFAC" // Light Green
    return "#10B981" // Dark Green
  }

  const currentColor = getGaugeColor(value)
  const needleRotation = 180 + (value / 100) * 180
  
  // Format value to "34k" style
  const formattedValue = producedValue >= 1000 
    ? `${(producedValue / 1000).toFixed(0)}k` 
    : producedValue.toString()

  return (
    <div className="relative w-full">
      <svg className="w-full" viewBox="0 0 180 120">
        {/* Background segments (Track) */}
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

        {/* Color segments (Progress) - now using dynamic uniform color */}
        {Array.from({ length: segments }).map((_, i) => {
          const segmentThreshold = (i / segments) * 100
          if (value < segmentThreshold) return null

          const startAngle = Math.PI + (i * Math.PI) / segments
          const segmentProgress = Math.min(1, Math.max(0, (value - segmentThreshold) / (100 / segments)))
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

        {/* Needle Group */}
        <motion.g
          initial={{ rotate: 180 }}
          animate={{ rotate: needleRotation }}
          transition={{ duration: 1.5, type: "spring", stiffness: 40, damping: 12 }}
          style={{ originX: '90px', originY: '90px' }}
        >
          {/* Shadow of the needle */}
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
          {/* Needle path */}
          <line
            x1="90"
            y1="90"
            x2="155"
            y2="90"
            stroke="#1C2643"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Center point */}
          <circle cx="90" cy="90" r="6" fill="#1C2643" stroke="white" strokeWidth="2.5" />
          
          {/* Value at the tip */}
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
