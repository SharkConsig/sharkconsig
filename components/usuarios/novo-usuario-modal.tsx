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
import { Lock, Camera, Pencil, Loader2, Eye, EyeOff, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface NovoUsuarioModalProps {
  isOpen: boolean
  onClose: () => void
  usuario?: any // Adicionado para modo de edição
}

export function NovoUsuarioModal({ isOpen, onClose, usuario }: NovoUsuarioModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    nome_completo: "",
    username: "",
    funcao: "",
    senha: "",
    avatar_url: "",
    supervisor_id: ""
  })
  const [supervisores, setSupervisores] = useState<{ id: string, nome: string }[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (usuario && isOpen) {
      setFormData({
        nome_completo: usuario.nome || "",
        username: usuario.username || "",
        funcao: usuario.funcao || "",
        senha: "", // Não mostramos a senha atual por segurança
        avatar_url: usuario.avatar_url || "",
        supervisor_id: usuario.supervisor_id || ""
      })
      setPreviewUrl(usuario.avatar_url || null)
    } else if (!usuario && isOpen) {
      setFormData({
        nome_completo: "",
        username: "",
        funcao: "",
        senha: "",
        avatar_url: "",
        supervisor_id: ""
      })
      setPreviewUrl(null)
      setSelectedFile(null)
    }
  }, [usuario, isOpen])

  useEffect(() => {
    async function fetchSupervisores() {
      try {
        const response = await fetch("/api/usuarios")
        if (response.ok) {
          const data = await response.json()
          const supers = data.filter((u: any) => u.funcao === "Supervisor" || u.funcao === "Administrador")
          setSupervisores(supers)
        }
      } catch (error) {
        console.error("Erro ao buscar supervisores:", error)
      }
    }
    if (isOpen) {
      fetchSupervisores()
    }
  }, [isOpen])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        toast.error("A imagem deve ter menos de 2MB")
        return
      }
      
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  const uploadAvatar = async (file: File, username: string) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${username}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `profiles/${fileName}`

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type
        })

      if (error) {
        if (error.message.includes('bucket not found')) {
          throw new Error("Bucket 'avatars' não encontrado. Crie-o no Supabase.")
        }
        throw error
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error("Erro no upload:", error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Na edição a senha é opcional
    if (!formData.nome_completo || !formData.username || !formData.funcao || (!usuario && !formData.senha)) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    setIsLoading(true)
    let finalAvatarUrl = formData.avatar_url // Mantém a atual if editing

    try {
      if (selectedFile) {
        try {
          finalAvatarUrl = await uploadAvatar(selectedFile, formData.username)
        } catch (uploadErr: any) {
          toast.error(`Erro no upload da foto: ${uploadErr.message}`)
          setIsLoading(false)
          return
        }
      }

      const isEdit = !!usuario
      const endpoint = isEdit ? "/api/usuarios" : "/api/create-user"
      const method = isEdit ? "PUT" : "POST"

      const payload = isEdit 
        ? { ...formData, id: usuario.id, avatar_url: finalAvatarUrl, password: formData.senha || undefined }
        : { ...formData, avatar_url: finalAvatarUrl }

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Erro ao ${isEdit ? 'atualizar' : 'criar'} usuário`)
      }

      toast.success(isEdit ? "Usuário atualizado com sucesso!" : "Usuário criado com sucesso!")
      if (!isEdit) {
        setFormData({
          nome_completo: "",
          username: "",
          funcao: "",
          senha: "",
          avatar_url: "",
          supervisor_id: ""
        })
      }
      setSelectedFile(null)
      setPreviewUrl(null)
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
              <DialogTitle className="text-[16.5px] font-black text-slate-800 uppercase tracking-widest">
                {usuario ? 'EDITAR USUÁRIO' : 'NOVO USUÁRIO'}
              </DialogTitle>
              <DialogDescription className="text-[11px] font-medium text-slate-500">
                {usuario 
                  ? 'Atualize as informações do colaborador abaixo.' 
                  : 'Preencha as informações para cadastrar um novo colaborador.'
                }
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

                {/* Supervisor (Apenas para Corretor) */}
                {formData.funcao === "Corretor" && (
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Supervisor Responsável</Label>
                    <Select 
                      value={formData.supervisor_id} 
                      onValueChange={(value) => setFormData({ ...formData, supervisor_id: value })}
                    >
                      <SelectTrigger className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 focus:ring-1 focus:ring-slate-200 transition-all">
                        <SelectValue placeholder="Selecione o supervisor..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                        {supervisores.map((sup) => (
                          <SelectItem key={sup.id} value={sup.id} className="text-[10.5px] font-medium">
                            {sup.nome}
                          </SelectItem>
                        ))}
                        {supervisores.length === 0 && (
                          <div className="px-2 py-1.5 text-[10.5px] text-slate-400 italic">Nenhum supervisor encontrado</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
                    <AvatarImage src={previewUrl || undefined} />
                    <AvatarFallback className="bg-slate-100 text-slate-300">
                      <Camera className="w-10 h-10" />
                    </AvatarFallback>
                  </Avatar>
                  
                  {previewUrl ? (
                    <button 
                      type="button"
                      onClick={removeFile}
                      className="absolute -top-1 -right-1 bg-rose-500 text-white p-1.5 rounded-full shadow-lg hover:bg-rose-600 transition-all z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : null}

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
                  {usuario ? 'Salvar Alterações' : 'Salvar Usuário'}
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
