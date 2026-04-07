"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"

interface Corretor {
  id: string
  nome: string
  email: string
}

export default function DistribuirCampanhaPage() {
  const router = useRouter()
  const { id } = useParams()
  const { isAdmin } = useAuth()
  
  const [campanha, setCampanha] = useState<any>(null)
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [selectedCorretores, setSelectedCorretores] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDistributing, setIsDistributing] = useState(false)
  const [totalLeads, setTotalLeads] = useState(0)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (!isAdmin && !isLoading) {
      window.location.href = '/'
      return
    }

    const fetchData = async () => {
      // 1. Buscar Campanha
      const { data: camp } = await supabase.from('campanhas').select('*').eq('id', id).single()
      setCampanha(camp)

      // 2. Buscar Corretores
      const { data: perfs } = await supabase.from('perfis').select('*').eq('role', 'corretor')
      setCorretores(perfs || [])

      // 3. Estimar Leads (Simulação baseada nos filtros da campanha)
      // Aqui você usaria a mesma lógica de filtros da campanha para contar os clientes
      setTotalLeads(camp?.publico_estimado || 0)
      
      setIsLoading(false)
    }

    fetchData()
  }, [id, isAdmin, isLoading])

  const handleToggleCorretor = (id: string) => {
    setSelectedCorretores(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleDistribuir = async () => {
    if (selectedCorretores.length === 0) {
      setMessage({ type: 'error', text: 'Selecione ao menos um corretor.' })
      return
    }

    setIsDistributing(true)
    setMessage(null)

    try {
      // 1. Buscar todos os CPFs que batem com os filtros da campanha
      // Para este exemplo, vamos buscar os clientes e distribuir
      // Em um cenário real, você aplicaria os filtros da campanha aqui
      const { data: clientes } = await supabase.from('clientes').select('cpf').limit(totalLeads)
      
      if (!clientes || clientes.length === 0) {
        throw new Error("Nenhum cliente encontrado para distribuir.")
      }

      const leadsPerCorretor = Math.floor(clientes.length / selectedCorretores.length)
      const atribuicoes = []

      for (let i = 0; i < selectedCorretores.length; i++) {
        const corretorId = selectedCorretores[i]
        const start = i * leadsPerCorretor
        const end = i === selectedCorretores.length - 1 ? clientes.length : (i + 1) * leadsPerCorretor
        
        const chunk = clientes.slice(start, end)
        for (const cliente of chunk) {
          atribuicoes.push({
            campanha_id: id,
            corretor_id: corretorId,
            cliente_cpf: cliente.cpf,
            status: 'novo'
          })
        }
      }

      // Inserir em lotes para evitar erro de timeout
      const batchSize = 500
      for (let i = 0; i < atribuicoes.length; i += batchSize) {
        const batch = atribuicoes.slice(i, i + batchSize)
        const { error } = await supabase.from('atribuicoes_leads').upsert(batch, { onConflict: 'campanha_id,cliente_cpf' })
        if (error) throw error
      }

      setMessage({ type: 'success', text: `Distribuição concluída! ${atribuicoes.length} leads distribuídos.` })
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: 'Erro ao distribuir leads: ' + err.message })
    } finally {
      setIsDistributing(false)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex-1 flex flex-col">
      <Header title="DISTRIBUIR CAMPANHA" />
      
      <div className="p-8 max-w-[1000px] mx-auto w-full space-y-6">
        <Card className="card-shadow">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{campanha?.nome}</h2>
                <p className="text-slate-500 text-sm">Total de leads disponíveis: <span className="font-bold text-primary">{totalLeads}</span></p>
              </div>
              <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold">
                {selectedCorretores.length} Corretores Selecionados
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {corretores.map(corretor => (
                <div 
                  key={corretor.id}
                  onClick={() => handleToggleCorretor(corretor.id)}
                  className={cn(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between",
                    selectedCorretores.includes(corretor.id) 
                      ? "border-primary bg-primary/5" 
                      : "border-slate-100 bg-white hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{corretor.nome}</p>
                      <p className="text-xs text-slate-500">{corretor.email}</p>
                    </div>
                  </div>
                  {selectedCorretores.includes(corretor.id) && <CheckCircle2 className="text-primary w-5 h-5" />}
                </div>
              ))}
            </div>

            {message && (
              <div className={cn(
                "p-4 rounded-lg flex items-center gap-3",
                message.type === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              )}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="text-sm font-bold">{message.text}</p>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
              <Button 
                onClick={handleDistribuir} 
                disabled={isDistributing || selectedCorretores.length === 0}
                className="px-12"
              >
                {isDistributing ? <><Loader2 className="animate-spin mr-2" /> Distribuindo...</> : "Distribuir Leads"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}
