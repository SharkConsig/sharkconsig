"use client"

import { useState, useEffect, use } from "react"
import { cn } from "@/lib/utils"
import {
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Clock,
  Send,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Lock
} from "lucide-react"

interface QuestaoOpcao {
  letra: "A" | "B" | "C" | "D"
  texto: string
}

interface Questao {
  numero: number
  enunciado: string
  opcoes: QuestaoOpcao[]
}

interface PageProps {
  params: Promise<{ token: string }>
}

export default function AvaliacaoCandidatoPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const token = resolvedParams.token

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [statusLink, setStatusLink] = useState<"valid" | "completed" | "expired" | "invalid">("valid")
  const [candidato, setCandidato] = useState<{ nome: string; cargo_pretendido?: string } | null>(null)
  const [questoes, setQuestoes] = useState<Questao[]>([])

  // Fluxo de resposta
  const [iniciou, setIniciou] = useState(false)
  const [indiceQuestao, setIndiceQuestao] = useState(0)
  const [respostas, setRespostas] = useState<Record<number, string>>({})
  const [modalConfirmacao, setModalConfirmacao] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [concluidoSucesso, setConcluidoSucesso] = useState(false)

  useEffect(() => {
    carregarAvaliacao()
  }, [token])

  const carregarAvaliacao = async () => {
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch(`/api/v1/public/assessment?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
        headers: { "x-assessment-token": token }
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        if (data.status === "completed") {
          setStatusLink("completed")
          setErro(data.error || "Esta avaliação já foi respondida e o link foi finalizado.")
        } else if (data.status === "expired") {
          setStatusLink("expired")
          setErro(data.error || "Este link de avaliação expirou.")
        } else {
          setStatusLink("invalid")
          setErro(data.error || "Convite de avaliação não encontrado ou inválido.")
        }
        return
      }

      setStatusLink("valid")
      setCandidato(data.candidato)
      setQuestoes(data.questoes || [])
    } catch (err: any) {
      console.error("Erro ao carregar teste:", err)
      setStatusLink("invalid")
      setErro("Falha na conexão com o servidor. Verifique sua conexão e recarregue a página.")
    } finally {
      setLoading(false)
    }
  }

  const selecionarOpcao = (letra: "A" | "B" | "C" | "D") => {
    if (!questoes[indiceQuestao]) return
    const num = questoes[indiceQuestao].numero
    setRespostas(prev => ({ ...prev, [num]: letra }))
  }

  const avancarQuestao = () => {
    if (indiceQuestao < questoes.length - 1) {
      setIndiceQuestao(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      setModalConfirmacao(true)
    }
  }

  const voltarQuestao = () => {
    if (indiceQuestao > 0) {
      setIndiceQuestao(prev => prev - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const enviarRespostas = async () => {
    setEnviando(true)
    try {
      const res = await fetch("/api/v1/public/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          respostas
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        alert(data.error || "Erro ao registrar suas respostas. Tente novamente.")
        return
      }

      setModalConfirmacao(false)
      setConcluidoSucesso(true)
      setStatusLink("completed")
    } catch (err) {
      console.error("Erro ao submeter avaliação:", err)
      alert("Erro ao enviar avaliação. Verifique sua internet e tente novamente.")
    } finally {
      setEnviando(false)
    }
  }

  // TELA 1: CARREGANDO
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#0F172B] text-white flex items-center justify-center mx-auto animate-pulse">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900">SharkConsig</h2>
          <p className="text-xs text-slate-500 font-medium">Validando seu link de acesso seguro...</p>
        </div>
      </div>
    )
  }

  // TELA 2: SUCESSO APÓS ENVIO
  if (concluidoSucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-emerald-50/40 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-emerald-200 p-8 sm:p-10 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Processo Finalizado
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
              Avaliação Concluída!
            </h1>
            <p className="text-sm font-semibold text-slate-600 leading-relaxed">
              Obrigado, <strong className="text-slate-900">{candidato?.nome}</strong>. Suas 36 respostas foram registradas com sucesso e encaminhadas para a equipe de Recursos Humanos da Acerto Fácil.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Segurança e Privacidade</span>
            </div>
            <p className="font-medium text-slate-600 leading-relaxed">
              Por motivos de confidencialidade e integridade do processo seletivo, este link de uso único expirou automaticamente após a conclusão.
            </p>
          </div>

          <p className="text-xs text-slate-400 font-medium pt-2">
            Você já pode fechar esta aba do navegador com segurança.
          </p>
        </div>
      </div>
    )
  }

  // TELA 3: LINK INVÁLIDO / EXPIRADO / JÁ CONCLUÍDO
  if (statusLink !== "valid") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-md text-center space-y-6">
          <div className={cn(
            "w-16 h-16 rounded-3xl flex items-center justify-center mx-auto ring-8",
            statusLink === "completed"
              ? "bg-emerald-100 text-emerald-700 ring-emerald-50"
              : "bg-amber-100 text-amber-700 ring-amber-50"
          )}>
            {statusLink === "completed" ? (
              <CheckCircle2 className="w-9 h-9" />
            ) : (
              <AlertCircle className="w-9 h-9" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
              {statusLink === "completed"
                ? "Avaliação Já Concluída"
                : statusLink === "expired"
                ? "Link de Acesso Expirado"
                : "Link Inválido"}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
              {erro}
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 font-medium leading-relaxed">
            Caso precise realizar uma nova tentativa ou tenha dúvidas sobre o processo seletivo, entre em contato diretamente com o responsável de RH que enviou o convite.
          </div>
        </div>
      </div>
    )
  }

  // TELA 4: ORIENTAÇÕES INICIAIS
  if (!iniciou) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-md space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-[#0F172B] text-white flex items-center justify-center font-black">
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </span>
              <div>
                <span className="text-sm font-black text-slate-900">Processo Seletivo</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Acesso Seguro
            </span>
          </div>

          {/* Boas-vindas */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Olá, {candidato?.nome}!
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
              Seja bem-vindo(a) à avaliação de <strong className="text-slate-900">Perfil Profissional</strong> da SharkConsig para a oportunidade de <strong>{candidato?.cargo_pretendido || "Processo Seletivo"}</strong>.
            </p>
          </div>

          {/* Regras e Orientações */}
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">Como funciona o teste:</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>36 Questões Objetivas</span>
                </div>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                  Cada questão possui 4 alternativas (A, B, C, D). Escolha a opção que mais reflete sua atitude real.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>10 a 15 Minutos</span>
                </div>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                  Responda de forma fluida e sem interrupções para garantir maior fidelidade ao seu perfil.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-semibold text-amber-900 leading-relaxed">
              <strong>Atenção:</strong> Não existem respostas "certas" ou "erradas". Este teste mapeia seu estilo natural de trabalho, ritmo e preferências para encontrarmos o melhor encaixe e suporte na equipe.
            </div>
          </div>

          {/* Botão de Iniciar */}
          <div className="pt-2">
            <button
              onClick={() => {
                setIniciou(true)
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className="w-full py-4 px-6 rounded-2xl bg-[#0F172B] hover:bg-slate-800 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>Iniciar Avaliação Agora</span>
              <ArrowRight className="w-5 h-5 text-emerald-400" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // TELA 5: EXECUÇÃO DO TESTE
  const questaoAtual = questoes[indiceQuestao]
  if (!questaoAtual) return null

  const questoesRespondidasCount = Object.keys(respostas).length
  const porcentagemConcluido = Math.round((questoesRespondidasCount / questoes.length) * 100)
  const respostaSelecionada = respostas[questaoAtual.numero]

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-3 sm:px-6">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        {/* Topo / Progresso */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#0F172B] text-white flex items-center justify-center font-black shrink-0">
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Candidato(a)</span>
                <span className="text-xs sm:text-sm font-black text-slate-900">{candidato?.nome}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-black text-slate-900 block">
                Questão {indiceQuestao + 1} de {questoes.length}
              </span>
              <span className="text-[11px] font-bold text-emerald-600">
                {porcentagemConcluido}% concluído
              </span>
            </div>
          </div>

          {/* Barra de Progresso Suave */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${(questoesRespondidasCount / questoes.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Card da Questão */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="space-y-2 border-b border-slate-100 pb-4">
            <div className="inline-flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#0F172B] text-white">
                Questão {questaoAtual.numero < 10 ? `0${questaoAtual.numero}` : questaoAtual.numero}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug pt-1">
              {questaoAtual.enunciado}
            </h2>
          </div>

          {/* Alternativas A, B, C, D */}
          <div className="space-y-3 pt-1">
            {questaoAtual.opcoes.map(opcao => {
              const selecionada = respostaSelecionada === opcao.letra
              return (
                <button
                  key={opcao.letra}
                  onClick={() => selecionarOpcao(opcao.letra)}
                  className={cn(
                    "w-full text-left p-4 sm:p-4.5 rounded-2xl border-2 transition-all duration-150 flex items-start gap-4 cursor-pointer",
                    selecionada
                      ? "bg-blue-50/80 border-blue-600 text-slate-900 shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  )}
                >
                  <span
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors mt-0.5",
                      selecionada
                        ? "bg-[#0F172B] text-white"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    )}
                  >
                    {opcao.letra}
                  </span>
                  <span className={cn(
                    "text-xs sm:text-sm leading-relaxed pt-1",
                    selecionada ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                  )}>
                    {opcao.texto}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Navegação */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              onClick={voltarQuestao}
              disabled={indiceQuestao === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>

            {indiceQuestao < questoes.length - 1 ? (
              <button
                onClick={avancarQuestao}
                disabled={!respostaSelecionada}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-[#0F172B] hover:bg-slate-800 text-white disabled:opacity-35 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
              >
                Avançar
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setModalConfirmacao(true)}
                disabled={!respostaSelecionada || questoesRespondidasCount < questoes.length}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-35 transition-all shadow-xs cursor-pointer"
              >
                Concluir
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Rodapé Seguro */}
        <div className="text-center text-[11px] text-slate-600 font-medium py-2">
          Acerto Fácil &bull; Plataforma Segura de Avaliação de Perfil &bull; Link de Uso Único
        </div>
      </div>

      {/* Modal de Confirmação de Envio */}
      {modalConfirmacao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">Confirmar Envio?</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                Você respondeu a todas as <strong>{questoes.length} questões</strong>. Ao confirmar, suas respostas serão computadas e este link de acesso será invalidado.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setModalConfirmacao(false)}
                disabled={enviando}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Revisar Questões
              </button>
              <button
                onClick={enviarRespostas}
                disabled={enviando}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {enviando ? "Enviando..." : "Confirmar e Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
