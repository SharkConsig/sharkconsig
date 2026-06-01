"use client"

import React, { useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  Clock, 
  Award, 
  Gift, 
  Heart, 
  TrendingUp, 
  Calendar, 
  ChevronRight, 
  Sparkles,
  Users
} from "lucide-react"

interface EmployeeTenure {
  id: string
  name: string
  role: string
  joinDate: string
  tenureYears: number
  tenureMonths: number
  nextMilestone: string
  giftAwarded: boolean
}

const initialTenures: EmployeeTenure[] = [
  {
    id: "1",
    name: "Mariana Costa Neves",
    role: "Supervisor Comercial",
    joinDate: "2023-01-10",
    tenureYears: 3,
    tenureMonths: 5,
    nextMilestone: "4 Anos (Jan 2027)",
    giftAwarded: true
  },
  {
    id: "2",
    name: "Gabriela Souza Santos",
    role: "Corretor Consignado Sênior",
    joinDate: "2024-02-15",
    tenureYears: 2,
    tenureMonths: 3,
    nextMilestone: "3 Anos (Fev 2027)",
    giftAwarded: true
  },
  {
    id: "3",
    name: "Leonardo Albuquerque",
    role: "Corretor Executivo de Vendas",
    joinDate: "2024-11-01",
    tenureYears: 1,
    tenureMonths: 7,
    nextMilestone: "2 Anos (Nov 2026)",
    giftAwarded: true
  },
  {
    id: "4",
    name: "Henrique de Oliveira",
    role: "Operador de Backoffice",
    joinDate: "2025-05-20",
    tenureYears: 1,
    tenureMonths: 0,
    nextMilestone: "2 Anos (Mai 2027)",
    giftAwarded: false
  },
  {
    id: "5",
    name: "Thais Fernanda Pereira",
    role: "Estagiário Comercial",
    joinDate: "2025-12-05",
    tenureYears: 0,
    tenureMonths: 6,
    nextMilestone: "1 Ano (Dez 2026)",
    giftAwarded: false
  }
]

export default function TempoEmpresaPage() {
  const [tenures, setTenures] = useState<EmployeeTenure[]>(initialTenures)
  const [searchQuery, setSearchQuery] = useState("")

  const handleCelebrate = (name: string) => {
    alert("Uma notificação de comemoração especial de aniversário de tempo de casa foi enviada no painel principal da " + name + "! 🎉")
  }

  const handleToggleGift = (id: string, current: boolean) => {
    setTenures(tenures.map(t => t.id === id ? { ...t, giftAwarded: !current } : t))
  }

  const filteredTenures = tenures.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header title="TEMPO DE EMPRESA" />

      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">
        {/* Statistics and Milestones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mais Veterano(a)</p>
                <p className="text-[14px] font-black text-slate-800 mt-2 uppercase">Mariana Costa Neves</p>
                <p className="text-[10px] font-medium text-slate-500 mt-1">3 Anos e 5 Meses na SharkConsig</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                <Award className="w-6 h-6 animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-bold">Média de Permanência</p>
                <p className="text-3xl font-black text-slate-800 mt-1">1.6 Anos</p>
                <p className="text-[10px] font-medium text-slate-500 mt-1">Retenção de pessoal acima do mercado</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Premiações Entregues</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{tenures.filter(t => t.giftAwarded).length}</p>
                <p className="text-[10px] font-medium text-slate-500 mt-1">Medalhas e Kit de Aniversário</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <Gift className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List Card */}
        <Card className="border border-slate-200 overflow-hidden bg-white rounded-2xl shadow-sm">
          <CardContent className="p-0">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full md:max-w-md">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Pesquisar por colaborador..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 w-full"
                />
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Colaborador</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admissão</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo de Serviço</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Próxima Meta (Aniversário)</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kit Aniversário Embalado?</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Festejar Comercial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenures.map((ten) => (
                    <tr key={ten.id} className="hover:bg-slate-50/20 transition-all text-xs">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100 shadow-sm">
                            {ten.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-700 uppercase">{ten.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{ten.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-slate-500 font-bold text-[11px]">
                        {ten.joinDate}
                      </td>
                      <td className="px-8 py-4">
                        <Badge className="bg-slate-50 border border-slate-200 text-slate-600 text-[9px] font-black uppercase rounded-lg px-2.5 py-0.5">
                          {ten.tenureYears > 0 ? `${ten.tenureYears} ano(s) ` : ""}
                          {ten.tenureMonths > 0 ? `${ten.tenureMonths} mes(es)` : "Recém Chegado(a)"}
                        </Badge>
                      </td>
                      <td className="px-8 py-4 text-[#1C2643] font-bold text-[11px]">
                        {ten.nextMilestone}
                      </td>
                      <td className="px-8 py-4">
                        <button 
                          onClick={() => handleToggleGift(ten.id, ten.giftAwarded)}
                          className="flex items-center gap-1 bg-transparent hover:opacity-80 outline-none text-left"
                        >
                          {ten.giftAwarded ? (
                            <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[8px] font-black uppercase flex items-center gap-1">
                              Entregue com Sucesso
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-600 rounded-lg border border-amber-100 text-[8px] font-black uppercase flex items-center gap-1">
                              Aguardando Envio de Aniv
                            </Badge>
                          )}
                        </button>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <Button 
                          onClick={() => handleCelebrate(ten.name)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 rounded-lg px-3 py-1.5 h-8 font-bold text-[9px] uppercase tracking-widest gap-1 shadow-none border-none flex items-center justify-center mx-auto"
                        >
                          <Heart className="w-3.5 h-3.5 fill-red-600" />
                          Parabenizar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
