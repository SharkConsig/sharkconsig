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
} from "lucide-react"

interface TableStatus {
  table: string
  label: string
  total: number
  pendingBase64: number
  migratedStorage: number
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

export default function MigracaoStoragePage() {
  const { isAdmin, isDeveloper, isLoading: isAuthLoading } = useAuth()
  const [tables, setTables] = useState<TableStatus[]>([])
  const [totalPending, setTotalPending] = useState<number>(0)
  const [selectedTable, setSelectedTable] = useState<string>("")
  const [isLoadingCounts, setIsLoadingCounts] = useState(false)
  const [isRunningPilot, setIsRunningPilot] = useState(false)
  const [isBatchRunning, setIsBatchRunning] = useState(false)
  const [sessionMigrated, setSessionMigrated] = useState(0)
  const [sessionBytes, setSessionBytes] = useState(0)
  const [lastSamples, setLastSamples] = useState<MigratedSample[]>([])
  const [failedItems, setFailedItems] = useState<FailedItem[]>([])

  const stopRequestedRef = useRef(false)

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

  const handleRunPilot = async () => {
    setIsRunningPilot(true)
    try {
      const token = await getAccessToken()
      const res = await fetch("/api/propostas-comerciais/migrar-storage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          table: selectedTable || undefined,
          limit: 1,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        toast.error(data?.error || "Erro no teste piloto.")
        return
      }
      setTables(data.tables || [])
      setTotalPending(data.totalPending || 0)

      if (data.migrated > 0) {
        const bytesSum = (data.migratedItems || []).reduce((acc: number, item: MigratedSample) => acc + (item.bytes || 0), 0)
        setSessionMigrated((prev) => prev + data.migrated)
        setSessionBytes((prev) => prev + bytesSum)
        setLastSamples((prev) => [...(data.migratedItems || []), ...prev].slice(0, 10))
        toast.success("Teste piloto concluído: 1 registro migrado! Teste o download abaixo.")
      } else if ((data.failedItems || []).length > 0) {
        setFailedItems((prev) => [...data.failedItems, ...prev].slice(0, 20))
        toast.error("O registro de teste falhou e foi mantido intacto no banco.")
      } else {
        toast.info("Nenhum registro pendente em Base64 encontrado.")
      }
    } catch {
      toast.error("Erro ao executar teste piloto.")
    } finally {
      setIsRunningPilot(false)
    }
  }

  const handleStartBatch = async () => {
    stopRequestedRef.current = false
    setIsBatchRunning(true)

    try {
      const token = await getAccessToken()
      let keepGoing = true

      while (keepGoing && !stopRequestedRef.current) {
        const res = await fetch("/api/propostas-comerciais/migrar-storage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            table: selectedTable || undefined,
            limit: 5,
          }),
        })

        const data = await res.json()
        if (!res.ok || !data?.success) {
          toast.error(data?.error || "Migração pausada por erro na requisição.")
          break
        }

        setTables(data.tables || [])
        setTotalPending(data.totalPending || 0)

        if (data.migrated > 0) {
          const bytesSum = (data.migratedItems || []).reduce((acc: number, item: MigratedSample) => acc + (item.bytes || 0), 0)
          setSessionMigrated((prev) => prev + data.migrated)
          setSessionBytes((prev) => prev + bytesSum)
          setLastSamples((prev) => [...(data.migratedItems || []), ...prev].slice(0, 10))
        }

        if ((data.failedItems || []).length > 0) {
          setFailedItems((prev) => [...data.failedItems, ...prev].slice(0, 20))
          toast.error("Migração pausada porque houve falha em um registro. Base64 original foi preservado.")
          break
        }

        const currentTablePending = selectedTable
          ? (data.tables || []).find((t: TableStatus) => t.table === selectedTable)?.pendingBase64 || 0
          : data.totalPending || 0

        if (data.finished || currentTablePending === 0 || data.processed === 0) {
          keepGoing = false
          toast.success("Migração em lotes concluída para o escopo selecionado!")
          break
        }

        await new Promise((resolve) => setTimeout(resolve, 250))
      }

      if (stopRequestedRef.current) {
        toast.info("Migração pausada pelo administrador.")
      }
    } catch {
      toast.error("Erro inesperado durante a migração em lotes.")
    } finally {
      setIsBatchRunning(false)
    }
  }

  const handlePauseBatch = () => {
    stopRequestedRef.current = true
  }

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
                    Processamento sequencial em lotes de 5 registros. Cada linha só é atualizada após confirmação do upload.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchDryRun}
                disabled={isLoadingCounts || isBatchRunning}
                className="gap-2 text-xs font-bold"
              >
                <RefreshCw className={isLoadingCounts ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />
                Atualizar Contagem (Dry Run)
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {tables.map((t) => (
                <button
                  key={t.table}
                  type="button"
                  disabled={isBatchRunning}
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
                  <p className="text-xl font-black text-slate-900 mt-1">
                    {t.pendingBase64.toLocaleString("pt-BR")}
                    <span className="text-xs font-semibold text-slate-400 ml-1">pendentes</span>
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span>Storage: {t.migratedStorage.toLocaleString("pt-BR")}</span>
                    <span>Total: {t.total.toLocaleString("pt-BR")}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-600 space-y-0.5">
                <p>
                  Escopo atual:{" "}
                  <strong className="text-slate-900">
                    {selectedTable || "Todas as tabelas pendentes"}
                  </strong>
                </p>
                <p>
                  Pendentes totais: <strong className="text-amber-600">{totalPending.toLocaleString("pt-BR")}</strong>{" "}
                  | Migrados nesta sessão:{" "}
                  <strong className="text-emerald-600">
                    {sessionMigrated.toLocaleString("pt-BR")} ({(sessionBytes / (1024 * 1024)).toFixed(1)} MB)
                  </strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleRunPilot}
                  disabled={isRunningPilot || isBatchRunning || totalPending === 0}
                  className="gap-2 text-xs font-bold"
                >
                  {isRunningPilot ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                  Teste Piloto (1 registro)
                </Button>

                {!isBatchRunning ? (
                  <Button
                    onClick={handleStartBatch}
                    disabled={isRunningPilot || totalPending === 0}
                    className="gap-2 text-xs font-bold bg-[#162546] hover:bg-[#162546]/90 text-white"
                  >
                    <Play className="w-4 h-4" />
                    Migrar em Lotes (5 por vez)
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

        {totalPending === 0 && tables.length > 0 && (
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-900 uppercase tracking-wider">
                Pronto para a Etapa 4 (no horário de almoço / baixo uso)
              </p>
              <p>
                Todos os registros já estão no Storage. Para devolver os ~3,78 GB ao disco do Supabase, execute um comando por vez no SQL Editor do Supabase:
              </p>
              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] space-y-1">
                <p>VACUUM FULL historico_proposta_comercial;</p>
                <p>VACUUM FULL historico_proposta_comercial_quitacao_contrato;</p>
                <p>VACUUM FULL historico_proposta_comercial_novo_formato;</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
