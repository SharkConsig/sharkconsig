"use client"

import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { TicketAtendimento } from "@/components/tickets/ticket-atendimento"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"
import { Loader2, AlertCircle } from "lucide-react"

export default function TicketDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { perfil } = useAuth()
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTicket() {
      try {
        setLoading(true)
        setError(null)
        
        const parsedId = parseInt(id, 10)
        if (isNaN(parsedId)) {
          throw new Error("ID de chamado inválido")
        }

        const { data, error: fetchError } = await supabase
          .from('chamados')
          .select(`
            *,
            status_chamados:status_id (*)
          `)
          .eq('id', parsedId)
          .single()

        if (fetchError) {
          throw fetchError
        }

        if (!data) {
          throw new Error("Chamado não encontrado")
        }

        setTicket(data)
      } catch (err: any) {
        console.error("Erro ao carregar chamado:", err)
        setError(err.message || "Não foi possível carregar as informações do chamado.")
      } finally {
        setLoading(false)
      }
    }

    loadTicket()
  }, [id])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title={`CHAMADO #${id}`} />
        <main className="flex-1 p-6 bg-slate-50/50 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Carregando chamado...</span>
        </main>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title={`CHAMADO #${id}`} />
        <main className="flex-1 p-6 bg-slate-50/50 flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-full">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Erro ao carregar</h4>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">{error || "Chamado não encontrado"}</p>
          </div>
          <button 
            onClick={() => router.push('/chamados')}
            className="mt-2 h-9 px-6 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer"
          >
            Voltar para chamados
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title={`CHAMADO #${id}`} />
      
      <main className="flex-1 p-6 bg-slate-50/50">
        <div className="max-w-7xl mx-auto w-full">
          <TicketAtendimento 
            ticket={{
              id: ticket.id.toString(),
              client: ticket.cliente_nome,
              cpf: ticket.cliente_cpf,
              origin: ticket.origem,
              status_id: ticket.status_id,
              status_nome: ticket.status_chamados?.nome || ticket.status,
              descricao: ticket.descricao,
              description: ticket.descricao,
              content: ticket.content,
              createdAt: ticket.created_at,
              user_nome: ticket.user_nome,
              user_id: ticket.user_id,
              user_avatar: ticket.user_avatar,
              matricula: ticket.matricula,
              phone: ticket.cliente_telefone,
              phone_2: ticket.cliente_telefone_2,
              phone_3: ticket.cliente_telefone_3,
              arquivo_rg_frente: ticket.arquivo_rg_frente,
              arquivo_rg_verso: ticket.arquivo_rg_verso,
              arquivo_contracheque: ticket.arquivo_contracheque,
              arquivo_extrato: ticket.arquivo_extrato,
              arquivo_outros: ticket.arquivo_outros
            }} 
            onMessageSent={() => {
              // Recarregar se necessário
            }}
          />
        </div>
      </main>
    </div>
  )
}
