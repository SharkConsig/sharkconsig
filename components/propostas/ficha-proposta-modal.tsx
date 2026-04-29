"use client"

import { X, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"

import { format } from "date-fns"

interface FichaPropostaModalProps {
  isOpen: boolean
  onClose: () => void
  proposal: any
}

interface FieldProps {
  label: string
  value: string | number | null | undefined
  id: string
  className?: string
  onCopy: (text: string, id: string) => void
  isCopied: boolean
}

const Field = ({ label, value, id, className, onCopy, isCopied }: FieldProps) => {
  const displayValue = value === null || value === undefined ? "-" : value.toString();
  return (
    <div 
      className={cn(
        "p-3 space-y-1 group/field relative cursor-pointer hover:bg-slate-50 transition-all active:bg-slate-100", 
        className
      )}
      onClick={() => onCopy(displayValue, id)}
    >
      <p className="text-[9px] font-bold text-slate-400 uppercase select-none">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-slate-800">{displayValue}</p>
        {isCopied && (
          <span className="text-[8px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 animate-in fade-in zoom-in duration-200">
            COPIADO
          </span>
        )}
      </div>
    </div>
  )
}

export function FichaPropostaModal({ isOpen, onClose, proposal }: FichaPropostaModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!isOpen) return null

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error("Print failed:", e);
        document.execCommand('print', false);
      }
    }, 250);
  }

  const copyToClipboard = (text: string, fieldId: string) => {
    if (!text || text === "-") return
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
                <Field label="Operação" value={proposal.tipo_operacao} id="operacao" onCopy={copyToClipboard} isCopied={copiedField === "operacao"} />
                <Field label="Tabela" value="-" id="tabela" onCopy={copyToClipboard} isCopied={copiedField === "tabela"} />
                <Field label="Convênio" value={proposal.convenio} id="convenio" onCopy={copyToClipboard} isCopied={copiedField === "convenio"} />
                <Field label="Matrícula" value={proposal.matricula} id="matricula" onCopy={copyToClipboard} isCopied={copiedField === "matricula"} />
              </div>
            </div>

            {/* Section: Dados pessoais */}
            <div className="space-y-3">
              <div className="bg-slate-100 px-4 py-1.5 rounded-t-md border-x border-t border-slate-300">
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">Dados pessoais</h3>
              </div>
              <div className="border-x border-b border-slate-300 divide-y divide-slate-300">
                <div className="grid grid-cols-3 divide-x divide-slate-300">
                  <Field label="Nome" value={proposal.nome_cliente} id="nome" className="col-span-2" onCopy={copyToClipboard} isCopied={copiedField === "nome"} />
                  <Field label="CPF" value={proposal.cliente_cpf} id="cpf" onCopy={copyToClipboard} isCopied={copiedField === "cpf"} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <Field label="Email" value="-" id="email" onCopy={copyToClipboard} isCopied={copiedField === "email"} />
                  <Field label="Data Nascimento" value={proposal.data_nascimento ? format(new Date(proposal.data_nascimento), "dd/MM/yyyy") : "-"} id="data_nascimento" onCopy={copyToClipboard} isCopied={copiedField === "data_nascimento"} />
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-300">
                  <Field label="Identidade" value={proposal.identidade} id="identidade" onCopy={copyToClipboard} isCopied={copiedField === "identidade"} />
                  <Field label="Orgão Emissor" value={proposal.orgao_emissor} id="orgao_emissor" onCopy={copyToClipboard} isCopied={copiedField === "orgao_emissor"} />
                  <Field label="UF Emissão" value={proposal.uf_emissao} id="uf_emissao" onCopy={copyToClipboard} isCopied={copiedField === "uf_emissao"} />
                  <Field label="Emissão" value={proposal.data_emissao ? format(new Date(proposal.data_emissao), "dd/MM/yyyy") : "-"} id="emissao" onCopy={copyToClipboard} isCopied={copiedField === "emissao"} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <Field label="Naturalidade" value={proposal.naturalidade} id="naturalidade" onCopy={copyToClipboard} isCopied={copiedField === "naturalidade"} />
                  <Field label="UF Naturalidade" value={proposal.uf_naturalidade} id="uf_naturalidade" onCopy={copyToClipboard} isCopied={copiedField === "uf_naturalidade"} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <Field label="Nome do Pai" value={proposal.nome_pai} id="nome_pai" onCopy={copyToClipboard} isCopied={copiedField === "nome_pai"} />
                  <Field label="Nome da Mãe" value={proposal.nome_mae} id="nome_mae" onCopy={copyToClipboard} isCopied={copiedField === "nome_mae"} />
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-300">
                  <Field label="Endereço" value={proposal.endereco} id="endereco" className="col-span-3" onCopy={copyToClipboard} isCopied={copiedField === "endereco"} />
                  <Field label="Complemento" value={proposal.complemento} id="complemento" onCopy={copyToClipboard} isCopied={copiedField === "complemento"} />
                </div>
                <div className="grid grid-cols-6 divide-x divide-slate-300">
                  <Field label="UF" value={proposal.uf} id="uf_end" onCopy={copyToClipboard} isCopied={copiedField === "uf_end"} />
                  <Field label="Cidade" value={proposal.cidade} id="cidade" className="col-span-2" onCopy={copyToClipboard} isCopied={copiedField === "cidade"} />
                  <Field label="CEP" value={proposal.cep} id="cep" className="col-span-2" onCopy={copyToClipboard} isCopied={copiedField === "cep"} />
                  <Field label="Número" value={proposal.numero} id="numero" onCopy={copyToClipboard} isCopied={copiedField === "numero"} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <Field label="Telefones" value={`${proposal.tel_residencial_1 || ""} ${proposal.tel_residencial_2 || ""} ${proposal.tel_comercial || ""}`} id="telefones" onCopy={copyToClipboard} isCopied={copiedField === "telefones"} />
                  <Field label="Bairro" value={proposal.bairro} id="bairro" onCopy={copyToClipboard} isCopied={copiedField === "bairro"} />
                </div>
              </div>
            </div>

            {/* Section: Dados bancários */}
            <div className="space-y-3">
              <div className="bg-slate-100 px-4 py-1.5 rounded-t-md border-x border-t border-slate-300">
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">Dados bancários</h3>
              </div>
              <div className="grid grid-cols-6 border-x border-b border-slate-300 divide-x divide-slate-300">
                <Field label="Banco" value={proposal.banco_cliente} id="banco" className="col-span-2" onCopy={copyToClipboard} isCopied={copiedField === "banco"} />
                <Field label="Agência" value={proposal.agencia} id="agencia" onCopy={copyToClipboard} isCopied={copiedField === "agencia"} />
                <Field label="DV AG" value="-" id="dv_ag" onCopy={copyToClipboard} isCopied={copiedField === "dv_ag"} />
                <Field label="Nº Conta" value={proposal.conta} id="conta" onCopy={copyToClipboard} isCopied={copiedField === "conta"} />
                <Field label="DV" value={proposal.dv} id="dv_conta" onCopy={copyToClipboard} isCopied={copiedField === "dv_conta"} />
              </div>
              <div className="border-x border-b border-slate-300">
                <Field label="Tipo de Conta" value={proposal.tipo_conta} id="tipo_conta" onCopy={copyToClipboard} isCopied={copiedField === "tipo_conta"} />
              </div>
            </div>

            {/* Section: Dados da operação */}
            <div className="space-y-3">
              <div className="bg-slate-100 px-4 py-1.5 rounded-t-md border-x border-t border-slate-300">
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">Dados da operação</h3>
              </div>
              <div className="border-x border-b border-slate-300 divide-y divide-slate-300">
                <div className="grid grid-cols-5 divide-x divide-slate-300">
                  <Field label="Valor Parcela" value={proposal.valor_parcela ? `R$ ${proposal.valor_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00"} id="v_parcela" onCopy={copyToClipboard} isCopied={copiedField === "v_parcela"} />
                  <Field label="Prazo" value="-" id="prazo" onCopy={copyToClipboard} isCopied={copiedField === "prazo"} />
                  <Field label="Coeficiente" value={proposal.coeficiente_prazo} id="coeficiente" onCopy={copyToClipboard} isCopied={copiedField === "coeficiente"} />
                  <Field label="Valor Operação" value={proposal.valor_operacao_operacional ? `R$ ${proposal.valor_operacao_operacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00"} id="v_operacao" onCopy={copyToClipboard} isCopied={copiedField === "v_operacao"} />
                  <Field label="Valor Cliente" value={proposal.valor_cliente_operacional ? `R$ ${proposal.valor_cliente_operacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00"} id="v_liberado" onCopy={copyToClipboard} isCopied={copiedField === "v_liberado"} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <Field label="Banco Empréstimo" value={proposal.banco || "-"} id="banco_emp" onCopy={copyToClipboard} isCopied={copiedField === "banco_emp"} />
                  <Field label="PIX" value={proposal.chave_pix} id="pix" onCopy={copyToClipboard} isCopied={copiedField === "pix"} />
                </div>
                <Field label="Observações" value={proposal.observacoes || "Nenhuma observação registrada."} id="obs" onCopy={copyToClipboard} isCopied={copiedField === "obs"} />
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
