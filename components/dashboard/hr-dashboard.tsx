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
  UserPlus,
  Megaphone,
  Cake
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"

interface HRMetric {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  href: string
}

interface DBCollaborator {
  id: string
  status?: string | null
  data_admissao?: string | null
  joinDate?: string | null
  data_nascimento?: string | null
  birthDate?: string | null
}

// Helper to parse birthday month safely (0-indexed)
const getBirthdayMonth = (dateStr: string): number | null => {
  if (!dateStr) return null
  const cleanStr = dateStr.trim()
  
  if (cleanStr.includes("/")) {
    const parts = cleanStr.split("/")
    if (parts.length >= 2) {
      return parseInt(parts[1], 10) - 1
    }
  } else if (cleanStr.includes("-")) {
    const parts = cleanStr.split("-")
    if (parts.length >= 2) {
      if (parts[0].length === 4) {
        return parseInt(parts[1], 10) - 1 // YYYY-MM-DD
      } else {
        return parseInt(parts[1], 10) - 1 // DD-MM-YYYY
      }
    }
  }
  // Try fallback to date parse
  const parsed = Date.parse(cleanStr)
  if (!isNaN(parsed)) {
    return new Date(parsed).getMonth()
  }
  return null
}

export function HRDashboard() {
  const { perfil } = useAuth()
  const [colaboradoresCount, setColaboradoresCount] = useState(0)
  const [entrevistasCount, setEntrevistasCount] = useState(0)
  const [advertenciasCount, setAdvertenciasCount] = useState(0)
  const [birthdaysCount, setBirthdaysCount] = useState(0)

  const firstName = useMemo(() => {
    if (!perfil?.nome) return "GESTOR"
    return perfil.nome.trim().split(/\s+/)[0].toUpperCase()
  }, [perfil?.nome])

  // UseEffect to load actual numbers and fallback safely to offline local cache
  useEffect(() => {
    async function loadStats() {
      // 1. Initial Local Cache Fallback
      let colabsLocal: DBCollaborator[] = []
      let interviewsLocal: Record<string, unknown>[] = []
      let warningsLocal: Record<string, unknown>[] = []

      try {
        const savedColabs = localStorage.getItem("shark_hr_collaborators_spreadsheet")
        if (savedColabs) {
          colabsLocal = JSON.parse(savedColabs)
        }
      } catch (e) {
        console.error("Local colabs read err:", e)
      }

      try {
        const savedInterviews = localStorage.getItem("shark_hr_interviews_spreadsheet")
        if (savedInterviews) {
          interviewsLocal = JSON.parse(savedInterviews)
        }
      } catch (e) {
        console.error("Local interviews read err:", e)
      }

      try {
        const savedWarnings = localStorage.getItem("hr_warning_records_v2")
        if (savedWarnings) {
          warningsLocal = JSON.parse(savedWarnings)
        }
      } catch (e) {
        console.error("Local warnings read err:", e)
      }

      const activeColabsLocal = colabsLocal.filter((item: DBCollaborator) => {
        const status = item.status || "Ativo"
        return status !== "Inativo"
      })
      setColaboradoresCount(activeColabsLocal.length)
      setEntrevistasCount(interviewsLocal.length)
      setAdvertenciasCount(warningsLocal.length)

      const today = new Date()
      const currentMonth = today.getMonth()

      const birthLocalCount = activeColabsLocal.filter((item: DBCollaborator) => {
        const dateStr = item.birthDate || item.data_nascimento || ""
        const m = getBirthdayMonth(dateStr)
        return m === currentMonth
      }).length
      setBirthdaysCount(birthLocalCount)

      // 2. Direct Supabase Query fetch
      try {
        const { data: colabsData } = await supabase
          .from("hr_colaboradores")
          .select("id, status, data_admissao, data_nascimento")
        
        if (colabsData) {
          const activeSupa = (colabsData as DBCollaborator[]).filter((item: DBCollaborator) => {
            const status = item.status || "Ativo"
            return status !== "Inativo"
          })
          setColaboradoresCount(activeSupa.length)

          const birthSupaCount = activeSupa.filter((item: DBCollaborator) => {
            const dateStr = item.data_nascimento || ""
            const m = getBirthdayMonth(dateStr)
            return m === currentMonth
          }).length
          setBirthdaysCount(birthSupaCount)
        }

        const { data: interviewsData } = await supabase
          .from("hr_interviews")
          .select("id")
        
        if (interviewsData) {
          setEntrevistasCount(interviewsData.length)
        }

        const { data: warningsData } = await supabase
          .from("hr_advertencias")
          .select("id")
        
        if (warningsData) {
          setAdvertenciasCount(warningsData.length)
        }
      } catch (err) {
        console.warn("Failed to query live dashboard statistics, offline cache remains active:", err)
      }
    }

    loadStats()
  }, [])

  // Custom HR Metrics Cards
  const metrics: HRMetric[] = [
    {
      title: "Colaboradores Ativos",
      value: colaboradoresCount,
      description: "Profissionais contratados",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/colaboradores"
    },
    {
      title: "Aniversariantes do Mês",
      value: birthdaysCount,
      description: "Datas de nascimento este mês",
      icon: Cake,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      href: "/colaboradores"
    },
    {
      title: "Entrevistas Agendadas",
      value: entrevistasCount,
      description: "Recrutamento ativo este mês",
      icon: Calendar,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      href: "/entrevistas"
    },
    {
      title: "Advertências",
      value: advertenciasCount,
      description: "Registros de disciplina",
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      href: "/advertencias"
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
      {/* Greetings Hero (Clean structure with specific #1C2643 typography color) */}
      <div className="py-2">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-[#1C2643]">
            Olá, {firstName}
          </h1>
          <p className="text-[#1C2643] text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            Seja bem-vindo ao painel central de Recursos Humanos. Aqui você pode gerenciar todas as rotinas internas, acompanhar contratações e acompanhar termos comportamentais.
          </p>
        </div>
      </div>

      {/* Grid Summary Cards (Fully functional real numbers with interactive Link wraps) */}
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
              <Link href={metric.href} className="block transition-all hover:-translate-y-1 duration-200">
                <Card className="border border-slate-150 rounded-2xl shadow-sm hover:shadow-md bg-white overflow-hidden">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {metric.title}
                      </p>
                      <p className="text-2xl font-black text-[#1C2643]">
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
              </Link>
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
