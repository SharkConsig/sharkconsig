"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { SidebarContext } from "@/context/sidebar-context"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/auth/login")
      } else {
        setIsLoading(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && event === 'INITIAL_SESSION')) {
        if (window.location.pathname !== '/auth/login') {
          setIsLoading(true)
          router.replace("/auth/login")
        }
      } else if (session) {
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verificando acesso...</p>
        </div>
      </div>
    )
  }

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
