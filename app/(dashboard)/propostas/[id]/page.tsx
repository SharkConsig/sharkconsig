"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { Loader2, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { ProposalDetailsAccordion } from "@/components/propostas/proposal-details-accordion"

export default function ProposalDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [proposal, setProposal] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProposal() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('propostas')
          .select('*')
          .eq('id_lead', id)
          .single()

        if (error) throw error
        setProposal(data)
      } catch (error) {
        console.error("Erro ao buscar proposta:", error)
        toast.error("Erro ao carregar detalhes da proposta")
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchProposal()
    }
  }, [id])

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50/30">
        <Header title="Carregando Proposta..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Buscando informações da proposta...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50/30">
        <Header title="Proposta não encontrada" />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <EyeOff className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800">Proposta não encontrada</h3>
              <p className="text-sm text-slate-500">Não conseguimos localizar a proposta com o ID informado.</p>
            </div>
            <Button 
              onClick={() => router.push('/propostas')}
              className="w-full h-11 bg-[#1A2B49] hover:bg-[#1A2B49]/90 text-white rounded-lg font-bold uppercase tracking-widest text-[11px]"
            >
              Voltar para Lista
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50/30">
      <Header title={`Proposta nº ${proposal.id_lead}`} />
      
      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/propostas')}
            className="text-slate-600 hover:text-slate-900 font-bold uppercase tracking-widest text-[10px]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Top Info Table summary */}
        <Card className="card-shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1A2B49] border-b border-slate-200">
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">ID</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">CPF</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Nome do Cliente</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Operação</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Banco/Convênio</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Sala/Comercial</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Situação Contrato</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Valor da Parcela</th>
                  <th className="px-4 py-3 text-[9px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Última Verificação</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{proposal.id_lead}</td>
                  <td className="px-4 py-3 text-[10px] font-medium text-slate-600">{proposal.cliente_cpf}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-700 uppercase">{proposal.nome_cliente}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{proposal.tipo_operacao}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{proposal.banco} / {proposal.convenio}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-400 leading-tight">ROBSON RAMOS</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500 leading-tight">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                      proposal.status === 'DIGITADO' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {proposal.status || "PENDENTE"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-900 whitespace-nowrap">
                    R$ {proposal.valor_parcela?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}
                  </td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-400">
                    {proposal.updated_at ? new Date(proposal.updated_at).toLocaleString('pt-BR') : "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Detailed accordion with tabs */}
        <ProposalDetailsAccordion proposal={proposal} />
      </main>
    </div>
  )
}

function EyeOff(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}
