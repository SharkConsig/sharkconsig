"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Calculator, 
  User, 
  Briefcase, 
  TrendingDown, 
  ArrowRight, 
  ArrowLeft,
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
  Zap,
  AlertTriangle
} from "lucide-react";
import { getContractTypeInfo } from "@/lib/contratos-mapping";
import { toPng, toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";
import CalculadoraPage from "@/app/(dashboard)/calculadora/page";

const parseCleanFloat = (val: string | number | null | undefined): number | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  const str = String(val).trim();
  if (!str) return null;
  
  // Remove "R$", spaces, and other non-numeric symbols except dots, commas, minus, and digits
  let cleaned = str.replace(/[^0-9.,-]/g, "").trim();
  if (!cleaned) return null;
  
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    const dotIndex = cleaned.indexOf(".");
    if (dotIndex !== -1) {
      const parts = cleaned.split(".");
      if (parts.length > 2) {
        cleaned = cleaned.replace(/\./g, "");
      } else {
        const decimalPart = parts[1];
        if (decimalPart.length === 3) {
          cleaned = cleaned.replace(/\./g, "");
        }
      }
    }
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

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
  const [model, setModel] = useState<"reducao" | "novo-formato" | "quitacao">("reducao");

  // Quitacao states
  const [quitacaoBancoAtual, setQuitacaoBancoAtual] = useState("");
  const [quitacaoSaldoQuitacao, setQuitacaoSaldoQuitacao] = useState("");
  const [quitacaoParcelaAtual, setQuitacaoParcelaAtual] = useState("");
  const [quitacaoPrazoRestante, setQuitacaoPrazoRestante] = useState("96x");
  const [quitacaoTotalAPagar, setQuitacaoTotalAPagar] = useState("");
  const [quitacaoTaxaAtual, setQuitacaoTaxaAtual] = useState("");
  const [ocultarQuitacaoPrazoRestante, setOcultarQuitacaoPrazoRestante] = useState(false);
  const [ocultarQuitacaoTotalAPagar, setOcultarQuitacaoTotalAPagar] = useState(false);
  const [ocultarQuitacaoBancoAtual, setOcultarQuitacaoBancoAtual] = useState(false);
  const [ocultarQuitacaoTaxaAtual, setOcultarQuitacaoTaxaAtual] = useState(false);

  const [quitacaoNovaParcela, setQuitacaoNovaParcela] = useState("");
  const [quitacaoMargemVolta, setQuitacaoMargemVolta] = useState("");
  const [quitacaoValorLiberado, setQuitacaoValorLiberado] = useState("");
  const [quitacaoEconomiaTotal, setQuitacaoEconomiaTotal] = useState("");
  const [quitacaoNovaTaxa, setQuitacaoNovaTaxa] = useState("");
  const [ocultarQuitacaoTroco, setOcultarQuitacaoTroco] = useState(false);
  const [ocultarQuitacaoEconomiaTotal, setOcultarQuitacaoEconomiaTotal] = useState(false);
  const [ocultarQuitacaoNovaTaxa, setOcultarQuitacaoNovaTaxa] = useState(false);
  const quitacaoMostrarTroco = !ocultarQuitacaoTroco;

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
  const [docAutorizacao, setDocAutorizacao] = useState(false);
  const [bancoAutorizacao, setBancoAutorizacao] = useState("Portal");

  // Validade state
  const [validadeDias, setValidadeDias] = useState("");

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
  const [isManualQuitacaoTotalAPagar, setIsManualQuitacaoTotalAPagar] = useState<boolean>(false);
  const [isManualQuitacaoEconomiaTotal, setIsManualQuitacaoEconomiaTotal] = useState<boolean>(false);

  // Form states
  const [nomeCliente, setNomeCliente] = useState("");
  const [cpfCliente, setCpfCliente] = useState("");
  const [orgaoCliente, setOrgaoCliente] = useState("");
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
    const parseValueToNumber = (val: any): number => {
      if (val === null || val === undefined || val === "") return 0;
      if (typeof val === "number") return isNaN(val) ? 0 : val;
      const str = String(val).trim();
      if (!str) return 0;
      if (str.includes(",")) {
        const cleaned = str.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".");
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      } else {
        const cleaned = str.replace(/[^\d.-]/g, "");
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      }
    };

    const findMarginInObj = (obj: any, keys: string[]): number => {
      if (!obj || typeof obj !== "object") return 0;
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") {
          const num = parseValueToNumber(obj[k]);
          if (num > 0) return num;
        }
      }
      return 0;
    };

    const principalKeys = [
      "margem_35",
      "margem_35%",
      "margem_35_porcento",
      "margem_emprestimo_liquida",
      "margem_emprestimo",
      "margem_disponivel_emprestimo",
      "margem_disponivel",
      "margem_consignavel",
      "margem_emprestimo_consignado",
      "md_consignacoes",
      "mb_consignacoes",
      "margem_liquida",
      "margem_liquida_5",
      "margem",
      "margem_bruta"
    ];

    const cartaoConsignadoKeys = [
      "liquida_5",
      "liquida_5%",
      "margem_cartao_liquida",
      "margem_liquida_cartao",
      "margem_cartao_consignado",
      "md_cartao_credito",
      "mb_cartao_credito",
      "md_cartao",
      "mb_cartao",
      "margem_cartao",
      "rcc",
      "margem_rcc",
      "margem_cartao_bruta",
      "margem_5"
    ];

    const cartaoBeneficioKeys = [
      "beneficio_liquida_5",
      "beneficio_liquida_5%",
      "margem_cartao_beneficio",
      "margem_beneficio",
      "margem_cartao_beneficio_liquida",
      "md_cartao_beneficio",
      "mb_cartao_beneficio",
      "beneficio_liquida",
      "beneficio_bruta_5"
    ];

    const objectsToSearch: any[] = [];

    const activeReg = (activeRegIndex !== undefined && registrations && registrations[activeRegIndex]) 
      ? registrations[activeRegIndex] 
      : (registrations && registrations[0] ? registrations[0] : null);

    if (activeReg) objectsToSearch.push(activeReg);

    if (Array.isArray(registrations)) {
      for (const r of registrations) {
        if (r && !objectsToSearch.includes(r)) objectsToSearch.push(r);
      }
    }

    if (client && !objectsToSearch.includes(client)) objectsToSearch.push(client);

    let principal = 0;
    let cartaoConsignado = 0;
    let cartaoBeneficio = 0;

    for (const item of objectsToSearch) {
      if (!item || typeof item !== "object") continue;

      const subObjs: any[] = [item];

      const arrayFields = [
        "instituidores",
        "governo_sp_lotacoes",
        "prefeitura_sp_lotacoes",
        "governo_pi_lotacoes",
        "governo_ma_lotacoes",
        "governo_rr_instituidores",
        "governo_rr_lotacoes",
        "prefeitura_sp_identificacoes",
        "governo_sp_identificacoes",
        "matriculas",
        "identificacoes",
        "lotacoes",
        "contratos",
        "itens_credito",
        "itens",
        "margens"
      ];

      for (const f of arrayFields) {
        if (item[f]) {
          const arr = Array.isArray(item[f]) ? item[f] : [item[f]];
          for (const sub of arr) {
            if (sub && typeof sub === "object") subObjs.push(sub);
          }
        }
      }

      for (const target of subObjs) {
        if (!principal) principal = findMarginInObj(target, principalKeys);
        if (!cartaoConsignado) cartaoConsignado = findMarginInObj(target, cartaoConsignadoKeys);
        if (!cartaoBeneficio) cartaoBeneficio = findMarginInObj(target, cartaoBeneficioKeys);
      }

      if (principal > 0 && cartaoConsignado > 0 && cartaoBeneficio > 0) break;
    }

    if (!principal && margemPrincipalVal) principal = parseValueToNumber(margemPrincipalVal);
    if (!cartaoConsignado && margemCartaoConsignadoVal) cartaoConsignado = parseValueToNumber(margemCartaoConsignadoVal);
    if (!cartaoBeneficio && margemCartaoBeneficioVal) cartaoBeneficio = parseValueToNumber(margemCartaoBeneficioVal);

    return { principal, cartaoConsignado, cartaoBeneficio };
  };

  const { principal: clientPrincipalMargem, cartaoConsignado: clientCartaoConsignadoMargem, cartaoBeneficio: clientCartaoBeneficioMargem } = getClientMargins();

  // Existing loan contracts for dropdown pre-fill - bring ALL contracts from ALL registrations
  const existingLoans = useMemo(() => {
    if (!registrations) return [];
    return registrations.flatMap(reg => {
      const contracts = reg.itens_credito || [];
      return contracts.filter(c => getContractTypeInfo(c.tipo).category === "EMPRESTIMO");
    });
  }, [registrations]);

  const resolveOrgao = (activeReg: any): string => {
    if (!activeReg) return "NÃO INFORMADO";

    // 1. Governo de Roraima (governo_rr)
    const hasGovRR = activeReg.governo_rr_instituidores !== undefined || activeReg.uf === 'RR';
    if (hasGovRR) {
      const lotacao = activeReg.governo_rr_instituidores?.[0] || {};
      return lotacao.origem || activeReg.secretaria || activeReg.orgao || "NÃO INFORMADO";
    }

    // 2. SIAPE
    if (activeReg.currentInstituidor !== undefined) {
      return activeReg.currentInstituidor || activeReg.orgao || "NÃO INFORMADO";
    }

    // 3. Governo Maranhão
    if (activeReg.governo_ma_lotacoes !== undefined) {
      const lotacao = activeReg.governo_ma_lotacoes?.[0] || {};
      return lotacao.orgao || activeReg.secretaria || activeReg.orgao || "NÃO INFORMADO";
    }

    // 4. Governo Piauí
    if (activeReg.governo_pi_lotacoes !== undefined) {
      const lotacao = activeReg.governo_pi_lotacoes?.[0] || {};
      return lotacao.orgao || activeReg.secretaria || activeReg.orgao || "NÃO INFORMADO";
    }

    // 5. Governo SP
    if (activeReg.governo_sp_lotacoes !== undefined) {
      const lotacao = activeReg.governo_sp_lotacoes?.[0] || {};
      return lotacao.orgao || activeReg.orgao || activeReg.secretaria || "NÃO INFORMADO";
    }

    // 6. Prefeitura SP
    if (activeReg.prefeitura_sp_lotacoes !== undefined) {
      const lotacao = activeReg.prefeitura_sp_lotacoes?.[0] || {};
      return lotacao.orgao || activeReg.orgao || activeReg.secretaria || "NÃO INFORMADO";
    }

    // 7. Fallback para outros convênios (como governo_rj, prefeitura_santo_andre, prefeitura_contagem, governo_mg)
    return activeReg.orgao || activeReg.secretaria || "NÃO INFORMADO";
  };

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
        const activeReg = (activeRegIndex !== undefined && registrations && registrations[activeRegIndex]) 
          ? registrations[activeRegIndex] 
          : (registrations && registrations[0] ? registrations[0] : null);
        
        const initialOrgao = resolveOrgao(activeReg);
        setOrgaoCliente(String(initialOrgao).toUpperCase());

        const initialMargins = getClientMargins();
        if (initialMargins.principal > 0) setMargemPrincipalVal(String(initialMargins.principal));
        else setMargemPrincipalVal("");

        if (initialMargins.cartaoConsignado > 0) setMargemCartaoConsignadoVal(String(initialMargins.cartaoConsignado));
        else setMargemCartaoConsignadoVal("");

        if (initialMargins.cartaoBeneficio > 0) setMargemCartaoBeneficioVal(String(initialMargins.cartaoBeneficio));
        else setMargemCartaoBeneficioVal("");
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
      const hasOnlyDefaultEmpty = contratos.length === 0 || (contratos.length === 1 && !contratos[0].bancoAtual && !contratos[0].parcelaAtual);
      if (becameOpen || (hasOnlyDefaultEmpty && existingLoans.length > 0)) {
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

          // Pre-fill quitacao states - keep fields empty as requested
          setQuitacaoBancoAtual("");
          setQuitacaoParcelaAtual("");
          setQuitacaoPrazoRestante("96x");
          setQuitacaoMargemVolta("");
          setQuitacaoNovaParcela("");
          setQuitacaoSaldoQuitacao("");
          setQuitacaoValorLiberado("");
          setQuitacaoTotalAPagar("");
          setQuitacaoEconomiaTotal("");
          setQuitacaoTaxaAtual("");
          setQuitacaoNovaTaxa("");
          setIsManualQuitacaoTotalAPagar(false);
          setIsManualQuitacaoEconomiaTotal(false);
          setOcultarQuitacaoPrazoRestante(false);
          setOcultarQuitacaoTotalAPagar(false);
          setOcultarQuitacaoBancoAtual(false);
          setOcultarQuitacaoTroco(false);
          setOcultarQuitacaoEconomiaTotal(false);
          setOcultarQuitacaoTaxaAtual(false);
          setOcultarQuitacaoNovaTaxa(false);
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

          setQuitacaoBancoAtual("");
          setQuitacaoParcelaAtual("");
          setQuitacaoPrazoRestante("96x");
          setQuitacaoMargemVolta("");
          setQuitacaoNovaParcela("");
          setQuitacaoSaldoQuitacao("");
          setQuitacaoValorLiberado("");
          setQuitacaoTotalAPagar("");
          setQuitacaoEconomiaTotal("");
          setQuitacaoTaxaAtual("");
          setQuitacaoNovaTaxa("");
          setIsManualQuitacaoTotalAPagar(false);
          setIsManualQuitacaoEconomiaTotal(false);
          setOcultarQuitacaoPrazoRestante(false);
          setOcultarQuitacaoTotalAPagar(false);
          setOcultarQuitacaoBancoAtual(false);
          setOcultarQuitacaoTroco(false);
          setOcultarQuitacaoEconomiaTotal(false);
          setOcultarQuitacaoTaxaAtual(false);
          setOcultarQuitacaoNovaTaxa(false);
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

  // Automatically calculate Quitação Total a Pagar and Economia Total
  useEffect(() => {
    if (!isManualQuitacaoTotalAPagar) {
      const parsedPrazo = parseInt(quitacaoPrazoRestante) || 96;
      const pAtual = parseFloat(quitacaoParcelaAtual) || 0;
      const calculatedTotal = pAtual * parsedPrazo;
      setQuitacaoTotalAPagar(calculatedTotal > 0 ? calculatedTotal.toFixed(2) : "");
    }
  }, [quitacaoParcelaAtual, quitacaoPrazoRestante, isManualQuitacaoTotalAPagar]);

  useEffect(() => {
    if (!isManualQuitacaoEconomiaTotal) {
      const parsedPrazo = parseInt(quitacaoPrazoRestante) || 96;
      const pAtual = parseFloat(quitacaoParcelaAtual) || 0;
      const calculatedTotal = pAtual * parsedPrazo;
      const totalAPagar = quitacaoTotalAPagar ? parseFloat(quitacaoTotalAPagar) : calculatedTotal;
      const pNova = parseFloat(quitacaoNovaParcela) || 0;
      const calculatedEconomia = totalAPagar - (pNova * parsedPrazo);
      setQuitacaoEconomiaTotal(calculatedEconomia !== 0 ? calculatedEconomia.toFixed(2) : "");
    }
  }, [quitacaoTotalAPagar, quitacaoParcelaAtual, quitacaoPrazoRestante, quitacaoNovaParcela, isManualQuitacaoEconomiaTotal]);

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
              valor_liberado: parseCleanFloat(valorLiberado) || 0,
              nome_card_esquerdo: tituloCardEsquerdo,
              prazo_real_esquerdo: parseInt(prazoEfetivoRotativo) || 0,
              taxa_real_esquerdo: parseFloat(taxaEfetivaRotativo.replace(",", ".")) || 0,
              margem_esquerda: parseCleanFloat(margemPrincipalVal) || 0,
              prazo_real_direito: parseInt(prazoEfetivoNovo) || 0,
              taxa_real_direito: parseFloat(taxaEfetivaNovo.replace(",", ".")) || 0,
              meses_a_menos: parseInt(mesesAMenos) || 0,
              validade_proposta: isNaN(parseInt(validadeDias)) ? 0 : parseInt(validadeDias),
              documentos_necessarios: docsNecessarios,
              banco: bancoAutorizacao,
              arquivo_url: finalDataUrl,
              tipo_arquivo: format.toUpperCase()
            });
          saveErr = error;
        } else if (model === "quitacao") {
          const docsNecessarios = [
            docFoto && "Foto segurando o documento",
            docRG && "RG ou CNH (FRENTE E VERSO)",
            docEndereco && "Endereço completo por escrito",
            docEmail && "E-mail",
            docResidencia && "Comprovante de residência (quando exigido pelo banco)",
            docContracheque && "Último contracheque",
            docAutorizacao && `Autorização para o banco ${bancoAutorizacao ? (bancoAutorizacao.toLowerCase() === "portal" ? "(via app do Portal)" : bancoAutorizacao) : "(via app do Portal)"}`
          ].filter(Boolean);

          const { error } = await supabase
            .from("historico_proposta_comercial_quitacao_contrato")
            .insert({
              cliente_cpf: cleanCpf,
              cliente_nome: nomeCliente || client?.nome || "",
              user_id: activeUser?.id || null,
              user_nome: nomeConsultor || perfil?.nome || "",
              user_email: activeUser?.email || perfil?.email || "",
              telefone_consultor: telefoneConsultor,
              valor_liberado: quitacaoMostrarTroco ? (parseCleanFloat(quitacaoValorLiberado) || null) : null,
              banco_atual: quitacaoBancoAtual,
              saldo_quitacao: parseCleanFloat(quitacaoSaldoQuitacao) || null,
              parcela_atual: parseCleanFloat(quitacaoParcelaAtual) || null,
              prazo_restante: quitacaoPrazoRestante,
              nova_parcela: parseCleanFloat(quitacaoNovaParcela) || null,
              reducao_mensal: Math.max(0, (parseCleanFloat(quitacaoParcelaAtual) || 0) - (parseCleanFloat(quitacaoNovaParcela) || 0)),
              margem_voltou_folha: parseCleanFloat(quitacaoMargemVolta) || null,
              banco_autorizacao: bancoAutorizacao,
              mostrar_troco: quitacaoMostrarTroco,
              taxa_atual: parseCleanFloat(quitacaoTaxaAtual) || null,
              nova_taxa: parseCleanFloat(quitacaoNovaTaxa) || null,
              validade_proposta: isNaN(parseInt(validadeDias)) ? 0 : parseInt(validadeDias),
              documentos_necessarios: docsNecessarios,
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
              percentual_reducao: parseCleanFloat(porcentagemReducao) || 13.78,
              total_parcela_atual: currentTotal,
              total_parcela_nova: newTotal,
              valor_liberado: parseCleanFloat(valorLiberado) || null,
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

    const getOrgaoLabelAndValue = () => {
      const activeReg = (activeRegIndex !== undefined && registrations && registrations[activeRegIndex]) 
        ? registrations[activeRegIndex] 
        : (registrations && registrations[0] ? registrations[0] : null);

      if (!activeReg) {
        return { label: "ÓRGÃO", value: "NÃO INFORMADO" };
      }

      const hasGovRR = activeReg.governo_rr_instituidores !== undefined || activeReg.uf === 'RR';
      const label = hasGovRR 
        ? "INSTITUIDOR (ORIGEM)" 
        : (activeReg.currentInstituidor !== undefined ? "ÓRGÃO (VÍNCULO)" : "ÓRGÃO");
      
      const value = resolveOrgao(activeReg);
      return { label, value: String(value).toUpperCase() };
    };

    const orgaoInfo = getOrgaoLabelAndValue();

    const expirationDate = (() => {
      const parsedDays = parseInt(validadeDias);
      const days = isNaN(parsedDays) ? 0 : parsedDays;
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

    const validityLabel = (() => {
      const parsedDays = parseInt(validadeDias);
      if (isNaN(parsedDays) || parsedDays === 0) {
        return "somente hoje";
      }
      return `${validadeDias} ${parsedDays === 1 ? "dia útil" : "dias úteis"} a partir de hoje`;
    })();

    const totalParcelaAtual = contratos.reduce((acc, c) => acc + (parseFloat(c.parcelaAtual) || 0), 0);
    const totalNovaParcela = contratos.reduce((acc, c) => acc + (parseFloat(c.novaParcela) || 0), 0);
    const economiaMensal = Math.max(0, totalParcelaAtual - totalNovaParcela);
    const sumOfMargins = (parseFloat(margemPrincipalVal) || clientPrincipalMargem || 0) + 
                         (parseFloat(margemCartaoConsignadoVal) || clientCartaoConsignadoMargem || 0) + 
                         (parseFloat(margemCartaoBeneficioVal) || clientCartaoBeneficioMargem || 0);
    const valorTotalPosEstrategia = totalNovaParcela + sumOfMargins;

    const uniqueDestBanks = Array.from(new Set(contratos.map(c => c.bancoDestino).filter(Boolean)));
    const showBancosLine = showBancoDestino && uniqueDestBanks.length > 0;
    const destBanksText = uniqueDestBanks.length > 0 
      ? `Através do ${uniqueDestBanks.join(" e ")}`
      : "";

    const hasMargemPrincipal = margemPrincipalVal !== "" ? parseFloat(margemPrincipalVal) > 0 : clientPrincipalMargem > 0;
    const hasMargemCC = margemCartaoConsignadoVal !== "" ? parseFloat(margemCartaoConsignadoVal) > 0 : clientCartaoConsignadoMargem > 0;
    const hasMargemCB = margemCartaoBeneficioVal !== "" ? parseFloat(margemCartaoBeneficioVal) > 0 : clientCartaoBeneficioMargem > 0;

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
                    <p className="text-xs text-white font-mono tracking-wider font-semibold uppercase">{orgaoCliente || orgaoInfo.value}</p>
                  </div>
                </div>

                {/* Right side: Corretor info */}
                <div className="flex flex-col text-right items-end gap-1.5 border-l border-slate-700/50 pl-5">
                  <p className="text-xs font-black uppercase text-[#D6AB00] tracking-wider">{nomeConsultor || "NOME DO USUÁRIO"}</p>
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
                      <p className="text-[9px] text-slate-400 font-normal">Margem*: <span className="text-slate-400 font-normal">{formatBRL(margemPrincipalVal !== "" ? margemPrincipalVal : clientPrincipalMargem)}</span></p>
                    )}
                    {hasMargemCC && (
                      <p className="text-[9px] text-slate-400 font-normal">Margem CC*: <span className="text-slate-400 font-normal">{formatBRL(margemCartaoConsignadoVal !== "" ? margemCartaoConsignadoVal : clientCartaoConsignadoMargem)}</span></p>
                    )}
                    {hasMargemCB && (
                      <p className="text-[9px] text-slate-400 font-normal">Margem CB*: <span className="text-slate-400 font-normal">{formatBRL(margemCartaoBeneficioVal !== "" ? margemCartaoBeneficioVal : clientCartaoBeneficioMargem)}</span></p>
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
                <p className="text-xs text-white font-mono tracking-wider font-semibold uppercase">{orgaoCliente || orgaoInfo.value}</p>
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
              <p className="text-xs font-black uppercase text-[#D6AB00] tracking-wider break-words w-full">{nomeConsultor || "NOME DO USUÁRIO"}</p>
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
                    Para garantir essa condição é necessário apenas:
                  </h5>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 bg-slate-50/50 border border-slate-150 rounded-2xl p-4">
                    {[
                      { label: "Foto (RG ou CNH)", checked: docFoto },
                      { label: "Endereço completo por escrito", checked: docEndereco },
                      { label: "E-mail", checked: docEmail },
                      { label: "Comprovante de residência (quando exigido pelo banco)", checked: docResidencia },
                      { label: "Último contracheque", checked: docContracheque },
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

              </div>

              {/* Proposal Validity section */}
              <div className="pt-1.5">
                <div className="bg-[#162546] text-[#F4C600] text-[9.5px] font-black uppercase tracking-widest py-2 px-4 rounded-xl flex justify-between items-center shadow-sm">
                  <span>VALIDADE DA PROPOSTA:</span>
                  <span>Até {expirationDate} ({validityLabel})</span>
                </div>
              </div>
            </div>
          ) : model === "quitacao" ? (
            <div className="space-y-5 pt-1 flex-1 flex flex-col justify-between">
              <div className="space-y-5">
                {/* Title and Subtitle Header */}
                <div className="text-center space-y-1">
                  <h4 className="text-[#162546] font-black text-[16px] uppercase tracking-wide">
                    QUITAÇÃO DE CONTRATO COM REDUÇÃO NA FOLHA
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500 italic">
                    "Troca de uma parcela pesada por uma estratégia mais leve."
                  </p>
                </div>

                {/* Grid with Current Contract vs New Strategy */}
                <div className="grid grid-cols-2 gap-5">
                  {/* Left Column: Contrato Atual */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col justify-between min-h-[185px] shadow-sm">
                    <div className="text-left space-y-2">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" /> CONTRATO ATUAL
                      </p>
                      <div className="space-y-1.5 pt-1">
                        {!ocultarQuitacaoBancoAtual && (
                          <p className="text-[13px] text-slate-500 font-bold leading-tight">
                            Banco: <span className="font-black text-slate-700 uppercase block sm:inline">{quitacaoBancoAtual || "NÃO INFORMADO"}</span>
                          </p>
                        )}
                        {!ocultarQuitacaoTaxaAtual && quitacaoTaxaAtual && (
                          <p className="text-[13px] text-slate-500 font-bold leading-tight">
                            Taxa Atual: <span className="font-black text-[#c44a4a] block sm:inline">{quitacaoTaxaAtual}% a.m.</span>
                          </p>
                        )}
                        <p className="text-[13px] text-slate-500 font-bold leading-tight">
                          Parcela Atual: <span className="font-black text-[#c44a4a] block sm:inline">{formatBRL(quitacaoParcelaAtual)}</span>
                        </p>
                        <p className="text-[13px] text-slate-500 font-bold leading-tight">
                          Saldo para Quitação: <span className="font-black text-[#c44a4a] block sm:inline">{formatBRL(quitacaoSaldoQuitacao)}</span>
                        </p>
                        {!ocultarQuitacaoPrazoRestante && (
                          <p className="text-[13px] text-slate-500 font-bold leading-tight">
                            Prazo Restante: <span className="font-black text-[#c44a4a] block sm:inline">{quitacaoPrazoRestante || "96x"}</span>
                          </p>
                        )}
                        {!ocultarQuitacaoTotalAPagar && (
                          <p className="text-[13px] text-slate-500 font-bold leading-tight">
                            Total a Pagar: <span className="font-black text-[#c44a4a] block sm:inline">
                              {(() => {
                                const parsedPrazo = parseInt(quitacaoPrazoRestante) || 96;
                                const pAtual = parseFloat(quitacaoParcelaAtual) || 0;
                                const defaultCalculated = pAtual * parsedPrazo;
                                const finalTotal = quitacaoTotalAPagar ? parseFloat(quitacaoTotalAPagar) : defaultCalculated;
                                return formatBRL(finalTotal);
                              })()}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="bg-red-50 border border-red-100 rounded-full py-1.5 px-3 text-center text-[10px] font-black text-[#c44a4a] tracking-wider uppercase">
                        MAIS JUROS
                      </div>
                    </div>
                  </div>

                  {/* Right Column: CONTRATO OTIMIZADO */}
                  <div className="bg-[#162546] border border-[#162546] rounded-2xl p-4 flex flex-col justify-between min-h-[185px] shadow-sm text-white">
                    <div className="text-left space-y-2">
                      <p className="text-[9px] font-black text-[#F4C600] uppercase tracking-widest border-b border-slate-700/50 pb-1 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#F4C600]" /> CONTRATO OTIMIZADO
                      </p>
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[13px] text-slate-300 font-bold leading-tight">
                          Parcela Ajustada: <span className="font-black text-[#F4C600] block sm:inline">{formatBRL(quitacaoNovaParcela)}</span>
                        </p>
                        <p className="text-[13px] text-slate-300 font-bold leading-tight">
                          Margem que Volta para a Folha: <span className="font-black text-[#F4C600] block sm:inline">{formatBRL(quitacaoMargemVolta)}</span>
                        </p>
                        {!ocultarQuitacaoTroco && quitacaoValorLiberado && (
                          <p className="text-[13px] text-slate-300 font-bold leading-tight mt-1">
                            Troco: <span className="font-black text-[#F4C600] block sm:inline">{formatBRL(quitacaoValorLiberado)}</span>
                          </p>
                        )}
                        {!ocultarQuitacaoNovaTaxa && quitacaoNovaTaxa && (
                          <p className="text-[13px] text-slate-300 font-bold leading-tight">
                            Nova Taxa: <span className="font-black text-[#F4C600] block sm:inline">{quitacaoNovaTaxa}% a.m.</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="bg-[#F4C600] rounded-full py-1.5 px-3 text-center text-[10px] font-black text-[#162546] tracking-wider uppercase">
                        MAIS ECONOMIA
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Indicators Row for Quitação */}
                {(() => {
                  const quitacaoPAtual = parseFloat(quitacaoParcelaAtual) || 0;
                  const quitacaoPNova = parseFloat(quitacaoNovaParcela) || 0;
                  const quitacaoReducaoMensal = Math.max(0, quitacaoPAtual - quitacaoPNova);
                  const quitacaoPrazo = parseInt(quitacaoPrazoRestante) || 96;
                  
                  const calculatedTotalAPagar = quitacaoPAtual * quitacaoPrazo;
                  const actualTotalAPagar = quitacaoTotalAPagar ? parseFloat(quitacaoTotalAPagar) : calculatedTotalAPagar;
                  
                  const calculatedEconomia = actualTotalAPagar - (quitacaoPNova * quitacaoPrazo);
                  const displayEconomiaTotal = quitacaoEconomiaTotal ? parseFloat(quitacaoEconomiaTotal) : calculatedEconomia;
                  const quitacaoTrocoVal = parseFloat(quitacaoValorLiberado) || 0;
                  const showEconomia = !ocultarQuitacaoEconomiaTotal;
                  const showTroco = !ocultarQuitacaoTroco;
                  const colsCount = 1 + (showEconomia ? 1 : 0) + (showTroco ? 1 : 0);

                  return (
                    <div className={`grid ${
                      colsCount === 1 ? "grid-cols-1" : colsCount === 2 ? "grid-cols-2" : "grid-cols-3"
                    } gap-4 text-center py-4 px-6 bg-[#e6f7f0] border border-[#c3ede0] rounded-3xl shadow-sm`}>
                      <div className={`space-y-1 flex flex-col justify-center items-center ${colsCount > 1 ? "border-r border-[#c3ede0]" : ""}`}>
                        <p className="text-[10px] font-black text-[#006d51] uppercase tracking-widest leading-none">REDUÇÃO MENSAL</p>
                        <p className="text-[24px] font-black text-[#00a374] leading-none">{formatBRL(quitacaoReducaoMensal)}</p>
                      </div>
                      {showEconomia && (
                        <div className={`space-y-1 flex flex-col justify-center items-center ${showTroco ? "border-r border-[#c3ede0]" : ""}`}>
                          <p className="text-[10px] font-black text-[#006d51] uppercase tracking-widest leading-none">ECONOMIA TOTAL</p>
                          <p className="text-[26px] font-black text-[#00a374] leading-none">
                            {formatBRL(displayEconomiaTotal)}
                          </p>
                        </div>
                      )}
                      {showTroco && (
                        <div className="space-y-1 flex flex-col justify-center items-center">
                          <p className="text-[10px] font-black text-[#006d51] uppercase tracking-widest leading-none">TROCO</p>
                          <p className="text-[24px] font-black text-[#00a374] leading-none">
                            {formatBRL(quitacaoTrocoVal)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Call to Decision Trigger Block */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 text-center flex flex-col items-center justify-center space-y-1 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-800 justify-center">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Atenção - Oportunidade por Tempo Limitado</span>
                  </div>
                  <p className="text-[9.5px] font-bold text-amber-900 leading-normal">
                    A cada mês com essa parcela ativa, você paga mais juros e a estratégia perde economia.
                  </p>
                </div>

                {/* Document Checklist Section */}
                <div className="space-y-2 pt-1 text-left">
                  <h5 className="text-[10px] font-black text-[#162546] uppercase tracking-widest pl-1">
                    Para garantir essa condição é necessário apenas:
                  </h5>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 bg-slate-50/50 border border-slate-150 rounded-2xl p-4">
                    {[
                      { label: "Foto (RG ou CNH)", checked: docFoto },
                      { label: "Endereço completo por escrito", checked: docEndereco },
                      { label: "E-mail", checked: docEmail },
                      { label: "Comprovante de residência (quando exigido pelo banco)", checked: docResidencia },
                      { label: "Último contracheque", checked: docContracheque },
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
                <div className="pt-1">
                  <div className="bg-[#162546] text-[#F4C600] text-[9.5px] font-black uppercase tracking-widest py-2 px-4 rounded-xl flex justify-between items-center shadow-sm">
                    <span>VALIDADE DA PROPOSTA:</span>
                    <span>Até {expirationDate} ({validityLabel})</span>
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
                      <p className="text-[8.5px] text-[#162546] font-normal">Margem*: <span className="text-[#162546] font-normal">{formatBRL(margemPrincipalVal !== "" ? margemPrincipalVal : clientPrincipalMargem)}</span></p>
                    )}
                    {hasMargemCC && (
                      <p className="text-[8.5px] text-[#162546] font-normal">Margem CC*: <span className="text-[#162546] font-normal">{formatBRL(margemCartaoConsignadoVal !== "" ? margemCartaoConsignadoVal : clientCartaoConsignadoMargem)}</span></p>
                    )}
                    {hasMargemCB && (
                      <p className="text-[8.5px] text-[#162546] font-normal">Margem CB*: <span className="text-[#162546] font-normal">{formatBRL(margemCartaoBeneficioVal !== "" ? margemCartaoBeneficioVal : clientCartaoBeneficioMargem)}</span></p>
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
            {model === "novo-formato" || model === "quitacao" ? (
              <p className="text-[8.5px] text-[#162546] font-bold italic leading-relaxed text-left normal-case">
                Observação: Em caso de qualquer dúvida ou se precisar de suporte durante o processo, estou à disposição para ajudar no que for necessário e intermediar junto ao banco para que a proposta seja concluída da melhor forma possível.
              </p>
            ) : (
              <>
                <p>* Cálculos de redução de parcela pela portabilidade sofrem alterações diárias, a depender do saldo devedor.</p>
                <p>* Estratégia de redução leva em consideração a taxa de juros confirmada pelo cliente.</p>
                <p>* A taxa de juros final do contrato e a redução real do valor da parcela poderão sobre oscilações a critério das instituições bancárias.</p>
                <p>* As taxas de juros ofertadas pelas instituições bancárias levam em consideração as demais lines de crédito disponívels ao cliente.</p>
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
          className="relative w-full max-w-7xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#162546]/10 text-[#162546] rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Simulação de Proposta Comercial</h3>
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
              <div className="space-y-6 max-w-5xl mx-auto py-6">
                <div className="text-center space-y-2">
                  <h4 className="text-[18px] font-bold text-slate-800">Qual estratégia deseja simular?</h4>
                  <p className="text-[13px] text-slate-500">Selecione o modelo matemático e de negócios ideal para a proposta do cliente.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                  {/* Option Redução de Parcela */}
                  <div 
                    onClick={() => {
                      setModel("reducao");
                      setStep("form");
                    }}
                    className="p-6 bg-blue-50/50 hover:bg-blue-50 border-2 border-blue-100 hover:border-blue-300 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group min-h-[250px]"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                        <TrendingDown className="w-5 h-5" />
                      </div>
                      <h5 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">Redução de Parcela</h5>
                      <p className="text-[12px] text-slate-600 leading-relaxed">
                        Gere economia e entregue valor para o cliente.
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
                    className="p-6 bg-[#F4C600]/5 hover:bg-[#F4C600]/10 border-2 border-[#F4C600]/20 hover:border-[#F4C600]/40 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group min-h-[250px]"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 bg-[#F4C600] text-[#162546] rounded-xl flex items-center justify-center font-bold">
                        ★
                      </div>
                      <h5 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">Novo Formato</h5>
                      <p className="text-[12px] text-slate-600 leading-relaxed">
                        Exiba o comparativo inteligente entre os formatos padrão e a nova opção que você tem para o cliente.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#162546] text-[11px] font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform self-end">
                      Iniciar Simulação <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Option Quitação de Contrato */}
                  <div 
                    onClick={() => {
                      setModel("quitacao");
                      setStep("form");
                    }}
                    className="p-6 bg-emerald-50/50 hover:bg-emerald-50 border-2 border-emerald-100 hover:border-emerald-300 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group min-h-[250px]"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold">
                        <Zap className="w-5 h-5" />
                      </div>
                      <h5 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">Quitação de Contrato</h5>
                      <p className="text-[12px] text-slate-600 leading-relaxed">
                        Reduza o peso mensal da folha trocando uma parcela pesada por uma condição mais leve.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform self-end">
                      Iniciar Simulação <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Option Personalize sua Proposta */}
                  <div 
                    onClick={() => {
                      setStep("personalize");
                    }}
                    className="p-6 bg-purple-50/50 hover:bg-purple-50 border-2 border-purple-100 hover:border-purple-300 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group min-h-[250px]"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center font-bold">
                        <Calculator className="w-5 h-5" />
                      </div>
                      <h5 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">PERSONALIZE SUA PROPOSTA</h5>
                      <p className="text-[12px] text-slate-600 leading-relaxed">
                        Acesse a calculadora financeira e simule condições sob medida com as margens do cliente.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-purple-600 text-[11px] font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform self-end">
                      Iniciar Simulação <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP: Personalize sua Proposta (Calculadora) */}
            {step === "personalize" && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setStep("model-select")}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-xs font-bold transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar para seleção de estratégia
                </button>

                {(() => {
                  const activeRegForCalc = (activeRegIndex !== undefined && registrations && registrations[activeRegIndex]) 
                    ? registrations[activeRegIndex] 
                    : (registrations && registrations[0] ? registrations[0] : null);
                  const currentOrgaoCalc = orgaoCliente || (activeRegForCalc ? resolveOrgao(activeRegForCalc) : "");
                  return (
                    <CalculadoraPage 
                      clientMargins={getClientMargins()} 
                      isEmbedded={true} 
                      client={client}
                      orgao={currentOrgaoCalc}
                      onProposalSaved={onProposalSaved}
                    />
                  );
                })()}
              </div>
            )}

            {/* STEP 2: Simulation Form */}
            {step === "form" && (
              <div className="space-y-8">
                
                <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
                    
                    {/* Section: Cliente */}
                    <div className="space-y-3 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Dados do Cliente</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
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
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Órgão</label>
                          <input 
                            type="text" 
                            value={orgaoCliente}
                            onChange={(e) => setOrgaoCliente(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
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

                    {/* Section: Responsável */}
                    <div className="space-y-4 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                       <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Usuário Responsável</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nome do Usuário</label>
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
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Foto do Usuário (PNG sem fundo)</label>
                        
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

                    {model === "quitacao" && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Section: Contratos Atuais */}
                        <div className="space-y-4 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                            <Building className="w-4 h-4 text-emerald-600" />
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Contratos Atuais</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {/* Banco Atual */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banco Atual</label>
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                  <input 
                                    type="checkbox" 
                                    checked={ocultarQuitacaoBancoAtual}
                                    onChange={(e) => setOcultarQuitacaoBancoAtual(e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-3 h-3 cursor-pointer"
                                  />
                                  <span className="text-[8px] font-extrabold text-red-500 uppercase tracking-wider">Ocultar</span>
                                </label>
                              </div>
                              <input 
                                type="text"
                                value={quitacaoBancoAtual}
                                onChange={(e) => setQuitacaoBancoAtual(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                                placeholder="Ex: Banco do Brasil"
                              />
                            </div>

                            {/* Saldo para Quitação */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Saldo para Quitação</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-[11px] font-bold text-slate-400">R$</span>
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={quitacaoSaldoQuitacao}
                                  onChange={(e) => setQuitacaoSaldoQuitacao(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm text-right"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            {/* Parcela Atual */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Parcela Atual</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-[11px] font-bold text-slate-400">R$</span>
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={quitacaoParcelaAtual}
                                  onChange={(e) => {
                                    setQuitacaoParcelaAtual(e.target.value);
                                    setQuitacaoMargemVolta(e.target.value);
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm text-right"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            {/* Prazo Restante */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prazo Restante</label>
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                  <input 
                                    type="checkbox" 
                                    checked={ocultarQuitacaoPrazoRestante}
                                    onChange={(e) => setOcultarQuitacaoPrazoRestante(e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-3 h-3 cursor-pointer"
                                  />
                                  <span className="text-[8px] font-extrabold text-red-500 uppercase tracking-wider">Ocultar</span>
                                </label>
                              </div>
                              <input 
                                type="text"
                                value={quitacaoPrazoRestante}
                                onChange={(e) => setQuitacaoPrazoRestante(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                                placeholder="Ex: 48x"
                              />
                            </div>

                            {/* Taxa Atual */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Taxa Atual</label>
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                  <input 
                                    type="checkbox" 
                                    checked={ocultarQuitacaoTaxaAtual}
                                    onChange={(e) => setOcultarQuitacaoTaxaAtual(e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-3 h-3 cursor-pointer"
                                  />
                                  <span className="text-[8px] font-extrabold text-red-500 uppercase tracking-wider">Ocultar</span>
                                </label>
                              </div>
                              <input 
                                type="text"
                                value={quitacaoTaxaAtual}
                                onChange={(e) => setQuitacaoTaxaAtual(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                                placeholder="Ex: 1,80"
                              />
                            </div>

                            {/* Total a Pagar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total a Pagar</label>
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                  <input 
                                    type="checkbox" 
                                    checked={ocultarQuitacaoTotalAPagar}
                                    onChange={(e) => setOcultarQuitacaoTotalAPagar(e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-3 h-3 cursor-pointer"
                                  />
                                  <span className="text-[8px] font-extrabold text-red-500 uppercase tracking-wider">Ocultar</span>
                                </label>
                              </div>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-[11px] font-bold text-slate-400">R$</span>
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={quitacaoTotalAPagar}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setQuitacaoTotalAPagar(val);
                                    if (val === "") {
                                      setIsManualQuitacaoTotalAPagar(false);
                                    } else {
                                      setIsManualQuitacaoTotalAPagar(true);
                                    }
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm text-right"
                                  placeholder={(() => {
                                    const parsedPrazo = parseInt(quitacaoPrazoRestante) || 96;
                                    const pAtual = parseFloat(quitacaoParcelaAtual) || 0;
                                    const calc = pAtual * parsedPrazo;
                                    return calc > 0 ? calc.toFixed(2) : "0,00";
                                  })()}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section: Após Estratégia */}
                        <div className="space-y-4 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Após Estratégia</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {/* Nova Parcela */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nova Parcela</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-[11px] font-bold text-slate-400">R$</span>
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={quitacaoNovaParcela}
                                  onChange={(e) => setQuitacaoNovaParcela(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm text-right"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            {/* Redução Mensal */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Redução Mensal (Cálculo)</label>
                              <div className="w-full bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2 h-[38px] flex items-center justify-between shadow-sm">
                                <span className="text-[11px] font-bold text-emerald-700">R$</span>
                                <span className="text-[12px] font-extrabold text-emerald-800">
                                  {(() => {
                                    const pAtual = parseFloat(quitacaoParcelaAtual) || 0;
                                    const pNova = parseFloat(quitacaoNovaParcela) || 0;
                                    const red = Math.max(0, pAtual - pNova);
                                    return red.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  })()}
                                </span>
                              </div>
                            </div>

                            {/* Margem que Volta para a Folha */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Margem que Volta para a Folha</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-[11px] font-bold text-slate-400">R$</span>
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={quitacaoMargemVolta}
                                  onChange={(e) => setQuitacaoMargemVolta(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm text-right"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            {/* Valor Liberado / Troco */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor Liberado/Troco</label>
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                  <input 
                                    type="checkbox" 
                                    checked={ocultarQuitacaoTroco}
                                    onChange={(e) => setOcultarQuitacaoTroco(e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-3 h-3 cursor-pointer"
                                  />
                                  <span className="text-[8px] font-extrabold text-red-500 uppercase tracking-wider">Ocultar</span>
                                </label>
                              </div>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-[11px] font-bold text-slate-400">R$</span>
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={quitacaoValorLiberado}
                                  onChange={(e) => setQuitacaoValorLiberado(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm text-right"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>

                            {/* Nova Taxa */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nova Taxa</label>
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                  <input 
                                    type="checkbox" 
                                    checked={ocultarQuitacaoNovaTaxa}
                                    onChange={(e) => setOcultarQuitacaoNovaTaxa(e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-3 h-3 cursor-pointer"
                                  />
                                  <span className="text-[8px] font-extrabold text-red-500 uppercase tracking-wider">Ocultar</span>
                                </label>
                              </div>
                              <input 
                                type="text"
                                value={quitacaoNovaTaxa}
                                onChange={(e) => setQuitacaoNovaTaxa(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                                placeholder="Ex: 1,35"
                              />
                            </div>

                            {/* Economia Total */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Economia Total</label>
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                  <input 
                                    type="checkbox" 
                                    checked={ocultarQuitacaoEconomiaTotal}
                                    onChange={(e) => setOcultarQuitacaoEconomiaTotal(e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-3 h-3 cursor-pointer"
                                  />
                                  <span className="text-[8px] font-extrabold text-red-500 uppercase tracking-wider">Ocultar</span>
                                </label>
                              </div>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-[11px] font-bold text-slate-400">R$</span>
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={quitacaoEconomiaTotal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setQuitacaoEconomiaTotal(val);
                                    if (val === "") {
                                      setIsManualQuitacaoEconomiaTotal(false);
                                    } else {
                                      setIsManualQuitacaoEconomiaTotal(true);
                                    }
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm text-right"
                                  placeholder={(() => {
                                    const parsedPrazo = parseInt(quitacaoPrazoRestante) || 96;
                                    const pAtual = parseFloat(quitacaoParcelaAtual) || 0;
                                    const calculatedTotal = pAtual * parsedPrazo;
                                    const totalAPagarVal = quitacaoTotalAPagar ? parseFloat(quitacaoTotalAPagar) : calculatedTotal;
                                    const pNova = parseFloat(quitacaoNovaParcela) || 0;
                                    const calc = totalAPagarVal - (pNova * parsedPrazo);
                                    return calc !== 0 ? calc.toFixed(2) : "0,00";
                                  })()}
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

                            {/* Indicators */}
                            <div className="grid grid-cols-1 gap-4">
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
                    disabled={
                      model === "reducao" 
                        ? (!nomeCliente || totalParcelaAtual <= 0 || totalNovaParcela <= 0) 
                        : model === "quitacao"
                          ? (!nomeCliente || !quitacaoSaldoQuitacao || !quitacaoParcelaAtual || !quitacaoNovaParcela)
                          : (!nomeCliente || !valorLiberado)
                    }
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
