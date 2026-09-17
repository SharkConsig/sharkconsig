"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Header } from "@/components/layout/header"
import {
  DIMENSOES_INFO,
  ARQUETIPOS_MAP,
  ARQUETIPO_INFO,
  DimensaoCodigo,
  FaixaScore,
  QUESTOES_TESTE
} from "@/lib/perfil-profissional-data"
import { PerfilCalculado } from "@/lib/perfil-profissional"
import { cn } from "@/lib/utils"
import {
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  Plus,
  Search,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  BookOpen,
  Zap,
  ArrowRight,
  Shield,
  MessageCircle,
  Trash2,
  RotateCw,
  ExternalLink,
  ChevronRight,
  MapPin,
  Mail,
  Phone
} from "lucide-react"

interface CandidatoItem {
  id: string
  nome: string
  email: string
  telefone?: string
  endereco?: string
  cargo_pretendido?: string
  token_acesso: string
  status: "pendente" | "concluido" | "expirado"
  utilizado: boolean
  data_expiracao: string
  data_conclusao?: string
  created_at: string
  respostas?: Record<string, string>
  perfilCalculado?: PerfilCalculado | null
}

export default function PerfilCandidatosPage() {
  const { user, isAdmin, isDeveloper, isRecursosHumanos } = useAuth()

  const [loading, setLoading] = useState(true)
  const [candidatos, setCandidatos] = useState<CandidatoItem[]>([])
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | "concluido" | "pendente" | "expirado">("TODOS")
  const [termoBusca, setTermoBusca] = useState("")

  const [abaAtiva, setAbaAtiva] = useState<"lista" | "analise" | "gestao">("lista")
  const [candidatoSelecionadoId, setCandidatoSelecionadoId] = useState<string>("")

  // Modal de Convidar Candidato
  const [modalConvidar, setModalConvidar] = useState(false)
  const [salvandoConvite, setSalvandoConvite] = useState(false)
  const [formNome, setFormNome] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formTelefone, setFormTelefone] = useState("")
  const [formEndereco, setFormEndereco] = useState("")
  const [formCargo, setFormCargo] = useState("Estágio")
  const [formValidade, setFormValidade] = useState("1") // 24 horas (recomendado)

  // Link recém gerado
  const [conviteGerado, setConviteGerado] = useState<{ nome: string; link: string; telefone?: string } | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [candidatoParaExcluir, setCandidatoParaExcluir] = useState<{ id: string; token: string; nome: string } | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    carregarCandidatos()
  }, [])

  const carregarCandidatos = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/candidatos-perfil?_t=${Date.now()}`, { cache: "no-store" })
      const data = await res.json()
      if (data.success && Array.isArray(data.candidatos)) {
        setCandidatos(data.candidatos)
        // Se ainda não houver selecionado e tiver candidatos concluídos, seleciona o primeiro
        const primeiroConcluido = data.candidatos.find((c: CandidatoItem) => c.status === "concluido")
        if (primeiroConcluido && !candidatoSelecionadoId) {
          setCandidatoSelecionadoId(primeiroConcluido.id || primeiroConcluido.token_acesso)
        }
      }
    } catch (err) {
      console.error("Erro ao carregar candidatos:", err)
    } finally {
      setLoading(false)
    }
  }

  const criarConvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNome.trim() || !formEmail.trim()) {
      alert("Preencha ao menos Nome e E-mail.")
      return
    }

    setSalvandoConvite(true)
    try {
      const res = await fetch("/api/candidatos-perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formNome,
          email: formEmail,
          telefone: formTelefone,
          endereco: formEndereco,
          cargo_pretendido: formCargo,
          diasValidade: parseInt(formValidade, 10) || 3,
          criado_por_id: user?.id,
          criado_por_nome: user?.user_metadata?.nome || user?.email || "RH"
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        alert(data.error || "Erro ao criar convite.")
        return
      }

      const linkCompleto = `${window.location.origin}/avaliar/${data.linkToken}`
      setConviteGerado({
        nome: formNome,
        link: linkCompleto,
        telefone: formTelefone
      })

      // Limpa formulário
      setFormNome("")
      setFormEmail("")
      setFormTelefone("")
      setFormEndereco("")
      setFormCargo("Estágio")

      carregarCandidatos()
    } catch (err) {
      console.error("Erro ao salvar convite:", err)
      alert("Erro ao conectar ao servidor.")
    } finally {
      setSalvandoConvite(false)
    }
  }

  const copiarLink = (link: string) => {
    navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const iniciarExclusao = (id: string, token: string, nome: string) => {
    setCandidatoParaExcluir({ id, token, nome })
  }

  const confirmarExclusao = async () => {
    if (!candidatoParaExcluir) return
    setExcluindo(true)
    try {
      const params = new URLSearchParams()
      if (candidatoParaExcluir.id) params.set("id", candidatoParaExcluir.id)
      if (candidatoParaExcluir.token) params.set("token", candidatoParaExcluir.token)

      const res = await fetch(`/api/candidatos-perfil?${params.toString()}`, { method: "DELETE" })
      if (res.ok) {
        setCandidatoParaExcluir(null)
        await carregarCandidatos()
      }
    } catch (err) {
      console.error("Erro ao excluir candidato:", err)
    } finally {
      setExcluindo(false)
    }
  }

  const renovarConvite = async (id: string, token: string) => {
    if (!confirm("Deseja reativar este convite por mais 3 dias com um novo link?")) return
    try {
      const res = await fetch("/api/candidatos-perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, token, action: "renovar", diasValidade: 3 })
      })
      const data = await res.json()
      if (data.success && data.novoToken) {
        alert(`Convite renovado com sucesso! Novo link gerado.`)
        carregarCandidatos()
      }
    } catch (err) {
      console.error("Erro ao renovar:", err)
    }
  }

  // Filtragem de candidatos
  const candidatosFiltrados = candidatos.filter(c => {
    const matchStatus = filtroStatus === "TODOS" || c.status === filtroStatus
    const buscaNorm = termoBusca.toLowerCase().trim()
    const matchBusca =
      !buscaNorm ||
      c.nome.toLowerCase().includes(buscaNorm) ||
      c.email.toLowerCase().includes(buscaNorm) ||
      (c.cargo_pretendido && c.cargo_pretendido.toLowerCase().includes(buscaNorm))
    return matchStatus && matchBusca
  })

  // Candidato atualmente inspecionado
  const candidatoAtivo = candidatos.find(
    c => (c.id && c.id === candidatoSelecionadoId) || c.token_acesso === candidatoSelecionadoId
  ) || candidatos.find(c => c.status === "concluido") || null

  const perfilAtivo = candidatoAtivo?.perfilCalculado || null

  // Métricas
  const total = candidatos.length
  const concluidos = candidatos.filter(c => c.status === "concluido").length
  const pendentes = candidatos.filter(c => c.status === "pendente").length
  const expirados = candidatos.filter(c => c.status === "expirado").length

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-16 flex flex-col">
      <Header title="PERFIL PROFISSIONAL - CANDIDATOS" />

      <div className="flex-1 w-full max-w-[1600px] mx-auto px-2 sm:px-3 lg:px-4 py-6 space-y-8">
        {/* Banner Superior */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 w-full">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 mt-0.5 shrink-0">
              <UserCheck className="w-6 h-6 text-blue-600" />
            </span>
            <div className="space-y-3">
              <div>
                <h1 className="text-[26px] sm:text-[30px] font-black tracking-tight text-slate-900 leading-snug">
                  Perfil Profissional dos Candidatos
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                  Envio de convites com links temporários de uso único e análise psicométrica de candidatos.
                </p>
              </div>

              <div>
                <button
                  onClick={() => {
                    setConviteGerado(null)
                    setModalConvidar(true)
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                >
                  <span>Convidar Candidato</span>
                </button>
              </div>
            </div>
          </div>

          {/* Abas */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-slate-100 border border-slate-200 p-1 rounded-xl">
              <button
                onClick={() => setAbaAtiva("lista")}
                className={cn(
                  "px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                  abaAtiva === "lista"
                    ? "bg-[#0F172B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                )}
              >
                Candidatos ({total})
              </button>
              <button
                onClick={() => setAbaAtiva("analise")}
                className={cn(
                  "px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                  abaAtiva === "analise"
                    ? "bg-[#0F172B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                )}
              >
                Análise do Candidato
              </button>
              <button
                onClick={() => setAbaAtiva("gestao")}
                className={cn(
                  "px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                  abaAtiva === "gestao"
                    ? "bg-[#0F172B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                )}
              >
                Inteligência de Seleção
              </button>
            </div>
          </div>
        </div>

        {/* ABA 1: LISTA DE CANDIDATOS E CONVITES */}
        {abaAtiva === "lista" && (
          <div className="space-y-6">
            {/* Cards de Métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Total Convidados</span>
                <span className="text-2xl font-black text-slate-900">{total}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Avaliações Concluídas</span>
                <span className="text-2xl font-black text-emerald-800">{concluidos}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">Convites Pendentes</span>
                <span className="text-2xl font-black text-amber-800">{pendentes}</span>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">Links Expirados</span>
                <span className="text-2xl font-black text-rose-800">{expirados}</span>
              </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar candidato por nome, e-mail ou vaga..."
                  value={termoBusca}
                  onChange={e => setTermoBusca(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                {(["TODOS", "concluido", "pendente", "expirado"] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setFiltroStatus(st)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer",
                      filtroStatus === st
                        ? "bg-[#0F172B] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {st === "TODOS" ? "Todos" : st === "concluido" ? "Concluídos" : st === "pendente" ? "Pendentes" : "Expirados"}
                  </button>
                ))}
              </div>
            </div>

            {/* Listagem */}
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                Carregando registros de candidatos...
              </div>
            ) : candidatosFiltrados.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center space-y-3">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-black text-slate-800">Nenhum candidato encontrado</h3>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                  Clique no botão &ldquo;Convidar Candidato&rdquo; acima para gerar um link exclusivo de uso único para avaliação do perfil profissional.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {candidatosFiltrados.map(c => {
                  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/avaliar/${c.token_acesso}`
                  const expiracao = new Date(c.data_expiracao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

                  return (
                    <div
                      key={c.id || c.token_acesso}
                      className={cn(
                        "bg-white border rounded-2xl p-5 shadow-2xs transition-all hover:border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4",
                        c.status === "concluido" ? "border-emerald-200/80 bg-emerald-50/10" : "border-slate-200"
                      )}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-black text-slate-900 text-base">{c.nome}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                            {c.cargo_pretendido || "Candidato"}
                          </span>
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                              c.status === "concluido"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : c.status === "pendente"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            )}
                          >
                            {c.status === "concluido" ? "Concluído" : c.status === "pendente" ? "Pendente" : "Expirado"}
                          </span>

                          {c.perfilCalculado?.arqPrimario && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                              {c.perfilCalculado.arqPrimario} / {c.perfilCalculado.arqSecundario}
                            </span>
                          )}
                        </div>

                        {/* Detalhes de contato */}
                        <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {c.email}
                          </span>
                          {c.telefone && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {c.telefone}
                            </span>
                          )}
                          {c.endereco && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {c.endereco}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Validade até: {expiracao}
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {c.status === "pendente" && (
                          <>
                            <button
                              onClick={() => copiarLink(link)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                              title="Copiar link de avaliação"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Link</span>
                            </button>

                            {c.telefone && (
                              <a
                                href={`https://api.whatsapp.com/send?phone=55${c.telefone.replace(/\D/g, "")}&text=${encodeURIComponent(
                                  `Olá, ${c.nome.split(" ")[0]}! Tudo bem? 😊\n\nAqui é do time de Recursos Humanos da Acerto Fácil!\n\nPara darmos continuidade ao seu processo seletivo para estágio, temos uma etapa de Perfil Profissional para você responder.\n\nSegue seu link exclusivo:\n${link}\n\nO link é de uso único e possui validade. Quando finalizar, me avisa por aqui, por favor!\n\nBoa sorte! 🦈`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
                                title="Enviar convite pelo WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </>
                        )}

                        {c.status === "concluido" && (
                          <button
                            onClick={() => {
                              setCandidatoSelecionadoId(c.id || c.token_acesso)
                              setAbaAtiva("analise")
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F172B] hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                          >
                            <span>Ver Perfil Completo</span>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                        )}

                        {c.status === "expirado" && (
                          <button
                            onClick={() => renovarConvite(c.id, c.token_acesso)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                            title="Reativar convite por mais 3 dias"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Renovar Link</span>
                          </button>
                        )}

                        <button
                          onClick={() => iniciarExclusao(c.id, c.token_acesso, c.nome)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Excluir candidato"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA 2: ANÁLISE PSICOMÉTRICA DO CANDIDATO */}
        {abaAtiva === "analise" && (
          <div className="space-y-6">
            {/* Seletor do Candidato Analisado */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#0F172B] text-white flex items-center justify-center font-black">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Candidato em Análise</span>
                  <h3 className="text-base font-black text-slate-900">
                    {candidatoAtivo ? candidatoAtivo.nome : "Selecione um candidato concluído"}
                  </h3>
                </div>
              </div>

              <select
                value={candidatoSelecionadoId}
                onChange={e => setCandidatoSelecionadoId(e.target.value)}
                className="w-full sm:w-80 px-3 py-2 text-xs font-bold bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                <option value="">Selecione um candidato concluído...</option>
                {candidatos
                  .filter(c => c.status === "concluido")
                  .map(c => (
                    <option key={c.id || c.token_acesso} value={c.id || c.token_acesso}>
                      {c.nome} ({c.cargo_pretendido || "Candidato"})
                    </option>
                  ))}
              </select>
            </div>

            {!candidatoAtivo || candidatoAtivo.status !== "concluido" || !perfilAtivo ? (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="text-base font-black text-slate-800">Nenhum teste concluído selecionado</h3>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                  Selecione um candidato que já tenha finalizado a avaliação no seletor acima para ver a análise comportamental detalhada.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Nome do Perfil & Arquétipo */}
                <div className="pt-2 pb-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F172B] text-white">
                      Arquétipo de Operação Identificado
                    </span>
                    {candidatoAtivo.data_conclusao && (
                      <span className="text-xs text-slate-500 font-medium">
                        Respondido em {new Date(candidatoAtivo.data_conclusao).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>

                  <h2 className="text-[28px] sm:text-[33px] font-black text-slate-900 tracking-tight mt-4 leading-snug">
                    {perfilAtivo.tipoResultado}
                  </h2>
                </div>

                {/* 2. Síntese do Perfil */}
                <div className="bg-emerald-100/90 border border-emerald-300 rounded-2xl p-5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-900 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <span>SÍNTESE DO PERFIL DO CANDIDATO</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-950 leading-relaxed">
                    {perfilAtivo.resumo}
                  </p>
                </div>

                {/* 3. As Três Forças Naturais */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
                    <Zap className="w-4.5 h-4.5 text-emerald-600" />
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                      As 3 Forças Naturais do Candidato
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {perfilAtivo.tresForcas.map((f, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-700 block">{f.dimensao}</span>
                        <p className="text-xs sm:text-sm text-slate-700 font-semibold leading-relaxed">{f.texto}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Pontos de Atenção & Riscos */}
                <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 border-b border-slate-200 pb-3">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-600" />
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                      Pontos de Atenção para a Contratação
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {perfilAtivo.pontosAtencao.map((p, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5 shadow-2xs">
                        {p.dimensao && (
                          <span className="text-sm font-black uppercase tracking-wider text-amber-700 block">{p.dimensao}</span>
                        )}
                        <p className="text-sm sm:text-base text-slate-700 font-semibold leading-relaxed">{p.texto}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. As 6 Dimensões Psicométricas */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
                    <Layers className="w-4.5 h-4.5 text-blue-600" />
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                      Mapeamento das 6 Dimensões Comportamentais
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(Object.keys(DIMENSOES_INFO) as DimensaoCodigo[]).map(cod => {
                      const score = perfilAtivo.normalizedScores[cod] || 0
                      const faixa = perfilAtivo.faixas[cod] || "Equilibrada"
                      const info = DIMENSOES_INFO[cod]

                      return (
                        <div key={cod} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                              {info.nome} ({cod})
                            </span>
                            <span className="text-xs font-black text-slate-700">
                              {score} pts &bull; <strong className="text-blue-700">{faixa}</strong>
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium leading-tight">
                            {info.oQueMede}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 6. Modo de Aprendizagem & Desafio de Desenvolvimento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2.5">
                      <BookOpen className="w-4.5 h-4.5 text-blue-600" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Modo de Aprendizagem do Candidato
                      </h4>
                    </div>
                    <p className="text-base font-black text-slate-900">
                      {perfilAtivo.modoAprendizagemInfo.nome}
                    </p>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-semibold">
                      <span className="font-black text-slate-900 uppercase tracking-wider block mb-1 text-[11px]">Como Treinar este Candidato:</span>
                      {perfilAtivo.modoAprendizagemInfo.sequencia}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2.5">
                      <Sparkles className="w-4.5 h-4.5 text-purple-600" />
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Desafio de Desenvolvimento
                      </h4>
                    </div>
                    <p className="text-base font-black text-slate-900">
                      {perfilAtivo.desafioDesenvolvimento}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                      Alinhe esse ponto durante a entrevista de contratação para entender se o candidato tem maturidade para lidar com esse equilíbrio.
                    </p>
                  </div>
                </div>

                {/* 7. Guia do Líder para a Entrevista */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
                    <Briefcase className="w-4.5 h-4.5 text-emerald-600" />
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                      Guia de Entrevista & Liderança para o RH
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">Direcionamento na Entrevista</span>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">{perfilAtivo.guiaLider.direcionamento}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">O que Motiva este Perfil</span>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">{perfilAtivo.guiaLider.motivadores}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">Como Cobrar Resultados</span>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">{perfilAtivo.guiaLider.cobranca}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">Sinais Sob Pressão</span>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">{perfilAtivo.guiaLider.sobPressao}</p>
                    </div>
                  </div>
                </div>

                {/* 8. Consistência Lógica das Respostas */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Índice de Consistência Interna</span>
                      <span className="text-xs text-slate-500 font-medium">
                        Valida se as escolhas entre as 36 questões foram coerentes entre si.
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                      perfilAtivo.consistenciaClassificacao === "Alta"
                        ? "bg-emerald-100 text-emerald-800"
                        : perfilAtivo.consistenciaClassificacao === "Adequada"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    )}
                  >
                    Consistência {perfilAtivo.consistenciaClassificacao} ({perfilAtivo.consistenciaIndice}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: INTELIGÊNCIA DE SELEÇÃO / GESTÃO */}
        {abaAtiva === "gestao" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
                <Users className="w-4.5 h-4.5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                  Distribuição de Arquétipos nos Processos Seletivos
                </h3>
              </div>

              {concluidos === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                  Ainda não há candidatos com teste concluído para gerar estatísticas comparativas.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                  {Object.entries(
                    candidatos
                      .filter(c => c.status === "concluido" && c.perfilCalculado?.arqPrimario)
                      .reduce((acc: Record<string, number>, curr) => {
                        const arq = curr.perfilCalculado!.arqPrimario
                        acc[arq] = (acc[arq] || 0) + 1
                        return acc
                      }, {})
                  ).map(([arq, qtd]) => (
                    <div key={arq} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{arq}</span>
                      <span className="text-2xl font-black text-slate-900">{qtd}</span>
                      <span className="text-[10px] text-slate-400 font-bold block">
                        {Math.round((qtd / concluidos) * 100)}% dos avaliados
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Convidar Candidato */}
      {modalConvidar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
                  <UserCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Convidar Novo Candidato</h3>
                  <p className="text-xs text-slate-500 font-medium">Gera link temporário de uso único</p>
                </div>
              </div>
              <button
                onClick={() => setModalConvidar(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {conviteGerado ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Convite Gerado com Sucesso!</span>
                  </div>
                  <p className="text-xs text-emerald-950 font-semibold leading-relaxed">
                    O link de acesso para <strong>{conviteGerado.nome}</strong> está pronto. Envie para o candidato:
                  </p>

                  <div className="p-2.5 bg-white border border-emerald-300 rounded-xl flex items-center justify-between gap-2 text-xs font-mono text-slate-700 select-all overflow-x-auto">
                    <span className="truncate">{conviteGerado.link}</span>
                    <button
                      onClick={() => copiarLink(conviteGerado.link)}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 transition-colors cursor-pointer"
                      title="Copiar link"
                    >
                      {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {conviteGerado.telefone && (
                    <a
                      href={`https://api.whatsapp.com/send?phone=55${conviteGerado.telefone.replace(/\D/g, "")}&text=${encodeURIComponent(
                        `Olá, ${conviteGerado.nome.split(" ")[0]}! Tudo bem? 😊\n\nAqui é do time de Recursos Humanos da Acerto Fácil!\n\nPara darmos continuidade ao seu processo seletivo para estágio, temos uma etapa de Perfil Profissional para você responder.\n\nSegue seu link exclusivo:\n${conviteGerado.link}\n\nO link é de uso único e possui validade. Quando finalizar, me avisa por aqui, por favor!\n\nBoa sorte! 🦈`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Enviar no WhatsApp</span>
                    </a>
                  )}

                  <button
                    onClick={() => setModalConvidar(false)}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={criarConvite} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                    Nome Completo do Candidato
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo Silveira"
                    value={formNome}
                    onChange={e => setFormNome(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                      E-mail
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="candidato@email.com"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={formTelefone}
                      onChange={e => setFormTelefone(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    placeholder="Rua, Bairro, Cidade - UF"
                    value={formEndereco}
                    onChange={e => setFormEndereco(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                      Cargo / Vaga Pretendida
                    </label>
                    <select
                      value={formCargo}
                      onChange={e => setFormCargo(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-50 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
                    >
                      <option value="Estágio">Estágio</option>
                      <option value="Corretor">Corretor</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Operacional">Operacional</option>
                      <option value="Recursos Humanos">Recursos Humanos</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                      Validade do Link
                    </label>
                    <select
                      value={formValidade}
                      onChange={e => setFormValidade(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-50 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900"
                    >
                      <option value="1">24 horas (recomendado)</option>
                      <option value="2">48 horas</option>
                      <option value="3">3 dias</option>
                      <option value="7">7 dias</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalConvidar(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoConvite}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    {salvandoConvite ? "Gerando link..." : "Gerar Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {candidatoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-black text-slate-900 leading-tight">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tem certeza que deseja excluir o convite de <strong className="text-slate-900 font-bold">{candidatoParaExcluir.nome}</strong>?
                </p>
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  Esta ação é irreversível e o link de acesso será imediatamente invalidado.
                </p>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                disabled={excluindo}
                onClick={() => setCandidatoParaExcluir(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindo}
                onClick={confirmarExclusao}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{excluindo ? "Excluindo..." : "Sim, Excluir"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
