"use client"

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Lock, Camera, Pencil, Loader2, Eye, EyeOff } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useRef } from "react"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"

interface NovoUsuarioModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function NovoUsuarioModal({ isOpen, onClose, onSuccess }: NovoUsuarioModalProps) {
  const { isDeveloper, isAdmin, session } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [nome, setNome] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("Corretor")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canManage = isDeveloper || isAdmin

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      
      if (!e.target.files || e.target.files.length === 0) {
        setUploading(false)
        return
      }

      const file = e.target.files[0]
      
      // Validar tamanho (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("A imagem deve ter no máximo 2MB")
      }

      const formData = new FormData()
      formData.append('file', file)

      // Usar o proxy da API para evitar problemas de RLS e garantir que o bucket existe
      const response = await fetch('/api/usuarios/avatar', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao subir foto')
      }

      setAvatarUrl(result.publicUrl)
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Erro no upload:", err)
      toast.error('Erro ao subir foto: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!nome || !username || !email || !password) {
      toast.warning("Preencha todos os campos obrigatórios.")
      return
    }

    setIsLoading(true)
    try {
      console.log("1. Iniciando salvamento de usuário...")
      
      if (!session) {
        console.warn("Sessão não encontrada no contexto")
        throw new Error("Sessão expirada ou não encontrada. Por favor, recarregue a página.")
      }

      console.log("2. Sessão confirmada para:", session.user.email)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.warn("Timeout da API atingido!")
        controller.abort()
      }, 30000)

      console.log("3. Enviando POST para /api/usuarios...")
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          nome,
          username,
          email,
          role,
          password,
          avatar_url: avatarUrl
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário')
      }

      console.log("Usuário criado com sucesso!")
      toast.success("Usuário criado com sucesso!")
      onSuccess?.()
      onClose()
      // Reset form
      setNome("")
      setUsername("")
      setEmail("")
      setRole("Corretor")
      setPassword("")
      setAvatarUrl("")
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Erro ao salvar usuário:", err)
      toast.error(err.message || "Erro ao salvar usuário")
    } finally {
      setIsLoading(false)
    }
  }

  if (!canManage && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px] p-8 text-center">
          <DialogTitle className="text-rose-500">ACESSO NEGADO</DialogTitle>
          <p className="text-sm text-slate-500 mt-2">Apenas Administradores e Desenvolvedores podem gerenciar usuários.</p>
          <Button onClick={onClose} className="mt-6">Fechar</Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
        <div className="p-8 space-y-8">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[16.5px] font-black text-slate-800 uppercase tracking-widest">NOVO USUÁRIO</DialogTitle>
            <DialogDescription className="text-[11px] font-medium text-slate-500">
              Preencha as informações para cadastrar um novo colaborador.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-10">
            <div className="space-y-6">
              {/* Nome Completo */}
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nome Completo</Label>
                <Input 
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Lucas Henrique Oliveira" 
                  className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 placeholder:text-[11px] placeholder:font-medium placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                />
              </div>

              {/* Nome de Usuário */}
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nome de Usuário</Label>
                <Input 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: lucas.henrique" 
                  className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 placeholder:text-[11px] placeholder:font-medium placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                />
              </div>

              {/* Email e Função */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">E-mail</Label>
                  <Input 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="lucas@sharkconsig.com.br" 
                    className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 placeholder:text-[11px] placeholder:font-medium placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Função</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 focus:ring-1 focus:ring-slate-200 transition-all">
                      <SelectValue placeholder="Selecione a função..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="Administrador" className="text-[10.5px] font-medium">Administrador</SelectItem>
                      <SelectItem value="Corretor" className="text-[10.5px] font-medium">Corretor</SelectItem>
                      <SelectItem value="Supervisor" className="text-[10.5px] font-medium">Supervisor</SelectItem>
                      <SelectItem value="Operacional" className="text-[10.5px] font-medium">Operacional</SelectItem>
                      <SelectItem value="Desenvolvedor" className="text-[10.5px] font-medium">Desenvolvedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Senha de Acesso */}
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Senha de Acesso</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 pr-10 text-[11px] font-bold text-slate-700 placeholder:text-[11px] placeholder:font-medium placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Picture Section */}
            <div className="flex flex-col items-center justify-start pt-4">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4 block text-center w-full">Foto de Perfil</Label>
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-slate-50 shadow-xl ring-1 ring-slate-100">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-slate-100 text-slate-300">
                    {uploading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Camera className="w-10 h-10" />}
                  </AvatarFallback>
                </Avatar>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleUpload} 
                  className="hidden" 
                  accept="image/*"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 bg-white border border-slate-200 p-2 rounded-lg shadow-lg hover:bg-slate-50 transition-all group-hover:scale-110 disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>
              <p className="mt-4 text-[10px] font-medium text-slate-400 text-center leading-relaxed max-w-[140px]">
                {uploading ? "Subindo..." : "Clique no ícone para importar uma foto de perfil."}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-6 flex items-center justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            className="w-[130px] h-[38px] border-slate-200 bg-white text-slate-600 font-bold text-[10.5px] rounded-lg hover:bg-slate-100 transition-all uppercase tracking-widest mb-4"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading || uploading}
            className="w-[160px] h-[38px] bg-[#0a192f] hover:bg-[#0a192f]/90 text-white font-bold text-[11px] rounded-lg gap-2 transition-all uppercase tracking-widest shadow-lg shadow-slate-900/20 mr-4 mb-4"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Salvar Usuário"}
            {!isLoading && <Lock className="w-3.5 h-3.5" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
