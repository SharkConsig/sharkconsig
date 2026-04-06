"use client"

import { ChevronDown, LogOut, Menu, MessageSquarePlus, MessageSquareText, ClipboardList, FileEdit } from "lucide-react"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSidebar } from "@/context/sidebar-context"
import { supabase } from "@/lib/supabase"

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toggleSidebar } = useSidebar()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUserEmail(session?.user?.email || "Usuário")
    }
    getUser()
  }, [])

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
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <header className="h-16 lg:h-20 border-b border-slate-200 bg-white px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10 header-shadow">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-slate-400 hover:text-primary transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[250px] md:max-w-none">
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 mr-2">
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

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 sm:gap-3 pl-3 sm:pl-6 border-l border-slate-100 hover:opacity-80 transition-opacity"
          >
            <div className="text-right hidden xs:block">
              <p className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{userEmail}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase hidden sm:block">SharkConsig</p>
            </div>
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-50">
              <Image
                src="https://picsum.photos/seed/admin/100/100"
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
    </header>
  )
}
