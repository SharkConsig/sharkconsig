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
import { useState } from "react"
import { toast } from "sonner"

interface NovoUsuarioModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NovoUsuarioModal({ isOpen, onClose }: NovoUsuarioModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    nome_completo: "",
    username: "",
    funcao: "",
    senha: "",
    avatar_url: ""
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        toast.error("A imagem deve ter menos de 2MB")
        return
      }
      
      // Para evitar tokens JWT gigantescos, não salvamos o Base64 no metadata.
      // Em um sistema real, faríamos upload para o Supabase Storage.
      // Por enquanto, vamos apenas mostrar um preview local e usar um placeholder no banco.
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, avatar_url: reader.result as string })
      }
      reader.readAsDataURL(file)
      
      toast.info("Nota: A foto será usada apenas nesta sessão. Para persistir fotos, é necessário configurar o Storage.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome_completo || !formData.username || !formData.funcao || !formData.senha) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    setIsLoading(true)
    try {
      // Usamos um placeholder baseado no nome para evitar tokens gigantes (Base64 no JWT trava o sistema)
      const finalAvatarUrl = `https://picsum.photos/seed/${formData.username}/200/200`

      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          avatar_url: finalAvatarUrl
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar usuário")
      }

      toast.success("Usuário criado com sucesso!")
      setFormData({
        nome_completo: "",
        username: "",
        funcao: "",
        senha: "",
        avatar_url: ""
      })
      onClose()
    } catch (error: unknown) {
      console.error("Erro ao salvar usuário:", error)
      const message = error instanceof Error ? error.message : "Erro ao salvar usuário";
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
        <form onSubmit={handleSubmit}>
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
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                    placeholder="Ex: Lucas Henrique Oliveira" 
                    className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 placeholder:text-[11px] placeholder:font-medium placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                    required
                  />
                </div>

                {/* Nome de Usuário */}
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nome de Usuário</Label>
                  <Input 
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Ex: lucas.henrique" 
                    className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 placeholder:text-[11px] placeholder:font-medium placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                    required
                  />
                </div>

                {/* Função */}
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Função</Label>
                  <Select 
                    value={formData.funcao} 
                    onValueChange={(value) => setFormData({ ...formData, funcao: value })}
                  >
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

                {/* Senha de Acesso */}
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Senha de Acesso</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"}
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      placeholder="••••••••" 
                      className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 pr-10 text-[11px] font-bold text-slate-700 placeholder:text-[11px] placeholder:font-medium placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                      required
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
                <div className="relative group mb-4">
                  <Avatar className="w-32 h-32 border-4 border-slate-50 shadow-xl ring-1 ring-slate-100">
                    <AvatarImage src={formData.avatar_url || undefined} />
                    <AvatarFallback className="bg-slate-100 text-slate-300">
                      <Camera className="w-10 h-10" />
                    </AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 bg-white border border-slate-200 p-2 rounded-lg shadow-lg cursor-pointer hover:bg-slate-50 transition-all hover:scale-110"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-600" />
                    <input 
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  className="h-[32px] w-full border-slate-100 bg-slate-50/50 text-slate-500 font-bold text-[9px] rounded-lg hover:bg-slate-100 transition-all uppercase tracking-widest"
                >
                  Selecionar Foto
                </Button>
                
                <p className="mt-4 text-[9px] font-medium text-slate-400 text-center leading-relaxed max-w-[160px]">
                  Selecione uma imagem do seu computador (máx. 1MB).
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50 p-6 flex items-center justify-end gap-3">
            <Button 
              type="button"
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
              className="w-[130px] h-[38px] border-slate-200 bg-white text-slate-600 font-bold text-[10.5px] rounded-lg hover:bg-slate-100 transition-all uppercase tracking-widest mb-4"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
              className="w-[160px] h-[38px] bg-[#0a192f] hover:bg-[#0a192f]/90 text-white font-bold text-[11px] rounded-lg gap-2 transition-all uppercase tracking-widest shadow-lg shadow-slate-900/20 mr-4 mb-4"
            >
              {isLoading ? (
                <>
                  Salvando...
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </>
              ) : (
                <>
                  Salvar Usuário
                  <Lock className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
