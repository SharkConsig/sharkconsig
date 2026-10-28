"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Megaphone, 
  Sparkles, 
  Save, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Instagram, 
  Briefcase, 
  Star, 
  Image as ImageIcon, 
  Eye, 
  Check, 
  RotateCcw,
  Building2,
  TrendingUp,
  FileText
} from "lucide-react"
import { 
  SiteContent, 
  DEFAULT_SITE_CONTENT, 
  getLocalSiteContent, 
  saveLocalSiteContent,
  SiteJob,
  SiteTestimonial,
  SiteTeamPhoto
} from "@/lib/site-content"
import { toast } from "sonner"

export default function MarketingPage() {
  const { perfil, isAdmin, isDeveloper, isRecursosHumanos } = useAuth()
  const canAccess = isAdmin || isDeveloper || isRecursosHumanos ||
    perfil?.role === "Administrador" || perfil?.role === "Desenvolvedor" || perfil?.role === "Recursos Humanos"

  const [activeTab, setActiveTab] = useState<"hero" | "metricas" | "vagas" | "depoimentos" | "fotos" | "instagram">("hero")
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setContent(getLocalSiteContent())
  }, [])

  const handleSave = () => {
    setIsSaving(true)
    try {
      saveLocalSiteContent(content)
      toast.success("Conteúdo do site institucional atualizado com sucesso!")
    } catch (err) {
      toast.error("Erro ao salvar as configurações do site.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetDefaults = () => {
    if (!confirm("Deseja restaurar todos os textos e fotos para os padrões originais do sistema?")) return
    setContent(DEFAULT_SITE_CONTENT)
    saveLocalSiteContent(DEFAULT_SITE_CONTENT)
    toast.success("Conteúdo restaurado para o padrão original!")
  }

  // Funções de Vagas
  const handleAddJob = () => {
    const newJob: SiteJob = {
      id: `vaga-${Date.now()}`,
      titulo: "Novo Cargo Comercial",
      area: "Comercial / Vendas",
      local: "Florianópolis / SC (Presencial)",
      tipo: "Tempo Integral",
      descricao: "Descrição detalhada da oportunidade...",
      requisitos: ["Boa comunicação", "Foco em metas"],
      ativo: true
    }
    setContent(prev => ({ ...prev, vagas: [newJob, ...prev.vagas] }))
  }

  const handleDeleteJob = (id: string) => {
    setContent(prev => ({ ...prev, vagas: prev.vagas.filter(v => v.id !== id) }))
  }

  // Funções de Depoimentos
  const handleAddTestimonial = () => {
    const newTestimonial: SiteTestimonial = {
      id: `dep-${Date.now()}`,
      nome: "Nome do Cliente ou Colaborador",
      perfil: "Aposentado INSS ou Consultor",
      tipo: "cliente",
      texto: "Excelente atendimento e taxas muito justas...",
      estrelas: 5
    }
    setContent(prev => ({ ...prev, depoimentos: [newTestimonial, ...prev.depoimentos] }))
  }

  const handleDeleteTestimonial = (id: string) => {
    setContent(prev => ({ ...prev, depoimentos: prev.depoimentos.filter(d => d.id !== id) }))
  }

  // Funções de Fotos da Equipe
  const handleAddTeamPhoto = () => {
    const newPhoto: SiteTeamPhoto = {
      id: `foto-${Date.now()}`,
      titulo: "Comemoração de Metas",
      url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
      categoria: "Equipe"
    }
    setContent(prev => ({ ...prev, fotosEquipe: [...prev.fotosEquipe, newPhoto] }))
  }

  const handleDeleteTeamPhoto = (id: string) => {
    setContent(prev => ({ ...prev, fotosEquipe: prev.fotosEquipe.filter(f => f.id !== id) }))
  }

  if (!canAccess) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <p className="text-slate-500 font-bold">Acesso restrito a Administradores, Desenvolvedores e Recursos Humanos.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 pb-16">
      <Header title="MARKETING - GESTÃO DO SITE INSTITUCIONAL" />

      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Banner Superior com Ações */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
              <Megaphone className="w-3.5 h-3.5" />
              Gestão de Conteúdo • Acerto Fácil
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Personalização do Site Público
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Altere os textos do Hero, números de credibilidade, vagas abertas do Trabalhe Conosco, fotos da equipe e posts do Instagram em tempo real sem alterar código-fonte.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/acerto-facil"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors border border-white/20"
            >
              <Eye className="w-3.5 h-3.5" />
              Ver Site ao Vivo
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider gap-2 h-10 px-5 rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </Button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "hero", label: "Hero & Textos Principais", icon: Sparkles },
            { id: "metricas", label: "Métricas & Credibilidade", icon: TrendingUp },
            { id: "vagas", label: "Vagas (Trabalhe Conosco)", icon: Briefcase },
            { id: "depoimentos", label: "Depoimentos & Provas", icon: Star },
            { id: "fotos", label: "Fotos da Equipe", icon: ImageIcon },
            { id: "instagram", label: "Feed do Instagram", icon: Instagram }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ABA: HERO & TEXTOS PRINCIPAIS */}
        {activeTab === "hero" && (
          <Card className="card-shadow border border-slate-200">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Cabeçalho e Apresentação de Entrada (Hero)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Badge Superior</label>
                  <Input
                    value={content.hero.badge}
                    onChange={(e) => setContent(prev => ({
                      ...prev,
                      hero: { ...prev.hero, badge: e.target.value }
                    }))}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Título Principal (H1)</label>
                  <Input
                    value={content.hero.titulo}
                    onChange={(e) => setContent(prev => ({
                      ...prev,
                      hero: { ...prev.hero, titulo: e.target.value }
                    }))}
                    className="h-10 text-xs font-bold"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subtítulo / Descrição</label>
                  <textarea
                    rows={3}
                    value={content.hero.subtitulo}
                    onChange={(e) => setContent(prev => ({
                      ...prev,
                      hero: { ...prev.hero, subtitulo: e.target.value }
                    }))}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Texto Botão 1 (Cliente Consignado)</label>
                  <Input
                    value={content.hero.ctaCliente}
                    onChange={(e) => setContent(prev => ({
                      ...prev,
                      hero: { ...prev.hero, ctaCliente: e.target.value }
                    }))}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Texto Botão 2 (Trabalhe Conosco)</label>
                  <Input
                    value={content.hero.ctaTrabalhe}
                    onChange={(e) => setContent(prev => ({
                      ...prev,
                      hero: { ...prev.hero, ctaTrabalhe: e.target.value }
                    }))}
                    className="h-10 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ABA: MÉTRICAS & CREDIBILIDADE */}
        {activeTab === "metricas" && (
          <Card className="card-shadow border border-slate-200">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Indicadores de Credibilidade e Prova Social
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Volume de Crédito Liberado</label>
                  <Input
                    value={content.metricas.creditoLiberado}
                    onChange={(e) => setContent(prev => ({
                      ...prev,
                      metricas: { ...prev.metricas, creditoLiberado: e.target.value }
                    }))}
                    className="h-10 text-xs font-black text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clientes Atendidos</label>
                  <Input
                    value={content.metricas.clientesAtendidos}
                    onChange={(e) => setContent(prev => ({
                      ...prev,
                      metricas: { ...prev.metricas, clientesAtendidos: e.target.value }
                    }))}
                    className="h-10 text-xs font-black text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avaliação Média</label>
                  <Input
                    value={content.metricas.notaGoogle}
                    onChange={(e) => setContent(prev => ({
                      ...prev,
                      metricas: { ...prev.metricas, notaGoogle: e.target.value }
                    }))}
                    className="h-10 text-xs font-black text-emerald-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Anos de Mercado</label>
                  <Input
                    value={content.metricas.anosMercado}
                    onChange={(e) => setContent(prev => ({
                      ...prev,
                      metricas: { ...prev.metricas, anosMercado: e.target.value }
                    }))}
                    className="h-10 text-xs font-black text-slate-900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ABA: VAGAS (TRABALHE CONOSCO) */}
        {activeTab === "vagas" && (
          <Card className="card-shadow border border-slate-200">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Vagas em Aberto no Site Institucional
                </h3>
                <Button
                  onClick={handleAddJob}
                  size="sm"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold uppercase gap-1.5 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Vaga
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {content.vagas.map((vaga, idx) => (
                  <div key={vaga.id} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                        Vaga #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={vaga.ativo}
                            onChange={(e) => {
                              const updated = content.vagas.map(v => v.id === vaga.id ? { ...v, ativo: e.target.checked } : v)
                              setContent(prev => ({ ...prev, vagas: updated }))
                            }}
                            className="accent-emerald-600 rounded"
                          />
                          {vaga.ativo ? "Publicada" : "Pausada"}
                        </label>
                        <button
                          onClick={() => handleDeleteJob(vaga.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Título da Vaga</label>
                        <Input
                          value={vaga.titulo}
                          onChange={(e) => {
                            const updated = content.vagas.map(v => v.id === vaga.id ? { ...v, titulo: e.target.value } : v)
                            setContent(prev => ({ ...prev, vagas: updated }))
                          }}
                          className="h-9 text-xs font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Área / Setor</label>
                          <Input
                            value={vaga.area}
                            onChange={(e) => {
                              const updated = content.vagas.map(v => v.id === vaga.id ? { ...v, area: e.target.value } : v)
                              setContent(prev => ({ ...prev, vagas: updated }))
                            }}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Modalidade / Tipo</label>
                          <Input
                            value={vaga.tipo}
                            onChange={(e) => {
                              const updated = content.vagas.map(v => v.id === vaga.id ? { ...v, tipo: e.target.value } : v)
                              setContent(prev => ({ ...prev, vagas: updated }))
                            }}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Descrição Breve</label>
                        <textarea
                          rows={2}
                          value={vaga.descricao}
                          onChange={(e) => {
                            const updated = content.vagas.map(v => v.id === vaga.id ? { ...v, descricao: e.target.value } : v)
                            setContent(prev => ({ ...prev, vagas: updated }))
                          }}
                          className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ABA: DEPOIMENTOS */}
        {activeTab === "depoimentos" && (
          <Card className="card-shadow border border-slate-200">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Depoimentos de Clientes e Colaboradores
                </h3>
                <Button
                  onClick={handleAddTestimonial}
                  size="sm"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold uppercase gap-1.5 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Depoimento
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {content.depoimentos.map((dep) => (
                  <div key={dep.id} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
                    <div className="flex justify-between items-center">
                      <select
                        value={dep.tipo}
                        onChange={(e) => {
                          const updated = content.depoimentos.map(d => d.id === dep.id ? { ...d, tipo: e.target.value as any } : d)
                          setContent(prev => ({ ...prev, depoimentos: updated }))
                        }}
                        className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-white border border-slate-200"
                      >
                        <option value="cliente">Depoimento de Cliente</option>
                        <option value="colaborador">Depoimento de Colaborador</option>
                      </select>
                      <button
                        onClick={() => handleDeleteTestimonial(dep.id)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Nome</label>
                        <Input
                          value={dep.nome}
                          onChange={(e) => {
                            const updated = content.depoimentos.map(d => d.id === dep.id ? { ...d, nome: e.target.value } : d)
                            setContent(prev => ({ ...prev, depoimentos: updated }))
                          }}
                          className="h-9 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Cargo / Identificação</label>
                        <Input
                          value={dep.perfil}
                          onChange={(e) => {
                            const updated = content.depoimentos.map(d => d.id === dep.id ? { ...d, perfil: e.target.value } : d)
                            setContent(prev => ({ ...prev, depoimentos: updated }))
                          }}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Depoimento</label>
                      <textarea
                        rows={3}
                        value={dep.texto}
                        onChange={(e) => {
                          const updated = content.depoimentos.map(d => d.id === dep.id ? { ...d, texto: e.target.value } : d)
                          setContent(prev => ({ ...prev, depoimentos: updated }))
                        }}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ABA: FOTOS DA EQUIPE */}
        {activeTab === "fotos" && (
          <Card className="card-shadow border border-slate-200">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Galeria de Fotos do Dia a Dia e Ambiente
                </h3>
                <Button
                  onClick={handleAddTeamPhoto}
                  size="sm"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold uppercase gap-1.5 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Foto
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {content.fotosEquipe.map((foto) => (
                  <div key={foto.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
                    <button
                      onClick={() => handleDeleteTeamPhoto(foto.id)}
                      className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 z-10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="h-40 rounded-xl overflow-hidden bg-slate-200 border border-slate-200">
                      <img src={foto.url} alt={foto.titulo} className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Título da Foto"
                        value={foto.titulo}
                        onChange={(e) => {
                          const updated = content.fotosEquipe.map(f => f.id === foto.id ? { ...f, titulo: e.target.value } : f)
                          setContent(prev => ({ ...prev, fotosEquipe: updated }))
                        }}
                        className="h-8 text-xs font-bold"
                      />
                      <Input
                        placeholder="URL da Imagem"
                        value={foto.url}
                        onChange={(e) => {
                          const updated = content.fotosEquipe.map(f => f.id === foto.id ? { ...f, url: e.target.value } : f)
                          setContent(prev => ({ ...prev, fotosEquipe: updated }))
                        }}
                        className="h-8 text-[11px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ABA: FEED DO INSTAGRAM */}
        {activeTab === "instagram" && (
          <Card className="card-shadow border border-slate-200">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Configuração do Feed do Instagram Oficial (@acertofacilpromotora)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Handle Oficial</label>
                  <Input
                    value={content.instagram.handle}
                    onChange={(e) => setContent(prev => ({
                      ...prev,
                      instagram: { ...prev.instagram, handle: e.target.value }
                    }))}
                    className="h-10 text-xs font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Link do Perfil</label>
                  <Input
                    value={content.instagram.url}
                    onChange={(e) => setContent(prev => ({
                      ...prev,
                      instagram: { ...prev.instagram, url: e.target.value }
                    }))}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Destaques do Feed</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {content.instagram.posts.map((post) => (
                    <div key={post.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="h-32 rounded-lg overflow-hidden bg-slate-200">
                        <img src={post.imagem} alt="Post" className="w-full h-full object-cover" />
                      </div>
                      <textarea
                        rows={2}
                        value={post.legenda}
                        onChange={(e) => {
                          const updated = content.instagram.posts.map(p => p.id === post.id ? { ...p, legenda: e.target.value } : p)
                          setContent(prev => ({
                            ...prev,
                            instagram: { ...prev.instagram, posts: updated }
                          }))
                        }}
                        className="w-full p-2 text-xs rounded border border-slate-200 bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rodapé de Ações de Restauração */}
        <div className="flex justify-between items-center pt-4 text-xs text-slate-500">
          <Button
            variant="ghost"
            onClick={handleResetDefaults}
            className="text-slate-400 hover:text-rose-600 gap-1.5 text-xs font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão do Sistema
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider gap-2 px-6 h-10 rounded-xl"
          >
            <Save className="w-4 h-4" />
            Salvar Alterações
          </Button>
        </div>
      </main>
    </div>
  )
}
