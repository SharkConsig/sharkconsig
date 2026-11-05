"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { Search, ChevronDown, Check, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export interface TabelaOption {
  id: string
  nomeTabela: string
  banco: string
  prazo: number
  coeficiente: string
  coeficienteNum: number
  label: string
}

interface CoeficienteTabelaSelectorProps {
  id?: string
  convenio?: string
  value: string
  selectedLabel?: string
  onChange: (coeficiente: string, label: string) => void
  readOnly?: boolean
  disabled?: boolean
  className?: string
  placeholder?: string
}

// Cache em memória a nível de módulo para evitar consultas redundantes ao Supabase
let cachedConfigs: any[] | null = null
let cachedBancos: Map<string, string> | null = null
let cachedConvenios: Map<string, string> | null = null
let isFetchingData = false
const subscribers: (() => void)[] = []

function normalizeStr(str: string): string {
  if (!str) return ""
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function isMatchingConvenio(a: string, b: string): boolean {
  if (!a || !b) return false
  const normA = normalizeStr(a)
  const normB = normalizeStr(b)
  if (normA === normB || normA.includes(normB) || normB.includes(normA)) return true

  const isPrefSp = (s: string) => 
    s.includes("pref sao paulo") || 
    s.includes("prefeitura sp") || 
    s.includes("pref sp") || 
    s.includes("pmsp") || 
    (s.includes("prefeitura") && s.includes("sao paulo"))

  if (isPrefSp(normA) && isPrefSp(normB)) return true

  const isGovSp = (s: string) =>
    s.includes("governo sp") ||
    s.includes("gov sp") ||
    s.includes("spprev") ||
    (s.includes("governo") && s.includes("sao paulo"))

  if (isGovSp(normA) && isGovSp(normB)) return true

  const isFederal = (s: string) =>
    s.includes("siape") || s.includes("federal")

  if (isFederal(normA) && isFederal(normB)) return true

  return false
}

export function CoeficienteTabelaSelector({
  id,
  convenio = "",
  value = "",
  selectedLabel = "",
  onChange,
  readOnly = false,
  disabled = false,
  className = "",
  placeholder = "Selecione a tabela..."
}: CoeficienteTabelaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [customCoef, setCustomCoef] = useState("")
  const [dataLoaded, setDataLoaded] = useState(Boolean(cachedConfigs))
  const [isLoading, setIsLoading] = useState(!cachedConfigs && isFetchingData)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (cachedConfigs) {
      setDataLoaded(true)
      return
    }

    const onDataReady = () => {
      setDataLoaded(true)
      setIsLoading(false)
    }
    subscribers.push(onDataReady)

    if (!isFetchingData) {
      isFetchingData = true
      setIsLoading(true)

      Promise.all([
        supabase.from("convenios").select("id, nome").order("nome"),
        supabase.from("bancos").select("id, nome").order("nome"),
        supabase.from("produtos_config").select("id, nome_tabela, prazo, coeficiente, convenio_id, banco_id, regras, ativo")
      ]).then(([convRes, bancoRes, prodRes]) => {
        const cMap = new Map<string, string>()
        if (convRes.data) {
          convRes.data.forEach((c: any) => cMap.set(String(c.id), c.nome))
        }
        cachedConvenios = cMap

        const bMap = new Map<string, string>()
        if (bancoRes.data) {
          bancoRes.data.forEach((b: any) => bMap.set(String(b.id), b.nome))
        }
        cachedBancos = bMap

        const configs = (prodRes.data || []).filter((p: any) => p.ativo !== false)
        cachedConfigs = configs

        isFetchingData = false
        subscribers.forEach(cb => cb())
        subscribers.length = 0
      }).catch(err => {
        console.error("Erro ao carregar tabelas de produtos para coeficiente:", err)
        isFetchingData = false
        setIsLoading(false)
      })
    }

    return () => {
      const idx = subscribers.indexOf(onDataReady)
      if (idx !== -1) subscribers.splice(idx, 1)
    }
  }, [])

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Filtra as tabelas e regras pertencentes ao CONVÊNIO selecionado
  const options = useMemo<TabelaOption[]>(() => {
    if (!cachedConfigs || !cachedConvenios || !cachedBancos) return []

    const cleanConv = normalizeStr(convenio)

    const matchingConfigs = cachedConfigs.filter(cfg => {
      if (!cleanConv) return true // Se nenhum convênio foi informado, mostra todas as tabelas
      const convNome = cachedConvenios?.get(String(cfg.convenio_id)) || ""
      if (convNome && isMatchingConvenio(convNome, convenio)) return true
      if (cfg.nome_tabela && isMatchingConvenio(cfg.nome_tabela, convenio)) return true
      return false
    })

    const result: TabelaOption[] = []

    matchingConfigs.forEach(cfg => {
      const bancoNome = cachedBancos?.get(String(cfg.banco_id)) || ""
      const nomeTabela = cfg.nome_tabela || "Tabela"

      if (cfg.regras && Array.isArray(cfg.regras) && cfg.regras.length > 0) {
        cfg.regras.forEach((r: any, idx: number) => {
          if (r.ativo === false) return
          const p = typeof r.prazo === "string" ? parseInt(r.prazo, 10) : (r.prazo || 0)
          const cNum = typeof r.coeficiente === "number" 
            ? r.coeficiente 
            : parseFloat(String(r.coeficiente || "").replace(",", ".")) || 0
          if (!cNum) return

          const cStr = cNum.toString().replace(".", ",")
          const label = `${bancoNome ? `${bancoNome} - ` : ""}${nomeTabela} (${p}x | ${cStr})`

          result.push({
            id: `${cfg.id}-r-${idx}`,
            nomeTabela,
            banco: bancoNome,
            prazo: p,
            coeficiente: cStr,
            coeficienteNum: cNum,
            label
          })
        })
      } else if (cfg.coeficiente) {
        const p = typeof cfg.prazo === "string" ? parseInt(cfg.prazo, 10) : (cfg.prazo || 0)
        const cNum = typeof cfg.coeficiente === "number"
          ? cfg.coeficiente
          : parseFloat(String(cfg.coeficiente || "").replace(",", ".")) || 0
        if (cNum) {
          const cStr = cNum.toString().replace(".", ",")
          const label = `${bancoNome ? `${bancoNome} - ` : ""}${nomeTabela} (${p}x | ${cStr})`

          result.push({
            id: String(cfg.id),
            nomeTabela,
            banco: bancoNome,
            prazo: p,
            coeficiente: cStr,
            coeficienteNum: cNum,
            label
          })
        }
      }
    })

    result.sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }))
    return result
  }, [convenio, dataLoaded])

  // Filtra por termo de busca interno
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options
    const term = normalizeStr(searchTerm)
    return options.filter(opt => {
      const isPrefSp = normalizeStr(opt.label).includes("pref sao paulo") || normalizeStr(opt.nomeTabela).includes("pref sao paulo")
      const aliasStr = isPrefSp ? " prefeitura sp prefeitura de sao paulo pref sp pmsp" : ""
      const fullText = (normalizeStr(opt.label) + " " + normalizeStr(opt.coeficiente) + " " + opt.prazo + aliasStr)
      return fullText.includes(term)
    })
  }, [options, searchTerm])

  const displayText = useMemo(() => {
    if (selectedLabel) return selectedLabel
    if (value) {
      const match = options.find(o => o.coeficiente === value || o.coeficiente.replace(",", ".") === value.replace(",", "."))
      if (match) return match.label
      return `Coeficiente: ${value}`
    }
    return convenio ? placeholder : "Selecione o convênio"
  }, [selectedLabel, value, options, convenio, placeholder])

  const handleSelect = (opt: TabelaOption) => {
    onChange(opt.coeficiente, opt.label)
    setIsOpen(false)
    setSearchTerm("")
  }

  const handleApplyCustom = () => {
    if (!customCoef.trim()) return
    const clean = customCoef.trim().replace(/[^0-9,.]/g, "")
    onChange(clean, `Personalizado (${clean})`)
    setIsOpen(false)
    setCustomCoef("")
  }

  const isInteractive = !readOnly && !disabled

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      <button
        id={id}
        type="button"
        disabled={!isInteractive}
        onClick={() => isInteractive && setIsOpen(!isOpen)}
        className={cn(
          "w-full h-[34px] px-3 rounded-lg border text-[11.5px] font-bold transition-all flex items-center justify-between text-left shadow-2xs select-none",
          value ? "bg-white text-slate-900 border-slate-300 hover:border-slate-400" : "bg-[#E8E8E8] text-slate-500 border-slate-200",
          isOpen && "ring-2 ring-primary/20 border-primary",
          !isInteractive && "opacity-75 cursor-not-allowed pointer-events-none"
        )}
        title={displayText}
      >
        <span className="truncate flex-1 pr-1 font-semibold">
          {displayText}
        </span>
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />
        ) : (
          <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 transition-transform shrink-0", isOpen && "rotate-180")} />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full min-w-[280px] sm:min-w-[340px] mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-[70] p-2 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[320px]">
          {/* Campo de pesquisa de tabelas */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar banco, tabela ou prazo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Lista de tabelas vinculadas ao convênio */}
          <div className="overflow-y-auto space-y-1 flex-1 pr-0.5 max-h-[200px]">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium">
                {!convenio ? "Selecione o convênio acima primeiro" : "Nenhuma tabela encontrada para este convênio"}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt.coeficiente || value.replace(",", ".") === opt.coeficiente.replace(",", ".")
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer border-b border-slate-50 last:border-0",
                      isSelected ? "bg-primary text-white font-bold" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate font-semibold text-[11.5px]">
                        {opt.banco ? `${opt.banco} • ` : ""}{opt.nomeTabela}
                      </span>
                      <span className={cn("text-[10px]", isSelected ? "text-white/80" : "text-slate-400")}>
                        Prazo: {opt.prazo}x
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn(
                        "text-[10.5px] font-black px-1.5 py-0.5 rounded",
                        isSelected ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700 border border-blue-100"
                      )}>
                        {opt.coeficiente}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Opção para digitar coeficiente manual se necessário */}
          <div className="pt-2 mt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 px-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
              Personalizado:
            </span>
            <div className="flex items-center gap-1.5 flex-1 justify-end">
              <input
                type="text"
                placeholder="0,0000"
                value={customCoef}
                onChange={(e) => setCustomCoef(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleApplyCustom()
                  }
                }}
                className="h-6.5 w-24 px-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!customCoef.trim()}
                className="h-6.5 px-2.5 text-[10.5px] font-bold bg-slate-800 hover:bg-slate-900 text-white rounded transition-colors disabled:opacity-50 cursor-pointer"
              >
                Usar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
