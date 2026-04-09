"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
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
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { useSidebar } from "@/context/sidebar-context"

import { useAuth } from "@/context/auth-context"

const menuItems = [
  {
    title: "GESTÃO DE CLIENTES",
    items: [
      { name: "IMPORTAR LOTE", href: "/importar", icon: FileUp, roles: ["admin"] },
      { name: "CRIAR CAMPANHA", href: "/campanhas/nova", icon: PlusCircle, roles: ["admin"] },
      { name: "MINHAS CAMPANHAS", href: "/campanhas", icon: Users, roles: ["admin"] },
      { name: "ACESSAR CLIENTE", href: "/", icon: Search, roles: ["admin", "corretor"] },
      { name: "ABRIR CHAMADO", href: "/chamados/novo", icon: MessageSquarePlus, roles: ["admin", "corretor"] },
      { name: "CHAMADOS ABERTOS", href: "/chamados", icon: MessageSquareText, roles: ["admin", "corretor"] },
      { name: "DIGITAR PROPOSTA", href: "/propostas/nova", icon: FileEdit, roles: ["admin", "corretor"] },
      { name: "LISTA DE PROPOSTAS", href: "/propostas", icon: ClipboardList, roles: ["admin", "corretor"] },
      { name: "GESTÃO DE USUÁRIOS", href: "/configuracoes/usuarios", icon: Users, roles: ["admin"] },
    ]
  }
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { isCollapsed, toggleCollapse } = useSidebar()
  const { isAdmin, isCorretor } = useAuth()

  const filteredMenuItems = menuItems.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // Se não estiver logado, não mostra nada
      if (!isAdmin && !isCorretor) return false
      
      // Admin vê tudo que tem role admin ou corretor
      if (isAdmin) return true
      
      // Corretor vê apenas o que tem role corretor
      if (isCorretor && item.roles.includes("corretor")) return true
      
      return false
    })
  }))

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "bg-sidebar border-r border-slate-200 flex flex-col h-screen transition-all duration-300 z-50 sidebar-shadow",
        "fixed inset-y-0 left-0 lg:sticky lg:top-0 lg:translate-x-0",
        isCollapsed ? "w-20" : "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className={cn(
          "p-6 flex items-center",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <Link href="/" className="flex items-center justify-start">
            <div className={cn(
              "relative transition-all duration-300",
              isCollapsed ? "w-10 h-10" : "w-[160px] h-10"
            )}>
              <Image 
                src={isCollapsed ? "/favicon.jpg" : "/logo.png"} 
                alt="SharkConsig Logo" 
                fill 
                className={cn(
                  "object-contain",
                  isCollapsed ? "object-center rounded-lg" : "object-left"
                )}
                referrerPolicy="no-referrer"
              />
            </div>
          </Link>
          {!isCollapsed && (
            <button 
              onClick={toggleCollapse}
              className="hidden lg:flex w-8 h-8 items-center justify-center bg-slate-50 rounded-lg text-slate-400 hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {isCollapsed && (
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
          {filteredMenuItems.map((section) => (
            <div key={section.title} className="mb-8">
              {!isCollapsed && (
                <h2 className="px-4 text-[10px] font-bold text-slate-400 tracking-widest mb-4">
                  {section.title}
                </h2>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      title={isCollapsed ? item.name : ""}
                      className={cn(
                        "flex items-center gap-3 rounded-lg text-[11px] font-semibold transition-all",
                        isCollapsed ? "justify-center p-3" : "px-4 py-3",
                        isActive 
                          ? "bg-primary text-white shadow-lg shadow-slate-200" 
                          : "text-slate-500 hover:bg-slate-50 hover:text-primary",
                        item.name === "CONFIGURAÇÕES" && !isCollapsed && "mt-6"
                      )}
                    >
                      <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive ? "text-white" : "text-primary")} />
                      {!isCollapsed && <span>{item.name}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {!isCollapsed && (
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
