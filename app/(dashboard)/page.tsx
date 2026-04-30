"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { 
  ArrowRight,
  Flame,
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
        staggerChildren: 0.05
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#FAFAFA]">
      <Header title={`Olá, ${perfil?.nome?.split(' ')[0] || 'Shark'}!`} />
      
      <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full pb-20">
        {/* Superior: Boas vindas e Ação */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-black text-[#171717] tracking-tight">
              Olá, {perfil?.nome?.split(' ')[0] || 'Shark'}!
            </h1>
            <p className="text-[11px] font-bold text-[#718198] uppercase tracking-[0.2em] mt-1">
              PRONTO PARA BATER A META?
            </p>
          </motion.div>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-[#1C2643] text-white px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#1C2643]/20 flex items-center gap-2"
          >
            Simular Proposta
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-12 gap-5"
        >
          {/* LEFT COLUMN: SUA META MENSAL (Double Height) */}
          <motion.div variants={item} className="md:col-span-3 md:row-span-2">
            <DashboardCard className="h-full flex flex-col justify-between border-[#1C2643]/10">
              <div className="space-y-6">
                <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest leading-relaxed">A SUA META MENSAL É:</p>
                
                <div className="relative flex justify-center py-6">
                  <svg className="w-40 h-20" viewBox="0 0 100 50">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#F8FAFC" strokeWidth="12" strokeLinecap="round" />
                    <path d="M 10 50 A 40 40 0 0 1 65 15" fill="none" stroke="#1C2643" strokeWidth="12" strokeLinecap="round" strokeDasharray="100" strokeDashoffset="0" />
                  </svg>
                  <div className="absolute bottom-0 text-center">
                    <p className="text-3xl font-black text-[#171717] tracking-tighter">56%</p>
                    <p className="text-[9px] font-bold text-[#718198] uppercase">Atingido</p>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-3xl font-black text-[#171717] tracking-tight">R$ 28.000</p>
                  <p className="text-[10px] font-bold text-[#718198] uppercase tracking-widest">Produzido Agora</p>
                </div>

                <div className="pt-6 border-t border-slate-50 mt-auto">
                   <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest italic">Meta Alvo: R$ 50.000</p>
                </div>
              </div>
            </DashboardCard>
          </motion.div>

          {/* TOP ROW COMPANIONS */}
          <motion.div variants={item} className="md:col-span-3">
            <DashboardCard className="h-full py-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#718198] uppercase tracking-wider">Meta Mensal do Time</p>
                  <p className="text-2xl font-black text-[#171717] tracking-tighter">R$ 172.000</p>
                  <p className="text-[10px] font-medium text-[#718198]">vs R$ 300k meta</p>
                </div>
              </div>
            </DashboardCard>
          </motion.div>

          <motion.div variants={item} className="md:col-span-3">
            <DashboardCard className="h-full py-5 border-emerald-100 bg-white">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#718198] uppercase tracking-wider">Comissão Estimada</p>
                  <p className="text-2xl font-black text-emerald-600 tracking-tighter">R$ 560,00</p>
                  <p className="text-[10px] font-medium text-[#718198]">Bônus: + R$ 1k</p>
                </div>
              </div>
            </DashboardCard>
          </motion.div>

          <motion.div variants={item} className="md:col-span-3">
            <DashboardCard className="h-full py-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#718198] uppercase tracking-wider">Ranking Geral</p>
                  <p className="text-2xl font-black text-[#1C2643] tracking-tighter">3º Lugar</p>
                  <p className="text-[10px] font-medium text-[#718198]">Falta R$ 10k pro 1º</p>
                </div>
              </div>
            </DashboardCard>
          </motion.div>

          {/* SECOND ROW COMPANIONS */}
          <motion.div variants={item} className="md:col-span-3">
            <DashboardCard className="h-full space-y-6">
              <div>
                <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest">Ordem de Ataque</p>
                <p className="text-2xl font-black text-[#171717] tracking-tighter mt-1">86% ativos</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-emerald-500" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Aprovados</p>
                  </div>
                  <p className="text-[10px] font-black text-[#171717]">52%</p>
                </div>
              </div>
            </DashboardCard>
          </motion.div>

          <motion.div variants={item} className="md:col-span-3">
            <DashboardCard className="h-full space-y-6">
               <div className="space-y-1">
                  <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest">Meta de Hoje</p>
                  <p className="text-2xl font-black text-[#1C2643] tracking-tighter">R$ 2.200</p>
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Saldo: -R$ 1.8k</p>
               </div>
               <div className="w-full h-1 bg-red-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 w-[15%]" />
               </div>
            </DashboardCard>
          </motion.div>

          <motion.div variants={item} className="md:col-span-3">
            <DashboardCard className="h-full space-y-4">
               <p className="text-[11px] font-bold text-[#718198] uppercase tracking-widest">Destaque do Dia</p>
               <div className="p-4 bg-[#171717] rounded-2xl text-white">
                  <p className="text-xs font-bold">Convênio SIAPE</p>
                  <p className="text-[10px] font-medium text-slate-400 leading-tight mt-1">Nível de conversão alto para margem livre.</p>
               </div>
            </DashboardCard>
          </motion.div>

          {/* THIRD ROW: Status Card + Banner Card */}
          <motion.div variants={item} className="md:col-span-4">
             <DashboardCard className="bg-[#171717] border-none flex flex-col justify-between py-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-4 border-orange-500 flex items-center justify-center">
                    <p className="text-[11px] font-black text-white">74.2</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-white uppercase tracking-widest">Pipeline de Aprovados</p>
                    <p className="text-[10px] font-medium text-slate-400">Impacto das propostas paradas.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-8">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 flex items-center justify-center">
                    <p className="text-[11px] font-black text-white">R$ 8k</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-white uppercase tracking-widest">Ticket Médio</p>
                    <p className="text-[10px] font-medium text-slate-400">Valor médio aprovado.</p>
                  </div>
                </div>
             </DashboardCard>
          </motion.div>

          <motion.div variants={item} className="md:col-span-8">
             <DashboardCard className="bg-[#1C2643] border-none text-white relative overflow-hidden group py-10 px-10">
                <div className="absolute top-0 right-0 h-full w-1/2 opacity-20 pointer-events-none transform translate-x-10 translate-y-10 group-hover:translate-x-5 transition-transform duration-700">
                   <div className="grid grid-cols-4 gap-2 h-full">
                     {[...Array(20)].map((_, i) => (
                       <div key={i} className="bg-white/20 rounded-t-full" style={{ height: `${Math.random() * 100}%` }} />
                     ))}
                   </div>
                </div>

                <div className="space-y-6 relative z-10 max-w-sm">
                   <div className="flex items-center gap-2 text-emerald-400">
                     <Flame className="w-4 h-4 fill-emerald-400" />
                     <p className="text-[11px] font-black uppercase tracking-widest">SharkConsig Prime</p>
                   </div>
                   <h2 className="text-4xl font-black tracking-tight leading-[0.95]">Domine o mercado de crédito.</h2>
                   <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-[#1C2643] bg-slate-400 overflow-hidden relative">
                             <Image 
                               src={`https://picsum.photos/seed/${i+10}/100/100`} 
                               alt="user" 
                               fill 
                               className="object-cover"
                               referrerPolicy="no-referrer"
                             />
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">250k+ corretores ativos</p>
                   </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  className="absolute bottom-10 right-10 w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1C2643] shadow-xl"
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
             </DashboardCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

function DashboardCard({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) {
  return (
    <div 
      id={id}
      className={cn(
        "bg-white p-6 lg:p-7 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500",
        className
      )}
    >
      {children}
    </div>
  )
}

