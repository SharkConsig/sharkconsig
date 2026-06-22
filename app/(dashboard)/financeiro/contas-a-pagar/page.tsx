"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/context/auth-context"
import { format, isBefore, isAfter, startOfDay } from "date-fns"
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingDown, 
  PiggyBank, 
  FileSpreadsheet, 
  Eraser, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Loader2,
  Calendar,
  DollarSign
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

interface Bill {
  id: string
  fornecedor: string
  valor: number
  data_vencimento: string
  categoria: string
  status: "Pendente" | "Pago" | "Atrasado"
  observacoes?: string
  created_at: string
}

const CATEGORIES = [
  "Sistemas / Softwares",
  "Aluguel / Infraestrutura",
  "Comissões / Repasses",
  "Salários / Pró-Labore",
  "Marketing / Tráfego",
  "Impostos / Contador",
  "Outros"
]

export default function ContasAPagarPage() {
  const { perfil, isAdmin, isDeveloper, isOperational } = useAuth()
  const router = useRouter()

  // Authorization Check
  useEffect(() => {
    if (perfil) {
      const allowedRoles = ["Administrador", "Desenvolvedor"]
      const roleStr = perfil?.role || ""
      const isAllowed = allowedRoles.some(role => roleStr.toLowerCase() === role.toLowerCase()) || isAdmin
      
      if (!isAllowed) {
        toast.error("Você não tem acesso a esta página de Contas a Pagar.")
        router.push("/")
      }
    }
  }, [perfil, isAdmin, router])

  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters state
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("TODOS")
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("TODOS")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Add bill form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [fornecedor, setFornecedor] = useState("")
  const [valor, setValor] = useState("")
  const [dataVencimento, setDataVencimento] = useState("")
  const [categoria, setCategoria] = useState(CATEGORIES[0])
  const [observacoes, setObservacoes] = useState("")

  // Load from LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem("sharkconsig_bills")
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Bill[]
        
        // Auto-check overdue statuses on load
        const today = startOfDay(new Date())
        const updated = parsed.map(b => {
          if (b.status === "Pendente") {
            const due = startOfDay(new Date(b.data_vencimento))
            if (isBefore(due, today)) {
              return { ...b, status: "Atrasado" as const }
            }
          }
          return b
        })
        setBills(updated)
        localStorage.setItem("sharkconsig_bills", JSON.stringify(updated))
      } catch (err) {
        console.error("Erro ao carregar contas pagas:", err)
      }
    } else {
      // Seed initial dummy data for better UI demonstration
      const dummyBills: Bill[] = [
        {
          id: "bill-1",
          fornecedor: "Supabase Cloud Hosting",
          valor: 1530.00,
          data_vencimento: format(new Date(), "yyyy-MM-15"),
          categoria: "Sistemas / Softwares",
          status: "Pago",
          observacoes: "Cobrança mensal no cartão corporativo.",
          created_at: new Date().toISOString()
        },
        {
          id: "bill-2",
          fornecedor: "Aluguel Escritório Central",
          valor: 4200.00,
          data_vencimento: format(new Date(), "yyyy-MM-10"),
          categoria: "Aluguel / Infraestrutura",
          status: "Pago",
          observacoes: "Referente ao mezanino comercial.",
          created_at: new Date().toISOString()
        },
        {
          id: "bill-3",
          fornecedor: "Google Ads Workspace Campaign",
          valor: 3500.00,
          data_vencimento: format(new Date(Date.now() + 86400000 * 5), "yyyy-MM-dd"), // 5 days from now
          categoria: "Marketing / Tráfego",
          status: "Pendente",
          observacoes: "Investimento em leads do SIAPE e INSS.",
          created_at: new Date().toISOString()
        },
        {
          id: "bill-4",
          fornecedor: "Licença Telefonia VoIP",
          valor: 850.00,
          data_vencimento: format(new Date(Date.now() - 86400000 * 2), "yyyy-MM-dd"), // Overdue
          categoria: "Sistemas / Softwares",
          status: "Atrasado",
          observacoes: "Fatura em atraso. Necessário pagar para evitar suspensão dos ramais.",
          created_at: new Date().toISOString()
        }
      ]
      setBills(dummyBills)
      localStorage.setItem("sharkconsig_bills", JSON.stringify(dummyBills))
    }
    setIsLoading(false)
  }, [])

  // Save utility helper
  const saveBills = (newBills: Bill[]) => {
    setBills(newBills)
    localStorage.setItem("sharkconsig_bills", JSON.stringify(newBills))
  }

  // Handle Form Submission
  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fornecedor || !valor || !dataVencimento) {
      toast.error("Preencha todos os campos obrigatórios.")
      return
    }

    const numValue = parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0
    if (numValue <= 0) {
      toast.error("O valor da conta deve ser maior do que zero.")
      return
    }

    const today = startOfDay(new Date())
    const due = startOfDay(new Date(dataVencimento))
    const calculatedStatus: "Pago" | "Pendente" | "Atrasado" = isBefore(due, today) ? "Atrasado" : "Pendente"

    const newBill: Bill = {
      id: `bill-${Date.now()}`,
      fornecedor,
      valor: numValue,
      data_vencimento: dataVencimento,
      categoria,
      status: calculatedStatus,
      observacoes,
      created_at: new Date().toISOString()
    }

    const updated = [newBill, ...bills]
    saveBills(updated)
    setIsAddModalOpen(false)
    toast.success("Conta a pagar registrada com sucesso!")
    
    // Clear form
    setFornecedor("")
    setValor("")
    setDataVencimento("")
    setCategoria(CATEGORIES[0])
    setObservacoes("")
  }

  // Toggle paid status
  const handleToggleStatus = (id: string) => {
    const updated = bills.map(b => {
      if (b.id === id) {
        const nextStatus = b.status === "Pago" ? "Pendente" : "Pago"
        return { ...b, status: nextStatus as "Pago" | "Pendente" }
      }
      return b
    })
    saveBills(updated)
    toast.success("Status de pagamento atualizado!")
  }

  // Delete bill
  const handleDeleteBill = (id: string) => {
    const updated = bills.filter(b => b.id !== id)
    saveBills(updated)
    toast.success("Conta removida do painel.")
  }

  // Clear filters
  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedStatusFilter("TODOS")
    setSelectedCategoryFilter("TODOS")
    setStartDate("")
    setEndDate("")
    toast.success("Filtros limpos.")
  }

  // Filter bills
  const filteredBills = bills.filter(b => {
    const matchesSearch = b.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (b.observacoes && b.observacoes.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = selectedStatusFilter === "TODOS" || b.status === selectedStatusFilter
    const matchesCategory = selectedCategoryFilter === "TODOS" || b.categoria === selectedCategoryFilter

    const matchesDate = (() => {
      if (!startDate && !endDate) return true
      try {
        if (startDate && b.data_vencimento < startDate) return false
        if (endDate && b.data_vencimento > endDate) return false
      } catch (err) {
        return true
      }
      return true
    })()

    return matchesSearch && matchesStatus && matchesCategory && matchesDate
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage)
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Calculations for cards
  const totalPendingSum = bills.filter(b => b.status === "Pendente" || b.status === "Atrasado").reduce((sum, b) => sum + b.valor, 0)
  const totalPaidSum = bills.filter(b => b.status === "Pago").reduce((sum, b) => sum + b.valor, 0)
  const totalOverdueSum = bills.filter(b => b.status === "Atrasado").reduce((sum, b) => sum + b.valor, 0)

  // Excel exporter
  const exportToExcel = async () => {
    if (filteredBills.length === 0) {
      toast.error("Nenhuma conta para exportar.")
      return
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Contas a Pagar")

    worksheet.columns = [
      { header: "Fornecedor / Favorecido", key: "fornecedor", width: 25 },
      { header: "Categoria", key: "categoria", width: 22 },
      { header: "Valor (R$)", key: "valor", width: 16 },
      { header: "Vencimento", key: "data_vencimento", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Observações", key: "observacoes", width: 35 },
      { header: "Registrado em", key: "created_at", width: 20 }
    ]

    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFF" } }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1E293B" }
      }
      cell.alignment = { horizontal: "center", vertical: "middle" }
    })
    worksheet.getRow(1).height = 24

    filteredBills.forEach(b => {
      const row = worksheet.addRow({
        fornecedor: b.fornecedor,
        categoria: b.categoria,
        valor: b.valor,
        data_vencimento: format(new Date(b.data_vencimento), "dd/MM/yyyy"),
        status: b.status,
        observacoes: b.observacoes || "-",
        created_at: format(new Date(b.created_at), "dd/MM/yyyy")
      })
      row.getCell("valor").numFmt = '"R$"#,##0.00'
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    saveAs(blob, `SharkConsig_Contas_a_Pagar_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
    toast.success("Excel gerado e baixado!")
  }

  return (
    <div className="flex-1 bg-slate-50 min-h-screen pb-12">
      <Header title="CONTAS A PAGAR" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* Dashboard inner header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">FINANCEIRO</span>
            <h1 className="text-lg font-black text-slate-800 tracking-tight">LANÇAMENTO E PAGAMENTO DE DESPESAS</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              id="btn-add-expense-trigger"
              onClick={() => setIsAddModalOpen(true)}
              className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest gap-1.5 cursor-pointer rounded-lg border-2 border-transparent"
            >
              <Plus className="w-4 h-4" />
              Lançar despesa
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Pendente */}
          <Card id="card-pendente-pagar" className="bg-white border border-slate-200 shadow-sm rounded-2xl">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">TOTAL EM ABERTO</span>
                <p className="text-2xl font-black text-orange-600 tracking-tight">
                  R$ {totalPendingSum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-500 font-bold block">
                  Contas pendentes de liquidação financeira
                </p>
              </div>
              <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Total Vencido */}
          <Card id="card-atrasado-pagar" className="bg-white border border-slate-200 shadow-sm rounded-2xl">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">TOTAL EM ATRASO</span>
                <p className="text-2xl font-black text-rose-600 tracking-tight">
                  R$ {totalOverdueSum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="bg-rose-50 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200 uppercase tracking-widest">
                    Ação Imediata
                  </span>
                </div>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Total Liquidado */}
          <Card id="card-pago-pagar" className="bg-white border border-slate-200 shadow-sm rounded-2xl">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">TOTAL PAGO MTD</span>
                <p className="text-2xl font-black text-emerald-600 tracking-tight">
                  R$ {totalPaidSum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-500 font-bold block">
                  Compromissos quitados no período
                </p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card id="card-pagar-filters" className="border border-slate-200 rounded-2xl bg-white shadow-sm p-6 overflow-hidden">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-700 tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" /> Pesquisa de Contas Administrativas
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search text input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Favorecido / Detalhe</label>
                <Input
                  id="input-pagar-search-term"
                  type="text"
                  placeholder="Nome do Fornecedor ou nota..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 text-xs border-slate-200 rounded-lg placeholder:text-slate-400 font-bold text-slate-700"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtrar por Status</label>
                <select
                  id="select-pagar-status-filter"
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="h-11 w-full text-xs border border-slate-200 rounded-lg bg-white px-3 focus:outline-none focus:ring-1 focus:ring-primary font-bold text-slate-600"
                >
                  <option value="TODOS">TODAS AS CONTAS</option>
                  <option value="Pendente">PENDENTES</option>
                  <option value="Pago">PAGAS</option>
                  <option value="Atrasado">ATRASADAS / EXPIRADAS</option>
                </select>
              </div>

              {/* Category Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtrar por Categoria</label>
                <select
                  id="select-pagar-category-filter"
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="h-11 w-full text-xs border border-slate-200 rounded-lg bg-white px-3 focus:outline-none focus:ring-1 focus:ring-primary font-bold text-slate-600"
                >
                  <option value="TODOS">TODAS AS CATEGORIAS</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Date selection start */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Limite Inicial</label>
                <input
                  id="input-pagar-date-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 w-full text-xs border border-slate-200 rounded-lg bg-white px-3 font-bold text-slate-600"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">
                Ledger Corporativo Local persistido no navegador
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  id="btn-pagar-clear-filters"
                  variant="outline"
                  onClick={handleClearFilters}
                  className="w-full sm:w-auto h-10 px-4 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 text-slate-600 border-slate-200"
                >
                  <Eraser className="w-3.5 h-3.5 mr-1" />
                  Limpar
                </Button>
                <Button
                  id="btn-pagar-export-excel"
                  onClick={exportToExcel}
                  className="w-full sm:w-auto h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm rounded-lg"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Exportar CSV/XLSX
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* List of bills tables */}
        <Card id="card-pagar-list-wrapper" className="border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 text-[10px] font-black rounded-full">
                {filteredBills.length} Contas
              </span>
              <h2 className="text-xs font-black text-slate-700 tracking-widest uppercase">Razão Operacional de Despesas</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table id="table-contas-a-pagar" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Fornecedor / Favorecido</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Categoria</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Valor</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Vencimento</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Comentário</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-xs font-bold animate-pulse">
                      Processando ledger do navegador...
                    </td>
                  </tr>
                ) : paginatedBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-slate-400 text-xs font-medium">
                      Nenhuma conta lançada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  paginatedBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase">
                        {bill.fornecedor}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-indigo-600/90 uppercase">
                        {bill.categoria}
                      </td>
                      <td className="px-4 py-4 text-xs font-black text-slate-800 text-right whitespace-nowrap">
                        R$ {bill.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-500">
                        {format(new Date(bill.data_vencimento), "dd/MM/yyyy")}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={cn(
                          "text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest inline-block border",
                          bill.status === "Pago" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                          bill.status === "Pendente" && "bg-amber-50 text-amber-700 border-amber-200",
                          bill.status === "Atrasado" && "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500 max-w-[200px] truncate" title={bill.observacoes}>
                        {bill.observacoes || "-"}
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Toggle Status */}
                          <Button
                            id={`btn-toggle-bill-${bill.id}`}
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(bill.id)}
                            className={cn(
                              "w-8 h-8 rounded-lg transition-colors p-1.5 cursor-pointer",
                              bill.status === "Pago" 
                                ? "text-amber-500 bg-amber-50 hover:bg-amber-100 hover:text-amber-700" 
                                : "text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white"
                            )}
                            title={bill.status === "Pago" ? "Marcar como pendente" : "Marcar como pago"}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>

                          {/* Delete Entry */}
                          <Button
                            id={`btn-delete-bill-${bill.id}`}
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBill(bill.id)}
                            className="w-8 h-8 rounded-lg text-rose-500 bg-rose-50 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                            title="Remover Despesa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table pagination */}
          {filteredBills.length > itemsPerPage && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  id="btn-pagar-page-prev"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-8 text-[10px] font-bold uppercase hover:bg-slate-50 rounded-lg cursor-pointer border-slate-200 text-slate-600 px-3"
                >
                  Anterior
                </Button>
                <Button
                  id="btn-pagar-page-next"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-8 text-[10px] font-bold uppercase hover:bg-slate-50 rounded-lg cursor-pointer border-slate-200 text-slate-600 px-3"
                >
                  Avançar
                </Button>
              </div>
            </div>
          )}
        </Card>

      </div>

      {/* Adding Bill Modal popup */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[220] p-4">
          <Card className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-100">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">ADMINISTRATIVO</span>
                <h3 className="text-sm font-black uppercase tracking-wide">Lançar Nova Despesa</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBill} className="p-6 space-y-4 text-slate-700">
              {/* Fornecedor input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Favorecido / Fornecedor *</label>
                <Input
                  id="modal-pagar-fornecedor"
                  type="text"
                  required
                  placeholder="Nome do favorecido da transferência..."
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  className="h-10 text-xs border-slate-200 rounded-lg font-bold text-slate-800"
                />
              </div>

              {/* Valor and Due date in grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Valor */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor da Fatura (R$) *</label>
                  <Input
                    id="modal-pagar-value"
                    type="text"
                    required
                    placeholder="Ex: 1.500,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="h-10 text-xs border-slate-200 rounded-lg font-bold text-slate-800"
                  />
                </div>

                {/* Due date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento *</label>
                  <input
                    id="modal-pagar-due-date"
                    type="date"
                    required
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="h-10 w-full text-xs border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Category selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria de Despesa</label>
                <select
                  id="modal-pagar-category"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="h-10 w-full text-xs border border-slate-200 rounded-lg bg-white px-3 focus:outline-none focus:ring-1 focus:ring-primary font-bold text-slate-600"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Observation note */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observação Adicional</label>
                <textarea
                  id="modal-pagar-textarea-obs"
                  rows={2}
                  placeholder="Instruções adicionais de pagamento, chave pix ou anexos/comentários..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full text-xs font-medium text-slate-600 p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Control Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  id="modal-pagar-btn-cancel"
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-10 text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-100 rounded-lg px-4 cursor-pointer"
                >
                  Desistir
                </Button>
                <Button
                  id="modal-pagar-btn-save"
                  type="submit"
                  className="h-10 text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 cursor-pointer"
                >
                  Lançar Despesa
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
