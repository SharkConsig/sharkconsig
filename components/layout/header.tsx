"use client"

import { ChevronDown, LogOut, Menu, MessageSquarePlus, MessageSquareText, ClipboardList, FileEdit, LifeBuoy, X } from "lucide-react"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useSidebar } from "@/context/sidebar-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

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
  const { toggleSidebar } = useSidebar()
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
    } | null
  }

  const [activeApoios, setActiveApoios] = useState<ApoioRequest[]>([])
  const [isApoioModalOpen, setIsApoioModalOpen] = useState(false)
  const [isResolvingId, setIsResolvingId] = useState<string | null>(null)

  const isSupervisorOrAbove = perfil?.role?.toLowerCase() === 'supervisor' || 
                               perfil?.role?.toLowerCase() === 'operacional' || 
                               perfil?.role?.toLowerCase() === 'admin' ||
                               perfil?.role?.toLowerCase() === 'supervisor/coordenador'

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
            cliente_nome
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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, isSupervisorOrAbove])

  const handleResolveApoio = async (chamadoId: number) => {
    if (!user || !perfil) return
    setIsResolvingId(chamadoId.toString())
    try {
      const { error } = await supabase
        .from('mensagens_chamado')
        .insert({
          chamado_id: chamadoId,
          user_id: user.id,
          user_nome: perfil.nome,
          user_role: perfil.role,
          user_avatar: perfil.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(perfil.nome)}&background=random`,
          content: 'Apoio na venda finalizado pelo supervisor.',
          action: 'resolveu_apoio'
        })

      if (error) throw error
      
      setActiveApoios(prev => prev.filter(a => a.chamado_id !== chamadoId))
      toast.success("Apoio na venda finalizado com sucesso!")
    } catch (err) {
      console.error("Erro ao resolver apoio:", err)
      toast.error("Erro ao finalizar apoio na venda.")
    } finally {
      setIsResolvingId(null)
    }
  }

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
    <header className="h-16 lg:h-20 border-b border-slate-200 bg-white px-4 lg:px-8 flex items-center justify-between sticky top-0 z-[100] header-shadow">
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
        {isSupervisorOrAbove && (
          <button
            onClick={() => setIsApoioModalOpen(true)}
            className="relative h-9 px-4 text-[10px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <LifeBuoy className="w-4 h-4" />
            Apoios Ativos
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

      {/* Modal de Solicitações de Apoio Ativas */}
      {isApoioModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-rose-600 animate-pulse" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Solicitações de Apoio Ativas</h3>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeApoios.map((apoio) => (
                    <div 
                      key={apoio.id} 
                      className="bg-white rounded-xl border border-rose-100 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 animate-in fade-in slide-in-from-bottom-2"
                    >
                      <div className="space-y-2">
                        {/* Broker info */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Corretor</span>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{apoio.user_nome}</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chamado</span>
                            <p className="text-xs font-black text-slate-700 uppercase">#{apoio.chamado_id}</p>
                          </div>
                        </div>

                        {/* Customer info */}
                        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Cliente</span>
                          <p className="text-[11px] font-black text-slate-700 uppercase truncate leading-none">
                            {apoio.chamados?.cliente_nome || "Não informado"}
                          </p>
                        </div>

                        {/* Impasse message */}
                        <div className="bg-rose-50/30 p-3 rounded-lg border border-rose-100/50">
                          <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest block mb-1">Mensagem de Impasse</span>
                          <p className="text-[11px] text-slate-600 font-semibold italic whitespace-pre-wrap leading-relaxed">
                            &ldquo;{apoio.content}&rdquo;
                          </p>
                        </div>
                      </div>

                      {/* Action button */}
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <Link 
                          href="/chamados" 
                          onClick={() => {
                            localStorage.setItem('expanded_ticket_id', apoio.chamado_id.toString())
                            setIsApoioModalOpen(false)
                          }}
                          className="flex-1"
                        >
                          <button className="w-full h-8 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer">
                            Ir para Chat
                          </button>
                        </Link>
                        <button
                          onClick={() => handleResolveApoio(apoio.chamado_id)}
                          disabled={isResolvingId === apoio.chamado_id.toString()}
                          className="flex-1 h-8 text-[10px] font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          {isResolvingId === apoio.chamado_id.toString() ? (
                            "Resolvendo..."
                          ) : (
                            "Resolver"
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
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
    </header>
  )
}
