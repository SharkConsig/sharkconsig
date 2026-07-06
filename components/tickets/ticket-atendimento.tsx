"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { 
  Bold, 
  Italic, 
  Quote, 
  List, 
  ListOrdered, 
  Type, 
  Link2, 
  Image as ImageIcon, 
  ArrowRight,
  FileText,
  Loader2,
  Send,
  X,
  ChevronDown,
  Search,
  Plus,
  Edit2,
  Paperclip,
  LifeBuoy,
  Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import ReactMarkdown from "react-markdown"
import { Input } from "@/components/ui/input"

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
    descricao?: string;
    description?: string;
    content?: string;
    createdAt?: string;
    user_nome?: string;
    user_id?: string;
    user_avatar?: string | null;
    matricula?: string;
    phone?: string;
    phone_2?: string;
    phone_3?: string;
    arquivo_rg_frente?: string | null;
    arquivo_rg_verso?: string | null;
    arquivo_contracheque?: string | null;
    arquivo_extrato?: string | null;
    arquivo_outros?: string | null;
    margem?: number | null;
    margem_liquida_5?: number | null;
    margem_beneficio_5?: number | null;
    convenio?: string | null;
  }
  onMessageSent?: () => void
}

// Helper to extract metadata from description
const parseDescriptionMetadata = (desc: string) => {
  try {
    const match = desc?.match(/<!-- TICKET_METADATA: ([\s\S]*?) -->/);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
  } catch (e) {
    console.error("Error parsing metadata:", e);
  }
  return null;
};

// Helper to remove metadata block from description for display
const cleanDescription = (desc: string) => {
  if (!desc) return "";
  return desc.replace(/<!-- TICKET_METADATA: ([\s\S]*?) -->/g, "").trim();
};

// Helper to add/update metadata block in description
const updateDescriptionWithMetadata = (desc: string, metadata: Record<string, unknown>) => {
  const cleaned = cleanDescription(desc);
  const metadataBlock = `\n\n<!-- TICKET_METADATA: ${JSON.stringify(metadata)} -->`;
  return cleaned + metadataBlock;
};

export function TicketAtendimento({ ticket, onMessageSent }: TicketAtendimentoProps) {
  const { perfil, user, isEstagio } = useAuth()
  const isUserEstagio = isEstagio || perfil?.role?.toLowerCase() === 'estágio' || perfil?.role?.toLowerCase() === 'estagio'

  const canEditMargins = useMemo(() => {
    const role = perfil?.role?.toLowerCase()
    return role === 'supervisor' || role === 'operacional' || role === 'admin' || role === 'diretoria' || role === 'supervisor/coordenador' || role === 'desenvolvedor' || role === 'dev' || role === 'administrador'
  }, [perfil?.role])

  // States for margins, coefficients, operations
  const [selectedOperationType, setSelectedOperationType] = useState<'margem' | 'liquida5' | 'beneficio5' | null>(null)

  const [ticketMargins, setTicketMargins] = useState({
    margem: "",
    liquida5: "",
    beneficio5: ""
  })

  const [ticketCoefficients, setTicketCoefficients] = useState({
    margem: "0,028",
    liquida5: "0,053",
    beneficio5: "0,053"
  })

  const [ticketOperations, setTicketOperations] = useState({
    margem: "",
    liquida5: "",
    beneficio5: ""
  })

  const [isSavingMargins, setIsSavingMargins] = useState(false)

  // Initialize and keep states updated
  useEffect(() => {
    const meta = parseDescriptionMetadata(ticket.descricao || ticket.description || ticket.content || "");
    const initialMargem = ticket.margem !== null && ticket.margem !== undefined ? ticket.margem : 0;
    const initialLiquida = ticket.margem_liquida_5 !== null && ticket.margem_liquida_5 !== undefined ? ticket.margem_liquida_5 : 0;
    const initialBeneficio = ticket.margem_beneficio_5 !== null && ticket.margem_beneficio_5 !== undefined ? ticket.margem_beneficio_5 : 0;

    const toCurrencyStr = (val: string | number | null | undefined) => {
      if (val === null || val === undefined || val === "") return "";
      let num = 0;
      if (typeof val === 'number') {
        num = val;
      } else {
        const cleaned = val.toString().replace(/[R$\s.]/g, "").replace(",", ".");
        num = parseFloat(cleaned) || 0;
      }
      if (!num) return "";
      return "R$ " + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const margemVal = toCurrencyStr(meta?.margem || initialMargem);
    const liquidaVal = toCurrencyStr(meta?.liquida5 || initialLiquida);
    const beneficioVal = toCurrencyStr(meta?.beneficio5 || initialBeneficio);

    const coefMargem = meta?.coeficiente_margem || "0,028";
    const coefLiquida = meta?.coeficiente_liquida5 || "0,053";
    const coefBeneficio = meta?.coeficiente_beneficio5 || "0,053";

    const calculateOpVal = (marginValStr: string, coefStr: string) => {
      const marginNum = parseCurrencyToNumber(marginValStr);
      const cleanedCoef = coefStr.replace(",", ".");
      const coefVal = parseFloat(cleanedCoef) || 0;
      if (!marginNum || coefVal === 0) return "";
      const result = marginNum / coefVal;
      return "R$ " + result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const opMargem = meta?.valor_operacao_margem ? toCurrencyStr(meta.valor_operacao_margem) : calculateOpVal(margemVal, coefMargem);
    const opLiquida = meta?.valor_operacao_liquida5 ? toCurrencyStr(meta.valor_operacao_liquida5) : calculateOpVal(liquidaVal, coefLiquida);
    const opBeneficio = meta?.valor_operacao_beneficio5 ? toCurrencyStr(meta.valor_operacao_beneficio5) : calculateOpVal(beneficioVal, coefBeneficio);

    setTicketMargins({
      margem: margemVal,
      liquida5: liquidaVal,
      beneficio5: beneficioVal
    });
    setTicketCoefficients({
      margem: coefMargem,
      liquida5: coefLiquida,
      beneficio5: coefBeneficio
    });
    setTicketOperations({
      margem: opMargem,
      liquida5: opLiquida,
      beneficio5: opBeneficio
    });

    let detectedType: 'margem' | 'liquida5' | 'beneficio5' | null = null;
    const desc = ticket.descricao || ticket.description || ticket.content || "";
    if (desc.includes("MARGEM 35%")) {
      detectedType = 'margem';
    } else if (desc.includes("LÍQUIDA 5%")) {
      detectedType = 'liquida5';
    } else if (desc.includes("BENEFÍCIO 5%") || desc.includes("CARTÃO BENEFÍCIO") || desc.includes("CARTÃO CONSIGINADO") || desc.includes("CARTAO CONSIGINADO") || desc.includes("CARTÃO")) {
      detectedType = 'beneficio5';
    }
    
    setSelectedOperationType(meta?.selected_operation_type || detectedType || null);
  }, [ticket])

  const formatAsCurrency = (value: string) => {
    const isNegative = value.includes("-");
    const digits = value.replace(/\D/g, "");
    
    if (digits) {
      const numberValue = (parseFloat(digits) / 100).toFixed(2);
      const parts = numberValue.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `R$ ${isNegative ? "-" : ""}${parts.join(",")}`;
    } else if (isNegative) {
      return "R$ -";
    }
    return "";
  };

  const parseCurrencyToNumber = (val: string) => {
    if (!val) return 0;
    const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const getMarginStyleClasses = (value: string) => {
    if (!value) return "bg-[#E8E8E8] text-slate-500 border-slate-100";
    const num = parseCurrencyToNumber(value);
    if (num < 0) return "bg-red-50 text-red-700 border-red-200 focus:ring-red-200 focus:border-red-400";
    if (num > 0) return "bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-200 focus:border-emerald-400";
    return "bg-[#E8E8E8] text-slate-500 border-slate-100";
  };

  const handleMarginChange = (field: 'margem' | 'liquida5' | 'beneficio5', rawValue: string) => {
    const formatted = formatAsCurrency(rawValue);
    setTicketMargins(prev => {
      const updated = { ...prev, [field]: formatted };
      
      // Auto-calculate valor operacao
      const marginNum = parseCurrencyToNumber(formatted);
      const coefStr = ticketCoefficients[field];
      const coefNum = parseFloat(coefStr.replace(",", "."));
      if (coefNum && coefNum !== 0) {
        const opVal = marginNum / coefNum;
        const opValFormatted = `R$ ${opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        setTicketOperations(ops => ({ ...ops, [field]: opValFormatted }));
      } else {
        setTicketOperations(ops => ({ ...ops, [field]: "" }));
      }
      
      return updated;
    });
  };

  const handleCoefChange = (field: 'margem' | 'liquida5' | 'beneficio5', rawValue: string) => {
    const cleaned = rawValue.replace(/[^0-9,.]/g, "");
    setTicketCoefficients(prev => {
      const updated = { ...prev, [field]: cleaned };
      
      // Auto-calculate valor operacao
      const marginNum = parseCurrencyToNumber(ticketMargins[field]);
      const coefNum = parseFloat(cleaned.replace(",", "."));
      if (coefNum && coefNum !== 0) {
        const opVal = marginNum / coefNum;
        const opValFormatted = `R$ ${opVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        setTicketOperations(ops => ({ ...ops, [field]: opValFormatted }));
      } else {
        setTicketOperations(ops => ({ ...ops, [field]: "" }));
      }
      
      return updated;
    });
  };

  const handleOpChange = (field: 'margem' | 'liquida5' | 'beneficio5', rawValue: string) => {
    const formatted = formatAsCurrency(rawValue);
    setTicketOperations(prev => ({ ...prev, [field]: formatted }));
  };

  const handleSaveMargins = async () => {
    setIsSavingMargins(true);
    try {
      const metadata = {
        margem: ticketMargins.margem,
        liquida5: ticketMargins.liquida5,
        beneficio5: ticketMargins.beneficio5,
        coeficiente_margem: ticketCoefficients.margem,
        coeficiente_liquida5: ticketCoefficients.liquida5,
        coeficiente_beneficio5: ticketCoefficients.beneficio5,
        valor_operacao_margem: ticketOperations.margem,
        valor_operacao_liquida5: ticketOperations.liquida5,
        valor_operacao_beneficio5: ticketOperations.beneficio5,
        selected_operation_type: selectedOperationType
      };

      const updatedDescription = updateDescriptionWithMetadata(ticket.descricao || ticket.description || ticket.content || "", metadata);

      // Find selected operation value numeric to store in public.chamados.valor_operacao
      let selectedValNum = null;
      if (selectedOperationType === 'margem') {
        selectedValNum = parseCurrencyToNumber(ticketOperations.margem);
      } else if (selectedOperationType === 'liquida5') {
        selectedValNum = parseCurrencyToNumber(ticketOperations.liquida5);
      } else if (selectedOperationType === 'beneficio5') {
        selectedValNum = parseCurrencyToNumber(ticketOperations.beneficio5);
      }

      const { error } = await supabase
        .from('chamados')
        .update({
          // Não alteramos a coluna 'margem' (nem margem_liquida_5, nem margem_beneficio_5) para não alterar a margem do cliente no banco de dados.
          descricao: updatedDescription,
          valor_operacao: selectedValNum
        })
        .eq('id', ticket.id);

      if (error) throw error;

      // Check if selected operation has been changed to insert a notification in messages
      const oldMeta = parseDescriptionMetadata(ticket.descricao || ticket.description || ticket.content || "");
      const oldType = oldMeta?.selected_operation_type;
      
      let changed = false;
      let selectionStr = "";

      if (selectedOperationType) {
        if (selectedOperationType !== oldType) {
          changed = true;
        } else {
          if (selectedOperationType === 'margem') {
            if (ticketMargins.margem !== (oldMeta?.margem || "") || ticketOperations.margem !== (oldMeta?.valor_operacao_margem || "")) {
              changed = true;
            }
          } else if (selectedOperationType === 'liquida5') {
            if (ticketMargins.liquida5 !== (oldMeta?.liquida5 || "") || ticketOperations.liquida5 !== (oldMeta?.valor_operacao_liquida5 || "")) {
              changed = true;
            }
          } else if (selectedOperationType === 'beneficio5') {
            if (ticketMargins.beneficio5 !== (oldMeta?.beneficio5 || "") || ticketOperations.beneficio5 !== (oldMeta?.valor_operacao_beneficio5 || "")) {
              changed = true;
            }
          }
        }

        if (selectedOperationType === 'margem') {
          selectionStr = `Margem 35% - ${ticketMargins.margem || "R$ 0,00"} (Valor Operação: ${ticketOperations.margem || "R$ 0,00"})`;
        } else if (selectedOperationType === 'liquida5') {
          selectionStr = `Líquida 5% - ${ticketMargins.liquida5 || "R$ 0,00"} (Valor Operação: ${ticketOperations.liquida5 || "R$ 0,00"})`;
        } else if (selectedOperationType === 'beneficio5') {
          selectionStr = `Benefício 5% - ${ticketMargins.beneficio5 || "R$ 0,00"} (Valor Operação: ${ticketOperations.beneficio5 || "R$ 0,00"})`;
        }
      }

      const roleStr = perfil?.role?.toLowerCase() || "";
      const isAllowedRole = roleStr === 'supervisor' || roleStr === 'operacional' || roleStr === 'admin' || roleStr === 'diretoria' || roleStr === 'supervisor/coordenador' || roleStr === 'desenvolvedor' || roleStr === 'dev' || roleStr === 'administrador';

      if (changed && selectionStr && user && perfil && isAllowedRole) {
        await supabase
          .from('mensagens_chamado')
          .insert({
            chamado_id: parseInt(ticket.id, 10),
            user_id: user.id,
            user_nome: perfil.nome,
            user_role: perfil.role,
            user_avatar: perfil.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(perfil.nome)}&background=random`,
            content: `A margem e o valor de operação foram alterados para ${selectionStr}`,
            action: 'alterou o valor da operação'
          });
        fetchMessages(true);
      }

      toast.success("Dados de margens salvos com sucesso!");
      setInitialDesc(updatedDescription);
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (err: unknown) {
      console.error("Erro ao salvar margens:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao salvar margens: ${errorMsg}`);
    } finally {
      setIsSavingMargins(false);
    }
  };

  const getMarginLabel = (field: 'margem' | 'liquida5' | 'beneficio5') => {
    const conv = ticket.convenio?.toUpperCase();
    
    if (conv === "GOVERNO MARANHÃO") {
      if (field === 'margem') return "MARGEM EMPRÉSTIMO CONSIGNADO";
      if (field === 'liquida5') return "MARGEM CARTÃO CONSIGNADO";
      if (field === 'beneficio5') return "MARGEM CARTÃO BENEFÍCIO";
    }
    
    if (conv === "GOVERNO PIAUÍ") {
      if (field === 'liquida5') return "MARGEM CARTÃO CONSIGNADO";
      if (field === 'beneficio5') return "MARGEM CARTÃO BENEFÍCIO";
      if (field === 'margem') return "MARGEM DISPONÍVEL EMPRÉSTIMO";
    }

    if (conv === "GOVERNO SP" || conv === "PREFEITURA SP") {
      if (field === 'margem') return "LÍQUIDA CONSIGNAÇÕES";
      if (field === 'liquida5') return "LÍQUIDA CARTÃO CRÉDITO";
      if (field === 'beneficio5') return "LÍQUIDA CARTÃO BENEFÍCIO";
    }

    if (conv?.includes("SANTO ANDRÉ") || conv?.includes("SANTO ANDRE")) {
      if (field === 'margem') return "MARGEM LÍQUIDA EMPRÉSTIMO";
      if (field === 'liquida5') return "MARGEM LÍQUIDA CARTÃO";
      if (field === 'beneficio5') return "Margem Benefício Líquida 5%";
    }

    if (field === 'margem') return "MARGEM 35%";
    if (field === 'liquida5') return "LÍQUIDA 5%";
    if (field === 'beneficio5') return "BENEFÍCIO 5%";
    return "";
  };

  const calculateValorOperacao = (marginVal: number | undefined | null, coefStr: string) => {
    if (!marginVal) return "R$ 0,00";
    
    const cleanedCoef = coefStr.replace(",", ".");
    const coefVal = parseFloat(cleanedCoef) || 0;

    if (coefVal === 0) return "R$ 0,00";
    
    const result = marginVal / coefVal;
    
    return "R$ " + result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getMarginClasses = (val: number | undefined | null) => {
    if (val === undefined || val === null || val === 0) return "bg-[#E8E8E8] text-slate-500 border-slate-100";
    if (val < 0) return "bg-red-50 text-red-700 border-red-200";
    if (val > 0) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-[#E8E8E8] text-slate-500 border-slate-100";
  };

  const [messages, setMessages] = useState<Message[]>([])

  const isSupervisorOrAbove = useMemo(() => {
    const role = perfil?.role?.toLowerCase()
    return role === 'supervisor' || role === 'diretoria' || role === 'admin' || role === 'supervisor/coordenador'
  }, [perfil?.role])

  const canAskForSupport = useMemo(() => {
    const role = perfil?.role?.toLowerCase()
    return role === 'corretor' || isUserEstagio
  }, [perfil?.role, isUserEstagio])

  const hasActiveApoio = useMemo(() => {
    let active = false
    for (const m of messages) {
      if (m.action === 'pediu_apoio') {
        active = true
      } else if (m.action === 'resolveu_apoio') {
        active = false
      }
    }
    return active
  }, [messages])
  const [initialDesc, setInitialDesc] = useState(ticket.descricao || ticket.description || ticket.content || "")

  // Update initialDesc if ticket prop changes
  useEffect(() => {
    setInitialDesc(ticket.descricao || ticket.description || ticket.content || "")
  }, [ticket.descricao, ticket.description, ticket.content])

  const [isLoading, setIsLoading] = useState(true)
  const [reply, setReply] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`ticket_draft_${ticket.id}`) || ""
    }
    return ""
  })
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load scroll from localStorage on mount and when loading finishes
  const restoreScroll = useCallback(() => {
    if (typeof window !== "undefined") {
      const savedScroll = localStorage.getItem(`ticket_scroll_${ticket.id}`)
      if (savedScroll && scrollRef.current) {
        const targetScroll = parseInt(savedScroll, 10)
        // Somente aplicar se a diferença for relevante para evitar micro-pulos
        if (Math.abs(scrollRef.current.scrollTop - targetScroll) > 5) {
          scrollRef.current.scrollTop = targetScroll
        }
      }
    }
  }, [ticket.id])

  useEffect(() => {
    restoreScroll()
  }, [ticket.id, restoreScroll])

  useEffect(() => {
    if (!isLoading) {
      restoreScroll()
    }
  }, [isLoading, restoreScroll])

  // Save scroll position whenever it changes
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined") {
      const target = e.currentTarget
      // We only save if we're not currently restoring (to avoid saving 0 if it resets briefly)
      if (target.scrollTop > 0 || !localStorage.getItem(`ticket_scroll_${ticket.id}`)) {
        localStorage.setItem(`ticket_scroll_${ticket.id}`, target.scrollTop.toString())
      }
    }
  }

  // Save draft to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (reply) {
        localStorage.setItem(`ticket_draft_${ticket.id}`, reply)
      } else {
        localStorage.removeItem(`ticket_draft_${ticket.id}`)
      }
    }
  }, [reply, ticket.id])
  const [isSending, setIsSending] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [availableStatuses, setAvailableStatuses] = useState<Status[]>([])
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`ticket_status_draft_${ticket.id}`) || ticket.status_id || null
    }
    return ticket.status_id || null
  })

  // Persist selected status
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (selectedStatusId) {
        localStorage.setItem(`ticket_status_draft_${ticket.id}`, selectedStatusId)
      } else {
        localStorage.removeItem(`ticket_status_draft_${ticket.id}`)
      }
    }
  }, [selectedStatusId, ticket.id])
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)
  const [statusSearchTerm, setStatusSearchTerm] = useState("")
  const [currentStatusName, setCurrentStatusName] = useState<string>(ticket.status_nome || "ABERTO")
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [attachingToMessageId, setAttachingToMessageId] = useState<string | null>(null)
  
  // Apoio na Venda States
  const [isApoioModalOpen, setIsApoioModalOpen] = useState(false)
  const [apoioMessage, setApoioMessage] = useState("")
  const [isSendingApoio, setIsSendingApoio] = useState(false)

  const handleSendApoio = async () => {
    if (!apoioMessage.trim() || !user || !perfil) return
    setIsSendingApoio(true)
    try {
      const { error } = await supabase
        .from('mensagens_chamado')
        .insert({
          chamado_id: parseInt(ticket.id, 10),
          user_id: user.id,
          user_nome: perfil.nome,
          user_role: perfil.role,
          user_avatar: perfil.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(perfil.nome)}&background=random`,
          content: apoioMessage,
          action: 'pediu_apoio'
        })

      if (error) throw error
      toast.success("Solicitação de apoio enviada com sucesso!")
      setApoioMessage("")
      setIsApoioModalOpen(false)
      fetchMessages(true)
      onMessageSent?.()
    } catch (err) {
      console.error("Erro ao enviar pedido de apoio:", err)
      toast.error("Erro ao enviar pedido de apoio.")
    } finally {
      setIsSendingApoio(false)
    }
  }

  const [isResolvingApoio, setIsResolvingApoio] = useState(false)

  const handleResolveApoio = async () => {
    if (!user || !perfil) return
    setIsResolvingApoio(true)
    try {
      const { error } = await supabase
        .from('mensagens_chamado')
        .insert({
          chamado_id: parseInt(ticket.id, 10),
          user_id: user.id,
          user_nome: perfil.nome,
          user_role: perfil.role,
          user_avatar: perfil.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(perfil.nome)}&background=random`,
          content: "Apoio finalizado",
          action: 'resolveu_apoio'
        })

      if (error) throw error
      toast.success("Apoio finalizado com sucesso!")
      fetchMessages(true)
      onMessageSent?.()
    } catch (err) {
      console.error("Erro ao finalizar apoio:", err)
      toast.error("Erro ao finalizar apoio.")
    } finally {
      setIsResolvingApoio(false)
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageFileInputRef = useRef<HTMLInputElement>(null)
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null)
  const editContentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
    if (ticket.arquivo_rg_frente) ticketAttachments.push({ name: "RG ou CNH (FRENTE)", url: ticket.arquivo_rg_frente });
    if (ticket.arquivo_rg_verso) ticketAttachments.push({ name: "RG (VERSO)", url: ticket.arquivo_rg_verso });
    if (ticket.arquivo_contracheque) ticketAttachments.push({ name: "CONTRA CHEQUE", url: ticket.arquivo_contracheque });
    if (ticket.arquivo_extrato) ticketAttachments.push({ name: "EXTRATO DE CONSIGNAÇÃO", url: ticket.arquivo_extrato });
    if (ticket.arquivo_outros) ticketAttachments.push({ name: "OUTROS", url: ticket.arquivo_outros });

    const initialMessage: Message | null = (initialDesc) ? {
      id: "initial",
      user_nome: ticket.user_nome || ticket.client,
      user_avatar: ticket.user_avatar || (user?.id === ticket.user_id && perfil?.avatar_url ? perfil.avatar_url : null),
      action: "solicitou",
      content: cleanDescription(initialDesc),
      attachments: ticketAttachments,
      status_change: null,
      created_at: ticket.createdAt || new Date().toISOString()
    } : null;

    return initialMessage ? [initialMessage, ...messages] : messages;
  }, [ticket, messages, user?.id, perfil?.avatar_url, initialDesc]);

  const fetchMessages = useCallback(async (isSilent = false) => {
    // Só mostramos o loading se não for silencioso e não tivermos mensagens ainda
    const shouldShowLoading = !isSilent && messages.length === 0
    if (shouldShowLoading) setIsLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('mensagens_chamado')
        .select('*')
        .eq('chamado_id', ticket.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      // Update messages state
      setMessages(data || [])
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error)
      if (!isSilent) toast.error("Erro ao carregar o histórico")
    } finally {
      if (shouldShowLoading) setIsLoading(false)
    }
  }, [ticket.id, messages.length])

  useEffect(() => {
    // Carregamento inicial (não silencioso)
    fetchMessages(false)

    // Realtime subscription
    const channel = supabase
      .channel(`chat_${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to All changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'mensagens_chamado',
          filter: `chamado_id=eq.${ticket.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(current => [...current, payload.new as Message])
          } else if (payload.eventType === 'UPDATE') {
            setMessages(current => current.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
          } else if (payload.eventType === 'DELETE') {
            setMessages(current => current.filter(m => m.id !== payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chamados',
          filter: `id=eq.${ticket.id}`
        },
        (payload) => {
          // Se a descrição ou content do chamado mudar, atualiza initialDesc
          const newDesc = payload.new.descricao || payload.new.description || payload.new.content
          if (newDesc !== undefined && newDesc !== null) {
            setInitialDesc(newDesc)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticket.id, fetchMessages])

  useEffect(() => {
    // Only auto-scroll to bottom if no saved scroll position exists
    const savedScroll = localStorage.getItem(`ticket_scroll_${ticket.id}`)
    if (scrollRef.current && !savedScroll) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, ticket.id])

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

      let finalReply = reply
      // Adiciona as imagens no corpo do texto para que fiquem visíveis imediatamente
      const imageFiles = selectedFiles.filter(f => f.type.startsWith('image/'))
      if (imageFiles.length > 0) {
        // Encontrar os URLs correspondentes nos anexos já enviados
        const imageAttachments = chatAttachments.filter(a => a.name.match(/\.(jpg|jpeg|png|gif|webp|png)$/i))
        if (imageAttachments.length > 0) {
          finalReply += "\n\n" + imageAttachments.map(a => `![${a.name}](${a.url})`).join("\n")
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
          content: finalReply,
          action: statusChangeData ? 'alterou o status' : 'respondeu',
          attachments: chatAttachments,
          status_change: statusChangeData
        })

      if (error) throw error

      await fetchMessages(true)

      setReply("")
      localStorage.removeItem(`ticket_draft_${ticket.id}`)
      localStorage.removeItem(`ticket_status_draft_${ticket.id}`)
      localStorage.removeItem(`ticket_scroll_${ticket.id}`)
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

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const file = new File([blob], `screenshot_${Date.now()}.png`, { type: blob.type });
          files.push(file);
        }
      }
    }
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      toast.success(`${files.length} imagem(ns) colada(s) do clipboard`);
    }
  };

  const handleUpdateMessage = async () => {
    if (!editingMessageId) return
    setIsUpdating(true)
    try {
      if (editingMessageId === "initial") {
        const { error } = await supabase
          .from('chamados')
          .update({ 
            descricao: editContent
          })
          .eq('id', ticket.id)
        if (error) throw error
        
        // Atualizar estado local imediatamente
        setInitialDesc(editContent)
        toast.success("Descrição atualizada")
      } else {
        const { error } = await supabase
          .from('mensagens_chamado')
          .update({ 
            content: editContent
          })
          .eq('id', editingMessageId)
        if (error) throw error
        
        // Atualizar estado local imediatamente
        setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: editContent } : m))
        toast.success("Mensagem atualizada")
      }
      setEditingMessageId(null)
      // fetchMessages recalcula a partir do banco para garantir consistência
      fetchMessages(true)
    } catch (err: unknown) {
      console.error("Erro ao atualizar:", err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      toast.error(`Erro ao atualizar: ${errorMsg}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddAttachmentToMessage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !attachingToMessageId) return

    setIsUpdating(true)
    const toastId = toast.loading("Enviando anexo...")
    try {
      const file = files[0]
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

      const newAttachment = { name: file.name, url: data.publicUrl }

      if (attachingToMessageId === "initial") {
        toast.error("Edite a descrição para adicionar links de arquivos manualmente.")
      } else {
        const msg = messages.find(m => m.id === attachingToMessageId)
        const currentAtts = msg?.attachments || []
        
        const { error: updateError } = await supabase
          .from('mensagens_chamado')
          .update({ 
            attachments: [...currentAtts, newAttachment] 
          })
          .eq('id', attachingToMessageId)

        if (updateError) throw updateError
        toast.success("Anexo adicionado", { id: toastId })
        fetchMessages()
      }
    } catch (err) {
      console.error("Erro ao anexo:", err)
      toast.error("Erro ao adicionar anexo", { id: toastId })
    } finally {
      setIsUpdating(false)
      setAttachingToMessageId(null)
      if (messageFileInputRef.current) messageFileInputRef.current.value = ""
    }
  }

  const applyFormat = (prefix: string, suffix: string = '', isEdit: boolean = false) => {
    const textarea = isEdit ? editContentTextareaRef.current : replyTextareaRef.current;
    if (!textarea) return;
    
    // Garantir o foco no textarea antes de qualquer operação
    textarea.focus();
    
    const value = isEdit ? editContent : reply;
    const setValue = isEdit ? setEditContent : setReply;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const before = value.substring(0, start);
    const after = value.substring(end);
    
    const newText = before + prefix + selectedText + suffix + after;
    setValue(newText);
    
    // Restaurar a seleção após o render
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const filteredStatuses = availableStatuses.filter(s => 
    s.nome.toLowerCase().includes(statusSearchTerm.toLowerCase())
  );

  const selectedStatus = availableStatuses.find(s => s.id === selectedStatusId);

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-white border-t border-slate-100 h-[950px] max-h-[1050px] flex flex-col">
      <input 
        type="file" 
        ref={messageFileInputRef} 
        className="hidden" 
        onChange={handleAddAttachmentToMessage}
      />

      {/* Painel de Margens e Coeficientes */}
      <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Detalhamento de Margens e Operações</h3>
          </div>
          {ticket.convenio && (
            <span className="px-2.5 py-1 bg-slate-100 rounded text-[9px] font-bold text-slate-600 uppercase">
              {ticket.convenio}
            </span>
          )}
        </div>
        
        <div className="space-y-4">
          {/* Margem principal / 35% */}
          {getMarginLabel('margem') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  {getMarginLabel('margem')}
                </label>
                <Input
                  id="margin-val-margem"
                  value={ticketMargins.margem}
                  onChange={(e) => handleMarginChange('margem', e.target.value)}
                  readOnly={!canEditMargins}
                  placeholder="R$ 0,00"
                  className={cn(
                    "h-[34px] text-[12px] font-bold transition-all",
                    getMarginStyleClasses(ticketMargins.margem)
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  COEFICIENTE
                </label>
                <Input
                  id="coef-val-margem"
                  value={ticketCoefficients.margem}
                  onChange={(e) => handleCoefChange('margem', e.target.value)}
                  readOnly={!canEditMargins}
                  placeholder="0,0000"
                  className={cn(
                    "h-[34px] text-[12px] font-bold transition-all",
                    getMarginStyleClasses(ticketMargins.margem)
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  VALOR OPERAÇÃO
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="op-val-margem"
                    value={ticketOperations.margem}
                    onChange={(e) => handleOpChange('margem', e.target.value)}
                    readOnly={!canEditMargins}
                    placeholder="R$ 0,00"
                    className={cn(
                      "h-[34px] text-[12px] font-bold transition-all flex-1",
                      getMarginStyleClasses(ticketMargins.margem)
                    )}
                  />
                  <label className="flex items-center gap-1 cursor-pointer select-none bg-slate-100 hover:bg-slate-200 px-2 h-[34px] rounded-lg border border-slate-200 transition-all text-[10px] font-bold text-slate-700 shrink-0">
                    <input
                      type="radio"
                      name="selected_operation"
                      checked={selectedOperationType === 'margem'}
                      onChange={() => setSelectedOperationType('margem')}
                      className="w-3 h-3 text-primary border-slate-300 focus:ring-primary cursor-pointer"
                    />
                    <span>SELECIONAR ESSE</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Margem Líquida 5% */}
          {getMarginLabel('liquida5') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  {getMarginLabel('liquida5')}
                </label>
                <Input
                  id="margin-val-liquida5"
                  value={ticketMargins.liquida5}
                  onChange={(e) => handleMarginChange('liquida5', e.target.value)}
                  readOnly={!canEditMargins}
                  placeholder="R$ 0,00"
                  className={cn(
                    "h-[34px] text-[12px] font-bold transition-all",
                    getMarginStyleClasses(ticketMargins.liquida5)
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  COEFICIENTE
                </label>
                <Input
                  id="coef-val-liquida5"
                  value={ticketCoefficients.liquida5}
                  onChange={(e) => handleCoefChange('liquida5', e.target.value)}
                  readOnly={!canEditMargins}
                  placeholder="0,0000"
                  className={cn(
                    "h-[34px] text-[12px] font-bold transition-all",
                    getMarginStyleClasses(ticketMargins.liquida5)
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  VALOR OPERAÇÃO
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="op-val-liquida5"
                    value={ticketOperations.liquida5}
                    onChange={(e) => handleOpChange('liquida5', e.target.value)}
                    readOnly={!canEditMargins}
                    placeholder="R$ 0,00"
                    className={cn(
                      "h-[34px] text-[12px] font-bold transition-all flex-1",
                      getMarginStyleClasses(ticketMargins.liquida5)
                    )}
                  />
                  <label className="flex items-center gap-1 cursor-pointer select-none bg-slate-100 hover:bg-slate-200 px-2 h-[34px] rounded-lg border border-slate-200 transition-all text-[10px] font-bold text-slate-700 shrink-0">
                    <input
                      type="radio"
                      name="selected_operation"
                      checked={selectedOperationType === 'liquida5'}
                      onChange={() => setSelectedOperationType('liquida5')}
                      className="w-3 h-3 text-primary border-slate-300 focus:ring-primary cursor-pointer"
                    />
                    <span>SELECIONAR ESSE</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Margem Benefício 5% */}
          {getMarginLabel('beneficio5') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  {getMarginLabel('beneficio5')}
                </label>
                <Input
                  id="margin-val-beneficio5"
                  value={ticketMargins.beneficio5}
                  onChange={(e) => handleMarginChange('beneficio5', e.target.value)}
                  readOnly={!canEditMargins}
                  placeholder="R$ 0,00"
                  className={cn(
                    "h-[34px] text-[12px] font-bold transition-all",
                    getMarginStyleClasses(ticketMargins.beneficio5)
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  COEFICIENTE
                </label>
                <Input
                  id="coef-val-beneficio5"
                  value={ticketCoefficients.beneficio5}
                  onChange={(e) => handleCoefChange('beneficio5', e.target.value)}
                  readOnly={!canEditMargins}
                  placeholder="0,0000"
                  className={cn(
                    "h-[34px] text-[12px] font-bold transition-all",
                    getMarginStyleClasses(ticketMargins.beneficio5)
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  VALOR OPERAÇÃO
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="op-val-beneficio5"
                    value={ticketOperations.beneficio5}
                    onChange={(e) => handleOpChange('beneficio5', e.target.value)}
                    readOnly={!canEditMargins}
                    placeholder="R$ 0,00"
                    className={cn(
                      "h-[34px] text-[12px] font-bold transition-all flex-1",
                      getMarginStyleClasses(ticketMargins.beneficio5)
                    )}
                  />
                  <label className="flex items-center gap-1 cursor-pointer select-none bg-slate-100 hover:bg-slate-200 px-2 h-[34px] rounded-lg border border-slate-200 transition-all text-[10px] font-bold text-slate-700 shrink-0">
                    <input
                      type="radio"
                      name="selected_operation"
                      checked={selectedOperationType === 'beneficio5'}
                      onChange={() => setSelectedOperationType('beneficio5')}
                      className="w-3 h-3 text-primary border-slate-300 focus:ring-primary cursor-pointer"
                    />
                    <span>SELECIONAR ESSE</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {canEditMargins && (
          <div className="flex justify-end pt-2">
            <Button
              id="btn-save-margins"
              type="button"
              onClick={handleSaveMargins}
              disabled={isSavingMargins}
              className="h-8 text-[11px] font-bold bg-[#171717] hover:bg-black text-white px-4 rounded-lg flex items-center gap-1.5 shadow transition-all"
            >
              {isSavingMargins ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Salvar Margens e Operações
                </>
              )}
            </Button>
          </div>
        )}
      </div>
      <div 
        className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar" 
        ref={scrollRef}
        onScroll={handleScroll}
      >
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
            <div key={msg.id} className="flex flex-col sm:flex-row gap-4 text-left animate-in fade-in slide-in-from-bottom-2 duration-500 group">
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm ring-1 ring-slate-100">
                <Image 
                  src={msg.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.user_nome || 'Usuário')}&background=random`} 
                  alt={msg.user_nome || "Avatar do usuário"} 
                  fill 
                  className="object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-bold text-slate-900">{msg.user_nome}</span>
                      <span className="text-[11px] italic text-slate-400">
                        {msg.action === 'pediu_apoio' 
                          ? (msg.user_role?.toLowerCase() === 'estágio' || msg.user_role?.toLowerCase() === 'estagio' ? 'solicitou apoio no atendimento 🆘' : 'solicitou apoio na venda 🆘')
                          : msg.action === 'resolveu_apoio' 
                          ? (msg.user_role?.toLowerCase() === 'estágio' || msg.user_role?.toLowerCase() === 'estagio' ? 'concluiu o apoio no atendimento ✅' : 'concluiu o apoio na venda ✅')
                          : msg.action === 'alterou o valor da operação'
                          ? 'alterou o valor da operação 💰'
                          : msg.action}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-[10px] font-bold uppercase tracking-tight text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
                      onClick={() => {
                        setEditingMessageId(msg.id)
                        setEditContent(msg.content || "")
                      }}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-[10px] font-bold uppercase tracking-tight text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
                      onClick={() => {
                        setAttachingToMessageId(msg.id)
                        messageFileInputRef.current?.click()
                      }}
                    >
                      <Paperclip className="w-3 h-3 mr-1" />
                      Anexar
                    </Button>
                  </div>
                </div>
                
                {msg.content && (
                  <div className={cn(
                    "rounded-xl p-4 border transition-colors",
                    msg.action === 'pediu_apoio' 
                      ? "bg-rose-50/40 border-rose-100/75 group hover:border-rose-200" 
                      : msg.action === 'resolveu_apoio'
                      ? "bg-emerald-50/40 border-emerald-100/75 group hover:border-emerald-200"
                      : msg.action === 'alterou o valor da operação'
                      ? "bg-amber-50/40 border-amber-100/75 group hover:border-amber-200"
                      : "bg-slate-50/50 border-slate-100 group hover:border-primary/20"
                  )}>
                    {editingMessageId === msg.id ? (
                      <div className="space-y-3">
                        <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm">
                          <div className="bg-slate-50 border-bottom border-slate-200 p-2 flex flex-wrap gap-1">
                            <ToolbarButton icon={<Bold className="w-3.5 h-3.5" />} onClick={() => applyFormat('**', '**', true)} />
                            <ToolbarButton icon={<Italic className="w-3.5 h-3.5" />} onClick={() => applyFormat('*', '*', true)} />
                            <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
                            <ToolbarButton icon={<Quote className="w-3.5 h-3.5" />} onClick={() => applyFormat('> ', '', true)} />
                            <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
                            <ToolbarButton icon={<List className="w-3.5 h-3.5" />} onClick={() => applyFormat('\n- ', '', true)} />
                            <ToolbarButton icon={<ListOrdered className="w-3.5 h-3.5" />} onClick={() => applyFormat('\n1. ', '', true)} />
                          </div>
                          <textarea 
                            ref={editContentTextareaRef}
                            className="w-full min-h-[100px] p-3 text-sm focus:outline-none bg-white"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="text-[10px] font-bold uppercase"
                             onClick={() => setEditingMessageId(null)}
                           >
                             Cancelar
                           </Button>
                           <Button 
                             size="sm" 
                             className="text-[10px] font-bold uppercase h-8 px-4"
                             onClick={handleUpdateMessage}
                             disabled={isUpdating}
                           >
                             {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                             Salvar
                           </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="markdown-body text-sm text-slate-600 break-words leading-relaxed">
                        <ReactMarkdown 
                          components={{
                            img: ({ ...props }) => (
                              <img 
                                {...props} 
                                alt={props.alt || "Anexo do chamado"}
                                className="max-w-full rounded-lg shadow-sm border border-slate-200 mt-2 mb-2 hover:scale-[1.02] transition-transform cursor-pointer" 
                                onClick={() => props.src && window.open(props.src, '_blank')}
                              />
                            ),
                            p: ({ children }) => <p className="mb-2 last:mb-0 italic">{children}</p>
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
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
            <ToolbarButton icon={<Bold className="w-3.5 h-3.5" />} onClick={() => applyFormat('**', '**')} />
            <ToolbarButton icon={<Italic className="w-3.5 h-3.5" />} onClick={() => applyFormat('*', '*')} />
            <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
            <ToolbarButton icon={<Quote className="w-3.5 h-3.5" />} onClick={() => applyFormat('> ')} />
            <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
            <ToolbarButton icon={<List className="w-3.5 h-3.5" />} onClick={() => applyFormat('\n- ')} />
            <ToolbarButton icon={<ListOrdered className="w-3.5 h-3.5" />} onClick={() => applyFormat('\n1. ')} />
            <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
            <ToolbarButton icon={<Link2 className="w-3.5 h-3.5" />} onClick={() => applyFormat('[', '](url)')} />
            <ToolbarButton icon={<ImageIcon className="w-3.5 h-3.5" />} onClick={() => applyFormat('![', '](url)')} />
            <ToolbarButton icon={<Type className="w-3.5 h-3.5" />} onClick={() => applyFormat('### ')} />
          </div>
          <textarea 
            ref={replyTextareaRef}
            className="w-full min-h-[100px] max-h-[300px] p-4 text-[13px] focus:outline-none resize-none bg-white font-medium text-slate-700 leading-relaxed"
            placeholder="Digite sua resposta aqui e pressione Enviar..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onPaste={handlePaste}
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSendMessage()
              }
            }}
          />
          {selectedFiles.some(f => f.type.startsWith('image/')) && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-3">
              {selectedFiles.filter(f => f.type.startsWith('image/')).map((file, idx) => (
                <div key={idx} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shadow-sm animate-in zoom-in-95 duration-200">
                  <Image 
                    src={URL.createObjectURL(file)} 
                    alt="Preview" 
                    fill 
                    className="object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                       onClick={() => removeFile(selectedFiles.indexOf(file))}
                       className="bg-white rounded-full p-1 border border-slate-100 hover:bg-red-50 hover:text-red-500 transition-all shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-full">
          <div className="space-y-4 w-full text-left">
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
            <div className="flex flex-wrap items-center gap-2 w-full">
              {/* Status Selector UI */}
              <div className="flex flex-col gap-1 relative" ref={statusDropdownRef}>
                <label className="text-[9px] font-bold text-slate-500/80 uppercase tracking-widest pl-1">ALTERAR STATUS</label>
                
                <div 
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="h-[38px] px-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between cursor-pointer min-w-[180px] hover:border-primary/30 transition-all shadow-sm"
                >
                  <span className="text-[11px] font-bold text-slate-600 uppercase">
                    {selectedStatus?.nome || "SELECIONE UM STATUS"}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isStatusDropdownOpen && "rotate-180")} />
                </div>

                {isStatusDropdownOpen && (
                  <div className="absolute top-[18px] left-0 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden flex flex-col max-h-[300px]">
                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-50 bg-slate-50/50 sticky top-0 z-10">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                          autoFocus
                          type="text"
                          placeholder="Buscar status..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          value={statusSearchTerm}
                          onChange={(e) => setStatusSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Options List */}
                    <div className="overflow-y-auto custom-scrollbar p-1">
                      {filteredStatuses.length > 0 ? (
                        filteredStatuses.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedStatusId(s.id)
                              setIsStatusDropdownOpen(false)
                              setStatusSearchTerm("")
                            }}
                            className={cn(
                              "px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-between group",
                              selectedStatusId === s.id 
                                ? "bg-primary text-white" 
                                : "text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <span>{s.nome}</span>
                            {selectedStatusId === s.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-[10px] text-slate-400 italic">
                          Nenhum status encontrado
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
              <Button 
                variant="outline"
                onClick={handleFileClick}
                className="h-[38px] px-6 text-[10px] font-bold text-primary uppercase tracking-wider border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all flex items-center gap-2"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Anexar Arquivos
              </Button>
              {!isUserEstagio && (
                <Link 
                  href={`/propostas/nova?${new URLSearchParams({
                    nome: ticket.client || "",
                    cpf: ticket.cpf || "",
                    nascimento: "31/01/1984",
                    idLead: ticket.matricula || ticket.id,
                    idChamado: ticket.id || "",
                    matricula: ticket.matricula || "",
                    origem: ticket.origin?.toLowerCase() || "",
                    tel1: ticket.phone || "",
                    tel2: ticket.phone_2 || "",
                    tel3: ticket.phone_3 || "",
                  }).toString()}`}
                  className="h-[38px] px-6 text-[10px] font-bold text-white uppercase tracking-wider bg-orange-500 hover:bg-orange-600 shadow-md transition-all flex items-center gap-2 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  DIGITAR PROPOSTA
                </Link>
              )}

              {isSupervisorOrAbove && hasActiveApoio ? (
                <Button 
                  onClick={handleResolveApoio}
                  disabled={isResolvingApoio}
                  className="h-[38px] px-6 text-[10px] font-bold text-white uppercase tracking-wider bg-rose-600 hover:bg-rose-700 shadow-md transition-all flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isResolvingApoio ? 'FINALIZANDO...' : 'FINALIZAR APOIO'}
                </Button>
              ) : canAskForSupport ? (
                <Button 
                  onClick={() => setIsApoioModalOpen(true)}
                  className="h-[38px] px-6 text-[10px] font-bold text-white uppercase tracking-wider bg-rose-600 hover:bg-rose-700 shadow-md transition-all flex items-center gap-2"
                >
                  <LifeBuoy className="w-3.5 h-3.5" />
                  {isUserEstagio ? 'PEDIR APOIO NO ATENDIMENTO' : 'PEDIR APOIO NA VENDA'}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Pedido de Apoio na Venda */}
      {isApoioModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-rose-600 animate-pulse" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{isUserEstagio ? 'Pedir Apoio no Atendimento' : 'Pedir Apoio na Venda'}</h3>
              </div>
              <button 
                onClick={() => setIsApoioModalOpen(false)} 
                className="p-1 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide leading-normal">
                {isUserEstagio ? 'Explique brevemente ao supervisor qual é o impasse ou a ajuda de que você precisa para este atendimento:' : 'Explique brevemente ao supervisor qual é o impasse ou a ajuda de que você precisa para destravar esta venda:'}
              </p>
              <textarea
                value={apoioMessage}
                onChange={(e) => setApoioMessage(e.target.value)}
                placeholder={isUserEstagio ? "Ex: Dúvida sobre o sistema ou ajuda com os dados" : "Ex: Cliente quer taxa menor ou Negociação travada no prazo"}
                className="w-full h-28 p-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all bg-slate-50/50 resize-none text-slate-700"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsApoioModalOpen(false)}
                className="h-[34px] px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 rounded-lg"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendApoio}
                disabled={!apoioMessage.trim() || isSendingApoio}
                className="h-[34px] px-5 text-[10px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-md transition-all flex items-center gap-1.5"
              >
                {isSendingApoio ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToolbarButton({ icon, onClick }: { icon: React.ReactNode, onClick?: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()} // Impede o roubo de foco do textarea
      className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-primary"
    >
      {icon}
    </button>
  )
}
