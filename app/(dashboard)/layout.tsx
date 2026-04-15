"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { SidebarContext } from "@/context/sidebar-context"
import { useAuth } from "@/context/auth-context"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isLoading: isAuthLoading } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/auth/login")
    }
  }, [user, isAuthLoading, router])

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarContext.Provider value={{ 
        toggleSidebar: () => setIsSidebarOpen(!isSidebarOpen),
        isCollapsed,
        toggleCollapse: () => setIsCollapsed(!isCollapsed)
      }}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </SidebarContext.Provider>
    </div>
  )
}
