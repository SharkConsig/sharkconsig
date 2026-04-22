"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
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
  FileEdit,
  Loader2,
  Send,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Attachment {
  name: string
  url: string
}

interface Message {
  id: string
  user_nome: string
  user_avatar: string | null
  action: string
  content: string | null
  attachments: Attachment[]
  status_change: { 
    from: string; 
    to: string; 
    fromColor: string; 
    toColor: string; 
  } | null
  created_at: string
}

interface Status {
  id: string
  nome: string
  cor: string
}

interface TicketAtendimentoProps {
  ticket: {
    id: string;
    client: string;
    cpf: string;
    origin: string;
    status_id?: string | null;
    status_nome?: string;
    description?: string;
    createdAt?: string;
    user_nome?: string;
    arquivo_rg_frente?: string | null;
    arquivo_rg_verso?: string | null;
    arquivo_contracheque?: string | null;
    arquivo_extrato?: string | null;
    arquivo_outros?: string | null;
  }
  onMessageSent?: () => void
}

export function TicketAtendimento({ ticket, onMessageSent }: TicketAtendimentoProps) {
  const router = useRouter()
  const { perfil, user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [availableStatuses, setAvailableStatuses] = useState<Status[]>([])
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(ticket.status_id || null)
  const [currentStatusName, setCurrentStatusName] = useState<string>(ticket.status_nome || "ABERTO")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchStatuses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('status_chamados')
        .select('*')
        .order('nome', { ascending: true })
      
      if (!error && data) {
        setAvailableStatuses(data)
        
        // Se não tivermos o status_id inicial, vamos tentar encontrar pelo nome
        if (!selectedStatusId && ticket.status_nome) {
          const matched = data.find(s => s.nome.toUpperCase() === ticket.status_nome?.toUpperCase())
          if (matched) setSelectedStatusId(matched.id)
        }
      }
    } catch (err) {
      console.error("Erro ao buscar status:", err)
    }
  }, [ticket.status_nome, selectedStatusId])

  useEffect(() => {
    fetchStatuses()
  }, [fetchStatuses])

  // Use useMemo to include the initial ticket description as the first message
  const allMessages = useMemo(() => {
    const ticketAttachments: Attachment[] = [];
    if (ticket.arquivo_rg_frente) ticketAttachments.push({ name: "RG FRENTE", url: ticket.arquivo_rg_frente });
    if (ticket.arquivo_rg_verso) ticketAttachments.push({ name: "RG VERSO", url: ticket.arquivo_rg_verso });
    if (ticket.arquivo_contracheque) ticketAttachments.push({ name: "CONTRACHEQUE", url: ticket.arquivo_contracheque });
    if (ticket.arquivo_extrato) ticketAttachments.push({ name: "EXTRATO", url: ticket.arquivo_extrato });
    if (ticket.arquivo_outros) ticketAttachments.push({ name: "ANEXO ADICIONAL", url: ticket.arquivo_outros });

    const initialMessage: Message | null = ticket.description ? {
      id: "initial",
      user_nome: ticket.user_nome || ticket.client,
      user_avatar: null,
      action: "solicitou",
      content: ticket.description,
      attachments: ticketAttachments,
      status_change: null,
      created_at: ticket.createdAt || new Date().toISOString()
    } : null;

    return initialMessage ? [initialMessage, ...messages] : messages;
  }, [ticket, messages]);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('mensagens_chamado')
        .select('*')
        .eq('chamado_id', ticket.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error)
      toast.error("Erro ao carregar o histórico")
    } finally {
      setIsLoading(false)
    }
  }, [ticket.id])

  useEffect(() => {
    fetchMessages()

    // Realtime subscription
    const channel = supabase
      .channel(`chat_${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_chamado',
          filter: `chamado_id=eq.${ticket.id}`
        },
        (payload) => {
          setMessages(current => [...current, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticket.id, fetchMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!user || !perfil) return

    setIsSending(true)
    try {
      const chatAttachments: Attachment[] = []

      // Upload selected files
      if (selectedFiles.length > 0) {
        toast.loading("Enviando anexos...", { id: "chat-upload" })
        for (const file of selectedFiles) {
          try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
            const fullPath = `chat_messages/${ticket.id}/${Date.now()}_${fileName}`

            const { error: uploadError } = await supabase.storage
              .from('chamados-attachments')
              .upload(fullPath, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage
              .from('chamados-attachments')
              .getPublicUrl(fullPath)

            chatAttachments.push({
              name: file.name,
              url: data.publicUrl
            })
          } catch (err) {
            console.error(`Erro ao subir arquivo ${file.name}:`, err)
            toast.error(`Erro ao subir arquivo ${file.name}`)
          }
        }
        toast.dismiss("chat-upload")
      }

      // Se o status mudou, registrar a mudança
      let statusChangeData = null
      if (selectedStatusId && selectedStatusId !== ticket.status_id) {
        const newStatus = availableStatuses.find(s => s.id === selectedStatusId)
        if (newStatus) {
          // Atualizar o chamado no banco
          const { error: updateError } = await supabase
            .from('chamados')
            .update({ 
              status_id: selectedStatusId,
              status: newStatus.nome // Manter compatibilidade com a coluna de texto
            })
            .eq('id', ticket.id)
          
          if (!updateError) {
            statusChangeData = {
              from: currentStatusName,
              to: newStatus.nome,
              fromColor: "slate", // Simplificado
              toColor: newStatus.cor
            }
            setCurrentStatusName(newStatus.nome)
          }
        }
      }

      const { error } = await supabase
        .from('mensagens_chamado')
        .insert({
          chamado_id: ticket.id,
          user_id: user.id,
          user_nome: perfil.nome,
          user_role: perfil.role,
          user_avatar: perfil.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(perfil.nome)}&background=random`,
          content: reply,
          action: statusChangeData ? 'alterou o status' : 'respondeu',
          attachments: chatAttachments,
          status_change: statusChangeData
        })

      if (error) throw error

      setReply("")
      setSelectedFiles([])
      if (onMessageSent) onMessageSent()
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
      toast.error("Erro ao enviar mensagem")
    } finally {
      setIsSending(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles = files.filter(file => {
      const sizeInMB = file.size / (1024 * 1024)
      if (sizeInMB > 20) {
        toast.error(`${file.name} excede o limite de 20MB`)
        return false
      }
      return true
    })

    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDigitarProposta = () => {
    const params = new URLSearchParams({
      nome: ticket.client,
      cpf: ticket.cpf,
      nascimento: "31/01/1984", 
      idLead: ticket.id,
      origem: ticket.origin.toLowerCase()
    });
    router.push(`/propostas/nova?${params.toString()}`);
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-white border-t border-slate-100 max-h-[800px] flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar" ref={scrollRef}>
        {isLoading && allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Carregando histórico...</span>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Nenhuma mensagem iniciada</span>
          </div>
        ) : (
          allMessages.map((msg) => (
            <div key={msg.id} className="flex flex-col sm:flex-row gap-4 text-left animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm ring-1 ring-slate-100">
                <Image 
                  src={msg.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.user_nome)}&background=random`} 
                  alt={msg.user_nome} 
                  fill 
                  className="object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold text-slate-900">{msg.user_nome}</span>
                  <span className="text-[11px] italic text-slate-400">{msg.action}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                </p>
                
                {msg.content && (
                  <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 group hover:border-primary/20 transition-colors">
                    <p className="text-sm text-slate-600 italic break-words leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                )}

                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="space-y-1 pt-2">
                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-2">Anexos</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.attachments.map((file) => (
                        <a 
                          key={file.name} 
                          href={file.url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline flex items-center gap-2 font-medium truncate bg-primary/5 p-2 rounded-lg"
                        >
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {msg.status_change && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                    <span className={cn("px-4 py-1.5 rounded text-[10px] font-bold text-white uppercase min-w-[120px] text-center shadow-sm", msg.status_change.fromColor)}>
                      {msg.status_change.from}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 hidden sm:block" />
                    <span className={cn("px-4 py-1.5 rounded text-[10px] font-bold text-white uppercase min-w-[120px] text-center shadow-sm", msg.status_change.toColor)}>
                      {msg.status_change.to}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply Box */}
      <div className="pt-8 border-t border-slate-100 space-y-4">
        <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm">
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
            className="w-full min-h-[100px] max-h-[300px] p-4 text-[13px] focus:outline-none resize-none bg-white font-medium text-slate-700 leading-relaxed"
            placeholder="Digite sua resposta aqui e pressione Enviar..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSendMessage()
              }
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div className="space-y-4 w-full sm:w-auto text-left">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple
              onChange={handleFileChange}
            />
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 animate-in zoom-in-95 duration-200">
                    <FileText className="w-3 h-3 text-primary" />
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button 
                      onClick={() => removeFile(idx)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-end gap-3">
              {/* Status Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-500/80 uppercase tracking-widest pl-1">ALTERAR STATUS</label>
                <select
                  value={selectedStatusId || ""}
                  onChange={(e) => setSelectedStatusId(e.target.value)}
                  className="h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer min-w-[150px]"
                >
                  {availableStatuses.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              <Button 
                onClick={handleSendMessage}
                disabled={isSending}
                className="bg-primary hover:bg-primary/90 text-white px-8 h-[38px] text-[11px] font-bold rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center gap-2 group"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    ENVIAR MENSAGEM
                  </>
                )}
              </Button>
              <h3 
                onClick={handleFileClick}
                className="text-[10px] font-bold text-primary uppercase tracking-wider cursor-pointer hover:underline py-2"
              >
                Anexar Arquivos
              </h3>
            </div>
            <p className="text-[9px] text-slate-400 max-w-sm leading-relaxed">Pressione <kbd className="bg-slate-100 px-1 rounded font-bold">Ctrl + Enter</kbd> para enviar rapidamente. Tamanho máximo 20mb (jpg, png, pdf, docx, xlsx).</p>
          </div>
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
