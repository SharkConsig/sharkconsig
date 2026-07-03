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
  Building
} from "lucide-react";
import { getContractTypeInfo } from "@/lib/contratos-mapping";
import { toPng, toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

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
  perfil: { role?: string; nome?: string; telefone?: string; } | null;
  activeRegIndex?: number;
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

export function SimulationModal({ isOpen, onClose, client, registrations, perfil, activeRegIndex }: SimulationModalProps) {
  const [step, setStep] = useState<"model-select" | "form" | "preview">("model-select");
  const [model, setModel] = useState<"reducao" | "outros">("reducao");

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



  // Multi-contract state
  const [contratos, setContratos] = useState<SimContract[]>([]);

  const [showTaxa, setShowTaxa] = useState(false);
  const [showBancoDestino, setShowBancoDestino] = useState(false);
  const [showNovaTaxa, setShowNovaTaxa] = useState(false);
  const [isExporting, setIsExporting] = useState<"pdf" | "png" | "jpg" | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

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
    if (client) {
      setNomeCliente(client.nome || "");
      setCpfCliente(maskCPF(client.cpf));
    }
    if (perfil) {
      setNomeConsultor(perfil.nome || "");
      setTelefoneConsultor(perfil.telefone || "");
    }

    // Default pre-fill if existing loans exist
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
  }, [client, perfil, isOpen, activeRegIndex]);

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
      
      // Configure high-quality options for html-to-image
      const options = {
        quality: 1.0,
        pixelRatio: 2.5,
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '794px',
          height: '1123px'
        }
      };

      if (format === "png" || format === "jpg") {
        const dataUrl = format === "png" 
          ? await toPng(element, options) 
          : await toJpeg(element, options);

        const link = document.createElement("a");
        const safeName = (nomeCliente || "Cliente").trim().replace(/\s+/g, "_");
        link.download = `proposta_reducao_${safeName}.${format}`;
        link.href = dataUrl;
        link.click();
      } else if (format === "pdf") {
        const dataUrl = await toPng(element, options);
        const pdf = new jsPDF("p", "mm", "a4");
        
        // A4 is 210mm x 297mm
        pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297, undefined, 'FAST');
        const safeName = (nomeCliente || "Cliente").trim().replace(/\s+/g, "_");
        pdf.save(`proposta_reducao_${safeName}.pdf`);
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

                  {/* Option Outros (Desabilitado) */}
                  <div 
                    className="p-6 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col justify-between h-48 opacity-70 relative overflow-hidden"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 bg-slate-200 text-slate-400 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h5 className="text-[14px] font-bold text-slate-400 uppercase tracking-wider">Outras Estratégias</h5>
                      <p className="text-[12px] text-slate-400 leading-relaxed">
                        Novas modelagens como redução de taxa de juros pura, portabilidade com troco elevado e liberação de nova margem.
                      </p>
                    </div>
                    <span className="absolute top-4 right-4 bg-slate-200 text-slate-600 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest rounded-full">
                      Breve
                    </span>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest self-end">
                      Indisponível Inicialmente
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
                    <div className="space-y-3 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
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
                    </div>

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
                    disabled={!nomeCliente || totalParcelaAtual <= 0 || totalNovaParcela <= 0}
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
                      {/* Scale Wrapper for 794x1123 flyer to fit in thumbnail nicely without clipping */}
                      <div className="w-full flex justify-center items-start overflow-hidden" style={{ height: '480px' }}>
                        <div 
                          className="origin-top scale-[0.42] sm:scale-[0.45] transition-transform group-hover:scale-[0.43] sm:group-hover:scale-[0.46]"
                          style={{ width: '794px', height: '1123px' }}
                        >
                          {/* The Template Canvas - standard A4 aspect ratio representation */}
                          <div 
                            ref={previewRef}
                            id="proposal-export-template"
                            className="bg-white text-slate-900 p-10 font-sans shadow-xl w-[794px] h-[1123px] flex flex-col justify-between relative overflow-hidden shrink-0 text-left"
                            style={{
                              width: '794px',
                              height: '1123px',
                              minWidth: '794px',
                              minHeight: '1123px'
                            }}
                          >
                      {/* Decorative Background Accents */}
                      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-100/40 to-transparent rounded-full blur-2xl pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-50/30 to-transparent rounded-full blur-3xl pointer-events-none"></div>

                      <div className="space-y-8">
                        {/* Flyer Header */}
                        <div className="flex items-center justify-between border-b pb-6 border-slate-100">
                          <div className="relative w-36 h-12">
                            <img 
                              src="/logo.png" 
                              alt="Logo ACERTO" 
                              className="object-contain w-full h-full"
                              crossOrigin="anonymous"
                            />
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Otimização de Crédito</p>
                            <p className="text-[10px] font-black text-slate-900 uppercase mt-0.5">SharkConsig Platform</p>
                          </div>
                        </div>

                        {/* Title Block */}
                        <div className="text-center space-y-2 py-2">
                          <h2 className="text-[22px] font-black text-slate-900 tracking-tight leading-tight uppercase">
                            Proposta Comercial de Redução de Parcela
                          </h2>
                          <div className="w-16 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-1">
                            Simulação elaborada em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {/* Card: Client details */}
                        <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 space-y-3">
                          <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Identificação do Cliente</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nome Comercial</p>
                              <p className="text-[12px] font-bold text-slate-800 uppercase truncate">{nomeCliente}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">CPF Beneficiário</p>
                              <p className="text-[12px] font-mono font-bold text-slate-800">{cpfCliente}</p>
                            </div>
                          </div>
                        </div>

                        {/* Main Financial Comparison */}
                        {contratos.length === 1 ? (
                          <div className="grid grid-cols-2 gap-5">
                            {/* Left Card: Current situation */}
                            <div className="border border-red-100 rounded-2xl p-5 bg-red-50/30 flex flex-col justify-between space-y-4">
                              <div>
                                <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                  Situação Atual
                                </span>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-3">Instituição de Origem</p>
                                <p className="text-[13px] font-black text-slate-700 uppercase truncate">{contratos[0].bancoAtual || "NÃO INFORMADO"}</p>
                              </div>

                              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Parcela Mensal Atual</p>
                                  <p className="text-[18px] font-black text-slate-800 tracking-tight">{formatBRL(contratos[0].parcelaAtual)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Prazo Restante</p>
                                    <p className="text-[12px] font-bold text-slate-800">{contratos[0].prazoAtual ? `${contratos[0].prazoAtual} meses` : "-"}</p>
                                  </div>
                                  {showTaxa && contratos[0].taxaAtual && (
                                    <div>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Taxa Atual %</p>
                                      <p className="text-[12px] font-bold text-slate-800">{parseFloat(contratos[0].taxaAtual).toFixed(2)}%</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right Card: Optimized with Acerto */}
                            <div className="border border-emerald-100 rounded-2xl p-5 bg-emerald-50/30 flex flex-col justify-between space-y-4">
                              <div>
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                  Otimização Acerto
                                </span>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-3">Instituição de Destino</p>
                                <p className="text-[13px] font-black text-emerald-800 uppercase truncate">
                                  {showBancoDestino && contratos[0].bancoDestino ? contratos[0].bancoDestino : "REDUÇÃO GARANTIDA"}
                                </p>
                              </div>

                              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                                <div>
                                  <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Nova Parcela Mensal</p>
                                  <p className="text-[18px] font-black text-emerald-700 tracking-tight">{formatBRL(contratos[0].novaParcela)}</p>
                                </div>
                                <div className={`grid grid-cols-${showNovaTaxa && contratos[0].novaTaxa ? '3' : '2'} gap-2`}>
                                  <div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Novo Prazo</p>
                                    <p className="text-[12px] font-bold text-slate-800">{(contratos[0].novoPrazo || contratos[0].prazoAtual) ? `${contratos[0].novoPrazo || contratos[0].prazoAtual} meses` : "-"}</p>
                                  </div>
                                  {showNovaTaxa && contratos[0].novaTaxa && (
                                    <div>
                                      <p className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider">Nova Taxa %</p>
                                      <p className="text-[12px] font-bold text-emerald-700">{parseFloat(contratos[0].novaTaxa).toFixed(2)}%</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider">Redução Aplicada</p>
                                    <p className="text-[12px] font-black text-emerald-600">{parseFloat(porcentagemReducao).toFixed(2)}%</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Multi-Contract Comparative Table */
                          <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-[#162546] text-white text-[9px] font-bold uppercase tracking-wider">
                                  <th className="p-3">Banco Origem</th>
                                  <th className="p-3 text-right">Parcela Atual</th>
                                  <th className="p-3">Banco Destino</th>
                                  <th className="p-3 text-right">Nova Parcela</th>
                                  {showNovaTaxa && <th className="p-3 text-center">Nova Taxa</th>}
                                  <th className="p-3 text-center">Prazo (Meses)</th>
                                  <th className="p-3 text-right">Economia Mensal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-[11px]">
                                {contratos.map((c, idx) => {
                                  const pAtual = parseFloat(c.parcelaAtual) || 0;
                                  const pNova = parseFloat(c.novaParcela) || 0;
                                  const econ = Math.max(0, pAtual - pNova);
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="p-3 font-bold text-slate-800 uppercase truncate max-w-[120px]">{c.bancoAtual || "NÃO INFORMADO"}</td>
                                      <td className="p-3 text-right font-bold text-red-600">{formatBRL(pAtual)}</td>
                                      <td className="p-3 font-bold text-emerald-800 uppercase truncate max-w-[120px]">{showBancoDestino && c.bancoDestino ? c.bancoDestino : "REDUÇÃO GARANTIDA"}</td>
                                      <td className="p-3 text-right font-black text-emerald-600">{formatBRL(pNova)}</td>
                                      {showNovaTaxa && (
                                        <td className="p-3 text-center font-bold text-emerald-700">
                                          {c.novaTaxa ? `${parseFloat(c.novaTaxa).toFixed(2)}%` : "-"}
                                        </td>
                                      )}
                                      <td className="p-3 text-center font-bold text-slate-700">{c.novoPrazo || c.prazoAtual || "-"}</td>
                                      <td className="p-3 text-right font-black text-emerald-600">{formatBRL(econ)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Section: Valor Liberado / Troco (Only if configured) */}
                        {valorLiberado && parseFloat(valorLiberado) > 0 && (
                          <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-5 bg-emerald-50/10 text-center space-y-1">
                            <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest">
                              Recursos Disponibilizados na Operação
                            </p>
                            <h3 className="text-[20px] font-black text-emerald-700 tracking-tight">
                              ESTIMATIVA DE TROCO LIBERADO: {formatBRL(valorLiberado)}
                            </h3>
                            <p className="text-[10px] text-slate-500">
                              Valor creditado diretamente em sua conta bancária sem alterar o limite máximo de margem.
                            </p>
                          </div>
                        )}

                        {/* Section: Guaranteed Economy metrics */}
                        <div className="bg-slate-900 text-white rounded-2xl p-6 flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Resumo de Ganhos Financeiros</p>
                            <h4 className="text-[14px] font-bold tracking-tight">Balanço Consolidado da Otimização</h4>
                          </div>
                          <div className="flex gap-8 border-l border-slate-800 pl-8">
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Economia Mensal</p>
                              <p className="text-[14px] font-bold text-emerald-400">{formatBRL(economiaMensal)}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Economia Total Garantida</p>
                              <p className="text-[14px] font-bold text-emerald-400">{formatBRL(totalContratoEconomia)}</p>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Footer Info & Sign */}
                      <div className="space-y-5 pt-6 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Consultor Autorizado</p>
                            <p className="text-[11px] font-bold text-slate-800 uppercase">{nomeConsultor || "ACERTO CONSULTORIA"}</p>
                            {telefoneConsultor && (
                              <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-emerald-500 fill-emerald-500/10" /> {telefoneConsultor}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Validade da Proposta</p>
                            <p className="text-[11px] font-bold text-slate-800">Válida por 3 dias úteis</p>
                            <p className="text-[8px] text-slate-500 mt-0.5">Condições sujeitas à averbação pelo órgão</p>
                          </div>
                        </div>

                        {/* Bottom Disclaimer */}
                        <div className="text-[8px] text-slate-400 text-center leading-normal border-t pt-3 border-slate-100 uppercase font-medium">
                          Esta simulação é um demonstrativo informativo baseado nas regras de consignação atuais e não constitui contrato de crédito automático. As condições reais de fechamento dependem de validação de dados cadastrais, margem disponível e políticas internas das instituições financeiras parceiras.
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
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
                className="bg-white text-slate-900 p-10 font-sans w-[794px] h-[1123px] flex flex-col justify-between relative overflow-hidden shrink-0 shadow-lg text-left"
                style={{
                  width: '794px',
                  height: '1123px',
                  minWidth: '794px',
                  minHeight: '1123px'
                }}
              >
                {/* Decorative Background Accents */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-100/40 to-transparent rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-50/30 to-transparent rounded-full blur-3xl pointer-events-none"></div>

                <div className="space-y-8">
                  {/* Flyer Header */}
                  <div className="flex items-center justify-between border-b pb-6 border-slate-100">
                    <div className="relative w-36 h-12">
                      <img 
                        src="/logo.png" 
                        alt="Logo ACERTO" 
                        className="object-contain w-full h-full"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Otimização de Crédito</p>
                      <p className="text-[10px] font-black text-slate-900 uppercase mt-0.5">SharkConsig Platform</p>
                    </div>
                  </div>

                  {/* Title Block */}
                  <div className="text-center space-y-2 py-2">
                    <h2 className="text-[22px] font-black text-slate-900 tracking-tight leading-tight uppercase">
                      Proposta Comercial de Redução de Parcela
                    </h2>
                    <div className="w-16 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-1">
                      Simulação elaborada em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Card: Client details */}
                  <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Identificação do Cliente</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nome Comercial</p>
                        <p className="text-[12px] font-bold text-slate-800 uppercase truncate">{nomeCliente}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">CPF Beneficiário</p>
                        <p className="text-[12px] font-mono font-bold text-slate-800">{cpfCliente}</p>
                      </div>
                    </div>
                  </div>

                  {/* Main Financial Comparison */}
                  {contratos.length === 1 ? (
                    <div className="grid grid-cols-2 gap-5">
                      {/* Left Card: Current situation */}
                      <div className="border border-red-100 rounded-2xl p-5 bg-red-50/30 flex flex-col justify-between space-y-4">
                        <div>
                          <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Situação Atual
                          </span>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-3">Instituição de Origem</p>
                          <p className="text-[13px] font-black text-slate-700 uppercase truncate">{contratos[0].bancoAtual || "NÃO INFORMADO"}</p>
                        </div>

                        <div className="space-y-2.5 pt-2 border-t border-slate-100">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Parcela Mensal Atual</p>
                            <p className="text-[18px] font-black text-slate-800 tracking-tight">{formatBRL(contratos[0].parcelaAtual)}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Prazo Restante</p>
                              <p className="text-[12px] font-bold text-slate-800">{contratos[0].prazoAtual ? `${contratos[0].prazoAtual} meses` : "-"}</p>
                            </div>
                            {showTaxa && contratos[0].taxaAtual && (
                              <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Taxa Atual %</p>
                                <p className="text-[12px] font-bold text-slate-800">{parseFloat(contratos[0].taxaAtual).toFixed(2)}%</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Card: Optimized with Acerto */}
                      <div className="border border-emerald-100 rounded-2xl p-5 bg-emerald-50/30 flex flex-col justify-between space-y-4">
                        <div>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Otimização Acerto
                          </span>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-3">Instituição de Destino</p>
                          <p className="text-[13px] font-black text-emerald-800 uppercase truncate">
                            {showBancoDestino && contratos[0].bancoDestino ? contratos[0].bancoDestino : "REDUÇÃO GARANTIDA"}
                          </p>
                        </div>

                        <div className="space-y-2.5 pt-2 border-t border-slate-100">
                          <div>
                            <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Nova Parcela Mensal</p>
                            <p className="text-[18px] font-black text-emerald-700 tracking-tight">{formatBRL(contratos[0].novaParcela)}</p>
                          </div>
                          <div className={`grid grid-cols-${showNovaTaxa && contratos[0].novaTaxa ? '3' : '2'} gap-2`}>
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Novo Prazo</p>
                              <p className="text-[12px] font-bold text-slate-800">{(contratos[0].novoPrazo || contratos[0].prazoAtual) ? `${contratos[0].novoPrazo || contratos[0].prazoAtual} meses` : "-"}</p>
                            </div>
                            {showNovaTaxa && contratos[0].novaTaxa && (
                              <div>
                                <p className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider">Nova Taxa %</p>
                                <p className="text-[12px] font-bold text-emerald-700">{parseFloat(contratos[0].novaTaxa).toFixed(2)}%</p>
                              </div>
                            )}
                            <div>
                              <p className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider">Redução Aplicada</p>
                              <p className="text-[12px] font-black text-emerald-600">{parseFloat(porcentagemReducao).toFixed(2)}%</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Multi-Contract Comparative Table */
                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#162546] text-white text-[9px] font-bold uppercase tracking-wider">
                            <th className="p-3">Banco Origem</th>
                            <th className="p-3 text-right">Parcela Atual</th>
                            <th className="p-3">Banco Destino</th>
                            <th className="p-3 text-right">Nova Parcela</th>
                            {showNovaTaxa && <th className="p-3 text-center">Nova Taxa</th>}
                            <th className="p-3 text-center">Prazo (Meses)</th>
                            <th className="p-3 text-right">Economia Mensal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {contratos.map((c, idx) => {
                            const pAtual = parseFloat(c.parcelaAtual) || 0;
                            const pNova = parseFloat(c.novaParcela) || 0;
                            const econ = Math.max(0, pAtual - pNova);
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 font-bold text-slate-800 uppercase truncate max-w-[120px]">{c.bancoAtual || "NÃO INFORMADO"}</td>
                                <td className="p-3 text-right font-bold text-red-600">{formatBRL(pAtual)}</td>
                                <td className="p-3 font-bold text-emerald-800 uppercase truncate max-w-[120px]">{showBancoDestino && c.bancoDestino ? c.bancoDestino : "REDUÇÃO GARANTIDA"}</td>
                                <td className="p-3 text-right font-black text-emerald-600">{formatBRL(pNova)}</td>
                                {showNovaTaxa && (
                                  <td className="p-3 text-center font-bold text-emerald-700">
                                    {c.novaTaxa ? `${parseFloat(c.novaTaxa).toFixed(2)}%` : "-"}
                                  </td>
                                )}
                                <td className="p-3 text-center font-bold text-slate-700">{c.novoPrazo || c.prazoAtual || "-"}</td>
                                <td className="p-3 text-right font-black text-emerald-600">{formatBRL(econ)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Section: Valor Liberado / Troco (Only if configured) */}
                  {valorLiberado && parseFloat(valorLiberado) > 0 && (
                    <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-5 bg-emerald-50/10 text-center space-y-1">
                      <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest">
                        Recursos Disponibilizados na Operação
                      </p>
                      <h3 className="text-[20px] font-black text-emerald-700 tracking-tight">
                        ESTIMATIVA DE TROCO LIBERADO: {formatBRL(valorLiberado)}
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Valor creditado diretamente em sua conta bancária sem alterar o limite máximo de margem.
                      </p>
                    </div>
                  )}

                  {/* Section: Guaranteed Economy metrics */}
                  <div className="bg-slate-900 text-white rounded-2xl p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Resumo de Ganhos Financeiros</p>
                      <h4 className="text-[14px] font-bold tracking-tight">Balanço Consolidado da Otimização</h4>
                    </div>
                    <div className="flex gap-8 border-l border-slate-800 pl-8">
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Economia Mensal</p>
                        <p className="text-[14px] font-bold text-emerald-400">{formatBRL(economiaMensal)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Economia Total Garantida</p>
                        <p className="text-[14px] font-bold text-emerald-400">{formatBRL(totalContratoEconomia)}</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer Info & Sign */}
                <div className="space-y-5 pt-6 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Consultor Autorizado</p>
                      <p className="text-[11px] font-bold text-slate-800 uppercase">{nomeConsultor || "ACERTO CONSULTORIA"}</p>
                      {telefoneConsultor && (
                        <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-500 fill-emerald-500/10" /> {telefoneConsultor}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Validade da Proposta</p>
                      <p className="text-[11px] font-bold text-slate-800">Válida por 3 dias úteis</p>
                      <p className="text-[8px] text-slate-500 mt-0.5">Condições sujeitas à averbação pelo órgão</p>
                    </div>
                  </div>

                  {/* Bottom Disclaimer */}
                  <div className="text-[8px] text-slate-400 text-center leading-normal border-t pt-3 border-slate-100 uppercase font-medium">
                    Esta simulação é um demonstrativo informativo baseado nas regras de consignação atuais e não constitui contrato de crédito automático. As condições reais de fechamento dependem de validação de dados cadastrais, margem disponível e políticas internas das instituições financeiras parceiras.
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
