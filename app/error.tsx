"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCcw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Erro na aplicação:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6 border border-slate-100">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Ops! Algo deu errado</h2>
          <p className="text-sm text-slate-500">
            Ocorreu um erro inesperado ao carregar esta página.
          </p>
          {error.message && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-left">
              <p className="text-[10px] font-mono text-slate-400 break-all">
                {error.message}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button 
            onClick={() => reset()}
            className="w-full h-11 font-bold uppercase tracking-widest"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = "/"}
            className="w-full h-11 font-bold uppercase tracking-widest border-slate-200 text-slate-600"
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  )
}
