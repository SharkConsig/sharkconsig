export type ContractCategory = "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIO";

export interface ContractTypeInfo {
  category: ContractCategory;
  label: string;
  bank?: string;
}

export const CONTRATOS_TIPO_MAPPING: Record<string, ContractTypeInfo> = {
  "35020": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "AGIBANK" },
  "34921": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "BANCO MASTER" },
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
  "35066": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "ATLANTA" },
  "35064": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "ATLANTA" },
  "35002": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "FUTURO" },
  "35009": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "FUTURO" },
  "35016": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "MEUCASH" },
  "35087": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "DIGIMAIS" },
  "35089": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "DIGIMAIS" },
  "35053": { category: "CARTAO_CONSIGNADO", label: "CARTÃO CONSIGNADO", bank: "PEAK" },
  "35055": { category: "CARTAO_BENEFICIO", label: "CARTÃO BENEFÍCIO", bank: "PEAK" },
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

  // Pega apenas os 5 primeiros dígitos para identificar se é cartão
  const prefixo = codigo.toString().trim().substring(0, 5);
  const info = CONTRATOS_TIPO_MAPPING[prefixo];
  
  if (info) return info;
  
  return {
    category: "EMPRESTIMO",
    label: "CONTRATO DE EMPRÉSTIMO",
  };
}
