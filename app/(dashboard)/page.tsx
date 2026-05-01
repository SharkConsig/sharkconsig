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

import Image from "next/image"

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
  const progressPercent = 68
  const monthlyGoal = 50000
  const monthlyProduced = 34000
  const remainingValue = monthlyGoal - monthlyProduced
  const dailyGoal = 2500
  const dailyProduced = 1800
  const currentBonus = 1250.00
  const teamGoal = 500000
  const teamProduced = 325000

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
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Prazo Final da Meta</p>
               <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#1C2643]">05</span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Dias Restantes</span>
               </div>
               <p className="text-[11px] font-medium text-slate-500 mt-1 max-w-[200px] leading-tight">
                  Ainda dá tempo de <span className="text-amber-600 font-bold">virar o jogo</span>. Cada contrato aproxima você da vitória!
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
                    <Gauge value={progressPercent} />
                  </div>
                  <div className="mt-4 flex flex-col items-center justify-center">
                     <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1C2643] tracking-tighter leading-none">{progressPercent}%</p>
                     <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest mt-2">Atingido</p>
                  </div>
                </div>

                <div className="space-y-6 mt-auto">
                  <div className="bg-[#1C2643] p-5 sm:p-6 rounded-[24px] space-y-1 text-center shadow-lg shadow-[#1C2643]/20">
                    <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Produzido Agora</p>
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-black text-white tracking-tighter break-words">{formatCurrency(monthlyProduced)}</p>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-center">Você está no caminho!</span>
                    </div>
                    <p className="text-[12px] sm:text-[13px] font-bold text-slate-500 mt-2 text-center shrink-0">
                      Faltam <span className="text-[#1C2643] font-black">{formatCurrency(remainingValue)}</span> para o próximo nível
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
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progresso</p>
                      <p className="text-[10px] font-black text-[#1C2643]">{Math.round((dailyProduced / dailyGoal) * 100)}%</p>
                   </div>
                   <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
                   <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest">GARANTIDO</p>
                   <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-amber-400 tracking-tighter mt-1 break-words leading-none">{formatCurrency(currentBonus)}</p>
                </div>
                <div className="mt-auto pt-3 border-t border-white/5">
                   <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Próximo Bônus: R$ 2.000,00</p>
                   <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1 shrink-0">(Meta: R$ 60.000,00)</p>
                </div>
              </DashboardCard>
            </motion.div>

            <motion.div variants={item}>
              <DashboardCard className="h-full border-none shadow-lg shadow-[#1C2643]/5 flex flex-col gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-2 shrink-0">
                  <Users className="w-6 h-6 text-[#1C2643]" />
                </div>
                <div className="flex flex-col min-w-0 overflow-hidden">
                   <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest leading-tight">Meta Mensal do Time</p>
                   <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-[#1C2643] tracking-tighter mt-1 break-words leading-none">{formatCurrency(teamProduced)}</p>
                </div>
                <div className="mt-auto flex items-center gap-2">
                   <div className="flex -space-x-1.5 shrink-0">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 overflow-hidden relative">
                           <Image src={`https://picsum.photos/seed/${i + 40}/50/50`} alt="user" fill className="object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                   </div>
                   <p className="text-[10px] font-bold text-[#718198] uppercase tracking-widest leading-tight">
                     {Math.round((teamProduced / teamGoal) * 100)}% completo
                   </p>
                </div>
              </DashboardCard>
            </motion.div>
          </div>

          {/* SECTION 3 & 4: MAPA DE OPORTUNIDADES & RANKING */}
          <motion.div variants={item} className="lg:col-span-8">
            <DashboardCard className="border-none shadow-lg shadow-[#1C2643]/5 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                 <div>
                   <h3 className="text-xl font-black text-[#1C2643] tracking-tight">Mapa de Oportunidades</h3>
                   <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest mt-1">Seu Pipeline Estratégico</p>
                 </div>
                 <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 italic">
                    <p className="text-[10px] font-bold text-slate-400">Total: 42 Negócios</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Quase Fechados */}
                 <div className="bg-emerald-50/50 rounded-[28px] p-6 border border-emerald-100/50 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                       </div>
                       <div>
                          <p className="text-[14px] font-black text-emerald-900 tracking-tight leading-none pb-1">Quase Fechados</p>
                          <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">Dinheiro no Bolso</p>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <PipelineItem name="Ana Maria Silva" value="R$ 12.500" status="Pendente Assinatura" color="emerald" />
                       <PipelineItem name="Carlos Roberto" value="R$ 8.200" status="Aguardando CCB" color="emerald" />
                       <PipelineItem name="Lúcia Oliveira" value="R$ 15.000" status="Pré-Aprovado" color="emerald" />
                    </div>
                 </div>

                 {/* Em Andamento */}
                 <div className="bg-blue-50/50 rounded-[28px] p-6 border border-blue-100/50 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-10 h-10 bg-[#1C2643] rounded-xl flex items-center justify-center">
                          <Clock className="w-6 h-6 text-white" />
                       </div>
                       <div>
                          <p className="text-[14px] font-black text-[#1C2643] tracking-tight leading-none pb-1">Em Andamento</p>
                          <p className="text-[10px] font-bold text-[#718198] uppercase tracking-widest">Atenção Imediata</p>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <PipelineItem name="Roberto Santos" value="R$ 5.400" status="Digitação" color="blue" />
                       <PipelineItem name="Juliana Costa" value="R$ 22.000" status="Em Análise" color="blue" />
                       <PipelineItem name="Marcos Lima" value="R$ 3.800" status="Aguardando Margem" color="blue" />
                    </div>
                 </div>
              </div>
            </DashboardCard>
          </motion.div>

          <motion.div variants={item} className="lg:col-span-4">
            <DashboardCard className="h-full border-none shadow-lg shadow-[#1C2643]/5 flex flex-col bg-white">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-xl font-black text-[#1C2643] tracking-tight">Ranking de Vendas</h3>
                 <Trophy className="w-6 h-6 text-amber-500 fill-amber-500" />
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-5 bg-[#1C2643] rounded-[24px] text-white">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border-2 border-white/20 rounded-full flex items-center justify-center font-black text-lg">3º</div>
                      <div>
                         <p className="text-[13px] font-black tracking-tight">Você</p>
                         <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Sua Posição</p>
                      </div>
                   </div>
                   <p className="text-lg font-black tracking-tight">R$ 34k</p>
                </div>

                <div className="space-y-4 px-2">
                   {[
                     { pos: '1º', name: 'Felícia Moraes', val: 'R$ 52.400' },
                     { pos: '2º', name: 'Jorge Fabrício', val: 'R$ 41.200' },
                     { pos: '4º', name: 'Valéria Sena', val: 'R$ 28.900' }
                   ].map((player, i) => (
                      <div key={i} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <span className="text-[12px] font-black text-slate-400 w-6">{player.pos}</span>
                            <p className="text-[13px] font-bold text-[#1C2643]">{player.name}</p>
                         </div>
                         <p className="text-[13px] font-black text-[#718198] tracking-tight">{player.val}</p>
                      </div>
                   ))}
                </div>

                <div className="mt-auto pt-6 border-t border-slate-50">
                   <p className="text-[11px] font-bold text-slate-400 text-center italic">
                      Faltam R$ 7.200 para chegar a 2ª posição
                   </p>
                </div>
              </div>
            </DashboardCard>
          </motion.div>

          {/* SECTION 5: CAMPANHAS PROMOCIONAIS */}
          <motion.div variants={item} className="lg:col-span-8">
            <DashboardCard className="relative overflow-hidden border-none text-white h-full bg-gradient-to-br from-[#1C2643] to-[#2D3A63] min-h-[320px] group flex flex-col justify-center">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-max h-max bg-blue-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 h-full">
                <div className="flex-1 space-y-6">
                  <div>
                    <div className="bg-amber-400 inline-block px-3 py-1 rounded-full mb-4">
                       <p className="text-[10px] font-black text-[#1C2643] uppercase tracking-[0.2em]">Campanha Ativa</p>
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-black tracking-tighter leading-tight italic">
                      SUPER PRÊMIO <span className="text-amber-400">SHARK 2024</span>
                    </h3>
                    <p className="text-white/60 text-sm font-medium mt-3 max-w-[450px] leading-relaxed">
                      O ano da sua consagração! Alcance a meta diamante e concorra a uma viagem luxuosa para o Caribe, uma Moto 0km para sua liberdade e o novo iPhone de última geração. O topo é o seu lugar!
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <button className="bg-amber-400 text-[#1C2643] px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-300 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-400/20">
                      Aproveitar Agora
                    </button>
                    <button className="bg-white/5 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10 backdrop-blur-sm">
                      Regulamento
                    </button>
                  </div>
                </div>
                
                <div className="w-1/3 min-w-[220px] h-full relative hidden xl:flex items-center justify-center">
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative w-56 h-56">
                         <motion.div 
                           animate={{ 
                             y: [0, -15, 0],
                             rotate: [6, 8, 6]
                           }}
                           transition={{ 
                             duration: 5, 
                             repeat: Infinity,
                             ease: "easeInOut"
                           }}
                           className="absolute inset-0 flex items-center justify-center"
                         >
                           <div className="relative w-full h-full p-2 bg-white/5 rounded-[40px] backdrop-blur-md border border-white/10 shadow-2xl rotate-6 overflow-hidden">
                              <Image 
                                src="https://picsum.photos/seed/caribbean/500/500" 
                                alt="Promo" 
                                fill
                                className="object-cover opacity-80 mix-blend-overlay hover:opacity-100 transition-opacity duration-700" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#1C2643]/80 to-transparent" />
                              <div className="absolute bottom-6 left-6 right-6">
                                 <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Prêmio Shark</p>
                                 <p className="text-base font-black text-white tracking-tighter uppercase shrink-0">Caribe + Moto + iPhone</p>
                              </div>
                           </div>
                         </motion.div>
                      </div>
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

function Gauge({ value }: { value: number }) {
  const segments = 9
  const radius = 70
  const centerX = 90
  const centerY = 90
  const colors = [
    "#EF4444", // Red
    "#F87171",
    "#FB923C", // Orange
    "#FBBF24",
    "#FACC15", // Yellow
    "#A3E635",
    "#4ADE80", // Light Green
    "#22C55E",
    "#10B981"  // Green
  ]

  // Needle rotation: 0% is Left (180deg), 100% is Right (360deg)
  const needleRotation = 180 + (value / 100) * 180

  return (
    <div className="relative w-full">
      <svg className="w-full" viewBox="0 0 180 100">
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
              stroke="#F1F5F9"
              strokeWidth="14"
              strokeLinecap="butt"
            />
          )
        })}

        {/* Color segments (Progress) */}
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
              stroke={colors[i]}
              strokeWidth="14"
              strokeLinecap="butt"
            />
          )
        })}

        {/* Needle */}
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
          <line
            x1="90"
            y1="90"
            x2="155"
            y2="90"
            stroke="#1C2643"
            strokeWidth="3"
          />
          <circle cx="90" cy="90" r="6" fill="#1C2643" stroke="white" strokeWidth="2.5" shadow-lg="true" />
        </motion.g>
      </svg>
    </div>
  )
}

function PipelineItem({ name, value, status, color }: { name: string, value: string, status: string, color: 'emerald' | 'blue' }) {
   return (
      <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
         <div>
            <p className="text-[13px] font-black text-[#1C2643] tracking-tight">{name}</p>
            <p className={cn(
              "text-[9px] font-bold uppercase tracking-widest mt-0.5",
              color === 'emerald' ? "text-emerald-500" : "text-blue-500"
            )}>{status}</p>
         </div>
         <p className="text-[13px] font-black text-[#1C2643]">{value}</p>
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
