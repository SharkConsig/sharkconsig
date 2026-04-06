"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
  ArrowRight,
  FileText,
  FileEdit
} from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

const messages = [
  {
    id: 1,
    user: "Talia Alves",
    avatar: "https://picsum.photos/seed/talia/100/100",
    action: "solicitou",
    time: "3 horas atrás",
    content: "{Solicitação da Talia para o Operacional...}",
    attachments: [
      { name: "HOLERITE_850271_01-2026_3107-1.pdf", url: "#" },
      { name: "CC-KELLY-ELAINE-DE-GOES-SILVA-Nov-2025-a-Jan-2026.jpg", url: "#" }
    ]
  },
  {
    id: 2,
    user: "Maria Rosangêla",
    avatar: "https://picsum.photos/seed/maria/100/100",
    action: "respondeu",
    time: "2 horas atrás",
    content: "{Resposta da Maria Rosangêla (Operacional) à solicitação da Talia (Corretora)...}"
  },
  {
    id: 3,
    user: "Maria Rosangêla",
    avatar: "https://picsum.photos/seed/maria/100/100",
    action: "alterou o status",
    time: "2 horas atrás",
    statusChange: { from: "ABERTO", to: "AGUARDANDO CORRETOR", fromColor: "bg-emerald-500", toColor: "bg-orange-500" }
  },
  {
    id: 4,
    user: "Talia Alves",
    avatar: "https://picsum.photos/seed/talia/100/100",
    action: "respondeu",
    time: "1 horas atrás",
    content: "{Talia respondeu o Operacional...}"
  },
  {
    id: 5,
    user: "Talia Alves",
    avatar: "https://picsum.photos/seed/talia/100/100",
    action: "alterou o status",
    time: "2 horas atrás",
    statusChange: { from: "AGUARDANDO CORRETOR", to: "AGUARDANDO SUPORTE", fromColor: "bg-orange-500", toColor: "bg-amber-400" }
  },
  {
    id: 6,
    user: "Maria Rosangêla",
    avatar: "https://picsum.photos/seed/maria/100/100",
    action: "respondeu",
    time: "2 horas atrás",
    content: "{Resposta da Maria Rosangêla (Operacional) à solicitação da Talia (Corretora)...}"
  }
]

interface TicketAtendimentoProps {
  ticket: {
    id: string;
    client: string;
    cpf: string;
    origin: string;
  }
}

export function TicketAtendimento({ ticket }: TicketAtendimentoProps) {
  const router = useRouter()
  const [reply, setReply] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDigitarProposta = () => {
    const params = new URLSearchParams({
      nome: ticket.client,
      cpf: ticket.cpf,
      nascimento: "31/01/1984", // Mock birth date
      idLead: ticket.id,
      origem: ticket.origin.toLowerCase()
    });
    router.push(`/propostas/nova?${params.toString()}`);
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-white border-t border-slate-100">
      {/* Timeline */}
      <div className="space-y-8">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col sm:flex-row gap-4 text-left">
            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
              <Image src={msg.avatar} alt={msg.user} fill className="object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-bold text-slate-900">{msg.user}</span>
                <span className="text-[11px] italic text-slate-400">{msg.action}</span>
              </div>
              <p className="text-[11px] text-slate-400">{msg.time}</p>
              
              {msg.content && (
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                  <p className="text-sm text-slate-600 italic break-words">{msg.content}</p>
                </div>
              )}

              {msg.attachments && (
                <div className="space-y-1 pt-2">
                  <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-2">Anexos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.attachments.map((file) => (
                      <a 
                        key={file.name} 
                        href={file.url} 
                        className="text-[11px] text-primary hover:underline flex items-center gap-2 font-medium truncate"
                      >
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {msg.statusChange && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                  <span className={cn("px-4 py-1.5 rounded text-[10px] font-bold text-white uppercase min-w-[120px] text-center shadow-sm", msg.statusChange.fromColor)}>
                    {msg.statusChange.from}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 hidden sm:block" />
                  <span className={cn("px-4 py-1.5 rounded text-[10px] font-bold text-white uppercase min-w-[120px] text-center shadow-sm", msg.statusChange.toColor)}>
                    {msg.statusChange.to}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reply Box */}
      <div className="pt-8 border-t border-slate-100 space-y-4">
        <div className="border border-slate-200 rounded-lg overflow-hidden">
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
            className="w-full min-h-[150px] p-4 text-[12px] focus:outline-none resize-none"
            placeholder="Digite sua resposta aqui..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div className="space-y-2 w-full sm:w-auto text-left">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple
            />
            <h3 
              onClick={handleFileClick}
              className="text-[10px] font-bold text-primary uppercase tracking-wider cursor-pointer hover:underline"
            >
              Anexar Arquivos
            </h3>
            <p className="text-[10px] text-slate-400 max-w-md">Você pode enviar arquivos com tamanho máximo de 20 mb dos tipos jpg, jpeg, png, gif, pdf, doc, docx, ppt, pptx, pps, ppsx, odt, xls, xlsx.</p>
            <Button className="bg-primary hover:bg-primary/90 text-white px-8 h-[34px] text-[10.5px] font-bold rounded-lg shadow-lg shadow-primary/20 mt-2 w-full sm:w-auto">
              Enviar
            </Button>
          </div>
          
          <Button 
            onClick={handleDigitarProposta}
            className="bg-slate-800 hover:bg-slate-700 text-white px-8 h-[34px] text-[10.5px] font-bold rounded-lg shadow-lg shadow-slate-200 w-full sm:w-auto"
          >
            <FileEdit className="w-4 h-4 mr-2" />
            DIGITAR PROPOSTA
          </Button>
        </div>
      </div>
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
