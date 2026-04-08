"use client"

import { useState } from "react"
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
import { Check, X, Shield, Lock, Camera, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface NovoUsuarioModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NovoUsuarioModal({ isOpen, onClose }: NovoUsuarioModalProps) {
  const [status, setStatus] = useState<"ativo" | "inativo">("ativo")

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
        <div className="p-8 space-y-8">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[14px] font-bold text-slate-800 uppercase tracking-widest">NOVO USUÁRIO</DialogTitle>
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
                  className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                />
              </div>

              {/* Email e Função */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">E-mail Profissional</Label>
                  <Input 
                    placeholder="lucas@sharkconsig.com.br" 
                    className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Função</Label>
                  <Select>
                    <SelectTrigger className="h-[38px] bg-slate-50/50 border-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-700 focus:ring-1 focus:ring-slate-200 transition-all">
                      <SelectValue placeholder="Selecione a função..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="corretor">Corretor</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="operacional">Operacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status da Conta */}
              <div className="space-y-3">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Status da Conta</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setStatus("ativo")}
                    className={cn(
                      "flex items-center justify-center gap-2 h-[44px] rounded-xl border-2 transition-all font-bold text-[11px] uppercase tracking-wider",
                      status === "ativo" 
                        ? "bg-emerald-400/10 border-emerald-500 text-emerald-700 shadow-sm" 
                        : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center",
                      status === "ativo" ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                    )}>
                      <Check className="w-2.5 h-2.5 stroke-[4]" />
                    </div>
                    Ativo
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus("inativo")}
                    className={cn(
                      "flex items-center justify-center gap-2 h-[44px] rounded-xl border-2 transition-all font-bold text-[11px] uppercase tracking-wider",
                      status === "inativo" 
                        ? "bg-slate-200 border-slate-300 text-slate-700 shadow-sm" 
                        : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center",
                      status === "inativo" ? "bg-slate-500 text-white" : "bg-slate-200 text-slate-400"
                    )}>
                      <X className="w-2.5 h-2.5 stroke-[4]" />
                    </div>
                    Inativo
                  </button>
                </div>
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

          {/* Segurança de Dados */}
          <div className="bg-[#0a192f] rounded-2xl p-5 flex items-start gap-4 shadow-inner">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-white uppercase tracking-tight">Segurança de Dados</p>
              <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
                Novos usuários receberão um link de ativação por e-mail para configurar sua senha inicial de forma segura.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-6 flex items-center justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-[130px] h-[38px] border-slate-200 bg-white text-slate-600 font-bold text-[11px] rounded-lg hover:bg-slate-100 transition-all uppercase tracking-widest"
          >
            Cancelar
          </Button>
          <Button 
            className="w-[160px] h-[38px] bg-[#0a192f] hover:bg-[#0a192f]/90 text-white font-bold text-[11px] rounded-lg gap-2 transition-all uppercase tracking-widest shadow-lg shadow-slate-900/20"
          >
            Salvar Usuário
            <Lock className="w-3.5 h-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
