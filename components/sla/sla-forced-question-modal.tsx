'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { evaluateTicketSLA, SLAConfig, SLATicketState, getSLAGlobalSettings, getSLACutoffDates, isTicketInSLAPeriod, isCollaboratorTargeted } from '@/lib/sla-engine'
import { Clock, AlertTriangle, Send, Moon, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  user: any
  perfil: any
  onLeadResponded?: () => void
}

interface PendingQuestionItem {
  ticket: SLATicketState
  clienteNome: string
  operacaoValor: number
  pergunta: string
  horasAtraso: number
  podeAdiar: boolean
  sonecaAtiva: boolean
  tempoRestanteSoneca: number
  escaladoGestao: boolean
}

function parseCleanMoney(val: any): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  const str = String(val).trim()
  if (!str) return 0
  let cleaned = str.replace(/[^0-9.,-]/g, '').trim()
  if (!cleaned) return 0
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      cleaned = cleaned.replace(/\./g, '')
    } else if (parts.length === 2 && parts[1].length === 3) {
      cleaned = cleaned.replace(/\./g, '')
    }
  }
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

function extractTicketOperationValues(t: any) {
  let opValMargem = 0
  let opValCartao = 0

  try {
    const desc = t.descricao || t.description || t.content || ''
    const match = desc.match(/<!-- TICKET_METADATA: ([\s\S]*?) -->/)
    if (match && match[1]) {
      const meta = JSON.parse(match[1])
      if (meta.valor_operacao_margem) {
        opValMargem = parseCleanMoney(meta.valor_operacao_margem)
      }
      if (meta.valor_operacao_liquida5) {
        opValCartao = parseCleanMoney(meta.valor_operacao_liquida5)
      } else if (meta.valor_operacao_beneficio5) {
        opValCartao = parseCleanMoney(meta.valor_operacao_beneficio5)
      }
    }
  } catch (e) {
    // Ignorar erro de JSON
  }

  if (!opValMargem && t.valor_operacao) {
    opValMargem = parseCleanMoney(t.valor_operacao)
  }
  if (!opValCartao && t.valor_cartao) {
    opValCartao = parseCleanMoney(t.valor_cartao)
  }

  return { opValMargem, opValCartao }
}

export function SLAForcedQuestionModal({ user, perfil, onLeadResponded }: Props) {
  const [slaConfigs, setSlaConfigs] = useState<SLAConfig[]>([])
  const [pendingItems, setPendingItems] = useState<PendingQuestionItem[]>([])
  const [respostaText, setRespostaText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  const roleUpper = (perfil?.role || perfil?.funcao || '').trim().toUpperCase()
  const isCorretorOrEstagiario = true // A checagem de colaborador alvo (isCollaboratorTargeted) feita abaixo garante o escopo correto

  const fetchSLAData = useCallback(async () => {
    if (!user || !isCorretorOrEstagiario) return

    try {
      // 1. Carregar Configurações de SLA (consultando sla_global_config e sla_config)
      const [{ data: globalData }, { data: configs }] = await Promise.all([
        supabase.from('sla_global_config').select('*').maybeSingle(),
        supabase.from('sla_config').select('*')
      ])

      if (!configs || configs.length === 0) {
        setIsLocked(false)
        setPendingItems([])
        return
      }
      setSlaConfigs(configs)

      const globalSettings = getSLAGlobalSettings(configs, globalData)
      if (!globalSettings.ativo || !isCollaboratorTargeted(user.id, globalSettings)) {
        setIsLocked(false)
        setPendingItems([])
        return
      }

      const { startDate, endDate } = getSLACutoffDates(globalSettings)

      // 2. Carregar Chamados do Corretor / Estagiário respeitando o filtro de período
      let query = supabase
        .from('chamados')
        .select('*, status_chamados(*)')
        .eq('user_id', user.id)
        .not('status', 'ilike', '%CANCELADO%')
        .not('status', 'ilike', '%CONCLUÍDO%')

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString())
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString())
      }

      const { data: tickets, error: ticketsError } = await query

      if (ticketsError) {
        console.error('Erro ao buscar chamados para SLA:', ticketsError)
        return
      }

      if (!tickets) return

      const brokerSonecaEstourada = typeof window !== 'undefined' ? localStorage.getItem(`sla_soneca_${user.id}`) : null

      const pending: PendingQuestionItem[] = []
      let userShouldBeLocked = false

      for (const t of tickets) {
        const { opValMargem, opValCartao } = extractTicketOperationValues(t)
        const ticketState: SLATicketState = {
          id: t.id,
          status: t.status_chamados?.nome || t.status,
          created_at: t.created_at,
          user_id: t.user_id,
          corretor_id: t.user_id,
          timestamp_ultima_mudanca_status: t.timestamp_ultima_mudanca_status || t.updated_at || t.created_at,
          pergunta_pendente: t.pergunta_pendente,
          timestamp_gatilho_disparado: t.timestamp_gatilho_disparado,
          soneca_usada: t.soneca_usada,
          timestamp_soneca: t.timestamp_soneca,
          escalonamento_status: t.escalonamento_status,
          timestamp_escalonamento: t.timestamp_escalonamento,
          operacao_valor_margem: opValMargem,
          operacao_valor_cartao: opValCartao
        }

        const res = evaluateTicketSLA(ticketState, configs, brokerSonecaEstourada, globalData)

        if (res.gatilhoDisparado && !res.sonecaAtiva) {
          userShouldBeLocked = true

          // Sincronizar o escalonamento no banco para Administradores e Supervisores enxergarem na lista
          const targetEscalonamento = res.escaladoGestao ? 'supervisao_gestao' : res.escaladoSupervisao ? 'supervisao' : 'nenhum'
          if (t.escalonamento_status !== targetEscalonamento) {
            supabase.from('chamados').update({
              escalonamento_status: targetEscalonamento,
              timestamp_escalonamento: new Date().toISOString()
            }).eq('id', t.id).then()
          }

          pending.push({
            ticket: ticketState,
            clienteNome: t.cliente_nome || t.nome || `Chamado #${t.id}`,
            operacaoValor: Math.max(ticketState.operacao_valor_margem || 0, ticketState.operacao_valor_cartao || 0),
            pergunta: res.perguntaForcada || 'Favor informar o status do atendimento deste cliente.',
            horasAtraso: res.horasAtraso,
            podeAdiar: res.podeAdiar,
            sonecaAtiva: res.sonecaAtiva,
            tempoRestanteSoneca: res.tempoRestanteSonecaMinutos,
            escaladoGestao: res.escaladoGestao
          })
        }
      }

      // Ordenar Fila Única: 1º Tempo de atraso (maior), 2º Valor da operação (maior)
      pending.sort((a, b) => {
        if (b.horasAtraso !== a.horasAtraso) {
          return b.horasAtraso - a.horasAtraso
        }
        return b.operacaoValor - a.operacaoValor
      })

      setPendingItems(pending)
      setIsLocked(userShouldBeLocked)

    } catch (err) {
      console.error('Erro ao avaliar SLAs do corretor:', err)
    }
  }, [user, perfil, isCorretorOrEstagiario])

  useEffect(() => {
    fetchSLAData()
    const interval = setInterval(fetchSLAData, 15000) // Reavaliar a cada 15 segundos
    return () => clearInterval(interval)
  }, [fetchSLAData])

  if (!isCorretorOrEstagiario || pendingItems.length === 0) return null

  const currentItem = pendingItems[0]

  const handleResponder = async () => {
    if (!respostaText.trim()) {
      toast.error('Informe sua resposta para prosseguir.')
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Inserir resposta no histórico/mensagens do chamado
      await supabase.from('mensagens_chamado').insert({
        chamado_id: currentItem.ticket.id,
        user_id: user.id,
        content: `[RESPOSTA DE SLA OBRIGATÓRIA]: ${respostaText.trim()}`,
        action: 'respondeu_sla'
      })

      // 2. Atualizar o chamado limpando os gatilhos e renovando o timestamp do status
      await supabase.from('chamados').update({
        timestamp_ultima_mudanca_status: new Date().toISOString(),
        pergunta_pendente: null,
        timestamp_gatilho_disparado: null,
        soneca_usada: false,
        timestamp_soneca: null,
        escalonamento_status: 'nenhum'
      }).eq('id', currentItem.ticket.id)

      toast.success('Resposta registrada com sucesso!')
      setRespostaText('')
      if (onLeadResponded) onLeadResponded()
      fetchSLAData()
    } catch (err: any) {
      console.error('Erro ao responder SLA:', err)
      toast.error('Erro ao registrar resposta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAdiarSoneca = async () => {
    if (!currentItem.podeAdiar) {
      toast.error('Não é possível adiar novamente. Soneca disponível apenas 1x a cada 3 horas.')
      return
    }

    setIsSubmitting(true)
    try {
      const nowIso = new Date().toISOString()

      // 1. Atualizar chamado marcando soneca usada e o timestamp da soneca
      await supabase.from('chamados').update({
        soneca_usada: true,
        timestamp_soneca: nowIso
      }).eq('id', currentItem.ticket.id)

      // 2. Salvar no localStorage a soneca estourada do corretor para a trava de 3h
      if (typeof window !== 'undefined') {
        localStorage.setItem(`sla_soneca_${user.id}`, nowIso)
      }

      toast.info('Pergunta adiada por 10 minutos!')
      fetchSLAData()
    } catch (err: any) {
      console.error('Erro ao adiar SLA:', err)
      toast.error('Erro ao solicitar soneca.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner de Bloqueio */}
        <div className="bg-amber-500 text-slate-950 p-4 flex items-center justify-between gap-3 font-extrabold text-[12px] uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>Aviso de Cobrança / Resposta Obrigatória de Lead</span>
          </div>
          <span className="bg-slate-950 text-amber-400 px-2.5 py-1 rounded-full text-[10px]">
            {pendingItems.length} PENDENTE{pendingItems.length > 1 ? 'S' : ''}
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Cliente
            </span>
            <h3 className="text-[16px] font-extrabold text-slate-900 uppercase">
              {currentItem.clienteNome}
            </h3>
            <div className="flex items-center gap-2 pt-1 text-[11px] font-bold text-amber-600">
              <Clock className="w-3.5 h-3.5" />
              <span>Atraso na Etapa: {currentItem.horasAtraso.toFixed(1)} horas úteis</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">
              Pergunta Forçada
            </span>
            <p className="text-[13px] font-extrabold text-slate-800 leading-relaxed">
              "{currentItem.pergunta}"
            </p>
          </div>

          {/* Campo de Resposta */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 pl-1">
              Sua Resposta
            </label>
            <textarea
              value={respostaText}
              onChange={(e) => setRespostaText(e.target.value)}
              placeholder="Digite os detalhes da ação tomada com este cliente..."
              rows={3}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all resize-none"
            />
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={!currentItem.podeAdiar || isSubmitting}
              onClick={handleAdiarSoneca}
              className="h-11 px-4 rounded-xl border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider flex items-center gap-2 hover:bg-slate-100"
            >
              <Moon className="w-4 h-4" />
              <span>Soneca 10 min</span>
            </Button>

            <Button
              type="button"
              disabled={isSubmitting || !respostaText.trim()}
              onClick={handleResponder}
              className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-slate-900/20"
            >
              <Send className="w-4 h-4" />
              <span>Responder e Continuar</span>
            </Button>
          </div>

          <p className="text-[10px] font-semibold text-slate-400 text-center pt-1">
            * O envio de novos leads está suspenso até a resposta das perguntas pendentes.
          </p>
        </div>
      </div>
    </div>
  )
}
