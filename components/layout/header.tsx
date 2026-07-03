"use client"

import { ChevronDown, LogOut, Menu, MessageSquarePlus, MessageSquareText, ClipboardList, FileEdit, LifeBuoy, X } from "lucide-react"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useSidebar } from "@/context/sidebar-context"
import { supabase } from "@/lib/supabase"

interface HeaderProps {
  title: string
}

import { useAuth } from "@/context/auth-context"

export function Header({ title }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isCampanhaAtendimento = pathname?.startsWith("/campanhas/atendimento/")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { toggleSidebar, isCollapsed, isHovered } = useSidebar()
  const effectiveCollapsed = isCollapsed && !isHovered
  const { perfil, user, isAdmin, isRecursosHumanos } = useAuth()

  // Apoio na Venda States
  interface ApoioRequest {
    id: string
    chamado_id: number
    user_nome: string
    content: string
    action: string
    created_at: string
    chamados: {
      id: number
      cliente_nome: string | null
      margem: string | number | null
      margem_liquida_5: string | number | null
      margem_beneficio_5: string | number | null
    } | null
  }

  const [activeApoios, setActiveApoios] = useState<ApoioRequest[]>([])
  const [isApoioModalOpen, setIsApoioModalOpen] = useState(false)

  // Histórico de Apoio para Admin
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyApoios, setHistoryApoios] = useState<(ApoioRequest & { is_resolved?: boolean })[]>([])
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [filterEndDate, setFilterEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const isSupervisorOrAbove = perfil?.role?.toLowerCase() === 'supervisor' || 
                               perfil?.role?.toLowerCase() === 'admin' ||
                               perfil?.role?.toLowerCase() === 'supervisor/coordenador' ||
                               perfil?.role?.toLowerCase() === 'desenvolvedor' ||
                               perfil?.role?.toLowerCase() === 'dev' ||
                               perfil?.role?.toLowerCase() === 'administrador'

  const showApoioBtn = perfil?.role?.toLowerCase() === 'supervisor' || 
                        perfil?.role?.toLowerCase() === 'supervisor/coordenador' ||
                        perfil?.role?.toLowerCase() === 'desenvolvedor' ||
                        perfil?.role?.toLowerCase() === 'dev'

  const isAdminUser = perfil?.role?.toLowerCase() === 'admin' || isAdmin

  const fetchActiveApoios = async () => {
    try {
      const { data, error } = await supabase
        .from('mensagens_chamado')
        .select(`
          id,
          chamado_id,
          user_nome,
          content,
          action,
          created_at,
          chamados:chamado_id (
            id,
            cliente_nome,
            margem,
            margem_liquida_5,
            margem_beneficio_5
          )
        `)
        .in('action', ['pediu_apoio', 'resolveu_apoio'])
        .order('created_at', { ascending: true })

      if (error) {
        console.error("Erro ao buscar apoios:", error)
        return
      }

      const activeMap = new Map()
      if (data) {
        for (const msg of data) {
          if (msg.action === 'pediu_apoio') {
            activeMap.set(msg.chamado_id, msg)
          } else if (msg.action === 'resolveu_apoio') {
            activeMap.delete(msg.chamado_id)
          }
        }
      }
      setActiveApoios(Array.from(activeMap.values()))
    } catch (err) {
      console.error("Erro ao carregar apoios:", err)
    }
  }

  const fetchHistoryApoios = async () => {
    try {
      let query = supabase
        .from('mensagens_chamado')
        .select(`
          id,
          chamado_id,
          user_nome,
          content,
          action,
          created_at,
          chamados:chamado_id (
            id,
            cliente_nome,
            margem,
            margem_liquida_5,
            margem_beneficio_5
          )
        `)
        .in('action', ['pediu_apoio', 'resolveu_apoio'])

      if (filterStartDate) {
        query = query.gte('created_at', `${filterStartDate}T00:00:00`)
      }
      if (filterEndDate) {
        query = query.lte('created_at', `${filterEndDate}T23:59:59`)
      }

      const { data, error } = await query.order('created_at', { ascending: true })

      if (error) {
        console.error("Erro ao buscar histórico de apoios:", error)
        return
      }

      if (data) {
        const pedidos: (ApoioRequest & { is_resolved?: boolean })[] = []
        const resolveuMsgs = data.filter(msg => msg.action === 'resolveu_apoio')

        for (const msg of data) {
          if (msg.action === 'pediu_apoio') {
            const resolved = resolveuMsgs.some(r => r.chamado_id === msg.chamado_id && new Date(r.created_at) >= new Date(msg.created_at))
            const typedMsg = msg as unknown as ApoioRequest
            pedidos.push({
              ...typedMsg,
              is_resolved: resolved
            })
          }
        }

        pedidos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setHistoryApoios(pedidos)
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de apoios:", err)
    }
  }

  useEffect(() => {
    if (isHistoryModalOpen && isAdminUser) {
      fetchHistoryApoios()
    }
  }, [isHistoryModalOpen, filterStartDate, filterEndDate, isAdminUser])

  useEffect(() => {
    if (!isSupervisorOrAbove || !user) return

    fetchActiveApoios()

    const channel = supabase
      .channel('header_apoio_vendas')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensagens_chamado'
        },
        () => {
          fetchActiveApoios()
          if (isHistoryModalOpen && isAdminUser) {
            fetchHistoryApoios()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, isSupervisorOrAbove, isHistoryModalOpen, isAdminUser])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleLogout = async () => {
    // Se o usuário possuir ID, varrer campanhas para fechar qualquer sessão que tenha ficado aberta (seja qual for a página atual)
    if (user?.id) {
      try {
        const { data: activeCamps } = await supabase
          .from('campanhas')
          .select('id, filtros');
        
        if (activeCamps) {
          for (const campaign of activeCamps) {
            const sessao = campaign.filtros?.sessoes_corretores?.[user.id];
            const hasOpenSession = sessao && sessao.entrou && !sessao.saiu;
            
            if (hasOpenSession) {
              const nowIso = new Date().toISOString();
              // 1. Inserir registro de saída em campanha_atendimentos
              await supabase.from('campanha_atendimentos').insert({
                campanha_id: campaign.id,
                corretor_id: user.id,
                cliente_cpf: '00000000000',
                tabulacao: 'SAIU'
              });

              // 2. Atualizar filtros legado na tabela campanhas
              const currentSessoes = campaign.filtros?.sessoes_corretores || {};
              const updatedFiltros = {
                ...(campaign.filtros || {}),
                sessoes_corretores: {
                  ...currentSessoes,
                  [user.id]: {
                    ...(currentSessoes[user.id] || {}),
                    saiu: nowIso
                  }
                }
              };
              await supabase
                .from('campanhas')
                .update({ filtros: updatedFiltros })
                .eq('id', campaign.id);
            }
          }
        }
      } catch (exitErr) {
        console.error("Erro ao registrar saída das campanhas ativas no logout:", exitErr);
      }
    }

    // Limpa localmente primeiro para ser instantâneo e evitar problemas de rede
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
        sessionStorage.clear();
        // Limpa cookies do Supabase (padrão sb-...)
        document.cookie.split(";").forEach((c) => {
          const cookie = c.trim();
          if (cookie.startsWith('sb-')) {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          }
        });
      } catch (e) {
        console.warn("Erro ao limpar storage:", e);
      }
    }

    try {
      // Tenta avisar o Supabase em background, mas não espera a resposta
      // Isso evita que o erro de rede trave o redirecionamento
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } catch (error) {
      console.error("Erro ao chamar signOut:", error)
    } finally {
      // Redireciona imediatamente
      router.replace("/auth/login")
    }
  }

  return (
    <header className={`h-16 lg:h-20 border-b border-slate-200 bg-white px-4 lg:px-8 flex items-center justify-between sticky top-0 header-shadow transition-all duration-300 ${isApoioModalOpen || isHistoryModalOpen ? 'z-[210]' : 'z-[100]'}`}>
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          disabled={isCampanhaAtendimento}
          className={`lg:hidden p-2 text-slate-400 hover:text-primary transition-colors ${
            isCampanhaAtendimento ? "pointer-events-none opacity-40" : ""
          }`}
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[250px] md:max-w-none">
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {isAdminUser && (
          <button
            id="header-historico-apoio-btn"
            onClick={() => setIsHistoryModalOpen(true)}
            className="h-9 px-4 text-[10px] font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <LifeBuoy className="w-4 h-4 animate-pulse" />
            HISTÓRICO DE SOLICITAÇÃO DE APOIO
          </button>
        )}

        {showApoioBtn && (
          <button
            onClick={() => setIsApoioModalOpen(true)}
            className={`relative h-9 px-4 text-[10px] font-black uppercase tracking-widest ${
              activeApoios.length > 0 ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-400 hover:bg-slate-500'
            } text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer`}
          >
            <LifeBuoy className="w-4 h-4" />
            SOLICITAÇÕES DE APOIO
            {activeApoios.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-neutral-900 text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white shadow">
                {activeApoios.length}
              </span>
            )}
          </button>
        )}

        {!(isRecursosHumanos || perfil?.role === 'Recursos Humanos') && (
          <div className={`hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 mr-2 ${
            isCampanhaAtendimento ? "pointer-events-none opacity-40 cursor-not-allowed select-none" : ""
          }`}>
            <Link 
              href="/chamados/novo" 
              title="Abrir Chamado"
              className="p-2 text-blue-600 hover:bg-white hover:shadow-sm rounded-md transition-all"
            >
              <MessageSquarePlus className="w-[21px] h-[21px]" />
            </Link>
            <Link 
              href="/chamados" 
              title="Chamados Abertos"
              className="p-2 text-green-600 hover:bg-white hover:shadow-sm rounded-md transition-all"
            >
              <MessageSquareText className="w-[21px] h-[21px]" />
            </Link>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Link 
              href="/propostas/nova" 
              title="Digitar Proposta"
              className="p-2 text-amber-600 hover:bg-white hover:shadow-sm rounded-md transition-all"
            >
              <FileEdit className="w-[21px] h-[21px]" />
            </Link>
            <Link 
              href="/propostas" 
              title="Lista de Propostas"
              className="p-2 text-purple-600 hover:bg-white hover:shadow-sm rounded-md transition-all"
            >
              <ClipboardList className="w-[21px] h-[21px]" />
            </Link>
          </div>
        )}

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 sm:gap-3 pl-3 sm:pl-6 border-l border-slate-100 hover:opacity-80 transition-opacity"
          >
            <div className="text-right flex flex-col justify-center mr-2 min-w-[80px]">
              <p className="text-[11px] font-black text-slate-900 leading-tight truncate max-w-[150px] sm:max-w-[200px]">
                {perfil?.nome || user?.email || 'Usuário'}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                {perfil?.role || (isAdmin ? 'Administrador' : 'Corretor')}
              </p>
            </div>
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-50">
              <Image
                src={perfil?.avatar_url || `https://picsum.photos/seed/${perfil?.nome || 'user'}/100/100`}
                alt="User"
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-slate-100 shadow-xl py-2 z-50">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Solicitações de Apoio */}
      {isApoioModalOpen && (
        <div className={`fixed inset-y-0 right-0 z-[200] flex items-center justify-center bg-black/60 p-4 transition-all duration-300 animate-in fade-in duration-200 ${effectiveCollapsed ? "left-0 lg:left-20" : "left-0 lg:left-64"}`}>
          <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-rose-600 animate-pulse" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Solicitações de Apoio</h3>
              </div>
              <button 
                onClick={() => setIsApoioModalOpen(false)} 
                className="p-1 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/30">
              {activeApoios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <div className="p-3 bg-rose-50 text-rose-500 rounded-full">
                    <LifeBuoy className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Tudo sob controle</h4>
                    <p className="text-[11px] text-slate-400 font-bold max-w-xs uppercase">Nenhum corretor com atendimento travado no momento.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeApoios.map((apoio) => {
                    const formatDateTime = (dateStr: string) => {
                      try {
                        const d = new Date(dateStr);
                        return d.toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      } catch {
                        return dateStr;
                      }
                    };

                    return (
                      <div 
                        key={apoio.id} 
                        className="bg-white rounded-xl border border-rose-100 p-4 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2"
                      >
                        {/* Information Grid (Horizontal on Desktop - 12 Columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 flex-1 items-center">
                          
                          {/* ID / Chamado & Date/Time */}
                          <div className="space-y-1 lg:col-span-2">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Chamado</span>
                            <p className="text-xs font-black text-slate-700 uppercase leading-none">#{apoio.chamado_id}</p>
                            <span className="text-[10px] text-slate-900/70 font-bold block leading-none mt-1.5">
                              {formatDateTime(apoio.created_at)}
                            </span>
                          </div>

                          {/* Broker info */}
                          <div className="lg:col-span-2">
                            <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest block leading-none mb-1">Corretor</span>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{apoio.user_nome}</h4>
                          </div>

                          {/* Customer info */}
                          <div className="lg:col-span-3">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Cliente</span>
                            <p className="text-xs font-black text-slate-700 uppercase">
                              {apoio.chamados?.cliente_nome || "Não informado"}
                            </p>
                          </div>

                          {/* Margin info */}
                          <div className="lg:col-span-2">
                            <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest block leading-none mb-1">Margem</span>
                            <div className="text-xs font-black uppercase text-slate-700 flex flex-col gap-1">
                              {(() => {
                                const chamado = apoio.chamados
                                if (!chamado) return <span className="text-slate-400 font-bold">Não informada</span>
                                
                                const formatVal = (val: string | number | null | undefined) => {
                                  if (val === undefined || val === null) return 0
                                  const num = typeof val === 'string' ? parseFloat(val) : val
                                  return isNaN(num) ? 0 : num
                                }

                                const m = formatVal(chamado.margem)
                                const ml = formatVal(chamado.margem_liquida_5)
                                const mb = formatVal(chamado.margem_beneficio_5)

                                const items: React.ReactNode[] = []
                                if (m !== 0) {
                                  items.push(
                                    <div key="margem" className="flex flex-col">
                                      <span className="text-xs font-black text-slate-900 leading-tight">
                                        R$ {m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Margem</span>
                                    </div>
                                  )
                                }
                                if (ml !== 0) {
                                  items.push(
                                    <div key="liquida" className="flex flex-col">
                                      <span className="text-xs font-black text-blue-700 leading-tight">
                                        R$ {ml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest leading-none mt-0.5">Líq 5%</span>
                                    </div>
                                  )
                                }
                                if (mb !== 0) {
                                  items.push(
                                    <div key="beneficio" className="flex flex-col">
                                      <span className="text-xs font-black text-indigo-700 leading-tight">
                                        R$ {mb.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-0.5">Benefício 5%</span>
                                    </div>
                                  )
                                }

                                if (items.length === 0) {
                                  return <span className="text-slate-400 font-bold">R$ 0,00</span>
                                }

                                return <div className="space-y-1.5">{items}</div>
                              })()}
                            </div>
                          </div>

                          {/* Impasse message */}
                          <div className="bg-rose-50/40 p-2.5 rounded-lg border border-rose-100/50 max-w-full sm:col-span-2 lg:col-span-3">
                            <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest block mb-1">Mensagem</span>
                            <p className="text-[11px] text-slate-600 font-semibold italic whitespace-pre-wrap leading-snug">
                              &ldquo;{apoio.content}&rdquo;
                            </p>
                          </div>

                        </div>

                        {/* Action buttons (Right side) */}
                        <div className="flex items-center justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 lg:pl-6">
                          <Link 
                            href={`/chamados/${apoio.chamado_id}`} 
                            onClick={() => {
                              setIsApoioModalOpen(false)
                            }}
                          >
                            <button className="h-9 px-6 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer whitespace-nowrap">
                              Ir para o chamado
                            </button>
                          </Link>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setIsApoioModalOpen(false)}
                className="h-[34px] px-5 text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg transition-all cursor-pointer"
              >
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Solicitações de Apoio (Administrador) */}
      {isHistoryModalOpen && isAdminUser && (
        <div className={`fixed inset-y-0 right-0 z-[200] flex items-center justify-center bg-black/60 p-4 transition-all duration-300 animate-in fade-in duration-200 ${effectiveCollapsed ? "left-0 lg:left-20" : "left-0 lg:left-64"}`}>
          <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-violet-600 animate-pulse" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Histórico de Solicitações de Apoio</h3>
              </div>
              <button 
                id="close-historico-modal-x"
                onClick={() => setIsHistoryModalOpen(false)} 
                className="p-1 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Section */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/30 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Início:</span>
                <input 
                  id="filter-start-date-input"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="h-8 px-2 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fim:</span>
                <input 
                  id="filter-end-date-input"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="h-8 px-2 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <button
                id="filter-history-submit-btn"
                onClick={fetchHistoryApoios}
                className="h-8 px-4 text-[10px] font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all cursor-pointer shadow-sm"
              >
                Filtrar
              </button>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/30">
              {historyApoios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <div className="p-3 bg-violet-50 text-violet-500 rounded-full">
                    <LifeBuoy className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Sem registros</h4>
                    <p className="text-[11px] text-slate-400 font-bold max-w-xs uppercase">Nenhuma solicitação de apoio encontrada para o período selecionado.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {historyApoios.map((apoio) => {
                    const formatDateTime = (dateStr: string) => {
                      try {
                        const d = new Date(dateStr);
                        return d.toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      } catch {
                        return dateStr;
                      }
                    };

                    return (
                      <div 
                        key={apoio.id} 
                        className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 ${
                          apoio.is_resolved ? 'border-emerald-100 bg-emerald-50/10' : 'border-rose-100 bg-rose-50/10'
                        }`}
                      >
                        {/* Information Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 flex-1 items-center">
                          
                          {/* ID / Chamado & Date/Time */}
                          <div className="space-y-1 lg:col-span-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Chamado</span>
                              {apoio.is_resolved ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  Finalizado
                                </span>
                              ) : (
                                <span className="bg-rose-100 text-rose-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-black text-slate-700 uppercase leading-none mt-1">#{apoio.chamado_id}</p>
                            <span className="text-[10px] text-slate-900/70 font-bold block leading-none mt-1.5">
                              {formatDateTime(apoio.created_at)}
                            </span>
                          </div>

                          {/* Broker info */}
                          <div className="lg:col-span-2">
                            <span className="text-[8px] font-black text-violet-600 uppercase tracking-widest block leading-none mb-1">Corretor</span>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{apoio.user_nome}</h4>
                          </div>

                          {/* Customer info */}
                          <div className="lg:col-span-3">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Cliente</span>
                            <p className="text-xs font-black text-slate-700 uppercase">
                              {apoio.chamados?.cliente_nome || "Não informado"}
                            </p>
                          </div>

                          {/* Margin info */}
                          <div className="lg:col-span-2">
                            <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest block leading-none mb-1">Margem</span>
                            <div className="text-xs font-black uppercase text-slate-700 flex flex-col gap-1">
                              {(() => {
                                const chamado = apoio.chamados
                                if (!chamado) return <span className="text-slate-400 font-bold">Não informada</span>
                                
                                const formatVal = (val: string | number | null | undefined) => {
                                  if (val === undefined || val === null) return 0
                                  const num = typeof val === 'string' ? parseFloat(val) : val
                                  return isNaN(num) ? 0 : num
                                }

                                const m = formatVal(chamado.margem)
                                const ml = formatVal(chamado.margem_liquida_5)
                                const mb = formatVal(chamado.margem_beneficio_5)

                                const items: React.ReactNode[] = []
                                if (m !== 0) {
                                  items.push(
                                    <div key="margem" className="flex flex-col">
                                      <span className="text-xs font-black text-slate-900 leading-tight">
                                        R$ {m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Margem</span>
                                    </div>
                                  )
                                }
                                if (ml !== 0) {
                                  items.push(
                                    <div key="liquida" className="flex flex-col">
                                      <span className="text-xs font-black text-blue-700 leading-tight">
                                        R$ {ml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest leading-none mt-0.5">Líq 5%</span>
                                    </div>
                                  )
                                }
                                if (mb !== 0) {
                                  items.push(
                                    <div key="beneficio" className="flex flex-col">
                                      <span className="text-xs font-black text-indigo-700 leading-tight">
                                        R$ {mb.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-0.5">Benefício 5%</span>
                                    </div>
                                  )
                                }

                                if (items.length === 0) {
                                  return <span className="text-slate-400 font-bold">R$ 0,00</span>
                                }

                                return <div className="space-y-1.5">{items}</div>
                              })()}
                            </div>
                          </div>

                          {/* Impasse message */}
                          <div className={`p-2.5 rounded-lg border max-w-full sm:col-span-2 lg:col-span-3 ${
                            apoio.is_resolved ? 'bg-emerald-50/40 border-emerald-100/50' : 'bg-rose-50/40 border-rose-100/50'
                          }`}>
                            <span className="text-[8px] font-black text-violet-600 uppercase tracking-widest block mb-1">Mensagem</span>
                            <p className="text-[11px] text-slate-600 font-semibold italic whitespace-pre-wrap leading-snug">
                              &ldquo;{apoio.content}&rdquo;
                            </p>
                          </div>

                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 lg:pl-6">
                          <Link 
                            href={`/chamados/${apoio.chamado_id}`} 
                            onClick={() => {
                              setIsHistoryModalOpen(false)
                            }}
                          >
                            <button className="h-9 px-6 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer whitespace-nowrap">
                              Ir para o chamado
                            </button>
                          </Link>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                id="close-historico-modal-btn"
                onClick={() => setIsHistoryModalOpen(false)}
                className="h-[34px] px-5 text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg transition-all cursor-pointer"
              >
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
