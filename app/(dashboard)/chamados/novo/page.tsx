"use client"

import { useState, useRef, Suspense, useEffect } from "react"
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
  List, 
  ListOrdered, 
  Link2, 
  UploadCloud,
  Loader2,
  Check
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { withRetry, cn } from "@/lib/utils"

function NewTicketForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, perfil } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [description, setDescription] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)

  const [originalMargins] = useState({
    margem: searchParams.get("margem") || "",
    liquida5: searchParams.get("liquida5") || "",
    beneficio5: searchParams.get("beneficio5") || ""
  })

  const isFromClient = !!searchParams.get("nome")

  const [formData, setFormData] = useState({
    origem: searchParams.get("origem") || "",
    equipe: perfil?.supervisor_nome || "",
    nome: searchParams.get("nome") || "",
    cpf: searchParams.get("cpf") || "",
    tel1: searchParams.get("tel1") || "",
    tel2: searchParams.get("tel2") || "",
    tel3: searchParams.get("tel3") || "",
    margem: "", 
    liquida5: "", 
    beneficio5: "", 
    convenio: searchParams.get("convenio") || ""
  })

  // Selected files state
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File | null }>({
    frente: null,
    verso: null,
    contracheque: null,
    extrato: null,
    outros: null
  })

  // Ticket number state (using a timestamp-based ID or fetching last)
  const [ticketNumber, setTicketNumber] = useState<string>("...")

  useEffect(() => {
    const fetchLastTicket = async () => {
      const { data, error } = await supabase
        .from('chamados')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
      
      if (!error && data && data.length > 0) {
        setTicketNumber((parseInt(data[0].id) + 1).toString())
      } else {
        setTicketNumber("34560") // Fallback
      }
    }
    fetchLastTicket()
  }, [])

  // Auto-fill supervisor info for Corretores
  useEffect(() => {
    const fillSupervisor = async () => {
      // Se já temos o nome no perfil e o campo está vazio, preenchemos
      if (perfil?.supervisor_nome && !formData.equipe) {
        setFormData(prev => ({ ...prev, equipe: perfil.supervisor_nome }));
        return;
      }

      // Se temos o ID mas não o nome no perfil, buscamos via API otimizada
      if (perfil?.supervisor_id && !formData.equipe) {
        try {
          const res = await fetch(`/api/usuarios?id=${perfil.supervisor_id}`);
          if (res.ok) {
            const supervisorData = await res.json();
            if (supervisorData.nome) {
              setFormData(prev => ({ ...prev, equipe: supervisorData.nome }));
            }
          }
        } catch (err) {
          console.error("Erro ao buscar supervisor:", err);
        }
      }
    };

    fillSupervisor();
  }, [perfil, formData.equipe])
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const fileRefs = {
    frente: useRef<HTMLInputElement>(null),
    verso: useRef<HTMLInputElement>(null),
    contracheque: useRef<HTMLInputElement>(null),
    extrato: useRef<HTMLInputElement>(null),
    outros: useRef<HTMLInputElement>(null)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (validationError) setValidationError(null)
  }

  const updateDescription = (margins: { margem: string, liquida5: string, beneficio5: string }) => {
    // Build the introductory text
    const activeLabels = [];
    if (margins.margem) activeLabels.push(`35% (${margins.margem})`);
    if (margins.liquida5) activeLabels.push(`LÍQUIDA 5% (${margins.liquida5})`);
    if (margins.beneficio5) activeLabels.push(`BENEFÍCIO LÍQUIDA 5% (${margins.beneficio5})`);

    let introText = "";
    if (activeLabels.length > 0) {
      if (activeLabels.length === 1) {
        introText = `Esse chamado é para a margem ${activeLabels[0]}.`;
      } else {
        introText = `Esse chamado é para a margem ${activeLabels.join(" e margem ")}.`;
      }
    }

    setDescription(prevDesc => {
      const lines = prevDesc.split("\n");
      const introIndex = lines.findIndex(l => l.startsWith("Esse chamado é para a margem"));
      
      if (introText) {
        if (introIndex >= 0) {
          lines[introIndex] = introText;
        } else {
          return introText + (prevDesc ? "\n\n" + prevDesc : "");
        }
      } else if (introIndex >= 0) {
        lines.splice(introIndex, 1);
        if (lines[0] === "") lines.shift();
        if (lines[0] === "") lines.shift();
      }
      return lines.join("\n");
    });
  }

  const handleMarginInputChange = (field: string, value: string) => {
    // Currency mask logic
    const cleanValue = value.replace(/\D/g, "");
    let formattedValue = "";
    
    if (cleanValue) {
      const numberValue = (parseFloat(cleanValue) / 100).toFixed(2);
      const parts = numberValue.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      formattedValue = `R$ ${parts.join(",")}`;
    }

    setFormData(prev => {
      // Quando preenchemos uma margem, limpamos todas as outras primeiro (seleção exclusiva)
      const nextData = { 
        ...prev, 
        margem: "", 
        liquida5: "", 
        beneficio5: "",
        [field]: formattedValue 
      };
      
      updateDescription({
        margem: nextData.margem,
        liquida5: nextData.liquida5,
        beneficio5: nextData.beneficio5
      });
      return nextData;
    });

    if (validationError) setValidationError(null)
  }

  const clearMargins = () => {
    setFormData(prev => {
      const nextData = { ...prev, margem: "", liquida5: "", beneficio5: "" };
      updateDescription({ margem: "", liquida5: "", beneficio5: "" });
      return nextData;
    });
  }

  const handleFileClick = (ref: React.RefObject<HTMLInputElement | null>) => {
    ref.current?.click()
  }

  const handleFileChange = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFiles(prev => ({ ...prev, [field]: file }))
  }

  const uploadFile = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const fullPath = `${path}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('chamados-attachments')
      .upload(fullPath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('chamados-attachments')
      .getPublicUrl(fullPath)

    return data.publicUrl
  }

  const toggleMargin = (field: string, value: string) => {
    const isSelected = !!formData[field as keyof typeof formData];
    
    setFormData(prev => {
      // Quando selecionamos uma margem, limpamos todas as outras primeiro (seleção exclusiva)
      const nextData = { 
        ...prev, 
        margem: "", 
        liquida5: "", 
        beneficio5: "",
        [field]: isSelected ? "" : value 
      };
      
      updateDescription({
        margem: nextData.margem,
        liquida5: nextData.liquida5,
        beneficio5: nextData.beneficio5
      });
      return nextData;
    });

    if (validationError) setValidationError(null)
  }

  const applyFormat = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd, value } = textareaRef.current;
    
    const selectedText = value.substring(selectionStart, selectionEnd);
    const beforeText = value.substring(0, selectionStart);
    const afterText = value.substring(selectionEnd);
    
    const newValue = `${beforeText}${prefix}${selectedText}${suffix}${afterText}`;
    setDescription(newValue);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const start = selectionStart + prefix.length;
        const end = selectionEnd + prefix.length;
        textareaRef.current.setSelectionRange(start, end);
      }
    }, 0);
  };

  const handleSubmit = async () => {
    console.log("Iniciando submissão do chamado...");
    setValidationError(null);
    
    if (!user) {
      console.error("Usuário não autenticado.");
      toast.error("Você precisa estar logado para abrir um chamado.");
      return;
    }

    // Campos obrigatórios básicos com mensagens específicas
    if (!formData.origem) {
      setValidationError("POR FAVOR, SELECIONE A ORIGEM DO CLIENTE");
      return;
    }
    if (!formData.convenio) {
      setValidationError("POR FAVOR, SELECIONE O CONVÊNIO");
      return;
    }
    if (!formData.nome) {
      setValidationError("POR FAVOR, INFORME O NOME DO CLIENTE");
      return;
    }
    if (!formData.cpf) {
      setValidationError("POR FAVOR, INFORME O CPF DO CLIENTE");
      return;
    }
    if (!formData.tel1) {
      setValidationError("POR FAVOR, INFORME O TELEFONE DO CLIENTE");
      return;
    }
    if (!description) {
      setValidationError("POR FAVOR, PREENCHA A DESCRIÇÃO DO CHAMADO");
      return;
    }

    // Validação de margem obrigatória (como indicado no formulário com *)
    if (!formData.margem && !formData.liquida5 && !formData.beneficio5) {
      console.warn("Nenhuma margem selecionada.");
      setValidationError("POR FAVOR, SELECIONE OU INFORME AO MENOS UMA MARGEM");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Enviando chamado e anexos...");

    try {
      console.log("Iniciando upload de arquivos...");
      const fileUrls: { [key: string]: string | null } = {
        frente: null,
        verso: null,
        contracheque: null,
        extrato: null,
        outros: null
      };

      // Sequencial para melhor controle de erro no log
      for (const [key, file] of Object.entries(selectedFiles)) {
        if (file) {
          try {
            console.log(`Enviando arquivo: ${key}...`);
            const url = await uploadFile(file, `${user.id}/${Date.now()}`);
            fileUrls[key] = url;
            console.log(`Arquivo ${key} enviado com sucesso:`, url);
          } catch (uploadErr: any) {
            console.error(`Erro ao enviar arquivo ${key}:`, uploadErr);
            throw new Error(`Falha no upload do arquivo ${key}: ${uploadErr.message || 'Erro desconhecido'}`);
          }
        }
      }

      console.log("Convertendo valores monetários...");
      const cleanMoney = (val: string) => {
        if (!val) return 0;
        const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
        return parseFloat(cleaned) || 0;
      };

      const cleanCPF = (val: string) => val.replace(/\D/g, "");

      // Adiciona informações de margens adicionais na descrição se selecionadas
      let finalDescription = description;
      const extraMargins = [];
      if (formData.liquida5) extraMargins.push(`Líquida 5%: ${formData.liquida5}`);
      if (formData.beneficio5) extraMargins.push(`Benefício Líquida 5%: ${formData.beneficio5}`);
      
      if (extraMargins.length > 0) {
        finalDescription += `\n\n--- MARGENS SELECIONADAS ---\n${extraMargins.join("\n")}`;
      }

      console.log("Enviando dados para o banco de dados...");
      
      // Buscar o ID do status 'ABERTO' dinamicamente
      const { data: statusData } = await supabase
        .from('status_chamados')
        .select('id')
        .eq('nome', 'ABERTO')
        .maybeSingle();

      const { error } = await withRetry(() => 
        supabase.from('chamados').insert({
          status: 'ABERTO',
          status_id: statusData?.id || null, // Relacionamento dinâmico
          origem: formData.origem,
          cliente_nome: formData.nome,
          cliente_cpf: cleanCPF(formData.cpf),
          cliente_telefone: formData.tel1,
          cliente_telefone_2: formData.tel2 || null,
          cliente_telefone_3: formData.tel3 || null,
          margem: cleanMoney(formData.margem),
          convenio: formData.convenio,
          equipe: formData.equipe,
          descricao: finalDescription,
          user_id: user.id,
          user_nome: perfil?.nome || user.email || "Usuário",
          user_avatar: perfil?.avatar_url || null,
          arquivo_rg_frente: fileUrls.frente,
          arquivo_rg_verso: fileUrls.verso,
          arquivo_contracheque: fileUrls.contracheque,
          arquivo_extrato: fileUrls.extrato,
          arquivo_outros: fileUrls.outros
        })
      );

      if (error) {
        console.error("Erro retornado pelo Supabase (RPC/Insert):", error);
        throw error;
      }

      console.log("Chamado aberto com sucesso!");
      toast.dismiss(loadingToast);
      toast.success("Chamado aberto com sucesso!");
      router.push("/chamados");
    } catch (error: any) {
      console.error("Erro crítico no handleSubmit:", error);
      toast.dismiss(loadingToast);
      toast.error(`Erro ao abrir chamado: ${error.message || "Tente novamente."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header title="ABRIR CHAMADO" />
      
      <main className="flex-1 p-6 bg-slate-50/50">
        <Card className="card-shadow border border-slate-200 overflow-hidden">
          <CardContent className="p-4 sm:p-8">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-100 pb-8">
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  Chamado nº <span className="text-slate-900 font-bold text-lg ml-2 normal-case tracking-normal">{ticketNumber}</span>
                </p>
              </div>
              <div className="w-full sm:w-72 space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Convênio <span className="text-red-500">*</span>
                </label>
                <select 
                  value={formData.convenio}
                  onChange={(e) => handleInputChange("convenio", e.target.value)}
                  className="w-full h-[34px] px-3 rounded-lg border border-slate-100 bg-[#E8E8E8] text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                >
                  <option value="">Selecione</option>
                  <option value="FEDERAL">FEDERAL</option>
                  <option value="GOVERNO SÃO PAULO">GOVERNO SÃO PAULO</option>
                  <option value="OUTROS">OUTROS</option>
                </select>
              </div>
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
                      className="w-full h-[34px] px-3 rounded-lg border border-slate-100 bg-[#E8E8E8] text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    >
                      <option value="">Selecione</option>
                      <option value="DISPARO">DISPARO</option>
                      <option value="TRÁFEGO">TRÁFEGO</option>
                      <option value="INDICAÇÃO">INDICAÇÃO</option>
                      <option value="CLIENTE DA CASA">CLIENTE DA CASA</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      EQUIPE COMERCIAL <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={formData.equipe}
                      onChange={(e) => handleInputChange("equipe", e.target.value)}
                      placeholder="" 
                      className="h-[34px] border-slate-100 bg-[#E8E8E8] text-[12px]"
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
                      className="h-[34px] border-slate-100 bg-[#E8E8E8] text-[12px]"
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
                      className="h-[34px] border-slate-100 bg-[#E8E8E8] text-[12px]"
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
                      className="h-[34px] border-slate-100 bg-[#E8E8E8] text-[12px]"
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
                      className="h-[34px] border-slate-100 bg-[#E8E8E8] text-[12px]"
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
                      className="h-[34px] border-slate-100 bg-[#E8E8E8] text-[12px]"
                    />
                  </div>
                </div>

                {/* Row 4: Margens */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-end">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Margem 35% <span className="text-red-500">*</span>
                    </label>
                    {isFromClient && originalMargins.margem ? (
                      <button
                        type="button"
                        onClick={() => toggleMargin("margem", originalMargins.margem)}
                        className={cn(
                          "w-full h-[34px] rounded-lg border text-[12px] font-bold transition-all flex items-center justify-start px-4 gap-2",
                          formData.margem 
                            ? "bg-[#171717] text-white border-[#171717] shadow-sm" 
                            : "bg-[#E8E8E8] text-slate-500 border-slate-100 hover:bg-slate-200"
                        )}
                      >
                        {formData.margem && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{originalMargins.margem}</span>
                      </button>
                    ) : (
                      <Input 
                        value={formData.margem}
                        onChange={(e) => handleMarginInputChange("margem", e.target.value)}
                        placeholder="R$ 0,00" 
                        className={cn(
                          "h-[34px] border-slate-100 text-[12px] transition-all",
                          formData.margem 
                            ? "bg-[#171717] text-white border-[#171717]" 
                            : "bg-[#E8E8E8] text-slate-900"
                        )}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Líquida 5%
                    </label>
                    {isFromClient && originalMargins.liquida5 ? (
                      <button
                        type="button"
                        onClick={() => toggleMargin("liquida5", originalMargins.liquida5)}
                        className={cn(
                          "w-full h-[34px] rounded-lg border text-[12px] font-bold transition-all flex items-center justify-start px-4 gap-2",
                          formData.liquida5 
                            ? "bg-[#171717] text-white border-[#171717] shadow-sm" 
                            : "bg-[#E8E8E8] text-slate-500 border-slate-100 hover:bg-slate-200"
                        )}
                      >
                        {formData.liquida5 && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{originalMargins.liquida5}</span>
                      </button>
                    ) : (
                      <Input 
                        value={formData.liquida5}
                        onChange={(e) => handleMarginInputChange("liquida5", e.target.value)}
                        placeholder="R$ 0,00" 
                        className={cn(
                          "h-[34px] border-slate-100 text-[12px] transition-all",
                          formData.liquida5 
                            ? "bg-[#171717] text-white border-[#171717]" 
                            : "bg-[#E8E8E8] text-slate-900"
                        )}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Benefício Líquida 5%
                    </label>
                    {isFromClient && originalMargins.beneficio5 ? (
                      <button
                        type="button"
                        onClick={() => toggleMargin("beneficio5", originalMargins.beneficio5)}
                        className={cn(
                          "w-full h-[34px] rounded-lg border text-[12px] font-bold transition-all flex items-center justify-start px-4 gap-2",
                          formData.beneficio5 
                            ? "bg-[#171717] text-white border-[#171717] shadow-sm" 
                            : "bg-[#E8E8E8] text-slate-500 border-slate-100 hover:bg-slate-200"
                        )}
                      >
                        {formData.beneficio5 && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{originalMargins.beneficio5}</span>
                      </button>
                    ) : (
                      <Input 
                        value={formData.beneficio5}
                        onChange={(e) => handleMarginInputChange("beneficio5", e.target.value)}
                        placeholder="R$ 0,00" 
                        className={cn(
                          "h-[34px] border-slate-100 text-[12px] transition-all",
                          formData.beneficio5 
                            ? "bg-[#171717] text-white border-[#171717]" 
                            : "bg-[#E8E8E8] text-slate-900"
                        )}
                      />
                    )}
                  </div>

                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={clearMargins}
                      className="text-[10px] font-extrabold text-slate-700 hover:text-slate-900 transition-colors uppercase tracking-wider h-[34px] flex items-center px-2"
                    >
                      LIMPAR
                    </button>
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
                  <ToolbarButton 
                    onClick={() => applyFormat("**")} 
                    icon={<Bold className="w-3.5 h-3.5" />} 
                  />
                  <ToolbarButton 
                    onClick={() => applyFormat("_")} 
                    icon={<Italic className="w-3.5 h-3.5" />} 
                  />
                  <ToolbarButton 
                    onClick={() => applyFormat("<u>", "</u>")} 
                    icon={<Underline className="w-3.5 h-3.5" />} 
                  />
                  <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
                  <ToolbarButton 
                    onClick={() => applyFormat("> ")} 
                    icon={<Quote className="w-3.5 h-3.5" />} 
                  />
                  <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
                  <ToolbarButton 
                    onClick={() => applyFormat("\n- ")} 
                    icon={<List className="w-3.5 h-3.5" />} 
                  />
                  <ToolbarButton 
                    onClick={() => applyFormat("\n1. ")} 
                    icon={<ListOrdered className="w-3.5 h-3.5" />} 
                  />
                  <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
                  <ToolbarButton 
                    onClick={() => applyFormat("[", "](url)")} 
                    icon={<Link2 className="w-3.5 h-3.5" />} 
                  />
                </div>
                <textarea 
                  ref={textareaRef}
                  className="w-full min-h-[200px] p-4 text-[12px] focus:outline-none resize-none bg-[#E8E8E8]"
                  placeholder="Descreva aqui a solicitação..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    if (validationError) setValidationError(null)
                  }}
                />
              </div>
            </div>

            <div className="mb-6">
              <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">Anexar RG VERSO somente se não tiver enviado um CNH.</p>
              <p className="text-[10px] text-slate-400">Você pode enviar arquivos com tamanho máximo de 20 mb dos tipos jpg, jpeg, png, webp, gif, pdf, doc, docx, ppt, pptx, pps, ppsx, odt, xls, xlsx.</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                   { label: "RG ou CNH (FRENTE)", id: "frente", ref: fileRefs.frente, required: false },
                   { label: "RG (VERSO)", id: "verso", ref: fileRefs.verso, required: false },
                   { label: "CONTRA CHEQUE", id: "contracheque", ref: fileRefs.contracheque, required: false },
                   { label: "EXTRATO DE CONSIGNAÇÃO", id: "extrato", ref: fileRefs.extrato, required: false },
                   { label: "OUTROS", id: "outros", ref: fileRefs.outros, required: false }
                ].map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <div 
                      onClick={() => handleFileClick(field.ref)}
                      className={cn(
                        "w-full h-[34px] px-3 rounded-lg border text-[12px] flex items-center gap-2 cursor-pointer transition-all",
                        selectedFiles[field.id]
                          ? "bg-[#171717] text-white border-[#171717] shadow-sm"
                          : "bg-[#E8E8E8] text-slate-500 border-slate-100 hover:bg-slate-200"
                      )}
                    >
                      <UploadCloud className={cn("w-4 h-4", selectedFiles[field.id] ? "text-white" : "text-slate-500")} />
                      <span className={cn("truncate", selectedFiles[field.id] ? "text-white font-medium" : "text-slate-500")}>
                        {selectedFiles[field.id] ? selectedFiles[field.id]?.name : "Selecionar arquivo..."}
                      </span>
                    </div>
                    <input 
                      type="file" 
                      ref={field.ref} 
                      className="hidden" 
                      accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.ppt,.pptx,.pps,.ppsx,.odt,.xls,.xlsx"
                      onChange={(e) => handleFileChange(field.id, e)}
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-white px-8 h-10 text-xs font-bold rounded-lg shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  {isSubmitting ? "ENVIANDO..." : "ENVIAR"}
                </Button>
                {validationError && (
                  <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-left-2 duration-300">
                    {validationError}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function ToolbarButton({ icon, onClick }: { icon: React.ReactNode, onClick?: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-primary"
    >
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
