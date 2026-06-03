"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  Briefcase, 
  UserCheck, 
  UserPlus,
  Megaphone,
  Sparkles,
  History,
  TrendingUp
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

interface HRMetric {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
}

export function HRDashboard() {
  const { perfil } = useAuth()
  const [colaboradoresCount, setColaboradoresCount] = useState(24)
  const [entrevistasCount, setEntrevistasCount] = useState(6)
  const [advertenciasCount, setAdvertenciasCount] = useState(3)

  const firstFirstLetter = useMemo(() => {
    return perfil?.nome ? perfil.nome.charAt(0).toUpperCase() : "U"
  }, [perfil?.nome])

  // Custom HR Metrics Cards
  const metrics: HRMetric[] = [
    {
      title: "Colaboradores Ativos",
      value: colaboradoresCount,
      description: "Profissionais contratados",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Entrevistas Agendadas",
      value: entrevistasCount,
      description: "Recrutamento ativo este mês",
      icon: Calendar,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Advertências",
      value: advertenciasCount,
      description: "Registros de disciplina",
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    },
    {
      title: "Tempo de Empresa",
      value: "4 Colabs",
      description: "Completando aniversário este mês",
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ]

  const modules = [
    {
      title: "ENTREVISTAS",
      description: "Gerenciar banco de currículos, agendar e tabular entrevistas para novos candidatos.",
      href: "/entrevistas",
      icon: Calendar,
      themeColor: "from-blue-500 to-indigo-600",
      actionText: "Acessar Entrevistas"
    },
    {
      title: "COLABORADORES",
      description: "Pasta digital completa dos colaboradores, histórico de salários, cargos e equipes.",
      href: "/colaboradores",
      icon: Briefcase,
      themeColor: "from-emerald-500 to-teal-600",
      actionText: "Ver Colaboradores"
    },
    {
      title: "ADVERTÊNCIAS",
      description: "Lançar punições disciplinares, termos de advertência formal e suspensões.",
      href: "/advertencias",
      icon: AlertTriangle,
      themeColor: "from-amber-500 to-orange-600",
      actionText: "Acessar Advertências"
    },
    {
      title: "TEMPO DE EMPRESA",
      description: "Visualizar tempo de serviço de cada colaborador e alertas de comissões/benefícios de tempo.",
      href: "/tempo-empresa",
      icon: Clock,
      themeColor: "from-purple-500 to-pink-600",
      actionText: "Acessar Tempo de Casa"
    },
    {
      title: "GESTÃO DE USUÁRIOS",
      description: "Controle de login, definição de permissões e alteração de senha de corretores e gerentes.",
      href: "/configuracoes/usuarios",
      icon: UserPlus,
      themeColor: "from-slate-700 to-slate-900",
      actionText: "Gerenciar Logins"
    }
  ]

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Greetings Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-[#1C2643] to-[#0f172a] p-8 text-white shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 backdrop-blur-md text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full border border-white/10">
              Módulo Recursos Humanos
            </span>
            <span className="flex items-center gap-1 bg-amber-400 text-slate-950 text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3 animate-pulse" /> Ativo
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">
            Olá, {perfil?.nome || "Gestor de RH"}
          </h1>
          <p className="text-slate-200 text-xs sm:text-sm max-w-xl font-medium leading-relaxed">
            Seja bem-vindo ao painel central de Recursos Humanos. Aqui você pode gerenciar todas as rotinas internas, acompanhar contratações e acompanhar termos comportamentais.
          </p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border border-slate-150 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {metric.title}
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {metric.value}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500">
                      {metric.description}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${metric.bgColor} ${metric.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Modules Access Grid */}
      <div className="space-y-4">
        <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">
          Acesso Rápido aos Módulos
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod, index) => {
            const Icon = mod.icon
            return (
              <motion.div
                key={mod.title}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + (index * 0.05) }}
                className="group"
              >
                <Card className="border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 duration-300 bg-white overflow-hidden flex flex-col h-full justify-between">
                  <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${mod.themeColor} flex items-center justify-center text-white shrink-0 shadow-md`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">
                        {mod.title}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Link href={mod.href} className="w-full">
                        <Button className="w-full bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-primary rounded-xl h-[38px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                          {mod.actionText}
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Internal Announcements Box */}
      <div className="bg-slate-100/50 border border-slate-200 rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 shrink-0">
          <Megaphone className="w-8 h-8 animate-bounce" />
        </div>
        <div className="space-y-1.5 flex-1 text-center md:text-left">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Lembrete de Conformidade Administrativa</h4>
          <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-3xl">
            Sempre que gerar uma Advertência comportamento ou termo de rescisão de Contratos, recolha a assinatura física ou digital do colaborador e vincule o PDF ao cadastro digital correspondente para evitar passivo trabalhista futuramente.
          </p>
        </div>
      </div>
    </div>
  )
}
