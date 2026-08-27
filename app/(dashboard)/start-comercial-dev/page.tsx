"use client"

import React from "react"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/context/auth-context"
import { ShieldAlert, Loader2 } from "lucide-react"

export default function StartComercialDevPage() {
  const { perfil, user, isLoading } = useAuth()

  const isDev = perfil?.role === 'Desenvolvedor' || user?.user_metadata?.role === 'Desenvolvedor'

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/80">
        <Header title="START COMERCIAL" />
        <main className="flex-1 flex items-center justify-center p-6">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </main>
      </div>
    )
  }

  if (!isDev) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/80">
        <Header title="START COMERCIAL" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Acesso Restrito</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Esta área está em desenvolvimento e é visível exclusivamente para o perfil Desenvolvedor.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/80">
      <Header title="START COMERCIAL" />

      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Nova área em branco para o desenvolvimento do novo START COMERCIAL */}
      </main>
    </div>
  )
}
