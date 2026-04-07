"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Shield, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"

export default function UsuariosPage() {
  const { isAdmin, isLoading: authLoading } = useAuth()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      window.location.href = '/'
      return
    }
    fetchUsuarios()
  }, [authLoading, isAdmin])

  const fetchUsuarios = async () => {
    setIsLoading(true)
    const { data } = await supabase.from('perfis').select('*').order('nome')
    setUsuarios(data || [])
    setIsLoading(false)
  }

  const toggleRole = async (userId: string, currentRole: string) => {
    setUpdatingId(userId)
    const newRole = currentRole === 'admin' ? 'corretor' : 'admin'
    
    const { error } = await supabase
      .from('perfis')
      .update({ role: newRole })
      .eq('id', userId)

    if (!error) {
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setUpdatingId(null)
  }

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex-1 flex flex-col">
      <Header title="GESTÃO DE USUÁRIOS" />
      
      <div className="p-8 max-w-[1200px] mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Controle quem pode gerenciar campanhas e quem apenas atende clientes.</p>
        </div>

        <Card className="card-shadow">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-50">
                    <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Nome / Email</th>
                    <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Cargo Atual</th>
                    <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-900 uppercase">{usuario.nome}</p>
                            <p className="text-[11px] text-slate-500">{usuario.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
                          usuario.role === 'admin' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {usuario.role === 'admin' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                          <span className="text-[9px] font-bold uppercase tracking-widest">
                            {usuario.role === 'admin' ? 'Administrador' : 'Corretor'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={updatingId === usuario.id}
                          onClick={() => toggleRole(usuario.id, usuario.role)}
                          className="h-8 px-4 text-[9px] font-bold uppercase tracking-widest border-slate-200"
                        >
                          {updatingId === usuario.id ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-2" />
                          ) : (
                            usuario.role === 'admin' ? <ShieldAlert className="w-3 h-3 mr-2" /> : <Shield className="w-3 h-3 mr-2" />
                          )}
                          Tornar {usuario.role === 'admin' ? 'Corretor' : 'Admin'}
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
