"use client"

import React, { useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  User, 
  FileText, 
  Check, 
  Clock, 
  Download, 
  Trash2,
  Bookmark
} from "lucide-react"

interface Warning {
  id: string
  collaboratorName: string
  role: string
  severity: "Verbal" | "Escrita" | "Suspensão"
  reason: string
  date: string
  signatureStatus: "Assinado" | "Pendente"
  loggedBy: string
}

const initialWarnings: Warning[] = [
  {
    id: "1",
    collaboratorName: "Gabriela Souza Santos",
    role: "Corretor Consignado Sênior",
    severity: "Escrita",
    reason: "Ausência injustificada nas reuniões obrigatórias de alinhamento com a diretoria.",
    date: "2026-05-18",
    signatureStatus: "Assinado",
    loggedBy: "Mariana Costa Neves"
  },
  {
    id: "2",
    collaboratorName: "Leonardo Albuquerque",
    role: "Corretor Executivo",
    severity: "Verbal",
    reason: "Grave atraso injustificado no início do plantão de discagem ativa por 3 dias seguidos.",
    date: "2026-05-25",
    signatureStatus: "Assinado",
    loggedBy: "Mariana Costa Neves"
  },
  {
    id: "3",
    collaboratorName: "Thais Fernanda Pereira",
    role: "Estagiário Comercial",
    severity: "Suspensão",
    reason: "Utilização inadequada dos sistemas de leads comerciais para fins pessoais não autorizados.",
    date: "2026-05-30",
    severity: "Suspensão",
    signatureStatus: "Pendente",
    loggedBy: "Recursos Humanos"
  }
]

export default function AdvertenciasPage() {
  const [warnings, setWarnings] = useState<Warning[]>(initialWarnings)
  const [searchQuery, setSearchQuery] = useState("")
  
  // New warning form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [newColabName, setNewColabName] = useState("")
  const [newColabRole, setNewColabRole] = useState("Corretor Consignado")
  const [newSeverity, setNewSeverity] = useState<Warning["severity"]>("Escrita")
  const [newReason, setNewReason] = useState("")
  const [newDate, setNewDate] = useState("")
  const [newLoggedBy, setNewLoggedBy] = useState("Recursos Humanos")

  const handleCreateWarning = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColabName || !newReason) return

    const warning: Warning = {
      id: Date.now().toString(),
      collaboratorName: newColabName,
      role: newColabRole,
      severity: newSeverity,
      reason: newReason,
      date: newDate || new Date().toISOString().split('T')[0],
      signatureStatus: "Pendente",
      loggedBy: newLoggedBy
    }

    setWarnings([warning, ...warnings])
    setIsFormOpen(false)

    // Reset Form
    setNewColabName("")
    setNewReason("")
    setNewDate("")
  }

  const handleToggleSignature = (id: string, current: Warning["signatureStatus"]) => {
    const nextStatus = current === "Assinado" ? "Pendente" : "Assinado"
    setWarnings(warnings.map(w => w.id === id ? { ...w, signatureStatus: nextStatus } : w))
  }

  const handleDeleteWarning = (id: string) => {
    setWarnings(warnings.filter(w => w.id !== id))
  }

  const filteredWarnings = warnings.filter(w => {
    const match = w.collaboratorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  w.reason.toLowerCase().includes(searchQuery.toLowerCase())
    return match
  })

  const getSeverityBadge = (severity: Warning["severity"]) => {
    switch (severity) {
      case "Verbal":
        return <Badge className="bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-3 py-0.5 text-[9px] tracking-wider uppercase font-bold hover:bg-blue-50">Verbal</Badge>
      case "Escrita":
        return <Badge className="bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-3 py-0.5 text-[9px] tracking-wider uppercase font-bold hover:bg-amber-50">Escrita</Badge>
      case "Suspensão":
        return <Badge className="bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-3 py-0.5 text-[9px] tracking-wider uppercase font-bold hover:bg-rose-50">Suspensão</Badge>
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header title="ADVERTÊNCIAS & MEDIDAS DISCIPLINARES" />

      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">
        {/* Metric widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procedimentos Registrados</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{warnings.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-55 flex items-center justify-center text-slate-600 shrink-0 border border-slate-200">
                <Bookmark className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suspensões Reais</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{warnings.filter(w => w.severity === "Suspensão").length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assinaturas Pendentes</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{warnings.filter(w => w.signatureStatus === "Pendente").length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Panel */}
        <Card className="border border-slate-200 overflow-hidden bg-white rounded-2xl shadow-sm">
          <CardContent className="p-0">
            <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full md:max-w-md">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Pesquisar por colaborador ou motivo..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 w-full"
                />
              </div>

              <Button 
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="bg-[#171717] hover:bg-[#171717]/90 text-white rounded-xl px-5 h-[38px] font-black text-[10px] gap-2 shadow-sm uppercase tracking-widest w-full md:w-auto ml-auto"
              >
                <Plus className="w-4 h-4" />
                Emitir Advertência
              </Button>
            </div>

            {/* Form Nova Advertência */}
            {isFormOpen && (
              <div className="bg-slate-50/50 p-6 border-b border-slate-155">
                <form onSubmit={handleCreateWarning} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5 col-span-1 md:col-span-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nome do Colaborador</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Nome do infrator" 
                      value={newColabName} 
                      onChange={(e) => setNewColabName(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1 md:col-span-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Cargo</label>
                    <input 
                      type="text" 
                      placeholder="Executivo de discador" 
                      value={newColabRole} 
                      onChange={(e) => setNewColabRole(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Grau da Infraestrutura</label>
                    <select 
                      value={newSeverity} 
                      onChange={(e) => setNewSeverity(e.target.value as Warning["severity"])}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                    >
                      <option value="Verbal">Verbal</option>
                      <option value="Escrita">Escrita (Aviso Prévio)</option>
                      <option value="Suspensão">Suspensão de Contrato</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Data da Ocorrência</label>
                    <input 
                      type="date" 
                      value={newDate} 
                      onChange={(e) => setNewDate(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Registrado Por</label>
                    <input 
                      type="text" 
                      value={newLoggedBy} 
                      onChange={(e) => setNewLoggedBy(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1 md:col-span-3">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Motivo Detalhado / Fundamentação Legal</label>
                    <textarea 
                      required
                      placeholder="Descreva detalhadamente o ocorrido que gerou a penalidade..." 
                      value={newReason} 
                      onChange={(e) => setNewReason(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none h-20 resize-none"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3 flex justify-end gap-3 pt-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setIsFormOpen(false)}
                      className="text-slate-500 hover:bg-slate-100 rounded-xl"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-[#171717] hover:bg-[#171717]/90 text-white rounded-xl px-6 h-[38px] font-bold text-[10px] uppercase tracking-widest"
                    >
                      Registrar Ocorrência
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Colaborador</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medida</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição do Ocorrido</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assinatura do Termo</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWarnings.map((warn) => (
                    <tr key={warn.id} className="hover:bg-slate-50/20 transition-all text-xs">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-bold border border-rose-100 shadow-sm">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-700 uppercase">{warn.collaboratorName}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{warn.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        {getSeverityBadge(warn.severity)}
                      </td>
                      <td className="px-8 py-4 text-slate-600 font-bold text-[11px]">
                        {warn.date}
                      </td>
                      <td className="px-8 py-4 max-w-sm text-slate-500 font-medium leading-relaxed">
                        <p className="line-clamp-2 text-[11px]">{warn.reason}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Registrado por: {warn.loggedBy}</p>
                      </td>
                      <td className="px-8 py-4">
                        <button 
                          onClick={() => handleToggleSignature(warn.id, warn.signatureStatus)}
                          className="flex items-center gap-1 bg-transparent hover:opacity-80 outline-none"
                        >
                          {warn.signatureStatus === "Assinado" ? (
                            <Badge className="bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[8px] font-black uppercase flex items-center gap-1 hover:bg-emerald-50">
                              <Check className="w-2.5 h-2.5" /> Assinado
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-600 rounded-full border-none text-[8px] font-black uppercase flex items-center gap-1 hover:bg-amber-100">
                              <Clock className="w-2.5 h-2.5" /> Pendente (Físico)
                            </Badge>
                          )}
                        </button>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Gerar PDF para Assinatura"
                            className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 w-8 h-8 rounded-lg"
                            onClick={() => alert("Simulando download do Termo de Advertência disciplinar da " + warn.collaboratorName + " em formato PDF...")}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Remover Registro"
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 w-8 h-8 rounded-lg"
                            onClick={() => handleDeleteWarning(warn.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredWarnings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50/20">
                        Nenhum registro de advertência encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
