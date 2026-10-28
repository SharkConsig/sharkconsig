"use client"

import React, { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Search, 
  Filter, 
  ExternalLink, 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Download, 
  RefreshCw, 
  Trash2, 
  ArrowRight,
  Briefcase
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"

interface CandidateItem {
  id: string
  nome: string
  email: string
  telefone: string
  cidade?: string
  cargo_pretendido?: string
  areas_interesse?: string
  linkedin?: string
  observacoes?: string
  curriculo_url?: string
  curriculo_name?: string
  status?: string
  origem?: string
  created_at: string
}

const CANDIDATOS_STORAGE_KEY = "shark_rh_candidatos_site"

export default function CandidatosPage() {
  const { perfil, isAdmin, isDeveloper, isRecursosHumanos } = useAuth()
  const [candidates, setCandidates] = useState<CandidateItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("TODOS")

  const canAccess = isAdmin || isDeveloper || isRecursosHumanos || 
    perfil?.role === "Administrador" || perfil?.role === "Desenvolvedor" || perfil?.role === "Recursos Humanos"

  const loadCandidates = async () => {
    setIsLoading(true)
    try {
      // 1. Tentar carregar do Supabase hr_banco_talentos
      const { data, error } = await supabase
        .from("hr_banco_talentos")
        .select("*")
        .order("created_at", { ascending: false })

      if (!error && Array.isArray(data)) {
        // Filtrar ou priorizar os que vieram do site ou incluir todos
        setCandidates(data)
        localStorage.setItem(CANDIDATOS_STORAGE_KEY, JSON.stringify(data))
      } else {
        // Fallback local se a tabela não estiver acessível
        const local = localStorage.getItem(CANDIDATOS_STORAGE_KEY)
        if (local) {
          setCandidates(JSON.parse(local))
        }
      }
    } catch (err) {
      console.error("Erro ao carregar candidatos:", err)
      const local = localStorage.getItem(CANDIDATOS_STORAGE_KEY)
      if (local) setCandidates(JSON.parse(local))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCandidates()
  }, [])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const updated = candidates.map(c => c.id === id ? { ...c, status: newStatus } : c)
      setCandidates(updated)
      localStorage.setItem(CANDIDATOS_STORAGE_KEY, JSON.stringify(updated))

      await supabase
        .from("hr_banco_talentos")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id)

      toast.success(`Status atualizado para: ${newStatus}`)
    } catch (err) {
      console.error("Erro ao atualizar status:", err)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o candidato ${name}?`)) return
    try {
      const updated = candidates.filter(c => c.id !== id)
      setCandidates(updated)
      localStorage.setItem(CANDIDATOS_STORAGE_KEY, JSON.stringify(updated))

      await supabase
        .from("hr_banco_talentos")
        .delete()
        .eq("id", id)

      toast.success("Candidato removido.")
    } catch (err) {
      console.error("Erro ao excluir candidato:", err)
    }
  }

  const filteredCandidates = candidates.filter(c => {
    const sLower = searchTerm.toLowerCase()
    const matchesSearch = 
      (c.nome || "").toLowerCase().includes(sLower) ||
      (c.email || "").toLowerCase().includes(sLower) ||
      (c.telefone || "").includes(searchTerm) ||
      (c.cargo_pretendido || c.areas_interesse || "").toLowerCase().includes(sLower)

    const currentStatus = (c.status || "NOVO").toUpperCase()
    const matchesStatus = selectedStatusFilter === "TODOS" || currentStatus === selectedStatusFilter

    return matchesSearch && matchesStatus
  })

  if (!canAccess) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <p className="text-slate-500 font-bold">Acesso restrito ao time de Recursos Humanos e Administradores.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 pb-16">
      <Header title="CANDIDATOS (TRABALHE CONOSCO)" />

      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Banner de Boas-Vindas */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-400/30">
              <Users className="w-3.5 h-3.5" />
              Recrutamento & Seleção Acerto Fácil
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Fila de Candidaturas Recebidas do Site
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Gerencie currículos, informações de contato e avaliações dos profissionais que se candidataram na landing page institucional.
            </p>
          </div>

          <Button
            onClick={loadCandidates}
            variant="outline"
            className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700 text-xs font-bold uppercase tracking-wider gap-2 h-10 px-4 rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar Fila
          </Button>
        </div>

        {/* Filtros e Busca */}
        <Card className="card-shadow border border-slate-200">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por nome, e-mail, telefone ou vaga..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-slate-50 border-slate-200 text-xs rounded-xl"
                />
              </div>

              {/* Filtro por Status */}
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
                {["TODOS", "NOVO", "EM ANÁLISE", "ENTREVISTA AGENDADA", "APROVADO", "BANCO DE TALENTOS", "DESCLASSIFICADO"].map(st => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      selectedStatusFilter === st
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Candidatos */}
        <Card className="card-shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6">Candidato</th>
                  <th className="py-4 px-6">Vaga de Interesse</th>
                  <th className="py-4 px-6">Contatos</th>
                  <th className="py-4 px-6">Data de Envio</th>
                  <th className="py-4 px-6">Status RH</th>
                  <th className="py-4 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                      Carregando candidaturas...
                    </td>
                  </tr>
                ) : filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      Nenhum candidato encontrado nesta categoria.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-sm tracking-tight">{c.nome}</span>
                          <span className="text-[11px] text-slate-400">{c.cidade || "Florianópolis / SC"}</span>
                          {c.linkedin && (
                            <a
                              href={c.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline mt-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Ver LinkedIn
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wide">
                          {c.cargo_pretendido || c.areas_interesse || "Geral"}
                        </span>
                      </td>

                      <td className="py-4 px-6 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.telefone}</span>
                          <a
                            href={`https://wa.me/55${c.telefone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-slate-500 font-medium text-[11px]">
                        {c.created_at ? format(new Date(c.created_at), "dd/MM/yyyy HH:mm") : "-"}
                      </td>

                      <td className="py-4 px-6">
                        <select
                          value={(c.status || "NOVO").toUpperCase()}
                          onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                          className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-black uppercase text-slate-800 cursor-pointer focus:ring-2 focus:ring-slate-900"
                        >
                          <option value="NOVO">NOVO</option>
                          <option value="EM ANÁLISE">EM ANÁLISE</option>
                          <option value="ENTREVISTA AGENDADA">ENTREVISTA AGENDADA</option>
                          <option value="APROVADO">APROVADO</option>
                          <option value="BANCO DE TALENTOS">BANCO DE TALENTOS</option>
                          <option value="DESCLASSIFICADO">DESCLASSIFICADO</option>
                        </select>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {c.curriculo_url ? (
                            <a
                              href={c.curriculo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                              title="Abrir Currículo"
                            >
                              <FileText className="w-4 h-4" />
                            </a>
                          ) : null}
                          <button
                            onClick={() => handleDelete(c.id, c.nome)}
                            className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Remover Candidato"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  )
}
