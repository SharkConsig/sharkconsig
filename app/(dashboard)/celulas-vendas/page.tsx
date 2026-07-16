"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { 
  Users, 
  UserCheck, 
  X, 
  Loader2, 
  RefreshCw, 
  UserMinus, 
  Plus, 
  Building,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface UsuarioAPI {
  id: string
  email: string
  nome: string
  username?: string
  funcao: string
  status: string
  padrinho_id?: string
  padrinho_nome?: string
  avatar_url?: string
}

export default function CelulasVendasPage() {
  const [users, setUsers] = useState<UsuarioAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null) // To track individual desvincular loadings

  // Modals / Confirmation states
  const [showDeleteCellModal, setShowDeleteCellModal] = useState<{ closerId: string; closerNome: string } | null>(null)
  const [showUnlinkSdrModal, setShowUnlinkSdrModal] = useState<{ sdrId: string; sdrNome: string } | null>(null)
  const [showAddSdrToCell, setShowAddSdrToCell] = useState<{ closerId: string; closerNome: string } | null>(null)

  // Form states
  const [selectedCloserId, setSelectedCloserId] = useState<string>("")
  const [selectedSdrIds, setSelectedSdrIds] = useState<Record<string, boolean>>({})

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/usuarios")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setUsers(data)
        }
      } else {
        toast.error("Erro ao carregar colaboradores")
      }
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error)
      toast.error("Erro de conexão ao carregar colaboradores")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Filter Closers (Corretores)
  const closers = useMemo(() => {
    return users.filter(u => u.funcao?.toLowerCase() === 'corretor' && u.status === 'ATIVO')
  }, [users])

  // Filter SDRs (Estagiários)
  const sdrs = useMemo(() => {
    return users.filter(u => 
      (u.funcao?.toLowerCase() === 'estágio' || u.funcao?.toLowerCase() === 'estagio') && 
      u.status === 'ATIVO'
    )
  }, [users])

  // Filter unassigned SDRs
  const unassignedSdrs = useMemo(() => {
    return sdrs.filter(u => !u.padrinho_id)
  }, [sdrs])

  // Group active cells: Map closerId -> { closer: UsuarioAPI, sdrs: UsuarioAPI[] }
  const cells = useMemo(() => {
    const cellsMap: Record<string, { closer: UsuarioAPI; sdrs: UsuarioAPI[] }> = {}
    
    // Seed with all closers so we display them even if they don't have linked sdrs,
    // or we can only show closers that have at least one sdr linked.
    // The user requested: "Tabela de Visualização Ativa: grid mostrando as células já formadas"
    // So let's show only closers that actually have SDRs linked to them!
    sdrs.forEach(sdr => {
      if (sdr.padrinho_id) {
        const closer = closers.find(c => c.id === sdr.padrinho_id)
        if (closer) {
          if (!cellsMap[sdr.padrinho_id]) {
            cellsMap[sdr.padrinho_id] = { closer, sdrs: [] }
          }
          cellsMap[sdr.padrinho_id].sdrs.push(sdr)
        }
      }
    })

    return Object.values(cellsMap)
  }, [sdrs, closers])

  const handleLink = async () => {
    if (!selectedCloserId) {
      toast.warning("Selecione um Corretor (Closer)")
      return
    }

    const selectedIds = Object.keys(selectedSdrIds).filter(id => selectedSdrIds[id])
    if (selectedIds.length === 0) {
      toast.warning("Selecione pelo menos um Estagiário (SDR)")
      return
    }

    const closer = closers.find(c => c.id === selectedCloserId)
    if (!closer) {
      toast.error("Corretor inválido")
      return
    }

    setSubmitting(true)
    try {
      // For each selected SDR, send a PUT request to associate with the closer
      const promises = selectedIds.map(sdrId => {
        return fetch("/api/usuarios", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sdrId,
            padrinho_id: closer.id,
            padrinho_nome: closer.nome
          })
        })
      })

      const responses = await Promise.all(promises)
      const hasError = responses.some(r => !r.ok)

      if (hasError) {
        toast.error("Ocorreu um erro ao vincular alguns estagiários")
      } else {
        toast.success(`Célula formada com sucesso para ${closer.nome}!`)
        setSelectedCloserId("")
        setSelectedSdrIds({})
      }
      await fetchUsers()
    } catch (error) {
      console.error("Erro ao vincular células:", error)
      toast.error("Erro ao formar célula comercial")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnlink = async (sdrId: string, sdrNome: string) => {
    setActionId(sdrId)
    try {
      const res = await fetch("/api/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sdrId,
          padrinho_id: "",
          padrinho_nome: ""
        })
      })

      if (res.ok) {
        toast.success(`${sdrNome} desvinculado com sucesso!`)
        await fetchUsers()
      } else {
        toast.error("Erro ao desvincular estagiário")
      }
    } catch (error) {
      console.error("Erro ao desvincular:", error)
      toast.error("Erro de conexão ao desvincular")
    } finally {
      setActionId(null)
    }
  }

  const handleToggleSdr = (id: string) => {
    setSelectedSdrIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleDeleteCell = async (closerId: string) => {
    setActionId("delete_cell_" + closerId)
    try {
      const cellSdrs = sdrs.filter(sdr => sdr.padrinho_id === closerId)
      const promises = cellSdrs.map(sdr => {
        return fetch("/api/usuarios", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sdr.id,
            padrinho_id: "",
            padrinho_nome: ""
          })
        })
      })

      const responses = await Promise.all(promises)
      const hasError = responses.some(r => !r.ok)

      if (hasError) {
        toast.error("Ocorreu um erro ao desvincular alguns estagiários")
      } else {
        toast.success("Célula comercial excluída com sucesso!")
        setShowDeleteCellModal(null)
      }
      await fetchUsers()
    } catch (error) {
      console.error("Erro ao excluir célula:", error)
      toast.error("Erro ao excluir célula comercial")
    } finally {
      setActionId(null)
    }
  }

  const handleAddSdrToCellSubmit = async (sdrId: string, sdrNome: string) => {
    if (!showAddSdrToCell) return
    
    try {
      const res = await fetch("/api/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sdrId,
          padrinho_id: showAddSdrToCell.closerId,
          padrinho_nome: showAddSdrToCell.closerNome
        })
      })

      if (res.ok) {
        toast.success(`${sdrNome} vinculado à célula com sucesso!`)
        await fetchUsers()
      } else {
        toast.error("Erro ao vincular estagiário")
      }
    } catch (error) {
      console.error("Erro ao vincular:", error)
      toast.error("Erro de conexão")
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-slate-50 min-h-screen">
      <Header title="CÉLULAS DE VENDAS" />

      <main className="p-8 max-w-7xl mx-auto w-full space-y-8 flex-1">
        {/* Top Controls Card */}
        <Card className="card-shadow border border-slate-200 bg-white">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Formar Nova Célula Comercial</h2>
                <p className="text-xs text-slate-500">Forme equipes acoplando um ou mais estagiários (SDR) a um corretor sênior (Closer).</p>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="ml-auto h-8 w-8 text-slate-500 hover:text-slate-900"
                onClick={fetchUsers}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-xs text-slate-500">Buscando colaboradores e células...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Seleção do Corretor */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest block">
                    1. Escolha o Corretor (Closer)
                  </label>
                  <select
                    value={selectedCloserId}
                    onChange={(e) => setSelectedCloserId(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-medium focus:border-indigo-400 focus:outline-none transition-colors text-slate-900"
                  >
                    <option value="">Selecione o padrinho...</option>
                    {closers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.email})
                      </option>
                    ))}
                  </select>

                  {selectedCloserId && (
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 relative border border-indigo-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={closers.find(c => c.id === selectedCloserId)?.avatar_url || `https://picsum.photos/seed/${selectedCloserId}/100/100`} 
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-indigo-950">
                          {closers.find(c => c.id === selectedCloserId)?.nome}
                        </div>
                        <div className="text-[10px] text-indigo-600 font-medium">
                          Padrinho / Closer Ativo
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Seletor de Estagiários (SDRs) */}
                <div className="space-y-3 flex flex-col">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest block">
                    2. Selecione os Estagiários sem célula vinculada
                  </label>
                  
                  {unassignedSdrs.length === 0 ? (
                    <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2 min-h-[120px]">
                      <UserCheck className="w-6 h-6 text-slate-400" />
                      <span className="text-xs font-medium text-slate-600">Nenhum estagiário sem célula disponível</span>
                      <span className="text-[10px] text-slate-400">Todos os estagiários já estão vinculados a corretores.</span>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl bg-slate-50/50 max-h-[160px] overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
                      {unassignedSdrs.map((sdr) => {
                        const isChecked = !!selectedSdrIds[sdr.id];
                        return (
                          <label 
                            key={sdr.id} 
                            className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors pt-3 first:pt-2"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSdr(sdr.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={sdr.avatar_url || `https://picsum.photos/seed/${sdr.id}/50/50`} 
                                alt="Avatar"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-800 truncate">
                                {sdr.nome}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {sdr.email}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      onClick={handleLink}
                      disabled={submitting || !selectedCloserId || Object.values(selectedSdrIds).filter(Boolean).length === 0}
                      className="w-full h-11 bg-[#171717] hover:bg-[#2c2c2c] text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-neutral-200"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Salvando célula...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Vincular Estagiários Selecionados
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Cells Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-slate-700" />
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">Células Comerciais Ativas</h2>
            <Badge className="bg-slate-200 text-slate-800 border-none font-bold text-[10px]">
              {cells.length} {cells.length === 1 ? "Célula" : "Células"}
            </Badge>
          </div>

          {!loading && cells.length === 0 ? (
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-3">
                <Users className="w-8 h-8 text-slate-300" />
                <span className="text-sm font-semibold text-slate-800">Nenhuma célula formada ainda</span>
                <p className="text-xs text-slate-500 max-w-sm">Use o painel acima para selecionar um corretor e atribuir seus estagiários para formarem uma célula ativa.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cells.map((cell) => (
                <Card 
                  key={cell.closer.id} 
                  className="card-shadow border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col overflow-hidden"
                >
                  {/* Card Header: Closer Profile */}
                  <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 relative border-2 border-white shadow-sm flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={cell.closer.avatar_url || `https://picsum.photos/seed/${cell.closer.id}/120/120`} 
                          alt="Closer"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                          Closer / Padrinho
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {cell.closer.nome}
                        </h3>
                        <p className="text-[10px] text-slate-500 truncate">
                          {cell.closer.email}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="Excluir Célula Comercial"
                      disabled={actionId === "delete_cell_" + cell.closer.id}
                      onClick={() => setShowDeleteCellModal({ closerId: cell.closer.id, closerNome: cell.closer.nome })}
                    >
                      {actionId === "delete_cell_" + cell.closer.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Card Content: Assigned SDRs */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                          Estagiários Vinculados ({cell.sdrs.length})
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center"
                          onClick={() => setShowAddSdrToCell({ closerId: cell.closer.id, closerNome: cell.closer.nome })}
                          title="Vincular mais estagiários"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {cell.sdrs.map((sdr) => (
                          <div 
                            key={sdr.id} 
                            className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-2 group hover:bg-slate-100/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={sdr.avatar_url || `https://picsum.photos/seed/${sdr.id}/50/50`} 
                                  alt="SDR"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {sdr.nome}
                              </span>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Desvincular estagiário"
                              disabled={actionId === sdr.id}
                              onClick={() => setShowUnlinkSdrModal({ sdrId: sdr.id, sdrNome: sdr.nome })}
                            >
                              {actionId === sdr.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UserMinus className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: Confirmação de Exclusão da Célula */}
      {showDeleteCellModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center">Excluir Célula Comercial?</h3>
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Tem certeza de que deseja excluir a célula comercial de <strong className="text-slate-800">{showDeleteCellModal.closerNome}</strong>? 
                Todos os estagiários vinculados a este padrinho serão desvinculados imediatamente.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteCellModal(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => handleDeleteCell(showDeleteCellModal.closerId)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-md hover:shadow-red-100"
              >
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmação para Desvincular Único Estagiário */}
      {showUnlinkSdrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mx-auto">
                <UserMinus className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center">Desvincular Estagiário?</h3>
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Deseja realmente desvincular o estagiário <strong className="text-slate-800">{showUnlinkSdrModal.sdrNome}</strong> desta célula comercial?
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => setShowUnlinkSdrModal(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => {
                  handleUnlink(showUnlinkSdrModal.sdrId, showUnlinkSdrModal.sdrNome)
                  setShowUnlinkSdrModal(null)
                }}
                className="bg-[#171717] hover:bg-[#2c2c2c] text-white rounded-xl px-4 py-2 text-xs font-bold shadow-md hover:shadow-neutral-200"
              >
                Sim, Desvincular
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Vincular mais Estagiários à Célula */}
      {showAddSdrToCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Adicionar à Célula</h3>
                <p className="text-[10px] text-slate-500">Selecione estagiários livres para <strong className="text-slate-700">{showAddSdrToCell.closerNome}</strong></p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700"
                onClick={() => setShowAddSdrToCell(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {unassignedSdrs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Nenhum estagiário sem célula disponível.
                </div>
              ) : (
                unassignedSdrs.map(sdr => (
                  <div key={sdr.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 relative flex-shrink-0">
                        <img 
                          src={sdr.avatar_url || `https://picsum.photos/seed/${sdr.id}/50/50`} 
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate">{sdr.nome}</div>
                        <div className="text-[10px] text-slate-500 truncate">{sdr.email}</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-[#171717] hover:bg-[#2c2c2c] text-white h-8 px-3 rounded-xl text-[10px] font-bold shadow-sm"
                      onClick={() => handleAddSdrToCellSubmit(sdr.id, sdr.nome)}
                    >
                      Adicionar
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => setShowAddSdrToCell(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
