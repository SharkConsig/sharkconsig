'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { SLAConfig } from '@/lib/sla-engine'
import { Clock, Plus, Trash2, Edit2, Save, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'


export function SLAConfigManager() {
  const [configs, setConfigs] = useState<SLAConfig[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Top Form State (Add New Rule)
  const [statusCrm, setStatusCrm] = useState('')
  const [prazoHorasUteis, setPrazoHorasUteis] = useState(1)
  const [perguntaForcada, setPerguntaForcada] = useState('')
  const [faixaValorMinMargem, setFaixaValorMinMargem] = useState(20000)
  const [faixaValorMinCartao, setFaixaValorMinCartao] = useState(3000)
  const [prazoEscalonamentoHoras, setPrazoEscalonamentoHoras] = useState(1)
  const [alvoEscalonamento, setAlvoEscalonamento] = useState<'supervisao' | 'administrador' | 'supervisao_administrador'>('supervisao')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Inline Editing State for Table Rows
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null)
  const [editRowData, setEditRowData] = useState<Partial<SLAConfig>>({})
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null)

  const fetchConfigsAndStatuses = useCallback(async () => {
    setIsLoading(true)
    try {
      const [{ data: slaData, error: slaErr }, { data: statusData }] = await Promise.all([
        supabase.from('sla_config').select('*').order('created_at', { ascending: true }),
        supabase.from('status_chamados').select('nome').eq('ativo', true)
      ])

      if (slaErr) {
        console.error('Erro ao buscar sla_config do Supabase:', slaErr)
        toast.error(`Erro ao carregar regras do banco: ${slaErr.message}`)
      }

      if (slaData && slaData.length > 0) {
        setConfigs(slaData)
      } else if (slaData && slaData.length === 0) {
        // Se a busca no banco retornou 0 regras, mantém a lista vazia sem reinstalar os seeds
        setConfigs([])
      }

      if (statusData) setStatusOptions(statusData.map(s => s.nome.toUpperCase()))
    } catch (err: any) {
      console.error('Erro ao carregar configurações de SLA:', err)
      toast.error('Erro de conexão ao carregar SLA.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfigsAndStatuses()
  }, [fetchConfigsAndStatuses])

  const resetNewForm = () => {
    setStatusCrm('')
    setPrazoHorasUteis(1)
    setPerguntaForcada('')
    setFaixaValorMinMargem(20000)
    setFaixaValorMinCartao(3000)
    setPrazoEscalonamentoHoras(1)
    setAlvoEscalonamento('supervisao')
  }

  // Handle Adding New Rule
  const handleAddNewRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusCrm.trim() || !perguntaForcada.trim()) {
      toast.error('Informe a etapa/status e a pergunta forçada.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        status_crm: statusCrm.trim().toUpperCase(),
        prazo_horas_uteis: Number(prazoHorasUteis),
        pergunta_forcada: perguntaForcada.trim(),
        faixa_valor_min_margem: Number(faixaValorMinMargem),
        faixa_valor_min_cartao: Number(faixaValorMinCartao),
        prazo_escalonamento_horas: Number(prazoEscalonamentoHoras),
        alvo_escalonamento: alvoEscalonamento,
        ativo: true
      }

      const { data, error } = await supabase
        .from('sla_config')
        .upsert(payload, { onConflict: 'status_crm' })
        .select('*')

      if (error) {
        console.error('Erro ao cadastrar no banco:', error)
        toast.error(`Erro no banco: ${error.message}`)
        return
      }

      if (data && data.length > 0) {
        const saved = data[0]
        setConfigs(prev => {
          const exists = prev.some(c => c.id === saved.id || c.status_crm === saved.status_crm)
          if (exists) {
            return prev.map(c => (c.id === saved.id || c.status_crm === saved.status_crm) ? saved : c)
          }
          return [...prev, saved]
        })
        toast.success('Nova regra de SLA salva com sucesso no banco!')
        resetNewForm()
      }
    } catch (err: any) {
      console.error('Erro ao cadastrar regra de SLA:', err)
      toast.error('Erro ao salvar regra no banco.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Start Inline Editing for a Row
  const startInlineEdit = (item: SLAConfig) => {
    const key = item.id || item.status_crm
    setEditingRowKey(key)
    setEditRowData({
      id: item.id,
      status_crm: item.status_crm,
      prazo_horas_uteis: item.prazo_horas_uteis,
      pergunta_forcada: item.pergunta_forcada,
      faixa_valor_min_margem: item.faixa_valor_min_margem || 0,
      faixa_valor_min_cartao: item.faixa_valor_min_cartao || 0,
      prazo_escalonamento_horas: item.prazo_escalonamento_horas || 0,
      alvo_escalonamento: (item.alvo_escalonamento === 'supervisao_gestao' || item.alvo_escalonamento === 'supervisao_administrador') 
        ? 'supervisao_administrador' 
        : item.alvo_escalonamento === 'administrador' 
        ? 'administrador' 
        : 'supervisao',
      ativo: item.ativo ?? true
    })
  }

  // Cancel Inline Editing
  const cancelInlineEdit = () => {
    setEditingRowKey(null)
    setEditRowData({})
  }

  // Save Inline Edit for a Row
  const saveInlineEdit = async (originalItem: SLAConfig) => {
    if (!editRowData.status_crm?.trim() || !editRowData.pergunta_forcada?.trim()) {
      toast.error('Status e pergunta forçada são obrigatórios.')
      return
    }

    const payload = {
      status_crm: editRowData.status_crm.trim().toUpperCase(),
      prazo_horas_uteis: Number(editRowData.prazo_horas_uteis || 1),
      pergunta_forcada: editRowData.pergunta_forcada.trim(),
      faixa_valor_min_margem: Number(editRowData.faixa_valor_min_margem || 0),
      faixa_valor_min_cartao: Number(editRowData.faixa_valor_min_cartao || 0),
      prazo_escalonamento_horas: Number(editRowData.prazo_escalonamento_horas || 0),
      alvo_escalonamento: editRowData.alvo_escalonamento || 'supervisao',
      ativo: true,
      updated_at: new Date().toISOString()
    }

    try {
      let savedRecord: SLAConfig | null = null
      let dbError: any = null

      // 1. Tenta atualizar pelo ID único
      if (originalItem.id && !originalItem.id.startsWith('local_')) {
        const { data, error } = await supabase
          .from('sla_config')
          .update(payload)
          .eq('id', originalItem.id)
          .select('*')

        if (error) dbError = error
        if (data && data.length > 0) savedRecord = data[0]
      }

      // 2. Se não encontrou por ID, tenta por status_crm original
      if (!savedRecord && originalItem.status_crm) {
        const { data, error } = await supabase
          .from('sla_config')
          .update(payload)
          .eq('status_crm', originalItem.status_crm)
          .select('*')

        if (error) dbError = error
        if (data && data.length > 0) savedRecord = data[0]
      }

      // 3. Se ainda assim não existir, insere/upsert
      if (!savedRecord) {
        const { data, error } = await supabase
          .from('sla_config')
          .upsert(payload, { onConflict: 'status_crm' })
          .select('*')

        if (error) dbError = error
        if (data && data.length > 0) savedRecord = data[0]
      }

      if (dbError) {
        console.error('Erro ao atualizar no banco:', dbError)
        const errMsg = dbError.message || dbError.details || 'Falha na permissão ou comunicação com o banco.'
        toast.error(`Erro ao atualizar no banco: ${errMsg}`)
        return
      }

      if (!savedRecord) {
        toast.error('Nenhum registro foi alterado no banco de dados.')
        return
      }

      setConfigs(prev => prev.map(item => {
        const match = originalItem.id ? item.id === originalItem.id : item.status_crm === originalItem.status_crm
        return match ? savedRecord! : item
      }))

      toast.success('Regra de SLA atualizada com sucesso no banco!')
      cancelInlineEdit()
    } catch (err: any) {
      console.error('Erro ao salvar alteração inline:', err)
      toast.error('Erro de conexão ao atualizar regra.')
    }
  }

  // Delete a Rule
  const executeDelete = async (item: SLAConfig) => {
    try {
      let dbError: any = null

      if (item.id && !item.id.startsWith('local_')) {
        const { error } = await supabase.from('sla_config').delete().eq('id', item.id)
        dbError = error
      } else if (item.status_crm) {
        const { error } = await supabase.from('sla_config').delete().eq('status_crm', item.status_crm)
        dbError = error
      }

      if (dbError) {
        console.error('Erro Supabase ao excluir:', dbError)
        toast.error(`Erro ao excluir no banco: ${dbError.message}`)
        return
      }

      setConfigs(prev => prev.filter(c => {
        if (item.id && c.id) return c.id !== item.id
        return c.status_crm !== item.status_crm
      }))
      toast.success(`Regra "${item.status_crm}" excluída do banco com sucesso!`)
      setConfirmDeleteKey(null)

      const key = item.id || item.status_crm
      if (editingRowKey === key) {
        cancelInlineEdit()
      }
    } catch (err: any) {
      console.error('Erro ao excluir regra:', err)
      toast.error('Erro ao excluir regra do banco.')
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
      {/* Formulário de Adicionar Nova Regra */}
      <form onSubmit={handleAddNewRule} className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
        <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Cadastrar Nova Regra de SLA
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Etapa / Status</Label>
            <Input
              list="sla-status-options-list"
              value={statusCrm}
              onChange={(e) => setStatusCrm(e.target.value)}
              placeholder="Digite ou selecione a etapa/status..."
              className="h-10 bg-white border-slate-200 font-bold text-[12px] uppercase"
            />
            <datalist id="sla-status-options-list">
              {statusOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prazo Padrão (Horas Úteis)</Label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              value={prazoHorasUteis}
              onChange={(e) => setPrazoHorasUteis(Number(e.target.value))}
              className="h-10 bg-white border-slate-200 font-bold text-[12px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alvo de Escalonamento</Label>
            <select
              value={alvoEscalonamento}
              onChange={(e) => setAlvoEscalonamento(e.target.value as any)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-[12px] text-slate-700"
            >
              <option value="supervisao">Supervisor</option>
              <option value="administrador">Administrador</option>
              <option value="supervisao_administrador">Supervisor + Administrador</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pergunta Forçada ao Corretor</Label>
          <Input
            value={perguntaForcada}
            onChange={(e) => setPerguntaForcada(e.target.value)}
            placeholder="Ex: Fez o primeiro contato com o cliente?"
            className="h-10 bg-white border-slate-200 font-bold text-[12px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mínimo Margem (R$)</Label>
            <Input
              type="number"
              value={faixaValorMinMargem}
              onChange={(e) => setFaixaValorMinMargem(Number(e.target.value))}
              className="h-10 bg-white border-slate-200 font-bold text-[12px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mínimo Cartão (R$)</Label>
            <Input
              type="number"
              value={faixaValorMinCartao}
              onChange={(e) => setFaixaValorMinCartao(Number(e.target.value))}
              className="h-10 bg-white border-slate-200 font-bold text-[12px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prazo Escalonamento (Horas)</Label>
            <Input
              type="number"
              step="0.5"
              value={prazoEscalonamentoHoras}
              onChange={(e) => setPrazoEscalonamentoHoras(Number(e.target.value))}
              className="h-10 bg-white border-slate-200 font-bold text-[12px]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button type="submit" disabled={isSubmitting} className="h-9 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold uppercase">
            <Plus className="w-4 h-4 mr-1" /> Adicionar Regra
          </Button>
        </div>
      </form>

      {/* Tabela de Regras */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              <th className="p-3">Etapa / Status</th>
              <th className="p-3 min-w-[110px]">Prazo Padrão</th>
              <th className="p-3">Pergunta Forçada</th>
              <th className="p-3 min-w-[240px]">Escalonamento por Valor</th>
              <th className="p-3 min-w-[160px]">Alvo</th>
              <th className="p-3 text-right min-w-[100px]">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[12px] font-semibold text-slate-700">
            {configs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                  Nenhuma regra de SLA cadastrada.
                </td>
              </tr>
            ) : (
              configs.map((c) => {
                const rowKey = c.id || c.status_crm
                const isEditingThisRow = editingRowKey === rowKey

                if (isEditingThisRow) {
                  return (
                    <tr key={rowKey} className="bg-amber-50/60 border-l-4 border-l-amber-500">
                      {/* Status Input */}
                      <td className="p-2">
                        <Input
                          list="sla-status-options-list"
                          value={editRowData.status_crm || ''}
                          onChange={(e) => setEditRowData(prev => ({ ...prev, status_crm: e.target.value }))}
                          className="h-8 bg-white border-amber-300 font-extrabold text-[11px] uppercase"
                        />
                      </td>
                      {/* Prazo Horas Uteis Input */}
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.5"
                            value={editRowData.prazo_horas_uteis ?? 1}
                            onChange={(e) => setEditRowData(prev => ({ ...prev, prazo_horas_uteis: Number(e.target.value) }))}
                            className="h-8 bg-white border-amber-300 font-bold text-[11px] w-20"
                          />
                          <span className="text-[10px] text-slate-500 font-bold">h úteis</span>
                        </div>
                      </td>
                      {/* Pergunta Forçada Input */}
                      <td className="p-2">
                        <Input
                          value={editRowData.pergunta_forcada || ''}
                          onChange={(e) => setEditRowData(prev => ({ ...prev, pergunta_forcada: e.target.value }))}
                          className="h-8 bg-white border-amber-300 font-medium text-[11px]"
                        />
                      </td>
                      {/* Escalonamento por Valor Inputs */}
                      <td className="p-2">
                        <div className="grid grid-cols-3 gap-1 text-[10px]">
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold">Margem ≥ R$</span>
                            <Input
                              type="number"
                              value={editRowData.faixa_valor_min_margem ?? 0}
                              onChange={(e) => setEditRowData(prev => ({ ...prev, faixa_valor_min_margem: Number(e.target.value) }))}
                              className="h-7 bg-white border-amber-300 text-[10px] px-1.5"
                            />
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold">Cartão ≥ R$</span>
                            <Input
                              type="number"
                              value={editRowData.faixa_valor_min_cartao ?? 0}
                              onChange={(e) => setEditRowData(prev => ({ ...prev, faixa_valor_min_cartao: Number(e.target.value) }))}
                              className="h-7 bg-white border-amber-300 text-[10px] px-1.5"
                            />
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold">Prazo (h)</span>
                            <Input
                              type="number"
                              step="0.5"
                              value={editRowData.prazo_escalonamento_horas ?? 0}
                              onChange={(e) => setEditRowData(prev => ({ ...prev, prazo_escalonamento_horas: Number(e.target.value) }))}
                              className="h-7 bg-white border-amber-300 text-[10px] px-1.5"
                            />
                          </div>
                        </div>
                      </td>
                      {/* Alvo Escalonamento Select */}
                      <td className="p-2">
                        <select
                          value={editRowData.alvo_escalonamento || 'supervisao'}
                          onChange={(e) => setEditRowData(prev => ({ ...prev, alvo_escalonamento: e.target.value as any }))}
                          className="h-8 px-2 bg-white border border-amber-300 rounded-lg text-[10px] font-extrabold text-slate-800 uppercase w-full"
                        >
                          <option value="supervisao">Supervisor</option>
                          <option value="administrador">Administrador</option>
                          <option value="supervisao_administrador">Supervisor + Administrador</option>
                        </select>
                      </td>
                      {/* Actions Buttons */}
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => saveInlineEdit(c)}
                            title="Salvar alterações"
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelInlineEdit}
                            title="Cancelar edição"
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={rowKey} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-3 font-extrabold text-slate-900 uppercase">
                      {c.status_crm}
                    </td>
                    <td className="p-3 font-bold text-amber-600">{c.prazo_horas_uteis}h úteis</td>
                    <td className="p-3 max-w-[250px] truncate text-slate-600 font-medium">"{c.pergunta_forcada}"</td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      Margem ≥ R${c.faixa_valor_min_margem?.toLocaleString('pt-BR')} / Cartão ≥ R${c.faixa_valor_min_cartao?.toLocaleString('pt-BR')} ({c.prazo_escalonamento_horas}h)
                    </td>
                    <td className="p-3 uppercase text-[10px] font-extrabold text-slate-800">
                      {c.alvo_escalonamento === 'supervisao_administrador' || c.alvo_escalonamento === 'supervisao_gestao'
                        ? 'Supervisor + Administrador'
                        : c.alvo_escalonamento === 'administrador'
                        ? 'Administrador'
                        : 'Supervisor'}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      {confirmDeleteKey === rowKey ? (
                        <div className="flex items-center justify-end gap-1.5 animate-fadeIn">
                          <span className="text-[10px] font-extrabold text-rose-600 uppercase">Excluir?</span>
                          <button
                            type="button"
                            onClick={() => executeDelete(c)}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-extrabold uppercase shadow-sm transition-colors"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteKey(null)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-extrabold uppercase transition-colors"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteKey(null)
                              startInlineEdit(c)
                            }}
                            title="Editar regra inline"
                            className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              cancelInlineEdit()
                              setConfirmDeleteKey(rowKey)
                            }}
                            title="Excluir regra"
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

