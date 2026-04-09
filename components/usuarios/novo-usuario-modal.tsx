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
import { Lock, Camera, Pencil } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface NovoUsuarioModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NovoUsuarioModal({ isOpen, onClose }: NovoUsuarioModalProps) {
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
                  placeholder="Ex: Lucas Henrique Oliveira" 
                  className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 placeholder:text-[11px] placeholder:font-medium placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                />
              </div>

              {/* Nome de Usuário */}
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nome de Usuário</Label>
                <Input 
                  placeholder="Ex: lucas.henrique" 
                  className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 placeholder:text-[11px] placeholder:font-medium placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                />
              </div>

              {/* Email e Função */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">E-mail</Label>
                  <Input 
                    placeholder="lucas@sharkconsig.com.br" 
                    className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 placeholder:text-[11px] placeholder:font-medium placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Função</Label>
                  <Select>
                    <SelectTrigger className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 focus:ring-1 focus:ring-slate-200 transition-all">
                      <SelectValue placeholder="Selecione a função..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="admin" className="text-[10.5px] font-medium">Administrador</SelectItem>
                      <SelectItem value="corretor" className="text-[10.5px] font-medium">Corretor</SelectItem>
                      <SelectItem value="supervisor" className="text-[10.5px] font-medium">Supervisor</SelectItem>
                      <SelectItem value="operacional" className="text-[10.5px] font-medium">Operacional</SelectItem>
                      <SelectItem value="desenvolvedor" className="text-[10.5px] font-medium">Desenvolvedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Senha de Acesso */}
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Senha de Acesso</Label>
                <Input 
                  type="password"
                  placeholder="••••••••" 
                  className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 placeholder:text-[11px] placeholder:font-medium placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                />
              </div>
            </div>

            {/* Profile Picture Section */}
            <div className="flex flex-col items-center justify-start pt-4">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4 block text-center w-full">Foto de Perfil</Label>
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-slate-50 shadow-xl ring-1 ring-slate-100">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-slate-100 text-slate-300">
                    <Camera className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 bg-white border border-slate-200 p-2 rounded-lg shadow-lg hover:bg-slate-50 transition-all group-hover:scale-110">
                  <Pencil className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>
              <p className="mt-4 text-[10px] font-medium text-slate-400 text-center leading-relaxed max-w-[140px]">
                Clique no ícone para importar uma foto de perfil.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-6 flex items-center justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-[130px] h-[38px] border-slate-200 bg-white text-slate-600 font-bold text-[10.5px] rounded-lg hover:bg-slate-100 transition-all uppercase tracking-widest mb-4"
          >
            Cancelar
          </Button>
          <Button 
            className="w-[160px] h-[38px] bg-[#0a192f] hover:bg-[#0a192f]/90 text-white font-bold text-[11px] rounded-lg gap-2 transition-all uppercase tracking-widest shadow-lg shadow-slate-900/20 mr-4 mb-4"
          >
            Salvar Usuário
            <Lock className="w-3.5 h-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
