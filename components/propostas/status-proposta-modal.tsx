'use client'

import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Check, X } from "lucide-react"
import { useSidebar } from "@/context/sidebar-context"
import { cn } from "@/lib/utils"
// Importações removidas: Popover, Calendar, ptBR, format

interface StatusPropostaModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: {
    id_lead: string;
    status?: string;
    banco?: string;
    tipo_operacao?: string;
    ade?: string;
    obs_corretor?: string;
    obs_operacional?: string;
    [key: string]: string | number | undefined | null;
  } | null;
  onStatusUpdate: (proposalId: string, newStatus: string, ade?: string, obsCorretor?: string, obsOperacional?: string, customDate?: string) => Promise<void>;
}

export function StatusPropostaModal({ isOpen, onClose, proposal, onStatusUpdate }: StatusPropostaModalProps) {
  const { isCollapsed } = useSidebar()
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Novos estados para campos dinâmicos
  const [ade, setAde] = useState("")
  const [dataStatus, setDataStatus] = useState<string>(new Date().toISOString().split('T')[0])
  const [obsCorretor, setObsCorretor] = useState("")
  const [obsOperacional, setObsOperacional] = useState("")

  // Inicializar estados com dados da proposta quando a proposta mudar
  useEffect(() => {
    if (proposal) {
      // Tentar extrair dados do campo combinado se os campos específicos estiverem vazios
      let currentAde = proposal.ade || ""
      let currentObsCorretor = proposal.obs_corretor || ""
      let currentObsOperacional = proposal.obs_operacional || ""

      if (!currentAde || !currentObsCorretor || !currentObsOperacional) {
        if (proposal.observacoes) {
          const obs = proposal.observacoes as string
          const adeMatch = obs.match(/\[ADE\]: ([\s\S]*?)(?=\n\[CORRETOR\]|\n\[OPERACIONAL\]|$)/)
          const corretorMatch = obs.match(/\[CORRETOR\]: ([\s\S]*?)(?=\n\[OPERACIONAL\]|$)/)
          const operacionalMatch = obs.match(/\[OPERACIONAL\]: ([\s\S]*?)$/)

          if (adeMatch && !currentAde) currentAde = adeMatch[1].trim()
          if (corretorMatch && !currentObsCorretor) currentObsCorretor = corretorMatch[1].trim()
          if (operacionalMatch && !currentObsOperacional) currentObsOperacional = operacionalMatch[1].trim()
        }
      }

      setAde(currentAde)
      
      // Limpar campos de observação para nova entrada, conforme solicitado pelo usuário,
      // mas mantemos as variáveis extraídas para exibir no cabeçalho
      setObsCorretor("")
      setObsOperacional("")
      
      setSelectedStatus("")
    }
  }, [proposal])

  if (!proposal) return null

  // Preparar dados para exibição (mesclando colunas reais com extraídas)
  const displayAde = proposal.ade || (proposal.observacoes ? (proposal.observacoes as string).match(/\[ADE\]: ([\s\S]*?)(?=\n\[CORRETOR\]|\n\[OPERACIONAL\]|$)/)?.[1]?.trim() : null) || "-"
  const displayObsCorretor = proposal.obs_corretor || (proposal.observacoes ? (proposal.observacoes as string).match(/\[CORRETOR\]: ([\s\S]*?)(?=\n\[OPERACIONAL\]|$)/)?.[1]?.trim() : null)
  const displayObsOperacional = proposal.obs_operacional || (proposal.observacoes ? (proposal.observacoes as string).match(/\[OPERACIONAL\]: ([\s\S]*?)$/)?.[1]?.trim() : null)

  const handleUpdate = async () => {
    if (!selectedStatus) return
    setIsUpdating(true)
    
    // Mapeamento de IDs únicos para os status reais do banco
    const statusMapping: Record<string, string> = {
      "digitado": "ANDAMENTO / AGUARDANDO PAGAMENTO",
      "inconsistencia": "COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO",
      "cancelado-op": "CANCELADO",
      "pago-cliente": "PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA",
      "mantem-andamento": "ANDAMENTO / AGUARDANDO PAGAMENTO",
      "retigitada": "ANDAMENTO / AGUARDANDO PAGAMENTO",
      "inc-banco": "COM INCONSISTÊNCIA NO BANCO",
      "inc-banco-op": "COM INCONSISTÊNCIA NO BANCO AGUARDANDO OPERACIONAL",
      "inc-resolvida-banco": "COM INCONSISTÊNCIA NO BANCO AGUARDANDO OPERACIONAL",
      "solicitar-cancelamento-banco": "COM INCONSISTÊNCIA NO BANCO AGUARDANDO OPERACIONAL",
      "enviado-cip": "PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA",
      "desistencia": "CANCELADO",
      "digitado-inc": "ANDAMENTO / AGUARDANDO PAGAMENTO",
      "inconsistencia-inc": "COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO",
      "resolvida": "COM INCONSISTÊNCIA / AGUARDANDO OPERACIONAL",
      "cancelado-inc": "CANCELADO",
      "aguardando-inc": "AGUARDANDO DIGITAÇÃO OPERACIONAL",
      "aguardando": "AGUARDANDO DIGITAÇÃO OPERACIONAL",
      "cancelado": "CANCELADO",
      "pendencia-banco": "COM INCONSISTÊNCIA NO BANCO",
      "devolvido-banco": "PAGAMENTO DEVOLVIDO",
      "reapresentar-pagamento": "COM INCONSISTÊNCIA NO BANCO AGUARDANDO OPERACIONAL"
    }

    const finalStatus = statusMapping[selectedStatus] || selectedStatus

    try {
      await onStatusUpdate(proposal.id_lead, finalStatus, ade, obsCorretor, obsOperacional, dataStatus)
      onClose()
    } finally {
      setIsUpdating(false)
    }
  }

  const renderObservations = () => (
    <div className="ml-7 space-y-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-700 uppercase">Observações ao Corretor:</label>
        <textarea 
          value={obsCorretor}
          onChange={(e) => setObsCorretor(e.target.value)}
          placeholder="Digite a nova observação para o corretor..."
          className="w-full bg-white border border-slate-200 rounded-sm p-3 text-[11px] font-bold text-slate-600 focus:outline-none focus:border-primary/50 min-h-[80px] resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-700 uppercase">Observações ao Operacional:</label>
        <textarea 
          value={obsOperacional}
          onChange={(e) => setObsOperacional(e.target.value)}
          placeholder="Digite a nova observação para o operacional..."
          className="w-full bg-white border border-slate-200 rounded-sm p-3 text-[11px] font-bold text-slate-600 focus:outline-none focus:border-primary/50 min-h-[80px] resize-none"
        />
      </div>
    </div>
  )

  const renderAdeAndDate = () => (
    <div className="ml-7 space-y-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-700 uppercase">ADE:</label>
          <Input 
            value={ade}
            onChange={(e) => setAde(e.target.value)}
            className="h-9 border-slate-200 text-[11px] font-bold text-slate-600 focus-visible:ring-0"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-700 uppercase">Data Atualização:</label>
          <div className="relative">
            <Input 
              type="date"
              value={dataStatus}
              onChange={(e) => setDataStatus(e.target.value)}
              className="h-9 w-full px-3 border-slate-200 text-[11px] font-normal text-slate-600 focus-visible:ring-0 appearance-none"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderDateOnly = () => (
    <div className="ml-7 space-y-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="space-y-1.5 max-w-[200px]">
        <label className="text-[10px] font-bold text-slate-700 uppercase">Data do Pagamento:</label>
        <div className="relative">
          <Input 
            type="date"
            value={dataStatus}
            onChange={(e) => setDataStatus(e.target.value)}
            className="h-9 w-full px-3 border-slate-200 text-[11px] font-normal text-slate-600 focus-visible:ring-0 appearance-none"
          />
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "sm:max-w-[950px] max-h-[95vh] bg-white p-0 overflow-hidden border-none shadow-2xl transition-all duration-300 flex flex-col",
        isCollapsed ? "lg:ml-[40px]" : "lg:ml-[128px]"
      )}>
        <DialogHeader className="px-0 py-0 space-y-0">
          <div className="bg-white px-10 py-5 border-b border-slate-100">
            <DialogTitle className="text-[16px] font-bold text-slate-800 uppercase tracking-tight">
              ALTERAR STATUS DA PROPOSTA
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-8 py-6 space-y-10 custom-scrollbar">
          {/* Sessão Dados Gerais */}
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-[12px] font-bold text-[#00a6ed] uppercase tracking-wider">
                DADOS GERAIS DA PROPOSTA {String(proposal.id_lead)}
              </h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-[11px] font-bold text-slate-700 w-[180px] text-right mr-6 uppercase">SITUAÇÃO ATUAL:</span>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-[#f0544c] text-white text-[10px] font-bold uppercase tracking-tight">
                    {String(proposal.status || "Aguardando Digitação")}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-[11px] font-bold text-slate-700 w-[180px] text-right mr-6">BANCO:</span>
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">{proposal.banco || "-"}</span>
              </div>
              <div className="flex items-center">
                <span className="text-[11px] font-bold text-slate-700 w-[180px] text-right mr-6">TIPO OPERAÇÃO:</span>
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">{proposal.tipo_operacao || "-"}</span>
              </div>
              {(proposal.status === "AGUARDANDO DIGITAÇÃO OPERACIONAL" || proposal.status === "COM INCONSISTÊNCIA / AGUARDANDO OPERACIONAL" || proposal.status === "ANDAMENTO / AGUARDANDO PAGAMENTO") && (
                <div className="flex items-center">
                  <span className="text-[11px] font-bold text-slate-700 w-[180px] text-right mr-6">FORMALIZAÇÃO DIGITAL:</span>
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">SIM</span>
                </div>
              )}
              {proposal.status !== "AGUARDANDO DIGITAÇÃO OPERACIONAL" && 
               proposal.status !== "COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO" && 
               proposal.status !== "COM INCONSISTÊNCIA / AGUARDANDO OPERACIONAL" && 
               proposal.status !== "Aguardando Digitação" && (
                <div className="flex items-center">
                  <span className="text-[11px] font-bold text-slate-700 w-[180px] text-right mr-6">ADE:</span>
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">{String(displayAde)}</span>
                </div>
              )}
              
              {/* Observações Salvas exibidas na seção de Dados Gerais */}
              {(displayObsCorretor || displayObsOperacional) && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  {displayObsCorretor && (
                    <div className="flex items-start">
                      <span className="text-[11px] font-bold text-slate-700 w-[180px] text-right mr-6 uppercase">OBS. CORRETOR:</span>
                      <p className="text-[11px] text-slate-600 font-medium whitespace-pre-line bg-slate-50 p-2 rounded-sm flex-1 italic border border-slate-100 text-left">
                        &quot;{displayObsCorretor}&quot;
                      </p>
                    </div>
                  )}
                  {displayObsOperacional && (
                    <div className="flex items-start">
                      <span className="text-[11px] font-bold text-slate-700 w-[180px] text-right mr-6 uppercase">OBS. OPERACIONAL:</span>
                      <p className="text-[11px] text-slate-600 font-medium whitespace-pre-line bg-slate-50 p-2 rounded-sm flex-1 italic border border-slate-100 text-left">
                        &quot;{displayObsOperacional}&quot;
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {proposal.status === "COM INCONSISTÊNCIA / AGUARDANDO OPERACIONAL" && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 border-b border-slate-100 pb-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Motivo da Inconsistência</span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Data da Inconsistência</span>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-50 last:border-0">
                    <div className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                      VERIFICAR SE CLIENTE TEM OUTRO NÚMERO DE TELEFONE. POIS ESSE TA NO NAO PERTUBE NO PAULISTA
                    </div>
                    <div className="text-[10px] font-medium text-slate-400">
                      28/04/2026 às 09:32:51 por: 6411 - DAIANY HORSTMANN
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-50 last:border-0">
                    <div className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                      Incompleto-inconsistencia-resolvida: Inconsistência Resolvida
                    </div>
                    <div className="text-[10px] font-medium text-slate-400">
                      28/04/2026 às 09:20:46 por: 1981 - JORGE FABRÍCIO MARQUES SIQUEIRA
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sessão Ações */}
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-[12px] font-bold text-[#00a6ed] uppercase tracking-wider">
                AÇÕES DA ETAPA
              </h3>
            </div>
            
            <RadioGroup value={selectedStatus} onValueChange={setSelectedStatus} className="space-y-3">
              {proposal.status === "AGUARDANDO DIGITAÇÃO OPERACIONAL" ? (
                <>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="digitado" id="digitado" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="digitado" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        CONTRATO DIGITADO / AGUARDANDO FORMALIZAÇÃO DIGITAL
                      </Label>
                    </div>
                    {selectedStatus === "digitado" && (
                      <>
                        {renderAdeAndDate()}
                        {renderObservations()}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="inconsistencia" id="inconsistencia" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="inconsistencia" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO
                      </Label>
                    </div>
                    {selectedStatus === "inconsistencia" && renderObservations()}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="cancelado-op" id="cancelado-op" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="cancelado-op" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        CONTRATO CANCELADO
                      </Label>
                    </div>
                    {selectedStatus === "cancelado-op" && renderObservations()}
                  </div>
                </>
              ) : proposal.status === "ANDAMENTO / AGUARDANDO PAGAMENTO" ? (
                <>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="pago-cliente" id="pago-cliente" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="pago-cliente" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        PAGO AO CLIENTE
                      </Label>
                    </div>
                    {selectedStatus === "pago-cliente" && (
                      <>
                        {renderDateOnly()}
                        {renderObservations()}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="mantem-andamento" id="mantem-andamento" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="mantem-andamento" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        ANDAMENTO / AGUARDANDO PAGAMENTO
                      </Label>
                    </div>
                    {selectedStatus === "mantem-andamento" && renderObservations()}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="retigitada" id="retigitada" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="retigitada" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        PROPOSTA RETIGITADA
                      </Label>
                    </div>
                    {selectedStatus === "retigitada" && (
                      <>
                        {renderAdeAndDate()}
                        {renderObservations()}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="inc-banco" id="inc-banco" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="inc-banco" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        COM INCONSISTÊNCIA NO BANCO
                      </Label>
                    </div>
                    {selectedStatus === "inc-banco" && renderObservations()}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="inc-banco-op" id="inc-banco-op" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="inc-banco-op" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        COM INCONSISTÊNCIA NO BANCO - AGUARDANDO OPERACIONAL
                      </Label>
                    </div>
                    {selectedStatus === "inc-banco-op" && renderObservations()}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="devolvido-banco" id="devolvido-banco-1" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="devolvido-banco-1" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        PAGAMENTO DEVOLVIDO
                      </Label>
                    </div>
                    {selectedStatus === "devolvido-banco" && renderObservations()}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="desistencia" id="desistencia" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="desistencia" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        CONTRATOS CANCELADOS / COM DESISTÊNCIA
                      </Label>
                    </div>
                    {selectedStatus === "desistencia" && renderObservations()}
                  </div>
                </>
              ) : (proposal.status === "PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA" || proposal.status === "PÓS-VENDA REALIZADA") ? (
                <>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="devolvido-banco" id="devolvido-banco-2" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="devolvido-banco-2" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        PAGAMENTO DEVOLVIDO
                      </Label>
                    </div>
                    {selectedStatus === "devolvido-banco" && renderObservations()}
                  </div>
                </>
              ) : proposal.status === "COM INCONSISTÊNCIA NO BANCO" ? (
                <div className="space-y-4">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="inc-resolvida-banco" id="inc-resolvida-banco" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="inc-resolvida-banco" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        INCONSISTÊNCIA RESOLVIDA
                      </Label>
                    </div>
                    {selectedStatus === "inc-resolvida-banco" && renderObservations()}
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="solicitar-cancelamento-banco" id="solicitar-cancelamento-banco" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="solicitar-cancelamento-banco" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        SOLICITAR CANCELAMENTO
                      </Label>
                    </div>
                    {selectedStatus === "solicitar-cancelamento-banco" && renderObservations()}
                  </div>
                </div>
              ) : proposal.status === "COM INCONSISTÊNCIA NO BANCO AGUARDANDO OPERACIONAL" ? (
                <div className="space-y-4">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="pago-cliente" id="pago-cliente-op-stay" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="pago-cliente-op-stay" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        PAGO AO CLIENTE
                      </Label>
                    </div>
                    {selectedStatus === "pago-cliente" && (
                      <>
                        {renderDateOnly()}
                        {renderObservations()}
                      </>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="mantem-andamento" id="mantem-andamento-op-stay" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="mantem-andamento-op-stay" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        ANDAMENTO / AGUARDANDO PAGAMENTO
                      </Label>
                    </div>
                    {selectedStatus === "mantem-andamento" && renderObservations()}
                  </div>

                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="retigitada" id="retigitada-op-stay" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="retigitada-op-stay" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        PROPOSTA RETIGITADA
                      </Label>
                    </div>
                    {selectedStatus === "retigitada" && (
                      <>
                        {renderAdeAndDate()}
                        {renderObservations()}
                      </>
                    )}
                  </div>

                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="inc-banco" id="inc-banco-op-stay-opt" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="inc-banco-op-stay-opt" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        COM INCONSISTÊNCIA NO BANCO
                      </Label>
                    </div>
                    {selectedStatus === "inc-banco" && renderObservations()}
                  </div>

                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="inc-banco-op" id="inc-banco-op-stay-stay" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="inc-banco-op-stay-stay" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        COM INCONSISTÊNCIA NO BANCO - AGUARDANDO OPERACIONAL
                      </Label>
                    </div>
                    {selectedStatus === "inc-banco-op" && renderObservations()}
                  </div>

                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="devolvido-banco" id="devolvido-banco-op-stay" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="devolvido-banco-op-stay" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        PAGAMENTO DEVOLVIDO
                      </Label>
                    </div>
                    {selectedStatus === "devolvido-banco" && renderObservations()}
                  </div>

                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="desistencia" id="desistencia-op-stay" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="desistencia-op-stay" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        CONTRATOS CANCELADOS / COM DESISTÊNCIA
                      </Label>
                    </div>
                    {selectedStatus === "desistencia" && renderObservations()}
                  </div>
                </div>
              ) : proposal.status === "PAGAMENTO DEVOLVIDO" ? (
                <div className="space-y-4">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="reapresentar-pagamento" id="reapresentar-pagamento" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="reapresentar-pagamento" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        REAPRESENTAR PAGAMENTO
                      </Label>
                    </div>
                    {selectedStatus === "reapresentar-pagamento" && renderObservations()}
                  </div>
                </div>
              ) : (proposal.status === "COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO" || proposal.status === "COM INCONSISTÊNCIA / AGUARDANDO OPERACIONAL") ? (
                <div className="space-y-4">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="digitado-inc" id="digitado-inc" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="digitado-inc" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        CONTRATO DIGITADO / AGUARDANDO FORMALIZAÇÃO DIGITAL
                      </Label>
                    </div>
                    {selectedStatus === "digitado-inc" && (
                      <>
                        {renderAdeAndDate()}
                        {renderObservations()}
                      </>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="inconsistencia-inc" id="inconsistencia-inc" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="inconsistencia-inc" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO
                      </Label>
                    </div>
                    {selectedStatus === "inconsistencia-inc" && renderObservations()}
                  </div>

                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="resolvida" id="resolvida" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="resolvida" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        INCONSISTÊNCIA RESOLVIDA
                      </Label>
                    </div>
                    {selectedStatus === "resolvida" && renderObservations()}
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="cancelado-inc" id="cancelado-inc" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="cancelado-inc" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        CONTRATO CANCELADO
                      </Label>
                    </div>
                    {selectedStatus === "cancelado-inc" && renderObservations()}
                  </div>

                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="aguardando-inc" id="aguardando-inc" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="aguardando-inc" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        AGUARDANDO DIGITAÇÃO
                      </Label>
                    </div>
                    {selectedStatus === "aguardando-inc" && renderObservations()}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="aguardando" id="aguardando" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="aguardando" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        Aguardando Digitação
                      </Label>
                    </div>
                    {selectedStatus === "aguardando" && renderObservations()}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 group">
                      <RadioGroupItem value="cancelado" id="cancelado" className="text-[#00a6ed] border-slate-300" />
                      <Label htmlFor="cancelado" className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 cursor-pointer uppercase">
                        Contrato Cancelado
                      </Label>
                    </div>
                    {selectedStatus === "cancelado" && renderObservations()}
                  </div>
                </>
              )}
            </RadioGroup>
          </div>

        </div>

        <DialogFooter className="bg-white border-t border-slate-100 px-10 py-8 flex flex-row justify-center gap-4">
          <Button 
            onClick={handleUpdate}
            disabled={!selectedStatus || isUpdating}
            className="h-9 bg-[#171717] hover:bg-[#262626] text-white text-[12px] font-bold px-5 gap-2 rounded-sm border-0 shadow-md transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            ALTERAR STATUS
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="h-9 border-[#171717] border-[1.5px] text-slate-800 text-[12px] font-bold px-5 gap-2 rounded-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
            FECHAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
