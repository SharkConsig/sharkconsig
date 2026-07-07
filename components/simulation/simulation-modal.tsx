"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Calculator, 
  User, 
  Briefcase, 
  TrendingDown, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Download, 
  Sparkles, 
  Check, 
  Loader2,
  FileText,
  Phone,
  Building,
  Mail,
  Zap
} from "lucide-react";
import { getContractTypeInfo } from "@/lib/contratos-mapping";
import { toPng, toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";

interface Contract {
  id?: string;
  tipo: string;
  banco: string;
  orgao: string | null;
  numero_do_contrato: string;
  parcela: number;
  prazo: number;
  [key: string]: unknown;
}

interface Registration {
  id: string;
  numero_matricula: string;
  situacao_funcional: string | null;
  salario: number | null;
  orgao: string | null;
  regime_juridico: string | null;
  uf: string | null;
  itens_credito?: Contract[];
  [key: string]: unknown;
}

interface ClientData {
  id: string;
  nome: string | null;
  cpf: string;
  data_nascimento: string | null;
  telefone_1: string | null;
  telefone_2: string | null;
  telefone_3: string | null;
  [key: string]: unknown;
}

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientData | null;
  registrations: Registration[];
  perfil: { role?: string; nome?: string; telefone?: string; foto_proposta_url?: string; } | null;
  activeRegIndex?: number;
  onProposalSaved?: () => void;
}

interface SimContract {
  id: string;
  bancoAtual: string;
  parcelaAtual: string;
  prazoAtual: string;
  taxaAtual: string;
  bancoDestino: string;
  novaParcela: string;
  novoPrazo: string;
  novaTaxa: string;
}

export function SimulationModal({ isOpen, onClose, client, registrations, perfil, activeRegIndex, onProposalSaved }: SimulationModalProps) {
  const [step, setStep] = useState<"model-select" | "form" | "preview">("model-select");
  const [model, setModel] = useState<"reducao" | "novo-formato">("reducao");

  // Novo Formato states
  const [prazoEfetivoRotativo, setPrazoEfetivoRotativo] = useState("96");
  const [taxaEfetivaRotativo, setTaxaEfetivaRotativo] = useState("4,75");
  const [prazoEfetivoNovo, setPrazoEfetivoNovo] = useState("29");
  const [taxaEfetivaNovo, setTaxaEfetivaNovo] = useState("1,67");
  const [mesesAMenos, setMesesAMenos] = useState("67");

  // Documentação Necessária states
  const [docFoto, setDocFoto] = useState(true);
  const [docRG, setDocRG] = useState(true);
  const [docEndereco, setDocEndereco] = useState(true);
  const [docEmail, setDocEmail] = useState(true);
  const [docResidencia, setDocResidencia] = useState(false);
  const [docContracheque, setDocContracheque] = useState(true);
  const [docExtrato, setDocExtrato] = useState(true);
  const [docAutorizacao, setDocAutorizacao] = useState(true);
  const [bancoAutorizacao, setBancoAutorizacao] = useState("Portal");

  // Validade state
  const [validadeDias, setValidadeDias] = useState("4");

  // Options states
  const [tituloCardEsquerdo, setTituloCardEsquerdo] = useState<"FORMATO ROTATIVO" | "FORMATO ANTIGO">("FORMATO ROTATIVO");
  const [ocultarPrazoReal, setOcultarPrazoReal] = useState<boolean>(false);
  const [ocultarTaxaReal, setOcultarTaxaReal] = useState<boolean>(false);
  const [ocultarMargem, setOcultarMargem] = useState<boolean>(false);

  // Manual edit flags for styling pre-filled inputs
  const [isManualPrazoEfetivoRotativo, setIsManualPrazoEfetivoRotativo] = useState<boolean>(false);
  const [isManualTaxaEfetivaRotativo, setIsManualTaxaEfetivaRotativo] = useState<boolean>(false);
  const [isManualPrazoEfetivoNovo, setIsManualPrazoEfetivoNovo] = useState<boolean>(false);
  const [isManualTaxaEfetivaNovo, setIsManualTaxaEfetivaNovo] = useState<boolean>(false);
  const [isManualMesesAMenos, setIsManualMesesAMenos] = useState<boolean>(false);
  const [isManualValidadeDias, setIsManualValidadeDias] = useState<boolean>(false);

  // Form states
  const [nomeCliente, setNomeCliente] = useState("");
  const [cpfCliente, setCpfCliente] = useState("");
  const [nomeConsultor, setNomeConsultor] = useState("");
  const [telefoneConsultor, setTelefoneConsultor] = useState("");
  
  const [valorLiberado, setValorLiberado] = useState("");
  const [porcentagemReducao, setPorcentagemReducao] = useState("13.78");

  // Margin states
  const [margemPrincipalVal, setMargemPrincipalVal] = useState("");
  const [margemCartaoConsignadoVal, setMargemCartaoConsignadoVal] = useState("");
  const [margemCartaoBeneficioVal, setMargemCartaoBeneficioVal] = useState("");

  // Broker Photo Upload states
  const [fotoCorretor, setFotoCorretor] = useState<string>("");
  const [exibirFotoCorretor, setExibirFotoCorretor] = useState<boolean>(true);
  const [dragActive, setDragActive] = useState<boolean>(false);



  // Multi-contract state
  const [contratos, setContratos] = useState<SimContract[]>([]);

  const [showTaxa, setShowTaxa] = useState(false);
  const [showBancoDestino, setShowBancoDestino] = useState(false);
  const [showNovaTaxa, setShowNovaTaxa] = useState(false);
  const [isExporting, setIsExporting] = useState<"pdf" | "png" | "jpg" | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const prevIsOpenRef = useRef(false);
  const perfilInitializedRef = useRef(false);

  const isSupervisor = perfil?.role === "Supervisor" || perfil?.role === "Administrador" || perfil?.role === "Desenvolvedor";

  // Get active registration margins for placeholders
  const getClientMargins = () => {
    const activeReg = (activeRegIndex !== undefined && registrations && registrations[activeRegIndex]) 
      ? registrations[activeRegIndex] 
      : (registrations && registrations[0] ? registrations[0] : null);

    let principal = 0;
    let cartaoConsignado = 0;
    let cartaoBeneficio = 0;

    if (activeReg) {
      // 1. Direct properties
      if (activeReg.margem_35 !== undefined) principal = Number(activeReg.margem_35) || 0;
      else if (activeReg.margem_emprestimo_liquida !== undefined) principal = Number(activeReg.margem_emprestimo_liquida) || 0;
      else if (activeReg.margem_emprestimo !== undefined) principal = Number(activeReg.margem_emprestimo) || 0;
      else if (activeReg.margem_disponivel_emprestimo !== undefined) principal = Number(activeReg.margem_disponivel_emprestimo) || 0;
      else if (activeReg.margem_consignavel !== undefined) principal = Number(activeReg.margem_consignavel) || 0;

      if (activeReg.liquida_5 !== undefined) cartaoConsignado = Number(activeReg.liquida_5) || 0;
      else if (activeReg.margem_liquida_cartao !== undefined) cartaoConsignado = Number(activeReg.margem_liquida_cartao) || 0;
      else if (activeReg.margem_cartao_consignado !== undefined) cartaoConsignado = Number(activeReg.margem_cartao_consignado) || 0;
      else if (activeReg.margem_cartao !== undefined) cartaoConsignado = Number(activeReg.margem_cartao) || 0;

      if (activeReg.beneficio_liquida_5 !== undefined) cartaoBeneficio = Number(activeReg.beneficio_liquida_5) || 0;
      else if (activeReg.margem_cartao_beneficio !== undefined) cartaoBeneficio = Number(activeReg.margem_cartao_beneficio) || 0;

      // 2. PI lotacoes
      const piLotacoes = activeReg.governo_pi_lotacoes;
      if (piLotacoes) {
        const lotacoes = Array.isArray(piLotacoes) ? piLotacoes : [piLotacoes];
        if (lotacoes[0]) {
          const lot = lotacoes[0] as { margem_disponivel_emprestimo?: number; margem_cartao_consignado?: number; margem_cartao_beneficio?: number };
          if (lot.margem_disponivel_emprestimo !== undefined) principal = Number(lot.margem_disponivel_emprestimo) || principal;
          if (lot.margem_cartao_consignado !== undefined) cartaoConsignado = Number(lot.margem_cartao_consignado) || cartaoConsignado;
          if (lot.margem_cartao_beneficio !== undefined) cartaoBeneficio = Number(lot.margem_cartao_beneficio) || cartaoBeneficio;
        }
      }

      // 3. MA lotacoes
      const maLotacoes = activeReg.governo_ma_lotacoes;
      if (maLotacoes) {
        const lotacoes = Array.isArray(maLotacoes) ? maLotacoes : [maLotacoes];
        if (lotacoes[0]) {
          const lot = lotacoes[0] as { margem_emprestimo_consignado?: number; margem_cartao_consignado?: number; margem_cartao_beneficio?: number };
          if (lot.margem_emprestimo_consignado !== undefined) principal = Number(lot.margem_emprestimo_consignado) || principal;
          if (lot.margem_cartao_consignado !== undefined) cartaoConsignado = Number(lot.margem_cartao_consignado) || cartaoConsignado;
          if (lot.margem_cartao_beneficio !== undefined) cartaoBeneficio = Number(lot.margem_cartao_beneficio) || cartaoBeneficio;
        }
      }

      // 4. RR lotacoes
      const rrLotacoes = activeReg.governo_rr_lotacoes;
      if (rrLotacoes) {
        const lotacoes = Array.isArray(rrLotacoes) ? rrLotacoes : [rrLotacoes];
        if (lotacoes[0]) {
          const lot = lotacoes[0] as { margem_emprestimo?: number; margem_cartao?: number };
          if (lot.margem_emprestimo !== undefined) principal = Number(lot.margem_emprestimo) || principal;
          if (lot.margem_cartao !== undefined) cartaoConsignado = Number(lot.margem_cartao) || cartaoConsignado;
        }
      }
    }

    return { principal, cartaoConsignado, cartaoBeneficio };
  };

  const { principal: clientPrincipalMargem, cartaoConsignado: clientCartaoConsignadoMargem, cartaoBeneficio: clientCartaoBeneficioMargem } = getClientMargins();

  // Existing loan contracts for dropdown pre-fill - filter by active registration if available
  const existingLoans = (() => {
    if (activeRegIndex !== undefined && registrations[activeRegIndex]) {
      const contracts = registrations[activeRegIndex].itens_credito || [];
      return contracts.filter(c => getContractTypeInfo(c.tipo).category === "EMPRESTIMO");
    }
    return registrations.flatMap(reg => {
      const contracts = reg.itens_credito || [];
      return contracts.filter(c => getContractTypeInfo(c.tipo).category === "EMPRESTIMO");
    });
  })();

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) return cpf;
    return `${clean.substring(0, 3)}.***.***-${clean.substring(9, 11)}`;
  };

  // Pre-fill fields on mount or when client changes
  useEffect(() => {
    if (isOpen) {
      const becameOpen = !prevIsOpenRef.current;
      prevIsOpenRef.current = true;

      if (becameOpen) {
        if (client) {
          setNomeCliente(client.nome || "");
          setCpfCliente(maskCPF(client.cpf));
        }
      }

      if (perfil && !perfilInitializedRef.current) {
        setNomeConsultor(perfil.nome || "");
        setTelefoneConsultor(perfil.telefone || "");
        setFotoCorretor(perfil.foto_proposta_url || "");
        if (perfil.foto_proposta_url) {
          setExibirFotoCorretor(true);
        }
        perfilInitializedRef.current = true;
      } else if (!perfil && !perfilInitializedRef.current && becameOpen) {
        setNomeConsultor("");
        setTelefoneConsultor("");
        setFotoCorretor("");
      }

      // Default pre-fill if existing loans exist
      if (becameOpen) {
        if (existingLoans.length > 0) {
          const mapped = existingLoans.map((loan, idx) => {
            const bankName = getContractTypeInfo(loan.tipo).bank || loan.banco || "";
            const pVal = loan.parcela || 0;
            const rVal = parseFloat(porcentagemReducao) || 13.78;
            const calculatedNovaParcela = pVal * (1 - rVal / 100);
            return {
              id: loan.id || `loan-${idx}-${Math.random()}`,
              bancoAtual: bankName,
              parcelaAtual: pVal ? pVal.toString() : "",
              prazoAtual: loan.prazo ? loan.prazo.toString() : "",
              taxaAtual: loan.taxa ? loan.taxa.toString() : "1.5",
              bancoDestino: bankName || "",
              novaParcela: calculatedNovaParcela ? calculatedNovaParcela.toFixed(2) : "",
              novoPrazo: loan.prazo ? loan.prazo.toString() : "",
              novaTaxa: ""
            };
          });
          setContratos(mapped);
        } else {
          setContratos([{
            id: `loan-default-${Math.random()}`,
            bancoAtual: "",
            parcelaAtual: "",
            prazoAtual: "",
            taxaAtual: "1.5",
            bancoDestino: "",
            novaParcela: "",
            novoPrazo: "",
            novaTaxa: ""
          }]);
        }

        // Reset step
        setStep("model-select");
      }
    } else {
      prevIsOpenRef.current = false;
      perfilInitializedRef.current = false;
    }
  }, [client, perfil, isOpen, activeRegIndex, existingLoans, porcentagemReducao]);

  // Recalculate new installment values when reduction percentage changes
  useEffect(() => {
    const rVal = parseFloat(porcentagemReducao);
    if (!isNaN(rVal)) {
      setContratos(prev => 
        prev.map(c => {
          const pVal = parseFloat(c.parcelaAtual);
          if (!isNaN(pVal)) {
            return {
              ...c,
              novaParcela: (pVal * (1 - rVal / 100)).toFixed(2)
            };
          }
          return c;
        })
      );
    }
  }, [porcentagemReducao]);

  // Broker photo file and drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFotoCorretor(event.target.result as string);
          setExibirFotoCorretor(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const updateContrato = (index: number, field: keyof SimContract, value: string) => {
    setContratos(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      
      // If updating parcela, calculate novaParcela automatically using the current reduction rate
      if (field === "parcelaAtual") {
        const pVal = parseFloat(value);
        const rVal = parseFloat(porcentagemReducao);
        if (!isNaN(pVal) && !isNaN(rVal)) {
          copy[index].novaParcela = (pVal * (1 - rVal / 100)).toFixed(2);
        } else {
          copy[index].novaParcela = "";
        }
      }

      // If updating prazo, auto-fill novoPrazo if it's currently empty or matches old prazo
      if (field === "prazoAtual") {
        copy[index].novoPrazo = value;
      }

      // If updating bancoAtual, auto-fill bancoDestino with the same value
      if (field === "bancoAtual") {
        copy[index].bancoDestino = value;
      }

      return copy;
    });
  };

  const handleAddContrato = () => {
    setContratos(prev => [
      ...prev,
      {
        id: `loan-manual-${Math.random()}`,
        bancoAtual: "",
        parcelaAtual: "",
        prazoAtual: "",
        taxaAtual: "1.5",
        bancoDestino: "",
        novaParcela: "",
        novoPrazo: "",
        novaTaxa: ""
      }
    ]);
  };

  const handleRemoveContrato = (id: string) => {
    if (contratos.length > 1) {
      setContratos(prev => prev.filter(c => c.id !== id));
    }
  };

  // Apply a selected loan from list to form (append or replace empty)
  const handleSelectLoan = (loan: Contract) => {
    const bankName = getContractTypeInfo(loan.tipo).bank || loan.banco || "";
    const pVal = loan.parcela || 0;
    const rVal = parseFloat(porcentagemReducao) || 13.78;
    const calculatedNovaParcela = pVal * (1 - rVal / 100);
    
    const newContract: SimContract = {
      id: loan.id || `loan-${Math.random()}`,
      bancoAtual: bankName,
      parcelaAtual: pVal ? pVal.toString() : "",
      prazoAtual: loan.prazo ? loan.prazo.toString() : "",
      taxaAtual: loan.taxa ? loan.taxa.toString() : "1.5",
      bancoDestino: bankName || "",
      novaParcela: calculatedNovaParcela ? calculatedNovaParcela.toFixed(2) : "",
      novoPrazo: loan.prazo ? loan.prazo.toString() : "",
      novaTaxa: ""
    };

    setContratos(prev => {
      // If there's only one contract and it's completely empty, replace it
      if (prev.length === 1 && !prev[0].bancoAtual && !prev[0].parcelaAtual) {
        return [newContract];
      }
      // Avoid duplicate clicks of the same loan
      if (prev.some(c => c.bancoAtual === bankName && c.parcelaAtual === newContract.parcelaAtual && c.prazoAtual === newContract.prazoAtual)) {
        return prev;
      }
      return [...prev, newContract];
    });
  };

  const handleExport = async (format: "pdf" | "png" | "jpg") => {
    if (!previewRef.current) return;
    setIsExporting(format);

    try {
      // Small timeout to guarantee DOM is rendered and images are loaded
      await new Promise((resolve) => setTimeout(resolve, 350));

      const element = previewRef.current;
      const roundedHeight = Math.round(element.offsetHeight || element.getBoundingClientRect().height);
      
      // Configure high-quality options for html-to-image
      const options = {
        quality: 1.0,
        pixelRatio: 2.5,
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '794px',
          height: `${roundedHeight}px`
        }
      };

      let finalDataUrl = "";

      if (format === "png" || format === "jpg") {
        const dataUrl = format === "png" 
          ? await toPng(element, options) 
          : await toJpeg(element, options);

        finalDataUrl = dataUrl;

        const link = document.createElement("a");
        const safeName = (nomeCliente || "Cliente").trim().replace(/\s+/g, "_");
        link.download = `proposta_reducao_${safeName}.${format}`;
        link.href = dataUrl;
        link.click();
      } else if (format === "pdf") {
        const dataUrl = await toPng(element, options);
        const pdfHeight = Math.round((roundedHeight * 210) / 794);
        const pdf = new jsPDF("p", "mm", [210, pdfHeight]);
        
        pdf.addImage(dataUrl, "PNG", 0, 0, 210, pdfHeight, undefined, 'FAST');

        finalDataUrl = pdf.output("datauristring");

        const safeName = (nomeCliente || "Cliente").trim().replace(/\s+/g, "_");
        pdf.save(`proposta_reducao_${safeName}.pdf`);
      }

      // Save proposal history to Supabase table
      try {
        const { data: authData } = await supabase.auth.getUser();
        const activeUser = authData?.user;
        
        const cleanCpf = (client?.cpf || cpfCliente || "").replace(/\D/g, "");
        const contractsConsidered = contratos;
        
        // Find excluded contracts
        const contractsExcluded = existingLoans.filter(loan => 
          !contratos.some(sim => sim.id === loan.id || sim.bancoAtual === loan.banco)
        );

        const currentTotal = contratos.reduce((acc, c) => acc + (parseFloat(c.parcelaAtual) || 0), 0);
        const newTotal = contratos.reduce((acc, c) => acc + (parseFloat(c.novaParcela) || 0), 0);

        let saveErr;

        if (model === "novo-formato") {
          const docsNecessarios = [
            docFoto && "Foto segurando o documento",
            docRG && "RG ou CNH (FRENTE E VERSO)",
            docEndereco && "Endereço completo por escrito",
            docEmail && "E-mail",
            docResidencia && "Comprovante de residência (quando exigido pelo banco)",
            docContracheque && "Último contracheque",
            docExtrato && "Extrato de empréstimos (consignações)",
            docAutorizacao && `Autorização para o banco ${bancoAutorizacao ? (bancoAutorizacao.toLowerCase() === "portal" ? "(via app do Portal)" : bancoAutorizacao) : "(via app do Portal)"}`
          ].filter(Boolean);

          const { error } = await supabase
            .from("historico_proposta_comercial_novo_formato")
            .insert({
              cliente_cpf: cleanCpf,
              cliente_nome: nomeCliente || client?.nome || "",
              user_id: activeUser?.id || null,
              user_nome: nomeConsultor || perfil?.nome || "",
              user_email: activeUser?.email || perfil?.email || "",
              telefone_consultor: telefoneConsultor,
              valor_liberado: parseFloat(valorLiberado) || 0,
              nome_card_esquerdo: tituloCardEsquerdo,
              prazo_real_esquerdo: parseInt(prazoEfetivoRotativo) || 0,
              taxa_real_esquerdo: parseFloat(taxaEfetivaRotativo.replace(",", ".")) || 0,
              margem_esquerda: parseFloat(String(margemPrincipalVal || 0)) || 0,
              prazo_real_direito: parseInt(prazoEfetivoNovo) || 0,
              taxa_real_direito: parseFloat(taxaEfetivaNovo.replace(",", ".")) || 0,
              meses_a_menos: parseInt(mesesAMenos) || 0,
              validade_proposta: parseInt(validadeDias) || 0,
              documentos_necessarios: docsNecessarios,
              banco: bancoAutorizacao,
              arquivo_url: finalDataUrl,
              tipo_arquivo: format.toUpperCase()
            });
          saveErr = error;
        } else {
          const { error } = await supabase
            .from("historico_proposta_comercial")
            .insert({
              cliente_cpf: cleanCpf,
              cliente_nome: nomeCliente || client?.nome || "",
              user_id: activeUser?.id || null,
              user_nome: nomeConsultor || perfil?.nome || "",
              user_email: activeUser?.email || perfil?.email || "",
              telefone_consultor: telefoneConsultor,
              contratos_considerados: contractsConsidered,
              contratos_excluidos: contractsExcluded,
              percentual_reducao: parseFloat(porcentagemReducao) || 13.78,
              total_parcela_atual: currentTotal,
              total_parcela_nova: newTotal,
              valor_liberado: parseFloat(valorLiberado) || null,
              arquivo_url: finalDataUrl,
              tipo_arquivo: format.toUpperCase()
            });
          saveErr = error;
        }

        if (saveErr) {
          console.error("Erro ao salvar histórico de proposta:", saveErr);
        } else {
          onProposalSaved?.();
        }
      } catch (dbErr) {
        console.error("Erro ao processar salvamento da proposta no banco:", dbErr);
      }

    } catch (err) {
      console.error("Erro ao exportar arquivo:", err);
    } finally {
      setIsExporting(null);
    }
  };

  if (!isOpen) return null;

  // Formatting helpers
  const formatBRL = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "R$ 0,00";
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const totalParcelaAtual = contratos.reduce((acc, c) => acc + (parseFloat(c.parcelaAtual) || 0), 0);
  const totalNovaParcela = contratos.reduce((acc, c) => acc + (parseFloat(c.novaParcela) || 0), 0);
  const economiaMensal = Math.max(0, totalParcelaAtual - totalNovaParcela);
  const totalContratoEconomia = contratos.reduce((acc, c) => {
    const pAtual = parseFloat(c.parcelaAtual) || 0;
    const pNova = parseFloat(c.novaParcela) || 0;
    const prazo = parseInt(c.novoPrazo) || parseInt(c.prazoAtual) || 0;
    return acc + ((pAtual - pNova) * prazo);
  }, 0);

  // Helper to render the complete proposal template flyer with exact matching structure and values
  const renderProposalTemplateContent = (isZoom: boolean) => {
    const valorNovo = parseFloat(valorLiberado) || 0;
    const valorRotativo = valorNovo * 0.70;

    const expirationDate = (() => {
      const days = parseInt(validadeDias) || 5;
      const date = new Date();
      let addedDays = 0;
      while (addedDays < days) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
          addedDays++;
        }
      }
      return date.toLocaleDateString("pt-BR");
    })();

    const totalParcelaAtual = contratos.reduce((acc, c) => acc + (parseFloat(c.parcelaAtual) || 0), 0);
    const totalNovaParcela = contratos.reduce((acc, c) => acc + (parseFloat(c.novaParcela) || 0), 0);
    const economiaMensal = Math.max(0, totalParcelaAtual - totalNovaParcela);
    const sumOfMargins = (parseFloat(margemPrincipalVal) || 0) + 
                         (parseFloat(margemCartaoConsignadoVal) || 0) + 
                         (parseFloat(margemCartaoBeneficioVal) || 0);
    const valorTotalPosEstrategia = totalNovaParcela + sumOfMargins;

    const uniqueDestBanks = Array.from(new Set(contratos.map(c => c.bancoDestino).filter(Boolean)));
    const showBancosLine = showBancoDestino && uniqueDestBanks.length > 0;
    const destBanksText = uniqueDestBanks.length > 0 
      ? `Através do ${uniqueDestBanks.join(" e ")}`
      : "";

    const hasMargemPrincipal = margemPrincipalVal !== "" && parseFloat(margemPrincipalVal) > 0;
    const hasMargemCC = margemCartaoConsignadoVal !== "" && parseFloat(margemCartaoConsignadoVal) > 0;
    const hasMargemCB = margemCartaoBeneficioVal !== "" && parseFloat(margemCartaoBeneficioVal) > 0;

    const numPages = contratos.length >= 4 ? (1 + (contratos.length - 3) * 0.15) : 1;

    const corretorEmail = (() => {
      if (!nomeConsultor) return "corretor@acertofacil.com.br";
      const cleanName = nomeConsultor
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "");
      const parts = cleanName.split(/\s+/).filter(Boolean);
      if (parts.length === 0) return "corretor@acertofacil.com.br";
      if (parts.length === 1) return `${parts[0]}@acertofacil.com.br`;
      const lastInitial = parts[parts.length - 1][0] || "";
      return lastInitial ? `${parts[0]}.${lastInitial}@acertofacil.com.br` : `${parts[0]}@acertofacil.com.br`;
    })();

    // Spacing configuration for normal single-page template (up to 3 contracts)
    const outerPadding = "pt-10 px-10 pb-20";
    const mainSpacing = "space-y-6";
    const headerPadding = "py-3";
    const bannerPadding = "p-5";
    const cardPadding = "py-3 px-5";
    const cardGap = "gap-6";
    const cardMinHeight = "min-h-[74px]";
    const cardBorderPadding = "pt-1.5 border-t border-slate-100 mt-1.5";
    const tableSectionPt = "pt-2";
    const tableCellPadding = "p-2.5";
    const tableHeaderHeight = "py-2";
    const tableFooterPadding = "py-2 px-5";
    const tableDestPadding = "py-3.5 px-5";
    const footerSpacing = "pt-4 mt-8";

    if (false) {
      // Multi-page template rendering (4 or more contracts)
      return (
        <div className="w-[794px] h-[2246px] flex flex-col justify-between bg-white text-slate-900 font-sans text-left">
          {/* PAGE 1: Intro, Highlights, and Table 1 (Current Installments) */}
          <div className="w-[794px] h-[1123px] min-h-[1123px] flex flex-col justify-between bg-white pt-10 px-10 pb-16 relative overflow-hidden">
            <div className="space-y-6">
              {/* Header section with brand/logo and vertical line divider */}
              <div className="flex items-center justify-center gap-4 py-3 border-b border-slate-100">
                <div className="h-10 w-44 relative flex items-center justify-center">
                  <img 
                    src="/logo.png" 
                    alt="Logo ACERTO" 
                    className="h-10 object-contain w-full" 
                    crossOrigin="anonymous" 
                  />
                </div>
                <span className="text-slate-300 text-3xl font-light">|</span>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Formalização de</span>
                  <span className="text-[26px] font-black text-[#162546] tracking-tight leading-tight uppercase">Proposta</span>
                </div>
              </div>

              {/* Banner container with client information on left and broker on right */}
              <div className="bg-[#162546] rounded-2xl p-5 text-white flex justify-between items-center shadow-sm">
                {/* Left side: Client profile */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#F4C600]/20 flex items-center justify-center text-[#F4C600] shrink-0 border border-[#F4C600]/30 shadow-inner">
                    <User className="w-5.5 h-5.5 fill-[#F4C600]/10" />
                  </div>
                  <div className="flex flex-col text-left">
                    <p className="text-[12px] font-black uppercase tracking-wide text-white">{nomeCliente || "NOME COMPLETO DO CLIENTE"}</p>
                    <p className="text-xs text-white font-mono tracking-wider font-semibold">{(cpfCliente || "040.***.***.49").replace("-", ".")}</p>
                  </div>
                </div>

                {/* Right side: Corretor info */}
                <div className="flex flex-col text-right items-end gap-1.5 border-l border-slate-700/50 pl-5">
                  <p className="text-xs font-black uppercase text-[#D6AB00] tracking-wider">{nomeConsultor || "NOME DO CORRETOR"}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-white font-medium">
                    <Mail className="w-3.5 h-3.5 text-[#F4C600] shrink-0" />
                    <span>{corretorEmail}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-white font-medium">
                    <Phone className="w-3.5 h-3.5 text-[#F4C600] shrink-0" />
                    <span>{telefoneConsultor || "(48) 99656-5896"}</span>
                  </div>
                </div>
              </div>

              {/* Cards for Financial Highlights: Total Liberado vs Total Reduzido */}
              <div className="grid grid-cols-2 gap-6 pt-1">
                {/* Left card: Total Valor Liberado */}
                <div className="border border-slate-200 rounded-2xl py-3 px-5 bg-white flex flex-col justify-between shadow-sm min-h-[74px]">
                  <div className="text-left space-y-0.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Valor Liberado</p>
                    <div className="flex items-center gap-2 py-0.5 justify-start">
                      <div className="w-7 h-7 rounded-full bg-[#F4C600]/15 flex items-center justify-center text-[#F4C600] text-sm font-black border border-[#F4C600]/30 shadow-sm shrink-0">
                        $
                      </div>
                      <p className="text-[28px] font-black text-[#F4C600] tracking-tight">{formatBRL(valorLiberado || 13214.70)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-0.5 text-left pt-1.5 border-t border-slate-100 mt-1.5">
                    {hasMargemPrincipal && (
                      <p className="text-[9px] text-slate-400 font-normal">Margem*: <span className="text-slate-400 font-normal">{formatBRL(margemPrincipalVal)}</span></p>
                    )}
                    {hasMargemCC && (
                      <p className="text-[9px] text-slate-400 font-normal">Margem CC*: <span className="text-slate-400 font-normal">{formatBRL(margemCartaoConsignadoVal)}</span></p>
                    )}
                    {hasMargemCB && (
                      <p className="text-[9px] text-slate-400 font-normal">Margem CB*: <span className="text-slate-400 font-normal">{formatBRL(margemCartaoBeneficioVal)}</span></p>
                    )}
                    {showBancosLine && (
                      <p className="text-[8px] text-slate-400 italic font-normal mt-0.5">
                        {destBanksText}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right card: Valor Total Reduzido ao Mês */}
                <div className="bg-[#F4C600] rounded-2xl py-3 px-5 flex flex-col justify-between text-[#162546] shadow-sm min-h-[74px]">
                  <div className="text-left space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#162546]/80">Valor Total Reduzido ao Mês</p>
                    <div className="flex items-center gap-2 py-0.5 justify-start">
                      <TrendingDown className="w-7 h-7 text-[#162546] shrink-0" />
                      <p className="text-[26px] font-black tracking-tight text-[#162546]">{formatBRL(economiaMensal || 244.19)}</p>
                    </div>
                  </div>
                  <p className="text-[10px] font-normal text-[#162546]/60 text-left pt-1.5 border-t border-[#162546]/10 mt-1.5">
                    Economia após a finalização da estratégia financeira.
                  </p>
                </div>
              </div>

              {/* Table Section: Current Installments list */}
              <div className="space-y-0 pt-2">
                <div className="bg-[#162546] text-white text-center py-2 rounded-t-xl font-black text-xs tracking-widest uppercase">
                  PARCELAS ATUAIS
                </div>
                <div className="border border-slate-200 border-t-0 rounded-b-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-wider bg-slate-50/50">
                        <th className="p-2.5 pl-5 text-left w-[40%]">BANCO ATUAL</th>
                        <th className="p-2.5 text-left w-[30%]">PARCELA ATUAL</th>
                        <th className="p-2.5 text-left w-[15%]">PRAZO</th>
                        {showTaxa && (
                          <th className="p-2.5 text-left w-[15%]">TAXA ATUAL</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {contratos.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          <td className="p-2.5 pl-5 font-bold text-slate-800 uppercase truncate">{c.bancoAtual || "NÃO INFORMADO"}</td>
                          <td className="p-2.5 font-semibold text-slate-700">{formatBRL(c.parcelaAtual)}</td>
                          <td className="p-2.5 font-bold text-[#162546]">{c.prazoAtual ? `${c.prazoAtual}X` : "-"}</td>
                          {showTaxa && (
                            <td className="p-2.5 font-semibold text-slate-600">{c.taxaAtual ? `${parseFloat(c.taxaAtual).toFixed(2)}%` : "-"}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-[#162546] text-white py-2 px-5 text-center font-bold text-xs uppercase tracking-wider">
                    Parcela total: {formatBRL(totalParcelaAtual)}
                  </div>
                </div>
              </div>
            </div>

            {/* Page 1 Footer */}
            <div className="border-t border-slate-100 pt-4 flex justify-between items-start gap-6 mt-auto">
              <div className="flex-1 text-[7px] text-slate-400 font-bold leading-relaxed space-y-0.5 text-left uppercase tracking-tight">
                <p>* Cálculos de redução de parcela pela portabilidade sofrem alterações diárias, a depender do saldo devedor.</p>
                <p>* Estratégia de redução leva em consideração a taxa de juros confirmada pelo cliente.</p>
                <p>* A taxa de juros final do contrato e a redução real do valor da parcela poderão sobre oscilações a critério das instituições bancárias.</p>
              </div>
              <div className="shrink-0 flex items-center justify-center border border-slate-200 px-3 py-1.5 rounded bg-slate-50 font-black text-[9px] text-slate-700 tracking-wider">
                PÁGINA 1/2
              </div>
            </div>
          </div>

          {/* PAGE 2: Table 2 (Future Installments) and Final Verification Disclaimer */}
          <div className="w-[794px] h-[1123px] min-h-[1123px] flex flex-col justify-between bg-white pt-10 px-10 pb-16 relative overflow-hidden border-t border-slate-100">
            <div className="space-y-6">
              {/* Header section with brand/logo and vertical line divider */}
              <div className="flex items-center justify-center gap-4 py-3 border-b border-slate-100">
                <div className="h-10 w-44 relative flex items-center justify-center">
                  <img 
                    src="/logo.png" 
                    alt="Logo ACERTO" 
                    className="h-10 object-contain w-full" 
                    crossOrigin="anonymous" 
                  />
                </div>
                <span className="text-slate-300 text-3xl font-light">|</span>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Formalização de</span>
                  <span className="text-[26px] font-black text-[#162546] tracking-tight leading-tight uppercase">Proposta</span>
                </div>
              </div>

              {/* Table Section: Future Strategy Installments list */}
              <div className="space-y-0 pt-2 flex-1">
                <div className="bg-[#F4C600] text-[#162546] text-center py-2 rounded-t-xl font-black text-xs tracking-widest uppercase">
                  PARCELAS APÓS PORTABILIDADE
                </div>
                <div className="border border-slate-200 border-t-0 rounded-b-xl overflow-hidden bg-white shadow-sm mb-4">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-wider bg-slate-50/50">
                        {showBancoDestino && (
                          <th className="p-2.5 pl-5 text-left w-[40%]">BANCO</th>
                        )}
                        <th className={`p-2.5 ${!showBancoDestino ? 'pl-5 w-[60%]' : 'w-[30%]'} text-left`}>PARCELA</th>
                        <th className="p-2.5 text-left w-[15%]">PRAZO</th>
                        {showNovaTaxa && (
                          <th className="p-2.5 text-left w-[15%]">TAXA</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {contratos.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          {showBancoDestino && (
                            <td className="p-2.5 pl-5 font-bold text-slate-800 uppercase truncate">
                              {c.bancoDestino || "REDUÇÃO GARANTIDA"}
                            </td>
                          )}
                          <td className={`p-2.5 ${!showBancoDestino ? 'pl-5' : ''} font-bold text-slate-800`}>{formatBRL(c.novaParcela)}</td>
                          <td className="p-2.5 font-bold text-[#162546]">{c.novoPrazo || c.prazoAtual ? `${c.novoPrazo || c.prazoAtual}X` : "-"}</td>
                          {showNovaTaxa && (
                            <td className="p-2.5 font-semibold text-slate-600">{c.novaTaxa ? `${parseFloat(c.novaTaxa).toFixed(2)}%` : "-"}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-[#F4C600] text-[#162546] h-[58px] px-5 flex items-center justify-center font-bold text-[14px] uppercase tracking-wider">
                    PARCELA TOTAL: <span className="font-black ml-1.5 text-[16px]">{formatBRL(totalNovaParcela)}</span>
                  </div>
                  <div className="bg-[#bc9300] text-[#f9e189] h-[58px] px-5 text-center font-bold flex flex-col gap-0.5 justify-center items-center">
                    <span className="text-[#f9e189] font-medium text-[8px] tracking-wider leading-none">VALOR TOTAL PARCELA APÓS ESTRATÉGIA FINANCEIRA:</span>
                    <span className="text-[14px] font-normal text-[#f9e189] leading-none mt-1">{formatBRL(valorTotalPosEstrategia)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Page 2 Footer Disclaimer & Verification */}
            <div className="border-t border-slate-100 pt-4 flex justify-between items-start gap-6 mt-auto">
              <div className="flex-1 text-[7px] text-slate-400 font-bold leading-relaxed space-y-0.5 text-left uppercase tracking-tight">
                <p>* As taxas de juros ofertadas pelas instituições bancárias levam em consideração as demais linhas de crédito disponívels ao cliente.</p>
                <p>* Essa proposta é válida por 48 horas após o envio deste documento.</p>
                <p>* CB é Cartão Benefício e CC é Cartão Consignado.</p>
                <p>* Está ciente o beneficiário que a tomada de outro crédito fora dessa proposta ou ficar devedor em algum banco, afeta diretamente a possibilidade de entrega da oferta, taxas e prazo.</p>
              </div>
              <div className="shrink-0 flex items-center justify-center border border-slate-200 px-3 py-1.5 rounded bg-slate-50 font-black text-[9px] text-slate-700 tracking-wider">
                acertofacilpromotora.com.br | PÁGINA 2/2
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default return for single page template
    return (
      <div 
        className={`w-full flex flex-col justify-start text-left relative bg-white ${outerPadding} font-sans text-slate-900 shrink-0`}
      >
        <div className={mainSpacing}>
          {/* Header section with brand/logo and vertical line divider */}
          <div className={`flex items-center justify-center gap-4 ${headerPadding} border-b border-slate-100`}>
            <div className="h-10 w-44 relative flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Logo ACERTO" 
                className="h-10 object-contain w-full" 
                crossOrigin="anonymous" 
              />
            </div>
            <span className="text-slate-300 text-3xl font-light">|</span>
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Formalização de</span>
              <span className="text-[26px] font-black text-[#162546] tracking-tight leading-tight uppercase">Proposta</span>
            </div>
          </div>

          {/* Banner container with client information on left and broker on right */}
          <div className={`bg-[#162546] rounded-2xl ${bannerPadding} text-white flex justify-between items-center shadow-sm relative overflow-visible`}>
            {/* Left side: Client profile */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#F4C600]/20 flex items-center justify-center text-[#F4C600] shrink-0 border border-[#F4C600]/30 shadow-inner">
                <User className="w-5.5 h-5.5 fill-[#F4C600]/10" />
              </div>
              <div className="flex flex-col text-left max-w-[220px]">
                <p className="text-[12px] font-black uppercase tracking-wide text-white">{nomeCliente || "NOME COMPLETO DO CLIENTE"}</p>
                <p className="text-xs text-white font-mono tracking-wider font-semibold">{(cpfCliente || "040.***.***.49").replace("-", ".")}</p>
              </div>
            </div>

            {/* Center side: Broker Photo */}
            {exibirFotoCorretor && fotoCorretor && (
              <div className="absolute right-[240px] bottom-0 h-[145px] w-auto flex items-end pointer-events-none z-10">
                <img 
                  src={fotoCorretor} 
                  alt="Corretor" 
                  className="h-full w-auto object-contain object-bottom select-none"
                  crossOrigin="anonymous"
                />
              </div>
            )}

            {/* Right side: Corretor info */}
            <div className="flex flex-col text-right items-end gap-1.5 border-l border-slate-700/50 pl-5 max-w-[220px]">
              <p className="text-xs font-black uppercase text-[#D6AB00] tracking-wider break-words w-full">{nomeConsultor || "NOME DO CORRETOR"}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-white font-medium truncate w-full justify-end">
                <Mail className="w-3.5 h-3.5 text-[#F4C600] shrink-0" />
                <span className="truncate">{corretorEmail}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-white font-medium truncate w-full justify-end">
                <Phone className="w-3.5 h-3.5 text-[#F4C600] shrink-0" />
                <span className="truncate">{telefoneConsultor || "(48) 99656-5896"}</span>
              </div>
            </div>
          </div>

          {model === "novo-formato" ? (
            <div className="space-y-4 pt-1 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="text-center text-[#162546] font-black text-[12px] uppercase tracking-wider">
                  MAIS VALOR LIBERADO, MUITO MAIS VANTAGEM PARA VOCÊ!
                </h4>

                <div className={`grid grid-cols-2 ${cardGap}`}>
                  {/* Card Esquerdo: FORMATO ROTATIVO ou customizado */}
                  <div className={`border border-slate-200 rounded-2xl ${cardPadding} bg-white flex flex-col justify-between shadow-sm ${cardMinHeight}`}>
                    <div className="text-left space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tituloCardEsquerdo}</p>
                      <div className="pt-2">
                        <p className="text-[11px] font-bold text-slate-400">VALOR LIBERADO</p>
                        <p className="text-[26px] font-black text-slate-400 tracking-tight leading-none mt-1">
                          {formatBRL(valorRotativo)}
                        </p>
                      </div>
                    </div>

                    {(!ocultarPrazoReal || !ocultarTaxaReal || !ocultarMargem) ? (
                      <div className="py-2 space-y-1 border-t border-slate-100 mt-2 text-left">
                        {!ocultarPrazoReal && (
                          <p className="text-[10px] text-slate-500 font-medium">
                            Prazo real: <span className="font-normal text-slate-700">{prazoEfetivoRotativo} meses</span>
                          </p>
                        )}
                        {!ocultarTaxaReal && (
                          <p className="text-[10px] text-slate-500 font-medium">
                            Taxa real: <span className="font-normal text-slate-700">{taxaEfetivaRotativo}% a.m.</span>
                          </p>
                        )}
                        {!ocultarMargem && (
                          <p className="text-[10px] text-slate-500 font-medium">
                            Margem: <span className="font-normal text-slate-700">{formatBRL(margemPrincipalVal || 0)}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 mt-2" />
                    )}

                    <div className="bg-red-50 text-red-600 rounded-xl py-2 px-3 text-[10px] font-black uppercase tracking-wider text-center mt-2">
                      Mais tempo pagando juros
                    </div>
                  </div>

                  {/* Card Direito: NOVO FORMATO */}
                  <div className={`bg-[#162546] border border-[#162546] rounded-2xl ${cardPadding} flex flex-col justify-between shadow-sm ${cardMinHeight}`}>
                    <div className="text-left space-y-1 text-white">
                      <p className="text-[10px] font-black text-[#F4C600] uppercase tracking-widest">NOVO FORMATO</p>
                      <div className="pt-2">
                        <p className="text-[11px] font-bold text-[#F4C600]/80">VALOR LIBERADO</p>
                        <p className="text-[26px] font-black text-[#F4C600] tracking-tight leading-none mt-1">
                          {formatBRL(valorNovo)}
                        </p>
                      </div>
                    </div>

                    {(!ocultarPrazoReal || !ocultarTaxaReal) ? (
                      <div className="py-2 space-y-1 border-t border-slate-700/50 mt-2 text-left">
                        {!ocultarPrazoReal && (
                          <p className="text-[10px] text-slate-300 font-medium">
                            Prazo real: <span className="font-normal text-white">{prazoEfetivoNovo} meses</span>
                          </p>
                        )}
                        {!ocultarTaxaReal && (
                          <p className="text-[10px] text-slate-300 font-medium">
                            Taxa real: <span className="font-normal text-white">{taxaEfetivaNovo}% a.m.</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 mt-2" />
                    )}

                    <div className="bg-[#F4C600] text-[#162546] rounded-xl py-2 px-3 text-[10px] font-black uppercase tracking-wider text-center mt-2">
                      Mais economia
                    </div>
                  </div>
                </div>

                {/* Bottom Indicators Row */}
                <div className="grid grid-cols-3 gap-4 text-center py-3 bg-slate-50 border border-slate-250/60 rounded-2xl">
                  {!ocultarPrazoReal ? (
                    <>
                      <div className="space-y-1">
                        <p className="text-[12px] font-black text-[#162546]">{mesesAMenos} MESES A MENOS</p>
                        <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Pagando juros</p>
                      </div>
                      <div className="space-y-1 border-x border-slate-200 flex flex-col justify-center items-center">
                        <p className="text-[14px] font-black text-[#162546]">ESTRATÉGIA VALIDADA!</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div></div>
                      <div className="space-y-1 border-r border-slate-200 flex flex-col justify-center items-center">
                        <p className="text-[14px] font-black text-[#162546]">ESTRATÉGIA VALIDADA!</p>
                      </div>
                    </>
                  )}
                  <div className="space-y-1">
                    <p className="text-[12px] font-black text-[#162546]">Menos juros</p>
                    <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Mais liberdade</p>
                  </div>
                </div>

                {/* Diferença no seu bolso */}
                <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-3 text-center space-y-0.5 shadow-sm">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest leading-tight">DIFERENÇA NO SEU BOLSO</p>
                  <p className="text-[18px] font-black text-emerald-600 leading-none">+{formatBRL(valorNovo - valorRotativo)}</p>
                </div>

                {/* Document Checklist Section */}
                <div className="space-y-2 pt-2 text-left">
                  <h5 className="text-[10px] font-black text-[#162546] uppercase tracking-widest pl-1">
                    Documentação Necessária para Análise
                  </h5>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 bg-slate-50/50 border border-slate-150 rounded-2xl p-4">
                    {[
                      { label: "Foto (RG ou CNH)", checked: docFoto },
                      { label: "Endereço completo por escrito", checked: docEndereco },
                      { label: "E-mail", checked: docEmail },
                      { label: "Comprovante de residência (quando exigido pelo banco)", checked: docResidencia },
                      { label: "Último contracheque", checked: docContracheque },
                      { label: "Extrato de empréstimos (consignações)", checked: docExtrato },
                      { label: `Autorização para o banco ${bancoAutorizacao ? (bancoAutorizacao.toLowerCase() === "portal" ? "(via app do Portal)" : bancoAutorizacao) : "(via app do Portal)"}`, checked: docAutorizacao },
                    ].map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                          doc.checked 
                            ? "bg-emerald-500 text-white" 
                            : "border border-slate-200 text-slate-300"
                        }`}>
                          {doc.checked && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
                        </div>
                        <span className={`text-[10px] ${doc.checked ? "text-slate-800 font-bold" : "text-slate-400 font-medium"}`}>
                          {doc.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Proposal Validity section */}
                <div className="pt-1.5">
                  <div className="bg-[#162546] text-[#F4C600] text-[9.5px] font-black uppercase tracking-widest py-2 px-4 rounded-xl flex justify-between items-center shadow-sm">
                    <span>VALIDADE DA PROPOSTA:</span>
                    <span>Até {expirationDate} ({validadeDias} dias úteis a partir de hoje)</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Cards for Financial Highlights: Total Liberado vs Total Reduzido */}
              <div className={`grid grid-cols-2 ${cardGap} pt-1`}>
                {/* Left card: Total Valor Liberado */}
                <div className={`border border-slate-200 rounded-2xl ${cardPadding} bg-white flex flex-col justify-center shadow-sm ${cardMinHeight}`}>
                  <div className="text-left space-y-0.5">
                    <p className="text-[10px] font-black text-[#162546] uppercase tracking-widest">Total Valor Liberado</p>
                    <div className="flex items-center gap-2 py-0.5 justify-start">
                      <div className="w-7 h-7 rounded-full bg-[#F4C600]/15 flex items-center justify-center text-[#F4C600] text-sm font-black border border-[#F4C600]/30 shadow-sm shrink-0">
                        $
                      </div>
                      <p className="text-[28px] font-black text-[#4c4ac4] tracking-tight">{formatBRL(valorLiberado || 13214.70)}</p>
                    </div>
                  </div>
                  
                  <div className={`space-y-0.5 text-left ${cardBorderPadding}`}>
                    {hasMargemPrincipal && (
                      <p className="text-[8.5px] text-[#162546] font-normal">Margem*: <span className="text-[#162546] font-normal">{formatBRL(margemPrincipalVal)}</span></p>
                    )}
                    {hasMargemCC && (
                      <p className="text-[8.5px] text-[#162546] font-normal">Margem CC*: <span className="text-[#162546] font-normal">{formatBRL(margemCartaoConsignadoVal)}</span></p>
                    )}
                    {hasMargemCB && (
                      <p className="text-[8.5px] text-[#162546] font-normal">Margem CB*: <span className="text-[#162546] font-normal">{formatBRL(margemCartaoBeneficioVal)}</span></p>
                    )}
                    {showBancosLine && (
                      <p className="text-[8px] text-[#162546] italic font-normal mt-0.5">
                        {destBanksText}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right card: Valor Total Reduzido ao Mês */}
                <div className={`bg-[#F4C600] rounded-2xl ${cardPadding} flex flex-col justify-center text-[#162546] shadow-sm ${cardMinHeight}`}>
                  <div className="text-left space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#162546]/80">Valor Total Reduzido ao Mês</p>
                    <div className="flex items-center gap-2 py-0.5 justify-start">
                      <TrendingDown className="w-7 h-7 text-[#162546] shrink-0" />
                      <p className="text-[26px] font-black tracking-tight text-[#162546]">{formatBRL(economiaMensal || 244.19)}</p>
                    </div>
                  </div>
                  <p className={`text-[10px] font-normal text-[#162546]/60 text-left ${cardBorderPadding}`}>
                    Economia após a finalização da estratégia financeira.
                  </p>
                </div>
              </div>

              {/* Table Section: Current Installments list */}
              <div className={`space-y-0 ${tableSectionPt}`}>
                <div className="bg-[#162546] text-white text-center py-2 rounded-t-xl font-black text-xs tracking-widest uppercase">
                  PARCELAS ATUAIS
                </div>
                <div className="border border-slate-200 border-t-0 rounded-b-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-wider bg-slate-50/50">
                        <th className={`${tableHeaderHeight} pl-5 text-left w-[40%]`}>BANCO ATUAL</th>
                        <th className={`${tableHeaderHeight} text-left w-[30%]`}>PARCELA ATUAL</th>
                        <th className={`${tableHeaderHeight} text-left w-[15%]`}>PRAZO</th>
                        {showTaxa && (
                          <th className={`${tableHeaderHeight} text-left w-[15%]`}>TAXA ATUAL</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {contratos.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          <td className={`${tableCellPadding} pl-5 font-bold text-slate-800 uppercase truncate`}>{c.bancoAtual || "NÃO INFORMADO"}</td>
                          <td className={`${tableCellPadding} font-semibold text-slate-700`}>{formatBRL(c.parcelaAtual)}</td>
                          <td className={`${tableCellPadding} font-bold text-[#162546]`}>{c.prazoAtual ? `${c.prazoAtual}X` : "-"}</td>
                          {showTaxa && (
                            <td className={`${tableCellPadding} font-semibold text-slate-600`}>{c.taxaAtual ? `${parseFloat(c.taxaAtual).toFixed(2)}%` : "-"}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className={`bg-[#162546] text-white ${tableFooterPadding} text-center font-bold text-xs uppercase tracking-wider`}>
                    Parcela total: {formatBRL(totalParcelaAtual)}
                  </div>
                </div>
              </div>

              {/* Table Section: Future Strategy Installments list */}
              <div className={`space-y-0 ${tableSectionPt}`}>
                <div className="bg-[#F4C600] text-[#162546] text-center py-2 rounded-t-xl font-black text-xs tracking-widest uppercase">
                  PARCELAS APÓS PORTABILIDADE
                </div>
                <div className="border border-slate-200 border-t-0 rounded-b-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-wider bg-slate-50/50">
                        {showBancoDestino && (
                          <th className={`${tableHeaderHeight} pl-5 text-left w-[40%]`}>BANCO</th>
                        )}
                        <th className={`${tableHeaderHeight} text-left ${showBancoDestino ? 'w-[30%]' : 'pl-5 w-[60%]'}`}>PARCELA</th>
                        <th className={`${tableHeaderHeight} text-left w-[15%]`}>PRAZO</th>
                        {showNovaTaxa && (
                          <th className={`${tableHeaderHeight} text-left w-[15%]`}>TAXA</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {contratos.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          {showBancoDestino && (
                            <td className={`${tableCellPadding} pl-5 font-bold text-slate-800 uppercase truncate`}>
                              {c.bancoDestino || "REDUÇÃO GARANTIDA"}
                            </td>
                          )}
                          <td className={`${tableCellPadding} ${!showBancoDestino ? 'pl-5' : ''} font-bold text-slate-800`}>{formatBRL(c.novaParcela)}</td>
                          <td className={`${tableCellPadding} font-bold text-[#162546]`}>{c.novoPrazo || c.prazoAtual ? `${c.novoPrazo || c.prazoAtual}X` : "-"}</td>
                          {showNovaTaxa && (
                            <td className={`${tableCellPadding} font-semibold text-slate-600`}>{c.novaTaxa ? `${parseFloat(c.novaTaxa).toFixed(2)}%` : "-"}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-[#F4C600] text-[#162546] h-[58px] px-5 flex items-center justify-center font-bold text-[14px] uppercase tracking-wider">
                    PARCELA TOTAL: <span className="font-black ml-1.5 text-[16px]">{formatBRL(totalNovaParcela)}</span>
                  </div>
                  <div className="bg-[#bc9300] text-[#f9e189] h-[58px] px-5 text-center font-bold flex flex-col gap-0.5 justify-center items-center">
                    <span className="text-[#f9e189] font-medium text-[8px] tracking-wider leading-none">VALOR TOTAL PARCELA APÓS ESTRATÉGIA FINANCEIRA:</span>
                    <span className="text-[14px] font-normal text-[#f9e189] leading-none mt-1">{formatBRL(valorTotalPosEstrategia)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Disclaimer & Verification */}
        <div className={`border-t border-slate-100 ${footerSpacing} flex justify-between items-start gap-6`}>
          <div className="flex-1 text-[7px] text-slate-400 font-bold leading-relaxed space-y-0.5 text-left uppercase tracking-tight">
            {model === "novo-formato" ? (
              <p className="text-[8.5px] text-[#162546] font-bold italic leading-relaxed text-left normal-case">
                Observação: Em caso de qualquer dúvida ou se precisar de suporte durante o processo, estou à disposição para ajudar no que for necessário e intermediar junto ao banco para que a proposta seja concluída da melhor forma possível.
              </p>
            ) : (
              <>
                <p>* Cálculos de redução de parcela pela portabilidade sofrem alterações diárias, a depender do saldo devedor.</p>
                <p>* Estratégia de redução leva em consideração a taxa de juros confirmada pelo cliente.</p>
                <p>* A taxa de juros final do contrato e a redução real do valor da parcela poderão sobre oscilações a critério das instituições bancárias.</p>
                <p>* As taxas de juros ofertadas pelas instituições bancárias levam em consideração as demais lines de crédito disponívels ao cliente.</p>
                <p>* Essa proposta é válida por 48 horas após o envio deste documento.</p>
                <p>* CB é Cartão Benefício e CC é Cartão Consignado.</p>
                <p>* Está ciente o beneficiário que a tomada de outro crédito fora dessa proposta ou ficar devedor em algum banco, afeta diretamente a possibilidade de entrega da oferta, taxas e prazo.</p>
              </>
            )}
          </div>
          <div className="shrink-0 flex items-center justify-center border border-slate-200 px-3 py-1.5 rounded bg-slate-50 font-black text-[9px] text-slate-700 tracking-wider">
            acertofacilpromotora.com.br
          </div>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div 
        key="simulation-modal-overlay"
        id="simulation-modal-container" 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#162546]/10 text-[#162546] rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Simulação de Proposta Comercial</h3>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">Ferramenta de Apoio a Vendas</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-8">
            
            {/* STEP 1: Model Selection */}
            {step === "model-select" && (
              <div className="space-y-6 max-w-2xl mx-auto py-6">
                <div className="text-center space-y-2">
                  <h4 className="text-[18px] font-bold text-slate-800">Qual estratégia deseja simular?</h4>
                  <p className="text-[13px] text-slate-500">Selecione o modelo matemático e de negócios ideal para a proposta do cliente.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {/* Option Redução de Parcela */}
                  <div 
                    onClick={() => {
                      setModel("reducao");
                      setStep("form");
                    }}
                    className="p-6 bg-blue-50/50 hover:bg-blue-50 border-2 border-blue-100 hover:border-blue-300 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group h-48"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                        <TrendingDown className="w-5 h-5" />
                      </div>
                      <h5 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">Redução de Parcela</h5>
                      <p className="text-[12px] text-slate-600 leading-relaxed">
                        Gere economia imediata reduzindo o valor da parcela mensal com base na taxa de redução padrão de 13,78%.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-600 text-[11px] font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform self-end">
                      Iniciar Simulação <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Option Novo Formato */}
                  <div 
                    onClick={() => {
                      setModel("novo-formato");
                      setStep("form");
                    }}
                    className="p-6 bg-[#F4C600]/5 hover:bg-[#F4C600]/10 border-2 border-[#F4C600]/20 hover:border-[#F4C600]/40 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group h-48"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 bg-[#F4C600] text-[#162546] rounded-xl flex items-center justify-center font-bold">
                        ★
                      </div>
                      <h5 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">Novo Formato</h5>
                      <p className="text-[12px] text-slate-600 leading-relaxed">
                        Exiba o comparativo inteligente entre o formato rotativo tradicional e o novo formato, mostrando as vantagens financeiras para o cliente.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#162546] text-[11px] font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform self-end">
                      Iniciar Simulação <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Simulation Form */}
            {step === "form" && (
              <div className="space-y-8">
                
                <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
                    
                    {/* Section: Cliente */}
                    <div className="space-y-3 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Dados do Cliente</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nome do Cliente</label>
                          <input 
                            type="text" 
                            value={nomeCliente}
                            onChange={(e) => setNomeCliente(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">CPF</label>
                          <input 
                            type="text" 
                            value={cpfCliente}
                            onChange={(e) => setCpfCliente(e.target.value)}
                            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-500 focus:outline-none shadow-sm cursor-not-allowed"
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Responsável */}
                    <div className="space-y-4 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                       <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Responsável pela Venda</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nome do Corretor</label>
                          <input 
                            type="text" 
                            value={nomeConsultor}
                            onChange={(e) => setNomeConsultor(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Telefone / WhatsApp</label>
                          <input 
                            type="text" 
                            value={telefoneConsultor}
                            onChange={(e) => setTelefoneConsultor(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                      </div>

                      {/* Photo Upload Container */}
                      <div className="pt-2 space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Foto do Corretor (PNG sem fundo)</label>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Upload Drag & Drop Area */}
                          <div 
                            className={`md:col-span-2 border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative min-h-[85px] ${
                              dragActive 
                                ? "border-blue-500 bg-blue-50/50" 
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById("broker-photo-upload")?.click()}
                          >
                            <input 
                              type="file" 
                              id="broker-photo-upload" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleFileChange}
                            />
                            <div className="space-y-1">
                              <p className="text-[11px] font-bold text-slate-700">
                                Clique para selecionar ou arraste sua foto aqui
                              </p>
                              <p className="text-[9px] text-slate-400 font-medium">
                                Formato recomendado: PNG transparente (sem fundo)
                              </p>
                            </div>
                          </div>

                          {/* Thumbnail / Config Area */}
                          <div className="border border-slate-150 rounded-xl p-3 bg-white flex flex-col justify-between min-h-[85px]">
                            {fotoCorretor ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                                    <img src={fotoCorretor} alt="Preview" className="w-full h-full object-contain" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-slate-700 truncate">Foto Carregada</p>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setFotoCorretor("");
                                        setExibirFotoCorretor(false);
                                      }}
                                      className="text-red-500 hover:text-red-700 text-[9px] font-bold uppercase tracking-wider"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-slate-100">
                                  <input 
                                    type="checkbox" 
                                    checked={exibirFotoCorretor}
                                    onChange={(e) => setExibirFotoCorretor(e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                  />
                                  <span className="text-[9.5px] font-bold text-slate-600 uppercase tracking-tight select-none">Mostrar no PDF</span>
                                </label>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                                <p className="text-[10px] font-bold uppercase tracking-wider">Nenhuma foto</p>
                                <p className="text-[9px] mt-0.5">Sem exibição no topo</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {model === "reducao" && (
                      <>
                        {/* Section: Resumo Estratégia */}
                        <div className="space-y-4 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                            <Sparkles className="w-4 h-4 text-slate-400" />
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">RESUMO</span>
                          </div>

                          {/* Line with three margin fields */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                            {/* MARGEM PRINCIPAL */}
                            {(() => {
                              const isPrincipalActive = margemPrincipalVal !== "";
                              const principalValNum = parseFloat(margemPrincipalVal);
                              const isPrincipalPositive = !isNaN(principalValNum) ? principalValNum > 0 : clientPrincipalMargem > 0;
                              return (
                                <div className="space-y-1">
                                  <div className="h-8 flex items-end pb-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Margem Principal</label>
                                  </div>
                                  <div className="relative">
                                    <span className={`absolute left-3.5 top-2.5 text-[11px] font-bold transition-colors duration-200 ${
                                      isPrincipalActive
                                        ? isPrincipalPositive ? "text-emerald-500" : "text-red-500"
                                        : "text-slate-400"
                                    }`}>R$</span>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={margemPrincipalVal}
                                      onChange={(e) => setMargemPrincipalVal(e.target.value)}
                                      className={`w-full border rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold focus:outline-none transition-all duration-200 text-right ${
                                        isPrincipalActive
                                          ? isPrincipalPositive
                                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-800 focus:border-emerald-500 placeholder:text-slate-400/60"
                                            : "bg-red-50/80 border-red-300 text-red-800 focus:border-red-500 placeholder:text-slate-400/60"
                                          : "bg-white border-slate-200 text-slate-800 focus:border-blue-500 placeholder:text-slate-400/40"
                                      }`}
                                      placeholder={clientPrincipalMargem !== undefined ? clientPrincipalMargem.toFixed(2).replace(".", ",") : "0,00"}
                                    />
                                  </div>
                                </div>
                              );
                            })()}

                            {/* MARGEM CARTÃO CONSIGNADO */}
                            {(() => {
                              const isCartaoConsignadoActive = margemCartaoConsignadoVal !== "";
                              const cartaoConsignadoValNum = parseFloat(margemCartaoConsignadoVal);
                              const isCartaoConsignadoPositive = !isNaN(cartaoConsignadoValNum) ? cartaoConsignadoValNum > 0 : clientCartaoConsignadoMargem > 0;
                              return (
                                <div className="space-y-1">
                                  <div className="h-8 flex items-end pb-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Margem Cartão Consignado</label>
                                  </div>
                                  <div className="relative">
                                    <span className={`absolute left-3.5 top-2.5 text-[11px] font-bold transition-colors duration-200 ${
                                      isCartaoConsignadoActive
                                        ? isCartaoConsignadoPositive ? "text-emerald-500" : "text-red-500"
                                        : "text-slate-400"
                                    }`}>R$</span>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={margemCartaoConsignadoVal}
                                      onChange={(e) => setMargemCartaoConsignadoVal(e.target.value)}
                                      className={`w-full border rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold focus:outline-none transition-all duration-200 text-right ${
                                        isCartaoConsignadoActive
                                          ? isCartaoConsignadoPositive
                                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-800 focus:border-emerald-500 placeholder:text-slate-400/60"
                                            : "bg-red-50/80 border-red-300 text-red-800 focus:border-red-500 placeholder:text-slate-400/60"
                                          : "bg-white border-slate-200 text-slate-800 focus:border-blue-500 placeholder:text-slate-400/40"
                                      }`}
                                      placeholder={clientCartaoConsignadoMargem !== undefined ? clientCartaoConsignadoMargem.toFixed(2).replace(".", ",") : "0,00"}
                                    />
                                  </div>
                                </div>
                              );
                            })()}

                            {/* MARGEM CARTÃO BENEFÍCIO */}
                            {(() => {
                              const isCartaoBeneficioActive = margemCartaoBeneficioVal !== "";
                              const cartaoBeneficioValNum = parseFloat(margemCartaoBeneficioVal);
                              const isCartaoBeneficioPositive = !isNaN(cartaoBeneficioValNum) ? cartaoBeneficioValNum > 0 : clientCartaoBeneficioMargem > 0;
                              return (
                                <div className="space-y-1">
                                  <div className="h-8 flex items-end pb-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Margem Cartão Benefício</label>
                                  </div>
                                  <div className="relative">
                                    <span className={`absolute left-3.5 top-2.5 text-[11px] font-bold transition-colors duration-200 ${
                                      isCartaoBeneficioActive
                                        ? isCartaoBeneficioPositive ? "text-purple-500" : "text-red-500"
                                        : "text-slate-400"
                                    }`}>R$</span>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={margemCartaoBeneficioVal}
                                      onChange={(e) => setMargemCartaoBeneficioVal(e.target.value)}
                                      className={`w-full border rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold focus:outline-none transition-all duration-200 text-right ${
                                        isCartaoBeneficioActive
                                          ? isCartaoBeneficioPositive
                                            ? "bg-purple-50/80 border-purple-300 text-purple-800 focus:border-purple-500 placeholder:text-slate-400/60"
                                            : "bg-red-50/80 border-red-300 text-red-800 focus:border-red-500 placeholder:text-slate-400/60"
                                          : "bg-white border-slate-200 text-slate-800 focus:border-blue-500 placeholder:text-slate-400/40"
                                      }`}
                                      placeholder={clientCartaoBeneficioMargem !== undefined ? clientCartaoBeneficioMargem.toFixed(2).replace(".", ",") : "0,00"}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Line with Valor Liberado and Porcentagem de Redução */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div className="space-y-1">
                              <div className="h-8 flex items-end pb-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Valor Liberado</label>
                              </div>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-[11px] font-bold text-slate-400">R$</span>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={valorLiberado}
                                  onChange={(e) => setValorLiberado(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm text-right"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="h-8 flex items-end justify-between pb-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Porcentagem de Redução</label>
                                {!isSupervisor && (
                                  <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase leading-none">Supervisor apenas</span>
                                )}
                              </div>
                              <div className="relative">
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={porcentagemReducao}
                                  onChange={(e) => setPorcentagemReducao(e.target.value)}
                                  className={`w-full border rounded-xl px-3.5 py-2 text-[12px] font-bold focus:outline-none shadow-sm pr-7 text-right ${
                                    isSupervisor 
                                      ? "bg-white border-slate-200 text-slate-800 focus:border-blue-500" 
                                      : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                  }`}
                                  disabled={!isSupervisor}
                                />
                                <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section: Situação das Parcelas */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-slate-400" />
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">SITUAÇÃO ATUAL DAS PARCELAS</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Exibir Taxa</span>
                                <button
                                  type="button"
                                  onClick={() => setShowTaxa(!showTaxa)}
                                  className={`p-1 rounded ${showTaxa ? "text-[#162546] bg-[#162546]/10" : "text-slate-400 hover:bg-slate-100"}`}
                                >
                                  {showTaxa ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {contratos.map((contrato, index) => (
                              <div key={contrato.id || index} className="p-5 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-4 relative">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                    Contrato #{index + 1}
                                  </span>
                                  {contratos.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveContrato(contrato.id)}
                                      className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 hover:bg-red-50 rounded-lg transition-colors animate-fade-in"
                                    >
                                      Remover Contrato
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banco Atual</label>
                                    <input 
                                      type="text" 
                                      value={contrato.bancoAtual}
                                      onChange={(e) => updateContrato(index, "bancoAtual", e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm uppercase"
                                      placeholder="Ex: ITAÚ"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Parcela Atual</label>
                                    <div className="relative">
                                      <span className="absolute left-3.5 top-2 text-[11px] font-bold text-slate-400">R$</span>
                                      <input 
                                        type="number" 
                                        step="0.01"
                                        value={contrato.parcelaAtual}
                                        onChange={(e) => updateContrato(index, "parcelaAtual", e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm text-right"
                                        placeholder="0,00"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prazo Atual (meses)</label>
                                    <input 
                                      type="number" 
                                      value={contrato.prazoAtual}
                                      onChange={(e) => updateContrato(index, "prazoAtual", e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                                      placeholder="Ex: 84"
                                    />
                                  </div>
                                  {showTaxa && (
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Taxa Atual % (Opcional)</label>
                                      <div className="relative">
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          value={contrato.taxaAtual}
                                          onChange={(e) => updateContrato(index, "taxaAtual", e.target.value)}
                                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm pr-7 text-right"
                                          placeholder="0,00"
                                        />
                                        <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">%</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add Contract Button */}
                          <div className="pt-2 flex justify-start">
                            <button
                              type="button"
                              onClick={handleAddContrato}
                              className="px-5 py-2.5 bg-[#162546]/10 text-[#162546] hover:bg-[#162546]/15 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                            >
                              + Adicionar Outro Contrato
                            </button>
                          </div>
                        </div>

                        {/* Section: Como Fica as Parcelas Após Estratégia */}
                        <div className="space-y-4 pt-4">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-slate-400" />
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">COMO FICA AS PARCELAS APÓS ESTRATÉGIA</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Exibir Banco Destino</span>
                                <button
                                  type="button"
                                  onClick={() => setShowBancoDestino(!showBancoDestino)}
                                  className={`p-1 rounded ${showBancoDestino ? "text-[#162546] bg-[#162546]/10" : "text-slate-400 hover:bg-slate-100"}`}
                                >
                                  {showBancoDestino ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Exibir Nova Taxa</span>
                                <button
                                  type="button"
                                  onClick={() => setShowNovaTaxa(!showNovaTaxa)}
                                  className={`p-1 rounded ${showNovaTaxa ? "text-[#162546] bg-[#162546]/10" : "text-slate-400 hover:bg-slate-100"}`}
                                >
                                  {showNovaTaxa ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {contratos.map((contrato, index) => (
                              <div key={`estr-${contrato.id || index}`} className="p-5 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-4 relative">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                    Estratégia Contrato #{index + 1}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                  {showBancoDestino ? (
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banco Destino</label>
                                      <input 
                                        type="text" 
                                        value={contrato.bancoDestino}
                                        onChange={(e) => updateContrato(index, "bancoDestino", e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm uppercase"
                                        placeholder="Ex: CAIXA"
                                      />
                                    </div>
                                  ) : (
                                    <div className="hidden md:block" />
                                  )}
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nova Parcela</label>
                                    <div className="relative">
                                      <span className="absolute left-3.5 top-2 text-[11px] font-bold text-slate-400">R$</span>
                                      <input 
                                        type="number" 
                                        step="0.01"
                                        value={contrato.novaParcela}
                                        onChange={(e) => updateContrato(index, "novaParcela", e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm text-right"
                                        placeholder="0,00"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prazo Novo</label>
                                    <input 
                                      type="number" 
                                      value={contrato.novoPrazo}
                                      onChange={(e) => updateContrato(index, "novoPrazo", e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                                      placeholder="Ex: 84"
                                    />
                                  </div>
                                  {showNovaTaxa ? (
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nova Taxa % (Opcional)</label>
                                      <div className="relative">
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          value={contrato.novaTaxa || ""}
                                          onChange={(e) => updateContrato(index, "novaTaxa", e.target.value)}
                                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm pr-7 text-right"
                                          placeholder="0,00"
                                        />
                                        <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">%</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="hidden md:block" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {model === "novo-formato" && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Section: Parâmetros do Novo Formato */}
                        <div className="space-y-4 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                            <Sparkles className="w-4 h-4 text-[#F4C600]" />
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Parâmetros da Proposta</span>
                          </div>

                          <div className="space-y-4">
                            {/* Valor Liberado */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor Liberado (Novo Formato)</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-[11px] font-bold text-slate-400">R$</span>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={valorLiberado}
                                  onChange={(e) => setValorLiberado(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm text-right"
                                  placeholder="0,00"
                                />
                              </div>
                              <p className="text-[9px] text-slate-400 font-medium italic mt-1">
                                * O valor do Formato Rotativo será calculado automaticamente como 30% menor do que este valor.
                              </p>
                            </div>

                            {/* Dropdown Left Card and Hide Info Checkboxes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nome do Card Esquerdo</label>
                                <select
                                  value={tituloCardEsquerdo}
                                  onChange={(e) => setTituloCardEsquerdo(e.target.value as any)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[12px] font-bold text-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                                >
                                  <option value="FORMATO ROTATIVO" className="text-slate-800">FORMATO ROTATIVO</option>
                                  <option value="FORMATO ANTIGO" className="text-slate-800">FORMATO ANTIGO</option>
                                </select>
                              </div>
                              <div className="flex flex-col gap-2 pt-2 md:pt-0">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ocultar na Proposta</span>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 bg-white border border-slate-150 rounded-xl p-2 shadow-sm">
                                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input 
                                      type="checkbox" 
                                      checked={ocultarPrazoReal} 
                                      onChange={(e) => setOcultarPrazoReal(e.target.checked)}
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Prazo Real</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input 
                                      type="checkbox" 
                                      checked={ocultarTaxaReal} 
                                      onChange={(e) => setOcultarTaxaReal(e.target.checked)}
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Taxa Real</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input 
                                      type="checkbox" 
                                      checked={ocultarMargem} 
                                      onChange={(e) => setOcultarMargem(e.target.checked)}
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Margem</span>
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* Left vs Right parameters */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left Card Config */}
                              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{tituloCardEsquerdo} (Card Esquerdo)</span>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prazo Real (Meses)</label>
                                    <input 
                                      type="number" 
                                      value={prazoEfetivoRotativo}
                                      onChange={(e) => {
                                        setPrazoEfetivoRotativo(e.target.value);
                                        setIsManualPrazoEfetivoRotativo(true);
                                      }}
                                      className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[12px] font-bold focus:outline-none focus:border-blue-500 shadow-sm ${
                                        isManualPrazoEfetivoRotativo ? "text-slate-800" : "text-slate-400"
                                      }`}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Taxa Real % a.m.</label>
                                    <input 
                                      type="text" 
                                      value={taxaEfetivaRotativo}
                                      onChange={(e) => {
                                        setTaxaEfetivaRotativo(e.target.value);
                                        setIsManualTaxaEfetivaRotativo(true);
                                      }}
                                      className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[12px] font-bold focus:outline-none focus:border-blue-500 shadow-sm ${
                                        isManualTaxaEfetivaRotativo ? "text-slate-800" : "text-slate-400"
                                      }`}
                                    />
                                  </div>
                                </div>

                                {/* Margens de Consulta Visual */}
                                <div className="pt-2 border-t border-slate-200/60">
                                  <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Margens para Consulta:</span>
                                  <div className="grid grid-cols-3 gap-1.5 bg-white p-2 rounded-lg border border-slate-150 text-[9px]">
                                    <div>
                                      <p className="font-semibold text-slate-400 uppercase leading-tight text-[7px]">Principal</p>
                                      <p className="font-black text-slate-700 leading-none mt-0.5">{formatBRL(clientPrincipalMargem || 0)}</p>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-400 uppercase leading-tight text-[7px]">Cartão Cons.</p>
                                      <p className="font-black text-slate-700 leading-none mt-0.5">{formatBRL(clientCartaoConsignadoMargem || 0)}</p>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-400 uppercase leading-tight text-[7px]">Cartão Ben.</p>
                                      <p className="font-black text-purple-700 leading-none mt-0.5">{formatBRL(clientCartaoBeneficioMargem || 0)}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Campo de Digitação de Margem */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Margem:</label>
                                  <div className="relative">
                                    <span className="absolute left-3.5 top-1.5 text-[11px] font-bold text-slate-400">R$</span>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={margemPrincipalVal}
                                      onChange={(e) => setMargemPrincipalVal(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-1.5 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm text-right"
                                      placeholder="0,00"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Right Card Config */}
                              <div className="p-4 bg-yellow-50/40 border border-yellow-200/50 rounded-xl space-y-3">
                                <span className="text-[10px] font-black text-yellow-600 uppercase tracking-wider">Novo Formato (Card Direito)</span>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-[#162546] uppercase tracking-widest">Prazo Real (Meses)</label>
                                    <input 
                                      type="number" 
                                      value={prazoEfetivoNovo}
                                      onChange={(e) => {
                                        setPrazoEfetivoNovo(e.target.value);
                                        setIsManualPrazoEfetivoNovo(true);
                                      }}
                                      className={`w-full bg-white border border-yellow-200 rounded-xl px-3 py-1.5 text-[12px] font-bold focus:outline-none focus:border-yellow-500 shadow-sm ${
                                        isManualPrazoEfetivoNovo ? "text-slate-800" : "text-slate-400"
                                      }`}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-[#162546] uppercase tracking-widest">Taxa Real % a.m.</label>
                                    <input 
                                      type="text" 
                                      value={taxaEfetivaNovo}
                                      onChange={(e) => {
                                        setTaxaEfetivaNovo(e.target.value);
                                        setIsManualTaxaEfetivaNovo(true);
                                      }}
                                      className={`w-full bg-white border border-yellow-200 rounded-xl px-3 py-1.5 text-[12px] font-bold focus:outline-none focus:border-yellow-500 shadow-sm ${
                                        isManualTaxaEfetivaNovo ? "text-slate-800" : "text-slate-400"
                                      }`}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Indicators and Validade */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Meses a menos pagando juros</label>
                                <input 
                                  type="number" 
                                  value={mesesAMenos}
                                  onChange={(e) => {
                                    setMesesAMenos(e.target.value);
                                    setIsManualMesesAMenos(true);
                                  }}
                                  className={`w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold focus:outline-none focus:border-blue-500 shadow-sm ${
                                    isManualMesesAMenos ? "text-slate-800" : "text-slate-400"
                                  }`}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Validade da Proposta (Dias)</label>
                                <input 
                                  type="number" 
                                  value={validadeDias}
                                  onChange={(e) => {
                                    setValidadeDias(e.target.value);
                                    setIsManualValidadeDias(true);
                                  }}
                                  className={`w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold focus:outline-none focus:border-blue-500 shadow-sm ${
                                    isManualValidadeDias ? "text-slate-800" : "text-slate-400"
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section: Documentação Necessária */}
                        <div className="space-y-4 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Documentação Necessária</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <label className="flex items-center gap-2.5 cursor-pointer p-2 bg-white border border-slate-150 rounded-xl hover:bg-slate-50 transition-colors select-none">
                              <input 
                                type="checkbox" 
                                checked={docFoto} 
                                onChange={(e) => setDocFoto(e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-[11px] font-semibold text-slate-700">Foto (RG ou CNH)</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer p-2 bg-white border border-slate-150 rounded-xl hover:bg-slate-50 transition-colors select-none">
                              <input 
                                type="checkbox" 
                                checked={docEndereco} 
                                onChange={(e) => setDocEndereco(e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-[11px] font-semibold text-slate-700">Endereço completo por escrito</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer p-2 bg-white border border-slate-150 rounded-xl hover:bg-slate-50 transition-colors select-none">
                              <input 
                                type="checkbox" 
                                checked={docEmail} 
                                onChange={(e) => setDocEmail(e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-[11px] font-semibold text-slate-700">E-mail</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer p-2 bg-white border border-slate-150 rounded-xl hover:bg-slate-50 transition-colors select-none">
                              <input 
                                type="checkbox" 
                                checked={docResidencia} 
                                onChange={(e) => setDocResidencia(e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-[11px] font-semibold text-slate-700">Comprovante de residência (quando exigido)</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer p-2 bg-white border border-slate-150 rounded-xl hover:bg-slate-50 transition-colors select-none">
                              <input 
                                type="checkbox" 
                                checked={docContracheque} 
                                onChange={(e) => setDocContracheque(e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-[11px] font-semibold text-slate-700">Último contracheque</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer p-2 bg-white border border-slate-150 rounded-xl hover:bg-slate-50 transition-colors select-none">
                              <input 
                                type="checkbox" 
                                checked={docExtrato} 
                                onChange={(e) => setDocExtrato(e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-[11px] font-semibold text-slate-700">Extrato de empréstimos (consignações)</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer p-2 bg-white border border-slate-150 rounded-xl hover:bg-slate-50 transition-colors select-none">
                              <input 
                                type="checkbox" 
                                checked={docAutorizacao} 
                                onChange={(e) => setDocAutorizacao(e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-[11px] font-semibold text-slate-700">Autorização para o banco ({bancoAutorizacao || "Portal"})</span>
                            </label>
                          </div>

                          {/* Campo de Banco para Autorização */}
                          <div className="pt-3 border-t border-slate-150">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banco para Autorização</label>
                              <input 
                                type="text" 
                                value={bancoAutorizacao}
                                onChange={(e) => setBancoAutorizacao(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                                placeholder="Digite o banco para substituir (Portal)"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                </div>

                {/* Real-time Math Summary Card */}
                {totalParcelaAtual > 0 && totalNovaParcela > 0 && (
                  <div className="p-6 bg-slate-900 text-white rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Economia Imediata Identificada</p>
                      <h4 className="text-[18px] font-bold tracking-tight">Otimização Realizada com Sucesso!</h4>
                      <p className="text-[12px] text-slate-300">Confira o resumo financeiro calculado em tempo real para a proposta.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 md:gap-10 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-10">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Redução Mensal</p>
                        <p className="text-[16px] font-bold text-emerald-400">{formatBRL(economiaMensal)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Redução Absoluta</p>
                        <p className="text-[16px] font-bold text-emerald-400">{parseFloat(porcentagemReducao).toFixed(2)}%</p>
                      </div>
                      <div className="space-y-0.5 col-span-2 sm:col-span-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Economia Total</p>
                        <p className="text-[16px] font-bold text-emerald-400">{formatBRL(totalContratoEconomia)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setStep("model-select")}
                    className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setStep("preview")}
                    disabled={model === "reducao" ? (!nomeCliente || totalParcelaAtual <= 0 || totalNovaParcela <= 0) : (!nomeCliente || !valorLiberado)}
                    className="px-8 py-2.5 bg-[#162546] hover:bg-[#162546]/90 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    Visualizar Proposta Comercial <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}

            {/* STEP 3: Preview and Export */}
            {step === "preview" && (
              <div className="space-y-8">
                
                <div className="text-center space-y-1">
                  <h4 className="text-[18px] font-bold text-slate-800">Visualização da Proposta Comercial</h4>
                  <p className="text-[13px] text-slate-500">Confira o layout do flyer oficial que será gerado e enviado ao cliente.</p>
                </div>

                <div className="flex flex-col xl:flex-row gap-8 items-start justify-center">
                  
                  {/* Left Column: Printable Document Container (Styled exactly like a marketing flyer, scale optimized) */}
                  <div className="w-full max-w-[500px] flex flex-col items-center gap-3">
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                        Clique na proposta para ampliar
                      </span>
                    </div>

                    <div 
                      onClick={() => setIsZoomed(true)}
                      className="w-full border border-slate-200 rounded-3xl overflow-hidden shadow-lg bg-slate-500/5 p-4 flex justify-center cursor-zoom-in hover:shadow-xl hover:border-slate-300 transition-all group relative"
                    >
                      {/* Scale Wrapper for flyer to fit in thumbnail nicely without clipping */}
                      {(() => {
                        return (
                          <div className="w-full flex justify-center items-start overflow-hidden" style={{ height: '480px' }}>
                            <div 
                              className="origin-top transition-transform"
                              style={{ 
                                width: '794px', 
                                transform: `scale(0.40)`
                              }}
                            >
                              {/* The Template Canvas - standard A4 aspect ratio representation */}
                              <div 
                                ref={previewRef}
                                id="proposal-export-template"
                                className="bg-white text-slate-900 font-sans shadow-xl w-[794px] flex flex-col justify-start relative overflow-hidden shrink-0 text-left h-auto"
                                style={{
                                  width: '794px',
                                  minWidth: '794px',
                                }}
                              >
                                {renderProposalTemplateContent(false)}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Actions and Guides */}
                  <div className="flex-1 max-w-[360px] space-y-6">
                    <div className="p-6 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-4">
                      <h5 className="text-[12px] font-bold text-slate-800 uppercase tracking-wider">Selecione o Formato para Exportação</h5>
                      <p className="text-[12px] text-slate-500 leading-relaxed">
                        Exporte a simulação no formato ideal para enviar via WhatsApp ou E-mail para seu cliente.
                      </p>

                      <div className="space-y-2 pt-2">
                        {/* PDF Export Button */}
                        <button
                          onClick={() => handleExport("pdf")}
                          disabled={isExporting !== null}
                          className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white transition-colors py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          {isExporting === "pdf" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4 text-emerald-400" />
                          )}
                          Salvar como Documento PDF
                        </button>

                        {/* JPG Export Button */}
                        <button
                          onClick={() => handleExport("jpg")}
                          disabled={isExporting !== null}
                          className="w-full bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-50 text-slate-700 transition-colors py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          {isExporting === "jpg" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 text-blue-500" />
                          )}
                          Baixar Imagem JPG
                        </button>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex justify-start gap-3">
                      <button
                        onClick={() => setStep("form")}
                        className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                      >
                        Ajustar Campos
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            )}

          </div>
        </motion.div>
      </div>

      {isZoomed && (
        <div 
          key="simulation-modal-zoom"
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-[160] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
          {/* Close Button */}
          <button 
            onClick={() => setIsZoomed(false)}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Zoomed content container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-3xl shadow-2xl overflow-auto max-w-[95vw] max-h-[92vh] p-4 cursor-default border border-slate-100"
          >
            <div className="w-full flex justify-center items-start">
              {/* Copy of the Proposal Template Flyer shown at 100% size with scrolling */}
              <div 
                className="bg-white text-slate-900 font-sans w-[794px] flex flex-col justify-start relative overflow-hidden shrink-0 shadow-lg text-left h-auto"
                style={{
                  width: '794px',
                  minWidth: '794px',
                }}
              >
                {renderProposalTemplateContent(true)}
              </div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
