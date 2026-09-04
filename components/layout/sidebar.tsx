"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  FileUp, 
  PlusCircle, 
  Users, 
  Search,
  MessageSquarePlus,
  MessageSquareText,
  ClipboardList,
  FileEdit,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Settings,
  Rocket,
  Landmark,
  Calendar,
  Briefcase,
  Clock,
  History,
  AlertTriangle,
  GraduationCap,
  Calculator,
  Table
} from "lucide-react"
import { useSidebar } from "@/context/sidebar-context"

import { useAuth } from "@/context/auth-context"

const allMenuItems = [
  {
    title: "",
    items: [
      { 
        name: "COMECE AQUI", 
        href: "/start-comercial-dev", 
        icon: Rocket, 
        isSpecialStart: true,
        roles: ["Administrador", "Supervisor", "Operacional", "Corretor", "Monitoramento", "Estágio", "Desenvolvedor", "RH"] 
      },
      { 
        name: "TREINAMENTO", 
        href: "/treinamento", 
        icon: GraduationCap, 
        roles: ["Desenvolvedor"] 
      },
      { 
        name: "DASHBOARD", 
        href: "/", 
        icon: Landmark, 
        roles: ["Administrador", "Desenvolvedor", "Corretor", "Supervisor", "Operacional", "Estágio", "Recursos Humanos"] 
      },
      { 
        name: "ACESSAR CLIENTE", 
        href: "/pesquisa", 
        icon: Search, 
        roles: ["Administrador", "Desenvolvedor", "Corretor", "Supervisor", "Operacional", "Estágio"] 
      },
      { 
        name: "CALCULADORA", 
        href: "/calculadora", 
        icon: Calculator, 
        roles: ["Administrador", "Desenvolvedor", "Corretor", "Supervisor", "Operacional", "Estágio", "Monitoramento"] 
      },
      { 
        name: "IMPORTAR LOTE", 
        href: "/importar", 
        icon: FileUp, 
        roles: ["Administrador", "Desenvolvedor"] 
      }
    ]
  },
  {
    title: "CAMPANHA",
    items: [
      { 
        name: "CRIAR CAMPANHA", 
        href: "/campanhas/nova", 
        icon: PlusCircle, 
        roles: ["Administrador", "Desenvolvedor", "Operacional"] 
      },
      { 
        name: "CAMPANHAS", 
        href: "/campanhas", 
        icon: Users, 
        roles: ["Administrador", "Desenvolvedor", "Operacional"] 
      },
      { 
        name: "ACESSAR CAMPANHA", 
        href: "/campanhas/distribuicao", 
        icon: Users, 
        roles: ["Administrador", "Desenvolvedor", "Corretor", "Supervisor", "Operacional", "Estágio"] 
      }
    ]
  },
  {
    title: "CÉLULAS DE VENDAS",
    items: [
      { 
        name: "CÉLULAS DE VENDAS", 
        href: "/celulas-vendas", 
        icon: Users, 
        roles: ["Administrador", "Desenvolvedor"] 
      }
    ]
  },
  {
    title: "CHAMADOS",
    items: [
      { 
        name: "ABRIR CHAMADO", 
        href: "/chamados/novo", 
        icon: MessageSquarePlus, 
        roles: ["Administrador", "Desenvolvedor", "Corretor", "Supervisor", "Operacional", "Estágio"] 
      },
      { 
        name: "CHAMADOS", 
        href: "/chamados", 
        icon: MessageSquareText, 
        roles: ["Administrador", "Desenvolvedor", "Corretor", "Supervisor", "Operacional", "Estágio"] 
      }
    ]
  },
  {
    title: "PROPOSTAS",
    items: [
      { 
        name: "TABELAS DE COEFICIENTES", 
        href: "/propostas/tabelas", 
        icon: Table, 
        roles: ["Administrador", "Desenvolvedor", "Corretor", "Supervisor", "Operacional"] 
      },
      { 
        name: "DIGITAR PROPOSTA", 
        href: "/propostas/nova", 
        icon: FileEdit, 
        roles: ["Administrador", "Desenvolvedor", "Corretor", "Supervisor", "Operacional"] 
      },
      { 
        name: "PROPOSTAS", 
        href: "/propostas", 
        icon: ClipboardList, 
        roles: ["Administrador", "Desenvolvedor", "Corretor", "Supervisor", "Operacional"] 
      }
    ]
  },
  {
    title: "RECURSOS HUMANOS",
    items: [
      { 
        name: "ENTREVISTAS", 
        href: "/entrevistas", 
        icon: Calendar, 
        roles: ["Recursos Humanos", "Administrador", "Desenvolvedor"] 
      },
      { 
        name: "COLABORADORES", 
        href: "/colaboradores", 
        icon: Briefcase, 
        roles: ["Recursos Humanos", "Administrador", "Desenvolvedor"] 
      },
      { 
        name: "BANCO DE TALENTOS", 
        href: "/banco-talentos", 
        icon: ClipboardList, 
        roles: ["Recursos Humanos", "Administrador", "Desenvolvedor"] 
      },
      { 
        name: "GESTÃO DE USUÁRIOS", 
        href: "/configuracoes/usuarios", 
        icon: Users, 
        roles: ["Recursos Humanos", "Administrador", "Desenvolvedor"] 
      },
      { 
        name: "ADVERTÊNCIA", 
        href: "/advertencias", 
        icon: AlertTriangle, 
        roles: ["Recursos Humanos", "Administrador", "Desenvolvedor"] 
      },
      { 
        name: "TEMPO DE EMPRESA", 
        href: "/tempo-empresa", 
        icon: Clock, 
        roles: ["Recursos Humanos", "Administrador", "Desenvolvedor"] 
      },
      { 
        name: "CAPACITAÇÃO PJ", 
        href: "/capacitacao-pj", 
        icon: GraduationCap, 
        roles: ["Recursos Humanos", "Administrador", "Desenvolvedor"] 
      }
    ]
  },
  {
    title: "FINANCEIRO",
    items: [
      { 
        name: "CONTAS A PAGAR", 
        href: "/financeiro/contas-a-pagar", 
        icon: Landmark, 
        roles: ["Administrador", "Desenvolvedor"] 
      },
      { 
        name: "CONTAS A RECEBER", 
        href: "/financeiro/contas-a-receber", 
        icon: ClipboardList, 
        roles: ["Administrador", "Desenvolvedor"] 
      },
      { 
        name: "HISTÓRICO PAGAMENTOS PJ", 
        href: "/financeiro/historico-pagamentos-pj", 
        icon: History, 
        roles: ["Administrador", "Desenvolvedor"] 
      },
      { 
        name: "CONFIGURAÇÕES FINANCEIRAS", 
        href: "/financeiro/configuracoes", 
        icon: Settings, 
        roles: ["Administrador", "Desenvolvedor"] 
      }
    ]
  },
  {
    title: "",
    items: [
      { 
        name: "CONFIGURAÇÕES", 
        href: "/configuracoes", 
        icon: Settings, 
        roles: ["Administrador", "Desenvolvedor"] 
      }
    ]
  }
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const originParam = searchParams.get("origem")
  const isComeceAquiActive = pathname === "/capacitacao-pj" && originParam === "comece-aqui"
  const { isCollapsed, toggleCollapse, isHovered: contextHovered, setIsHovered: contextSetHovered } = useSidebar()
  const { perfil, user, isAdmin, isRecursosHumanos, isCorretor } = useAuth()
  const isHovered = contextHovered ?? false
  const setIsHovered = contextSetHovered ?? (() => {})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const isCampanhaAtendimento = pathname?.startsWith("/campanhas/atendimento/")
  const effectiveCollapsed = isCollapsed && !isHovered

  const isCollapsibleStyle = perfil?.role === 'Administrador' || perfil?.role === 'Desenvolvedor' || isAdmin

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }))
  }

  const regimeUpper = (perfil?.regime_contratacao || user?.user_metadata?.regime_contratacao || '').toUpperCase().trim()
  const isCorretorPJ = (perfil?.role === 'Corretor' || isCorretor) && regimeUpper === 'PJ' && !isAdmin

  const processedMenuItems = allMenuItems.map(section => {
    let items = section.items;

    if (section.title === "PROPOSTAS") {
      // Oculta o grupo PROPOSTAS para o acesso de Recursos Humanos
      if (isRecursosHumanos && !isAdmin) {
        return {
          title: "",
          items: []
        }
      }

      items = items.map(item => {
        if (item.href === "/propostas/tabelas") {
          return {
            ...item,
            name: "TABELAS DE COEFICIENTES"
          }
        }
        return item
      })
    }

    if (isCorretorPJ && section.title === "RECURSOS HUMANOS") {
      return {
        title: "",
        items: [
          ...items
            .filter(item => item.href === "/capacitacao-pj")
            .map(item => ({ ...item, name: "CAPACITAÇÃO" })),
          {
            name: "HISTÓRICO DE PAGAMENTOS",
            href: "/financeiro/historico-pagamentos-pj",
            icon: History,
            roles: ["Corretor", "Administrador", "Desenvolvedor"]
          }
        ]
      }
    }
    return { ...section, items }
  })

  const filteredMenuItems = processedMenuItems
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Se for o link COMECE AQUI, visível para todos os usuários do sistema
        if (item.name === "COMECE AQUI" || item.href === "/start-comercial-dev") {
          return true
        }

        // Se for o link de capacitação e for Corretor PJ, permite!
        if (item.href === "/capacitacao-pj" && isCorretorPJ) return true
        if (item.href === "/propostas/tabelas") return true

        // Se for admin via email (superadmin), vê tudo
        if (isAdmin) return true
        
        // Se tiver o perfil carregado, verifica a role
        if (perfil?.role) {
          const effectiveRole = 
            (perfil.role === 'Processo Seletivo' || perfil.role === 'PROCESSO SELETIVO') ? 'Corretor' : 
            (perfil.role === 'Monitoramento' || perfil.role === 'MONITORAMENTO') ? 'Operacional' : 
            perfil.role
          if (item.roles.includes(effectiveRole)) {
            return true
          }
        }
        
        return false
      })
    }))
    .filter(section => section.items.length > 0)

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[140] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside 
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "bg-sidebar border-r border-slate-200 flex flex-col h-screen transition-all duration-300 z-[150] sidebar-shadow",
          "fixed inset-y-0 left-0 lg:sticky lg:top-0 lg:translate-x-0",
          effectiveCollapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCampanhaAtendimento && "pointer-events-none opacity-40 cursor-not-allowed select-none"
        )}
      >
        <div className={cn(
          "p-6 flex items-center",
          effectiveCollapsed ? "justify-center" : "justify-between"
        )}>
          <Link href="/" className="flex items-center justify-start">
            <div className={cn(
              "relative transition-all duration-300",
              effectiveCollapsed ? "w-10 h-10" : "w-[160px] h-10"
            )}>
              <Image 
                src={effectiveCollapsed ? "/favicon.jpg" : "/logo.png"} 
                alt="SharkConsig Logo" 
                fill 
                className={cn(
                  "object-contain",
                  effectiveCollapsed ? "object-center rounded-lg" : "object-left"
                )}
                referrerPolicy="no-referrer"
              />
            </div>
          </Link>
          {!effectiveCollapsed && (
            <button 
              onClick={toggleCollapse}
              className="hidden lg:flex w-8 h-8 items-center justify-center bg-slate-50 rounded-lg text-slate-400 hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {effectiveCollapsed && (
          <div className="hidden lg:flex justify-center mb-4">
            <button 
              onClick={toggleCollapse}
              className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 hover:text-primary transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <nav className="flex-1 px-4 py-4 overflow-y-auto no-scrollbar">
          {filteredMenuItems.map((section, idx) => {
            const isCollapsed = !effectiveCollapsed && isCollapsibleStyle && section.title ? !expandedSections[section.title] : false
            return (
              <div key={section.title || `flat-${idx}`} className="mb-6">
                {!effectiveCollapsed && section.title && (
                  <div
                    onClick={() => isCollapsibleStyle && toggleSection(section.title)}
                    className={cn(
                      "flex items-center justify-between px-4 mb-3",
                      isCollapsibleStyle && "cursor-pointer select-none group"
                    )}
                  >
                    <h2 className={cn(
                      "text-[10px] font-bold text-slate-400 tracking-widest uppercase transition-colors",
                      isCollapsibleStyle && "group-hover:text-slate-600"
                    )}>
                      {section.title}
                    </h2>
                    {isCollapsibleStyle && (
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                          isCollapsed ? "-rotate-90 text-slate-400" : "rotate-0 text-slate-500"
                        )}
                      />
                    )}
                  </div>
                )}
                <div 
                  className={cn(
                    "space-y-1 overflow-hidden transition-all duration-300",
                    isCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[1000px] opacity-100"
                  )}
                >
                  {section.items.map((item) => {
                    const isComeceAqui = item.name === "COMECE AQUI" || item.href === "/start-comercial-dev"
                    const isActive = pathname === item.href

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={onClose}
                        title={effectiveCollapsed ? item.name : ""}
                        className={cn(
                          "flex items-center gap-3 rounded-lg text-[11px] font-semibold transition-all",
                          effectiveCollapsed ? "justify-center p-3" : "px-4 py-3",
                          isComeceAqui
                            ? "bg-[#19223D] text-white hover:bg-[#222e54] shadow-sm mb-2 font-bold"
                            : isActive 
                            ? "bg-primary text-white shadow-lg shadow-slate-200" 
                            : "text-slate-500 hover:bg-slate-50 hover:text-primary",
                          item.name === "CONFIGURAÇÕES" && !effectiveCollapsed && "mt-6"
                        )}
                      >
                        <item.icon 
                          className={cn(
                            "w-[18px] h-[18px] flex-shrink-0", 
                            isComeceAqui 
                              ? "text-[#009966]" 
                              : isActive 
                              ? "text-white" 
                              : "text-primary"
                          )} 
                        />
                        {!effectiveCollapsed && <span>{item.name}</span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {!effectiveCollapsed && (
          <div className="p-4 mt-auto">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[11px] font-bold text-slate-400 mb-1 uppercase">Versão</p>
              <p className="text-xs font-bold text-slate-700">v2.4.0-pro</p>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
