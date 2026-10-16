"use client"

import React, { useState, useEffect, useRef } from "react"
import { 
  SlidersHorizontal, 
  Eye, 
  EyeOff, 
  ChevronsLeft, 
  ChevronsRight, 
  Search, 
  Check, 
  RotateCcw,
  Maximize2
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ColumnConfig {
  id: string
  label: string
  defaultVisible?: boolean
  widthClass?: string
  align?: "left" | "center" | "right"
  required?: boolean
}

export function useColumnVisibility(storageKey: string, initialColumns: ColumnConfig[]) {
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && typeof parsed === "object") {
            return parsed
          }
        }
      } catch (e) {
        console.warn("Erro ao carregar visibilidade de colunas do localStorage:", e)
      }
    }
    const def: Record<string, boolean> = {}
    initialColumns.forEach((c) => {
      def[c.id] = c.defaultVisible !== false
    })
    return def
  })

  // Sincronizar alterações com localStorage
  const updateVisibility = (newMap: Record<string, boolean>) => {
    setVisibleMap(newMap)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newMap))
      } catch (e) {
        console.warn("Erro ao salvar visibilidade de colunas no localStorage:", e)
      }
    }
  }

  const isVisible = (id: string): boolean => {
    return visibleMap[id] !== false
  }

  const toggleColumn = (id: string) => {
    const next = { ...visibleMap, [id]: !isVisible(id) }
    updateVisibility(next)
  }

  const setColumnVisible = (id: string, visible: boolean) => {
    const next = { ...visibleMap, [id]: visible }
    updateVisibility(next)
  }

  const showAllColumns = () => {
    const next: Record<string, boolean> = {}
    initialColumns.forEach((c) => {
      next[c.id] = true
    })
    updateVisibility(next)
  }

  const resetToDefault = () => {
    const next: Record<string, boolean> = {}
    initialColumns.forEach((c) => {
      next[c.id] = c.defaultVisible !== false
    })
    updateVisibility(next)
  }

  const visibleCount = initialColumns.filter((c) => isVisible(c.id)).length
  const totalCount = initialColumns.length

  return {
    columns: initialColumns,
    visibleMap,
    isVisible,
    toggleColumn,
    setColumnVisible,
    showAllColumns,
    resetToDefault,
    visibleCount,
    totalCount,
  }
}

interface ColumnVisibilityDropdownProps {
  columns: ColumnConfig[]
  isVisible: (id: string) => boolean
  onToggle: (id: string) => void
  onShowAll: () => void
  onReset: () => void
  visibleCount: number
  totalCount: number
  className?: string
}

export function ColumnVisibilityDropdown({
  columns,
  isVisible,
  onToggle,
  onShowAll,
  onReset,
  visibleCount,
  totalCount,
  className
}: ColumnVisibilityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filterSearch, setFilterSearch] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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

  const filteredColumns = columns.filter((c) => 
    c.label.toLowerCase().includes(filterSearch.toLowerCase().trim())
  )

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer select-none",
          isOpen
            ? "bg-[#171717] text-white border-[#171717]"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
        )}
        title="Ocultar ou exibir colunas da planilha"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
        <span className="font-extrabold uppercase text-[10px] tracking-wider">Colunas</span>
        <span className={cn(
          "px-1.5 py-0.5 rounded-md text-[9px] font-black",
          isOpen ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
        )}>
          {visibleCount}/{totalCount}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                Visibilidade de Colunas
              </p>
              <p className="text-[9px] font-semibold text-slate-400">
                Personalize as colunas exibidas
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onShowAll}
                className="text-[9px] font-black text-blue-600 hover:text-blue-800 uppercase px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                title="Exibir todas as colunas"
              >
                Todas
              </button>
              <button
                type="button"
                onClick={onReset}
                className="text-[9px] font-bold text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
                title="Restaurar padrão"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {columns.length > 8 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Search className="w-3 h-3 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar coluna..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-slate-700 w-full placeholder:text-slate-400"
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto pr-1 space-y-1 divide-y divide-slate-50">
            {filteredColumns.map((col) => {
              const checked = isVisible(col.id)
              return (
                <label
                  key={col.id}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors select-none",
                    checked ? "hover:bg-slate-50 text-slate-800" : "text-slate-400 hover:bg-slate-50"
                  )}
                >
                  <span className="truncate pr-2 text-[11px] font-bold">{col.label}</span>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(col.id)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </label>
              )
            })}
            {filteredColumns.length === 0 && (
              <p className="text-[10px] text-center text-slate-400 py-3 font-semibold">
                Nenhuma coluna encontrada
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[9px] text-slate-400 font-medium text-center">
            💡 Dica: Clique duplo na borda da coluna para recolher
          </div>
        </div>
      )}
    </div>
  )
}

interface RhThProps {
  columnId: string
  label: string
  isVisible: boolean
  onToggle: (id: string) => void
  widthClass?: string
  align?: "left" | "center" | "right"
  className?: string
  isSticky?: boolean
  roundedLeft?: boolean
  roundedRight?: boolean
  children?: React.ReactNode
}

export function RhTh({
  columnId,
  label,
  isVisible,
  onToggle,
  widthClass = "w-[160px]",
  align = "left",
  className,
  isSticky = false,
  roundedLeft = false,
  roundedRight = false,
  children
}: RhThProps) {
  if (!isVisible) {
    return (
      <th
        onClick={() => onToggle(columnId)}
        title={`Coluna '${label}' recolhida. Clique para expandir.`}
        className={cn(
          "w-[34px] min-w-[34px] max-w-[34px] px-1 py-3 bg-[#111111] hover:bg-blue-950 text-slate-300 border-r border-slate-700/60 cursor-pointer text-center select-none group relative transition-all duration-200",
          isSticky && "sticky top-0 z-30",
          roundedLeft && "rounded-l-xl",
          roundedRight && "rounded-r-xl"
        )}
      >
        <div className="flex items-center justify-center h-full min-h-[44px]">
          <ChevronsRight className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 group-hover:scale-125 transition-transform shrink-0" />
        </div>
      </th>
    )
  }

  return (
    <th
      onDoubleClick={() => onToggle(columnId)}
      title={`Clique duplo para recolher '${label}'`}
      className={cn(
        widthClass,
        "px-4 py-4 text-[10px] font-extrabold text-white/90 uppercase tracking-widest relative group transition-all duration-200 select-none",
        align === "center" && "text-center",
        align === "right" && "text-right",
        isSticky && "sticky top-0 bg-[#171717] z-30",
        roundedLeft && "rounded-l-xl",
        roundedRight && "rounded-r-xl",
        className
      )}
    >
      <div className={cn(
        "flex items-center gap-1.5",
        align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-between"
      )}>
        <span className="truncate">{children || label}</span>
        
        {/* Botão sutil de recolher no cabeçalho */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle(columnId)
          }}
          className="opacity-0 group-hover:opacity-100 hover:bg-white/20 p-1 rounded transition-opacity text-slate-300 hover:text-white shrink-0 cursor-pointer"
          title={`Recolher coluna ${label}`}
        >
          <ChevronsLeft className="w-3 h-3" />
        </button>
      </div>

      {/* Divisor / Borda lateral com clique duplo */}
      <div
        onDoubleClick={(e) => {
          e.stopPropagation()
          onToggle(columnId)
        }}
        title="Clique duplo para recolher coluna"
        className="absolute right-0 top-1 bottom-1 w-1.5 hover:w-2 hover:bg-blue-500/80 cursor-col-resize opacity-0 group-hover:opacity-80 transition-all rounded-full"
      />
    </th>
  )
}

interface RhTdProps {
  columnId: string
  label?: string
  isVisible: boolean
  onToggle?: (id: string) => void
  className?: string
  colSpan?: number
  children?: React.ReactNode
}

export function RhTd({
  columnId,
  label,
  isVisible,
  onToggle,
  className,
  colSpan,
  children
}: RhTdProps) {
  if (!isVisible) {
    return (
      <td
        onClick={() => onToggle?.(columnId)}
        title={`Coluna '${label || ""}' recolhida. Clique para expandir.`}
        className="w-[34px] min-w-[34px] max-w-[34px] p-0 text-center bg-slate-50/50 hover:bg-blue-50/80 border-r border-slate-200/60 cursor-pointer select-none transition-all duration-200 group"
      >
        <div className="h-full flex items-center justify-center text-slate-300 group-hover:text-blue-600 font-black text-[10px] select-none py-2">
          •
        </div>
      </td>
    )
  }

  return (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  )
}
