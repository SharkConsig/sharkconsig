"use client"

import { useState, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { 
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
  Type as FontIcon,
  Paperclip
} from "lucide-react"
import { cn } from "@/lib/utils"

function NewTicketForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [description, setDescription] = useState("")
  const [formData, setFormData] = useState({
    origem: "",
    equipe: "ROBSON DE ALMEIDA FERNANDEZ RAMOS",
    nome: searchParams.get("nome") || "",
    cpf: searchParams.get("cpf") || "",
    tel1: searchParams.get("tel1") || "",
    tel2: searchParams.get("tel2") || "",
    tel3: searchParams.get("tel3") || "",
    margem: searchParams.get("margem") || "",
    convenio: searchParams.get("convenio") || ""
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = () => {
    // Here we would normally save the ticket data
    router.push("/chamados")
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="ABRIR CHAMADO" />
      
      <main className="flex-1 p-6 bg-slate-50/50">
        <Card className="card-shadow border border-slate-200 overflow-hidden">
          <CardContent className="p-4 sm:p-8">
            <div className="mb-6">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                Chamado nº <span className="text-slate-900 font-bold text-lg ml-2 normal-case tracking-normal">34559</span>
              </p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
              <div className="flex flex-col gap-6 flex-1 w-full max-w-4xl">
                {/* Row 1: Origem and Equipe */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Origem do Cliente <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={formData.origem}
                      onChange={(e) => handleInputChange("origem", e.target.value)}
                      className="w-full h-[34px] px-3 rounded-lg border border-slate-100 bg-white text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    >
                      <option value="">Selecione</option>
                      <option value="discador">DISCADOR</option>
                      <option value="indicacao">INDICAÇÃO</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      EQUIPE COMERCIAL <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={formData.equipe}
                      onChange={(e) => handleInputChange("equipe", e.target.value)}
                      placeholder="ROBSON DE ALMEIDA FERNANDEZ RAMOS" 
                      className="h-[34px] border-slate-100 text-[12px]"
                    />
                  </div>
                </div>

                {/* Row 2: Nome and CPF */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Nome do Cliente <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={formData.nome}
                      onChange={(e) => handleInputChange("nome", e.target.value)}
                      placeholder="Digite o nome completo" 
                      className="h-[34px] border-slate-100 text-[12px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      CPF <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={formData.cpf}
                      onChange={(e) => handleInputChange("cpf", e.target.value)}
                      placeholder="000.000.000-00" 
                      className="h-[34px] border-slate-100 text-[12px]"
                    />
                  </div>
                </div>

                {/* Row 3: Telefones */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Telefone 1 <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={formData.tel1}
                      onChange={(e) => handleInputChange("tel1", e.target.value)}
                      placeholder="(00) 00000-0000" 
                      className="h-[34px] border-slate-100 text-[12px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Telefone 2
                    </label>
                    <Input 
                      value={formData.tel2}
                      onChange={(e) => handleInputChange("tel2", e.target.value)}
                      placeholder="(00) 00000-0000" 
                      className="h-[34px] border-slate-100 text-[12px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Telefone 3
                    </label>
                    <Input 
                      value={formData.tel3}
                      onChange={(e) => handleInputChange("tel3", e.target.value)}
                      placeholder="(00) 00000-0000" 
                      className="h-[34px] border-slate-100 text-[12px]"
                    />
                  </div>
                </div>

                {/* Row 4: Margem and Convênio */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Margem <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={formData.margem}
                      onChange={(e) => handleInputChange("margem", e.target.value)}
                      placeholder="R$ 0,00" 
                      className="h-[34px] border-slate-100 text-[12px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Convênio <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={formData.convenio}
                      onChange={(e) => handleInputChange("convenio", e.target.value)}
                      placeholder="Ex: GOV SP" 
                      className="h-[34px] border-slate-100 text-[12px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Descrição <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-slate-400 mb-2">Descrição detalhada do ticket</p>
              
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <div className="bg-slate-50 border-bottom border-slate-200 p-2 flex flex-wrap gap-1">
                  <ToolbarButton icon={<Bold className="w-3.5 h-3.5" />} />
                  <ToolbarButton icon={<Italic className="w-3.5 h-3.5" />} />
                  <ToolbarButton icon={<Underline className="w-3.5 h-3.5" />} />
                  <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
                  <ToolbarButton icon={<Quote className="w-3.5 h-3.5" />} />
                  <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
                  <ToolbarButton icon={<AlignLeft className="w-3.5 h-3.5" />} />
                  <ToolbarButton icon={<AlignCenter className="w-3.5 h-3.5" />} />
                  <ToolbarButton icon={<AlignRight className="w-3.5 h-3.5" />} />
                  <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
                  <ToolbarButton icon={<List className="w-3.5 h-3.5" />} />
                  <ToolbarButton icon={<ListOrdered className="w-3.5 h-3.5" />} />
                  <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
                  <ToolbarButton icon={<FontIcon className="w-3.5 h-3.5" />} />
                  <ToolbarButton icon={<Link2 className="w-3.5 h-3.5" />} />
                  <ToolbarButton icon={<ImageIcon className="w-3.5 h-3.5" />} />
                  <ToolbarButton icon={<Type className="w-3.5 h-3.5" />} />
                </div>
                <textarea 
                  className="w-full min-h-[200px] p-4 text-[12px] focus:outline-none resize-none"
                  placeholder="Descreva aqui a solicitação..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple
                />
                <h3 
                  onClick={handleFileClick}
                  className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 cursor-pointer hover:underline"
                >
                  Anexar Arquivos
                </h3>
                <p className="text-[10px] text-slate-400">Você pode enviar arquivos com tamanho máximo de 20 mb dos tipos jpg, jpeg, png, gif, pdf, doc, docx, ppt, pptx, pps, ppsx, odt, xls, xlsx.</p>
              </div>
              
              <Button 
                onClick={handleSubmit}
                className="bg-primary hover:bg-primary/90 text-white px-8 h-10 text-xs font-bold rounded-lg shadow-lg shadow-primary/20"
              >
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function ToolbarButton({ icon }: { icon: React.ReactNode }) {
  return (
    <button className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-primary">
      {icon}
    </button>
  )
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Carregando...</div>}>
      <NewTicketForm />
    </Suspense>
  )
}
