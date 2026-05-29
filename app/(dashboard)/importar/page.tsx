"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { 
  Upload, 
  FileText, 
  Users, 
  Search, 
  CheckCircle2, 
  Info,
  ChevronLeft,
  ChevronRight,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react"
import { cn, normalizeText, withRetry } from "@/lib/utils"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import Papa from "papaparse"

interface Batch {
  id: string;
  descricao: string;
  created_at: string;
  total_linhas: string;
  status: "COMPLETED" | "FAILED" | "PROCESSING" | "CANCELLED";
  tipo: string;
  progresso?: number;
  erro?: string;
}

import { useAuth } from "@/context/auth-context"

const normalizeHeaderKey = (key: string): string => {
  return normalizeText(key)
    .replace(/[^A-Za-z0-9]/g, "")
    .toLowerCase();
};

const getRequiredHeadersKeysForType = (type: string): string[][] => {
  if (type === "SIAPE") {
    return [["cpf"], ["matricula"], ["orgao"], ["situacaofuncional"]];
  }
  if (type === "CONTRATOS") {
    return [["cpf"], ["numerodocontrato", "numcontrato", "contrato"], ["banco"], ["parcela"], ["orgao"]];
  }
  if (type === "GOVERNO_SP") {
    return [["cpf"], ["identificacao"], ["lotacao"], ["orgao"], ["tipovinculo", "vinculo"]];
  }
  if (type === "PREFEITURA_SP") {
    return [["cpf"], ["identificacao"], ["lotacao"], ["orgao"], ["tipovinculo", "vinculo"]];
  }
  if (type === "GOVERNO_PI") {
    return [["cpf"], ["matricula"], ["orgao"], ["margemdisponivelemprestimo", "margemdisponivel", "margememprestimo", "margememprestimoconsignado"]];
  }
  if (type === "GOVERNO_MA") {
    return [["cpf"], ["matricula"], ["orgao"], ["margememprestimoconsignado", "margemdisponivelemprestimo", "margememprestimo", "margemdisponivel"]];
  }
  if (type === "GOVERNO_RR") {
    return [["cpf"], ["matricula"], ["origem"], ["regimecontratacao", "regime"]];
  }
  return [];
};

const checkRequiredHeaders = (actualHeaders: string[], type: string): boolean => {
  const normActual = actualHeaders.map(h => normalizeHeaderKey(h));
  const expectedAlternatives = getRequiredHeadersKeysForType(type);
  
  for (const alternatives of expectedAlternatives) {
    const hasAny = alternatives.some(alt => normActual.includes(alt));
    if (!hasAny) {
      console.warn(`[VALIDAÇÃO] Falta de cabeçalho compatível com:`, alternatives);
      return false;
    }
  }
  return true;
};



export default function ImportBatchPage() {
  const router = useRouter()
  const { canAccessAdminAreas, isLoading: authLoading } = useAuth()
  const [batchList, setBatchList] = useState<Batch[]>([]);
  const [totalBaseSiape, setTotalBaseSiape] = useState(0);
  const [totalBaseGovSP, setTotalBaseGovSP] = useState(0);
  const [totalBasePMSP, setTotalBasePMSP] = useState(0);
  const [totalBaseGovPI, setTotalBaseGovPI] = useState(0);
  const [totalBaseGovMA, setTotalBaseGovMA] = useState(0);
  const [totalBaseGovRR, setTotalBaseGovRR] = useState(0);
  const [isRefreshingTotal, setIsRefreshingTotal] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [description, setDescription] = useState("");
  const [type, setType] = useState("SIAPE");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cleaningLog, setCleaningLog] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !canAccessAdminAreas) {
      router.replace('/')
    }
  }, [authLoading, canAccessAdminAreas, router])

  const fetchBatches = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn("Sem sessão ativa para buscar lotes.");
        return;
      }

      const { data, error } = await withRetry(async () => {
        return await supabase
          .from('lotes')
          .select('*')
          .order('created_at', { ascending: false });
      });
      
      if (error) {
        console.warn("Erro ao buscar lotes:", error);
        return;
      }
      setBatchList((data as Batch[]) || []);
    } catch (err: unknown) {
      console.warn("Erro ao buscar lotes (retry failed):", err);
    }
  }, []);

  const fetchTotalBase = useCallback(async () => {
    if (!isSupabaseConfigured) {
      console.warn("Supabase is not configured. Total base count will remain 0.");
      return;
    }

    setIsRefreshingTotal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn("Estado da Sessão (fetchTotalBase): Não logado");
        setIsRefreshingTotal(false);
        return;
      }

      console.log("Estado da Sessão (fetchTotalBase):", `Logado como ${session.user.email}`);
      console.log("Token JWT (Tamanho):", session.access_token.length);

      const [siapeRes, govSPRes, pmspRes, govPIRes, govMARes, govRRRes] = await Promise.all([
        withRetry(async () => {
          return await supabase
            .from('clientes')
            .select('*', { count: 'exact', head: true });
        }),
        withRetry(async () => {
          return await supabase
            .from('governo_sp_clientes')
            .select('*', { count: 'exact', head: true });
        }),
        withRetry(async () => {
          return await supabase
            .from('prefeitura_sp_clientes')
            .select('*', { count: 'exact', head: true });
        }),
        withRetry(async () => {
          return await supabase
            .from('governo_pi_clientes')
            .select('*', { count: 'exact', head: true });
        }),
        withRetry(async () => {
          return await supabase
            .from('governo_ma_clientes')
            .select('*', { count: 'exact', head: true });
        }),
        withRetry(async () => {
          return await supabase
            .from('governo_rr_clientes')
            .select('*', { count: 'exact', head: true });
        })
      ]);
      
      if (siapeRes.error) {
        console.warn("Aviso Supabase (Total SIAPE):", siapeRes.error.message);
      }
      if (govSPRes.error) {
        console.warn("Aviso Supabase (Total GOV SP):", govSPRes.error.message);
      }
      if (pmspRes.error) {
        console.warn("Aviso Supabase (Total PMSP):", pmspRes.error.message);
      }
      if (govPIRes.error) {
        console.warn("Aviso Supabase (Total GOV PI):", govPIRes.error.message);
      }
      if (govMARes.error) {
        console.warn("Aviso Supabase (Total GOV MA):", govMARes.error.message);
      }
      if (govRRRes.error) {
        console.warn("Aviso Supabase (Total GOV RR):", govRRRes.error.message);
      }

      setTotalBaseSiape(siapeRes.count || 0);
      setTotalBaseGovSP(govSPRes.count || 0);
      setTotalBasePMSP(pmspRes.count || 0);
      setTotalBaseGovPI(govPIRes.count || 0);
      setTotalBaseGovMA(govMARes.count || 0);
      setTotalBaseGovRR(govRRRes.count || 0);
    } catch (err: unknown) {
      const error = err as Error;
      console.warn("Aviso inesperado ao buscar total da base:", error?.message || error);
    } finally {
      setIsRefreshingTotal(false);
    }
  }, []);

  const handleRefreshTotal = () => {
    fetchTotalBase();
  };

  useEffect(() => {
    if (!authLoading && canAccessAdminAreas) {
      fetchTotalBase();
      fetchBatches();
    }
  }, [fetchTotalBase, fetchBatches, authLoading, canAccessAdminAreas]);

  // Pagination Logic
  const totalPages = Math.ceil(batchList.length / itemsPerPage);
  const paginatedBatchList = batchList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const normalizeCPF = (cpf: string) => {
    if (!cpf) return "";
    const clean = cpf.replace(/\D/g, "");
    return clean.padStart(11, "0");
  };

  const normalizeMoney = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    if (typeof value === 'number') return value;
    
    // Remove R$, spaces, and handle brazilian format
    let clean = String(value).replace(/R\$/g, "").replace(/\s/g, "");
    
    // If it has a comma and a dot, it's likely 1.000,00
    if (clean.includes(",") && clean.includes(".")) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else if (clean.includes(",")) {
      // If it only has a comma, it's 1000,00
      clean = clean.replace(",", ".");
    }
    
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  };

  const normalizePhone = (phone: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, "");
    if (clean.length >= 10 && clean.length <= 11) return clean;
    return clean || null;
  };

  const normalizeDate = (date: string) => {
    if (!date) return null;
    
    // Handle DD/MM/YYYY or DD/MM/YY or DD-MM-YYYY
    const parts = date.split(/[/-]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      
      if (year.length === 2) {
        const numYear = parseInt(year);
        year = (numYear > 30 ? "19" : "20") + year;
      }
      
      // If it's already YYYY-MM-DD
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      
      return `${year}-${month}-${day}`;
    }
    
    return date;
  };

  /**
   * Helper to fetch data in batches to avoid URL length limits with .in()
   */
  async function fetchInBatches<T>(
    table: string,
    column: string,
    values: (string | number)[],
    batchSize = 100
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      const { data, error } = await withRetry(async () => {
        return await supabase
          .from(table)
          .select('*')
          .in(column, batch);
      });
      if (error) throw error;
      if (data) results.push(...data);
    }
    return results;
  }

  /**
   * Helper to delete data in batches to avoid URL length limits with .in()
   */
  async function deleteInBatches(
    table: string,
    column: string,
    values: (string | number)[],
    batchSize = 100
  ): Promise<void> {
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      const { error } = await withRetry(async () => {
        return await supabase
          .from(table)
          .delete()
          .in(column, batch);
      });
      if (error) throw error;
    }
  }

  const processSiapeChunk = async (results: Record<string, string | undefined>[]) => {
    const cpfs = results.map(r => normalizeCPF(r.cpf || "")).filter(Boolean);
    if (cpfs.length === 0) return;

    // Fetch existing data to apply merge rules in batches to avoid URL length limits
    const existingClientsRaw = await fetchInBatches<Record<string, unknown>>('clientes', 'cpf', cpfs);
    const existingRegsRaw = await fetchInBatches<Record<string, unknown>>('matriculas', 'cliente_cpf', cpfs);

    const existingClients = new Map(existingClientsRaw.map(c => [c.cpf as string, c]));
    const existingRegs = new Map(existingRegsRaw.map(r => [`${r.cliente_cpf}_${r.numero_matricula}`, r]));

    const clientsToUpsertMap = new Map<string, Record<string, unknown>>();
    const registrationsToUpsertMap = new Map<string, Record<string, unknown>>();
    
    for (const row of results) {
      const cpf = normalizeCPF(row.cpf || "");
      if (!cpf) continue;

      const existingClient = existingClients.get(cpf);
      const regNum = row.matricula || '0';
      const existingReg = existingRegs.get(`${cpf}_${regNum}`);

      // Rule 1.5 & 1.7: Update personal data (Don't overwrite with null unless exception)
      const currentClientInMap = clientsToUpsertMap.get(cpf);
      const clientUpdate: Record<string, unknown> = { 
        cpf,
        nome: (currentClientInMap?.nome as string) ?? (existingClient?.nome as string) ?? 'NAO INFORMADO',
        data_nascimento: (currentClientInMap?.data_nascimento as string) ?? (existingClient?.data_nascimento as string) ?? null,
        telefone_1: (currentClientInMap?.telefone_1 as string) ?? (existingClient?.telefone_1 as string) ?? null,
        telefone_2: (currentClientInMap?.telefone_2 as string) ?? (existingClient?.telefone_2 as string) ?? null,
        telefone_3: (currentClientInMap?.telefone_3 as string) ?? (existingClient?.telefone_3 as string) ?? null,
        updated_at: new Date().toISOString()
      };
      
      const newName = normalizeText(row.nome || "");
      if (newName) clientUpdate.nome = newName;

      const birthDate = normalizeDate(row.data_de_nascimento || "");
      if (birthDate) clientUpdate.data_nascimento = birthDate;

      const p1 = normalizePhone(row.telefone_1 || "");
      if (p1) clientUpdate.telefone_1 = p1;

      const p2 = normalizePhone(row.telefone_2 || "");
      if (p2) clientUpdate.telefone_2 = p2;

      const p3 = normalizePhone(row.telefone_3 || "");
      if (p3) clientUpdate.telefone_3 = p3;
      
      clientsToUpsertMap.set(cpf, clientUpdate);

      // Rule: Update registration data ONLY if 'matricula' is present in the row
      if (row.matricula) {
        const currentRegInMap = registrationsToUpsertMap.get(`${cpf}_${regNum}`);
        const regUpdate: Record<string, unknown> = {
          cliente_cpf: cpf,
          numero_matricula: regNum,
          orgao: (currentRegInMap?.orgao as string) ?? (existingReg?.orgao as string) ?? null,
          situacao_funcional: (currentRegInMap?.situacao_funcional as string) ?? (existingReg?.situacao_funcional as string) ?? null,
          salario: (currentRegInMap?.salario as number) ?? (existingReg?.salario as number) ?? null,
          regime_juridico: (currentRegInMap?.regime_juridico as string) ?? (existingReg?.regime_juridico as string) ?? null,
          uf: (currentRegInMap?.uf as string) ?? (existingReg?.uf as string) ?? null,
          updated_at: new Date().toISOString()
        };

        const orgao = normalizeText(row.orgao || "");
        if (orgao) regUpdate.orgao = orgao;

        const sitFunc = normalizeText(row.situacao_funcional || "");
        if (sitFunc) regUpdate.situacao_funcional = sitFunc;

        const salary = normalizeMoney(row.salario);
        if (salary !== null) regUpdate.salario = salary;

        const regime = normalizeText(row.regime_juridico || "");
        if (regime) regUpdate.regime_juridico = regime;

        const uf = normalizeText(row.uf || "");
        if (uf) regUpdate.uf = uf;

        registrationsToUpsertMap.set(`${cpf}_${regNum}`, regUpdate);
      }
    }

    const clientsToUpsert = Array.from(clientsToUpsertMap.values());
    const registrationsToUpsert = Array.from(registrationsToUpsertMap.values());

    if (clientsToUpsert.length > 0) {
      const { error: clientError } = await withRetry(async () => {
        return await supabase.from('clientes').upsert(clientsToUpsert, { onConflict: 'cpf' });
      });
      if (clientError) throw new Error(`Erro ao salvar clientes: ${clientError.message}`);
    }

    if (registrationsToUpsert.length > 0) {
      const { data: regData, error: regError } = await withRetry(async () => {
        return await supabase
          .from('matriculas')
          .upsert(registrationsToUpsert, { onConflict: 'cliente_cpf, numero_matricula' })
          .select('id, cliente_cpf, numero_matricula, situacao_funcional');
      });

      if (regError) throw new Error(`Erro ao salvar matrículas: ${regError.message}`);

      // Rule 1.2: Handle Instituidores and Margins
      const instituidoresToUpsertMap = new Map<string, Record<string, unknown>>();
      
      for (const reg of regData || []) {
        const matchingRows = results.filter(r => 
          normalizeCPF(r.cpf || "") === reg.cliente_cpf && 
          (r.matricula || '0') === reg.numero_matricula
        );

        for (const row of matchingRows) {
          // Rule: Margins only update if matricula and (if pension) instituidor are present
          if (!row.matricula) continue;
          
          const isPension = reg.situacao_funcional === 'BENEFICIARIO PENSAO';
          
          // Rule: If pension, use instituidor. If not, use orgao (New Rule).
          const instName = isPension ? normalizeText(row.instituidor || "") : normalizeText(row.orgao || "");
          
          if (!instName) continue;
          
          const instUpdate: Record<string, unknown> = {
            matricula_id: reg.id,
            nome: instName,
            updated_at: new Date().toISOString()
          };

          // Rule 1.7: Margins and Balances CAN and SHOULD be overwritten by null/empty in SIAPE
          instUpdate.saldo_70 = normalizeMoney(row["saldo_70%"] ?? row.saldo_70);
          instUpdate.margem_35 = normalizeMoney(row["margem_35%"] ?? row.margem_35);
          instUpdate.bruta_5 = normalizeMoney(row["bruta_5%"] ?? row.bruta_5);
          instUpdate.utilizada_5 = normalizeMoney(row["utilizada_5%"] ?? row.utilizada_5);
          instUpdate.liquida_5 = normalizeMoney(row["liquida_5%"] ?? row.liquida_5);
          instUpdate.beneficio_bruta_5 = normalizeMoney(row["beneficio_bruta_5%"] ?? row.beneficio_bruta_5);
          instUpdate.beneficio_utilizada_5 = normalizeMoney(row["beneficio_utilizada_5%"] ?? row.beneficio_utilizada_5);
          instUpdate.beneficio_liquida_5 = normalizeMoney(row["beneficio_liquida_5%"] ?? row.beneficio_liquida_5);

          instituidoresToUpsertMap.set(`${reg.id}_${instName}`, instUpdate);
        }
      }

      const instituidoresToUpsert = Array.from(instituidoresToUpsertMap.values());
      if (instituidoresToUpsert.length > 0) {
        const { error: instError } = await withRetry(async () => {
          return await supabase.from('instituidores').upsert(instituidoresToUpsert, { onConflict: 'matricula_id, nome' });
        });
        if (instError) throw new Error(`Erro ao salvar instituidores: ${instError.message}`);
      }
    }
  };

  const processContratosChunk = async (results: Record<string, string | undefined>[]) => {
    const cpfs = results.map(r => normalizeCPF(r.cpf || "")).filter(Boolean);
    if (cpfs.length === 0) {
      console.warn("Nenhum CPF válido encontrado no chunk de Contratos.");
      return;
    }

    console.log(`[CONTRATOS] Processando chunk: ${results.length} linhas, ${cpfs.length} CPFs.`);

    // Fetch existing data to apply merge rules in batches to avoid URL length limits
      const existingClientsRaw = await fetchInBatches<Record<string, unknown>>('clientes', 'cpf', cpfs);
    const existingRegsRaw = await fetchInBatches<Record<string, unknown>>('matriculas', 'cliente_cpf', cpfs);

    const existingClients = new Map(existingClientsRaw.map(c => [c.cpf as string, c]));
    const existingRegs = new Map(existingRegsRaw.map(r => [`${r.cliente_cpf}_${r.numero_matricula}`, r]));

    const clientsToUpsertMap = new Map<string, Record<string, unknown>>();
    const registrationsToUpsertMap = new Map<string, Record<string, unknown>>();
    
    for (const row of results) {
      const cpf = normalizeCPF(row.cpf);
      if (!cpf) continue;

      const regNum = row.matricula || '0';
      const existingClient = existingClients.get(cpf);
      const existingReg = existingRegs.get(`${cpf}_${regNum}`);
      
      // Rule: Contratos import modifies personal data (nome, data_nascimento, telefones)
      // but ONLY if the current value is empty or 'NAO INFORMADO'
      const newName = normalizeText(row.nome);
      const newBirthDate = normalizeDate(row.data_de_nascimento);
      const newP1 = normalizePhone(row.telefone_1);
      const newP2 = normalizePhone(row.telefone_2);
      const newP3 = normalizePhone(row.telefone_3);
      
      const currentClientInMap = clientsToUpsertMap.get(cpf);
      
      if (!existingClient) {
        // Create new client if doesn't exist
        if (!currentClientInMap) {
          clientsToUpsertMap.set(cpf, {
            cpf,
            nome: newName || 'NAO INFORMADO',
            data_nascimento: newBirthDate || null,
            telefone_1: newP1 || null,
            telefone_2: newP2 || null,
            telefone_3: newP3 || null,
            updated_at: new Date().toISOString()
          });
        }
      } else {
        // Update existing client fields ONLY if they are empty or 'NAO INFORMADO'
        const clientUpdate: Record<string, unknown> = { 
          cpf,
          updated_at: new Date().toISOString() 
        };
        let hasUpdate = false;

        const currentName = currentClientInMap?.nome ?? existingClient.nome;
        if (newName && (!currentName || currentName === 'NAO INFORMADO')) {
          clientUpdate.nome = newName;
          hasUpdate = true;
        }

        const currentBirth = currentClientInMap?.data_nascimento ?? existingClient.data_nascimento;
        if (newBirthDate && !currentBirth) {
          clientUpdate.data_nascimento = newBirthDate;
          hasUpdate = true;
        }

        const currentP1 = currentClientInMap?.telefone_1 ?? existingClient.telefone_1;
        if (newP1 && !currentP1) {
          clientUpdate.telefone_1 = newP1;
          hasUpdate = true;
        }

        const currentP2 = currentClientInMap?.telefone_2 ?? existingClient.telefone_2;
        if (newP2 && !currentP2) {
          clientUpdate.telefone_2 = newP2;
          hasUpdate = true;
        }

        const currentP3 = currentClientInMap?.telefone_3 ?? existingClient.telefone_3;
        if (newP3 && !currentP3) {
          clientUpdate.telefone_3 = newP3;
          hasUpdate = true;
        }

        if (hasUpdate) {
          clientsToUpsertMap.set(cpf, {
            ...(currentClientInMap || (existingClient as Record<string, unknown>)),
            ...clientUpdate
          });
        }
      }

      // Rule: Only create registration if it exists in the row and doesn't exist in DB.
      // Rule 1.9: UF from CONTRATOS updates matricula UF if present
      const newUf = normalizeText(row.uf || "");

      if (row.matricula) {
        const regKey = `${cpf}_${regNum}`;
        const currentRegInMap = registrationsToUpsertMap.get(regKey);
        
        if (!existingReg && !currentRegInMap) {
          registrationsToUpsertMap.set(regKey, {
            cliente_cpf: cpf,
            numero_matricula: regNum,
            uf: newUf || null,
            updated_at: new Date().toISOString()
          });
        } else if (newUf) {
          // If it exists, update UF only if newUf is present (Rule 1.9)
          const baseReg = currentRegInMap || (existingReg as Record<string, unknown>);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, ...regWithoutId } = baseReg;
          registrationsToUpsertMap.set(regKey, {
            ...regWithoutId,
            uf: newUf,
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    const clientsToUpsert = Array.from(clientsToUpsertMap.values());
    const registrationsToUpsert = Array.from(registrationsToUpsertMap.values());

    if (clientsToUpsert.length > 0) {
      console.log(`[CONTRATOS] Upserting ${clientsToUpsert.length} clients...`);
      const { error: clientError } = await withRetry(async () => {
        return await supabase.from('clientes').upsert(clientsToUpsert, { onConflict: 'cpf' });
      });
      if (clientError) console.error("[CONTRATOS] Erro clientes:", clientError);
    }

    let regData: { id: string, cliente_cpf: string, numero_matricula: string }[] = [];
    if (registrationsToUpsert.length > 0) {
      console.log(`[CONTRATOS] Upserting ${registrationsToUpsert.length} registrations...`);
      const { data, error: regError } = await withRetry(async () => {
        return await supabase
          .from('matriculas')
          .upsert(registrationsToUpsert, { onConflict: 'cliente_cpf, numero_matricula' })
          .select('id, cliente_cpf, numero_matricula');
      });

      if (regError) {
        console.error("[CONTRATOS] Erro registrations:", regError);
        throw new Error(`Erro ao salvar matrículas (Contratos): ${regError.message}`);
      }
      regData = (data as { id: string, cliente_cpf: string, numero_matricula: string }[]) || [];
    }

    // Create a complete map of registration IDs (existing + newly upserted)
    const regMap = new Map<string, string>();
    // First, populate with existing ones
    existingRegs?.forEach(r => {
      regMap.set(`${r.cliente_cpf}_${r.numero_matricula}`, r.id as string);
    });
    // Then, overwrite/add with newly upserted ones (to get IDs of new ones or updated ones)
    regData.forEach(r => {
      regMap.set(`${r.cliente_cpf}_${r.numero_matricula}`, r.id);
    });

    if (regMap.size === 0) {
      console.warn("[CONTRATOS] Nenhuma matrícula encontrada ou criada.");
      return;
    }

    // Rule 1.7: Contracts fields CAN be overwritten by null/empty
    // Fetch existing instituidores to preserve margins
    const regIds = Array.from(regMap.values());
    const existingInstituidoresRaw = await fetchInBatches<Record<string, unknown>>('instituidores', 'matricula_id', regIds);
    // Use normalizeText for the key to ensure consistency with NULL/empty strings
    const existingInstituidores = new Map(existingInstituidoresRaw.map(i => [`${i.matricula_id}_${normalizeText(i.nome as string)}`, i]));

    const instituidoresToUpsertMap = new Map<string, Record<string, unknown>>();
    for (const row of results) {
      const cpf = normalizeCPF(row.cpf || "");
      if (!cpf) continue;
      const regNum = row.matricula || '0';
      const regId = regMap.get(`${cpf}_${regNum}`);
      const existingReg = existingRegs.get(`${cpf}_${regNum}`);
      
      if (regId && row.matricula) {
        const sitFunc = existingReg?.situacao_funcional as string | undefined;
        const isPension = sitFunc === 'BENEFICIARIO PENSAO';
        
        // Rule: Determine instituidor name based on situacao_funcional (Non-pension = orgao)
        const instName = isPension ? normalizeText(row.instituidor || "") : normalizeText(row.orgao || "");
        
        if (!instName) continue;

        const existingInst = existingInstituidores.get(`${regId}_${instName}`);
        
        // Rule: Only create instituidor if it doesn't exist. Do NOT update if it does.
        // If it exists, we'll use its ID to link the contract, but we won't upsert it to protect margins.
        if (!existingInst && !instituidoresToUpsertMap.has(`${regId}_${instName}`)) {
          instituidoresToUpsertMap.set(`${regId}_${instName}`, {
            matricula_id: regId,
            nome: instName,
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    let instData: { id: string, matricula_id: string, nome: string }[] = [];
    const instituidoresToUpsert = Array.from(instituidoresToUpsertMap.values());
    if (instituidoresToUpsert.length > 0) {
      console.log(`[CONTRATOS] Upserting ${instituidoresToUpsert.length} NEW instituidores...`);
      const { data, error: instError } = await withRetry(async () => {
        return await supabase
          .from('instituidores')
          .upsert(instituidoresToUpsert, { onConflict: 'matricula_id, nome' })
          .select('id, matricula_id, nome');
      });
      
      if (instError) {
        console.error("[CONTRATOS] Erro instituidores:", instError);
        throw new Error(`Erro ao salvar instituidores (Contratos): ${instError.message}`);
      }
      instData = (data as { id: string, matricula_id: string, nome: string }[]) || [];
      console.log(`[CONTRATOS] ${instData.length} novos instituidores criados.`);
    }

    // Create a map for instituidores to link them to contracts
    const instMap = new Map<string, string>();
    // First, populate with ALL existing ones
    existingInstituidores.forEach(i => {
      instMap.set(`${i.matricula_id}_${normalizeText(i.nome as string)}`, i.id as string);
    });
    // Then, add newly created ones
    instData.forEach(i => {
      instMap.set(`${i.matricula_id}_${normalizeText(i.nome)}`, i.id);
    });

    const contractsToUpsertMap = new Map<string, Record<string, unknown>>();
    for (const row of results) {
      const cpf = normalizeCPF(row.cpf || "");
      if (!cpf) continue;
      const regNum = row.matricula || '0';
      const regId = regMap.get(`${cpf}_${regNum}`);
      const existingReg = existingRegs.get(`${cpf}_${regNum}`);
      
      if (regId && row.matricula) {
        const sitFunc = existingReg?.situacao_funcional as string | undefined;
        const isPension = sitFunc === 'BENEFICIARIO PENSAO';
        
        const instName = isPension ? normalizeText(row.instituidor || "") : normalizeText(row.orgao || "");
        
        if (!instName) continue;

        const instId = instMap.get(`${regId}_${instName}`) || null;
        const contractNum = row.numero_do_contrato || '0';
        
        if (instId) {
          contractsToUpsertMap.set(`${instId}_${contractNum}`, {
            instituidor_id: instId,
            numero_contrato: contractNum,
            banco: normalizeText(row.banco || "") || null,
            orgao: normalizeText(row.orgao || "") || null,
            tipo: normalizeText(row.tipo || "") || 'EMPRESTIMO',
            uf: normalizeText(row.uf || "") || null,
            parcela: normalizeMoney(row.parcela),
            prazo: row.prazo ? parseInt(row.prazo) : null,
            updated_at: new Date().toISOString()
          });
        } else {
          console.warn(`[CONTRATOS] Instituidor não encontrado para regId: ${regId}, instName: "${instName}"`);
        }
      }
    }

    const contractsToUpsert = Array.from(contractsToUpsertMap.values());
    if (contractsToUpsert.length > 0) {
      console.log(`[CONTRATOS] Salvando ${contractsToUpsert.length} contratos em 'itens_credito'...`);
      const { error: contractError } = await withRetry(async () => {
        return await supabase
          .from('itens_credito')
          .upsert(contractsToUpsert, { onConflict: 'instituidor_id, numero_contrato' });
      });
      
      if (contractError) {
        console.error("[CONTRATOS] Erro ao salvar itens_credito:", contractError);
        throw new Error(`Erro ao salvar contratos (itens_credito): ${contractError.message}`);
      }
      console.log("[CONTRATOS] Sucesso ao salvar itens_credito!");
    } else {
      console.warn("[CONTRATOS] Nenhum contrato preparado para salvar. Verifique se os instituidores foram criados corretamente.");
    }
  };

  const processGovernoSpChunk = async (results: Record<string, string | undefined>[], loteId: string) => {
    // 1. Normalização e Agrupamento inicial
    const normalizedRows = results.map(row => ({
      cpf: normalizeCPF(row.cpf || ""),
      nome: normalizeText(row.nome || ""),
      data_nascimento: normalizeDate(row.data_nascimento || ""),
      identificacao_val: normalizeText(row.identificação || row.identificacao || ""),
      data_nomeacao: normalizeDate(row.data_nomeacao || ""),
      lotacao: normalizeText(row.lotacao || ""),
      orgao: normalizeText(row.orgao || ""),
      tipo_vinculo: normalizeText(row.tipo_vinculo || ""),
      mb_consignacoes: normalizeMoney(row.mb_consignacoes),
      md_consignacoes: normalizeMoney(row.md_consignacoes),
      mb_cartao_credito: normalizeMoney(row.mb_cartao_credito),
      md_cartao_credito: normalizeMoney(row.md_cartao_credito),
      mb_cartao_beneficio: normalizeMoney(row.mb_cartao_beneficio),
      md_cartao_beneficio: normalizeMoney(row.md_cartao_beneficio),
      telefone_1: normalizePhone(row.telefone_1 || ""),
      telefone_2: normalizePhone(row.telefone_2 || ""),
      telefone_3: normalizePhone(row.telefone_3 || "")
    })).filter(r => r.cpf && r.cpf.length > 0);

    if (normalizedRows.length === 0) return;

    // --- PASSO 1: Garantir Entidade Cliente (CPF Único) com Regra de Preservação ---
    const cpfs = Array.from(new Set(normalizedRows.map(r => r.cpf)));
    const existingClientsRaw = await fetchInBatches<Record<string, unknown>>('governo_sp_clientes', 'cpf', cpfs);
    const existingClientsMap = new Map(existingClientsRaw.map(c => [c.cpf as string, c]));

    // Helper para verificar se devemos preservar o valor do banco (Anti-Null e Anti-Zero)
    // Retorna true se o valor da planilha for vazio (""), nulo ou '0'
    const shouldPreserve = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return true;
      const v = String(val).trim();
      return v === "" || v === "0" || v === "0.0" || v === "0,0" || v === "0,00" || v === "0.00";
    };

    // Usamos um Map para evitar CPFs duplicados no próprio lote
    const clientMap = new Map<string, Record<string, unknown>>();
    normalizedRows.forEach(row => {
      const dbClient = existingClientsMap.get(row.cpf) as Record<string, unknown> | undefined;
      const existingInMap = clientMap.get(row.cpf);

      // Regra do Nome: O nome do cliente só é sobrescrito se o valor no banco estiver como null ou "MOCK/NÃO INFORMADO"
      const existingName = (existingInMap?.nome as string | undefined) || (dbClient?.nome as string | undefined);
      let nome: string;
      const dbNameUpper = String(existingName ?? "").toUpperCase().trim();
      const isDbNameMockOrEmpty = !existingName || 
                             dbNameUpper === "" || 
                             dbNameUpper === "MOCK" || 
                             dbNameUpper.includes("MOCK") || 
                             dbNameUpper.includes("NAO INFORMADO") || 
                             dbNameUpper.includes("NÃO INFORMADO");

      if (isDbNameMockOrEmpty) {
        nome = !shouldPreserve(row.nome) ? row.nome : (existingName || 'NAO INFORMADO');
      } else {
        nome = existingName;
      }

      // Anti-Null/Zero para os demais campos de clientes (se vier nulo/vazio, não sobrescreve dado do banco)
      const data_nascimento = !shouldPreserve(row.data_nascimento) ? row.data_nascimento : ((existingInMap?.data_nascimento || dbClient?.data_nascimento || null) as string | null);
      const telefone_1 = !shouldPreserve(row.telefone_1) ? row.telefone_1 : ((existingInMap?.telefone_1 || dbClient?.telefone_1 || null) as string | null);
      const telefone_2 = !shouldPreserve(row.telefone_2) ? row.telefone_2 : ((existingInMap?.telefone_2 || dbClient?.telefone_2 || null) as string | null);
      const telefone_3 = !shouldPreserve(row.telefone_3) ? row.telefone_3 : ((existingInMap?.telefone_3 || dbClient?.telefone_3 || null) as string | null);

      clientMap.set(row.cpf, {
        cpf: row.cpf, 
        nome,
        data_nascimento,
        telefone_1,
        telefone_2,
        telefone_3,
        updated_at: new Date().toISOString()
      });
    });

    const clientRows = Array.from(clientMap.values());
    const { data: clientsData, error: clientErr } = await withRetry(async () => {
      return await supabase.from('governo_sp_clientes')
        .upsert(clientRows, { onConflict: 'cpf' })
        .select('id, cpf');
    });

    if (clientErr || !clientsData) throw new Error(`Erro ao garantir clientes Governo SP: ${clientErr?.message}`);

    const cpfToClientId = new Map<string, string>(clientsData.map((c: {id: string, cpf: string}) => [c.cpf, c.id]));

    // --- PASSO 2: Processar Identificações (N:1 com Cliente) com Regra de Preservação ---
    const clientIds = Array.from(cpfToClientId.values());
    const existingIdentsRaw = await fetchInBatches<Record<string, unknown>>('governo_sp_identificacoes', 'cliente_id', clientIds);
    const existingIdentsMap = new Map(existingIdentsRaw.map(i => [`${i.cliente_id}_${i.identificacao}`, i]));

    const identMap = new Map<string, Record<string, unknown>>();
    normalizedRows.forEach(row => {
      const clientId = cpfToClientId.get(row.cpf);
      if (!clientId || !row.identificacao_val) return;

      const key = `${clientId}_${row.identificacao_val}`;
      const dbIdent = existingIdentsMap.get(key) as Record<string, unknown> | undefined;
      const currentInMap = identMap.get(key);

      // Regra Anti-Null/Zero para Identificação e Vínculos
      const data_nomeacao = !shouldPreserve(row.data_nomeacao) ? row.data_nomeacao : (currentInMap?.data_nomeacao || dbIdent?.data_nomeacao || null);
      const tipo_vinculo = !shouldPreserve(row.tipo_vinculo) ? row.tipo_vinculo : (currentInMap?.tipo_vinculo || dbIdent?.tipo_vinculo || null);

      identMap.set(key, {
        cliente_id: clientId,
        identificacao: row.identificacao_val,
        data_nomeacao,
        tipo_vinculo,
        updated_at: new Date().toISOString()
      });
    });

    const identRows = Array.from(identMap.values());
    const { data: identsData, error: identErr } = await withRetry(async () => {
      return await supabase.from('governo_sp_identificacoes')
        .upsert(identRows, { onConflict: 'cliente_id, identificacao' })
        .select('id, cliente_id, identificacao');
    });

    if (identErr || !identsData) throw new Error(`Erro ao salvar identificações Governo SP: ${identErr?.message}`);

    const keyToIdentId = new Map<string, string>(identsData.map((id: {id: string, cliente_id: string, identificacao: string}) => [`${id.cliente_id}_${id.identificacao}`, id.id]));

    // --- PASSO 3: Inserir Lotações (N:1 com Identificação) com UPSERT (Mesclagem Inteligente de Dados como SIAPE) ---
    const identIds = Array.from(keyToIdentId.values());
    const existingLotacoesRaw = await fetchInBatches<Record<string, unknown>>('governo_sp_lotacoes', 'identificacao_id', identIds);
    const existingLotacoesMap = new Map(existingLotacoesRaw.map(l => [l.identificacao_id as string, l]));

    const lotacoesToUpsertMap = new Map<string, Record<string, unknown>>();

    normalizedRows.forEach(row => {
      const clientId = cpfToClientId.get(row.cpf);
      const identId = keyToIdentId.get(`${clientId}_${row.identificacao_val}`);
      if (!identId) return;

      const existingLot = existingLotacoesMap.get(identId);
      const currentInMap = lotacoesToUpsertMap.get(identId);

      // Regra: Para campos não margens, use a preservação do banco/mapa
      const lotacao = !shouldPreserve(row.lotacao) ? row.lotacao : (currentInMap?.lotacao || existingLot?.lotacao || null);
      const orgao = !shouldPreserve(row.orgao) ? row.orgao : (currentInMap?.orgao || existingLot?.orgao || null);

      // Margens devem ser atualizadas mesmo se vierem vazias (ou zeros) para refletir o estado real
      const mb_consignacoes = row.mb_consignacoes !== undefined ? row.mb_consignacoes : (currentInMap?.mb_consignacoes ?? existingLot?.mb_consignacoes ?? null);
      const md_consignacoes = row.md_consignacoes !== undefined ? row.md_consignacoes : (currentInMap?.md_consignacoes ?? existingLot?.md_consignacoes ?? null);
      const mb_cartao_credito = row.mb_cartao_credito !== undefined ? row.mb_cartao_credito : (currentInMap?.mb_cartao_credito ?? existingLot?.mb_cartao_credito ?? null);
      const md_cartao_credito = row.md_cartao_credito !== undefined ? row.md_cartao_credito : (currentInMap?.md_cartao_credito ?? existingLot?.md_cartao_credito ?? null);
      const mb_cartao_beneficio = row.mb_cartao_beneficio !== undefined ? row.mb_cartao_beneficio : (currentInMap?.mb_cartao_beneficio ?? existingLot?.mb_cartao_beneficio ?? null);
      const md_cartao_beneficio = row.md_cartao_beneficio !== undefined ? row.md_cartao_beneficio : (currentInMap?.md_cartao_beneficio ?? existingLot?.md_cartao_beneficio ?? null);

      lotacoesToUpsertMap.set(identId, {
        identificacao_id: identId,
        lotacao,
        orgao,
        mb_consignacoes,
        md_consignacoes,
        mb_cartao_credito,
        md_cartao_credito,
        mb_cartao_beneficio,
        md_cartao_beneficio,
        lote_id: loteId,
        updated_at: new Date().toISOString()
      });
    });

    const lotacaoRows = Array.from(lotacoesToUpsertMap.values());

    if (lotacaoRows.length > 0) {
      // 1. Limpamos quaisquer registros antigos para evitar duplicações históricas acumuladas em lotes (anti-timeout/anti-URL-limit)
      try {
        await deleteInBatches('governo_sp_lotacoes', 'identificacao_id', identIds);
      } catch (delErr) {
        const msg = delErr instanceof Error ? delErr.message : String(delErr);
        throw new Error(`Erro ao limpar lotações Governo SP antigas: ${msg}`);
      }

      // 2. Inserimos as novas lotações mescladas (agora sem perigo de colisão ou duplicação)
      const { error: lotErr } = await withRetry(async () => {
        return await supabase.from('governo_sp_lotacoes').insert(lotacaoRows);
      });
      if (lotErr) throw new Error(`Erro ao salvar lotações Governo SP: ${lotErr.message}`);
    }
  };

  const processPrefeituraSpChunk = async (results: Record<string, string | undefined>[], loteId: string) => {
    // 1. Normalização e Agrupamento inicial
    const normalizedRows = results.map(row => ({
      cpf: normalizeCPF(row.cpf || ""),
      nome: normalizeText(row.nome || ""),
      data_nascimento: normalizeDate(row.data_nascimento || ""),
      identificacao_val: normalizeText(row.identificação || row.identificacao || ""),
      data_nomeacao: normalizeDate(row.data_nomeacao || ""),
      lotacao: normalizeText(row.lotacao || ""),
      orgao: normalizeText(row.orgao || ""),
      tipo_vinculo: normalizeText(row.tipo_vinculo || ""),
      mb_consignacoes: normalizeMoney(row.mb_consignacoes),
      md_consignacoes: normalizeMoney(row.md_consignacoes),
      mb_cartao_beneficio: normalizeMoney(row.mb_cartao_beneficio),
      md_cartao_beneficio: normalizeMoney(row.md_cartao_beneficio),
      telefone_1: normalizePhone(row.telefone_1 || ""),
      telefone_2: normalizePhone(row.telefone_2 || ""),
      telefone_3: normalizePhone(row.telefone_3 || "")
    })).filter(r => r.cpf && r.cpf.length > 0);

    if (normalizedRows.length === 0) return;

    // --- PASSO 1: Garantir Entidade Cliente (CPF Único) com Regra de Preservação ---
    const cpfs = Array.from(new Set(normalizedRows.map(r => r.cpf)));
    const existingClientsRaw = await fetchInBatches<Record<string, unknown>>('prefeitura_sp_clientes', 'cpf', cpfs);
    const existingClientsMap = new Map(existingClientsRaw.map(c => [c.cpf as string, c]));

    const shouldPreserve = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return true;
      const v = String(val).trim();
      return v === "" || v === "0" || v === "0.0" || v === "0,0" || v === "0,00" || v === "0.00";
    };

    const clientMap = new Map<string, Record<string, unknown>>();
    normalizedRows.forEach(row => {
      const dbClient = existingClientsMap.get(row.cpf) as Record<string, unknown> | undefined;
      const existingInMap = clientMap.get(row.cpf);

      // Regra do Nome: O nome do cliente só é sobrescrito se o valor no banco estiver como null ou "MOCK/NÃO INFORMADO"
      const existingName = (existingInMap?.nome as string | undefined) || (dbClient?.nome as string | undefined);
      let nome: string;
      const dbNameUpper = String(existingName ?? "").toUpperCase().trim();
      const isDbNameMockOrEmpty = !existingName || 
                             dbNameUpper === "" || 
                             dbNameUpper === "MOCK" || 
                             dbNameUpper.includes("MOCK") || 
                             dbNameUpper.includes("NAO INFORMADO") || 
                             dbNameUpper.includes("NÃO INFORMADO");

      if (isDbNameMockOrEmpty) {
        nome = !shouldPreserve(row.nome) ? row.nome : (existingName || 'NAO INFORMADO');
      } else {
        nome = existingName;
      }

      // Anti-Null/Zero para os demais campos de clientes (se vier nulo/vazio, não sobrescreve dado do banco)
      const data_nascimento = !shouldPreserve(row.data_nascimento) ? row.data_nascimento : ((existingInMap?.data_nascimento || dbClient?.data_nascimento || null) as string | null);
      const telefone_1 = !shouldPreserve(row.telefone_1) ? row.telefone_1 : ((existingInMap?.telefone_1 || dbClient?.telefone_1 || null) as string | null);
      const telefone_2 = !shouldPreserve(row.telefone_2) ? row.telefone_2 : ((existingInMap?.telefone_2 || dbClient?.telefone_2 || null) as string | null);
      const telefone_3 = !shouldPreserve(row.telefone_3) ? row.telefone_3 : ((existingInMap?.telefone_3 || dbClient?.telefone_3 || null) as string | null);

      clientMap.set(row.cpf, {
        cpf: row.cpf,
        nome,
        data_nascimento,
        telefone_1,
        telefone_2,
        telefone_3,
        updated_at: new Date().toISOString()
      });
    });

    const clientRows = Array.from(clientMap.values());
    const { data: clientsData, error: clientErr } = await withRetry(async () => {
      return await supabase.from('prefeitura_sp_clientes')
        .upsert(clientRows, { onConflict: 'cpf' })
        .select('id, cpf');
    });

    if (clientErr || !clientsData) throw new Error(`Erro ao garantir clientes Prefeitura SP: ${clientErr?.message}`);

    const cpfToClientId = new Map<string, string>(clientsData.map((c: {id: string, cpf: string}) => [c.cpf, c.id]));

    // --- PASSO 2: Processar Identificações (N:1 com Cliente) com Regra de Preservação ---
    const clientIds = Array.from(cpfToClientId.values());
    const existingIdentsRaw = await fetchInBatches<Record<string, unknown>>('prefeitura_sp_identificacoes', 'cliente_id', clientIds);
    const existingIdentsMap = new Map(existingIdentsRaw.map(i => [`${i.cliente_id}_${i.identificacao}`, i]));

    const identMap = new Map<string, Record<string, unknown>>();
    normalizedRows.forEach(row => {
      const clientId = cpfToClientId.get(row.cpf);
      if (!clientId || !row.identificacao_val) return;

      const key = `${clientId}_${row.identificacao_val}`;
      const dbIdent = existingIdentsMap.get(key) as Record<string, unknown> | undefined;
      const currentInMap = identMap.get(key);

      // Regra Anti-Null/Zero para Identificação
      const data_nomeacao = !shouldPreserve(row.data_nomeacao) ? row.data_nomeacao : (currentInMap?.data_nomeacao || dbIdent?.data_nomeacao || null);
      const tipo_vinculo = !shouldPreserve(row.tipo_vinculo) ? row.tipo_vinculo : (currentInMap?.tipo_vinculo || dbIdent?.tipo_vinculo || null);

      identMap.set(key, {
        cliente_id: clientId,
        identificacao: row.identificacao_val,
        data_nomeacao,
        tipo_vinculo,
        updated_at: new Date().toISOString()
      });
    });

    const identRows = Array.from(identMap.values());
    const { data: identsData, error: identErr } = await withRetry(async () => {
      return await supabase.from('prefeitura_sp_identificacoes')
        .upsert(identRows, { onConflict: 'cliente_id, identificacao' })
        .select('id, cliente_id, identificacao');
    });

    if (identErr || !identsData) throw new Error(`Erro ao salvar identificações Prefeitura SP: ${identErr?.message}`);

    const keyToIdentId = new Map<string, string>(identsData.map((id: {id: string, cliente_id: string, identificacao: string}) => [`${id.cliente_id}_${id.identificacao}`, id.id]));

    // --- PASSO 3: Inserir Lotações (N:1 com Identificação) com UPSERT (Mesclagem Inteligente de Dados como SIAPE) ---
    const identIds = Array.from(keyToIdentId.values());
    const existingLotacoesRaw = await fetchInBatches<Record<string, unknown>>('prefeitura_sp_lotacoes', 'identificacao_id', identIds);
    const existingLotacoesMap = new Map(existingLotacoesRaw.map(l => [l.identificacao_id as string, l]));

    const lotacoesToUpsertMap = new Map<string, Record<string, unknown>>();

    normalizedRows.forEach(row => {
      const clientId = cpfToClientId.get(row.cpf);
      const identId = keyToIdentId.get(`${clientId}_${row.identificacao_val}`);
      if (!identId) return;

      const existingLot = existingLotacoesMap.get(identId);
      const currentInMap = lotacoesToUpsertMap.get(identId);

      // Regra: Para campos não margens, use a preservação do banco/mapa
      const lotacao = !shouldPreserve(row.lotacao) ? row.lotacao : (currentInMap?.lotacao || existingLot?.lotacao || null);
      const orgao = !shouldPreserve(row.orgao) ? row.orgao : (currentInMap?.orgao || existingLot?.orgao || null);

      // Margens devem ser atualizadas mesmo se vierem vazias (ou zeros) para refletir o estado real
      const mb_consignacoes = row.mb_consignacoes !== undefined ? row.mb_consignacoes : (currentInMap?.mb_consignacoes ?? existingLot?.mb_consignacoes ?? null);
      const md_consignacoes = row.md_consignacoes !== undefined ? row.md_consignacoes : (currentInMap?.md_consignacoes ?? existingLot?.md_consignacoes ?? null);
      const mb_cartao_beneficio = row.mb_cartao_beneficio !== undefined ? row.mb_cartao_beneficio : (currentInMap?.mb_cartao_beneficio ?? existingLot?.mb_cartao_beneficio ?? null);
      const md_cartao_beneficio = row.md_cartao_beneficio !== undefined ? row.md_cartao_beneficio : (currentInMap?.md_cartao_beneficio ?? existingLot?.md_cartao_beneficio ?? null);

      lotacoesToUpsertMap.set(identId, {
        identificacao_id: identId,
        lotacao,
        orgao,
        mb_consignacoes,
        md_consignacoes,
        mb_cartao_beneficio,
        md_cartao_beneficio,
        lote_id: loteId,
        updated_at: new Date().toISOString()
      });
    });

    const lotacaoRows = Array.from(lotacoesToUpsertMap.values());

    if (lotacaoRows.length > 0) {
      // 1. Limpamos quaisquer registros antigos para evitar duplicações históricas acumuladas em lotes (anti-timeout/anti-URL-limit)
      try {
        await deleteInBatches('prefeitura_sp_lotacoes', 'identificacao_id', identIds);
      } catch (delErr) {
        const msg = delErr instanceof Error ? delErr.message : String(delErr);
        throw new Error(`Erro ao limpar lotações Prefeitura SP antigas: ${msg}`);
      }

      // 2. Inserimos as novas lotações mescladas (agora sem perigo de colisão ou duplicação)
      const { error: lotErr } = await withRetry(async () => {
        return await supabase.from('prefeitura_sp_lotacoes').insert(lotacaoRows);
      });
      if (lotErr) throw new Error(`Erro ao salvar lotações Prefeitura SP: ${lotErr.message}`);
    }
  };

  const processGovernoPiChunk = async (results: Record<string, string | undefined>[], loteId: string) => {
    // 1. Normalização das Chaves e Valores do CSV com suporte flexível
    const normalizedRows = results.map(rawRow => {
      const row: Record<string, string | undefined> = {};
      Object.keys(rawRow).forEach(key => {
        const normKey = normalizeHeaderKey(key);
        row[normKey] = rawRow[key];
      });

      return {
        cpf: normalizeCPF(row["cpf"] || ""),
        nome: normalizeText(row["nome"] || ""),
        data_nascimento: normalizeDate(row["datanascimento"] || row["datadenascimento"] || ""),
        matricula: normalizeText(row["matricula"] || ""),
        vinculo: normalizeText(row["vinculo"] || row["tipovinculo"] || row["situacaofuncional"] || ""),
        telefone_1: normalizePhone(row["telefone1"] || row["telefone"] || ""),
        telefone_2: normalizePhone(row["telefone2"] || ""),
        telefone_3: normalizePhone(row["telefone3"] || ""),
        orgao: normalizeText(row["orgao"] || ""),
        margem_disponivel_emprestimo: normalizeMoney(row["margemdisponivelemprestimo"] || row["margemdisponivel"] || row["margememprestimo"] || row["margememprestimoconsignado"]),
        margem_cartao_consignado: normalizeMoney(row["margemcartaoconsignado"] || row["margemcartao"] || row["margemcartaoconsignavel5"] || row["margemrcc"] || row["rcc"]),
        margem_cartao_beneficio: normalizeMoney(row["margemcartaobeneficio"] || row["margembeneficio"] || row["margemcartaobeneficio5"] || row["margem5"])
      };
    }).filter(r => r.cpf && r.cpf.length > 0);

    if (normalizedRows.length === 0) return;

    // --- PASSO 1: Garantir Entidade Cliente (CPF Único) ---
    const cpfs = Array.from(new Set(normalizedRows.map(r => r.cpf)));
    const existingClientsRaw = await fetchInBatches<Record<string, unknown>>('governo_pi_clientes', 'cpf', cpfs);
    const existingClientsMap = new Map(existingClientsRaw.map(c => [c.cpf as string, c]));

    const shouldPreserve = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return true;
      const v = String(val).trim();
      return v === "" || v === "0" || v === "0.0" || v === "0,0" || v === "0,00" || v === "0.00";
    };

    const clientMap = new Map<string, Record<string, unknown>>();
    normalizedRows.forEach(row => {
      const dbClient = existingClientsMap.get(row.cpf) as Record<string, unknown> | undefined;
      const existingInMap = clientMap.get(row.cpf);

      // Regra do Nome: O nome do cliente só é sobrescrito se o valor no banco estiver como null ou "MOCK/NÃO INFORMADO"
      const existingName = (existingInMap?.nome as string | undefined) || (dbClient?.nome as string | undefined);
      let nome: string;
      const dbNameUpper = String(existingName ?? "").toUpperCase().trim();
      const isDbNameMockOrEmpty = !existingName || 
                             dbNameUpper === "" || 
                             dbNameUpper === "MOCK" || 
                             dbNameUpper.includes("MOCK") || 
                             dbNameUpper.includes("NAO INFORMADO") || 
                             dbNameUpper.includes("NÃO INFORMADO");

      if (isDbNameMockOrEmpty) {
        nome = !shouldPreserve(row.nome) ? row.nome : (existingName || 'NAO INFORMADO');
      } else {
        nome = existingName;
      }

      // Anti-Null/Zero para os demais campos de clientes (se vier nulo/vazio, não sobrescreve dado do banco)
      const data_nascimento = !shouldPreserve(row.data_nascimento) ? row.data_nascimento : ((existingInMap?.data_nascimento || dbClient?.data_nascimento || null) as string | null);
      const telefone_1 = !shouldPreserve(row.telefone_1) ? row.telefone_1 : ((existingInMap?.telefone_1 || dbClient?.telefone_1 || null) as string | null);
      const telefone_2 = !shouldPreserve(row.telefone_2) ? row.telefone_2 : ((existingInMap?.telefone_2 || dbClient?.telefone_2 || null) as string | null);
      const telefone_3 = !shouldPreserve(row.telefone_3) ? row.telefone_3 : ((existingInMap?.telefone_3 || dbClient?.telefone_3 || null) as string | null);

      clientMap.set(row.cpf, {
        cpf: row.cpf,
        nome,
        data_nascimento,
        telefone_1,
        telefone_2,
        telefone_3,
        updated_at: new Date().toISOString()
      });
    });

    const clientRows = Array.from(clientMap.values());
    const { data: clientsData, error: clientErr } = await withRetry(async () => {
      return await supabase.from('governo_pi_clientes')
        .upsert(clientRows, { onConflict: 'cpf' })
        .select('id, cpf');
    });

    if (clientErr || !clientsData) throw new Error(`Erro ao garantir clientes Governo Piauí: ${clientErr?.message}`);

    const cpfToClientId = new Map<string, string>(clientsData.map((c: {id: string, cpf: string}) => [c.cpf, c.id]));

    // --- PASSO 2: Processar Identificações (Matriculas) ---
    const clientIds = Array.from(cpfToClientId.values());
    const existingIdentsRaw = await fetchInBatches<Record<string, unknown>>('governo_pi_identificacoes', 'cliente_id', clientIds);
    const existingIdentsMap = new Map(existingIdentsRaw.map(i => [`${i.cliente_id}_${i.matricula}`, i]));

    const identMap = new Map<string, Record<string, unknown>>();
    normalizedRows.forEach(row => {
      const clientId = cpfToClientId.get(row.cpf);
      if (!clientId || !row.matricula) return;

      const key = `${clientId}_${row.matricula}`;
      const dbIdent = existingIdentsMap.get(key) as Record<string, unknown> | undefined;
      const currentInMap = identMap.get(key);

      const vinculo = !shouldPreserve(row.vinculo) ? row.vinculo : (currentInMap?.vinculo || dbIdent?.vinculo || null);

      identMap.set(key, {
        cliente_id: clientId,
        matricula: row.matricula,
        vinculo,
        updated_at: new Date().toISOString()
      });
    });

    const identRows = Array.from(identMap.values());
    const { data: identsData, error: identErr } = await withRetry(async () => {
      return await supabase.from('governo_pi_identificacoes')
        .upsert(identRows, { onConflict: 'cliente_id, matricula' })
        .select('id, cliente_id, matricula');
    });

    if (identErr || !identsData) throw new Error(`Erro ao salvar identificações Governo Piauí: ${identErr?.message}`);

    const keyToIdentId = new Map<string, string>(identsData.map((id: {id: string, cliente_id: string, matricula: string}) => [`${id.cliente_id}_${id.matricula}`, id.id]));

    // --- PASSO 3: Inserir Lotações (Margins) com UPSERT (Mesclagem Inteligente de Dados como SIAPE) ---
    const identIds = Array.from(keyToIdentId.values());
    const existingLotacoesRaw = await fetchInBatches<Record<string, unknown>>('governo_pi_lotacoes', 'identificacao_id', identIds);
    const existingLotacoesMap = new Map(existingLotacoesRaw.map(l => [l.identificacao_id as string, l]));

    const lotacoesToUpsertMap = new Map<string, Record<string, unknown>>();

    normalizedRows.forEach(row => {
      const clientId = cpfToClientId.get(row.cpf);
      const identId = keyToIdentId.get(`${clientId}_${row.matricula}`);
      if (!identId) return;

      const existingLot = existingLotacoesMap.get(identId);
      const currentInMap = lotacoesToUpsertMap.get(identId);

      // Órgão é preservado se vier vazio no CSV
      const orgao = !shouldPreserve(row.orgao) ? row.orgao : (currentInMap?.orgao || existingLot?.orgao || null);

      // Margens devem ser atualizadas mesmo se vierem vazias (ou zeros) para refletir o estado real
      const margem_disponivel_emprestimo = row.margem_disponivel_emprestimo !== undefined ? row.margem_disponivel_emprestimo : (currentInMap?.margem_disponivel_emprestimo ?? existingLot?.margem_disponivel_emprestimo ?? null);
      const margem_cartao_consignado = row.margem_cartao_consignado !== undefined ? row.margem_cartao_consignado : (currentInMap?.margem_cartao_consignado ?? existingLot?.margem_cartao_consignado ?? null);
      const margem_cartao_beneficio = row.margem_cartao_beneficio !== undefined ? row.margem_cartao_beneficio : (currentInMap?.margem_cartao_beneficio ?? existingLot?.margem_cartao_beneficio ?? null);

      lotacoesToUpsertMap.set(identId, {
        identificacao_id: identId,
        orgao,
        margem_disponivel_emprestimo,
        margem_cartao_consignado,
        margem_cartao_beneficio,
        lote_id: loteId,
        updated_at: new Date().toISOString()
      });
    });

    const lotacaoRows = Array.from(lotacoesToUpsertMap.values());

    if (lotacaoRows.length > 0) {
      // 1. Limpamos quaisquer registros antigos para evitar duplicações históricas acumuladas em lotes (anti-timeout/anti-URL-limit)
      try {
        await deleteInBatches('governo_pi_lotacoes', 'identificacao_id', identIds);
      } catch (delErr) {
        const msg = delErr instanceof Error ? delErr.message : String(delErr);
        throw new Error(`Erro ao limpar lotações Governo Piauí antigas: ${msg}`);
      }

      // 2. Inserimos as novas lotações mescladas (agora sem perigo de colisão ou duplicação)
      const { error: lotErr } = await withRetry(async () => {
        return await supabase.from('governo_pi_lotacoes').insert(lotacaoRows);
      });
      if (lotErr) throw new Error(`Erro ao salvar lotações Governo Piauí: ${lotErr.message}`);
    }
  };

  const processGovernoMaChunk = async (results: Record<string, string | undefined>[], loteId: string) => {
    // 1. Normalização
    const normalizedRows = results.map(row => ({
      cpf: normalizeCPF(row.cpf || ""),
      nome: normalizeText(row.nome || ""),
      data_nascimento: normalizeDate(row.data_nascimento || ""),
      matricula: normalizeText(row.matricula || ""),
      vinculo: normalizeText(row.vinculo || ""),
      telefone_1: normalizePhone(row.telefone_1 || ""),
      telefone_2: normalizePhone(row.telefone_2 || ""),
      telefone_3: normalizePhone(row.telefone_3 || ""),
      orgao: normalizeText(row.orgao || ""),
      margem_emprestimo_consignado: normalizeMoney(row.margem_emprestimo_consignado),
      margem_cartao_consignado: normalizeMoney(row.margem_cartao_consignado),
      margem_cartao_beneficio: normalizeMoney(row.margem_cartao_beneficio)
    })).filter(r => r.cpf && r.cpf.length > 0);

    if (normalizedRows.length === 0) return;

    // --- PASSO 1: Garantir Entidade Cliente (CPF Único) ---
    const cpfs = Array.from(new Set(normalizedRows.map(r => r.cpf)));
    const existingClientsRaw = await fetchInBatches<Record<string, unknown>>('governo_ma_clientes', 'cpf', cpfs);
    const existingClientsMap = new Map(existingClientsRaw.map(c => [c.cpf as string, c]));

    const shouldPreserve = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return true;
      const v = String(val).trim();
      return v === "" || v === "0" || v === "0.0" || v === "0,0" || v === "0,00" || v === "0.00";
    };

    const clientMap = new Map<string, Record<string, unknown>>();
    normalizedRows.forEach(row => {
      const dbClient = existingClientsMap.get(row.cpf) as Record<string, unknown> | undefined;
      const existingInMap = clientMap.get(row.cpf);

      // Regra do Nome: O nome do cliente só é sobrescrito se o valor no banco estiver como null ou "MOCK/NÃO INFORMADO"
      const existingName = (existingInMap?.nome as string | undefined) || (dbClient?.nome as string | undefined);
      let nome: string;
      const dbNameUpper = String(existingName ?? "").toUpperCase().trim();
      const isDbNameMockOrEmpty = !existingName || 
                             dbNameUpper === "" || 
                             dbNameUpper === "MOCK" || 
                             dbNameUpper.includes("MOCK") || 
                             dbNameUpper.includes("NAO INFORMADO") || 
                             dbNameUpper.includes("NÃO INFORMADO");

      if (isDbNameMockOrEmpty) {
        nome = !shouldPreserve(row.nome) ? row.nome : (existingName || 'NAO INFORMADO');
      } else {
        nome = existingName;
      }

      // Anti-Null/Zero para os demais campos de clientes (se vier nulo/vazio, não sobrescreve dado do banco)
      const data_nascimento = !shouldPreserve(row.data_nascimento) ? row.data_nascimento : ((existingInMap?.data_nascimento || dbClient?.data_nascimento || null) as string | null);
      const telefone_1 = !shouldPreserve(row.telefone_1) ? row.telefone_1 : ((existingInMap?.telefone_1 || dbClient?.telefone_1 || null) as string | null);
      const telefone_2 = !shouldPreserve(row.telefone_2) ? row.telefone_2 : ((existingInMap?.telefone_2 || dbClient?.telefone_2 || null) as string | null);
      const telefone_3 = !shouldPreserve(row.telefone_3) ? row.telefone_3 : ((existingInMap?.telefone_3 || dbClient?.telefone_3 || null) as string | null);

      clientMap.set(row.cpf, {
        cpf: row.cpf,
        nome,
        data_nascimento,
        telefone_1,
        telefone_2,
        telefone_3,
        updated_at: new Date().toISOString()
      });
    });

    const clientRows = Array.from(clientMap.values());
    const { data: clientsData, error: clientErr } = await withRetry(async () => {
      return await supabase.from('governo_ma_clientes')
        .upsert(clientRows, { onConflict: 'cpf' })
        .select('id, cpf');
    });

    if (clientErr || !clientsData) throw new Error(`Erro ao garantir clientes Governo Maranhão: ${clientErr?.message}`);

    const cpfToClientId = new Map<string, string>(clientsData.map((c: {id: string, cpf: string}) => [c.cpf, c.id]));

    // --- PASSO 2: Processar Identificações (Matriculas) ---
    const clientIds = Array.from(cpfToClientId.values());
    const existingIdentsRaw = await fetchInBatches<Record<string, unknown>>('governo_ma_identificacoes', 'cliente_id', clientIds);
    const existingIdentsMap = new Map(existingIdentsRaw.map(i => [`${i.cliente_id}_${i.matricula}`, i]));

    const identMap = new Map<string, Record<string, unknown>>();
    normalizedRows.forEach(row => {
      const clientId = cpfToClientId.get(row.cpf);
      if (!clientId || !row.matricula) return;

      const key = `${clientId}_${row.matricula}`;
      const dbIdent = existingIdentsMap.get(key) as Record<string, unknown> | undefined;
      const currentInMap = identMap.get(key);

      const vinculo = !shouldPreserve(row.vinculo) ? row.vinculo : (currentInMap?.vinculo || dbIdent?.vinculo || null);

      identMap.set(key, {
        cliente_id: clientId,
        matricula: row.matricula,
        vinculo,
        updated_at: new Date().toISOString()
      });
    });

    const identRows = Array.from(identMap.values());
    const { data: identsData, error: identErr } = await withRetry(async () => {
      return await supabase.from('governo_ma_identificacoes')
        .upsert(identRows, { onConflict: 'cliente_id, matricula' })
        .select('id, cliente_id, matricula');
    });

    if (identErr || !identsData) throw new Error(`Erro ao salvar identificações Governo Maranhão: ${identErr?.message}`);

    const keyToIdentId = new Map<string, string>(identsData.map((id: {id: string, cliente_id: string, matricula: string}) => [`${id.cliente_id}_${id.matricula}`, id.id]));

    // --- PASSO 3: Inserir Lotações (Margins) com UPSERT (Mesclagem Inteligente de Dados como SIAPE) ---
    const identIds = Array.from(keyToIdentId.values());
    const existingLotacoesRaw = await fetchInBatches<Record<string, unknown>>('governo_ma_lotacoes', 'identificacao_id', identIds);
    const existingLotacoesMap = new Map(existingLotacoesRaw.map(l => [l.identificacao_id as string, l]));

    const lotacoesToUpsertMap = new Map<string, Record<string, unknown>>();

    normalizedRows.forEach(row => {
      const clientId = cpfToClientId.get(row.cpf);
      const identId = keyToIdentId.get(`${clientId}_${row.matricula}`);
      if (!identId) return;

      const existingLot = existingLotacoesMap.get(identId);
      const currentInMap = lotacoesToUpsertMap.get(identId);

      // Órgão é preservado se vier vazio no CSV
      const orgao = !shouldPreserve(row.orgao) ? row.orgao : (currentInMap?.orgao || existingLot?.orgao || null);

      // Margens devem ser atualizadas mesmo se vierem vazias (ou zeros) para refletir o estado real
      const margem_emprestimo_consignado = row.margem_emprestimo_consignado !== undefined ? row.margem_emprestimo_consignado : (currentInMap?.margem_emprestimo_consignado ?? existingLot?.margem_emprestimo_consignado ?? null);
      const margem_cartao_consignado = row.margem_cartao_consignado !== undefined ? row.margem_cartao_consignado : (currentInMap?.margem_cartao_consignado ?? existingLot?.margem_cartao_consignado ?? null);
      const margem_cartao_beneficio = row.margem_cartao_beneficio !== undefined ? row.margem_cartao_beneficio : (currentInMap?.margem_cartao_beneficio ?? existingLot?.margem_cartao_beneficio ?? null);

      lotacoesToUpsertMap.set(identId, {
        identificacao_id: identId,
        orgao,
        margem_emprestimo_consignado,
        margem_cartao_consignado,
        margem_cartao_beneficio,
        lote_id: loteId,
        updated_at: new Date().toISOString()
      });
    });

    const lotacaoRows = Array.from(lotacoesToUpsertMap.values());

    if (lotacaoRows.length > 0) {
      // 1. Limpamos quaisquer registros antigos para evitar duplicações históricas acumuladas em lotes (anti-timeout/anti-URL-limit)
      try {
        await deleteInBatches('governo_ma_lotacoes', 'identificacao_id', identIds);
      } catch (delErr) {
        const msg = delErr instanceof Error ? delErr.message : String(delErr);
        throw new Error(`Erro ao limpar lotações Governo Maranhão antigas: ${msg}`);
      }

      // 2. Inserimos as novas lotações mescladas (agora sem perigo de colisão ou duplicação)
      const { error: lotErr } = await withRetry(async () => {
        return await supabase.from('governo_ma_lotacoes').insert(lotacaoRows);
      });
      if (lotErr) throw new Error(`Erro ao salvar lotações Governo Maranhão: ${lotErr.message}`);
    }
  };

  const processGovernoRrChunk = async (results: Record<string, string | undefined>[], loteId: string) => {
    // cpfs, nome, data_de_nascimento, matricula, origem, regime_contratacao, margem_emprestimo, margem_cartao, telefone_1, telefone_2, telefone_3
    const normalizedRows = results.map(row => ({
      cpf: normalizeCPF(row.cpf || ""),
      nome: normalizeText(row.nome || ""),
      data_nascimento: normalizeDate(row.data_de_nascimento || row.data_nascimento || ""),
      matricula: normalizeText(row.matricula || ""),
      origem: normalizeText(row.origem || ""),
      regime_contratacao: normalizeText(row.regime_contratacao || ""),
      margem_emprestimo: normalizeMoney(row.margem_emprestimo),
      margem_cartao: normalizeMoney(row.margem_cartao),
      telefone_1: normalizePhone(row.telefone_1 || row.tefefone_1 || ""),
      telefone_2: normalizePhone(row.telefone_2 || ""),
      telefone_3: normalizePhone(row.telefone_3 || "")
    })).filter(r => r.cpf && r.cpf.length > 0);

    if (normalizedRows.length === 0) return;

    const cpfs = Array.from(new Set(normalizedRows.map(r => r.cpf)));
    const existingClientsRaw = await fetchInBatches<Record<string, unknown>>('governo_rr_clientes', 'cpf', cpfs);
    const existingClientsMap = new Map(existingClientsRaw.map(c => [c.cpf as string, c]));

    const shouldPreserve = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return true;
      const v = String(val).trim();
      return v === "" || v === "0" || v === "0.0" || v === "0,0" || v === "0,00" || v === "0.00";
    };

    const clientMap = new Map<string, Record<string, unknown>>();
    normalizedRows.forEach(row => {
      const dbClient = existingClientsMap.get(row.cpf) as Record<string, unknown> | undefined;
      const existingInMap = clientMap.get(row.cpf);

      // Regra do Nome: O nome do cliente só é sobrescrito se o valor no banco estiver como null ou "MOCK/NÃO INFORMADO"
      const existingName = (existingInMap?.nome as string | undefined) || (dbClient?.nome as string | undefined);
      let nome: string;
      const dbNameUpper = String(existingName ?? "").toUpperCase().trim();
      const isDbNameMockOrEmpty = !existingName || 
                             dbNameUpper === "" || 
                             dbNameUpper === "MOCK" || 
                             dbNameUpper.includes("MOCK") || 
                             dbNameUpper.includes("NAO INFORMADO") || 
                             dbNameUpper.includes("NÃO INFORMADO");

      if (isDbNameMockOrEmpty) {
        nome = !shouldPreserve(row.nome) ? row.nome : (existingName || 'NAO INFORMADO');
      } else {
        nome = existingName;
      }

      // Anti-Null/Zero para os demais campos de clientes (se vier nulo/vazio, não sobrescreve dado do banco)
      const data_nascimento = !shouldPreserve(row.data_nascimento) ? row.data_nascimento : ((existingInMap?.data_nascimento || dbClient?.data_nascimento || null) as string | null);
      const telefone_1 = !shouldPreserve(row.telefone_1) ? row.telefone_1 : ((existingInMap?.telefone_1 || dbClient?.telefone_1 || null) as string | null);
      const telefone_2 = !shouldPreserve(row.telefone_2) ? row.telefone_2 : ((existingInMap?.telefone_2 || dbClient?.telefone_2 || null) as string | null);
      const telefone_3 = !shouldPreserve(row.telefone_3) ? row.telefone_3 : ((existingInMap?.telefone_3 || dbClient?.telefone_3 || null) as string | null);

      clientMap.set(row.cpf, {
        cpf: row.cpf,
        nome,
        data_nascimento,
        telefone_1,
        telefone_2,
        telefone_3,
        updated_at: new Date().toISOString()
      });
    });

    const clientRows = Array.from(clientMap.values());
    const { data: clientsData, error: clientErr } = await withRetry(async () => {
      return await supabase.from('governo_rr_clientes')
        .upsert(clientRows, { onConflict: 'cpf' })
        .select('id, cpf');
    });

    if (clientErr || !clientsData) throw new Error(`Erro ao garantir clientes GOV RR: ${clientErr?.message}`);

    const cpfToClientId = new Map<string, string>(clientsData.map((c: {id: string, cpf: string}) => [c.cpf, c.id]));

    const clientIds = Array.from(cpfToClientId.values());
    const existingIdentsRaw = await fetchInBatches<Record<string, unknown>>('governo_rr_matriculas', 'cliente_id', clientIds);
    const existingIdentsMap = new Map(existingIdentsRaw.map(i => [`${i.cliente_id}_${i.matricula}`, i]));

    const identMap = new Map<string, Record<string, unknown>>();
    normalizedRows.forEach(row => {
      const clientId = cpfToClientId.get(row.cpf);
      if (!clientId || !row.matricula) return;

      const key = `${clientId}_${row.matricula}`;
      const dbIdent = existingIdentsMap.get(key) as Record<string, unknown> | undefined;
      const currentInMap = identMap.get(key);

      const regime_contratacao = !shouldPreserve(row.regime_contratacao) ? row.regime_contratacao : (currentInMap?.regime_contratacao || dbIdent?.regime_contratacao || null);

      identMap.set(key, {
        cliente_id: clientId,
        matricula: row.matricula,
        regime_contratacao,
        updated_at: new Date().toISOString()
      });
    });

    const identRows = Array.from(identMap.values());
    const { data: identsData, error: identErr } = await withRetry(async () => {
      return await supabase.from('governo_rr_matriculas')
        .upsert(identRows, { onConflict: 'cliente_id, matricula' })
        .select('id, cliente_id, matricula');
    });

    if (identErr || !identsData) throw new Error(`Erro ao salvar matrículas GOV RR: ${identErr?.message}`);

    const keyToIdentId = new Map<string, string>(identsData.map((id: {id: string, cliente_id: string, matricula: string}) => [`${id.cliente_id}_${id.matricula}`, id.id]));

    // --- PASSO 3: Inserir Lotações (Instituidores) com UPSERT (Mesclagem Inteligente de Dados como SIAPE) ---
    const identIds = Array.from(keyToIdentId.values());
    const existingLotacoesRaw = await fetchInBatches<Record<string, unknown>>('governo_rr_instituidores', 'matricula_id', identIds);
    const existingLotacoesMap = new Map(existingLotacoesRaw.map(l => [l.matricula_id as string, l]));

    const lotacoesToUpsertMap = new Map<string, Record<string, unknown>>();

    normalizedRows.forEach(row => {
      const clientId = cpfToClientId.get(row.cpf);
      const identId = keyToIdentId.get(`${clientId}_${row.matricula}`);
      if (!identId) return;

      const existingLot = existingLotacoesMap.get(identId);
      const currentInMap = lotacoesToUpsertMap.get(identId);

      // Origem é preservado se vier vazio no CSV
      const origem = !shouldPreserve(row.origem) ? row.origem : (currentInMap?.origem || existingLot?.origem || null);

      // Margens devem ser atualizadas mesmo se vierem vazias (ou zeros) para refletir o estado real
      const margem_emprestimo = row.margem_emprestimo !== undefined ? row.margem_emprestimo : (currentInMap?.margem_emprestimo ?? existingLot?.margem_emprestimo ?? null);
      const margem_cartao = row.margem_cartao !== undefined ? row.margem_cartao : (currentInMap?.margem_cartao ?? existingLot?.margem_cartao ?? null);

      lotacoesToUpsertMap.set(identId, {
        matricula_id: identId,
        origem,
        margem_emprestimo,
        margem_cartao,
        lote_id: loteId,
        updated_at: new Date().toISOString()
      });
    });

    const lotacaoRows = Array.from(lotacoesToUpsertMap.values());

    if (lotacaoRows.length > 0) {
      // 1. Limpamos quaisquer registros antigos para evitar duplicações históricas acumuladas em lotes (anti-timeout/anti-URL-limit)
      try {
        await deleteInBatches('governo_rr_instituidores', 'matricula_id', identIds);
      } catch (delErr) {
        const msg = delErr instanceof Error ? delErr.message : String(delErr);
        throw new Error(`Erro ao limpar instituidores GOV RR antigos: ${msg}`);
      }

      // 2. Inserimos as novas lotações mescladas (agora sem perigo de colisão ou duplicação)
      const { error: lotErr } = await withRetry(async () => {
        return await supabase.from('governo_rr_instituidores').insert(lotacaoRows);
      });
      if (lotErr) throw new Error(`Erro ao salvar instituidores GOV RR: ${lotErr.message}`);
    }
  };

  const handleStartImport = async () => {
    console.log("Botão 'Iniciar Importação' clicado");
    setImportError(null);
    if (!selectedFile) {
      setImportError("Por favor, selecione um arquivo CSV primeiro.");
      return;
    }

    try {
      const { data: { session } } = await withRetry(async () => {
        return await supabase.auth.getSession();
      });
      console.log("Sessão atual:", session ? `Usuário: ${session.user.email}` : "Nenhuma sessão encontrada");
      
      if (!session) {
        setImportError("Sua sessão expirou. Por favor, faça login novamente.");
        router.replace("/auth/login");
        return;
      }

      // Validação de cabeçalhos (Trava de segurança via FileReader Slice anti-permission-lock)
      const readHeaders = (): Promise<string[]> => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            const firstLine = text.split(/\r?\n/)[0] || "";
            
            // Detecta delimitador e faz o parsing
            const parseResult = Papa.parse<string[]>(firstLine, { header: false });
            let headers = parseResult.data[0] || [];
            
            if (headers.length === 1 && headers[0].includes(';')) {
              headers = headers[0].split(';');
            }
            resolve(headers);
          };
          reader.onerror = () => {
            resolve([]);
          };
          const blob = selectedFile.slice(0, 10240); // Slice super rápido de 10KB
          reader.readAsText(blob, "ISO-8859-1");
        });
      };

      const headers = await readHeaders();
      console.log(`[VALIDAÇÃO] Cabeçalhos encontrados para ${type}:`, headers);

      const isModelValid = checkRequiredHeaders(headers, type);
      if (!isModelValid) {
        setImportError(`O arquivo selecionado não corresponde ao modelo ${type}. Por favor, selecione a origem correta ou verifique o arquivo.`);
        return;
      }

      // Create real batch in DB
      console.log("Criando registro de lote no Supabase...");
      const { data: batchData, error: batchError } = await withRetry(async () => {
        return await supabase
          .from('lotes')
          .insert({
            descricao: description || "LOTE SEM DESCRIÇÃO",
            tipo: type,
            status: "PROCESSING",
            progresso: 0,
            total_linhas: "0",
            user_id: session.user.id
          })
          .select()
          .single();
      });

      if (batchError) {
        console.error("Erro crítico ao criar lote (Detalhes):", {
          code: batchError.code,
          message: batchError.message,
          details: batchError.details,
          hint: batchError.hint,
          userId: session.user.id
        });
        setImportError(`ERRO SUPABASE (${batchError.code}): ${batchError.message}. Verifique se o RLS está desativado no SQL Editor.`);
        setIsImporting(false);
        return;
      }

      console.log("Lote criado com sucesso:", batchData);
      const currentBatch = batchData as Batch;
      setBatchList(prev => [currentBatch, ...prev]);
      setIsImporting(true);
      setDescription("");

      /* // Nova regra: Se for modelo CONTRATOS, apaga todos os dados de 'itens_credito' antes de importar
      if (type === "CONTRATOS") {
        setCleaningLog(["Limpando base de contratos anterior..."]);
        const { error: deleteError } = await withRetry(async () => {
          // Para deletar tudo no Supabase/Postgres via API, precisamos de um filtro que pegue tudo
          return await supabase
            .from('itens_credito')
            .delete()
            .neq('numero_contrato', '_DELETE_ALL_'); 
        });

        if (deleteError) {
          console.error("Erro ao limpar tabela itens_credito:", deleteError);
          setImportError(`Erro ao limpar base de contratos: ${deleteError.message}`);
          setIsImporting(false);
          return;
        }
        console.log("Tabela itens_credito limpa com sucesso.");
        setCleaningLog(["Base de contratos limpa. Iniciando importação..."]);
      }*/

      let processedCount = 0;

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        encoding: "ISO-8859-1", 
        chunkSize: 1024 * 256, // Reduzido para 256KB para máxima estabilidade em conexões lentas
        chunk: async (results, parser) => {
          parser.pause();
          
          console.log(`[PAPA] Chunk lido: ${results.data.length} linhas.`);
          if (results.data.length > 0) {
            console.log("[PAPA] Exemplo da primeira linha:", results.data[0]);
          }

          try {
            // Processamento do chunk com mecanismo de retentativa
            await withRetry(async () => {
              if (type === "SIAPE") {
                await processSiapeChunk(results.data);
              } else if (type === "CONTRATOS") {
                await processContratosChunk(results.data);
              } else if (type === "GOVERNO_SP") {
                await processGovernoSpChunk(results.data, currentBatch.id);
              } else if (type === "PREFEITURA_SP") {
                await processPrefeituraSpChunk(results.data, currentBatch.id);
              } else if (type === "GOVERNO_PI") {
                await processGovernoPiChunk(results.data, currentBatch.id);
              } else if (type === "GOVERNO_MA") {
                await processGovernoMaChunk(results.data, currentBatch.id);
              } else if (type === "GOVERNO_RR") {
                await processGovernoRrChunk(results.data, currentBatch.id);
              }
            });
            
            processedCount += results.data.length;
            const progress = Math.min(99, Math.floor((results.meta.cursor / selectedFile.size) * 100));
            
            // Update UI
            setBatchList(prev => prev.map(b => 
              b.id === currentBatch.id ? { ...b, progresso: progress, total_linhas: processedCount.toLocaleString('pt-BR') } : b
            ));

            // Update DB (Opcional a cada chunk, podemos espaçar se for muito pesado)
            if (processedCount % 5000 === 0 || results.data.length < 100) {
              await withRetry(async () => {
                return await supabase
                  .from('lotes')
                  .update({ progresso: progress, total_linhas: processedCount.toLocaleString('pt-BR') })
                  .eq('id', currentBatch.id);
              });
            }

            setCleaningLog([`Processando: ${processedCount} linhas...`]);
            
            // Delay vital para o Main Thread e para o Nginx/Kong não "cansar" da conexão
            // Aumentado ligeiramente para garantir responsividade da UI
            await new Promise(resolve => setTimeout(resolve, 800));

          } catch (error: unknown) {
            const err = error as { message?: string; details?: string };
            const errorMsg = err?.message || err?.details || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            console.error("[IMPORT] Erro fatal no chunk:", errorMsg, err);
            setCleaningLog(prev => [...prev, `ERRO NO CHUNK: ${errorMsg}`]);
            throw error; // Re-throw para o PapaParse lidar se necessário
          }
          
          parser.resume();
        },
        complete: async () => {
          // Final update in DB
          try {
            await withRetry(async () => {
              return await supabase
                .from('lotes')
                .update({ 
                  status: "COMPLETED", 
                  progresso: 100, 
                  total_linhas: processedCount.toLocaleString('pt-BR'),
                  updated_at: new Date().toISOString()
                })
                .eq('id', currentBatch.id);
            });

            // Trigger background refresh of the search base (Optimized Split Tables)
            // We don't await this to avoid UI blocking if it takes too long
            supabase.rpc('refresh_all_base_consultas').then(({ data, error }) => {
              if (error) {
                // Se der timeout, avisamos que continuará processando
                console.warn("A atualização das tabelas de consulta rápida pode ter ultrapassado o tempo limite, mas deve continuar no servidor:", error);
              } else {
                console.log("Tabelas de consulta rápida atualizadas com sucesso:", data);
              }
            }).catch(err => {
              console.warn("Erro ao disparar refresh da base (Catch):", err);
            });

          } catch (err) {
            console.error("Erro ao finalizar lote:", err);
          }

          setBatchList(prev => prev.map(b => 
            b.id === currentBatch.id ? { ...b, status: "COMPLETED", progresso: 100, total_linhas: processedCount.toLocaleString('pt-BR') } : b
          ));

          setIsImporting(false);
          setSelectedFile(null);
          setCleaningLog([]);
          fetchTotalBase();
        },
        error: async (error: Error) => {
          console.warn("Erro de parsing CSV:", error?.message || error);
          
          await withRetry(async () => {
            return await supabase
              .from('lotes')
              .update({ status: "FAILED", erro: error.message })
              .eq('id', currentBatch.id);
          });

          setBatchList(prev => prev.map(b => 
            b.id === currentBatch.id ? { ...b, status: "FAILED", erro: error.message } : b
          ));
          setIsImporting(false);
        }
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Erro inesperado na importação:", error);
      alert(`Erro inesperado: ${error.message}`);
      setIsImporting(false);
    }
  };

  const handleCancel = async (id: string) => {
    await withRetry(async () => {
      return await supabase
        .from('lotes')
        .update({ status: "CANCELLED" })
        .eq('id', id);
    });

    setBatchList(prev => prev.map(batch => 
      batch.id === id ? { ...batch, status: "CANCELLED" as const } : batch
    ));
  };

  const downloadCSV = (type: 'siape' | 'contratos' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | 'governo_rr') => {
    let headers = "";
    let filename = "";

    if (type === 'siape') {
      headers = "cpf,nome,data_de_nascimento,telefone_1,telefone_2,telefone_3,matricula,orgao,situacao_funcional,salario,instituidor,regime_juridico,uf,saldo_70%,margem_35%,bruta_5,utilizada_5,liquida_5,beneficio_bruta_5,beneficio_utilizada_5,beneficio_liquida_5";
      filename = "modelo_siape.csv";
    } else if (type === 'contratos') {
      headers = "cpf,nome,uf,matricula,orgao,instituidor,banco,tipo,numero_do_contrato,parcela,prazo";
      filename = "modelo_contratos.csv";
    } else if (type === 'governo_sp') {
      headers = "cpf,nome,data_nascimento,identificação,data_nomeacao,lotacao,orgao,tipo_vinculo,mb_consignacoes,md_consignacoes,mb_cartao_credito,md_cartao_credito,mb_cartao_beneficio,md_cartao_beneficio,telefone_1,telefone_2,telefone_3";
      filename = "modelo_governo_sp.csv";
    } else if (type === 'prefeitura_sp') {
      headers = "cpf,nome,data_nascimento,identificacao,data_nomeacao,lotacao,orgao,tipo_vinculo,mb_consignacoes,md_consignacoes,mb_cartao_beneficio,md_cartao_beneficio,telefone_1,telefone_2,telefone_3";
      filename = "modelo_prefeitura_sp.csv";
    } else if (type === 'governo_pi') {
      headers = "cpf,nome,matricula,vinculo,data_nascimento,telefone_1,telefone_2,telefone_3,orgao,margem_disponivel_emprestimo,margem_cartao_consignado,margem_cartao_beneficio";
      filename = "modelo_governo_pi.csv";
    } else if (type === 'governo_ma') {
      headers = "cpf,nome,matricula,vinculo,data_nascimento,telefone_1,telefone_2,telefone_3,orgao,margem_emprestimo_consignado,margem_cartao_consignado,margem_cartao_beneficio";
      filename = "modelo_governo_ma.csv";
    } else if (type === 'governo_rr') {
      headers = "cpf,nome,data_de_nascimento,matricula,origem,regime_contratacao,margem_emprestimo,margem_cartao,telefone_1,telefone_2,telefone_3";
      filename = "modelo_governo_roraima.csv";
    }
    
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header title="IMPORTAR LOTE" />
      
      <div className="p-4 lg:p-8 space-y-8 max-w-[1400px] mx-auto w-full">
        {/* Import Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 card-shadow h-full">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Origem e descrição do lote <span className="text-red-500">*</span>
                </label>
                <div className="flex w-full">
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="h-[46px] pl-6 pr-10 rounded-l-xl border border-slate-100 bg-primary text-white text-[12px] font-bold focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23ffffff%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.8rem_center] bg-[size:1.5em_1.5em] bg-no-repeat min-w-[154px] hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <option value="SIAPE">SIAPE</option>
                    <option value="CONTRATOS">CONTRATOS</option>
                    <option value="GOVERNO_SP">GOVERNO SP</option>
                    <option value="PREFEITURA_SP">PREFEITURA SP</option>
                    <option value="GOVERNO_PI">GOVERNO PIAUÍ</option>
                    <option value="GOVERNO_MA">GOVERNO MARANHÃO</option>
                    <option value="GOVERNO_RR">GOVERNO RORAIMA</option>
                  </select>
                  <Input 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição opcional (ex: Servidores Estaduais)" 
                    className="flex-1 h-[46px] rounded-l-none rounded-r-xl border-l-0 text-[12px] bg-white"
                  />
                </div>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file && file.name.endsWith('.csv')) {
                    setSelectedFile(file);
                  }
                }}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4 transition-all cursor-pointer hover:border-primary/50",
                  isDragging ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50/30",
                  selectedFile ? "border-emerald-200 bg-emerald-50/30" : ""
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.name.endsWith('.csv')) {
                      setSelectedFile(file);
                    }
                  }}
                  accept=".csv"
                  className="hidden"
                />
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  {selectedFile ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Upload className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[12.5px] font-bold text-slate-700">
                    {selectedFile ? selectedFile.name : "Arraste seu arquivo CSV ou clique aqui"}
                  </p>
                  <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">Apenas arquivos .csv são suportados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="h-full">
            <Card className="bg-slate-50/50 border border-slate-200 shadow-none card-shadow h-full">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                    Certifique-se de que o arquivo segue o modelo padrão SharkConsig para evitar erros no processamento.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modelos de Importação</p>
                  <div className="space-y-2">
                    <button 
                      onClick={() => downloadCSV('siape')}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary transition-all group"
                    >
                      <FileText className="w-5 h-5 text-slate-300 group-hover:text-primary" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-700">MODELO SIAPE</p>
                        <p className="text-[10px] text-slate-400">Dados Pessoais + Matrícula</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => downloadCSV('contratos')}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary transition-all group"
                    >
                      <FileText className="w-5 h-5 text-slate-300 group-hover:text-primary" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-700">MODELO CONTRATOS</p>
                        <p className="text-[10px] text-slate-400">Contratos Ativos</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => downloadCSV('governo_sp')}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary transition-all group"
                    >
                      <FileText className="w-5 h-5 text-slate-300 group-hover:text-primary" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-700">MODELO GOVERNO SP</p>
                        <p className="text-[10px] text-slate-400">Base Governo São Paulo</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => downloadCSV('prefeitura_sp')}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary transition-all group"
                    >
                      <FileText className="w-5 h-5 text-slate-300 group-hover:text-primary" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-700">MODELO PREFEITURA SP</p>
                        <p className="text-[10px] text-slate-400">Base Prefeitura São Paulo</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => downloadCSV('governo_pi')}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary transition-all group"
                    >
                      <FileText className="w-5 h-5 text-slate-300 group-hover:text-primary" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-700">MODELO GOVERNO PIAUÍ</p>
                        <p className="text-[10px] text-slate-400">Base Governo Piauí</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => downloadCSV('governo_ma')}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary transition-all group"
                    >
                      <FileText className="w-5 h-5 text-slate-300 group-hover:text-primary" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-700">MODELO GOVERNO MARANHÃO</p>
                        <p className="text-[10px] text-slate-400">Base Governo Maranhão</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => downloadCSV('governo_rr')}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary transition-all group"
                    >
                      <FileText className="w-5 h-5 text-slate-300 group-hover:text-primary" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-700">MODELO GOVERNO RORAIMA</p>
                        <p className="text-[10px] text-slate-400">Base Governo Roraima</p>
                      </div>
                    </button>
                  </div>
                </div>

                {importError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight leading-tight">
                      {importError}
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleStartImport}
                  disabled={!selectedFile || isImporting}
                  className="w-full h-12 bg-primary text-white text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200 disabled:opacity-50"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isImporting ? "Importando..." : "Iniciar Importação"}
                </Button>
                <p className="text-[8.5px] font-bold text-slate-400 text-center uppercase tracking-widest">Processamento em segundo plano</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-6 mb-8 mt-4">
          <Card className="card-shadow bg-white overflow-hidden border border-slate-100/50">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {/* Header/Info Section */}
                <div className="p-8 md:w-1/4 bg-slate-50/30 flex flex-col justify-center items-center text-center">
                  <div className="w-14 h-14 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mb-4 group transition-all hover:scale-110">
                    <Users className="w-7 h-7 text-primary/40 transition-colors group-hover:text-primary" />
                  </div>
                  <div className="flex items-center gap-2 mb-1 justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Clientes na Base</p>
                    <button 
                      onClick={handleRefreshTotal}
                      disabled={isRefreshingTotal}
                      className={cn(
                        "p-1 rounded-full hover:bg-white transition-all text-slate-400 hover:text-primary border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm",
                        isRefreshingTotal && "animate-spin text-primary"
                      )}
                      title="Atualizar total"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                    </button>
                  </div>
                  <p className="text-[14px] font-black text-slate-900 tracking-tighter">
                    {((totalBaseSiape || 0) + (totalBaseGovSP || 0) + (totalBasePMSP || 0) + (totalBaseGovPI || 0) + (totalBaseGovMA || 0) + (totalBaseGovRR || 0)).toLocaleString('pt-BR')}
                  </p>
                </div>

                {/* Metrics Grid */}
                <div className="flex-1 p-8 bg-white">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {/* SIAPE */}
                    <div className="space-y-1.5 group cursor-default">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">SIAPE</span>
                      </div>
                      <p className="text-xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-primary transition-colors">
                        {totalBaseSiape.toLocaleString('pt-BR')}
                      </p>
                    </div>

                    {/* GOV SP */}
                    <div className="space-y-1.5 group cursor-default">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">GOV SP</span>
                      </div>
                      <p className="text-xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-emerald-600 transition-colors">
                        {totalBaseGovSP.toLocaleString('pt-BR')}
                      </p>
                    </div>

                    {/* PMSP */}
                    <div className="space-y-1.5 group cursor-default">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">PREF SP</span>
                      </div>
                      <p className="text-xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-blue-600 transition-colors">
                        {totalBasePMSP.toLocaleString('pt-BR')}
                      </p>
                    </div>

                    {/* GOV PI */}
                    <div className="space-y-1.5 group cursor-default">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">GOV PI</span>
                      </div>
                      <p className="text-xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-purple-600 transition-colors">
                        {totalBaseGovPI.toLocaleString('pt-BR')}
                      </p>
                    </div>

                    {/* GOV MA */}
                    <div className="space-y-1.5 group cursor-default">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">GOV MA</span>
                      </div>
                      <p className="text-xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-orange-600 transition-colors">
                        {totalBaseGovMA.toLocaleString('pt-BR')}
                      </p>
                    </div>

                    {/* GOVERNO RR */}
                    <div className="space-y-1.5 group cursor-default">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">GOV RORAIMA</span>
                      </div>
                      <p className="text-xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-cyan-600 transition-colors">
                        {totalBaseGovRR.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Section */}
        <Card className="card-shadow">
          <CardContent className="p-0">
            <div className="px-4 lg:px-8 py-6 lg:py-12 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-50">
              <div className="flex items-center gap-3 self-start">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <h3 className="text-base font-bold text-slate-900">Lotes Importados</h3>
              </div>
              <div className="w-full md:w-80">
                <Input 
                  placeholder="Pesquisar por ID ou Descrição..." 
                  icon={<Search className="w-4 h-4" />}
                  className="h-9 text-[12px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-50">
                    <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Identificação</th>
                    <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Convênio/Descrição</th>
                    <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Total</th>
                    <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBatchList.map((batch) => (
                    <tr key={batch.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                      <td className="px-8 py-5 text-[12px] font-semibold text-slate-900">#{batch.id.slice(0, 6)}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "px-2 py-1 text-[7.5px] font-bold text-white rounded uppercase tracking-tighter",
                            batch.tipo === "SIAPE" ? "bg-primary" : 
                            batch.tipo === "CONTRATOS" ? "bg-[#F59E0B]" : 
                            batch.tipo === "GOVERNO_SP" ? "bg-emerald-600" : 
                            batch.tipo === "PREFEITURA_SP" ? "bg-blue-600" : 
                            batch.tipo === "GOVERNO_PI" ? "bg-purple-600" : 
                            batch.tipo === "GOVERNO_RR" ? "bg-cyan-600" : "bg-cyan-600"
                          )}>
                            {batch.tipo === "GOVERNO_SP" ? "GOVERNO SP" : batch.tipo === "PREFEITURA_SP" ? "PREFEITURA SP" : batch.tipo === "GOVERNO_PI" ? "GOVERNO PI" : batch.tipo === "GOVERNO_MA" ? "GOVERNO MA" : batch.tipo === "GOVERNO_RR" ? "GOV RR" : batch.tipo}
                          </span>
                          <span className="text-[12px] font-semibold text-slate-600 uppercase">{batch.descricao}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[12px] font-semibold text-slate-500">
                        {new Date(batch.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-8 py-5 text-[12px] font-bold text-slate-900">{batch.total_linhas}</td>
                      <td className="px-8 py-5">
                        {batch.status === "PROCESSING" ? (
                              <div className="space-y-2 min-w-[120px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8.5px] font-bold text-primary uppercase tracking-widest">
                                    Processando...
                                  </span>
                                  <span className="text-[8.5px] font-bold text-primary">{batch.progresso}%</span>
                                </div>
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary transition-all duration-500" 
                                    style={{ width: `${batch.progresso}%` }}
                                  />
                                </div>
                                
                                {/* Performance-Optimized Cleaning Stages Display */}
                                {cleaningLog.length > 0 && (
                                  <div className="mt-2 p-1.5 bg-slate-50/50 rounded border border-slate-100/50 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="flex items-center gap-2">
                                      <Loader2 className="w-2.5 h-2.5 text-primary animate-spin" />
                                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                        {cleaningLog[0]}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                        ) : batch.status === "COMPLETED" ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="text-[8.5px] font-bold uppercase tracking-widest">COMPLETO</span>
                          </div>
                        ) : batch.status === "FAILED" ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            <span className="text-[8.5px] font-bold uppercase tracking-widest">FALHA</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-400 rounded-full">
                            <XCircle className="w-3 h-3" />
                            <span className="text-[8.5px] font-bold uppercase tracking-widest">CANCELADO</span>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={batch.status !== "PROCESSING"}
                          onClick={() => handleCancel(batch.id)}
                          className={cn(
                            "text-[8.5px] font-bold uppercase tracking-widest transition-colors",
                            batch.status === "PROCESSING" ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-slate-300"
                          )}
                        >
                          Cancelar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-8 py-10 flex flex-col sm:flex-row items-center justify-between border-t border-slate-50 bg-slate-50/20 gap-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, batchList.length)} de {batchList.length} lotes
                </p>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20 transition-all disabled:opacity-30"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 5;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={currentPage === i ? "default" : "outline"}
                            size="icon"
                            className={cn(
                              "h-8 w-8 rounded-lg transition-all text-[10px] font-black tracking-widest",
                              currentPage === i 
                                ? "bg-primary text-white shadow-lg shadow-primary/20 border-primary" 
                                : "border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20"
                            )}
                            onClick={() => handlePageChange(i)}
                          >
                            {i}
                          </Button>
                        );
                      }
                      return pages;
                    })()}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20 transition-all disabled:opacity-30"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
