import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-100 rounded-full"></div>
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin absolute top-0 left-0" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carregando...</p>
          <div className="flex gap-1 justify-center">
            <div className="w-1 h-1 bg-blue-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1 h-1 bg-blue-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1 h-1 bg-blue-300 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
