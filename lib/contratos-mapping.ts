export type ContractCategory = "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIO";

export interface ContractTypeInfo {
  category: ContractCategory;
  label: string;
  bank?: string;
}

export const CONTRATOS_TIPO_MAPPING: Record<string, ContractTypeInfo> = {
  "35020": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "AGIBANK" },
  "34921": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "MASTER" },
  "35014": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "MASTER" },
  "34998": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "CAPITAL" },
  "35007": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "CAPITAL" },
  "35018": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "SANTANDER" },
  "34814": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "SANTANDER" },
  "35010": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "DAYCOVAL" },
  "34807": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "DAYCOVAL" },
  "34806": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "PAN" },
  "35008": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "PAN" },
  "35026": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "PINE" },
  "35076": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "BARU" },
  "35077": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "BARU" },
  "35066": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "NEOCREDITO" },
  "35064": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "NEOCREDITO" },
  "35002": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "FUTURO" },
  "35009": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "FUTURO" },
  "35016": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "MEUCASH" },
  "35087": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "DIGIMAIS" },
  "35089": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "DIGIMAIS" },
  "35053": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "XNBANK" },
  "35055": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "XNBANK" },
  "34805": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "BMG" },
  "35013": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "BMG" },
};

export function getContractTypeInfo(codigo: string): ContractTypeInfo {
  if (!codigo) {
    return {
      category: "EMPRESTIMO",
      label: "CONTRATO DE EMPRÉSTIMO",
    };
  }

  const t = codigo.toString().trim().toUpperCase();

  // 1. Tenta identificar por código de prefixo (5 dígitos)
  const prefixo = t.substring(0, 5);
  const info = CONTRATOS_TIPO_MAPPING[prefixo];
  if (info) return info;

  // 2. Tenta identificar por palavras-chave (Fallback para labels em texto)
  if (t.includes("EMPRÉSTIMO") || t.includes("EMPRESTIMO") || t === "70" || t === "35") {
    return { label: "Empréstimo", category: "EMPRESTIMO" };
  }
  if (t.includes("CARTÃO CONSIGNADO") || t.includes("CARTAO CONSIGNADO") || t.includes("RMC") || t === "5" || t === "RMC") {
    return { label: "RMC", category: "CARTAO_CONSIGNADO" };
  }
  if (t.includes("CARTÃO BENEFÍCIO") || t.includes("CARTAO BENEFICIO") || t.includes("RCC") || t === "RCC") {
    return { label: "RCC", category: "CARTAO_BENEFICIO" };
  }

  // 3. Padrão: Empréstimo
  return {
    category: "EMPRESTIMO",
    label: "CONTRATO DE EMPRÉSTIMO",
  };
}
