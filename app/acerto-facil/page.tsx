"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Building2, 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  HeartPulse, 
  Award, 
  Coffee, 
  GraduationCap, 
  Utensils, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Phone, 
  Mail, 
  MapPin, 
  Instagram, 
  Star, 
  Briefcase, 
  Send, 
  Loader2, 
  Calculator, 
  Sparkles, 
  ChevronRight, 
  X, 
  ExternalLink,
  Lock,
  Clock,
  Percent,
  Smile
} from "lucide-react"
import { toast } from "sonner"
import { 
  SiteContent, 
  DEFAULT_SITE_CONTENT, 
  getLocalSiteContent, 
  SiteJob 
} from "@/lib/site-content"

export default function AcertoFacilPublicPage() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT)
  const [isSimulacaoModalOpen, setIsSimulacaoModalOpen] = useState(false)
  const [isCandidaturaModalOpen, setIsCandidaturaModalOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<SiteJob | null>(null)

  // Estados Formulário de Simulação de Crédito
  const [simForm, setSimForm] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    convenio: "INSS",
    tipo_operacao: "Novo Empréstimo",
    valor_pretendido: "10000",
    observacoes: ""
  })
  const [isSubmittingSim, setIsSubmittingSim] = useState(false)

  // Estados Formulário Trabalhe Conosco
  const [candForm, setCandForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    cidade: "Florianópolis / SC",
    cargo_interesse: "Consultor Comercial de Crédito Consignado",
    linkedin: "",
    experiencia: "",
    mensagem: "",
    curriculo_url: ""
  })
  const [isSubmittingCand, setIsSubmittingCand] = useState(false)

  // Carregar conteúdo customizado pelo Marketing
  useEffect(() => {
    setContent(getLocalSiteContent())
    const handleUpdate = (e: any) => {
      if (e.detail) setContent(e.detail)
    }
    window.addEventListener("site_content_updated", handleUpdate)
    return () => window.removeEventListener("site_content_updated", handleUpdate)
  }, [])

  // Cálculo da simulação de crédito em tempo real
  const valorNumero = parseFloat(simForm.valor_pretendido.replace(/\D/g, "")) || 10000
  const estimativa84x = Math.round((valorNumero * 0.0245) * 100) / 100
  const estimativa60x = Math.round((valorNumero * 0.0298) * 100) / 100

  // Máscaras de entrada
  const formatCPF = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 11)
    return d.replace(/(\d{3})(\d{3})?(\d{3})?(\d{2})?/, (_, p1, p2, p3, p4) => {
      let res = p1
      if (p2) res += `.${p2}`
      if (p3) res += `.${p3}`
      if (p4) res += `-${p4}`
      return res
    })
  }

  const formatPhone = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 11)
    if (d.length > 10) {
      return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    }
    return d.replace(/(\d{2})(\d{4})?(\d{4})?/, (_, p1, p2, p3) => {
      let res = `(${p1}`
      if (p2) res += `) ${p2}`
      if (p3) res += `-${p3}`
      return res
    })
  }

  const handleSubmitSimulacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!simForm.nome.trim() || !simForm.cpf.trim() || !simForm.telefone.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    setIsSubmittingSim(true)
    try {
      const res = await fetch("/api/public/simulacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simForm)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao enviar simulação")

      toast.success(data.message || "Simulação enviada com sucesso! Em breve entraremos em contato.")
      setIsSimulacaoModalOpen(false)
      setSimForm({
        nome: "",
        cpf: "",
        telefone: "",
        convenio: "INSS",
        tipo_operacao: "Novo Empréstimo",
        valor_pretendido: "10000",
        observacoes: ""
      })
    } catch (err: any) {
      toast.error(err.message || "Não foi possível enviar a simulação. Tente novamente.")
    } finally {
      setIsSubmittingSim(false)
    }
  }

  const handleSubmitCandidatura = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!candForm.nome.trim() || !candForm.email.trim() || !candForm.telefone.trim()) {
      toast.error("Por favor, informe seu nome, e-mail e telefone.")
      return
    }

    setIsSubmittingCand(true)
    try {
      const res = await fetch("/api/public/candidatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candForm)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao registrar candidatura")

      toast.success("Candidatura enviada com sucesso para nosso RH! Entraremos em contato.")
      setIsCandidaturaModalOpen(false)
      setCandForm({
        nome: "",
        email: "",
        telefone: "",
        cidade: "Florianópolis / SC",
        cargo_interesse: "Consultor Comercial de Crédito Consignado",
        linkedin: "",
        experiencia: "",
        mensagem: "",
        curriculo_url: ""
      })
    } catch (err: any) {
      toast.error(err.message || "Não foi possível registrar a candidatura. Tente novamente.")
    } finally {
      setIsSubmittingCand(false)
    }
  }

  const getBenefitIcon = (iconName: string) => {
    switch (iconName) {
      case "TrendingUp": return <TrendingUp className="w-5 h-5 text-emerald-600" />
      case "Utensils": return <Utensils className="w-5 h-5 text-amber-600" />
      case "HeartPulse": return <HeartPulse className="w-5 h-5 text-rose-600" />
      case "Award": return <Award className="w-5 h-5 text-indigo-600" />
      case "Coffee": return <Coffee className="w-5 h-5 text-amber-700" />
      case "GraduationCap": return <GraduationCap className="w-5 h-5 text-blue-600" />
      default: return <Sparkles className="w-5 h-5 text-primary" />
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Banner de Transparência e Segurança */}
      <div className="bg-[#0b1324] text-slate-300 text-[11px] py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Correspondente Bancário Autorizado • Regulamentado pelas Resoluções do Banco Central do Brasil</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" /> Ambiente 100% Seguro & LGPD
            </span>
            <span className="hidden md:inline">•</span>
            <a 
              href="https://www.instagram.com/acertofacilpromotora/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <Instagram className="w-3 h-3 text-pink-400" /> @acertofacilpromotora
            </a>
          </div>
        </div>
      </div>

      {/* Header Público */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo Acerto Fácil */}
          <Link href="/acerto-facil" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0F172A] via-[#1E293B] to-[#00A86B] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                ACERTO<span className="text-[#00A86B]">FÁCIL</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                Promotora de Crédito
              </span>
            </div>
          </Link>

          {/* Links de Navegação */}
          <nav className="hidden lg:flex items-center gap-8 text-[12px] font-bold uppercase tracking-wider text-slate-600">
            <a href="#credito" className="hover:text-emerald-600 transition-colors">Crédito Consignado</a>
            <a href="#vantagens" className="hover:text-emerald-600 transition-colors">Vantagens</a>
            <a href="#cultura" className="hover:text-emerald-600 transition-colors">Cultura & Equipe</a>
            <a href="#vagas" className="hover:text-emerald-600 transition-colors">Trabalhe Conosco</a>
            <a href="#instagram" className="hover:text-emerald-600 transition-colors">Instagram</a>
            <a href="#depoimentos" className="hover:text-emerald-600 transition-colors">Depoimentos</a>
          </nav>

          {/* Ações do Header */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all shadow-2xs group cursor-pointer"
              title="Voltar para o sistema SharkConsig"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Voltar ao</span>
              <span className="font-extrabold text-slate-900">SharkConsig</span>
            </Link>
            <button
              onClick={() => {
                setSelectedJob(null)
                setIsCandidaturaModalOpen(true)
              }}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              Trabalhe Conosco
            </button>
            <button
              onClick={() => setIsSimulacaoModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              Simular Crédito
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION - Duplo Objetivo Estratégico */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-100/80 pt-16 pb-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Texto Hero */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black uppercase tracking-wider shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{content.hero.badge}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                {content.hero.titulo}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {content.hero.subtitulo}
              </p>

              {/* Botões de Ação Duplos */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => setIsSimulacaoModalOpen(true)}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-600/20 hover:shadow-2xl hover:shadow-emerald-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Calculator className="w-5 h-5" />
                  {content.hero.ctaCliente}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedJob(null)
                    setIsCandidaturaModalOpen(true)
                  }}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border-2 border-slate-900 text-slate-900 font-black text-sm uppercase tracking-wider hover:bg-slate-900 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm"
                >
                  <Briefcase className="w-5 h-5" />
                  {content.hero.ctaTrabalhe}
                </button>
              </div>

              {/* Badges de Confiança */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-[12px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sem Consulta ao SPC/Serasa
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Taxas Reguladas pelo Governo
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Liberação em até 24h
                </span>
              </div>
            </div>

            {/* Simulador Interativo Rápido */}
            <div id="simulador-card" className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md">
                      Simulação Instantânea
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">Gratuita e Sem Compromisso</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Quanto você precisa?
                  </h3>
                </div>

                <div className="space-y-4 relative z-10">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Valor Pretendido</label>
                      <span className="text-2xl font-black text-emerald-600">
                        {valorNumero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="2000"
                      max="100000"
                      step="1000"
                      value={valorNumero}
                      onChange={(e) => setSimForm(prev => ({ ...prev, valor_pretendido: e.target.value }))}
                      className="w-full accent-emerald-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                      <span>R$ 2.000</span>
                      <span>R$ 50.000</span>
                      <span>R$ 100.000+</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">84 parcelas de aprox.</span>
                      <span className="text-lg font-black text-slate-900">
                        R$ {estimativa84x.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">60 parcelas de aprox.</span>
                      <span className="text-lg font-black text-slate-900">
                        R$ {estimativa60x.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsSimulacaoModalOpen(true)}
                    className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Quero Esta Proposta</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-[10px] text-center text-slate-400 leading-tight">
                    *Valores estimados sujeitos à análise cadastral e margem disponível do benefício.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE CREDIBILIDADE & NÚMEROS */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight block">
                {content.metricas.creditoLiberado}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Em Crédito Liberado</span>
            </div>
            <div className="p-4 space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight block">
                {content.metricas.clientesAtendidos}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Atendimentos Humanizados</span>
            </div>
            <div className="p-4 space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight block">
                {content.metricas.notaGoogle}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Avaliação Média dos Clientes</span>
            </div>
            <div className="p-4 space-y-1">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight block">
                {content.metricas.anosMercado}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Experiência e Segurança</span>
            </div>
          </div>

          {/* Bancos Parceiros */}
          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 block mb-6">
              Principais Bancos e Instituições Financeiras Conectadas
            </span>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-75 grayscale hover:grayscale-0 transition-all duration-300 text-sm font-black text-slate-700 tracking-wider">
              <span>BANCO ITAÚ</span>
              <span>BANCO PAN</span>
              <span>BRADESCO</span>
              <span>SANTANDER</span>
              <span>BANCO BMG</span>
              <span>C6 BANK</span>
              <span>FACTA FINANCEIRA</span>
              <span>BANCO DAYCOVAL</span>
              <span>BANCO SAFRA</span>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO MODALIDADES DE CRÉDITO */}
      <section id="credito" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Soluções Sob Medida
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              O Crédito Certo Para Cada Momento da Sua Vida
            </h2>
            <p className="text-sm sm:text-base text-slate-500">
              Trabalhamos com todas as modalidades regulamentadas pelo INSS e pelo Governo Federal, garantindo as melhores condições e parcelas descontadas diretamente em folha.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <Percent className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Novo Empréstimo Consignado</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dinheiro rápido para quem tem margem disponível. Prazos em até 84 ou 120 meses, sem precisar justificar o destino e com desconto suave no contracheque.
              </p>
              <ul className="space-y-2 text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Aposentados e Pensionistas do INSS</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Servidores Federais (SIAPE), Estaduais e Municipais</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Forças Armadas e Militares</li>
              </ul>
              <button
                onClick={() => {
                  setSimForm(prev => ({ ...prev, tipo_operacao: "Novo Empréstimo" }))
                  setIsSimulacaoModalOpen(true)
                }}
                className="w-full mt-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Simular Novo Empréstimo
              </button>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-emerald-300 shadow-md ring-2 ring-emerald-500/10 space-y-4 relative">
              <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                Mais Solicitado
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Portabilidade com Troco</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Transfira suas dívidas caras de outros bancos para a Acerto Fácil. Reduza o valor das parcelas mensais e ainda receba uma quantia em dinheiro de troco na sua conta.
              </p>
              <ul className="space-y-2 text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sem necessidade de margem livre</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Redução real de taxa de juros</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Troco disponível para usar como quiser</li>
              </ul>
              <button
                onClick={() => {
                  setSimForm(prev => ({ ...prev, tipo_operacao: "Portabilidade com Troco" }))
                  setIsSimulacaoModalOpen(true)
                }}
                className="w-full mt-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
              >
                Simular Portabilidade
              </button>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Cartão de Crédito Benefício</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cartão exclusivo para beneficiários do INSS e servidores com margem de 5%. Saque em dinheiro de até 70% do limite e descontos exclusivos em farmácias credenciadas.
              </p>
              <ul className="space-y-2 text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sem anuidade ou taxa de manutenção</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Saque emergencial em dinheiro</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Seguro de vida e auxílio funeral inclusos</li>
              </ul>
              <button
                onClick={() => {
                  setSimForm(prev => ({ ...prev, tipo_operacao: "Cartão Benefício" }))
                  setIsSimulacaoModalOpen(true)
                }}
                className="w-full mt-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Solicitar Cartão Benefício
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO EMPLOYER BRANDING: CULTURA, BENEFÍCIOS & EQUIPE */}
      <section id="cultura" className="py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Employer Branding & Cultura
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {content.cultura.titulo}
            </h2>
            <p className="text-sm sm:text-base text-slate-500">
              {content.cultura.subtitulo}
            </p>
          </div>

          {/* Pilares da Empresa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.cultura.pilares.map((p, idx) => (
              <div key={idx} className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                  Pilar 0{idx + 1}
                </span>
                <h3 className="text-lg font-black text-slate-900">{p.titulo}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{p.descricao}</p>
              </div>
            ))}
          </div>

          {/* Galeria de Fotos da Equipe & Dia a Dia */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vida na Acerto Fácil</span>
                <h3 className="text-2xl font-black text-slate-900">Nosso Dia a Dia em Imagens</h3>
              </div>
              <a 
                href={content.instagram.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1.5"
              >
                <Instagram className="w-4 h-4" /> Acompanhe no Instagram {content.instagram.handle}
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {content.fotosEquipe.map((foto) => (
                <div key={foto.id} className="group relative h-64 rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                  <img 
                    src={foto.url} 
                    alt={foto.titulo} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">{foto.categoria}</span>
                    <h4 className="text-sm font-bold leading-tight">{foto.titulo}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefícios Oferecidos aos Colaboradores */}
          <div className="space-y-8 pt-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pacote de Vantagens</span>
              <h3 className="text-2xl font-black text-slate-900">Benefícios que Cuidam de Você</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.cultura.beneficios.map((b, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                    {getBenefitIcon(b.icon)}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-900">{b.titulo}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{b.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO VAGAS EM ABERTO - TRABALHE CONOSCO */}
      <section id="vagas" className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-800 pb-8">
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
                Oportunidades Abertas
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                Venha Fazer Parte da Nossa História
              </h2>
              <p className="text-sm text-slate-400 max-w-xl">
                Estamos em constante expansão e buscando talentos que queiram crescer rápido, aprender com os melhores e construir uma carreira sólida no mercado financeiro.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedJob(null)
                setIsCandidaturaModalOpen(true)
              }}
              className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
              Enviar Currículo Espontâneo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.vagas.filter(v => v.ativo).map((vaga) => (
              <div key={vaga.id} className="p-8 rounded-3xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between space-y-6 hover:border-emerald-500/50 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300">{vaga.area}</span>
                    <span>{vaga.tipo}</span>
                  </div>
                  <h3 className="text-lg font-black text-white">{vaga.titulo}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{vaga.descricao}</p>

                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Requisitos:</span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {vaga.requisitos.map((req, rIdx) => (
                        <li key={rIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {vaga.local}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedJob(vaga)
                      setCandForm(prev => ({ ...prev, cargo_interesse: vaga.titulo }))
                      setIsCandidaturaModalOpen(true)
                    }}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-900 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Candidatar-se
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO FEED DO INSTAGRAM (@acertofacilpromotora) */}
      <section id="instagram" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-200">
                Redes Sociais
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-2">
                Conecte-se com o Nosso Dia a Dia
              </h2>
              <p className="text-sm text-slate-500">
                Acompanhe publicações oficiais, bastidores, comemorações e novidades no nosso Instagram oficial.
              </p>
            </div>
            <a
              href={content.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Instagram className="w-4 h-4" /> Seguir {content.instagram.handle}
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.instagram.posts.map((post) => (
              <a
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col"
              >
                <div className="h-60 relative overflow-hidden bg-slate-100">
                  <img
                    src={post.imagem}
                    alt="Post do Instagram"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white p-1.5 rounded-full">
                    <Instagram className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {post.legenda}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                    <span>❤️ {post.likes} curtidas</span>
                    <span>{post.data}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO DEPOIMENTOS & PROVA SOCIAL */}
      <section id="depoimentos" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Depoimentos Reais
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              O que dizem sobre nós
            </h2>
            <p className="text-sm text-slate-500">
              A satisfação dos nossos clientes e o orgulho dos nossos colaboradores são os nossos maiores troféus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.depoimentos.map((dep) => (
              <div key={dep.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(dep.estrelas)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 italic leading-relaxed">
                    "{dep.texto}"
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-200/60">
                  <h4 className="text-sm font-black text-slate-900">{dep.nome}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{dep.perfil}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER PÚBLICO INSTITUCIONAL */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00A86B] flex items-center justify-center text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-lg font-black tracking-tight text-white">
                  ACERTO<span className="text-[#00A86B]">FÁCIL</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Promotora de crédito e correspondente bancário autorizado, conectando você às melhores taxas do mercado com segurança e transparência.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-white">Soluções</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#credito" className="hover:text-white transition-colors">Empréstimo Consignado INSS</a></li>
                <li><a href="#credito" className="hover:text-white transition-colors">Portabilidade com Troco</a></li>
                <li><a href="#credito" className="hover:text-white transition-colors">Cartão Benefício</a></li>
                <li><a href="#credito" className="hover:text-white transition-colors">Servidores Públicos & SIAPE</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-white">Institucional</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#cultura" className="hover:text-white transition-colors">Nossa Cultura</a></li>
                <li><a href="#vagas" className="hover:text-white transition-colors">Trabalhe Conosco</a></li>
                <li><a href="#depoimentos" className="hover:text-white transition-colors">Depoimentos</a></li>
                <li><a href="https://www.instagram.com/acertofacilpromotora/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram Oficial</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-white">Atendimento & Endereço</h4>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Florianópolis - Santa Catarina, Brasil</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>contato@acertofacil.com.br</span>
              </p>
              <p className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>@acertofacilpromotora</span>
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 text-center space-y-3 text-[11px] text-slate-500">
            <p className="max-w-4xl mx-auto leading-relaxed">
              A Acerto Fácil não é uma instituição financeira e não realiza operações de crédito diretamente. Atuamos como correspondente bancário autorizado nos termos da Resolução nº 3.954 do Banco Central do Brasil. Não cobramos taxas antecipadas de nenhum cliente sob hipótese alguma.
            </p>
            <p>© {new Date().getFullYear()} Acerto Fácil Promotora de Crédito. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Botão Flutuante Fixo (Acompanha a rolagem da página) para retornar ao SharkConsig */}
      <Link
        href="/"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-full bg-slate-900/95 hover:bg-slate-950 text-white shadow-2xl border border-slate-700 hover:border-emerald-500 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 group cursor-pointer"
        title="Voltar para o sistema SharkConsig"
      >
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </div>
        <div className="flex flex-col text-left leading-tight pr-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Sistema Interno</span>
          <span className="text-xs font-extrabold tracking-tight text-white flex items-center gap-1">
            Voltar ao <span className="text-emerald-400 font-black">SharkConsig</span>
          </span>
        </div>
      </Link>

      {/* MODAL PÚBLICA DE SIMULAÇÃO DE CRÉDITO */}
      {isSimulacaoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6">
            <button
              onClick={() => setIsSimulacaoModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                Canal Direto
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Simulação de Crédito Rápida
              </h3>
              <p className="text-xs text-slate-500">
                Preencha seus dados para receber uma proposta personalizada dos nossos especialistas.
              </p>
            </div>

            <form onSubmit={handleSubmitSimulacao} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Nome Completo *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Seu nome completo"
                  value={simForm.nome}
                  onChange={(e) => setSimForm(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    CPF *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="000.000.000-00"
                    value={simForm.cpf}
                    onChange={(e) => setSimForm(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="(48) 99999-9999"
                    value={simForm.telefone}
                    onChange={(e) => setSimForm(prev => ({ ...prev, telefone: formatPhone(e.target.value) }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Convênio
                  </label>
                  <select
                    value={simForm.convenio}
                    onChange={(e) => setSimForm(prev => ({ ...prev, convenio: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="INSS">INSS (Aposentado/Pensionista)</option>
                    <option value="SIAPE">SIAPE (Servidor Federal)</option>
                    <option value="GOVERNO">Governo Estadual</option>
                    <option value="PREFEITURA">Prefeitura Municipal</option>
                    <option value="FGTS">Saque Aniversário FGTS</option>
                    <option value="OUTROS">Outros Convênios</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Operação Desejada
                  </label>
                  <select
                    value={simForm.tipo_operacao}
                    onChange={(e) => setSimForm(prev => ({ ...prev, tipo_operacao: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Novo Empréstimo">Novo Empréstimo</option>
                    <option value="Portabilidade com Troco">Portabilidade com Troco</option>
                    <option value="Cartão Benefício">Cartão Benefício</option>
                    <option value="Refinanciamento">Refinanciamento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Valor Aproximado Pretendido
                </label>
                <input
                  type="text"
                  placeholder="Ex: R$ 15.000,00"
                  value={simForm.valor_pretendido}
                  onChange={(e) => setSimForm(prev => ({ ...prev, valor_pretendido: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingSim}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSim ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando Simulação...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar e Receber Proposta
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PÚBLICA TRABALHE CONOSCO */}
      {isCandidaturaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCandidaturaModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                Banco de Talentos Acerto Fácil
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {selectedJob ? `Candidatura: ${selectedJob.titulo}` : "Trabalhe Conosco"}
              </h3>
              <p className="text-xs text-slate-500">
                Preencha seus dados para participar dos nossos processos seletivos.
              </p>
            </div>

            <form onSubmit={handleSubmitCandidatura} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Nome Completo *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Seu nome completo"
                  value={candForm.nome}
                  onChange={(e) => setCandForm(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    E-mail *
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={candForm.email}
                    onChange={(e) => setCandForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="(48) 99999-9999"
                    value={candForm.telefone}
                    onChange={(e) => setCandForm(prev => ({ ...prev, telefone: formatPhone(e.target.value) }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Vaga de Interesse *
                </label>
                <select
                  value={candForm.cargo_interesse}
                  onChange={(e) => setCandForm(prev => ({ ...prev, cargo_interesse: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Consultor Comercial de Crédito Consignado">Consultor Comercial de Crédito Consignado</option>
                  <option value="Operacional de Crédito & Formalização">Operacional de Crédito & Formalização</option>
                  <option value="Estágio em Atendimento Comercial">Estágio em Atendimento Comercial</option>
                  <option value="Supervisor Comercial">Supervisor Comercial</option>
                  <option value="Outras Áreas / Banco de Talentos">Outras Áreas / Banco de Talentos Geral</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Link do Perfil no LinkedIn ou Portfólio (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/seuperfil"
                  value={candForm.linkedin}
                  onChange={(e) => setCandForm(prev => ({ ...prev, linkedin: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Link do Currículo (Drive, Dropbox ou Nuvem)
                </label>
                <input
                  type="text"
                  placeholder="https://link-do-seu-curriculo.pdf"
                  value={candForm.curriculo_url}
                  onChange={(e) => setCandForm(prev => ({ ...prev, curriculo_url: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Fale um pouco sobre você e suas experiências
                </label>
                <textarea
                  rows={3}
                  placeholder="Conte-nos brevemente sobre sua trajetória e porque deseja trabalhar na Acerto Fácil..."
                  value={candForm.mensagem}
                  onChange={(e) => setCandForm(prev => ({ ...prev, mensagem: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingCand}
                  className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCand ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando Candidatura...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Minha Candidatura
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
