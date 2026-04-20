"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { 
  ChevronLeft, 
  Calendar, 
  Save, 
  Bold,
  Italic,
  Underline,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Type,
  Link2,
  Image as ImageIcon,
  Paperclip
} from "lucide-react"

const convenios = [
  "FEDERAL",
  "FEDERAL CARTÃO BENEFÍCIO",
  "GOVERNO SP",
  "GOVERNO SP CARTÃO BENEFÍCIO"
]

const bancos = [
  "AMIGOZ", "BANCO BMG", "BANCO DIGIO SA.", 
  "BANCO DO BRASIL", "NEOCREDITO", 
  "BANCO PAULISTA", "BANCO SAFRA", "BARU FINANCEIRA", 
  "BRB - CRÉDITO, FINANCIAMENTO E INVESTIMENTO",
  "CAPITAL", "FUTURO PREVIDÊNCIA", "MEU CASHCARD", 
  "XNBANK"
]

const operacoes = [
  "CARTÃO C/ SAQUE", 
  "MARGEM LIVRE (NOVO)", 
  "CARTÃO COM SAQUE COMPLEMENTAR À VISTA"
]

function NewProposalForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [selection, setSelection] = useState({
    convenio: "",
    banco: "",
    operacao: ""
  })
  
  const [formData, setFormData] = useState({
    nome: searchParams.get("nome") || "",
    cpf: searchParams.get("cpf") || "",
    nascimento: searchParams.get("nascimento") || "",
    idLead: searchParams.get("idLead") || "",
    origem: searchParams.get("origem") || ""
  })

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const nextStep = () => setStep(prev => prev + 1)
  const prevStep = () => setStep(prev => prev - 1)

  const handleSelect = (key: string, value: string) => {
    setSelection(prev => ({ ...prev, [key]: value }))
    nextStep()
  }

  const renderStep1 = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
        ESCOLHA O <span className="text-slate-900 font-extrabold">CONVÊNIO</span> QUE SERÁ UTILIZADO NO CONTRATO
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {convenios.map(c => (
          <button
            key={c}
            onClick={() => handleSelect("convenio", c)}
            className="h-10 px-4 bg-[#E9EAEB] hover:bg-[#DDE0E2] border border-slate-200 rounded-lg text-[10px] font-black text-[#1A2B49] transition-all uppercase tracking-wider shadow-sm leading-tight"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-center gap-4 relative">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={prevStep}
          className="absolute left-0 text-slate-400 hover:text-primary font-bold text-[10px] uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          ESCOLHA O <span className="text-slate-900 font-extrabold">BANCO DE EMPRÉSTIMO</span> QUE SERÁ UTILIZADO NO CONTRATO
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {bancos.map(b => (
          <button
            key={b}
            onClick={() => handleSelect("banco", b)}
            className="h-11 px-6 bg-[#E9EAEB] hover:bg-[#DDE0E2] border border-slate-200 rounded-lg text-[11px] font-black text-[#1A2B49] transition-all uppercase tracking-wider leading-tight shadow-sm"
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-center gap-4 relative">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={prevStep}
          className="absolute left-0 text-slate-400 hover:text-primary font-bold text-[10px] uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          ESCOLHA O <span className="text-slate-900 font-extrabold">TIPO DE OPERAÇÃO</span> DESEJADO
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {operacoes.map(o => (
          <button
            key={o}
            onClick={() => handleSelect("operacao", o)}
            className="h-11 px-6 bg-[#E9EAEB] hover:bg-[#DDE0E2] border border-slate-200 rounded-lg text-[11px] font-black text-[#1A2B49] transition-all uppercase tracking-wider leading-tight shadow-sm"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={prevStep}
          className="self-start text-slate-400 hover:text-primary font-bold text-[10px] uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Alterar Seleção
        </Button>
        <div className="flex flex-wrap justify-center gap-2 md:gap-8 items-center bg-white py-4 px-8 rounded-2xl border border-slate-200 shadow-sm w-fit mx-auto">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Convênio</span>
            <span className="text-[11px] font-black text-[#1A2B49] uppercase">{selection.convenio}</span>
          </div>
          <div className="h-8 w-px bg-slate-100 hidden md:block" />
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Banco</span>
            <span className="text-[11px] font-black text-[#1A2B49] uppercase">{selection.banco}</span>
          </div>
          <div className="h-8 w-px bg-slate-100 hidden md:block" />
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Operação</span>
            <span className="text-[11px] font-black text-[#1A2B49] uppercase leading-tight text-center md:text-left max-w-[300px]">{selection.operacao}</span>
          </div>
        </div>
      </div>

      <Card className="card-shadow border border-slate-200 bg-white">
        <CardContent className="p-10 space-y-16">
          {/* Top Fields */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Lead</label>
              <Input 
                value={formData.idLead}
                onChange={(e) => handleFormChange("idLead", e.target.value)}
                className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origem do Cliente</label>
              <select 
                value={formData.origem}
                onChange={(e) => handleFormChange("origem", e.target.value)}
                className="w-full h-9 px-4 rounded-md border border-slate-100 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">Selecione</option>
                <option value="discador">DISCADOR</option>
                <option value="indicacao">INDICAÇÃO</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula <span className="text-red-500">*</span></label>
              <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="space-y-10">
            <h3 className="text-center text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">DADOS PESSOAIS</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPF</label>
                <Input 
                  value={formData.cpf}
                  onChange={(e) => handleFormChange("cpf", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome</label>
                <Input 
                  value={formData.nome}
                  onChange={(e) => handleFormChange("nome", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data de Nascimento</label>
                <div className="relative">
                  <Input 
                    value={formData.nascimento}
                    onChange={(e) => handleFormChange("nascimento", e.target.value)}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors pr-10" 
                  />
                  <Calendar className="absolute right-3 top-2 w-5 h-5 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Naturalidade</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UF Naturalidade</label>
                <select className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors">
                  <option>Selecione</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identidade</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão Emissor</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UF Emissão</label>
                <select className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors">
                  <option>Selecione</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data de Emissão</label>
                <div className="relative">
                  <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors pr-10" />
                  <Calendar className="absolute right-3 top-2 w-5 h-5 text-slate-400" />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome do Pai</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome da Mãe</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone Residencial</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone Residencial</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone Comercial</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CEP</label>
                <div className="flex gap-2">
                  <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
                  <button className="text-[10px] font-bold text-primary italic whitespace-nowrap hover:underline">Buscar CEP</button>
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Endereço</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Número</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complemento</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bairro</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cidade</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UF</label>
                <select className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors">
                  <option>Selecione</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dados Bancários */}
          <div className="space-y-10">
            <h3 className="text-center text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">DADOS BANCÁRIOS</h3>
            
            {/* Primeira linha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Banco</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CHAVE PIX</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
            </div>

            {/* Segunda linha */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conta</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agência</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DV</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Conta</label>
                <select className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors">
                  <option value="">Selecione</option>
                  <option value="corrente">CORRENTE</option>
                  <option value="poupanca">POUPANÇA</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dados da Operação */}
          <div className="space-y-10">
            <h3 className="text-center text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">DADOS DA OPERAÇÃO</h3>
            
            {/* Operacional Box */}
            <div className="bg-[#FEFCE8] border border-amber-100 rounded-xl p-8 space-y-6">
              <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-900">Operacional:</span> Preencha os campos abaixo em caso de divergência nos valores informados pelo corretor do valores do banco. Salvar valor operacional atualizará somente os campos abaixo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parcela</label>
                  <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" placeholder="R$ 0,00" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Operação</label>
                  <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" placeholder="R$ 0,00" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Cliente</label>
                  <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" placeholder="R$ 0,00" />
                </div>
                <Button className="h-9 bg-[#1A2B49] hover:bg-[#1A2B49]/90 text-white w-12 p-0 shadow-lg shadow-slate-200">
                  <Save className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margem Utilizada</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" placeholder="R$ 0,00" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coeficiente e Prazo</label>
                <select className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors">
                  <option>Selecione</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parcela</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" placeholder="R$ 0,00" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Cliente</label>
                <Input className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" placeholder="R$ 0,00" />
              </div>
            </div>
          </div>

          {/* Outras Informações */}
          <div className="space-y-10">
            <h3 className="text-center text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">OUTRAS INFORMAÇÕES</h3>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observações</label>
              <div className="border border-slate-100 rounded-lg overflow-hidden focus-within:border-primary transition-colors">
                <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Bold className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Italic className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Underline className="w-3.5 h-3.5" /></Button>
                  <div className="w-px h-5 bg-slate-200 mx-0.5 self-center" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Quote className="w-4 h-4" /></Button>
                  <div className="w-px h-5 bg-slate-200 mx-0.5 self-center" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><AlignLeft className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><AlignCenter className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><AlignRight className="w-4 h-4" /></Button>
                  <div className="w-px h-5 bg-slate-200 mx-0.5 self-center" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><List className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><ListOrdered className="w-4 h-4" /></Button>
                  <div className="w-px h-5 bg-slate-200 mx-0.5 self-center" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Type className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Link2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><ImageIcon className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Paperclip className="w-4 h-4" /></Button>
                </div>
                <textarea 
                  className="w-full p-6 text-[14px] font-medium focus:outline-none min-h-[200px] bg-[#E8E8E8]" 
                  placeholder="Digite suas observações aqui..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-12">
            <Button 
              onClick={() => router.push("/propostas")}
              className="w-full max-w-md h-12 bg-primary text-white text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              CADASTRAR PROPOSTA
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col">
      <Header title="DIGITAR PROPOSTA" />
      
      <main className="flex-1 p-4 lg:p-8 bg-slate-50/50">
        <div className="max-w-[1400px] mx-auto w-full">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </main>
    </div>
  )
}

export default function NewProposalPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Carregando...</div>}>
      <NewProposalForm />
    </Suspense>
  )
}
