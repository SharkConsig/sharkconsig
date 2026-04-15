"use client"

import { X, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface FichaPropostaModalProps {
  isOpen: boolean
  onClose: () => void
  proposal: any
}

interface FieldProps {
  label: string
  value: string
  id: string
  className?: string
  onCopy: (text: string, id: string) => void
  isCopied: boolean
}

const Field = ({ label, value, id, className, onCopy, isCopied }: FieldProps) => (
  <div 
    className={cn(
      "p-3 space-y-1 group/field relative cursor-pointer hover:bg-slate-50 transition-all active:bg-slate-100", 
      className
    )}
    onClick={() => onCopy(value, id)}
  >
    <p className="text-[9px] font-bold text-slate-400 uppercase select-none">{label}</p>
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] font-bold text-slate-800">{value}</p>
      {isCopied && (
        <span className="text-[8px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 animate-in fade-in zoom-in duration-200">
          COPIADO
        </span>
      )}
    </div>
  </div>
)

export function FichaPropostaModal({ isOpen, onClose, proposal }: FichaPropostaModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!isOpen) return null

  const handlePrint = () => {
    // Ensure the window is focused before printing
    window.focus();
    // Use a slightly longer timeout to ensure the browser has time to process the focus
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error("Print failed:", e);
        // Fallback for some environments
        document.execCommand('print', false);
      }
    }, 250);
  }

  const copyToClipboard = (text: string, fieldId: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 print:static print:bg-white print:p-0">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl flex flex-col print-content print:shadow-none print:max-h-none print:rounded-none print:w-full print:h-auto print:overflow-visible">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print-hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Ficha Proposta</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint}
              className="h-8 text-[10px] font-bold uppercase tracking-widest border-slate-200"
            >
              <Printer className="w-3.5 h-3.5 mr-2" />
              Imprimir
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 print:p-0">
          <div className="max-w-[800px] mx-auto space-y-6 print:max-w-none">
            
            {/* Section: Tipo de contrato */}
            <div className="space-y-3">
              <div className="bg-slate-100 px-4 py-1.5 rounded-t-md border-x border-t border-slate-300">
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">Tipo de contrato</h3>
              </div>
              <div className="grid grid-cols-4 border-x border-b border-slate-300 divide-x divide-slate-300">
                <Field label="Operação" value={proposal.operation || "Margem Livre (Novo)"} id="operacao" onCopy={copyToClipboard} isCopied={copiedField === "operacao"} />
                <Field label="Tabela" value="NOVO 1,85" id="tabela" onCopy={copyToClipboard} isCopied={copiedField === "tabela"} />
                <Field label="Convênio" value={proposal.bankAgreement || "INSS"} id="convenio" onCopy={copyToClipboard} isCopied={copiedField === "convenio"} />
                <Field label="Matrícula" value="227.572.801-0" id="matricula" onCopy={copyToClipboard} isCopied={copiedField === "matricula"} />
              </div>
            </div>

            {/* Section: Dados pessoais */}
            <div className="space-y-3">
              <div className="bg-slate-100 px-4 py-1.5 rounded-t-md border-x border-t border-slate-300">
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">Dados pessoais</h3>
              </div>
              <div className="border-x border-b border-slate-300 divide-y divide-slate-300">
                <div className="grid grid-cols-3 divide-x divide-slate-300">
                  <Field label="Nome" value={proposal.client} id="nome" className="col-span-2" onCopy={copyToClipboard} isCopied={copiedField === "nome"} />
                  <Field label="CPF" value={proposal.cpf} id="cpf" onCopy={copyToClipboard} isCopied={copiedField === "cpf"} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <Field label="Email" value="joelrodrigues4547@gmail.com" id="email" onCopy={copyToClipboard} isCopied={copiedField === "email"} />
                  <Field label="Data Nascimento" value="15/08/1958" id="data_nascimento" onCopy={copyToClipboard} isCopied={copiedField === "data_nascimento"} />
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-300">
                  <Field label="Identidade" value="4062638" id="identidade" onCopy={copyToClipboard} isCopied={copiedField === "identidade"} />
                  <Field label="Convênio Emissor" value="SSP SC" id="convenio_emissor" onCopy={copyToClipboard} isCopied={copiedField === "convenio_emissor"} />
                  <Field label="UF" value="SC" id="uf" onCopy={copyToClipboard} isCopied={copiedField === "uf"} />
                  <Field label="Emissão" value="28/09/2020" id="emissao" onCopy={copyToClipboard} isCopied={copiedField === "emissao"} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <Field label="Naturalidade" value="VARGEM" id="naturalidade" onCopy={copyToClipboard} isCopied={copiedField === "naturalidade"} />
                  <Field label="UF Naturalidade" value="SC" id="uf_naturalidade" onCopy={copyToClipboard} isCopied={copiedField === "uf_naturalidade"} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <Field label="Nome do Pai" value="JOAO BATISTA RODRIGUES" id="nome_pai" onCopy={copyToClipboard} isCopied={copiedField === "nome_pai"} />
                  <Field label="Nome da Mãe" value="MARIA JOAQUINA RIBEIRO" id="nome_mae" onCopy={copyToClipboard} isCopied={copiedField === "nome_mae"} />
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-300">
                  <Field label="Endereço" value="RUA HELENA KRAUSER DUARTE" id="endereco" className="col-span-3" onCopy={copyToClipboard} isCopied={copiedField === "endereco"} />
                  <Field label="Complemento" value="CASA" id="complemento" onCopy={copyToClipboard} isCopied={copiedField === "complemento"} />
                </div>
                <div className="grid grid-cols-6 divide-x divide-slate-300">
                  <Field label="UF" value="SC" id="uf_end" onCopy={copyToClipboard} isCopied={copiedField === "uf_end"} />
                  <Field label="Cidade" value="Palhoça" id="cidade" className="col-span-2" onCopy={copyToClipboard} isCopied={copiedField === "cidade"} />
                  <Field label="CEP" value="88138-157" id="cep" className="col-span-2" onCopy={copyToClipboard} isCopied={copiedField === "cep"} />
                  <Field label="Número" value="02" id="numero" onCopy={copyToClipboard} isCopied={copiedField === "numero"} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <Field label="Nacionalidade" value="Brasileira" id="nacionalidade" onCopy={copyToClipboard} isCopied={copiedField === "nacionalidade"} />
                  <Field label="Telefone Celular" value="(48) 98404-6286" id="celular" onCopy={copyToClipboard} isCopied={copiedField === "celular"} />
                </div>
              </div>
            </div>

            {/* Section: Dados bancários */}
            <div className="space-y-3">
              <div className="bg-slate-100 px-4 py-1.5 rounded-t-md border-x border-t border-slate-300">
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">Dados bancários</h3>
              </div>
              <div className="grid grid-cols-6 border-x border-b border-slate-300 divide-x divide-slate-300">
                <Field label="Banco" value="341 - BANCO ITAÚ" id="banco" className="col-span-2" onCopy={copyToClipboard} isCopied={copiedField === "banco"} />
                <Field label="Agência" value="6243" id="agencia" onCopy={copyToClipboard} isCopied={copiedField === "agencia"} />
                <Field label="DV AG" value="0" id="dv_ag" onCopy={copyToClipboard} isCopied={copiedField === "dv_ag"} />
                <Field label="Nº Conta" value="0465" id="conta" onCopy={copyToClipboard} isCopied={copiedField === "conta"} />
                <Field label="DV" value="9" id="dv_conta" onCopy={copyToClipboard} isCopied={copiedField === "dv_conta"} />
              </div>
              <div className="border-x border-b border-slate-300">
                <Field label="Tipo de Conta" value="CONTA CORRENTE" id="tipo_conta" onCopy={copyToClipboard} isCopied={copiedField === "tipo_conta"} />
              </div>
            </div>

            {/* Section: Dados da operação */}
            <div className="space-y-3">
              <div className="bg-slate-100 px-4 py-1.5 rounded-t-md border-x border-t border-slate-300">
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">Dados da operação</h3>
              </div>
              <div className="border-x border-b border-slate-300 divide-y divide-slate-300">
                <div className="grid grid-cols-5 divide-x divide-slate-300">
                  <Field label="Valor Parcela" value={`R$ ${proposal.installment}`} id="v_parcela" onCopy={copyToClipboard} isCopied={copiedField === "v_parcela"} />
                  <Field label="Prazo" value="96" id="prazo" onCopy={copyToClipboard} isCopied={copiedField === "prazo"} />
                  <Field label="Coeficiente" value="0,02350" id="coeficiente" onCopy={copyToClipboard} isCopied={copiedField === "coeficiente"} />
                  <Field label="Valor Operação" value="R$ 24.185,05" id="v_operacao" onCopy={copyToClipboard} isCopied={copiedField === "v_operacao"} />
                  <Field label="Valor Liberado" value="R$ 24.185,05" id="v_liberado" onCopy={copyToClipboard} isCopied={copiedField === "v_liberado"} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <Field label="Banco Empréstimo" value="335 - BANCO DIGIO S.A." id="banco_emp" onCopy={copyToClipboard} isCopied={copiedField === "banco_emp"} />
                  <Field label="Valor Negociado" value="R$ -" id="v_negociado" onCopy={copyToClipboard} isCopied={copiedField === "v_negociado"} />
                </div>
                <Field label="Observações" value={proposal.observations || "Nenhuma observação registrada."} id="obs" onCopy={copyToClipboard} isCopied={copiedField === "obs"} />
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50 print-hidden">
          <Button 
            onClick={onClose}
            className="h-9 px-8 text-[11px] font-bold uppercase tracking-widest bg-[#1A2B49] hover:bg-[#1A2B49]/90 text-white rounded-lg"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
