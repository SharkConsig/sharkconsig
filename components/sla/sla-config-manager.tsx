'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { SLAConfig, parsePerguntaForcadaMeta, encodePerguntaForcadaMeta } from '@/lib/sla-engine'
import { Clock, Plus, Trash2, Edit2, Save, X, Check, Power, Calendar, Filter, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ColaboradorItem {
  id: string
  nome: string
  email: string
  avatar_url?: string
  funcao?: string
}


export function formatPrazo(horas?: number | null): string {
  if (horas == null || isNaN(horas) || horas <= 0) return '0 min'
  if (horas < 1) {
    const mins = Math.round(horas * 60)
    return `${mins} min`
  }
  const h = Math.floor(horas)
  const m = Math.round((horas - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export function SLAConfigManager() {
  const [configs, setConfigs] = useState<SLAConfig[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSlaGlobalActive, setIsSlaGlobalActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('sla_global_active')
      if (cached !== null) return cached === 'true'
    }
    return true
  })
  const [tipoPeriodo, setTipoPeriodo] = useState<'todos' | '7d' | '15d' | '30d' | '60d' | '90d' | 'a_partir_de' | 'intervalo'>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('sla_global_period')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (parsed.tipo_periodo) return parsed.tipo_periodo
        } catch (e) {}
      }
    }
    return '30d'
  })
  const [dataInicio, setDataInicio] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('sla_global_period')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (parsed.data_inicio) return parsed.data_inicio
        } catch (e) {}
      }
    }
    return ''
  })
  const [dataFim, setDataFim] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('sla_global_period')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (parsed.data_fim) return parsed.data_fim
        } catch (e) {}
      }
    }
    return ''
  })

  // Collaborator selection state
  const [colaboradoresList, setColaboradoresList] = useState<ColaboradorItem[]>([])
  const [selectedColaboradorIds, setSelectedColaboradorIds] = useState<Record<string, boolean>>({})
  const [searchColaborador, setSearchColaborador] = useState('')

  // Top Form State (Add New Rule)
  const [statusCrm, setStatusCrm] = useState('')
  const [prazoHorasUteis, setPrazoHorasUteis] = useState(1)
  const [unidadePrazo, setUnidadePrazo] = useState<'h' | 'min'>('h')
  const [perguntaForcada, setPerguntaForcada] = useState('')
  const [pergunta2Forcada, setPergunta2Forcada] = useState('')
  const [prazo2Horas, setPrazo2Horas] = useState(0)
  const [unidadePrazo2, setUnidadePrazo2] = useState<'h' | 'min'>('h')
  const [prazoFaixa1Horas, setPrazoFaixa1Horas] = useState(36)
  const [unidadeFaixa1, setUnidadeFaixa1] = useState<'h' | 'min'>('h')
  const [prazoFaixa2Horas, setPrazoFaixa2Horas] = useState(20)
  const [unidadeFaixa2, setUnidadeFaixa2] = useState<'h' | 'min'>('h')
  const [prazoFaixa3Horas, setPrazoFaixa3Horas] = useState(12)
  const [unidadeFaixa3, setUnidadeFaixa3] = useState<'h' | 'min'>('h')
  const [faixa2MinMargem, setFaixa2MinMargem] = useState<number | ''>(30000)
  const [faixa2MinCartao, setFaixa2MinCartao] = useState<number | ''>(5000)
  const [faixa3MinMargem, setFaixa3MinMargem] = useState<number | ''>(50000)
  const [faixa3MinCartao, setFaixa3MinCartao] = useState<number | ''>(10000)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Inline Editing State for Table Rows
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null)
  const [editRowData, setEditRowData] = useState<Partial<SLAConfig>>({})
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null)

  const fetchConfigsAndStatuses = useCallback(async () => {
    setIsLoading(true)
    try {
      const [{ data: slaData, error: slaErr }, { data: statusData }, usersRes] = await Promise.all([
        supabase.from('sla_config').select('*').order('created_at', { ascending: true }),
        supabase.from('status_chamados').select('nome').eq('ativo', true),
        fetch('/api/usuarios').catch(() => null)
      ])

      let loadedUsers: ColaboradorItem[] = []
      if (usersRes && usersRes.ok) {
        const uData = await usersRes.json()
        if (Array.isArray(uData)) {
          const allowedFuncoes = ['corretor', 'estágio', 'estagio', 'estagiário', 'estagiario', 'supervisor']
          loadedUsers = uData
            .filter((u: any) => {
              // Apenas colaboradores ativos
              const isAtivo = (u.status || 'ATIVO').trim().toUpperCase() === 'ATIVO'
              if (!isAtivo) return false

              const func = (u.funcao || 'Corretor').trim().toLowerCase()
              const normFunc = func.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              return allowedFuncoes.includes(func) || normFunc.includes('corretor') || normFunc.includes('estag') || normFunc.includes('supervisor')
            })
            .map((u: any) => ({
              id: u.id,
              nome: u.nome || u.email || 'Sem Nome',
              email: u.email || '',
              avatar_url: u.avatar_url,
              funcao: u.funcao || 'Corretor'
            }))
          setColaboradoresList(loadedUsers)
        }
      }

      if (slaErr) {
        console.error('Erro ao buscar sla_config do Supabase:', slaErr)
        toast.error(`Erro ao carregar regras do banco: ${slaErr.message}`)
      }

      if (slaData && slaData.length > 0) {
        const globalSetting = slaData.find(item => item.status_crm?.trim().toUpperCase() === '__GLOBAL_SETTINGS__')
        let savedColabs: string[] = []
        if (globalSetting) {
          const globalActive = globalSetting.ativo !== false
          setIsSlaGlobalActive(globalActive)

          if (globalSetting.pergunta_forcada && globalSetting.pergunta_forcada.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(globalSetting.pergunta_forcada)
              if (parsed.tipo_periodo) setTipoPeriodo(parsed.tipo_periodo)
              if (parsed.data_inicio) setDataInicio(parsed.data_inicio)
              if (parsed.data_fim) setDataFim(parsed.data_fim)
              if (Array.isArray(parsed.colaboradores)) savedColabs = parsed.colaboradores
            } catch (e) {}
          } else if (typeof window !== 'undefined') {
            const localPeriod = localStorage.getItem('sla_global_period')
            if (localPeriod) {
              try {
                const parsed = JSON.parse(localPeriod)
                if (parsed.tipo_periodo) setTipoPeriodo(parsed.tipo_periodo)
                if (parsed.data_inicio) setDataInicio(parsed.data_inicio)
                if (parsed.data_fim) setDataFim(parsed.data_fim)
                if (Array.isArray(parsed.colaboradores)) savedColabs = parsed.colaboradores
              } catch (e) {}
            }
          }

          if (typeof window !== 'undefined') {
            localStorage.setItem('sla_global_active', String(globalActive))
          }
        }

        const map: Record<string, boolean> = {}
        if (savedColabs.length > 0 && !savedColabs.includes('todos')) {
          savedColabs.forEach(id => { map[id] = true })
        } else {
          loadedUsers.forEach(u => { map[u.id] = true })
        }
        setSelectedColaboradorIds(map)

        const filteredSlaData = slaData.filter(item => item.status_crm?.trim().toUpperCase() !== '__GLOBAL_SETTINGS__')

        const parsed = filteredSlaData.map(item => {
          const meta = parsePerguntaForcadaMeta(item.pergunta_forcada || '')
          const rawF2Margem = item.faixa2_min_margem ?? item.faixa_valor_min_margem
          const rawF2Cartao = item.faixa2_min_cartao ?? item.faixa_valor_min_cartao
          const rawF3Margem = item.faixa3_min_margem
          const rawF3Cartao = item.faixa3_min_cartao

          return {
            ...item,
            faixa2_min_margem: (rawF2Margem && Number(rawF2Margem) > 0) ? Number(rawF2Margem) : null,
            faixa2_min_cartao: (rawF2Cartao && Number(rawF2Cartao) > 0) ? Number(rawF2Cartao) : null,
            faixa3_min_margem: (rawF3Margem && Number(rawF3Margem) > 0) ? Number(rawF3Margem) : null,
            faixa3_min_cartao: (rawF3Cartao && Number(rawF3Cartao) > 0) ? Number(rawF3Cartao) : null,
            pergunta_forcada: meta.cleanPergunta || item.pergunta_forcada,
            pergunta2_forcada: item.pergunta2_forcada || meta.pergunta2 || '',
            prazo2_horas: item.prazo2_horas ?? meta.prazo2Horas ?? 0
          }
        })
        setConfigs(parsed)
      } else if (slaData && slaData.length === 0) {
        setConfigs([])
      }

      if (statusData) {
        const options = Array.from(new Set(['APROVADOS', ...statusData.map(s => s.nome.toUpperCase())]))
        setStatusOptions(options)
      } else {
        setStatusOptions(['APROVADOS'])
      }
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

  const toggleGlobalSLA = async (nextState: boolean) => {
    await saveGlobalSettings(nextState, tipoPeriodo, dataInicio, dataFim, selectedColaboradorIds)
  }

  const saveGlobalSettings = async (
    nextActive?: boolean,
    nextTipoPeriodo?: string,
    nextDataInicio?: string,
    nextDataFim?: string,
    nextColabsMap?: Record<string, boolean>
  ) => {
    setIsSubmitting(true)
    const active = nextActive !== undefined ? nextActive : isSlaGlobalActive
    const pTipo = nextTipoPeriodo !== undefined ? nextTipoPeriodo : tipoPeriodo
    const pInicio = nextDataInicio !== undefined ? nextDataInicio : dataInicio
    const pFim = nextDataFim !== undefined ? nextDataFim : dataFim
    const pColabMap = nextColabsMap !== undefined ? nextColabsMap : selectedColaboradorIds

    const activeColabIds = Object.keys(pColabMap).filter(id => pColabMap[id])
    const totalUsers = colaboradoresList.length
    const finalColabArray = (totalUsers > 0 && activeColabIds.length === totalUsers)
      ? ['todos']
      : (activeColabIds.length === 0 ? ['none'] : activeColabIds)

    const payloadMeta = JSON.stringify({
      tipo_periodo: pTipo,
      data_inicio: pInicio,
      data_fim: pFim,
      colaboradores: finalColabArray
    })

    try {
      const payload = {
        status_crm: '__GLOBAL_SETTINGS__',
        prazo_horas_uteis: 0,
        pergunta_forcada: payloadMeta,
        ativo: active,
        updated_at: new Date().toISOString()
      }
      const { error } = await supabase.from('sla_config').upsert(payload, { onConflict: 'status_crm' })
      if (error) {
        console.error('Erro ao atualizar chave global SLA:', error)
        toast.error(`Erro ao salvar no banco: ${error.message}`)
        return
      }

      setIsSlaGlobalActive(active)
      setTipoPeriodo(pTipo as any)
      setDataInicio(pInicio)
      setDataFim(pFim)
      setSelectedColaboradorIds(pColabMap)

      if (typeof window !== 'undefined') {
        localStorage.setItem('sla_global_active', String(active))
        localStorage.setItem('sla_global_period', payloadMeta)
      }

      if (nextActive !== undefined && nextActive !== isSlaGlobalActive) {
        if (nextActive) {
          toast.success('Motor de SLA e Gatilhos de Cobrança ATIVADOS com sucesso!')
        } else {
          toast.warning('Motor de SLA e Gatilhos de Cobrança DESATIVADOS globalmente.')
        }
      } else {
        toast.success('Configurações globais do SLA salvas com sucesso!')
      }
    } catch (err: any) {
      console.error('Erro ao alterar configurações de SLA:', err)
      toast.error('Erro de conexão ao alterar configurações de SLA.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleColaborador = (id: string) => {
    const updated = { ...selectedColaboradorIds, [id]: !selectedColaboradorIds[id] }
    setSelectedColaboradorIds(updated)
  }

  const handleToggleSelectAllColaboradores = () => {
    const activeCount = Object.keys(selectedColaboradorIds).filter(id => selectedColaboradorIds[id]).length
    const allSelected = activeCount === colaboradoresList.length && colaboradoresList.length > 0
    const updated: Record<string, boolean> = {}
    if (!allSelected) {
      colaboradoresList.forEach(c => { updated[c.id] = true })
    }
    setSelectedColaboradorIds(updated)
  }

  const filteredColaboradores = colaboradoresList.filter(c =>
    c.nome.toLowerCase().includes(searchColaborador.toLowerCase()) ||
    c.email.toLowerCase().includes(searchColaborador.toLowerCase()) ||
    (c.funcao && c.funcao.toLowerCase().includes(searchColaborador.toLowerCase()))
  )

  const selectedColabCount = Object.keys(selectedColaboradorIds).filter(id => selectedColaboradorIds[id]).length
  const isAllColaboradoresSelected = selectedColabCount === colaboradoresList.length && colaboradoresList.length > 0

  const resetNewForm = () => {
    setStatusCrm('')
    setPrazoHorasUteis(1)
    setUnidadePrazo('h')
    setPerguntaForcada('')
    setPergunta2Forcada('')
    setPrazo2Horas(0)
    setUnidadePrazo2('h')
    setPrazoFaixa1Horas(36)
    setUnidadeFaixa1('h')
    setPrazoFaixa2Horas(20)
    setUnidadeFaixa2('h')
    setPrazoFaixa3Horas(12)
    setUnidadeFaixa3('h')
    setFaixa2MinMargem(30000)
    setFaixa2MinCartao(5000)
    setFaixa3MinMargem(50000)
    setFaixa3MinCartao(10000)
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
      const isNegociacao = statusCrm.trim().toUpperCase() === 'EM NEGOCIAÇÃO'
      const f2MargemVal = faixa2MinMargem !== '' && Number(faixa2MinMargem) > 0 ? Number(faixa2MinMargem) : null
      const f2CartaoVal = faixa2MinCartao !== '' && Number(faixa2MinCartao) > 0 ? Number(faixa2MinCartao) : null
      const f3MargemVal = faixa3MinMargem !== '' && Number(faixa3MinMargem) > 0 ? Number(faixa3MinMargem) : null
      const f3CartaoVal = faixa3MinCartao !== '' && Number(faixa3MinCartao) > 0 ? Number(faixa3MinCartao) : null

      const toHours = (val: number, unit: 'h' | 'min') => unit === 'min' ? Number(val) / 60 : Number(val)

      const finalPrazoMain = isNegociacao ? toHours(prazoFaixa1Horas, unidadeFaixa1) : toHours(prazoHorasUteis, unidadePrazo)
      const finalPrazo2 = toHours(prazo2Horas, unidadePrazo2)
      const finalF1 = toHours(prazoFaixa1Horas, unidadeFaixa1)
      const finalF2 = toHours(prazoFaixa2Horas, unidadeFaixa2)
      const finalF3 = toHours(prazoFaixa3Horas, unidadeFaixa3)

      const encodedPergunta = encodePerguntaForcadaMeta(
        perguntaForcada,
        f3MargemVal || 0,
        f3CartaoVal || 0,
        pergunta2Forcada,
        finalPrazo2
      )

      const fullPayload: Record<string, any> = {
        status_crm: statusCrm.trim().toUpperCase(),
        prazo_horas_uteis: finalPrazoMain,
        pergunta_forcada: encodedPergunta,
        pergunta2_forcada: pergunta2Forcada.trim() || null,
        prazo2_horas: finalPrazo2 || null,
        faixa_valor_min_margem: f2MargemVal,
        faixa_valor_min_cartao: f2CartaoVal,
        faixa3_min_margem: f3MargemVal,
        faixa3_min_cartao: f3CartaoVal,
        prazo_faixa1_horas: isNegociacao ? finalF1 : undefined,
        prazo_faixa2_horas: isNegociacao ? finalF2 : undefined,
        prazo_faixa3_horas: isNegociacao ? finalF3 : undefined,
        ativo: true
      }

      let { data, error } = await supabase
        .from('sla_config')
        .upsert(fullPayload, { onConflict: 'status_crm' })
        .select('*')

      if (error && error.message?.includes('schema cache')) {
        // Fallback without new columns if table has not been altered in Supabase yet
        const legacyPayload = {
          status_crm: statusCrm.trim().toUpperCase(),
          prazo_horas_uteis: finalPrazoMain,
          pergunta_forcada: encodedPergunta,
          faixa_valor_min_margem: f2MargemVal,
          faixa_valor_min_cartao: f2CartaoVal,
          prazo_faixa1_horas: isNegociacao ? finalF1 : undefined,
          prazo_faixa2_horas: isNegociacao ? finalF2 : undefined,
          prazo_faixa3_horas: isNegociacao ? finalF3 : undefined,
          ativo: true
        }
        const retry = await supabase
          .from('sla_config')
          .upsert(legacyPayload, { onConflict: 'status_crm' })
          .select('*')
        data = retry.data
        error = retry.error
      }

      if (error) {
        console.error('Erro ao cadastrar no banco:', error)
        toast.error(`Erro no banco: ${error.message}`)
        return
      }

      if (data && data.length > 0) {
        const saved = data[0]
        const meta = parsePerguntaForcadaMeta(saved.pergunta_forcada || '')
        const parsedSaved = {
          ...saved,
          faixa2_min_margem: f2MargemVal,
          faixa2_min_cartao: f2CartaoVal,
          faixa3_min_margem: f3MargemVal,
          faixa3_min_cartao: f3CartaoVal,
          pergunta_forcada: meta.cleanPergunta || perguntaForcada.trim(),
          pergunta2_forcada: saved.pergunta2_forcada || meta.pergunta2 || pergunta2Forcada.trim(),
          prazo2_horas: saved.prazo2_horas ?? meta.prazo2Horas ?? Number(prazo2Horas)
        }

        setConfigs(prev => {
          const exists = prev.some(c => c.id === saved.id || c.status_crm === saved.status_crm)
          if (exists) {
            return prev.map(c => (c.id === saved.id || c.status_crm === saved.status_crm) ? parsedSaved : c)
          }
          return [...prev, parsedSaved]
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
    const meta = parsePerguntaForcadaMeta(item.pergunta_forcada || '')

    const parseUnit = (val?: number | null) => {
      if (val != null && val > 0 && val < 1) {
        return { val: Math.round(val * 60), unit: 'min' as const }
      }
      return { val: val ?? 0, unit: 'h' as const }
    }

    const pMain = parseUnit(item.prazo_horas_uteis)
    const p2 = parseUnit(meta.prazo2Horas || (item as any).prazo2_horas)
    const pf1 = parseUnit(item.prazo_faixa1_horas ?? item.prazo_horas_uteis)
    const pf2 = parseUnit(item.prazo_faixa2_horas)
    const pf3 = parseUnit(item.prazo_faixa3_horas)

    setEditingRowKey(key)
    setEditRowData({
      id: item.id,
      status_crm: item.status_crm,
      prazo_horas_uteis: pMain.val || 1,
      _unit_prazo: pMain.unit,
      pergunta_forcada: meta.cleanPergunta || item.pergunta_forcada,
      pergunta2_forcada: meta.pergunta2 || (item as any).pergunta2_forcada || '',
      prazo2_horas: p2.val,
      _unit_prazo2: p2.unit,
      prazo_faixa1_horas: pf1.val || 36,
      _unit_f1: pf1.unit,
      prazo_faixa2_horas: pf2.val || 20,
      _unit_f2: pf2.unit,
      prazo_faixa3_horas: pf3.val || 12,
      _unit_f3: pf3.unit,
      faixa2_min_margem: (item.faixa2_min_margem || item.faixa_valor_min_margem) ? Number(item.faixa2_min_margem ?? item.faixa_valor_min_margem) : null,
      faixa2_min_cartao: (item.faixa2_min_cartao || item.faixa_valor_min_cartao) ? Number(item.faixa2_min_cartao ?? item.faixa_valor_min_cartao) : null,
      faixa3_min_margem: item.faixa3_min_margem ? Number(item.faixa3_min_margem) : null,
      faixa3_min_cartao: item.faixa3_min_cartao ? Number(item.faixa3_min_cartao) : null,
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

    const isNegociacao = editRowData.status_crm.trim().toUpperCase() === 'EM NEGOCIAÇÃO'
    const f2MargemVal = editRowData.faixa2_min_margem && Number(editRowData.faixa2_min_margem) > 0 ? Number(editRowData.faixa2_min_margem) : null
    const f2CartaoVal = editRowData.faixa2_min_cartao && Number(editRowData.faixa2_min_cartao) > 0 ? Number(editRowData.faixa2_min_cartao) : null
    const f3MargemVal = editRowData.faixa3_min_margem && Number(editRowData.faixa3_min_margem) > 0 ? Number(editRowData.faixa3_min_margem) : null
    const f3CartaoVal = editRowData.faixa3_min_cartao && Number(editRowData.faixa3_min_cartao) > 0 ? Number(editRowData.faixa3_min_cartao) : null

    const toH = (val: any, unit: any) => {
      const num = Number(val) || 0
      return unit === 'min' ? num / 60 : num
    }

    const finalPrazoMain = toH(editRowData.prazo_horas_uteis, (editRowData as any)._unit_prazo)
    const finalPrazo2 = toH((editRowData as any).prazo2_horas, (editRowData as any)._unit_prazo2)
    const finalF1 = toH(editRowData.prazo_faixa1_horas, (editRowData as any)._unit_f1)
    const finalF2 = toH(editRowData.prazo_faixa2_horas, (editRowData as any)._unit_f2)
    const finalF3 = toH(editRowData.prazo_faixa3_horas, (editRowData as any)._unit_f3)

    const encodedPergunta = encodePerguntaForcadaMeta(
      editRowData.pergunta_forcada,
      f3MargemVal || 0,
      f3CartaoVal || 0,
      (editRowData as any).pergunta2_forcada,
      finalPrazo2
    )

    const payload: Record<string, any> = {
      status_crm: editRowData.status_crm.trim().toUpperCase(),
      prazo_horas_uteis: isNegociacao ? (finalF1 || 36) : (finalPrazoMain || 1),
      pergunta_forcada: encodedPergunta,
      pergunta2_forcada: (editRowData as any).pergunta2_forcada?.trim() || null,
      prazo2_horas: finalPrazo2 || null,
      faixa_valor_min_margem: f2MargemVal,
      faixa_valor_min_cartao: f2CartaoVal,
      faixa3_min_margem: f3MargemVal,
      faixa3_min_cartao: f3CartaoVal,
      prazo_faixa1_horas: isNegociacao ? (finalF1 || 36) : undefined,
      prazo_faixa2_horas: isNegociacao ? (finalF2 || 20) : undefined,
      prazo_faixa3_horas: isNegociacao ? (finalF3 || 12) : undefined,
      ativo: true,
      updated_at: new Date().toISOString()
    }

    try {
      let savedRecord: SLAConfig | null = null
      let dbError: any = null

      const runUpdate = async (p: Record<string, any>) => {
        if (originalItem.id && !originalItem.id.startsWith('local_')) {
          return await supabase
            .from('sla_config')
            .update(p)
            .eq('id', originalItem.id)
            .select('*')
        }
        return await supabase
          .from('sla_config')
          .upsert(p, { onConflict: 'status_crm' })
          .select('*')
      }

      let res = await runUpdate(payload)
      if (res.error && res.error.message?.includes('schema cache')) {
        const legacyPayload = { ...payload }
        delete legacyPayload.faixa3_min_margem
        delete legacyPayload.faixa3_min_cartao
        res = await runUpdate(legacyPayload)
      }

      dbError = res.error
      if (res.data && res.data.length > 0) savedRecord = res.data[0]

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

      const meta = parsePerguntaForcadaMeta(savedRecord.pergunta_forcada || '')
      const parsedSaved: SLAConfig = {
        ...savedRecord,
        faixa2_min_margem: f2MargemVal,
        faixa2_min_cartao: f2CartaoVal,
        faixa3_min_margem: f3MargemVal,
        faixa3_min_cartao: f3CartaoVal,
        pergunta_forcada: meta.cleanPergunta || editRowData.pergunta_forcada!.trim()
      }

      setConfigs(prev => prev.map(item => {
        const match = originalItem.id ? item.id === originalItem.id : item.status_crm === originalItem.status_crm
        return match ? parsedSaved : item
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
      {/* Grid: Chave Mestra & Seleção de Colaboradores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (col-span-7): Chave Mestra + Filtro de Período */}
        <div className={`lg:col-span-7 p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
          isSlaGlobalActive
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-rose-50/80 border-rose-200 shadow-sm'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-3">
              <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
                isSlaGlobalActive ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                <Power className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Chave Mestra do SLA & Cobranças
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                    isSlaGlobalActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isSlaGlobalActive ? '● SISTEMA ATIVO' : '○ SISTEMA DESATIVADO'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {isSlaGlobalActive
                    ? 'O motor de SLA está rodando normalmente.'
                    : 'O motor de SLA está globalmente desativado.'}
                </p>
              </div>
            </div>
          </div>

          {/* Seletor de Período de Atuação do SLA e Botão de Ativação */}
          <div className="pt-4 border-t border-slate-200/80 flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-700" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
                  Filtro de Período dos Chamados
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium italic pl-6">
                Evita travamentos e pop-ups em massa aplicando regras apenas aos chamados do período selecionado
              </span>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3 w-full">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1 min-w-[190px]">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Período de Atuação</Label>
                  <select
                    value={tipoPeriodo}
                    onChange={(e) => {
                      const val = e.target.value as any
                      setTipoPeriodo(val)
                      saveGlobalSettings(isSlaGlobalActive, val, dataInicio, dataFim, selectedColaboradorIds)
                    }}
                    disabled={isSubmitting}
                    className="h-9 bg-white border border-slate-200 text-[11px] font-bold rounded-lg px-2 text-slate-800 cursor-pointer focus:outline-none focus:border-primary shadow-2xs"
                  >
                    <option value="30d">Últimos 30 dias (Recomendado)</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="15d">Últimos 15 dias</option>
                    <option value="60d">Últimos 60 dias</option>
                    <option value="90d">Últimos 90 dias</option>
                    <option value="a_partir_de">A partir de data específica</option>
                    <option value="intervalo">Intervalo personalizado (Início e Fim)</option>
                    <option value="todos">Todos os chamados (Sem filtro)</option>
                  </select>
                </div>

                {(tipoPeriodo === 'a_partir_de' || tipoPeriodo === 'intervalo') && (
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Inicial</Label>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      onBlur={() => saveGlobalSettings(isSlaGlobalActive, tipoPeriodo, dataInicio, dataFim, selectedColaboradorIds)}
                      className="h-9 bg-white border-slate-200 text-[11px] font-bold text-slate-800 w-32 shadow-2xs"
                    />
                  </div>
                )}

                {tipoPeriodo === 'intervalo' && (
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Final</Label>
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      onBlur={() => saveGlobalSettings(isSlaGlobalActive, tipoPeriodo, dataInicio, dataFim, selectedColaboradorIds)}
                      className="h-9 bg-white border-slate-200 text-[11px] font-bold text-slate-800 w-32 shadow-2xs"
                    />
                  </div>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveGlobalSettings(isSlaGlobalActive, tipoPeriodo, dataInicio, dataFim, selectedColaboradorIds)}
                  disabled={isSubmitting}
                  className="h-9 px-3 text-[10px] font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Salvar
                </Button>
              </div>

              <Button
                type="button"
                onClick={() => toggleGlobalSLA(!isSlaGlobalActive)}
                disabled={isSubmitting}
                className={`font-bold text-[10px] h-9 px-3 transition-all shadow-2xs rounded-lg ml-auto ${
                  isSlaGlobalActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Power className="w-3.5 h-3.5 mr-1" />
                {isSlaGlobalActive ? 'DESATIVAR SLA' : 'ATIVAR SLA'}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column (col-span-5): Seleção de Colaboradores */}
        <div className="lg:col-span-5 p-5 rounded-2xl border border-slate-200 bg-slate-50/80 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
                  SELECIONE OS COLABORADORES
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleSelectAllColaboradores}
                className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide cursor-pointer"
              >
                {isAllColaboradoresSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
            <span className="text-[10px] text-slate-500 font-medium italic">
              SLA e cobranças atuarão apenas nos chamados dos colaboradores marcados
            </span>
          </div>

          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <Input
              type="text"
              placeholder="Buscar colaborador por nome ou e-mail..."
              value={searchColaborador}
              onChange={(e) => setSearchColaborador(e.target.value)}
              className="h-8 text-[11px] bg-white border-slate-200 shadow-2xs"
            />

            <div className="border border-slate-200 rounded-xl bg-white max-h-[160px] overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 flex-1">
              {filteredColaboradores.length === 0 ? (
                <div className="p-4 text-center text-[11px] text-slate-400 font-semibold">
                  Nenhum colaborador encontrado
                </div>
              ) : (
                filteredColaboradores.map((colab) => {
                  const isChecked = !!selectedColaboradorIds[colab.id]
                  return (
                    <label
                      key={colab.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors pt-2 first:pt-1"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleColaborador(colab.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 shrink-0 relative">
                        <img
                          src={colab.avatar_url || `https://picsum.photos/seed/${colab.id}/50/50`}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-slate-800 truncate">{colab.nome}</p>
                          {colab.funcao && (
                            <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {colab.funcao}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">{colab.email}</p>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-bold text-slate-500">
              {selectedColabCount} de {colaboradoresList.length} selecionado(s)
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => saveGlobalSettings(isSlaGlobalActive, tipoPeriodo, dataInicio, dataFim, selectedColaboradorIds)}
              disabled={isSubmitting}
              className="h-8 px-3 text-[10px] font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-2xs"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Salvar Colaboradores
            </Button>
          </div>
        </div>
      </div>

      {/* Formulário de Adicionar Nova Regra */}
      <form onSubmit={handleAddNewRule} className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
        <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Cadastrar Nova Regra de SLA
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pergunta Forçada (1ª Etapa)</Label>
            <Input
              value={perguntaForcada}
              onChange={(e) => setPerguntaForcada(e.target.value)}
              placeholder="Ex: Fez o primeiro contato com o cliente?"
              className="h-10 bg-white border-slate-200 font-bold text-[12px]"
            />
          </div>
        </div>

        {statusCrm.trim().toUpperCase() === 'EM NEGOCIAÇÃO' ? (
          <div className="bg-cyan-50/60 border border-cyan-200/60 p-4 rounded-xl space-y-2">
            <div className="text-[11px] font-extrabold text-cyan-800 uppercase tracking-wider">
              Prazos Padrão por Faixa de Valor (EM NEGOCIAÇÃO)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Faixa 1 (&lt; Faixa 2)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={prazoFaixa1Horas}
                    onChange={(e) => setPrazoFaixa1Horas(Number(e.target.value))}
                    className="h-10 bg-white border-slate-200 font-bold text-[12px]"
                  />
                  <select
                    value={unidadeFaixa1}
                    onChange={(e) => setUnidadeFaixa1(e.target.value as 'h' | 'min')}
                    className="h-10 bg-white border border-slate-200 text-[11px] font-bold rounded-md px-1.5 cursor-pointer"
                  >
                    <option value="h">h úteis</option>
                    <option value="min">min úteis</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Faixa 2 (Até Faixa 3)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={prazoFaixa2Horas}
                    onChange={(e) => setPrazoFaixa2Horas(Number(e.target.value))}
                    className="h-10 bg-white border-slate-200 font-bold text-[12px]"
                  />
                  <select
                    value={unidadeFaixa2}
                    onChange={(e) => setUnidadeFaixa2(e.target.value as 'h' | 'min')}
                    className="h-10 bg-white border border-slate-200 text-[11px] font-bold rounded-md px-1.5 cursor-pointer"
                  >
                    <option value="h">h úteis</option>
                    <option value="min">min úteis</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Faixa 3 (Alta Prioridade)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={prazoFaixa3Horas}
                    onChange={(e) => setPrazoFaixa3Horas(Number(e.target.value))}
                    className="h-10 bg-white border-slate-200 font-bold text-[12px]"
                  />
                  <select
                    value={unidadeFaixa3}
                    onChange={(e) => setUnidadeFaixa3(e.target.value as 'h' | 'min')}
                    className="h-10 bg-white border border-slate-200 text-[11px] font-bold rounded-md px-1.5 cursor-pointer"
                  >
                    <option value="h">h úteis</option>
                    <option value="min">min úteis</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prazo Padrão</Label>
            <div className="flex items-center gap-1.5 max-w-md">
              <Input
                type="number"
                step="any"
                min="0"
                value={prazoHorasUteis}
                onChange={(e) => setPrazoHorasUteis(Number(e.target.value))}
                className="h-10 bg-white border-slate-200 font-bold text-[12px]"
              />
              <select
                value={unidadePrazo}
                onChange={(e) => setUnidadePrazo(e.target.value as 'h' | 'min')}
                className="h-10 bg-white border border-slate-200 text-[11px] font-bold rounded-md px-2 cursor-pointer"
              >
                <option value="h">Horas úteis</option>
                <option value="min">Minutos úteis</option>
              </select>
            </div>
          </div>
        )}

        {/* 2ª Pergunta / Follow-up (Opcional - Permanência no mesmo status) */}
        <div className="bg-amber-50/60 border border-amber-200/70 p-3.5 rounded-xl space-y-3">
          <div className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider">
            2ª Pergunta (Opcional - Permanência / Follow-up no mesmo status)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Prazo da 2ª Pergunta (pós-1ª resposta)</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={prazo2Horas}
                  onChange={(e) => setPrazo2Horas(Number(e.target.value))}
                  placeholder="Ex: 4 ou 30"
                  className="h-10 bg-white border-slate-200 font-bold text-[12px]"
                />
                <select
                  value={unidadePrazo2}
                  onChange={(e) => setUnidadePrazo2(e.target.value as 'h' | 'min')}
                  className="h-10 bg-white border border-slate-200 text-[11px] font-bold rounded-md px-1.5 cursor-pointer"
                >
                  <option value="h">Horas</option>
                  <option value="min">Minutos</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Texto da 2ª Pergunta Forçada</Label>
              <Input
                value={pergunta2Forcada}
                onChange={(e) => setPergunta2Forcada(e.target.value)}
                placeholder="Ex: Enviou mensagem de outro DDD?"
                className="h-10 bg-white border-slate-200 font-bold text-[12px]"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-100/70 border border-slate-200/70 p-3.5 rounded-xl space-y-2">
          <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
            Limites de Valor das Faixas (Escalonamento por Ticket)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-extrabold text-amber-700 uppercase block">Faixa 2 (Escala para Supervisor)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[9px] font-bold text-slate-500 uppercase">Mín. Valor Op. Margem (R$)</Label>
                  <Input
                    type="number"
                    placeholder="Desativado"
                    title="Mínimo Valor da Operação referente à Margem Principal"
                    value={faixa2MinMargem}
                    onChange={(e) => setFaixa2MinMargem(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-8 bg-slate-50 border-slate-200 font-bold text-[11px]"
                  />
                </div>
                <div>
                  <Label className="text-[9px] font-bold text-slate-500 uppercase">Mín. Valor Op. Cartão (R$)</Label>
                  <Input
                    type="number"
                    placeholder="Desativado"
                    title="Mínimo Valor da Operação referente ao Cartão"
                    value={faixa2MinCartao}
                    onChange={(e) => setFaixa2MinCartao(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-8 bg-slate-50 border-slate-200 font-bold text-[11px]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-extrabold text-rose-700 uppercase block">Faixa 3 (Escala Supervisor + Admin)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[9px] font-bold text-slate-500 uppercase">Mín. Valor Op. Margem (R$)</Label>
                  <Input
                    type="number"
                    placeholder="Desativado"
                    title="Mínimo Valor da Operação referente à Margem Principal"
                    value={faixa3MinMargem}
                    onChange={(e) => setFaixa3MinMargem(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-8 bg-slate-50 border-slate-200 font-bold text-[11px]"
                  />
                </div>
                <div>
                  <Label className="text-[9px] font-bold text-slate-500 uppercase">Mín. Valor Op. Cartão (R$)</Label>
                  <Input
                    type="number"
                    placeholder="Desativado"
                    title="Mínimo Valor da Operação referente ao Cartão"
                    value={faixa3MinCartao}
                    onChange={(e) => setFaixa3MinCartao(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-8 bg-slate-50 border-slate-200 font-bold text-[11px]"
                  />
                </div>
              </div>
            </div>
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
              <th className="p-3 min-w-[120px]">Prazo Padrão</th>
              <th className="p-3">Pergunta Forçada</th>
              <th className="p-3 min-w-[260px]">Escalonamento por Valor</th>
              <th className="p-3 text-right min-w-[100px]">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[12px] font-semibold text-slate-700">
            {configs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">
                  Nenhuma regra de SLA cadastrada.
                </td>
              </tr>
            ) : (
              configs.map((c) => {
                const rowKey = c.id || c.status_crm
                const isEditingThisRow = editingRowKey === rowKey

                if (isEditingThisRow) {
                  const isRowNegociacao = editRowData.status_crm?.trim().toUpperCase() === 'EM NEGOCIAÇÃO'
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
                        {isRowNegociacao ? (
                          <div className="space-y-1 text-[10px]">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-500 font-bold w-4">F1:</span>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                value={editRowData.prazo_faixa1_horas ?? 36}
                                onChange={(e) => setEditRowData(prev => ({ ...prev, prazo_faixa1_horas: Number(e.target.value) }))}
                                className="h-7 bg-white border-amber-300 font-bold text-[10px] w-12 px-1"
                              />
                              <select
                                value={(editRowData as any)._unit_f1 || 'h'}
                                onChange={(e) => setEditRowData(prev => ({ ...prev, _unit_f1: e.target.value }))}
                                className="h-7 bg-white border border-amber-300 text-[9px] font-bold rounded px-0.5"
                              >
                                <option value="h">h</option>
                                <option value="min">m</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-500 font-bold w-4">F2:</span>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                value={editRowData.prazo_faixa2_horas ?? 20}
                                onChange={(e) => setEditRowData(prev => ({ ...prev, prazo_faixa2_horas: Number(e.target.value) }))}
                                className="h-7 bg-white border-amber-300 font-bold text-[10px] w-12 px-1"
                              />
                              <select
                                value={(editRowData as any)._unit_f2 || 'h'}
                                onChange={(e) => setEditRowData(prev => ({ ...prev, _unit_f2: e.target.value }))}
                                className="h-7 bg-white border border-amber-300 text-[9px] font-bold rounded px-0.5"
                              >
                                <option value="h">h</option>
                                <option value="min">m</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-500 font-bold w-4">F3:</span>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                value={editRowData.prazo_faixa3_horas ?? 12}
                                onChange={(e) => setEditRowData(prev => ({ ...prev, prazo_faixa3_horas: Number(e.target.value) }))}
                                className="h-7 bg-white border-amber-300 font-bold text-[10px] w-12 px-1"
                              />
                              <select
                                value={(editRowData as any)._unit_f3 || 'h'}
                                onChange={(e) => setEditRowData(prev => ({ ...prev, _unit_f3: e.target.value }))}
                                className="h-7 bg-white border border-amber-300 text-[9px] font-bold rounded px-0.5"
                              >
                                <option value="h">h</option>
                                <option value="min">m</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={editRowData.prazo_horas_uteis ?? 1}
                              onChange={(e) => setEditRowData(prev => ({ ...prev, prazo_horas_uteis: Number(e.target.value) }))}
                              className="h-8 bg-white border-amber-300 font-bold text-[11px] w-16 px-1"
                            />
                            <select
                              value={(editRowData as any)._unit_prazo || 'h'}
                              onChange={(e) => setEditRowData(prev => ({ ...prev, _unit_prazo: e.target.value }))}
                              className="h-8 bg-white border border-amber-300 text-[10px] font-bold rounded px-1"
                            >
                              <option value="h">h úteis</option>
                              <option value="min">min úteis</option>
                            </select>
                          </div>
                        )}
                      </td>
                      {/* Pergunta Forçada Input */}
                      <td className="p-2 space-y-1.5">
                        <Input
                          placeholder="1ª Pergunta"
                          value={editRowData.pergunta_forcada || ''}
                          onChange={(e) => setEditRowData(prev => ({ ...prev, pergunta_forcada: e.target.value }))}
                          className="h-8 bg-white border-amber-300 font-medium text-[11px]"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-extrabold text-amber-800 whitespace-nowrap">2ª P:</span>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0"
                            title="Prazo 2ª Pergunta"
                            value={(editRowData as any).prazo2_horas ?? ''}
                            onChange={(e) => setEditRowData(prev => ({ ...prev, prazo2_horas: Number(e.target.value) }))}
                            className="h-7 w-12 bg-white border-amber-300 font-bold text-[10px] px-1"
                          />
                          <select
                            value={(editRowData as any)._unit_prazo2 || 'h'}
                            onChange={(e) => setEditRowData(prev => ({ ...prev, _unit_prazo2: e.target.value }))}
                            className="h-7 bg-white border border-amber-300 text-[9px] font-bold rounded px-0.5"
                          >
                            <option value="h">h</option>
                            <option value="min">m</option>
                          </select>
                          <Input
                            placeholder="Texto da 2ª pergunta (Opcional)"
                            value={(editRowData as any).pergunta2_forcada || ''}
                            onChange={(e) => setEditRowData(prev => ({ ...prev, pergunta2_forcada: e.target.value }))}
                            className="h-7 bg-white border-amber-300 font-medium text-[10px]"
                          />
                        </div>
                      </td>
                      {/* Escalonamento por Valor Inputs */}
                      <td className="p-2">
                        <div className="space-y-1 text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-amber-700 w-5">F2:</span>
                            <Input
                              type="number"
                              title="Mínimo Margem Faixa 2"
                              placeholder="Desativado"
                              value={editRowData.faixa2_min_margem ?? ''}
                              onChange={(e) => setEditRowData(prev => ({ ...prev, faixa2_min_margem: e.target.value === '' ? null : Number(e.target.value) }))}
                              className="h-7 bg-white border-amber-300 text-[10px] w-16 px-1 font-bold"
                            />
                            <span className="text-[9px] text-slate-400">/</span>
                            <Input
                              type="number"
                              title="Mínimo Cartão Faixa 2"
                              placeholder="Desativado"
                              value={editRowData.faixa2_min_cartao ?? ''}
                              onChange={(e) => setEditRowData(prev => ({ ...prev, faixa2_min_cartao: e.target.value === '' ? null : Number(e.target.value) }))}
                              className="h-7 bg-white border-amber-300 text-[10px] w-14 px-1 font-bold"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-rose-700 w-5">F3:</span>
                            <Input
                              type="number"
                              title="Mínimo Margem Faixa 3"
                              placeholder="Desativado"
                              value={editRowData.faixa3_min_margem ?? ''}
                              onChange={(e) => setEditRowData(prev => ({ ...prev, faixa3_min_margem: e.target.value === '' ? null : Number(e.target.value) }))}
                              className="h-7 bg-white border-amber-300 text-[10px] w-16 px-1 font-bold"
                            />
                            <span className="text-[9px] text-slate-400">/</span>
                            <Input
                              type="number"
                              title="Mínimo Cartão Faixa 3"
                              placeholder="Desativado"
                              value={editRowData.faixa3_min_cartao ?? ''}
                              onChange={(e) => setEditRowData(prev => ({ ...prev, faixa3_min_cartao: e.target.value === '' ? null : Number(e.target.value) }))}
                              className="h-7 bg-white border-amber-300 text-[10px] w-14 px-1 font-bold"
                            />
                          </div>
                        </div>
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

                const isNegociacaoItem = c.status_crm?.toUpperCase() === 'EM NEGOCIAÇÃO'
                const f2m = c.faixa2_min_margem ?? c.faixa_valor_min_margem
                const f2c = c.faixa2_min_cartao ?? c.faixa_valor_min_cartao
                const f3m = c.faixa3_min_margem
                const f3c = c.faixa3_min_cartao

                return (
                  <tr key={rowKey} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-3 font-extrabold text-slate-900 uppercase flex items-center gap-2">
                      <span>{c.status_crm}</span>
                      {(c.status_crm?.toUpperCase() === 'APROVADOS' || c.status_crm?.toUpperCase() === 'APROVADO') && (
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md normal-case border border-emerald-200">
                          Grupo (Todos os Aprovados)
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-amber-600">
                      {isNegociacaoItem
                        ? `${formatPrazo(c.prazo_faixa1_horas || c.prazo_horas_uteis || 36)} / ${formatPrazo(c.prazo_faixa2_horas || 20)} / ${formatPrazo(c.prazo_faixa3_horas || 12)}`
                        : `${formatPrazo(c.prazo_horas_uteis)} úteis`}
                    </td>
                    <td className="p-3 max-w-[280px] text-slate-600 font-medium">
                      <div>"{c.pergunta_forcada}"</div>
                      {(c as any).pergunta2_forcada ? (
                        <div className="text-[10px] text-amber-800 font-bold mt-1 bg-amber-50 p-1.5 rounded border border-amber-200/80">
                          2ª Pergunta (+{formatPrazo((c as any).prazo2_horas || 0)}): "{(c as any).pergunta2_forcada}"
                        </div>
                      ) : null}
                    </td>
                    <td className="p-3 text-slate-600 text-[11px] font-medium leading-tight">
                      <div>
                        <span className="text-amber-700 font-bold">F2 (Supervisor):</span>{' '}
                        {(f2m && f2m > 0) || (f2c && f2c > 0) ? (
                          `≥ R$${(f2m || 0).toLocaleString('pt-BR')} Margem / R$${(f2c || 0).toLocaleString('pt-BR')} Cartão`
                        ) : (
                          <span className="text-slate-400 italic">Desativado</span>
                        )}
                      </div>
                      <div>
                        <span className="text-rose-700 font-bold">F3 (Supervisor+Admin):</span>{' '}
                        {(f3m && f3m > 0) || (f3c && f3c > 0) ? (
                          `≥ R$${(f3m || 0).toLocaleString('pt-BR')} Margem / R$${(f3c || 0).toLocaleString('pt-BR')} Cartão`
                        ) : (
                          <span className="text-slate-400 italic">Desativado</span>
                        )}
                      </div>
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

