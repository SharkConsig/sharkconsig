"use client"

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { 
  SlidersHorizontal, 
  Eye, 
  EyeOff, 
  ChevronsLeft, 
  ChevronsRight, 
  Search, 
  Check, 
  RotateCcw,
  Maximize2,
  X
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

  // Sincronizar alterações com localStorage (com suporte a atualizador funcional)
  const updateVisibility = (updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    setVisibleMap((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch (e) {
          console.warn("Erro ao salvar visibilidade de colunas no localStorage:", e)
        }
      }
      return next
    })
  }

  const isVisible = (id: string): boolean => {
    return visibleMap[id] !== false
  }

  const toggleColumn = (id: string) => {
    updateVisibility((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }))
  }

  const setColumnVisible = (id: string, visible: boolean) => {
    updateVisibility((prev) => ({
      ...prev,
      [id]: visible,
    }))
  }

  const hideColumns = (ids: string[]) => {
    updateVisibility((prev) => {
      const next = { ...prev }
      ids.forEach((id) => {
        next[id] = false
      })
      return next
    })
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
    hideColumns,
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
            💡 Dica: Shift/Ctrl + clique nas colunas e botão direito para &apos;Ocultar&apos;
          </div>
        </div>
      )}
    </div>
  )
}

// Estado do Menu de Contexto
interface RhContextMenuState {
  x: number
  y: number
  targetId: string
  targetLabel: string
  selectedIds: string[]
}

// Registro global de toggles ativos para cada coluna visível
const rhToggleRegistry = new Map<string, { onToggle: (id: string) => void; isVisible: boolean }>()

// Store de seleção e menu de contexto para as tabelas de RH
class RhSelectionStore {
  selectedIds = new Set<string>()
  lastClickedId: string | null = null
  contextMenu: RhContextMenuState | null = null
  private version = 0
  private listeners = new Set<() => void>()

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.version
  getServerSnapshot = () => 0

  private notify() {
    this.version++
    this.listeners.forEach((l) => l())
  }

  handleSingleClick(columnId: string) {
    if (this.selectedIds.size === 1 && this.selectedIds.has(columnId)) {
      this.selectedIds.clear()
      this.lastClickedId = null
    } else {
      this.selectedIds.clear()
      this.selectedIds.add(columnId)
      this.lastClickedId = columnId
    }
    this.contextMenu = null
    this.notify()
  }

  handleCtrlClick(columnId: string) {
    if (this.selectedIds.has(columnId)) {
      this.selectedIds.delete(columnId)
      if (this.lastClickedId === columnId) {
        this.lastClickedId = Array.from(this.selectedIds).pop() || null
      }
    } else {
      this.selectedIds.add(columnId)
      this.lastClickedId = columnId
    }
    this.contextMenu = null
    this.notify()
  }

  handleShiftClick(columnId: string, visibleIdsInOrder: string[]) {
    if (!this.lastClickedId || !visibleIdsInOrder.includes(this.lastClickedId)) {
      this.handleSingleClick(columnId)
      return
    }

    const idx1 = visibleIdsInOrder.indexOf(this.lastClickedId)
    const idx2 = visibleIdsInOrder.indexOf(columnId)
    if (idx1 === -1 || idx2 === -1) {
      this.handleSingleClick(columnId)
      return
    }

    const start = Math.min(idx1, idx2)
    const end = Math.max(idx1, idx2)
    for (let i = start; i <= end; i++) {
      this.selectedIds.add(visibleIdsInOrder[i])
    }
    this.contextMenu = null
    this.notify()
  }

  handleContextMenu(columnId: string, label: string, clientX: number, clientY: number) {
    if (!this.selectedIds.has(columnId)) {
      this.selectedIds.clear()
      this.selectedIds.add(columnId)
      this.lastClickedId = columnId
    }

    const menuWidth = 240
    const menuHeight = 140
    const x = typeof window !== "undefined" && clientX + menuWidth > window.innerWidth ? Math.max(10, window.innerWidth - menuWidth - 16) : clientX
    const y = typeof window !== "undefined" && clientY + menuHeight > window.innerHeight ? Math.max(10, window.innerHeight - menuHeight - 16) : clientY

    this.contextMenu = {
      x,
      y,
      targetId: columnId,
      targetLabel: label,
      selectedIds: Array.from(this.selectedIds),
    }
    this.notify()
  }

  clear() {
    if (this.selectedIds.size > 0 || this.contextMenu !== null) {
      this.selectedIds.clear()
      this.lastClickedId = null
      this.contextMenu = null
      this.notify()
    }
  }

  hideSelected() {
    const idsToHide = Array.from(this.selectedIds)
    this.clear()
    idsToHide.forEach((id) => {
      const reg = rhToggleRegistry.get(id)
      if (reg && reg.isVisible) {
        reg.onToggle(id)
      }
    })
  }
}

export const rhSelectionStore = new RhSelectionStore()

// Listener global para fechar seleção ao clicar fora ou pressionar Escape
if (typeof window !== "undefined") {
  const globalWin = window as unknown as { __rhSelectionGlobalListener?: boolean }
  if (!globalWin.__rhSelectionGlobalListener) {
    globalWin.__rhSelectionGlobalListener = true
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        rhSelectionStore.clear()
      }
    })
    window.addEventListener("mousedown", (e) => {
      const target = e.target as HTMLElement | null
      if (target && !target.closest("[data-rh-th]") && !target.closest("[data-rh-context-menu]")) {
        rhSelectionStore.clear()
      }
    })
  }
}

// Menu de Contexto flutuante (botão direito)
function RhContextMenu({ menu }: { menu: RhContextMenuState }) {
  const selectedCount = menu.selectedIds.length

  return (
    <div
      data-rh-context-menu="true"
      style={{ top: menu.y, left: menu.x }}
      className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-200/95 py-1.5 min-w-[240px] animate-in fade-in zoom-in-95 duration-100 font-sans select-none"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          {selectedCount > 1 ? `${selectedCount} colunas selecionadas` : "1 coluna selecionada"}
        </span>
        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
          Tabela RH
        </span>
      </div>

      <div className="p-1 space-y-0.5">
        <button
          type="button"
          onClick={() => rhSelectionStore.hideSelected()}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors text-left cursor-pointer group"
          title="Ocultar as colunas selecionadas da planilha"
        >
          <EyeOff className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform shrink-0" />
          <span className="truncate">
            Ocultar {selectedCount > 1 ? `${selectedCount} colunas` : `"${menu.targetLabel}"`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => rhSelectionStore.clear()}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
        >
          <X className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Cancelar seleção</span>
          <span className="ml-auto text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            Esc
          </span>
        </button>
      </div>

      <div className="px-3.5 py-1.5 border-t border-slate-100 text-[9.5px] text-slate-400 font-medium">
        💡 Use Shift ou Ctrl para selecionar várias
      </div>
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
  const thRef = useRef<HTMLTableCellElement>(null)

  // Registra callback de toggle para ação do menu de contexto
  useEffect(() => {
    rhToggleRegistry.set(columnId, { onToggle, isVisible })
    return () => {
      rhToggleRegistry.delete(columnId)
    }
  }, [columnId, onToggle, isVisible])

  // Inscreve no store de seleção
  useSyncExternalStore(
    rhSelectionStore.subscribe,
    rhSelectionStore.getSnapshot,
    rhSelectionStore.getServerSnapshot
  )

  if (!isVisible) {
    return null
  }

  const isSelected = rhSelectionStore.selectedIds.has(columnId)
  const isContextMenuTarget = rhSelectionStore.contextMenu?.targetId === columnId

  const handleClick = (e: React.MouseEvent<HTMLTableCellElement>) => {
    if (e.defaultPrevented) return
    const trEl = thRef.current?.closest("tr")
    const allThs = trEl ? Array.from(trEl.querySelectorAll<HTMLTableCellElement>("th[data-rh-th='true']")) : []
    const visibleIds = allThs.map((el) => el.getAttribute("data-column-id")).filter(Boolean) as string[]

    if (e.shiftKey) {
      rhSelectionStore.handleShiftClick(columnId, visibleIds)
    } else if (e.ctrlKey || e.metaKey) {
      rhSelectionStore.handleCtrlClick(columnId)
    } else {
      rhSelectionStore.handleSingleClick(columnId)
    }
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLTableCellElement>) => {
    e.preventDefault()
    e.stopPropagation()
    rhSelectionStore.handleContextMenu(columnId, label, e.clientX, e.clientY)
  }

  return (
    <>
      <th
        ref={thRef}
        data-rh-th="true"
        data-column-id={columnId}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDoubleClick={() => onToggle(columnId)}
        title={
          isSelected
            ? `Coluna '${label}' selecionada (${rhSelectionStore.selectedIds.size} selecionada(s)). Clique com botão direito para 'Ocultar'. Shift/Ctrl para alterar.`
            : `Coluna '${label}'. Clique para selecionar. Shift/Ctrl + clique para múltipla seleção. Botão direito para 'Ocultar'. Clique duplo para recolher.`
        }
        className={cn(
          widthClass,
          "px-4 py-4 text-[10px] font-extrabold uppercase tracking-widest relative group transition-all duration-150 select-none cursor-pointer",
          align === "center" && "text-center",
          align === "right" && "text-right",
          isSticky && "sticky top-0 bg-[#171717] z-30",
          roundedLeft && "rounded-l-xl",
          roundedRight && "rounded-r-xl",
          isSelected
            ? "ring-2 ring-inset ring-blue-500 bg-blue-950/80 text-blue-200 shadow-inner"
            : "text-white/90 hover:bg-white/5",
          className
        )}
      >
        <div className={cn(
          "flex items-center gap-1.5",
          align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-between"
        )}>
          <div className="flex items-center gap-1.5 min-w-0">
            {isSelected && (
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-blue-500 text-white shrink-0 shadow-sm animate-in zoom-in-75 duration-100">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            )}
            <span className="truncate">{children || label}</span>
          </div>
          
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

      {/* Menu de Contexto (botão direito) */}
      {isContextMenuTarget && typeof document !== "undefined" && createPortal(
        <RhContextMenu menu={rhSelectionStore.contextMenu!} />,
        document.body
      )}
    </>
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
    return null
  }

  return (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  )
}
