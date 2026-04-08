"use client"

import { useState, useEffect } from "react"
import { useAuth, UserRole } from "@/context/auth-context"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { 
  Plus, 
  Search, 
  UserPlus, 
  Pencil, 
  Trash2, 
  Shield, 
  User as UserIcon,
  RefreshCw,
  Key
} from "lucide-react"
import { toast } from "sonner"

interface UserData {
  id: string
  email: string
  nome: string
  username?: string
  role: UserRole
  status: 'Ativo' | 'Inativo'
  created_at: string
  last_sign_in_at?: string
}

export default function UsuariosPage() {
  const { isAdmin, isDeveloper, isLoading: authLoading } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    username: "",
    password: "",
    role: "Corretor" as UserRole,
    status: "Ativo" as "Ativo" | "Inativo"
  })

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/usuarios')
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setUsers(data)
    } catch (error: any) {
      toast.error("Erro ao carregar usuários: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && (isAdmin || isDeveloper)) {
      fetchUsers()
    }
  }, [authLoading, isAdmin, isDeveloper])

  const handleOpenModal = (user?: UserData) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        nome: user.nome,
        email: user.email,
        username: user.username || "",
        password: "", // Não mostramos a senha
        role: user.role,
        status: user.status
      })
    } else {
      setEditingUser(null)
      setFormData({
        nome: "",
        email: "",
        username: "",
        password: "",
        role: "Corretor",
        status: "Ativo"
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const method = editingUser ? 'PUT' : 'POST'
      const payload = editingUser ? { ...formData, id: editingUser.id } : formData
      
      const response = await fetch('/api/usuarios', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      toast.success(editingUser ? "Usuário atualizado com sucesso!" : "Usuário criado com sucesso!")
      setIsModalOpen(false)
      fetchUsers()
    } catch (error: any) {
      toast.error("Erro ao salvar usuário: " + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.")) return
    
    try {
      const response = await fetch(`/api/usuarios?id=${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.error) throw new Error(data.error)
      
      toast.success("Usuário excluído com sucesso!")
      fetchUsers()
    } catch (error: any) {
      toast.error("Erro ao excluir usuário: " + error.message)
    }
  }

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let pass = ""
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, password: pass })
    toast.info("Senha gerada: " + pass)
  }

  const filteredUsers = users.filter(user => 
    user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (authLoading) return <div className="p-8 text-center">Carregando...</div>

  if (!isAdmin && !isDeveloper) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Acesso Negado</h1>
        <p className="text-slate-500">Você não tem permissão para acessar esta área.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Gestão de Usuários
          </h1>
          <p className="text-slate-500 text-sm">Gerencie os acessos e permissões da equipe SharkConsig.</p>
        </div>
        
        <Button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/90">
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-700">Lista de Usuários</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nome ou email..." 
                className="pl-10 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Usuário</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Função</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Último Acesso</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {user.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{user.nome}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                            {user.username && <p className="text-[10px] text-primary font-medium">@{user.username}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          user.role === 'Administrador' || user.role === 'Desenvolvedor' ? "border-primary text-primary bg-primary/5" : "text-slate-500"
                        )}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[10px] font-bold uppercase",
                          user.status === 'Ativo' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-400 hover:bg-slate-500"
                        )}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('pt-BR') : "Nunca"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-primary"
                            onClick={() => handleOpenModal(user)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingUser ? <Pencil className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
              {editingUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input 
                  id="nome" 
                  placeholder="Ex: João Silva" 
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="joao@sharkconsig.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editingUser}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username (Login)</Label>
                <Input 
                  id="username" 
                  placeholder="joao.silva" 
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="password">Senha {editingUser && "(Deixe em branco para manter)"}</Label>
                <div className="flex gap-2">
                  <Input 
                    id="password" 
                    type="text" 
                    placeholder="********" 
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={generatePassword}
                    title="Gerar Senha"
                  >
                    <Key className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Função</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Corretor">Corretor</SelectItem>
                    <SelectItem value="Operacional">Operacional</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="Administrador">Administrador</SelectItem>
                    <SelectItem value="Desenvolvedor">Desenvolvedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: "Ativo" | "Inativo") => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editingUser ? "Salvar Alterações" : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
