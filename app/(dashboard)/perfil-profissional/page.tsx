"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/context/auth-context"
import {
  QUESTOES_TESTE,
  QUESTOES_CHECKPOINT,
  DIMENSOES_INFO,
  ARQUETIPOS_MAP,
  ARQUETIPO_INFO,
  MATRIZ_LIDER_LIDERADO,
  DimensaoCodigo,
  FaixaScore
} from "@/lib/perfil-profissional-data"
import { PerfilCalculado } from "@/lib/perfil-profissional"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"
import {
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Users,
  Shield,
  Briefcase,
  Layers,
  Award,
  BookOpen,
  ChevronRight,
  Sparkles,
  ClipboardCheck,
  Zap,
  Info,
  Send,
  Lightbulb
} from "lucide-react"
import Link from "next/link"

export default function PerfilProfissionalPage() {
  const { user, perfil, isAdmin, isDeveloper, isSupervisor, isOperational, isMonitoramento, isRecursosHumanos } = useAuth()

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [meuPerfil, setMeuPerfil] = useState<PerfilCalculado | null>(null)
  const [dataConclusao, setDataConclusao] = useState<string | null>(null)

  // Controle de Teste em Andamento
  const [indiceQuestao, setIndiceQuestao] = useState(0)
  const [respostasTeste, setRespostasTeste] = useState<Record<number, string>>({})

  // Papéis e Grupos de Acesso
  const userRole = perfil?.role || (user?.user_metadata?.role as string) || (user?.user_metadata?.funcao as string) || ""
  const roleNorm = userRole.toLowerCase().trim()

  // Usuário 'Monitoramento' deve ter acesso exclusivo à aba 'MEU PERFIL'
  const isMonitor = isMonitoramento || roleNorm === "monitoramento"

  // Grupo 3: Administrador e Desenvolvedor -> 'MEU PERFIL', 'VISÃO LÍDER' e 'INTELIGÊNCIA DO TIME (GESTÃO)'. Default: 'INTELIGÊNCIA DO TIME (GESTÃO)'
  const isGrupo3 = !isMonitor && (isAdmin || isDeveloper || roleNorm === "administrador" || roleNorm === "desenvolvedor")

  // Grupo 2: Supervisor, Operacional e Recursos Humanos -> 'MEU PERFIL' e 'VISÃO LÍDER'. Default: 'VISÃO LÍDER'
  const isGrupo2 = !isMonitor && !isGrupo3 && (
    isSupervisor ||
    (isOperational && !isMonitor) ||
    isRecursosHumanos ||
    roleNorm === "supervisor" ||
    roleNorm === "operacional" ||
    roleNorm === "recursos humanos"
  )

  // Grupo 1: Corretor (CLT e PJ), Estágio, Processo Seletivo e Monitoramento -> Somente 'MEU PERFIL'. Default: 'MEU PERFIL'
  const canViewGestao = isGrupo3
  const canViewLider = isGrupo3 || isGrupo2

  const [abaAtiva, setAbaAtiva] = useState<"profissional" | "lider" | "gestao">(
    isGrupo3 ? "gestao" : (isGrupo2 ? "lider" : "profissional")
  )
  const tabInicializadaRef = useRef(false)

  useEffect(() => {
    if (!tabInicializadaRef.current && (perfil || user)) {
      if (isGrupo3) {
        setAbaAtiva("gestao")
      } else if (isGrupo2) {
        setAbaAtiva("lider")
      } else {
        setAbaAtiva("profissional")
      }
      tabInicializadaRef.current = true
    }
  }, [isGrupo3, isGrupo2, perfil, user])

  // Estado para Gestão / Líder
  const [todosPerfis, setTodosPerfis] = useState<any[]>([])
  const [lideradoSelecionadoId, setLideradoSelecionadoId] = useState<string>("")
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<string, "A" | "B" | "C" | "D" | "E">>({})
  const [salvandoCheckpoint, setSalvandoCheckpoint] = useState(false)
  const [filtroDimensaoGestao, setFiltroDimensaoGestao] = useState<DimensaoCodigo | "TODAS">("TODAS")
  const ultimoRefreshTabRef = useRef<number>(0)

  useEffect(() => {
    if (!user?.id) return
    carregarDados()
  }, [user?.id, canViewLider])

  // Atualização instantânea dos dados ao trocar de aba sem recarregar a tela inteira (com throttle de 2s para evitar spam no banco)
  useEffect(() => {
    if (!user?.id || loading) return
    const agora = Date.now()
    if (agora - ultimoRefreshTabRef.current > 2000) {
      ultimoRefreshTabRef.current = agora
      carregarDados(true)
    }
  }, [abaAtiva])

  const carregarDados = async (silencioso: boolean = false) => {
    if (!silencioso) {
      setLoading(true)
    }
    try {
      // 1. Carregar perfil do usuário logado diretamente da tabela perfil_profissional
      const res = await fetch(`/api/perfil-profissional?userId=${user?.id}&_t=${Date.now()}`, {
        cache: "no-store"
      })
      const data = await res.json()
      if (data.success && data.perfil?.calculado) {
        setMeuPerfil(data.perfil.calculado)
        setDataConclusao(data.perfil.dataConclusao)
        if (data.perfil.respostas) {
          setRespostasTeste(data.perfil.respostas)
        }
      } else {
        // Se a tabela estiver limpa/sem respostas, garante tela inicial do teste
        setMeuPerfil(null)
        setDataConclusao(null)
        setRespostasTeste({})
        setIndiceQuestao(0)
      }

      // 2. Se líder/gestor, carregar lista completa da equipe diretamente da tabela
      if (canViewLider) {
        const resList = await fetch(`/api/perfil-profissional?all=true&_t=${Date.now()}`, {
          cache: "no-store"
        })
        const dataList = await resList.json()
        if (dataList.success && Array.isArray(dataList.perfis)) {
          setTodosPerfis(dataList.perfis)
          // Seleciona o primeiro liderado por padrão caso ainda não tenha sido escolhido
          const outros = dataList.perfis.filter((p: any) => p.id !== user?.id && p.perfilProfissional?.calculado)
          if (outros.length > 0) {
            setLideradoSelecionadoId(prev => (prev ? prev : outros[0].id))
          }
        }
      }
    } catch (e) {
      console.error("Erro ao carregar dados do Perfil Profissional:", e)
    } finally {
      if (!silencioso) {
        setLoading(false)
      }
    }
  }

  // Ações do Teste
  const questaoAtual = QUESTOES_TESTE[indiceQuestao]
  const respostaSelecionada = respostasTeste[questaoAtual?.numero]

  const selecionarAlternativa = (letra: string) => {
    setRespostasTeste(prev => ({
      ...prev,
      [questaoAtual.numero]: letra
    }))
  }

  const avancarQuestao = () => {
    if (indiceQuestao < QUESTOES_TESTE.length - 1) {
      setIndiceQuestao(prev => prev + 1)
    }
  }

  const voltarQuestao = () => {
    if (indiceQuestao > 0) {
      setIndiceQuestao(prev => prev - 1)
    }
  }

  const finalizarTeste = async () => {
    if (!user?.id) return
    // Validação de todas as respostas (exceto para desenvolvedor que pode testar sem obrigatoriedade)
    if (!isDeveloper) {
      const faltantes = QUESTOES_TESTE.filter(q => !respostasTeste[q.numero])
      if (faltantes.length > 0) {
        alert(`Por favor, responda a questão ${faltantes[0].numero} antes de finalizar.`)
        setIndiceQuestao(faltantes[0].numero - 1)
        return
      }
    }

    setSalvando(true)
    try {
      const res = await fetch("/api/perfil-profissional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "salvar_teste",
          userId: user.id,
          nomeUsuario: perfil?.nome || user.email?.split("@")[0] || "Colaborador",
          respostas: respostasTeste
        })
      })
      const data = await res.json()
      if (data.success && data.perfil?.calculado) {
        setMeuPerfil(data.perfil.calculado)
        setDataConclusao(data.perfil.dataConclusao)
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        alert(data.error || "Erro ao salvar perfil profissional.")
      }
    } catch (e) {
      console.error(e)
      alert("Falha de conexão ao enviar respostas.")
    } finally {
      setSalvando(false)
    }
  }

  // Salvar Checkpoint de 30 dias pelo Líder
  const salvarCheckpointLider = async (lideradoId: string) => {
    if (!user?.id || !lideradoId) return
    const faltantes = QUESTOES_CHECKPOINT.filter(q => !checkpointAnswers[q.id])
    if (faltantes.length > 0) {
      alert(`Por favor, responda todas as questões do checkpoint (pendente: ${faltantes[0].id}).`)
      return
    }

    setSalvandoCheckpoint(true)
    try {
      const res = await fetch("/api/perfil-profissional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "salvar_checkpoint",
          colaboradorId: lideradoId,
          liderId: user.id,
          liderNome: perfil?.nome || "Líder",
          respostasCheckpoint: checkpointAnswers
        })
      })
      const data = await res.json()
      if (data.success) {
        alert("Checkpoint de 30 dias registrado com sucesso!")
        carregarDados()
      } else {
        alert(data.error || "Erro ao salvar checkpoint.")
      }
    } catch (e) {
      console.error(e)
      alert("Falha ao registrar checkpoint.")
    } finally {
      setSalvandoCheckpoint(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Carregando Perfil Profissional...</p>
      </div>
    )
  }

  // Se o colaborador ainda não fez o teste, renderiza o formulário (1 por tela)
  const precisaResponderTeste = !meuPerfil

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-16 flex flex-col">
      <Header title="PERFIL PROFISSIONAL" />

      <div className="flex-1 w-full max-w-[1600px] mx-auto px-2 sm:px-3 lg:px-4 py-6 space-y-8">
        {/* Cabeçalho do Perfil Profissional */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 w-full">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 mt-0.5 shrink-0">
              <UserCheck className="w-6 h-6 text-emerald-600" />
            </span>
            <div>
              <h1 className="text-[28px] sm:text-[33px] font-black tracking-tight text-slate-900 leading-snug">
                Perfil Profissional
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                Teste de autopercepção comportamental e direcionamento de liderança.
              </p>
            </div>
          </div>

          {/* Abas de Navegação (visível para Grupo 2 [Líder] e Grupo 3 [Gestão]) */}
          {canViewLider && (
            <div className="flex items-center bg-slate-100 border border-slate-200 p-1 rounded-xl">
              <button
                onClick={() => setAbaAtiva("profissional")}
                className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  abaAtiva === "profissional"
                    ? "bg-[#0F172B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                Meu Perfil
              </button>
              <button
                onClick={() => setAbaAtiva("lider")}
                className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  abaAtiva === "lider"
                    ? "bg-[#0F172B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                Visão Líder
              </button>
              {canViewGestao && (
                <button
                  onClick={() => setAbaAtiva("gestao")}
                  className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    abaAtiva === "gestao"
                      ? "bg-[#0F172B] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  Inteligência do Time (Gestão)
                </button>
              )}
            </div>
          )}
        </div>

        {/* CASO 1: Teste Inicial (quando estiver na aba Meu Perfil e ainda não tiver respondido) */}
        {abaAtiva === "profissional" && precisaResponderTeste && (
          <div className="w-full space-y-6">
          {/* Regra de Ouro / Banner Orientativo */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs sm:text-sm text-amber-950 space-y-1">
              <span className="font-black text-amber-900 uppercase tracking-wider block text-xs">Instruções Obrigatórias:</span>
              <p className="font-semibold text-amber-900/90 leading-relaxed">
                Responda com base na sua tendência natural mais frequente. Não existem respostas certas ou erradas;
                este teste mapeia seu estilo predominante de execução para calibrar treinamentos e suporte de liderança.
              </p>
            </div>
          </div>

          {/* Barra de Progresso */}
          {(() => {
            const questoesRespondidasCount = Object.keys(respostasTeste).length
            const porcentagemConcluido = Math.round((questoesRespondidasCount / QUESTOES_TESTE.length) * 100)

            return (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600 font-bold">
                  <span>Questão {indiceQuestao + 1} de {QUESTOES_TESTE.length}</span>
                  <span>{porcentagemConcluido}% concluído</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${(questoesRespondidasCount / QUESTOES_TESTE.length) * 100}%` }}
                  />
                </div>
              </div>
            )
          })()}

          {/* Card da Questão */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="space-y-2 border-b border-slate-100 pb-3">
              <div className="inline-flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F172B] text-white">
                  Questão {questaoAtual.numero < 10 ? `0${questaoAtual.numero}` : questaoAtual.numero}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug pt-1">
                {questaoAtual.enunciado}
              </h2>
            </div>

            {/* Alternativas (A, B, C, D) - sem pesos nem códigos exibidos */}
            <div className="space-y-3 pt-2">
              {questaoAtual.opcoes.map(opcao => {
                const selecionada = respostaSelecionada === opcao.letra
                return (
                  <button
                    key={opcao.letra}
                    onClick={() => selecionarAlternativa(opcao.letra)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 cursor-pointer",
                      selecionada
                        ? "bg-[#87A9FF] border-[#658de6] text-slate-900 font-bold shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-blue-50/50 hover:border-blue-300"
                    )}
                  >
                    <span
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors mt-0.5",
                        selecionada
                          ? "bg-[#0F172B] text-white"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      )}
                    >
                      {opcao.letra}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold leading-relaxed pt-0.5">
                      {opcao.texto}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Controles de Navegação */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <button
                onClick={voltarQuestao}
                disabled={indiceQuestao === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>

              {indiceQuestao < QUESTOES_TESTE.length - 1 ? (
                <button
                  onClick={avancarQuestao}
                  disabled={!respostaSelecionada && !isDeveloper}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#0F172B] hover:bg-slate-800 text-white disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
                >
                  Avançar
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={finalizarTeste}
                  disabled={(!respostaSelecionada && !isDeveloper) || salvando}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-all shadow-xs cursor-pointer"
                >
                  {salvando ? "Calculando..." : "Concluir e Ver Resultado"}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CASO 2: Resultado Exibido ao Profissional (Aba Meu Perfil) */}
      {!precisaResponderTeste && abaAtiva === "profissional" && meuPerfil && (
        <div className="space-y-6 w-full">
          {/* 1. Nome do Perfil & Tipo */}
          <div className="pt-2 pb-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F172B] text-white">
                Seu Arquétipo de Operação
              </span>
              {dataConclusao && (
                <span className="text-xs text-slate-500 font-medium">
                  Avaliado em {new Date(dataConclusao).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>

            <h2 className="text-[30px] sm:text-[33px] font-black text-slate-900 tracking-tight mt-4 leading-snug">
              {meuPerfil.tipoResultado}
            </h2>
          </div>

          {/* 2. Resumo (Card Destaque Emerald) */}
          <div className="bg-emerald-100/90 border border-emerald-300 rounded-2xl p-5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-900 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>SÍNTESE DO SEU PERFIL</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-emerald-950 leading-relaxed">
              {meuPerfil.resumo}
            </p>
          </div>

          {/* 3. As Três Forças Naturais */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
              <Zap className="w-4.5 h-4.5 text-emerald-600" />
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                Suas 3 Forças Naturais
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {meuPerfil.tresForcas.map((f, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-700 block">{f.dimensao}</span>
                  <p className="text-xs sm:text-sm text-slate-700 font-semibold leading-relaxed">{f.texto}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Pontos de Atenção (Card Neutro / Alerta) */}
          <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-slate-900 border-b border-slate-200 pb-3">
              <AlertCircle className="w-4.5 h-4.5 text-amber-600" />
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                Pontos de Atenção
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {meuPerfil.pontosAtencao.map((p, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5 shadow-2xs">
                  {p.dimensao && (
                    <span className="text-sm font-black uppercase tracking-wider text-amber-700 block">{p.dimensao}</span>
                  )}
                  <p className="text-sm sm:text-base text-slate-700 font-semibold leading-relaxed">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Modo de Aprendizagem & 6. Desafio de Desenvolvimento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2.5">
                <BookOpen className="w-4.5 h-4.5 text-blue-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Modo de Aprendizagem
                </h4>
              </div>
              <p className="text-base font-black text-slate-900">
                {meuPerfil.modoAprendizagemInfo.nome}
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-semibold">
                <span className="font-black text-slate-900 uppercase tracking-wider block mb-1 text-[11px]">Sequência Recomendada:</span>
                {meuPerfil.modoAprendizagemInfo.sequencia}
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
                {meuPerfil.desafioDesenvolvimento}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                Pratique este equilíbrio na sua rotina diária para aumentar a consistência e o impacto comercial.
              </p>
            </div>
          </div>

          {/* 7. Botão Iniciar Treinamento */}
          <div className="bg-[#0F172B] text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start text-xs font-black text-[#00D492] uppercase tracking-wider">
                <GraduationCap className="w-4 h-4" />
                <span>Próxima Etapa</span>
              </div>
              <h4 className="text-lg font-black text-white">Treinamento Inicial</h4>
              <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
                Seu perfil foi registrado com sucesso. Agora você está liberado para iniciar os módulos de capacitação.
              </p>
            </div>
            <Link
              href="/treinamento"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shrink-0 shadow-xs transition-all cursor-pointer"
            >
              Iniciar Treinamento
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* CASO 3: Visão do Líder / Supervisor (Seções 10, 11, 12, 13, 14) */}
      {abaAtiva === "lider" && canViewLider && (
        <div className="space-y-6">
          {/* Seletor de Liderados */}
          {(() => {
            // Regras de visibilidade de liderados conforme perfil do usuário logado:
            // 2.1. 'Supervisor': Corretor CLT, Monitoramento, Estágio, Processo Seletivo (não a ele mesmo)
            // 2.2. 'Operacional': Corretor CLT, Monitoramento, Estágio, Processo Seletivo, Supervisor (não a ele mesmo)
            // 2.3. 'Recursos Humanos': Corretor CLT, Monitoramento, Estágio, Processo Seletivo, Supervisor, Operacional, Corretor PJ (não a ele mesmo)
            // 2.4. 'Administrador' e 'Desenvolvedor': todos, inclusive eles mesmos
            const isAdmOuDev = isGrupo3
            const isRecHum = isRecursosHumanos || roleNorm === "recursos humanos" || roleNorm === "rh"
            const isOp = isOperational || roleNorm === "operacional"
            const isSup = isSupervisor || roleNorm === "supervisor"

            const lideradosFiltradosPorPapel = todosPerfis.filter((p: any) => {
              if (isAdmOuDev) return true

              // Usuários não-administradores/desenvolvedores não podem ver a si mesmos
              if (p.id === user?.id) return false

              const pRole = (p.role || "").toLowerCase().trim()
              const pRegime = (p.regime_contratacao || "").toUpperCase().trim()

              const isColabCorretorCLT = (pRole === "corretor" || pRole.includes("corretor")) && pRegime === "CLT"
              const isColabCorretorPJ = (pRole === "corretor" || pRole.includes("corretor")) && (pRegime === "PJ" || (!pRegime && pRole.includes("pj")))
              const isColabMonitoramento = pRole === "monitoramento" || pRole.includes("monitor")
              const isColabEstagio = pRole === "estágio" || pRole === "estagio" || pRole.includes("estag")
              const isColabProcessoSeletivo = pRole === "processo seletivo" || pRole.includes("seletivo")
              const isColabSupervisor = pRole === "supervisor"
              const isColabOperacional = pRole === "operacional"

              if (isSup) {
                return isColabCorretorCLT || isColabMonitoramento || isColabEstagio || isColabProcessoSeletivo
              }

              if (isOp) {
                return isColabCorretorCLT || isColabMonitoramento || isColabEstagio || isColabProcessoSeletivo || isColabSupervisor
              }

              if (isRecHum) {
                return (
                  isColabCorretorCLT ||
                  isColabMonitoramento ||
                  isColabEstagio ||
                  isColabProcessoSeletivo ||
                  isColabSupervisor ||
                  isColabOperacional ||
                  isColabCorretorPJ
                )
              }

              return false
            })

            const lideradosRespondidos = lideradosFiltradosPorPapel
              .filter((p: any) => Boolean(p.perfilProfissional?.calculado))
              .sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" }))

            const colab = lideradosRespondidos.find((p: any) => p.id === (lideradoSelecionadoId || (lideradosRespondidos[0]?.id)))
            const calc = colab?.perfilProfissional?.calculado as PerfilCalculado | undefined

            return (
              <>
                <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                      <Users className="w-5 h-5 text-slate-800" />
                    </span>
                    <div>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">Selecione o Liderado para Analisar:</span>
                      <span className="text-xs font-semibold text-slate-600">Exibindo guias práticos, cartão rápido e checkpoint de 30 dias</span>
                    </div>
                  </div>
                  <select
                    value={colab?.id || ""}
                    onChange={e => setLideradoSelecionadoId(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer shadow-2xs"
                  >
                    {lideradosRespondidos.length === 0 ? (
                      <option value="">Nenhum liderado com teste respondido</option>
                    ) : (
                      lideradosRespondidos.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Dados do Liderado Selecionado */}
                {!calc ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2 shadow-xs">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Perfil Profissional Pendente</h4>
                    <p className="text-xs font-semibold text-slate-600">
                      Nenhum colaborador com o teste de 36 questões concluído foi encontrado.
                    </p>
                  </div>
                ) : (() => {
                  const liderArq = meuPerfil?.arqPrimario || "Executor"
                  const colabArq = calc.arqPrimario
            const parLiderColabKey = `${liderArq}-${colabArq}`
            const dinamicaLiderColab = MATRIZ_LIDER_LIDERADO[parLiderColabKey]

            return (
              <div className="space-y-6">
                {/* Cartão Rápido de Liderança (Seção 11 - 6 linhas) */}
                <div className="bg-[#0F172B] text-white rounded-2xl p-6 sm:p-7 shadow-xs space-y-3 border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#00D492]" />
                      <span className="text-xs font-black text-[#00D492] uppercase tracking-wider">
                        Cartão Rápido de Liderança
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 font-mono text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                    <p className="font-black text-amber-400 text-sm sm:text-base">{calc.cartaoRapido.linha1}</p>
                    <p><span className="text-[#00D492] font-black">• </span>{calc.cartaoRapido.linha2}</p>
                    <p><span className="text-[#00D492] font-black">• </span>{calc.cartaoRapido.linha3}</p>
                    <p><span className="text-[#00D492] font-black">• </span>{calc.cartaoRapido.linha4}</p>
                    <p><span className="text-[#00D492] font-black">• </span>{calc.cartaoRapido.linha5}</p>
                    <p><span className="text-[#00D492] font-black">• </span>{calc.cartaoRapido.linha6}</p>
                    <p className="text-slate-400 text-xs"><span className="text-[#00D492] font-black">• </span>{calc.cartaoRapido.linha7}</p>
                  </div>
                </div>

                {/* Guia Completo: COMO LIDERAR A(O) [NOME] (Seção 10) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="space-y-1 border-b border-slate-100 pb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F172B] text-white inline-block">
                      Manual Prático de Condução
                    </span>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight pt-1">
                      COMO LIDERAR A(O) {colab.nome.toUpperCase()}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">1. Direcionamento</span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">{calc.guiaLider.direcionamento}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-xs font-black text-blue-800 uppercase tracking-wider block">2. Feedback</span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">{calc.guiaLider.feedback}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-xs font-black text-amber-800 uppercase tracking-wider block">3. Cobrança</span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">{calc.guiaLider.cobranca}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-xs font-black text-purple-800 uppercase tracking-wider block">4. Motivadores Prováveis</span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">{calc.guiaLider.motivadores}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-xs font-black text-rose-800 uppercase tracking-wider block">5. Sob Pressão</span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">{calc.guiaLider.sobPressao}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                      <span className="text-xs font-black text-cyan-800 uppercase tracking-wider block">6. Treinamento</span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">{calc.guiaLider.treinamento}</p>
                    </div>
                  </div>
                </div>

                {/* Matriz Líder x Liderado */}
                {dinamicaLiderColab && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
                    <div className="space-y-1 border-b border-slate-100 pb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-700 block">
                        Dinâmica Relacional
                      </span>
                      <h4 className="text-lg font-black text-slate-900">
                        Líder ({liderArq}) × Liderado ({colabArq})
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                        <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">Sinergia</span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">{dinamicaLiderColab.sinergia}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                        <span className="text-xs font-black text-amber-800 uppercase tracking-wider block">Risco</span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">{dinamicaLiderColab.risco}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                        <span className="text-xs font-black text-blue-800 uppercase tracking-wider block">Ação do Líder</span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">{dinamicaLiderColab.acao}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Checkpoint Objetivo da Liderança - 30 Dias (Seção 12 & 13) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-700 block">
                        Avaliação Prática de 30 Dias Efetivos
                      </span>
                      <h4 className="text-lg font-black text-slate-900">
                        Checkpoint Objetivo da Liderança (C01 a C12)
                      </h4>
                    </div>
                    {colab.checkpoint30Dias && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        Último registro em: {new Date(colab.checkpoint30Dias.dataConclusao).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>

                  {/* Se já existe checkpoint salvo, mostrar resultado comparativo (Seção 13) */}
                  {colab.checkpoint30Dias?.resultadoObservado && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                        Matriz Perfil Inicial × Comportamento Observado (30 Dias)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(Object.keys(DIMENSOES_INFO) as DimensaoCodigo[]).map(d => {
                          const obs = colab.checkpoint30Dias.resultadoObservado[d]
                          if (!obs) return null
                          return (
                            <div key={d} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-slate-900">{DIMENSOES_INFO[d].nome}</span>
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {obs.classificacao}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-700 font-semibold">{obs.leituraCombinada}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{obs.orientacao}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Formulário do Checkpoint */}
                  <div className="space-y-6 pt-2">
                    <p className="text-sm font-semibold text-slate-600">
                      Selecione a opção que melhor descreve o comportamento observado deste profissional nos últimos 30 dias:
                    </p>

                    <div className="space-y-4">
                      {QUESTOES_CHECKPOINT.map(q => (
                        <div key={q.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">{q.id} ({DIMENSOES_INFO[q.dimensao].nome}):</span>
                            <span className="text-sm text-slate-700 font-semibold">{q.pergunta}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            {(["A", "B", "C", "D", "E"] as const).map(letra => {
                              const selecionada = checkpointAnswers[q.id] === letra
                              return (
                                <button
                                  key={letra}
                                  onClick={() => setCheckpointAnswers(prev => ({ ...prev, [q.id]: letra }))}
                                  className={cn(
                                    "text-left p-2.5 rounded-lg border transition-all flex items-start gap-2 cursor-pointer",
                                    selecionada
                                      ? "bg-[#87A9FF] border-[#658de6] text-slate-900 font-bold shadow-xs"
                                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                                  )}
                                >
                                  <span className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center text-xs font-black shrink-0",
                                    selecionada ? "bg-[#0F172B] text-white" : "bg-slate-100 text-slate-700 border border-slate-200"
                                  )}>
                                    {letra}
                                  </span>
                                  <span className="leading-tight font-semibold text-[13px] pt-0.5">{q.opcoes[letra]}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => salvarCheckpointLider(colab.id)}
                      disabled={salvandoCheckpoint}
                      className="w-full sm:w-auto px-6 py-2.5 bg-[#0F172B] hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      {salvandoCheckpoint ? "Salvando Checkpoint..." : "Salvar Checkpoint de 30 Dias"}
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </>
      )
    })()}
  </div>
)}

      {/* CASO 4: Visão CEO / Gestão - Inteligência do Time (Seção 15) */}
      {abaAtiva === "gestao" && canViewGestao && (
        <div className="space-y-6">
          {/* 1. Indicadores de Cobertura */}
          {(() => {
            const perfisAtivos = todosPerfis.filter(p => !p.status || p.status === "ATIVO")
            const avaliados = perfisAtivos.filter(p => p.perfilProfissional?.calculado)
            const comCheckpoint = perfisAtivos.filter(p => p.checkpoint30Dias?.resultadoObservado)
            const total = perfisAtivos.length || 1

            // 2. DNA do Time (médias das 6 dimensões)
            const dimMedias: Record<DimensaoCodigo, number> = { ACT: 0, COM: 0, CON: 0, PRE: 0, RES: 0, AUT: 0 }
            if (avaliados.length > 0) {
              avaliados.forEach(p => {
                const norm = p.perfilProfissional.calculado.normalizedScores
                ;(Object.keys(dimMedias) as DimensaoCodigo[]).forEach(d => {
                  dimMedias[d] += norm[d] || 0
                })
              })
              ;(Object.keys(dimMedias) as DimensaoCodigo[]).forEach(d => {
                dimMedias[d] = Math.round(dimMedias[d] / avaliados.length)
              })
            }

            const dimsOrdenadasMedia = (Object.keys(dimMedias) as DimensaoCodigo[]).sort((a, b) => dimMedias[b] - dimMedias[a])
            const forcaColetiva1 = dimsOrdenadasMedia[0]
            const forcaColetiva2 = dimsOrdenadasMedia[1]

            // Ponto de atenção: maior distância de 50
            const dimMaiorDist50 = (Object.keys(dimMedias) as DimensaoCodigo[]).sort(
              (a, b) => Math.abs(dimMedias[b] - 50) - Math.abs(dimMedias[a] - 50)
            )[0]

            // Distribuição de Arquétipos
            const arqContagem: Record<string, number> = {}
            avaliados.forEach(p => {
              const arq = p.perfilProfissional.calculado.arqPrimario
              arqContagem[arq] = (arqContagem[arq] || 0) + 1
            })

            return (
              <div className="space-y-6">
                {/* Cards de Cobertura */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Avaliados (Perfil)</span>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900">{avaliados.length} <span className="text-xs text-slate-500 font-semibold">/ {total} ({Math.round((avaliados.length / total) * 100)}%)</span></p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Em Operação Efetiva</span>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900">{total}</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Checkpoints 30D Concluídos</span>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-600">{comCheckpoint.length} <span className="text-xs text-slate-500 font-semibold">/ {avaliados.length}</span></p>
                  </div>
                </div>

                {/* DNA do Time & Forças Coletivas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xs">
                    <div className="space-y-1 border-b border-slate-100 pb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F172B] text-white inline-block">
                        DNA do Time (Médias)
                      </span>
                      <h4 className="text-lg font-black text-slate-900 pt-1">Dimensões Coletivas</h4>
                    </div>

                    <div className="space-y-3 pt-1">
                      {dimsOrdenadasMedia.map(d => (
                        <div key={d} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700">{DIMENSOES_INFO[d].nome}</span>
                            <span className="text-slate-900 font-black">{dimMedias[d]}/100</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${dimMedias[d]}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xs">
                    <div className="space-y-1 border-b border-slate-100 pb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F172B] text-white inline-block">
                        Síntese Executiva
                      </span>
                      <h4 className="text-lg font-black text-slate-900 pt-1">Forças & Ponto de Atenção Coletivo</h4>
                    </div>

                    <div className="space-y-3 pt-1">
                      {avaliados.length === 0 ? (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-xs font-semibold text-slate-500">
                            Nenhuma avaliação realizada até o momento para gerar a síntese coletiva.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">Tendências Predominantes do Time:</span>
                            <p className="text-xs sm:text-sm font-semibold text-slate-700">
                              {DIMENSOES_INFO[forcaColetiva1]?.nome} e {DIMENSOES_INFO[forcaColetiva2]?.nome} lideram o ritmo coletivo.
                            </p>
                          </div>

                          <div className="p-4 bg-slate-100/80 rounded-xl border border-slate-300 space-y-1">
                            <span className="text-xs font-black text-amber-800 uppercase tracking-wider block">Ponto de Atenção Coletivo:</span>
                            <p className="text-xs sm:text-sm font-semibold text-slate-700">
                              A dimensão {DIMENSOES_INFO[dimMaiorDist50]?.nome} requer monitoramento preventivo para evitar desalinhamentos nos momentos de pressão ou pico de demanda.
                            </p>
                          </div>

                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                            <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">Distribuição de Arquétipos Primários:</span>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {Object.entries(arqContagem)
                                .sort(([, qtdA], [, qtdB]) => qtdB - qtdA)
                                .map(([arq, qtd]) => (
                                  <span key={arq} className="text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800 font-bold shadow-2xs">
                                    {arq}: <strong className="text-slate-900">{qtd}</strong> ({Math.round((qtd / (avaliados.length || 1)) * 100)}%)
                                  </span>
                                ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mapa Comportamental (Lista alfabética e indicador discreto de consistência) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xs">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F172B] text-white inline-block">
                      Visão Coletiva
                    </span>
                    <h4 className="text-lg font-black text-slate-900 pt-1">
                      Mapa Comportamental do Time
                    </h4>
                  </div>

                  {/* Tabela de Colaboradores */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 uppercase text-[10px] font-black text-slate-600 tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Colaborador</th>
                          <th className="py-3 px-4">Função</th>
                          <th className="py-3 px-4">Perfil Mapeado</th>
                          <th className="py-3 px-4">Modo Aprendizagem</th>
                          <th className="py-3 px-4">Consistência</th>
                          <th className="py-3 px-4">Checkpoint 30D</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {avaliados
                          .sort((a, b) => a.nome.localeCompare(b.nome))
                          .map((p: any) => {
                            const c = p.perfilProfissional.calculado as PerfilCalculado
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-4 font-bold text-slate-900">
                                  {p.nome}
                                  <span className="block text-[10px] text-slate-500 font-normal">{p.email}</span>
                                </td>
                                <td className="py-3 px-4 text-slate-600 font-semibold">{p.role}</td>
                                <td className="py-3 px-4 font-black text-slate-900">{c.tipoResultado}</td>
                                <td className="py-3 px-4 text-slate-600 font-semibold">{c.modoAprendizagemInfo.nome}</td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      c.consistenciaClassificacao === "Alta"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : c.consistenciaClassificacao === "Adequada"
                                        ? "bg-blue-50 text-blue-800 border border-blue-200"
                                        : "bg-amber-50 text-amber-800 border border-amber-200"
                                    }`}
                                  >
                                    {c.consistenciaClassificacao} ({c.consistenciaIndice}%)
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  {p.checkpoint30Dias ? (
                                    <span className="text-emerald-700 font-bold">Concluído</span>
                                  ) : (
                                    <span className="text-slate-400 font-semibold">Pendente</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
      </div>
    </div>
  )
}
