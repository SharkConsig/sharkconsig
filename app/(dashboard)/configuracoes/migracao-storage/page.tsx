"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"
import { downloadCommercialProposalFile } from "@/lib/propostas-comerciais-storage"
import { toast } from "sonner"
import {
  Database,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  FlaskConical,
  Loader2,
  ShieldAlert,
  RotateCcw,
} from "lucide-react"

interface TableStatus {
  table: string
  label: string
  total: number
  pendingBase64: number | null
  migratedStorage: number | null
  queryError?: string | null
}

interface MigratedSample {
  id: string | number
  cliente_nome: string
  table: string
  tipo_arquivo: string
  url: string
  bytes: number
}

interface FailedItem {
  id: string | number
  table: string
  error: string
}

const CURSOR_STORAGE_KEY = "sharkconsig_storage_migration_cursors_v1"

export default function MigracaoStoragePage() {
  const { isAdmin, isDeveloper, isLoading: isAuthLoading } = useAuth()
  const [tables, setTables] = useState<TableStatus[]>([])
  const [totalPending, setTotalPending] = useState<number>(0)
  const [hasUnknownPending, setHasUnknownPending] = useState<boolean>(false)
  const [totalRows, setTotalRows] = useState<number>(0)
  const [selectedTable, setSelectedTable] = useState<string>("")
  const [isLoadingCounts, setIsLoadingCounts] = useState(false)
  const [isRunningPilot, setIsRunningPilot] = useState(false)
  const [isBatchRunning, setIsBatchRunning] = useState(false)
  const [currentScanLabel, setCurrentScanLabel] = useState<string>("")
  const [sessionProcessed, setSessionProcessed] = useState(0)
  const [sessionMigrated, setSessionMigrated] = useState(0)
  const [sessionAlreadyStorage, setSessionAlreadyStorage] = useState(0)
  const [sessionBytes, setSessionBytes] = useState(0)
  const [migrationCompletedAll, setMigrationCompletedAll] = useState(false)
  const [lastSamples, setLastSamples] = useState<MigratedSample[]>([])
  const [failedItems, setFailedItems] = useState<FailedItem[]>([])
  const [batchError, setBatchError] = useState<string | null>(null)
  const [savedCursors, setSavedCursors] = useState<Record<string, string | number | null>>({})

  const stopRequestedRef = useRef(false)
  const pausedByUserRef = useRef(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CURSOR_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === "object") {
          setSavedCursors(parsed)
        }
      }
    } catch {
      // ignora erro de leitura
    }
  }, [])

  const updateCursorForTable = (tableName: string, cursorVal: string | number | null) => {
    setSavedCursors((prev) => {
      const next = { ...prev, [tableName]: cursorVal }
      try {
        sessionStorage.setItem(CURSOR_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignora erro de escrita
      }
      return next
    })
  }

  const handleResetCursors = () => {
    setSavedCursors({})
    setMigrationCompletedAll(false)
    setBatchError(null)
    try {
      sessionStorage.removeItem(CURSOR_STORAGE_KEY)
    } catch {
      // ignora
    }
    toast.info("Posição da varredura reiniciada.")
  }

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || ""
  }

  const fetchDryRun = useCallback(async () => {
    setIsLoadingCounts(true)
    try {
      const token = await getAccessToken()
      const res = await fetch("/api/propostas-comerciais/migrar-storage", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        toast.error(data?.error || "Erro ao consultar pendências de migração.")
        return
      }
      setTables(data.tables || [])
      setTotalPending(data.totalPending || 0)
      setHasUnknownPending(Boolean(data.hasUnknownPending))
      setTotalRows(data.totalRows || 0)
    } catch {
      toast.error("Falha de conexão ao verificar pendências.")
    } finally {
      setIsLoadingCounts(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthLoading && (isAdmin || isDeveloper)) {
      fetchDryRun()
    }
  }, [isAuthLoading, isAdmin, isDeveloper, fetchDryRun])

  const getCandidateTables = () => {
    if (selectedTable) {
      const found = tables.find((t) => t.table === selectedTable)
      return found ? [found] : []
    }
    return tables.filter((t) => t.total > 0 && t.pendingBase64 !== 0)
  }

  const handleRunPilot = async () => {
    const candidates = getCandidateTables()
    if (candidates.length === 0) {
      toast.info("Nenhuma tabela com registros disponíveis encontrada.")
      return
    }

    setBatchError(null)
    setIsRunningPilot(true)
    try {
      const token = await getAccessToken()

      for (const candidate of candidates) {
        let cursor: string | number | null = savedCursors[candidate.table] ?? null
        let hasMore = true
        let attempts = 0

        while (hasMore && attempts < 20) {
          attempts++
          setCurrentScanLabel(`Buscando 1 Base64 em ${candidate.label}...`)

          const res = await fetch("/api/propostas-comerciais/migrar-storage", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              table: candidate.table,
              pilot: true,
              cursor,
            }),
          })

          const data = await res.json().catch(() => ({}))
          if (!res.ok || !data?.success) {
            const errMsg = data?.error || `Erro HTTP ${res.status} no teste piloto.`
            setBatchError(errMsg)
            toast.error(errMsg)
            return
          }

          setSessionProcessed((prev) => prev + (data.processed || 0))
          setSessionAlreadyStorage((prev) => prev + (data.alreadyStorage || 0))

          if (data.nextCursor !== undefined && data.nextCursor !== null) {
            cursor = data.nextCursor
            updateCursorForTable(candidate.table, cursor)
          }

          if ((data.failedItems || []).length > 0) {
            setFailedItems((prev) => [...data.failedItems, ...prev].slice(0, 30))
          }

          if (data.migrated > 0) {
            const bytesSum = (data.migratedItems || []).reduce((acc: number, item: MigratedSample) => acc + (item.bytes || 0), 0)
            setSessionMigrated((prev) => prev + data.migrated)
            setSessionBytes((prev) => prev + bytesSum)
            setLastSamples((prev) => [...(data.migratedItems || []), ...prev].slice(0, 10))
            toast.success(`Teste piloto concluído (${candidate.label}): 1 registro migrado! Teste o download abaixo.`)
            return
          }

          hasMore = Boolean(data.hasMore) && cursor !== null
        }
      }

      toast.info("Nenhum registro pendente em Base64 encontrado no escopo selecionado.")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao executar teste piloto."
      setBatchError(msg)
      toast.error(msg)
    } finally {
      setCurrentScanLabel("")
      setIsRunningPilot(false)
    }
  }

  const postBatchWithRetry = async (
    table: string,
    cursor: string | number | null,
    limit: number
  ) => {
    let lastErrMsg = "Falha na requisição."

    for (let retry = 0; retry < 3; retry++) {
      try {
        const token = await getAccessToken()
        const res = await fetch("/api/propostas-comerciais/migrar-storage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            table,
            limit,
            cursor,
          }),
        })

        const data = await res.json().catch(() => null)
        if (res.ok && data?.success) {
          return { ok: true as const, data }
        }

        lastErrMsg = data?.error || `Erro HTTP ${res.status} ao processar lote.`

        // Não insiste em erro de autenticação/permissão
        if (res.status === 401 || res.status === 403 || res.status === 400) {
          return { ok: false as const, error: lastErrMsg }
        }
      } catch (err) {
        lastErrMsg = err instanceof Error ? err.message : "Erro de rede ao comunicar com o servidor."
      }

      if (retry < 2 && !stopRequestedRef.current) {
        setCurrentScanLabel(`Reconectando (${retry + 1}/2)...`)
        await new Promise((resolve) => setTimeout(resolve, 1200 * (retry + 1)))
      }
    }

    return { ok: false as const, error: lastErrMsg }
  }

  const handleStartBatch = async () => {
    const candidates = getCandidateTables()
    if (candidates.length === 0) {
      toast.info("Nenhuma tabela com registros disponíveis para migração.")
      return
    }

    stopRequestedRef.current = false
    pausedByUserRef.current = false
    setBatchError(null)
    setIsBatchRunning(true)
    setMigrationCompletedAll(false)

    try {
      let errored = false
      let consecutiveFailures = 0

      for (const candidate of candidates) {
        if (stopRequestedRef.current) break

        let cursor: string | number | null = savedCursors[candidate.table] ?? null
        let hasMore = true

        while (hasMore && !stopRequestedRef.current) {
          setCurrentScanLabel(`Processando ${candidate.label}...`)

          const batchResult = await postBatchWithRetry(candidate.table, cursor, 5)

          if (!batchResult.ok) {
            errored = true
            setBatchError(`${candidate.label}: ${batchResult.error}`)
            toast.error(`Migração interrompida: ${batchResult.error}`)
            stopRequestedRef.current = true
            break
          }

          const data = batchResult.data

          setSessionProcessed((prev) => prev + (data.processed || 0))
          setSessionAlreadyStorage((prev) => prev + (data.alreadyStorage || 0))

          if (data.migrated > 0) {
            consecutiveFailures = 0
            const bytesSum = (data.migratedItems || []).reduce((acc: number, item: MigratedSample) => acc + (item.bytes || 0), 0)
            setSessionMigrated((prev) => prev + data.migrated)
            setSessionBytes((prev) => prev + bytesSum)
            setLastSamples((prev) => [...(data.migratedItems || []), ...prev].slice(0, 10))
          }

          if ((data.failedItems || []).length > 0) {
            consecutiveFailures += data.failedItems.length
            setFailedItems((prev) => [...data.failedItems, ...prev].slice(0, 30))
          } else if ((data.processed || 0) > 0) {
            consecutiveFailures = 0
          }

          if (data.nextCursor !== undefined && data.nextCursor !== null) {
            cursor = data.nextCursor
            updateCursorForTable(candidate.table, cursor)
          }

          if (consecutiveFailures >= 5) {
            errored = true
            const msg = "Muitas falhas consecutivas em registros seguidos. Migração pausada para segurança."
            setBatchError(msg)
            toast.error(msg)
            stopRequestedRef.current = true
            break
          }

          hasMore = Boolean(data.hasMore) && cursor !== null

          await new Promise((resolve) => setTimeout(resolve, 150))
        }
      }

      if (pausedByUserRef.current) {
        toast.info("Migração pausada pelo usuário. Ao retomar, continuará de onde parou.")
      } else if (!errored && !stopRequestedRef.current) {
        setMigrationCompletedAll(true)
        toast.success("Varredura e migração concluídas!")
        fetchDryRun()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado durante a migração em lotes."
      setBatchError(msg)
      toast.error(msg)
    } finally {
      setCurrentScanLabel("")
      setIsBatchRunning(false)
    }
  }

  const handlePauseBatch = () => {
    pausedByUserRef.current = true
    stopRequestedRef.current = true
  }

  const canRunActions =
    totalRows > 0 &&
    (selectedTable
      ? (tables.find((t) => t.table === selectedTable)?.total || 0) > 0
      : true)

  const hasSavedCursor = Object.values(savedCursors).some((v) => v !== null && v !== undefined)

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Header title="Migração Storage" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        </div>
      </div>
    )
  }

  if (!isAdmin && !isDeveloper) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Header title="Migração Storage" />
        <main className="p-6 max-w-2xl mx-auto mt-12">
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-6 flex items-center gap-3 text-rose-700">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <p className="text-sm font-semibold">
                Acesso restrito exclusivamente a Administrador e Desenvolvedor.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Migração Storage — Propostas Comerciais" />
      <main className="p-6 max-w-5xl mx-auto space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#162546] text-white flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Etapa 3 — Migração Segura Base64 → Storage
                  </h1>
                  <p className="text-xs text-slate-500">
                    Leitura individual por chave primária em lotes de até 5 registros, com retomada automática de onde parou.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasSavedCursor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetCursors}
                    disabled={isBatchRunning || isRunningPilot}
                    className="gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                    title="Voltar a varredura para o início da tabela"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reiniciar Varredura
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchDryRun}
                  disabled={isLoadingCounts || isBatchRunning || isRunningPilot}
                  className="gap-2 text-xs font-bold"
                >
                  <RefreshCw className={isLoadingCounts ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />
                  Atualizar Contagem (Dry Run)
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {tables.map((t) => (
                <button
                  key={t.table}
                  type="button"
                  disabled={isBatchRunning || isRunningPilot}
                  onClick={() => setSelectedTable((prev) => (prev === t.table ? "" : t.table))}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    selectedTable === t.table
                      ? "border-[#162546] bg-[#162546]/5 ring-1 ring-[#162546]"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {t.label}
                  </p>
                  {t.pendingBase64 === null ? (
                    <p className="text-sm font-black text-amber-600 mt-1.5">
                      Verificar na varredura
                    </p>
                  ) : (
                    <p className="text-xl font-black text-slate-900 mt-1">
                      {t.pendingBase64.toLocaleString("pt-BR")}
                      <span className="text-xs font-semibold text-slate-400 ml-1">pendentes</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span>
                      Storage: {t.migratedStorage === null ? "-" : t.migratedStorage.toLocaleString("pt-BR")}
                    </span>
                    <span>Total: {t.total.toLocaleString("pt-BR")}</span>
                  </div>
                  {savedCursors[t.table] && (
                    <p className="text-[10px] text-indigo-600 font-semibold mt-1 truncate">
                      Ponto salvo para retomar
                    </p>
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-600 space-y-0.5">
                <p>
                  Escopo atual:{" "}
                  <strong className="text-slate-900">
                    {selectedTable || "Todas as tabelas"}
                  </strong>
                  {currentScanLabel && (
                    <span className="ml-2 text-indigo-600 font-semibold">• {currentScanLabel}</span>
                  )}
                </p>
                <p>
                  {hasUnknownPending ? (
                    <>Total de registros no escopo: <strong className="text-amber-600">{totalRows.toLocaleString("pt-BR")}</strong></>
                  ) : (
                    <>Pendentes em Base64: <strong className="text-amber-600">{totalPending.toLocaleString("pt-BR")}</strong></>
                  )}{" "}
                  | Verificados: <strong className="text-slate-800">{sessionProcessed.toLocaleString("pt-BR")}</strong>{" "}
                  | Já no Storage: <strong className="text-slate-800">{sessionAlreadyStorage.toLocaleString("pt-BR")}</strong>{" "}
                  | Migrados agora:{" "}
                  <strong className="text-emerald-600">
                    {sessionMigrated.toLocaleString("pt-BR")} ({(sessionBytes / (1024 * 1024)).toFixed(1)} MB)
                  </strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleRunPilot}
                  disabled={isRunningPilot || isBatchRunning || !canRunActions}
                  className="gap-2 text-xs font-bold"
                >
                  {isRunningPilot ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                  Teste Piloto (1 registro)
                </Button>

                {!isBatchRunning ? (
                  <Button
                    onClick={handleStartBatch}
                    disabled={isRunningPilot || !canRunActions}
                    className="gap-2 text-xs font-bold bg-[#162546] hover:bg-[#162546]/90 text-white"
                  >
                    <Play className="w-4 h-4" />
                    {hasSavedCursor ? "Retomar Migração em Lotes" : "Migrar em Lotes (5 por vez)"}
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handlePauseBatch}
                    className="gap-2 text-xs font-bold"
                  >
                    <Pause className="w-4 h-4" />
                    Pausar Migração
                  </Button>
                )}
              </div>
            </div>

            {batchError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Motivo da interrupção:</p>
                  <p>{batchError}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {lastSamples.length > 0 && (
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                Últimos registros migrados (teste o download antes de prosseguir)
              </div>
              <div className="space-y-2">
                {lastSamples.map((item) => (
                  <div
                    key={`${item.table}-${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-emerald-100 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">
                        #{item.id} — {item.cliente_nome}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {item.table} • {(item.bytes / 1024).toFixed(0)} KB • {item.tipo_arquivo}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadCommercialProposalFile(
                          item.url,
                          `teste_${item.id}.${item.tipo_arquivo.toLowerCase() === "pdf" ? "pdf" : "jpg"}`
                        )
                      }
                      className="gap-1.5 text-xs font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Testar Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {failedItems.length > 0 && (
          <Card className="border-rose-200 bg-rose-50/50">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                Registros com falha (Base64 preservado no banco)
              </div>
              <div className="space-y-1 text-xs text-rose-700">
                {failedItems.map((f, idx) => (
                  <p key={`${f.table}-${f.id}-${idx}`}>
                    {f.table} #{f.id}: {f.error}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {(migrationCompletedAll || (!hasUnknownPending && totalPending === 0 && tables.length > 0)) && (
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-900 uppercase tracking-wider">
                Pronto para a Etapa 4 (no horário de almoço / baixo uso)
              </p>
              <p>
                Para devolver os ~3,78 GB ao disco do Supabase após concluir todas as tabelas, execute um comando por vez no SQL Editor do Supabase:
              </p>
              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] space-y-1">
                <p>VACUUM FULL historico_proposta_comercial;</p>
                <p>VACUUM FULL historico_proposta_comercial_quitacao_contrato;</p>
                <p>VACUUM FULL historico_proposta_comercial_novo_formato;</p>
                <p>VACUUM FULL historico_proposta_comercial_calculadora;</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
