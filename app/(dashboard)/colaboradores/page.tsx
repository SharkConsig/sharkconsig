"use client"

import React, { useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  User, 
  Briefcase, 
  Mail, 
  Phone, 
  Shield, 
  Calendar, 
  MapPin, 
  DollarSign,
  TrendingUp,
  Filter
} from "lucide-react"

interface Collaborator {
  id: string
  name: string
  role: string
  team: string
  email: string
  phone: string
  joinDate: string
  salary: number
  status: "Ativo" | "Inativo"
  supervisor: string
}

const initialCollaborators: Collaborator[] = [
  {
    id: "1",
    name: "Gabriela Souza Santos",
    role: "Corretor Consignado Sênior",
    team: "Equipe Alfa",
    email: "gabriela.souza@sharkconsig.com",
    phone: "(11) 94567-8901",
    joinDate: "2024-02-15",
    salary: 3200,
    status: "Ativo",
    supervisor: "Carlos Eduardo Santos"
  },
  {
    id: "2",
    name: "Leonardo Albuquerque",
    role: "Corretor Executivo de Vendas",
    team: "Equipe Alfa",
    email: "leonardo.albuquerque@sharkconsig.com",
    phone: "(11) 95432-1098",
    joinDate: "2024-11-01",
    salary: 2800,
    status: "Ativo",
    supervisor: "Carlos Eduardo Santos"
  },
  {
    id: "3",
    name: "Mariana Costa Neves",
    role: "Supervisor Comercial",
    team: "Supervisão",
    email: "mariana.neves@sharkconsig.com",
    phone: "(11) 91234-5678",
    joinDate: "2023-01-10",
    salary: 5500,
    status: "Ativo",
    supervisor: "Diretoria Geral"
  },
  {
    id: "4",
    name: "Henrique de Oliveira",
    role: "Operador de Backoffice",
    team: "Operacional / TI",
    email: "henrique.ti@sharkconsig.com",
    phone: "(11) 99876-0123",
    joinDate: "2025-05-20",
    salary: 2400,
    status: "Ativo",
    supervisor: "Mariana Costa Neves"
  },
  {
    id: "5",
    name: "Thais Fernanda Pereira",
    role: "Estagiário Comercial",
    team: "Equipe Beta",
    email: "thais.fernanda@sharkconsig.com",
    phone: "(11) 93456-7890",
    joinDate: "2025-12-05",
    salary: 1200,
    status: "Ativo",
    supervisor: "Mariana Costa Neves"
  }
]

export default function ColaboradoresPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialCollaborators)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTeam, setFilterTeam] = useState("todos")
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState("Corretor Consignado")
  const [newTeam, setNewTeam] = useState("Equipe Alfa")
  const [newEmail, setNewEmail] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newJoinDate, setNewJoinDate] = useState("")
  const [newSalary, setNewSalary] = useState("1500")
  const [newSupervisor, setNewSupervisor] = useState("Mariana Costa Neves")

  const handleCreateCollaborator = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newEmail) return

    const colab: Collaborator = {
      id: Date.now().toString(),
      name: newName,
      role: newRole,
      team: newTeam,
      email: newEmail,
      phone: newPhone || "(11) 99999-9999",
      joinDate: newJoinDate || new Date().toISOString().split('T')[0],
      salary: parseFloat(newSalary) || 1500,
      status: "Ativo",
      supervisor: newSupervisor
    }

    setCollaborators([colab, ...collaborators])
    setIsFormOpen(false)

    // Reset Form
    setNewName("")
    setNewEmail("")
    setNewPhone("")
    setNewJoinDate("")
    setNewSalary("1500")
  }

  const handleToggleStatus = (id: string, currentStatus: "Ativo" | "Inativo") => {
    const nextStatus = currentStatus === "Ativo" ? "Inativo" : "Ativo"
    setCollaborators(collaborators.map(c => c.id === id ? { ...c, status: nextStatus } : c))
  }

  const filteredCollaborators = collaborators.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.role.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTeam = filterTeam === "todos" || c.team === filterTeam
    return matchesSearch && matchesTeam
  })

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header title="DADOS DOS COLABORADORES" />

      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">
        {/* Statistics Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Colaboradores Ativos</p>
                <p className="text-3xl font-black text-slate-800 mt-1">
                  {collaborators.filter(c => c.status === "Ativo").length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <User className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipes Ativas</p>
                <p className="text-3xl font-black text-slate-800 mt-1">
                  {Array.from(new Set(collaborators.map(c => c.team))).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Média Salarial Base</p>
                <p className="text-3xl font-black text-slate-800 mt-1">
                  R$ {(collaborators.reduce((sum, c) => sum + c.salary, 0) / collaborators.length).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Box */}
        <Card className="border border-slate-200 overflow-hidden bg-white rounded-2xl shadow-sm">
          <CardContent className="p-0">
            <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full md:max-w-md">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Pesquisar colaborador por nome..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select 
                    value={filterTeam}
                    onChange={(e) => setFilterTeam(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="todos">Todas as Equipes</option>
                    <option value="Equipe Alfa">Equipe Alfa</option>
                    <option value="Equipe Beta">Equipe Beta</option>
                    <option value="Supervisão">Supervisão</option>
                    <option value="Operacional / TI">Operacional / TI</option>
                  </select>
                </div>

                <Button 
                  onClick={() => setIsFormOpen(!isFormOpen)}
                  className="bg-[#171717] hover:bg-[#171717]/90 text-white rounded-xl px-5 h-[38px] font-black text-[10px] gap-2 shadow-sm uppercase tracking-widest ml-auto md:ml-0"
                >
                  <Plus className="w-4 h-4" />
                  Contratar Colaborador
                </Button>
              </div>
            </div>

            {/* Form Cadastro */}
            {isFormOpen && (
              <div className="bg-slate-50/50 p-6 border-b border-slate-155">
                <form onSubmit={handleCreateCollaborator} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Nome do colaborador" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1 md:col-span-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Cargo</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Corretor Sênior" 
                      value={newRole} 
                      onChange={(e) => setNewRole(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Equipe</label>
                    <select 
                      value={newTeam}
                      onChange={(e) => setNewTeam(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                    >
                      <option value="Equipe Alfa">Equipe Alfa</option>
                      <option value="Equipe Beta">Equipe Beta</option>
                      <option value="Supervisão">Supervisão</option>
                      <option value="Operacional / TI">Operacional / TI</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">E-mail Profissional</label>
                    <input 
                      type="email" 
                      required
                      placeholder="usuario@sharkconsig.com" 
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Telefone</label>
                    <input 
                      type="text" 
                      placeholder="(11) 94444-2222" 
                      value={newPhone} 
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Salário Base (R$)</label>
                    <input 
                      type="number" 
                      placeholder="2500" 
                      value={newSalary} 
                      onChange={(e) => setNewSalary(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Supervisor</label>
                    <input 
                      type="text" 
                      placeholder="Mariana Costa Neves" 
                      value={newSupervisor} 
                      onChange={(e) => setNewSupervisor(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold w-full outline-none"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-4 flex justify-end gap-3 pt-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setIsFormOpen(false)}
                      className="text-slate-500 hover:bg-slate-100 rounded-xl"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-[#171717] hover:bg-[#171717]/90 text-white rounded-xl px-6 h-[38px] font-bold text-[10px] uppercase tracking-widest"
                    >
                      Gravar Registro
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Colaborador</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Departamento / Equipe</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contato</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admissão</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salário Base</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCollaborators.map((colab) => (
                    <tr key={colab.id} className="hover:bg-slate-50/20 transition-all">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold uppercase border border-emerald-100 shadow-sm">
                            {colab.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-700 uppercase">{colab.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Supervisor: {colab.supervisor}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-bold text-slate-600 uppercase">{colab.role}</p>
                          <Badge className="bg-slate-50 text-slate-500 border border-slate-200 text-[8px] font-black uppercase rounded-lg px-2 py-0">{colab.team}</Badge>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="text-[11px] text-slate-500 space-y-0.5 font-medium">
                          <p className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-300" /> {colab.phone}</p>
                          <p className="flex items-center gap-1 text-slate-400"><Mail className="w-3.5 h-3.5 text-slate-300" /> {colab.email}</p>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-[11px] font-bold text-slate-500">
                        {colab.joinDate}
                      </td>
                      <td className="px-8 py-4 text-[11px] font-black text-slate-700">
                        R$ {colab.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-8 py-4">
                        {colab.status === "Ativo" ? (
                          <Badge className="bg-emerald-100 text-emerald-600 border-none rounded-full px-3 py-0.5 text-[9px] tracking-widest uppercase font-bold hover:bg-emerald-100">Ativo</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-400 border-none rounded-full px-3 py-0.5 text-[9px] tracking-widest uppercase font-bold hover:bg-slate-100">Inativo</Badge>
                        )}
                      </td>
                      <td className="px-8 py-4 text-center">
                        <Button
                          onClick={() => handleToggleStatus(colab.id, colab.status)}
                          className={`text-[9px] font-black tracking-widest uppercase py-1 h-7 rounded-lg border-none px-3 shadow-none ${colab.status === 'Ativo' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                        >
                          {colab.status === "Ativo" ? "Desligar" : "Reativar"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
