"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { 
  Users, 
  FileText, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  MessageSquarePlus,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts"

export default function DashboardPage() {
  const { perfil } = useAuth()
  const [stats, setStats] = useState({
    totalPropostas: 0,
    propostasAprovadas: 0,
    chamadosAbertos: 0,
    totalClientes: 0
  })

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          { count: propostasCount },
          { count: aprovadasCount },
          { count: chamadosCount },
          { count: clientesCount }
        ] = await Promise.all([
          supabase.from('propostas').select('*', { count: 'exact', head: true }),
          supabase.from('propostas').select('*', { count: 'exact', head: true }).eq('status', 'APROVADA'),
          supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'ABERTO'),
          supabase.from('clientes').select('*', { count: 'exact', head: true })
        ])

        setStats({
          totalPropostas: propostasCount || 0,
          propostasAprovadas: aprovadasCount || 0,
          chamadosAbertos: chamadosCount || 0,
          totalClientes: clientesCount || 0
        })
      } catch (err) {
        console.error("Error fetching dashboard stats:", err)
      }
    }

    fetchStats()
  }, [])

  // Mock data for charts
  const monthlyData = [
    { name: "Jan", v: 4000 },
    { name: "Fev", v: 3000 },
    { name: "Mar", v: 5000 },
    { name: "Abr", v: 4780 },
    { name: "Mai", v: 6890 },
    { name: "Jun", v: 7390 },
  ]

  return (
    <div className="flex-1 flex flex-col">
      <Header title="DASHBOARD" />
      
      <div className="p-4 lg:p-8 space-y-8 max-w-[1400px] mx-auto w-full pb-20">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Olá, {perfil?.nome?.split(' ')[0] || 'Usuário'}!
              <span className="text-primary animate-pulse">👋</span>
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Aqui está o resumo da sua operação hoje.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-slate-100">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total de Propostas" 
            value={stats.totalPropostas.toString()} 
            icon={FileText}
            trend="+12%"
            trendUp={true}
          />
          <StatCard 
            title="Propostas Aprovadas" 
            value={stats.propostasAprovadas.toString()} 
            icon={CheckCircle2}
            trend="+5%"
            trendUp={true}
            color="emerald"
          />
          <StatCard 
            title="Chamados Abertos" 
            value={stats.chamadosAbertos.toString()} 
            icon={MessageSquarePlus}
            trend="-2"
            trendUp={false}
            color="orange"
          />
          <StatCard 
            title="Clientes na Base" 
            value={stats.totalClientes.toLocaleString()} 
            icon={Users}
            trend="+1.2k"
            trendUp={true}
            color="blue"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 card-shadow border border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50/50 pb-6">
              <div>
                <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Produção Mensal</CardTitle>
                <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">R$ 1.240,00</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="h-[300px] w-full pt-8 px-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A2B49" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#1A2B49" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: 800, color: '#1A2B49', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="v" 
                    stroke="#1A2B49" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-shadow border border-slate-100 flex flex-col">
            <CardHeader className="border-b border-slate-50/50 pb-6">
              <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Metas do Mês</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center space-y-8 py-8">
              <GoalItem title="Propostas Digitadas" current={45} target={100} color="primary" />
              <GoalItem title="Volume de Vendas" current={72} target={100} color="emerald" />
              <GoalItem title="Fidelização" current={30} target={100} color="blue" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color = "primary" }: { 
  title: string, 
  value: string, 
  icon: any, 
  trend: string, 
  trendUp: boolean, 
  color?: "primary" | "emerald" | "orange" | "blue" 
}) {
  const colors: Record<string, string> = {
    primary: "text-[#1A2B49] bg-slate-50",
    emerald: "text-emerald-600 bg-emerald-50/50",
    orange: "text-orange-600 bg-orange-50/50",
    blue: "text-blue-600 bg-blue-50/50"
  }

  return (
    <Card className="card-shadow border border-slate-50 relative overflow-hidden group hover:border-primary/20 transition-all cursor-default">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110 duration-300", colors[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-black tracking-tight rounded-full px-2.5 py-1",
            trendUp ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
          )}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{title}</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function GoalItem({ title, current, target, color }: {
  title: string,
  current: number,
  target: number,
  color: "primary" | "emerald" | "blue"
}) {
  const percentage = (current / target) * 100
  const colorClass = color === 'primary' ? 'bg-[#1A2B49]' : color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <p className="text-[12px] font-black text-slate-900">{current}%</p>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000", colorClass)}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}
