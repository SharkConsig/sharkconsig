"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
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
import { cn, normalizeText } from "@/lib/utils"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import Papa from "papaparse"
import { useAuth } from "@/context/auth-context"

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

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const error = err as any;
    const isNetworkError = 
      !error.status || // No status often means network failure
      error.message?.includes('fetch') || 
      error.message?.includes('NetworkError') || 
      error.message?.includes('Failed to fetch') ||
      error.code === 'PGRST301' || // JWT expired (sometimes retry helps if it's a glitch)
      error.code === 'ECONNRESET';

    if (retries > 0 && isNetworkError) {
      console.warn(`[RETRY] Falha na rede (${error.message || error.code}), tentando novamente em ${delay}ms... (${retries} tentativas restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export default function ImportBatchPage() {
  const router = useRouter()
  const { isAdmin, session, isLoading: authLoading } = useAuth()
  const [batchList, setBatchList] = useState<Batch[]>([]);
  const [totalBase, setTotalBase] = useState(0);
  const [isRefreshingTotal, setIsRefreshingTotal] = useState(false);
  const [description, setDescription] = useState("");
  const [type, setType] = useState("SIAPE");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cleaningLog, setCleaningLog] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/')
    }
  }, [authLoading, isAdmin, router])

  const fetchBatches = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await withRetry(async () => {
        return await supabase
          .from('lotes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
      });
      
      if (error) {
        console.warn("Erro ao buscar lotes:", error);
        return;
      }
      setBatchList(data || []);
    } catch (err: unknown) {
      console.warn("Erro ao buscar lotes (retry failed):", err);
    }
  }, [isSupabaseConfigured]);

  const fetchTotalBase = useCallback(async () => {
    if (!isSupabaseConfigured) {
      console.warn("Supabase is not configured. Total base count will remain 0.");
      return;
    }

    setIsRefreshingTotal(true);
    try {
      console.log("Estado da Sessão (fetchTotalBase):", session ? `Logado como ${session.user.email}` : "Não logado");

      const { count, error } = await withRetry(async () => {
        return await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true });
      });
      
      if (error) {
        // Usamos console.warn para evitar o "Error Overlay" do Next.js em desenvolvimento
        console.warn("Aviso Supabase (Total Base):", {
          message: error.message || "Sem mensagem (verifique conexão/CORS)",
          details: error.details,
          hint: error.hint || "Dica: Verifique se as tabelas foram criadas no SQL Editor do Supabase.",
          code: error.code
        });
        return;
      }
      setTotalBase(count || 0);
    } catch (err: unknown) {
      const error = err as Error;
      console.warn("Aviso inesperado ao buscar total da base:", error?.message || error);
    } finally {
      setIsRefreshingTotal(false);
    }
  }, [isSupabaseConfigured]);

  const handleRefreshTotal = () => {
    fetchTotalBase();
  };

  useEffect(() => {
    fetchTotalBase();
    fetchBatches();
  }, [fetchTotalBase, fetchBatches]);

  const normalizeCPF = (cpf: string) => {
    if (!cpf) return "";
    const clean = cpf.replace(/\D/g, "");
    return clean.padStart(11, "0");
  };

  const normalizeMoney = (value: any) => {
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
    values: any[],
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

  const processSiapeChunk = async (results: any[]) => {
    const cpfs = results.map(r => normalizeCPF(r.cpf)).filter(Boolean);
    if (cpfs.length === 0) return;

    // Fetch existing data to apply merge rules in batches to avoid URL length limits
    const existingClientsRaw = await fetchInBatches<any>('clientes', 'cpf', cpfs);
    const existingRegsRaw = await fetchInBatches<any>('matriculas', 'cliente_cpf', cpfs);

    const existingClients = new Map(existingClientsRaw.map(c => [c.cpf, c]));
    const existingRegs = new Map(existingRegsRaw.map(r => [`${r.cliente_cpf}_${r.numero_matricula}`, r]));

    const clientsToUpsertMap = new Map<string, any>();
    const registrationsToUpsertMap = new Map<string, any>();
    
    for (const row of results) {
      const cpf = normalizeCPF(row.cpf);
      if (!cpf) continue;

      const existingClient = existingClients.get(cpf);
      const regNum = row.matricula || '0';
      const existingReg = existingRegs.get(`${cpf}_${regNum}`);

      // Rule 1.5 & 1.7: Update personal data (Don't overwrite with null unless exception)
      const currentClientInMap = clientsToUpsertMap.get(cpf);
      const clientUpdate: any = { 
        cpf,
        nome: currentClientInMap?.nome ?? existingClient?.nome ?? 'NAO INFORMADO',
        data_nascimento: currentClientInMap?.data_nascimento ?? existingClient?.data_nascimento ?? null,
        telefone_1: currentClientInMap?.telefone_1 ?? existingClient?.telefone_1 ?? null,
        telefone_2: currentClientInMap?.telefone_2 ?? existingClient?.telefone_2 ?? null,
        telefone_3: currentClientInMap?.telefone_3 ?? existingClient?.telefone_3 ?? null,
        updated_at: new Date().toISOString()
      };
      
      const newName = normalizeText(row.nome);
      if (newName) clientUpdate.nome = newName;

      const birthDate = normalizeDate(row.data_de_nascimento);
      if (birthDate) clientUpdate.data_nascimento = birthDate;

      const p1 = normalizePhone(row.telefone_1);
      if (p1) clientUpdate.telefone_1 = p1;

      const p2 = normalizePhone(row.telefone_2);
      if (p2) clientUpdate.telefone_2 = p2;

      const p3 = normalizePhone(row.telefone_3);
      if (p3) clientUpdate.telefone_3 = p3;
      
      clientsToUpsertMap.set(cpf, clientUpdate);

      // Rule: Update registration data ONLY if 'matricula' is present in the row
      if (row.matricula) {
        const currentRegInMap = registrationsToUpsertMap.get(`${cpf}_${regNum}`);
        const regUpdate: any = {
          cliente_cpf: cpf,
          numero_matricula: regNum,
          orgao: currentRegInMap?.orgao ?? existingReg?.orgao ?? null,
          situacao_funcional: currentRegInMap?.situacao_funcional ?? existingReg?.situacao_funcional ?? null,
          salario: currentRegInMap?.salario ?? existingReg?.salario ?? null,
          regime_juridico: currentRegInMap?.regime_juridico ?? existingReg?.regime_juridico ?? null,
          uf: currentRegInMap?.uf ?? existingReg?.uf ?? null,
          updated_at: new Date().toISOString()
        };

        const orgao = normalizeText(row.orgao);
        if (orgao) regUpdate.orgao = orgao;

        const sitFunc = normalizeText(row.situacao_funcional);
        if (sitFunc) regUpdate.situacao_funcional = sitFunc;

        const salary = normalizeMoney(row.salario);
        if (salary !== null) regUpdate.salario = salary;

        const regime = normalizeText(row.regime_juridico);
        if (regime) regUpdate.regime_juridico = regime;

        const uf = normalizeText(row.uf);
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
      const instituidoresToUpsertMap = new Map<string, any>();
      
      for (const reg of regData) {
        const matchingRows = results.filter(r => 
          normalizeCPF(r.cpf) === reg.cliente_cpf && 
          (r.matricula || '0') === reg.numero_matricula
        );

        for (const row of matchingRows) {
          // Rule: Margins only update if matricula and (if pension) instituidor are present
          if (!row.matricula) continue;
          
          const isPension = reg.situacao_funcional === 'BENEFICIARIO PENSAO';
          
          // Rule: If pension, use instituidor. If not, use orgao (New Rule).
          const instName = isPension ? normalizeText(row.instituidor) : normalizeText(row.orgao);
          
          if (!instName) continue;
          
          const instUpdate: any = {
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

  const processContratosChunk = async (results: any[]) => {
    const cpfs = results.map(r => normalizeCPF(r.cpf)).filter(Boolean);
    if (cpfs.length === 0) {
      console.warn("Nenhum CPF válido encontrado no chunk de Contratos.");
      return;
    }

    console.log(`[CONTRATOS] Processando chunk: ${results.length} linhas, ${cpfs.length} CPFs.`);

    // Fetch existing data to apply merge rules in batches to avoid URL length limits
    const existingClientsRaw = await fetchInBatches<any>('clientes', 'cpf', cpfs);
    const existingRegsRaw = await fetchInBatches<any>('matriculas', 'cliente_cpf', cpfs);

    const existingClients = new Map(existingClientsRaw.map(c => [c.cpf, c]));
    const existingRegs = new Map(existingRegsRaw.map(r => [`${r.cliente_cpf}_${r.numero_matricula}`, r]));

    const clientsToUpsertMap = new Map();
    const registrationsToUpsertMap = new Map();
    
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
        const clientUpdate: any = { 
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
            ...(currentClientInMap || existingClient),
            ...clientUpdate
          });
        }
      }

      // Rule: Only create registration if it exists in the row and doesn't exist in DB.
      // Rule 1.9: UF from CONTRATOS updates matricula UF if present
      const newUf = normalizeText(row.uf);

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
          const baseReg = currentRegInMap || existingReg;
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

    let regData: any[] = [];
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
      regData = data || [];
    }

    // Create a complete map of registration IDs (existing + newly upserted)
    const regMap = new Map();
    // First, populate with existing ones
    existingRegs?.forEach(r => {
      regMap.set(`${r.cliente_cpf}_${r.numero_matricula}`, r.id);
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
    const existingInstituidoresRaw = await fetchInBatches<any>('instituidores', 'matricula_id', regIds);
    // Use normalizeText for the key to ensure consistency with NULL/empty strings
    const existingInstituidores = new Map(existingInstituidoresRaw.map(i => [`${i.matricula_id}_${normalizeText(i.nome)}`, i]));

    const instituidoresToUpsertMap = new Map();
    for (const row of results) {
      const cpf = normalizeCPF(row.cpf);
      if (!cpf) continue;
      const regNum = row.matricula || '0';
      const regId = regMap.get(`${cpf}_${regNum}`);
      const existingReg = existingRegs.get(`${cpf}_${regNum}`);
      
      if (regId && row.matricula) {
        const sitFunc = existingReg?.situacao_funcional;
        const isPension = sitFunc === 'BENEFICIARIO PENSAO';
        
        // Rule: Determine instituidor name based on situacao_funcional (Non-pension = orgao)
        const instName = isPension ? normalizeText(row.instituidor) : normalizeText(row.orgao);
        
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

    let instData: any[] = [];
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
      instData = data || [];
      console.log(`[CONTRATOS] ${instData.length} novos instituidores criados.`);
    }

    // Create a map for instituidores to link them to contracts
    const instMap = new Map();
    // First, populate with ALL existing ones
    existingInstituidores.forEach(i => {
      instMap.set(`${i.matricula_id}_${normalizeText(i.nome)}`, i.id);
    });
    // Then, add newly created ones
    instData.forEach(i => {
      instMap.set(`${i.matricula_id}_${normalizeText(i.nome)}`, i.id);
    });

    const contractsToUpsertMap = new Map();
    for (const row of results) {
      const cpf = normalizeCPF(row.cpf);
      if (!cpf) continue;
      const regNum = row.matricula || '0';
      const regId = regMap.get(`${cpf}_${regNum}`);
      const existingReg = existingRegs.get(`${cpf}_${regNum}`);
      
      if (regId && row.matricula) {
        const sitFunc = existingReg?.situacao_funcional;
        const isPension = sitFunc === 'BENEFICIARIO PENSAO';
        
        const instName = isPension ? normalizeText(row.instituidor) : normalizeText(row.orgao);
        
        if (!instName) continue;

        const instId = instMap.get(`${regId}_${instName}`) || null;
        const contractNum = row.numero_do_contrato || '0';
        
        if (instId) {
          contractsToUpsertMap.set(`${instId}_${contractNum}`, {
            instituidor_id: instId,
            numero_contrato: contractNum,
            banco: normalizeText(row.banco) || null,
            orgao: normalizeText(row.orgao) || null,
            tipo: normalizeText(row.tipo) || 'EMPRESTIMO',
            uf: normalizeText(row.uf) || null,
            parcela: normalizeMoney(row.parcela),
            prazo: parseInt(row.prazo) || null,
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

  const handleStartImport = async () => {
    console.log("Botão 'Iniciar Importação' clicado");
    setImportError(null);
    if (!selectedFile) {
      setImportError("Por favor, selecione um arquivo CSV primeiro.");
      return;
    }

    try {
      console.log("Sessão atual:", session ? `Usuário: ${session.user.email}` : "Nenhuma sessão encontrada");
      
      if (!session) {
        setImportError("Sua sessão expirou. Por favor, faça login novamente.");
        router.replace("/auth/login");
        return;
      }

      // Validação de cabeçalhos (Trava de segurança)
      const validateHeaders = () => {
        return new Promise<boolean>((resolve) => {
          Papa.parse(selectedFile, {
            preview: 1,
            header: true,
            encoding: "ISO-8859-1",
            complete: (results) => {
              const headers = results.meta.fields || [];
              console.log(`[VALIDAÇÃO] Cabeçalhos encontrados para ${type}:`, headers);
              
              if (type === "SIAPE") {
                // Cabeçalhos essenciais do modelo SIAPE
                const required = ["cpf", "matricula", "orgao", "situacao_funcional"];
                const isValid = required.every(h => headers.includes(h));
                resolve(isValid);
              } else if (type === "CONTRATOS") {
                // Cabeçalhos essenciais do modelo CONTRATOS
                const required = ["cpf", "numero_do_contrato", "banco", "parcela", "orgao"];
                const isValid = required.every(h => headers.includes(h));
                resolve(isValid);
              } else {
                resolve(false);
              }
            },
            error: () => resolve(false)
          });
        });
      };

      const isModelValid = await validateHeaders();
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
        chunkSize: 1024 * 512, // Reduzido para 512KB para maior estabilidade
        chunk: async (results, parser) => {
          parser.pause();
          
          console.log(`[PAPA] Chunk lido: ${results.data.length} linhas.`);
          if (results.data.length > 0) {
            console.log("[PAPA] Exemplo da primeira linha:", results.data[0]);
          }

          try {
            await withRetry(async () => {
              if (type === "SIAPE") {
                await processSiapeChunk(results.data);
              } else {
                await processContratosChunk(results.data);
              }
            });
            
            processedCount += results.data.length;
            const progress = Math.min(99, Math.floor((results.meta.cursor / selectedFile.size) * 100));
            
            // Update UI
            setBatchList(prev => prev.map(b => 
              b.id === currentBatch.id ? { ...b, progresso: progress, total_linhas: processedCount.toLocaleString('pt-BR') } : b
            ));

            // Update DB
            await withRetry(async () => {
              return await supabase
                .from('lotes')
                .update({ progresso: progress, total_linhas: processedCount.toLocaleString('pt-BR') })
                .eq('id', currentBatch.id);
            });

            setCleaningLog([`Processando: ${processedCount} linhas...`]);
            
            // Pequeno delay para permitir que o navegador respire e evitar "Failed to fetch"
            await new Promise(resolve => setTimeout(resolve, 300));

          } catch (error: any) {
            console.error("[IMPORT] Erro fatal no chunk após retentativas:", error);
            setCleaningLog(prev => [...prev, `ERRO FATAL: ${error.message}`]);
            // Opcionalmente, poderíamos pausar a importação aqui
          }
          
          parser.resume();
        },
        complete: async () => {
          // Final update in DB
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

          setBatchList(prev => prev.map(b => 
            b.id === currentBatch.id ? { ...b, status: "COMPLETED", progresso: 100, total_linhas: processedCount.toLocaleString('pt-BR') } : b
          ));

          setIsImporting(false);
          setSelectedFile(null);
          setCleaningLog([]);
          fetchTotalBase();
        },
        error: async (error: any) => {
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
    } catch (err: any) {
      console.error("Erro inesperado na importação:", err);
      toast.error(`Erro inesperado: ${err.message}`);
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

  const downloadCSV = (type: 'siape' | 'contratos') => {
    const headers = type === 'siape' 
      ? "cpf,nome,data_de_nascimento,telefone_1,telefone_2,telefone_3,matricula,orgao,situacao_funcional,salario,instituidor,regime_juridico,uf,saldo_70%,margem_35%,bruta_5,utilizada_5,liquida_5,beneficio_bruta_5,beneficio_utilizada_5,beneficio_liquida_5"
      : "cpf,nome,uf,matricula,orgao,instituidor,banco,tipo,numero_do_contrato,parcela,prazo";
    
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `modelo_${type}.csv`);
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
        <Card className="card-shadow">
          <CardContent className="py-[45px] px-8 flex items-center gap-6">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center">
              <Users className="w-[25px] h-[25px] text-slate-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">Total na base</p>
                <button 
                  onClick={handleRefreshTotal}
                  disabled={isRefreshingTotal}
                  className={cn(
                    "p-1 rounded-full hover:bg-slate-100 transition-all text-slate-400 hover:text-primary",
                    isRefreshingTotal && "animate-spin text-primary"
                  )}
                  title="Atualizar total"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                </button>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                  {totalBase.toLocaleString('pt-BR')}
                </span>
                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest mt-1">Clientes cadastrados</span>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  {batchList.map((batch) => (
                    <tr key={batch.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                      <td className="px-8 py-5 text-[12px] font-semibold text-slate-900">#{batch.id.slice(0, 6)}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "px-2 py-1 text-[7.5px] font-bold text-white rounded uppercase tracking-tighter",
                            batch.tipo === "SIAPE" ? "bg-primary" : "bg-[#F59E0B]"
                          )}>
                            {batch.tipo}
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

            <div className="px-8 py-12 flex items-center justify-between border-t border-slate-50">
              <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">Primeira</button>
              <div className="flex items-center gap-4">
                <button className="p-1 text-slate-400 hover:text-primary"><ChevronLeft className="w-5 h-5" /></button>
                <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">1 de 5</span>
                <button className="p-1 text-slate-400 hover:text-primary"><ChevronRight className="w-5 h-5" /></button>
              </div>
              <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">Última</button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
